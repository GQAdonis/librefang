//! Lifecycle supervision for the Universal Agent Runtime sidecar.
//!
//! The UAR process contract is deliberately tiny: bind loopback on an
//! ephemeral port, print exactly one `READY:{port}` line, and exit when stdin
//! reaches EOF. This module layers that contract onto the same bundled-binary
//! resolution and bounded restart policy used by channel sidecars.

use crate::sidecar::{
    bundled_binary_hint, resolve_sidecar_command, supervise_contract, RestartPolicy,
    SupervisionContract, SupervisionOutcome,
};
use async_trait::async_trait;
use librefang_types::config::{UarConfig, UarSidecarConfig};
use serde::Serialize;
use std::path::PathBuf;
use std::process::Stdio;
use std::sync::Arc;
use std::time::Duration;
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::{Child, ChildStdin, Command};
use tokio::sync::{mpsc, oneshot, Mutex, RwLock};
use tracing::{debug, info, warn};

const UAR_SIDECAR_STEM: &str = "uar-sidecar";
const HEALTH_POLL_INTERVAL: Duration = Duration::from_secs(5);
const STDERR_LIMIT: usize = 64 * 1024;
type EndpointCallback = Arc<dyn Fn(Option<String>) + Send + Sync>;

/// Operator-visible lifecycle state.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum UarSupervisorState {
    Stopped,
    Starting,
    Healthy,
    Degraded,
    CrashLooping,
}

/// Stable status payload shared by the API and dashboard.
#[derive(Debug, Clone, Serialize)]
pub struct UarSidecarStatus {
    pub state: UarSupervisorState,
    pub resolved_path: Option<String>,
    pub endpoint: Option<String>,
    pub port: Option<u16>,
    pub restart_count: u32,
    pub last_error: Option<String>,
}

impl Default for UarSidecarStatus {
    fn default() -> Self {
        Self {
            state: UarSupervisorState::Stopped,
            resolved_path: None,
            endpoint: None,
            port: None,
            restart_count: 0,
            last_error: None,
        }
    }
}

enum Control {
    Stop(oneshot::Sender<Result<(), String>>),
}

enum StartWait {
    Ready(UarSidecarStatus),
    Active,
    Pending(oneshot::Receiver<Result<(), String>>),
}

struct RunningChild {
    child: Child,
    stdin: Option<ChildStdin>,
    stderr: Arc<Mutex<String>>,
}

/// Cloneable owner for one supervised UAR process.
///
/// Only the background task owns the child handle. Dropping the task drops a
/// `kill_on_drop` child, so daemon teardown cannot orphan the sidecar.
pub struct UarSidecarSupervisor {
    config: UarSidecarConfig,
    home_dir: PathBuf,
    client: reqwest::Client,
    status: Arc<RwLock<UarSidecarStatus>>,
    environment: Vec<(String, String)>,
    endpoint_callback: Option<EndpointCallback>,
    lifecycle: Mutex<()>,
    control_tx: Mutex<Option<mpsc::Sender<Control>>>,
    task: Mutex<Option<tokio::task::JoinHandle<()>>>,
}

impl UarSidecarSupervisor {
    #[must_use]
    pub fn new(config: UarSidecarConfig, home_dir: PathBuf) -> Self {
        let default_data_url = format!("surrealkv://{}", home_dir.join("uar-surreal").display());
        Self {
            config,
            home_dir,
            client: reqwest::Client::new(),
            status: Arc::new(RwLock::new(UarSidecarStatus::default())),
            environment: vec![
                ("UAR_SIDECAR".to_string(), "1".to_string()),
                (
                    "UAR_PERSISTENCE__PROVIDER".to_string(),
                    "surreal".to_string(),
                ),
                (
                    "UAR_PERSISTENCE__DATABASE_URL".to_string(),
                    default_data_url,
                ),
            ],
            endpoint_callback: None,
            lifecycle: Mutex::new(()),
            control_tx: Mutex::new(None),
            task: Mutex::new(None),
        }
    }

    /// Forward the provider-facing `[uar]` settings to the child process.
    ///
    /// These variables configure UAR's liter-llm backend; they are deliberately
    /// separate from `[uar.sidecar].endpoint`, which addresses UAR itself.
    #[must_use]
    pub fn with_runtime_config(mut self, config: Option<&UarConfig>) -> Self {
        let Some(config) = config else {
            return self;
        };
        if !config.api_key.is_empty() && !config.api_key.starts_with("vault:") {
            self.environment.extend([
                ("UAR_LLM__API_KEY".to_string(), config.api_key.clone()),
                ("LLM_API_KEY".to_string(), config.api_key.clone()),
            ]);
        }
        if !config.model.is_empty() {
            self.environment.extend([
                ("UAR_LLM__MODEL".to_string(), config.model.clone()),
                ("LLM_MODEL".to_string(), config.model.clone()),
            ]);
        }
        if let Some(base_url) = config.base_url.as_ref() {
            self.environment.extend([
                ("UAR_LLM__BASE_URL".to_string(), base_url.clone()),
                ("LLM_BASE_URL".to_string(), base_url.clone()),
            ]);
        }
        if let Some(path) = config.surreal_data_dir.as_ref() {
            self.environment.push((
                "UAR_PERSISTENCE__PROVIDER".to_string(),
                "surreal".to_string(),
            ));
            self.environment.push((
                "UAR_PERSISTENCE__DATABASE_URL".to_string(),
                format!("surrealkv://{}", path.display()),
            ));
        }
        self
    }

