//! Connection state for an independently owned Universal Agent Runtime.
//!
//! Historical module/type names remain read-compatible. This module never
//! resolves a binary, spawns a child, provisions storage, or terminates UAR.
use librefang_types::config::{UarServiceInstanceConfig, UarSidecarConfig};
use serde::Serialize;
use std::path::PathBuf;
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::{Mutex, RwLock};

type EndpointCallback = Arc<dyn Fn(Option<String>, Option<String>) + Send + Sync>;

/// Operator-visible connection state; names preserve historical status readers.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum UarSupervisorState {
    Stopped,
    Starting,
    Healthy,
    Degraded,
}

/// Connection diagnostics. Legacy process fields are always empty/zero.
#[derive(Debug, Clone, Serialize)]
pub struct UarSidecarStatus {
    pub state: UarSupervisorState,
    pub resolved_path: Option<String>,
    pub endpoint: Option<String>,
    pub port: Option<u16>,
    pub restart_count: u32,
    pub last_error: Option<String>,
    pub migration_required: bool,
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
            migration_required: false,
        }
    }
}

/// Private selected connection; bearer never enters status or saved config.
struct SelectedConnection {
    config: UarSidecarConfig,
    instance: Option<UarServiceInstanceConfig>,
    bearer: Option<String>,
}

/// A connection manager, with no authority over the remote service lifecycle.
pub struct UarConnectionManager {
    selected: RwLock<SelectedConnection>,
    status: RwLock<UarSidecarStatus>,
    lifecycle: Mutex<()>,
    command: Mutex<()>,
    endpoint_callback: Option<EndpointCallback>,
}
/// Historical internal name retained for AppState and downstream source readers.
pub type UarSidecarSupervisor = UarConnectionManager;