    /// Publish endpoint changes to the driver layer after every successful
    /// spawn, including background restarts that select a new ephemeral port.
    #[must_use]
    pub fn with_endpoint_callback(
        mut self,
        callback: impl Fn(Option<String>) + Send + Sync + 'static,
    ) -> Self {
        self.endpoint_callback = Some(Arc::new(callback));
        self
    }

    /// Start supervision, waiting until UAR is ready or the configured
    /// readiness budget expires.
    pub async fn start(&self) -> Result<UarSidecarStatus, String> {
        let wait = {
            let _lifecycle_guard = self.lifecycle.lock().await;
            self.begin_start().await?
        };
        self.finish_start(wait).await
    }

    async fn begin_start(&self) -> Result<StartWait, String> {
        let current = self.status.read().await.clone();
        if current.state == UarSupervisorState::Healthy {
            return Ok(StartWait::Ready(current));
        }
        if current.state == UarSupervisorState::Starting {
            return Ok(StartWait::Active);
        }

        let finished_task = {
            let mut task = self.task.lock().await;
            match task.as_ref() {
                Some(task) if !task.is_finished() => return Ok(StartWait::Active),
                Some(_) => task.take(),
                None => None,
            }
        };
        if let Some(task) = finished_task {
            let _ = task.await;
            self.control_tx.lock().await.take();
        }

        if let Some(endpoint) = self.config.endpoint.as_deref() {
            let endpoint = normalize_endpoint(endpoint);
            self.set_starting(None, Some(endpoint.clone())).await;
            match wait_until_ready(
                &self.client,
                &endpoint,
                Duration::from_millis(self.config.effective_ready_timeout_ms()),
            )
            .await
            {
                Ok(()) => {
                    let mut status = self.status.write().await;
                    status.state = UarSupervisorState::Healthy;
                    status.endpoint = Some(endpoint);
                    status.last_error = None;
                    if let Some(callback) = self.endpoint_callback.as_ref() {
                        callback(status.endpoint.clone());
                    }
                    return Ok(StartWait::Ready(status.clone()));
                }
                Err(error) => {
                    self.set_failure(UarSupervisorState::Degraded, error.clone())
                        .await;
                    return Err(error);
                }
            }
        }

        if !self.config.enabled {
            return Err(
                "UAR sidecar is disabled; set [uar] enabled = true or configure [uar] endpoint"
                    .to_string(),
            );
        }

        let raw_command = if self.config.command.trim().is_empty() {
            UAR_SIDECAR_STEM
        } else {
            self.config.command.trim()
        };
        let resolved = resolve_sidecar_command(raw_command, &self.home_dir);
        self.set_starting(Some(resolved.clone()), None).await;

        let (control_tx, control_rx) = mpsc::channel(2);
        let (started_tx, started_rx) = oneshot::channel();
        *self.control_tx.lock().await = Some(control_tx);

        let config = self.config.clone();
        let home_dir = self.home_dir.clone();
        let client = self.client.clone();
        let status = Arc::clone(&self.status);
        let environment = self.environment.clone();
        let endpoint_callback = self.endpoint_callback.clone();
        let mut contract = UarSupervisionContract {
            restart_policy: RestartPolicy::from_uar_config(&config),
            config,
            home_dir,
            environment,
            client,
            status,
            control_rx,
            started_tx: Some(started_tx),
            endpoint_callback,
            last_error: None,
        };
        let task = tokio::spawn(async move {
            supervise_contract(&mut contract).await;
        });
        *self.task.lock().await = Some(task);

        Ok(StartWait::Pending(started_rx))
    }

    async fn finish_start(&self, wait: StartWait) -> Result<UarSidecarStatus, String> {
        let started_rx = match wait {
            StartWait::Ready(status) => return Ok(status),
            StartWait::Active => return self.wait_for_active_start().await,
            StartWait::Pending(started_rx) => started_rx,
        };
        match started_rx.await {
            Ok(Ok(())) => Ok(self.status.read().await.clone()),
            Ok(Err(error)) => {
                self.control_tx.lock().await.take();
                Err(error)
            }
            Err(_) => {
                self.control_tx.lock().await.take();
                Err("UAR supervisor stopped before reporting readiness".to_string())
            }
        }
    }

    async fn wait_for_active_start(&self) -> Result<UarSidecarStatus, String> {
        loop {
            let status = self.status.read().await.clone();
            match status.state {
                UarSupervisorState::Healthy => return Ok(status),
                UarSupervisorState::CrashLooping | UarSupervisorState::Stopped => {
                    return Err(status.last_error.unwrap_or_else(|| {
                        format!("UAR supervisor stopped in {:?} state", status.state)
                    }));
                }
                UarSupervisorState::Starting | UarSupervisorState::Degraded => {}
            }
            let finished = self
                .task
                .lock()
                .await
                .as_ref()
                .is_none_or(tokio::task::JoinHandle::is_finished);
            if finished {
                return Err(status.last_error.unwrap_or_else(|| {
                    "UAR supervisor stopped before becoming ready".to_string()
                }));
            }
            tokio::time::sleep(Duration::from_millis(25)).await;
        }
    }

    /// Stop the local child by closing stdin. Endpoint mode never attempts to
    /// stop the remote service.
    pub async fn stop(&self) -> Result<UarSidecarStatus, String> {
        let _lifecycle_guard = self.lifecycle.lock().await;
        self.stop_inner().await
    }

    async fn stop_inner(&self) -> Result<UarSidecarStatus, String> {
        if self.config.endpoint.is_some() {
            let mut status = self.status.write().await;
            status.state = UarSupervisorState::Stopped;
            status.endpoint = None;
            status.port = None;
            if let Some(callback) = self.endpoint_callback.as_ref() {
                callback(None);
            }
            return Ok(status.clone());
        }

        let tx = self.control_tx.lock().await.take();
        if let Some(tx) = tx {
            let (reply_tx, reply_rx) = oneshot::channel();
            tx.send(Control::Stop(reply_tx))
                .await
                .map_err(|_| "UAR supervisor is no longer running".to_string())?;
            reply_rx.await.map_err(|_| {
                "UAR supervisor stopped without acknowledging shutdown".to_string()
            })??;
        }

        if let Some(task) = self.task.lock().await.take() {
            let _ = task.await;
        }
        Ok(self.status.read().await.clone())
    }

    pub async fn restart(&self) -> Result<UarSidecarStatus, String> {
        let wait = {
            let _lifecycle_guard = self.lifecycle.lock().await;
            self.stop_inner().await?;
            self.begin_start().await?
        };
        self.finish_start(wait).await
    }

    pub async fn status(&self) -> UarSidecarStatus {
        self.status.read().await.clone()
    }

    /// Base URL currently selected by the supervisor.
    pub async fn endpoint(&self) -> Option<String> {
        let status = self.status.read().await;
        (status.state == UarSupervisorState::Healthy)
            .then(|| status.endpoint.clone())
            .flatten()
    }

    async fn set_starting(&self, resolved_path: Option<String>, endpoint: Option<String>) {
        let mut status = self.status.write().await;
        status.state = UarSupervisorState::Starting;
        status.resolved_path = resolved_path;
        status.endpoint = endpoint;
        status.port = None;
        status.last_error = None;
    }

    async fn set_failure(&self, state: UarSupervisorState, error: String) {
        let mut status = self.status.write().await;
        status.state = state;
        status.last_error = Some(error);
    }
}

impl Drop for UarSidecarSupervisor {
    fn drop(&mut self) {
        if let Ok(mut tx) = self.control_tx.try_lock() {
            tx.take();
        }
        if let Ok(mut task) = self.task.try_lock() {
            if let Some(task) = task.take() {
                task.abort();
            }
        }
    }
}

struct UarSupervisionContract {
    restart_policy: RestartPolicy,
    config: UarSidecarConfig,
    home_dir: PathBuf,
    environment: Vec<(String, String)>,
    client: reqwest::Client,
    status: Arc<RwLock<UarSidecarStatus>>,
    control_rx: mpsc::Receiver<Control>,
    started_tx: Option<oneshot::Sender<Result<(), String>>>,
    endpoint_callback: Option<EndpointCallback>,
    last_error: Option<String>,
}

impl UarSupervisionContract {
    fn publish_endpoint(&self, endpoint: Option<String>) {
        if let Some(callback) = self.endpoint_callback.as_ref() {
            callback(endpoint);
        }
    }

    async fn mark_stopped(&self, error: Option<String>) {
        let mut snapshot = self.status.write().await;
        snapshot.state = UarSupervisorState::Stopped;
        snapshot.endpoint = None;
        snapshot.port = None;
        if error.is_some() {
            snapshot.last_error = error;
        }
        drop(snapshot);
        self.publish_endpoint(None);
    }
}

#[async_trait]
impl SupervisionContract for UarSupervisionContract {
    fn restart_policy(&self) -> RestartPolicy {
        self.restart_policy
    }