impl UarConnectionManager {
    #[must_use]
    pub fn new(config: UarSidecarConfig, _home_dir: PathBuf) -> Self {
        Self {
            selected: RwLock::new(SelectedConnection {
                config,
                instance: None,
                bearer: None,
            }),
            status: RwLock::new(UarSidecarStatus::default()),
            lifecycle: Mutex::new(()),
            endpoint_callback: None,
            command: Mutex::new(()),
        }
    }
    #[must_use]
    pub fn with_instance_config(mut self, instance: Option<&UarServiceInstanceConfig>) -> Self {
        if let Some(instance) = instance {
            let selected = self.selected.get_mut();
            selected.instance = Some(instance.clone());
            selected.config.endpoint = instance
                .endpoints
                .runtime
                .clone()
                .or_else(|| instance.sidecar.endpoint.clone());
        }
        self
    }
    #[must_use]
    pub fn with_probe_bearer(mut self, bearer: Option<String>) -> Self {
        self.selected.get_mut().bearer = bearer;
        self
    }
    #[must_use]
    pub fn with_endpoint_callback(
        mut self,
        callback: impl Fn(Option<String>, Option<String>) + Send + Sync + 'static,
    ) -> Self {
        self.endpoint_callback = Some(Arc::new(callback));
        self
    }
    /// Replace a private selected connection. Caller must hold Owner API authority.
    pub async fn configure(&self, instance: UarServiceInstanceConfig, bearer: Option<String>) {
        let _guard = self.lifecycle.lock().await;
        self.disconnect_inner().await;
        let mut selected = self.selected.write().await;
        selected.config = instance.effective_sidecar();
        selected.config.endpoint = instance
            .endpoints
            .runtime
            .clone()
            .or_else(|| instance.sidecar.endpoint.clone());
        selected.instance = Some(instance);
        selected.bearer = bearer;
    }
    /// Serialize API selection and driver publication as one connection command.
    pub async fn command_guard(&self) -> tokio::sync::MutexGuard<'_, ()> {
        self.command.lock().await
    }
    pub async fn selected_instance(&self) -> Option<UarServiceInstanceConfig> {
        self.selected.read().await.instance.clone()
    }
    /// Probe and connect. Failed migration/readiness never launches a process.
    pub async fn connect(&self) -> Result<UarSidecarStatus, String> {
        let _guard = self.lifecycle.lock().await;
        self.disconnect_inner().await;
        let selected = self.selected.read().await;
        let Some(endpoint) = selected.config.endpoint.as_deref() else {
            let legacy = selected.config.enabled
                || !selected.config.command.is_empty()
                || selected.instance.as_ref().is_some_and(|instance| {
                    instance.sidecar.enabled || !instance.sidecar.command.is_empty()
                });
            drop(selected);
            return if legacy {
                self.fail("UAR_CONNECTION_MIGRATION_REQUIRED: select an existing UAR runtime endpoint; legacy enabled/command configuration is preserved but BossFang no longer launches UAR", true).await
            } else {
                self.fail(
                    "UAR_INSTANCE_REQUIRED: select an existing UAR runtime endpoint",
                    false,
                )
                .await
            };
        };
        let endpoint = match validate_endpoint(endpoint) {
            Ok(value) => value,
            Err(error) => {
                drop(selected);
                return self.fail(&error, false).await;
            }
        };
        let bearer = selected.bearer.clone();
        let timeout = Duration::from_millis(selected.config.effective_ready_timeout_ms());
        drop(selected);
        self.status.write().await.state = UarSupervisorState::Starting;
        let client = reqwest::Client::builder()
            .redirect(reqwest::redirect::Policy::none())
            .timeout(timeout)
            .build()
            .map_err(|_| {
                "UAR_CONNECTION_FAILED: cannot initialize connection client".to_string()
            })?;
        let mut request = client.get(format!("{endpoint}/readyz"));
        if let Some(bearer) = bearer {
            request = request.bearer_auth(bearer);
        }
        match request.send().await {
            Ok(response) if response.status().is_success() => {
                let mut status = self.status.write().await;
                status.state = UarSupervisorState::Healthy;
                status.endpoint = Some(endpoint.clone());
                status.port = reqwest::Url::parse(&endpoint).ok().and_then(|url| url.port_or_known_default());
                status.last_error = None; status.migration_required = false;
                if let Some(callback) = &self.endpoint_callback { callback(Some(endpoint), None); }
                Ok(status.clone())
            }
            Ok(response) => self.fail(&format!("UAR_CONNECTION_FAILED: readiness returned HTTP {}", response.status()), false).await,
            Err(_) => self.fail("UAR_CONNECTION_FAILED: selected endpoint is unreachable or readiness timed out", false).await,
        }
    }
    async fn fail(
        &self,
        message: &str,
        migration_required: bool,
    ) -> Result<UarSidecarStatus, String> {
        let mut status = self.status.write().await;
        status.state = UarSupervisorState::Degraded;
        status.last_error = Some(message.to_string());
        status.migration_required = migration_required;
        Err(message.to_string())
    }
    /// Preserve a compatibility refusal as an actionable connection diagnostic.
    pub async fn admission_failed(&self, message: &str) {
        let _ = self.fail(message, false).await;
    }
    /// Detach locally, without invoking any UAR shutdown or task cancellation.
    pub async fn disconnect(&self) -> Result<UarSidecarStatus, String> {
        let _guard = self.lifecycle.lock().await;
        self.disconnect_inner().await;
        Ok(self.status.read().await.clone())
    }
    async fn disconnect_inner(&self) {
        *self.status.write().await = UarSidecarStatus::default();
        if let Some(callback) = &self.endpoint_callback {
            callback(None, None);
        }
    }
    pub async fn reconnect(&self) -> Result<UarSidecarStatus, String> {
        self.connect().await
    }
    pub async fn status(&self) -> UarSidecarStatus {
        self.status.read().await.clone()
    }
    pub async fn endpoint(&self) -> Option<String> {
        self.status.read().await.endpoint.clone()
    }
    /// Legacy methods have connection-only effects.
    pub async fn start(&self) -> Result<UarSidecarStatus, String> {
        self.connect().await
    }
    pub async fn stop(&self) -> Result<UarSidecarStatus, String> {
        self.disconnect().await
    }
    pub async fn restart(&self) -> Result<UarSidecarStatus, String> {
        self.reconnect().await
    }
}

/// Credentials may only travel over loopback HTTP or HTTPS, with no URL secrets.
pub fn validate_endpoint(endpoint: &str) -> Result<String, String> {
    let url = reqwest::Url::parse(endpoint).map_err(|_| {
        "UAR_ENDPOINT_INVALID: expected loopback HTTP or HTTPS endpoint".to_string()
    })?;
    let loopback = url.host_str().is_some_and(|host| {
        host == "localhost"
            || host
                .trim_matches(['[', ']'])
                .parse::<std::net::IpAddr>()
                .is_ok_and(|ip| ip.is_loopback())
    });
    if !url.username().is_empty()
        || url.password().is_some()
        || url.query().is_some()
        || url.fragment().is_some()
        || !(url.scheme() == "https" || (url.scheme() == "http" && loopback))
    {
        return Err("UAR_ENDPOINT_INVALID: credentials require loopback HTTP or HTTPS without URL userinfo, query or fragment".to_string());
    }
    Ok(endpoint.trim_end_matches('/').to_string())
}