    async fn run_once(&mut self, attempt: u32) -> SupervisionOutcome {
        let config = self.config.clone();
        let home_dir = self.home_dir.clone();
        let environment = self.environment.clone();
        let raw_command = if config.command.trim().is_empty() {
            UAR_SIDECAR_STEM
        } else {
            config.command.trim()
        };
        let resolved = resolve_sidecar_command(raw_command, &home_dir);
        let spawn = spawn_and_wait_ready(&resolved, raw_command, &home_dir, &config, &environment);
        tokio::pin!(spawn);
        let spawn_result = tokio::select! {
            result = &mut spawn => result,
            command = self.control_rx.recv() => {
                match command {
                    Some(Control::Stop(reply)) => {
                        self.mark_stopped(None).await;
                        let _ = reply.send(Ok(()));
                    }
                    None => self.mark_stopped(None).await,
                }
                return SupervisionOutcome::Clean;
            }
        };
        let mut running = match spawn_result {
            Ok(value) => value,
            Err(error) => {
                self.last_error = Some(error.clone());
                let mut snapshot = self.status.write().await;
                snapshot.state = UarSupervisorState::Degraded;
                snapshot.last_error = Some(error.clone());
                snapshot.restart_count = attempt;
                drop(snapshot);
                return if is_terminal_uar_failure(&error)
                    || error.starts_with("Failed to spawn UAR sidecar")
                {
                    SupervisionOutcome::Terminal(error)
                } else {
                    SupervisionOutcome::Retryable {
                        error: Some(error),
                        ready_uptime: None,
                    }
                };
            }
        };

        let endpoint = format!("http://127.0.0.1:{}", running.1);
        if let Err(error) = wait_until_ready(
            &self.client,
            &endpoint,
            Duration::from_millis(self.config.effective_ready_timeout_ms()),
        )
        .await
        {
            let _ = graceful_shutdown(&mut running.0, self.config.shutdown_grace_secs).await;
            self.last_error = Some(error.clone());
            {
                let mut snapshot = self.status.write().await;
                snapshot.state = UarSupervisorState::Degraded;
                snapshot.last_error = Some(error.clone());
            }
            return SupervisionOutcome::Retryable {
                error: Some(error),
                ready_uptime: None,
            };
        }

        let ready_at = std::time::Instant::now();
        {
            let mut snapshot = self.status.write().await;
            snapshot.state = UarSupervisorState::Healthy;
            snapshot.endpoint = Some(endpoint.clone());
            snapshot.port = Some(running.1);
            snapshot.last_error = None;
            snapshot.restart_count = attempt;
        }
        self.publish_endpoint(Some(endpoint.clone()));
        if let Some(tx) = self.started_tx.take() {
            let _ = tx.send(Ok(()));
        }
        info!(endpoint = %endpoint, "UAR sidecar is ready");

        let mut health_tick = tokio::time::interval(HEALTH_POLL_INTERVAL);
        health_tick.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Skip);
        let exit = loop {
            tokio::select! {
                command = self.control_rx.recv() => {
                    match command {
                        Some(Control::Stop(reply)) => {
                            let result = graceful_shutdown(
                                &mut running.0,
                                self.config.shutdown_grace_secs,
                            ).await;
                            self.mark_stopped(result.as_ref().err().cloned()).await;
                            let _ = reply.send(result);
                            return SupervisionOutcome::Clean;
                        }
                        None => {
                            let result = graceful_shutdown(
                                &mut running.0,
                                self.config.shutdown_grace_secs,
                            ).await;
                            self.mark_stopped(result.err()).await;
                            return SupervisionOutcome::Clean;
                        }
                    }
                }
                wait = running.0.child.wait() => break wait,
                _ = health_tick.tick() => {
                    let mut snapshot = self.status.write().await;
                    if let Err(error) = probe(&self.client, &endpoint).await {
                        snapshot.state = UarSupervisorState::Degraded;
                        snapshot.last_error = Some(error);
                    } else {
                        snapshot.state = UarSupervisorState::Healthy;
                        snapshot.last_error = None;
                    }
                }
            }
        };

        let stderr = running.0.stderr.lock().await.clone();
        let exit_detail = match exit {
            Ok(exit) => format!("UAR sidecar exited unexpectedly with {exit}"),
            Err(error) => format!("failed waiting for UAR sidecar: {error}"),
        };
        let error = if stderr.trim().is_empty() {
            exit_detail
        } else {
            format!("{exit_detail}: {}", stderr.trim())
        };
        self.last_error = Some(error.clone());
        let terminal = is_terminal_uar_failure(&stderr);
        {
            let mut snapshot = self.status.write().await;
            snapshot.state = if terminal || !self.restart_policy.enabled {
                UarSupervisorState::CrashLooping
            } else {
                UarSupervisorState::Degraded
            };
            snapshot.last_error = Some(error.clone());
            snapshot.endpoint = None;
            snapshot.port = None;
        }
        self.publish_endpoint(None);
        warn!(
            error = %error,
            attempt,
            terminal,
            "UAR sidecar stopped unexpectedly"
        );
        if terminal {
            SupervisionOutcome::Terminal(error)
        } else {
            SupervisionOutcome::Retryable {
                error: Some(error),
                ready_uptime: Some(ready_at.elapsed()),
            }
        }
    }

    async fn wait_to_retry(&mut self, delay: Duration) -> bool {
        tokio::select! {
            _ = tokio::time::sleep(delay) => true,
            command = self.control_rx.recv() => {
                match command {
                    Some(Control::Stop(reply)) => {
                        self.mark_stopped(None).await;
                        let _ = reply.send(Ok(()));
                    }
                    None => self.mark_stopped(None).await,
                }
                false
            }
        }
    }

    async fn retry_exhausted(&mut self, attempt: u32, error: Option<&str>) {
        let error = error
            .map(str::to_string)
            .or_else(|| self.last_error.clone())
            .unwrap_or_else(|| "UAR sidecar restart budget exhausted".to_string());
        if let Some(tx) = self.started_tx.take() {
            let _ = tx.send(Err(error.clone()));
        }
        let mut snapshot = self.status.write().await;
        snapshot.state = UarSupervisorState::CrashLooping;
        snapshot.last_error = Some(error);
        snapshot.restart_count = attempt;
        snapshot.endpoint = None;
        snapshot.port = None;
        drop(snapshot);
        self.publish_endpoint(None);
    }
}

async fn spawn_and_wait_ready(
    command: &str,
    raw_command: &str,
    home_dir: &std::path::Path,
    config: &UarSidecarConfig,
    environment: &[(String, String)],
) -> Result<(RunningChild, u16), String> {
    let mut command_builder = Command::new(command);
    command_builder
        .envs(environment.iter().cloned())
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .kill_on_drop(true);
    let mut child = command_builder.spawn().map_err(|error| {
        let base = format!("Failed to spawn UAR sidecar '{command}': {error}");
        bundled_binary_hint(raw_command, home_dir)
            .map(|hint| format!("{base}\n{hint}"))
            .unwrap_or(base)
    })?;

    let stdin = child
        .stdin
        .take()
        .ok_or_else(|| "UAR sidecar stdin was not piped".to_string())?;
    let stdout = child
        .stdout
        .take()
        .ok_or_else(|| "UAR sidecar stdout was not piped".to_string())?;
    let stderr = child
        .stderr
        .take()
        .ok_or_else(|| "UAR sidecar stderr was not piped".to_string())?;

    let stderr_text = Arc::new(Mutex::new(String::new()));
    let stderr_capture = Arc::clone(&stderr_text);
    tokio::spawn(async move {
        let mut reader = BufReader::new(stderr).lines();
        while let Ok(Some(line)) = reader.next_line().await {
            debug!(target: "uar_sidecar", "{line}");
            let mut captured = stderr_capture.lock().await;
            if captured.len() < STDERR_LIMIT {
                let remaining = STDERR_LIMIT - captured.len();
                captured.push_str(&line[..line.len().min(remaining)]);
                captured.push('\n');
            }
        }
    });

    let mut lines = BufReader::new(stdout).lines();
    let ready_timeout_ms = config.effective_ready_timeout_ms();
    let port_result = tokio::time::timeout(Duration::from_millis(ready_timeout_ms), async {
        let line = lines
            .next_line()
            .await
            .map_err(|error| format!("failed reading UAR READY line: {error}"))?
            .ok_or_else(|| "UAR sidecar exited before printing READY:<port>".to_string())?;
        parse_ready_line(&line)
    })
    .await;
    let port = match port_result {
        Ok(Ok(port)) => port,
        result => {
            let failure = match result {
                Ok(Err(error)) => error,
                Err(_) => format!(
                    "UAR sidecar did not print READY:<port> within {}ms",
                    ready_timeout_ms
                ),
                Ok(Ok(_)) => unreachable!("successful readiness handled above"),
            };
            let _ = child.kill().await;
            let _ = child.wait().await;
            tokio::task::yield_now().await;
            let stderr = stderr_text.lock().await.clone();
            return if stderr.trim().is_empty() {
                Err(failure)
            } else {
                Err(format!("{failure}: {}", stderr.trim()))
            };
        }
    };
    tokio::spawn(async move {
        while let Ok(Some(line)) = lines.next_line().await {
            debug!(target: "uar_sidecar", "{line}");
        }
    });

    Ok((
        RunningChild {
            child,
            stdin: Some(stdin),
            stderr: stderr_text,
        },
        port,
    ))
}

fn parse_ready_line(line: &str) -> Result<u16, String> {
    let raw = line
        .strip_prefix("READY:")
        .ok_or_else(|| format!("malformed UAR readiness line '{line}'; expected READY:<port>"))?;
    let port = raw
        .parse::<u16>()
        .map_err(|_| format!("malformed UAR readiness port '{raw}'"))?;
    if port == 0 {
        return Err("malformed UAR readiness port '0'".to_string());
    }
    Ok(port)
}

/// Identify operator-actionable configuration failures that cannot heal by
/// restarting the same process with the same environment.
///
/// Provider rate limits, timeouts, and transport failures remain transient.
/// Missing/invalid configuration and authentication fail immediately into the
/// crash-looping state so the dashboard shows the stderr instead of silently
/// spending the entire retry budget.
fn is_terminal_uar_failure(stderr: &str) -> bool {
    let value = stderr.to_ascii_lowercase();
    [
        "missing persistence.provider",
        "missing field",
        "invalid configuration",
        "configuration error",
        "failed to load config",
        "authentication failed",
        "invalid api key",
        "api key is missing",
        "api key not set",
        "unauthorized",
    ]
    .iter()
    .any(|needle| value.contains(needle))
}

async fn probe(client: &reqwest::Client, endpoint: &str) -> Result<(), String> {
    for path in ["/healthz", "/readyz"] {
        let response = client
            .get(format!("{endpoint}{path}"))
            .timeout(Duration::from_secs(1))
            .send()
            .await
            .map_err(|error| format!("UAR {path} probe failed at {endpoint}: {error}"))?;
        if !response.status().is_success() {
            return Err(format!(
                "UAR {path} probe returned HTTP {} at {endpoint}",
                response.status()
            ));
        }
    }
    Ok(())
}

async fn wait_until_ready(
    client: &reqwest::Client,
    endpoint: &str,
    timeout: Duration,
) -> Result<(), String> {
    let readiness = async {
        loop {
            if probe(client, endpoint).await.is_ok() {
                return;
            }
            tokio::time::sleep(Duration::from_millis(200)).await;
        }
    };
    match tokio::time::timeout(timeout, readiness).await {
        Ok(()) => Ok(()),
        Err(_) => Err(format!(
            "UAR did not become ready within {}ms",
            timeout.as_millis()
        )),
    }
}

async fn graceful_shutdown(running: &mut RunningChild, grace_secs: u64) -> Result<(), String> {
    // Dropping the pipe is the documented cross-platform UAR shutdown signal.
    running.stdin.take();
    match tokio::time::timeout(Duration::from_secs(grace_secs), running.child.wait()).await {
        Ok(Ok(status)) if status.success() => Ok(()),
        Ok(Ok(status)) => Err(format!("UAR sidecar exited with {status} during shutdown")),
        Ok(Err(error)) => Err(format!("failed waiting for UAR sidecar shutdown: {error}")),
        Err(_) => {
            #[cfg(unix)]
            if let Some(pid) = running.child.id() {
                let terminated = Command::new("/bin/kill")
                    .arg("-TERM")
                    .arg(pid.to_string())
                    .status()
                    .await
                    .is_ok_and(|status| status.success());
                if terminated {
                    match tokio::time::timeout(Duration::from_secs(1), running.child.wait()).await {
                        Ok(Ok(status)) => {
                            return Err(format!(
                                "UAR sidecar ignored stdin EOF for {grace_secs}s and exited \
                                 with {status} after SIGTERM"
                            ));
                        }
                        Ok(Err(error)) => {
                            return Err(format!(
                                "failed reaping UAR sidecar after SIGTERM: {error}"
                            ));
                        }
                        Err(_) => {}
                    }
                }
            }
            running
                .child
                .start_kill()
                .map_err(|error| format!("failed to kill unresponsive UAR sidecar: {error}"))?;
            running
                .child
                .wait()
                .await
                .map_err(|error| format!("failed reaping killed UAR sidecar: {error}"))?;
            Err(format!(
                "UAR sidecar ignored stdin EOF for {grace_secs}s and was force-killed"
            ))
        }
    }
}

fn normalize_endpoint(endpoint: &str) -> String {
    endpoint.trim_end_matches('/').to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn ready_line_requires_exact_contract_and_nonzero_port() {
        assert_eq!(parse_ready_line("READY:1906").unwrap(), 1906);
        for invalid in ["ready:1906", "READY:", "READY:0", "READY:not-a-port"] {
            assert!(parse_ready_line(invalid).is_err(), "{invalid}");
        }
    }

    #[test]
    fn terminal_configuration_failures_do_not_consume_the_restart_budget() {
        assert!(is_terminal_uar_failure(
            "configuration error: missing persistence.provider"
        ));
        assert!(is_terminal_uar_failure(
            "authentication failed: invalid API key"
        ));
        assert!(!is_terminal_uar_failure(
            "provider returned 429; retry after 2 seconds"
        ));
        assert!(!is_terminal_uar_failure("connection reset by peer"));
    }

    #[test]
    fn runtime_settings_are_forwarded_without_repurposing_the_sidecar_endpoint() {
        let runtime = UarConfig {
            api_key: "test-secret".to_string(),
            model: "groq/test-model".to_string(),
            base_url: Some("https://provider.example/v1".to_string()),
            surreal_data_dir: Some(PathBuf::from("/tmp/uar-data")),
            ..Default::default()
        };
        let supervisor = UarSidecarSupervisor::new(Default::default(), PathBuf::new())
            .with_runtime_config(Some(&runtime));
        let environment = supervisor
            .environment
            .iter()
            .cloned()
            .collect::<std::collections::HashMap<_, _>>();

        assert_eq!(environment["LLM_API_KEY"], "test-secret");
        assert_eq!(environment["LLM_MODEL"], "groq/test-model");
        assert_eq!(environment["LLM_BASE_URL"], "https://provider.example/v1");
        assert_eq!(environment["UAR_SIDECAR"], "1");
        assert_eq!(
            environment["UAR_PERSISTENCE__DATABASE_URL"],
            "surrealkv:///tmp/uar-data"
        );
        assert!(!environment.contains_key("UAR_ENDPOINT"));
    }

    #[tokio::test]
    async fn endpoint_mode_health_checks_without_spawning() {
        let app = axum::Router::new()
            .route("/healthz", axum::routing::get(|| async { "ok" }))
            .route("/readyz", axum::routing::get(|| async { "ready" }));
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let endpoint = format!("http://{}", listener.local_addr().unwrap());
        tokio::spawn(async move {
            axum::serve(listener, app).await.unwrap();
        });

        let config = UarSidecarConfig {
            enabled: true,
            endpoint: Some(endpoint.clone()),
            command: "/definitely/not/a/binary".to_string(),
            ..UarSidecarConfig::default()
        };
        let supervisor = UarSidecarSupervisor::new(config, PathBuf::new());
        let status = supervisor.start().await.unwrap();
        assert_eq!(status.state, UarSupervisorState::Healthy);
        assert_eq!(status.endpoint.as_deref(), Some(endpoint.as_str()));
        assert!(status.resolved_path.is_none());
    }

    #[tokio::test]
    async fn endpoint_mode_waits_for_delayed_readiness() {
        let ready = Arc::new(std::sync::atomic::AtomicBool::new(false));
        let route_ready = Arc::clone(&ready);
        let app = axum::Router::new()
            .route("/healthz", axum::routing::get(|| async { "ok" }))
            .route(
                "/readyz",
                axum::routing::get(move || {
                    let ready = Arc::clone(&route_ready);
                    async move {
                        if ready.load(std::sync::atomic::Ordering::SeqCst) {
                            axum::http::StatusCode::OK
                        } else {
                            axum::http::StatusCode::SERVICE_UNAVAILABLE
                        }
                    }
                }),
            );
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let endpoint = format!("http://{}", listener.local_addr().unwrap());
        tokio::spawn(async move {
            axum::serve(listener, app).await.unwrap();
        });
        tokio::spawn(async move {
            tokio::time::sleep(Duration::from_millis(300)).await;
            ready.store(true, std::sync::atomic::Ordering::SeqCst);
        });

        let supervisor = UarSidecarSupervisor::new(
            UarSidecarConfig {
                endpoint: Some(endpoint),
                ready_timeout_ms: 2_000,
                ..Default::default()
            },
            PathBuf::new(),
        );
        assert_eq!(
            supervisor.start().await.unwrap().state,
            UarSupervisorState::Healthy
        );
    }

    #[tokio::test]
    async fn endpoint_readiness_is_bounded_by_millisecond_budget() {
        let app = axum::Router::new()
            .route(
                "/healthz",
                axum::routing::get(|| async {
                    tokio::time::sleep(Duration::from_secs(1)).await;
                    "ok"
                }),
            )
            .route("/readyz", axum::routing::get(|| async { "ready" }));
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let endpoint = format!("http://{}", listener.local_addr().unwrap());
        tokio::spawn(async move {
            axum::serve(listener, app).await.unwrap();
        });

        let supervisor = UarSidecarSupervisor::new(
            UarSidecarConfig {
                endpoint: Some(endpoint),
                ready_timeout_ms: 100,
                ..Default::default()
            },
            PathBuf::new(),
        );
        let error = supervisor.start().await.unwrap_err();
        assert!(error.contains("within 100ms"), "{error}");
    }

    #[tokio::test]
    async fn missing_bundled_binary_has_actionable_paths() {
        let config = UarSidecarConfig {
            enabled: true,
            restart: false,
            ready_timeout_ms: 1_000,
            ..UarSidecarConfig::default()
        };
        let home = tempfile::tempdir().unwrap();
        let supervisor = UarSidecarSupervisor::new(config, home.path().to_path_buf());
        let error = supervisor.start().await.unwrap_err();
        assert!(error.contains("bundled location"), "{error}");
        assert!(error.contains("bin/uar-sidecar"), "{error}");
        assert!(error.contains("$PATH"), "{error}");
    }

    #[cfg(unix)]
    fn executable_script(dir: &tempfile::TempDir, body: &str) -> PathBuf {
        use std::os::unix::fs::PermissionsExt;

        let path = dir.path().join("fake-uar-sidecar");
        std::fs::write(&path, format!("#!/usr/bin/env python3\n{body}")).unwrap();
        let mut permissions = std::fs::metadata(&path).unwrap().permissions();
        permissions.set_mode(0o755);
        std::fs::set_permissions(&path, permissions).unwrap();
        path
    }

    #[cfg(unix)]
    #[tokio::test]
    async fn fake_sidecar_spawns_reports_ready_and_exits_on_stdin_eof() {
        let dir = tempfile::tempdir().unwrap();
        let stopped = dir.path().join("stopped");
        let script = executable_script(
            &dir,
            &format!(
                r#"
import http.server, sys, threading
class Handler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.end_headers()
    def log_message(self, format, *args):
        pass
server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), Handler)
print(f"READY:{{server.server_port}}", flush=True)
threading.Thread(target=server.serve_forever, daemon=True).start()
sys.stdin.read()
server.shutdown()
open({stopped:?}, "w").write("stopped")
"#
            ),
        );
        let config = UarSidecarConfig {
            enabled: true,
            command: script.to_string_lossy().into_owned(),
            restart: false,
            ready_timeout_ms: 3_000,
            shutdown_grace_secs: 3,
            ..UarSidecarConfig::default()
        };
        let supervisor = UarSidecarSupervisor::new(config, dir.path().to_path_buf());
        let status = supervisor.start().await.unwrap();
        assert_eq!(status.state, UarSupervisorState::Healthy);
        assert!(status.port.is_some());

        let status = supervisor.stop().await.unwrap();
        assert_eq!(status.state, UarSupervisorState::Stopped);
        assert!(stopped.exists(), "fake sidecar did not observe stdin EOF");
    }

    #[cfg(unix)]
    #[tokio::test]
    async fn child_that_never_prints_ready_times_out() {
        let dir = tempfile::tempdir().unwrap();
        let script = executable_script(
            &dir,
            r#"
import time
time.sleep(30)
"#,
        );
        let config = UarSidecarConfig {
            enabled: true,
            command: script.to_string_lossy().into_owned(),
            restart: false,
            ready_timeout_ms: 100,
            ..UarSidecarConfig::default()
        };
        let supervisor = UarSidecarSupervisor::new(config, dir.path().to_path_buf());
        let error = supervisor.start().await.unwrap_err();
        assert!(error.contains("within 100ms"), "{error}");
        assert_eq!(
            supervisor.status().await.state,
            UarSupervisorState::CrashLooping
        );
    }

    #[cfg(unix)]
    #[tokio::test]
    async fn malformed_first_stdout_line_fails_immediately() {
        let dir = tempfile::tempdir().unwrap();
        let script = executable_script(
            &dir,
            r#"
import time
print("starting", flush=True)
time.sleep(30)
"#,
        );
        let supervisor = UarSidecarSupervisor::new(
            UarSidecarConfig {
                enabled: true,
                command: script.to_string_lossy().into_owned(),
                restart: false,
                ready_timeout_ms: 5_000,
                ..UarSidecarConfig::default()
            },
            dir.path().to_path_buf(),
        );
        let error = supervisor.start().await.unwrap_err();
        assert!(error.contains("malformed UAR readiness line"), "{error}");
    }

    #[cfg(unix)]
    #[tokio::test]
    async fn stop_interrupts_a_child_waiting_for_ready() {
        let dir = tempfile::tempdir().unwrap();
        let script = executable_script(
            &dir,
            r#"
import time
time.sleep(30)
"#,
        );
        let supervisor = Arc::new(UarSidecarSupervisor::new(
            UarSidecarConfig {
                enabled: true,
                command: script.to_string_lossy().into_owned(),
                restart: false,
                ready_timeout_ms: 30_000,
                ..UarSidecarConfig::default()
            },
            dir.path().to_path_buf(),
        ));
        let starting = Arc::clone(&supervisor);
        let start_task = tokio::spawn(async move { starting.start().await });

        tokio::time::timeout(Duration::from_secs(10), async {
            loop {
                if supervisor.status().await.state == UarSupervisorState::Starting {
                    break;
                }
                tokio::time::sleep(Duration::from_millis(10)).await;
            }
        })
        .await
        .expect("supervisor did not enter starting state");

        tokio::time::timeout(Duration::from_secs(10), supervisor.stop())
            .await
            .expect("stop waited for the full READY timeout")
            .unwrap();
        assert_eq!(supervisor.status().await.state, UarSupervisorState::Stopped);
        assert!(start_task.await.unwrap().is_err());
    }

    #[cfg(unix)]
    #[tokio::test]
    async fn readiness_failure_retries_before_start_returns() {
        let dir = tempfile::tempdir().unwrap();
        let launches = dir.path().join("readiness-launches");
        let script = executable_script(
            &dir,
            &format!(
                r#"
import http.server, os, sys, threading
count = 1
try:
    count = int(open({launches:?}).read()) + 1
except FileNotFoundError:
    pass
open({launches:?}, "w").write(str(count))
if count == 1:
    os._exit(2)
class Handler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.end_headers()
    def log_message(self, format, *args):
        pass
server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), Handler)
print(f"READY:{{server.server_port}}", flush=True)
threading.Thread(target=server.serve_forever, daemon=True).start()
sys.stdin.read()
"#
            ),
        );
        let supervisor = UarSidecarSupervisor::new(
            UarSidecarConfig {
                enabled: true,
                command: script.to_string_lossy().into_owned(),
                restart: true,
                restart_initial_backoff_ms: 10,
                restart_max_backoff_ms: 20,
                restart_max_retries: 2,
                ready_timeout_ms: 10_000,
                ..Default::default()
            },
            dir.path().to_path_buf(),
        );

        assert_eq!(
            supervisor.start().await.unwrap().state,
            UarSupervisorState::Healthy
        );
        assert_eq!(std::fs::read_to_string(launches).unwrap(), "2");
        supervisor.stop().await.unwrap();
    }

    #[cfg(unix)]
    #[tokio::test]
    async fn unexpected_crash_restarts_with_bounded_backoff() {
        let dir = tempfile::tempdir().unwrap();
        let launches = dir.path().join("launches");
        let script = executable_script(
            &dir,
            &format!(
                r#"
import http.server, os, sys, threading, time
class Handler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.end_headers()
    def log_message(self, format, *args):
        pass
count = 1
try:
    count = int(open({launches:?}).read()) + 1
except FileNotFoundError:
    pass
open({launches:?}, "w").write(str(count))
server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), Handler)
print(f"READY:{{server.server_port}}", flush=True)
threading.Thread(target=server.serve_forever, daemon=True).start()
if count == 1:
    time.sleep(0.25)
    os._exit(2)
sys.stdin.read()
"#
            ),
        );
        let config = UarSidecarConfig {
            enabled: true,
            command: script.to_string_lossy().into_owned(),
            restart: true,
            restart_initial_backoff_ms: 400,
            restart_max_backoff_ms: 400,
            restart_max_retries: 2,
            restart_reset_after_secs: 60,
            ready_timeout_ms: 3_000,
            shutdown_grace_secs: 2,
            ..UarSidecarConfig::default()
        };
        let published = Arc::new(std::sync::Mutex::new(Vec::new()));
        let published_for_callback = Arc::clone(&published);
        let supervisor = UarSidecarSupervisor::new(config, dir.path().to_path_buf())
            .with_endpoint_callback(move |endpoint| {
                published_for_callback
                    .lock()
                    .unwrap_or_else(std::sync::PoisonError::into_inner)
                    .push(endpoint);
            });
        supervisor.start().await.unwrap();

        tokio::time::timeout(Duration::from_secs(10), async {
            loop {
                if supervisor.status().await.state == UarSupervisorState::Degraded {
                    break;
                }
                tokio::time::sleep(Duration::from_millis(10)).await;
            }
        })
        .await
        .expect("sidecar did not enter restart backoff");
        let repeated_start = supervisor.start().await.unwrap();
        assert_eq!(repeated_start.state, UarSupervisorState::Healthy);
        assert_eq!(repeated_start.restart_count, 1);
        assert_eq!(std::fs::read_to_string(&launches).unwrap(), "2");

        tokio::time::timeout(Duration::from_secs(10), async {
            loop {
                let status = supervisor.status().await;
                if status.state == UarSupervisorState::Healthy && status.restart_count == 1 {
                    break;
                }
                tokio::time::sleep(Duration::from_millis(25)).await;
            }
        })
        .await
        .expect("sidecar did not restart");
        assert_eq!(std::fs::read_to_string(&launches).unwrap(), "2");
        supervisor.stop().await.unwrap();
        let published = published
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner);
        let endpoints = published.iter().flatten().collect::<Vec<_>>();
        assert_eq!(endpoints.len(), 2);
        assert_ne!(endpoints[0], endpoints[1]);
        assert_eq!(published.last(), Some(&None));
    }
}
