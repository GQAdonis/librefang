//! UAR (Universal Agent Runtime) LLM driver.
//!
//! Connects to a supervised UAR sidecar over its OpenAI-compatible HTTP
//! surface, giving LibreFang agents access to 142+
//! providers via unified `provider/model` addressing (e.g.
//! `"openai/gpt-4o"`, `"anthropic/claude-opus-4"`,
//! `"groq/llama-3.3-70b-versatile"`).
//!
//! # Usage in an agent manifest
//!
//! ```toml
//! [model]
//! provider = "uar"
//! model    = "openai/gpt-4o"   # any liter-llm provider/model string
//!
//! [env]
//! UAR_LLM__API_KEY = "sk-..."  # or a provider-specific key
//! ```
//!
//! `UarConfig::base_url` remains an LLM-provider override used by UAR itself.
//! It is intentionally never treated as the UAR process endpoint.

use std::sync::{Arc, OnceLock, RwLock};
use std::time::Duration;

use async_trait::async_trait;
use futures::StreamExt;
use librefang_types::{
    message::{ContentBlock, MessageContent, Role, StopReason, TokenUsage},
    tool::{ToolCall, ToolDefinition},
};

use crate::llm_driver::{
    CompletionRequest, CompletionResponse, DriverConfig, LlmDriver, LlmError, StreamEvent,
};

// ---------------------------------------------------------------------------
// Driver struct
// ---------------------------------------------------------------------------

#[derive(Clone, Default)]
struct PublishedEndpoint {
    url: Option<String>,
    generation: u64,
}

static SUPERVISED_ENDPOINT: OnceLock<RwLock<PublishedEndpoint>> = OnceLock::new();

fn endpoint_cell() -> &'static RwLock<PublishedEndpoint> {
    SUPERVISED_ENDPOINT.get_or_init(|| RwLock::new(PublishedEndpoint::default()))
}

/// Publish the endpoint selected by the UAR supervisor.
///
/// The port is ephemeral, so it cannot be stored in `DriverConfig` at kernel
/// boot. Drivers resolve this shared value at call time, which also makes a
/// dashboard restart immediately visible without rebuilding every agent.
pub fn set_supervised_endpoint(endpoint: Option<String>) {
    let mut guard = endpoint_cell()
        .write()
        .unwrap_or_else(std::sync::PoisonError::into_inner);
    guard.url = endpoint.map(|value| value.trim_end_matches('/').to_string());
    guard.generation = guard.generation.wrapping_add(1);
}

fn supervised_endpoint() -> Result<(String, u64), LlmError> {
    let published = endpoint_cell()
        .read()
        .unwrap_or_else(std::sync::PoisonError::into_inner)
        .clone();
    published
        .url
        .map(|url| (url, published.generation))
        .ok_or_else(|| {
            LlmError::Http(
                "UAR sidecar is not available; start it in the dashboard or configure \
                 [uar.sidecar] endpoint"
                    .to_string(),
            )
        })
}

/// LLM driver backed by the supervised UAR HTTP API.
///
/// Created via `provider = "uar"` in an agent manifest; the model string
/// must use liter-llm's `provider/model` convention.
pub struct UarDriver {
    client: reqwest::Client,
    verified_endpoint: tokio::sync::Mutex<Option<(String, u64)>>,
    request_timeout: Duration,
}

const MAX_STREAMED_TOOL_CALLS: usize = 256;
const MAX_SSE_EVENT_BYTES: usize = 1024 * 1024;

#[derive(Default)]
struct StreamedToolCall {
    id: String,
    name: String,
    arguments: String,
    emitted_arguments_len: usize,
    started: bool,
}

impl std::fmt::Debug for UarDriver {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("UarDriver")
            .field("transport", &"http+sse")
            .finish()
    }
}

impl UarDriver {
    /// Construct a `UarDriver` and return it as `Arc<dyn LlmDriver>`.
    ///
    /// # Errors
    ///
    /// Currently infallible — returns `Err` only to satisfy the
    /// `create_driver` call-site convention.
    pub fn create(config: &DriverConfig) -> Result<Arc<dyn LlmDriver>, LlmError> {
        validate_provider_overrides(config)?;
        Ok(Arc::new(Self {
            client: reqwest::Client::builder()
                .connect_timeout(Duration::from_secs(5))
                .build()
                .map_err(|error| {
                    LlmError::Http(format!("failed to build UAR HTTP client: {error}"))
                })?,
            verified_endpoint: tokio::sync::Mutex::new(None),
            request_timeout: Duration::from_secs(config.request_timeout_secs.unwrap_or(120).max(1)),
        }))
    }

    async fn send(
        &self,
        request: reqwest::RequestBuilder,
        operation: &str,
    ) -> Result<reqwest::Response, LlmError> {
        tokio::time::timeout(self.request_timeout, request.send())
            .await
            .map_err(|_| {
                LlmError::Http(format!(
                    "UAR {operation} timed out after {} seconds",
                    self.request_timeout.as_secs()
                ))
            })?
            .map_err(|error| LlmError::Http(format!("UAR {operation} failed: {error}")))
    }

    async fn response_text(
        &self,
        response: reqwest::Response,
        operation: &str,
    ) -> Result<String, LlmError> {
        tokio::time::timeout(self.request_timeout, response.text())
            .await
            .map_err(|_| {
                LlmError::Http(format!(
                    "UAR {operation} body timed out after {} seconds",
                    self.request_timeout.as_secs()
                ))
            })?
            .map_err(|error| LlmError::Http(format!("failed reading UAR {operation}: {error}")))
    }

    async fn endpoint(&self) -> Result<String, LlmError> {
        let (endpoint, generation) = supervised_endpoint()?;
        let mut verified = self.verified_endpoint.lock().await;
        let is_verified = verified
            .as_ref()
            .is_some_and(|(url, value)| url == &endpoint && *value == generation);
        if !is_verified {
            self.verify_capabilities(&endpoint).await?;
            *verified = Some((endpoint.clone(), generation));
        }
        Ok(endpoint)
    }

    async fn verify_capabilities(&self, endpoint: &str) -> Result<(), LlmError> {
        self.send(
            self.client.get(format!("{endpoint}/readyz")),
            &format!("readiness check at {endpoint}"),
        )
        .await?
        .error_for_status()
        .map_err(|error| LlmError::Http(format!("UAR is not ready at {endpoint}: {error}")))?;

        let spec_response = self
            .send(
                self.client.get(format!("{endpoint}/api/openapi.json")),
                &format!("compatibility check at {endpoint}"),
            )
            .await?
            .error_for_status()
            .map_err(|error| {
                LlmError::Http(format!(
                    "UAR compatibility check failed at {endpoint}: {error}"
                ))
            })?;
        let spec_payload = self
            .response_text(spec_response, "compatibility check")
            .await?;
        let spec: serde_json::Value = serde_json::from_str(&spec_payload).map_err(|error| {
            LlmError::Http(format!("UAR returned an invalid OpenAPI document: {error}"))
        })?;
        let title = spec
            .pointer("/info/title")
            .and_then(serde_json::Value::as_str);
        let version = spec
            .pointer("/info/version")
            .and_then(serde_json::Value::as_str);
        if title != Some("Universal Agent Runtime")
            || !version.is_some_and(|value| value.starts_with("0."))
        {
            return Err(LlmError::Http(format!(
                "incompatible UAR API at {endpoint}: title={title:?}, version={version:?}; \
                 expected Universal Agent Runtime API 0.x"
            )));
        }
        let has_completion = spec
            .pointer("/paths/~1api~1chat~1completion/post")
            .is_some();
        let request_properties =
            spec.pointer("/components/schemas/ChatCompletionRequest/properties");
        let has_streaming = request_properties
            .and_then(|properties| properties.get("stream"))
            .is_some()
            && request_properties
                .and_then(|properties| properties.get("stream_mode"))
                .is_some();
        if has_completion && !has_streaming {
            return Err(LlmError::Http(format!(
                "incompatible UAR API at {endpoint}: POST /api/chat/completion is missing its \
                 stream/stream_mode request capabilities"
            )));
        }
        if !has_completion {
            let has_openai_facade = spec
                .pointer("/paths/~1v1~1chat~1completions/post")
                .is_some();
            if !has_openai_facade {
                return Err(LlmError::Http(format!(
                    "incompatible UAR API at {endpoint}: missing POST /api/chat/completion or its \
                     stream/stream_mode request capabilities"
                )));
            }

            // The pinned 0.1 UAR image publishes a deliberately sparse OpenAPI
            // document: it advertises the OpenAI facade but omits the internal
            // completion route used by the sidecar client. Confirm that hidden
            // route's validation contract without issuing a billable LLM call.
            let probe_response = self
                .send(
                    self.client
                        .post(format!("{endpoint}/api/chat/completion"))
                        .json(&serde_json::json!({})),
                    "completion capability probe",
                )
                .await?;
            let probe_status = probe_response.status();
            let probe_payload = self
                .response_text(probe_response, "completion capability probe")
                .await?;
            let probe: serde_json::Value =
                serde_json::from_str(&probe_payload).unwrap_or(serde_json::Value::Null);
            let has_request_contract = probe_status == reqwest::StatusCode::BAD_REQUEST
                && probe
                    .pointer("/error/param")
                    .and_then(serde_json::Value::as_str)
                    == Some("messages")
                && probe
                    .pointer("/error/code")
                    .and_then(serde_json::Value::as_str)
                    == Some("invalid_request");
            if !has_request_contract {
                return Err(LlmError::Http(format!(
                    "incompatible UAR API at {endpoint}: sparse OpenAPI document and the \
                     /api/chat/completion contract probe returned HTTP {probe_status}"
                )));
            }
        }

        let models_response = self
            .send(
                self.client.get(format!("{endpoint}/api/models")),
                "model capability check",
            )
            .await?
            .error_for_status()
            .map_err(|error| {
                LlmError::Http(format!("UAR model capability check failed: {error}"))
            })?;
        let models_payload = self
            .response_text(models_response, "model capability check")
            .await?;
        let models: serde_json::Value = serde_json::from_str(&models_payload)
            .map_err(|error| LlmError::Http(format!("UAR model catalog is invalid: {error}")))?;
        if !models.is_object() {
            return Err(LlmError::Http(
                "incompatible UAR API: /api/models did not return an object".to_string(),
            ));
        }
        Ok(())
    }
}

// ---------------------------------------------------------------------------
// LlmDriver implementation
// ---------------------------------------------------------------------------

#[async_trait]
impl LlmDriver for UarDriver {
    async fn complete(&self, request: CompletionRequest) -> Result<CompletionResponse, LlmError> {
        let endpoint = self.endpoint().await?;
        let body = build_uar_request(&request, false);
        let response = self
            .send(
                self.client
                    .post(format!("{endpoint}/api/chat/completion"))
                    .json(&body),
                &format!("completion request at {endpoint}"),
            )
            .await?;
        let status = response.status();
        let payload = self.response_text(response, "completion response").await?;
        if !status.is_success() {
            return Err(LlmError::Http(format!(
                "UAR completion returned HTTP {status}: {}",
                error_message(&payload)
            )));
        }
        let json: serde_json::Value = serde_json::from_str(&payload).map_err(|error| {
            LlmError::Http(format!("UAR completion returned invalid JSON: {error}"))
        })?;
        let text = json
            .pointer("/choices/0/message/content")
            .and_then(serde_json::Value::as_str)
            .unwrap_or_default()
            .to_string();
        let tool_calls = parse_tool_calls(json.pointer("/choices/0/message/tool_calls"))?;
        let finish_reason = json
            .pointer("/choices/0/finish_reason")
            .and_then(serde_json::Value::as_str);
        let stop_reason = map_uar_finish_reason(finish_reason, !tool_calls.is_empty());
        if text.is_empty() && tool_calls.is_empty() && stop_reason != StopReason::ContentFiltered {
            return Err(LlmError::Http(
                "UAR completion response omitted both message content and tool calls".to_string(),
            ));
        }
        let usage = usage_from_json(json.get("usage"));
        Ok(completion_response(text, tool_calls, usage, stop_reason))
    }

    async fn stream(
        &self,
        request: CompletionRequest,
        tx: tokio::sync::mpsc::Sender<StreamEvent>,
    ) -> Result<CompletionResponse, LlmError> {
        let endpoint = self.endpoint().await?;
        let body = build_uar_request(&request, true);
        let response = self
            .send(
                self.client
                    .post(format!("{endpoint}/api/chat/completion"))
                    .json(&body),
                &format!("streaming request at {endpoint}"),
            )
            .await?;
        let status = response.status();
        if !status.is_success() {
            let payload = self
                .response_text(response, "streaming error response")
                .await
                .unwrap_or_default();
            return Err(LlmError::Http(format!(
                "UAR streaming request returned HTTP {status}: {}",
                error_message(&payload)
            )));
        }

        let mut bytes = response.bytes_stream();
        let mut buffer = Vec::new();
        let mut text = String::new();
        let mut usage = TokenUsage::default();
        let mut streamed_tools = Vec::new();
        let mut finish_reason = None;
        let mut stream_done = false;
        'stream: loop {
            let next = tokio::time::timeout(self.request_timeout, bytes.next())
                .await
                .map_err(|_| {
                    LlmError::Http(format!(
                        "UAR SSE stream was idle for {} seconds",
                        self.request_timeout.as_secs()
                    ))
                })?;
            let Some(chunk) = next else {
                break;
            };
            let chunk =
                chunk.map_err(|error| LlmError::Http(format!("UAR SSE stream failed: {error}")))?;
            buffer.extend_from_slice(&chunk);
            while let Some((boundary, separator_len)) = sse_boundary(&buffer) {
                ensure_sse_event_size(boundary)?;
                let event = std::str::from_utf8(&buffer[..boundary])
                    .map_err(|error| {
                        LlmError::Http(format!("UAR SSE event was not valid UTF-8: {error}"))
                    })?
                    .to_string();
                buffer.drain(..boundary + separator_len);
                if consume_sse_event(
                    &event,
                    &tx,
                    &mut text,
                    &mut usage,
                    &mut streamed_tools,
                    &mut finish_reason,
                )
                .await?
                {
                    stream_done = true;
                    break 'stream;
                }
            }
            ensure_sse_event_size(buffer.len())?;
        }
        if !stream_done && !buffer.iter().all(u8::is_ascii_whitespace) {
            let event = std::str::from_utf8(&buffer).map_err(|error| {
                LlmError::Http(format!("UAR SSE event was not valid UTF-8: {error}"))
            })?;
            stream_done = consume_sse_event(
                event,
                &tx,
                &mut text,
                &mut usage,
                &mut streamed_tools,
                &mut finish_reason,
            )
            .await?;
        }
        if !stream_done {
            return Err(LlmError::Http(
                "UAR SSE stream ended before the [DONE] event".to_string(),
            ));
        }
        let tool_calls = finish_streamed_tool_calls(streamed_tools, &tx).await?;
        let stop_reason = map_uar_finish_reason(finish_reason.as_deref(), !tool_calls.is_empty());
        let _ = tx
            .send(StreamEvent::ContentComplete { stop_reason, usage })
            .await;
        Ok(completion_response(text, tool_calls, usage, stop_reason))
    }
}

fn completion_response(
    text: String,
    tool_calls: Vec<ToolCall>,
    usage: TokenUsage,
    stop_reason: StopReason,
) -> CompletionResponse {
    let mut content = Vec::new();
    if !text.is_empty() {
        content.push(ContentBlock::Text {
            text,
            provider_metadata: None,
        });
    }
    content.extend(tool_calls.iter().map(|call| ContentBlock::ToolUse {
        id: call.id.clone(),
        name: call.name.clone(),
        input: call.input.clone(),
        provider_metadata: None,
    }));
    CompletionResponse {
        content,
        stop_reason,
        tool_calls,
        usage,
        actual_provider: None,
        actual_model: None,
    }
}

fn map_uar_finish_reason(reason: Option<&str>, has_tool_calls: bool) -> StopReason {
    match reason {
        Some("stop") => StopReason::EndTurn,
        Some("tool_calls") => StopReason::ToolUse,
        Some("length") => StopReason::MaxTokens,
        Some("content_filter") => StopReason::ContentFiltered,
        _ if has_tool_calls => StopReason::ToolUse,
        _ => StopReason::EndTurn,
    }
}

fn validate_provider_overrides(config: &DriverConfig) -> Result<(), LlmError> {
    let inherited_key = std::env::var("UAR_LLM__API_KEY")
        .ok()
        .or_else(|| std::env::var("LLM_API_KEY").ok());
    if config.api_key.as_ref().is_some_and(|configured| {
        inherited_key
            .as_ref()
            .is_none_or(|inherited| inherited != configured)
    }) {
        return Err(LlmError::Http(
            "UAR uses one supervised provider configuration; set the provider key in [uar] \
             api_key (or UAR_LLM__API_KEY) instead of a per-agent model override"
                .to_string(),
        ));
    }

    let inherited_url = std::env::var("UAR_LLM__BASE_URL")
        .ok()
        .or_else(|| std::env::var("LLM_BASE_URL").ok());
    if config.base_url.as_ref().is_some_and(|configured| {
        inherited_url
            .as_ref()
            .is_none_or(|inherited| inherited != configured)
    }) {
        return Err(LlmError::Http(
            "UAR uses one supervised provider configuration; set the provider URL in [uar] \
             base_url (or UAR_LLM__BASE_URL) instead of a per-agent model override"
                .to_string(),
        ));
    }
    Ok(())
}

fn parse_tool_calls(value: Option<&serde_json::Value>) -> Result<Vec<ToolCall>, LlmError> {
    let Some(calls) = value.and_then(serde_json::Value::as_array) else {
        return Ok(Vec::new());
    };
    calls
        .iter()
        .map(|call| {
            let id = call.get("id").and_then(serde_json::Value::as_str);
            let name = call
                .pointer("/function/name")
                .and_then(serde_json::Value::as_str);
            let arguments = call
                .pointer("/function/arguments")
                .and_then(serde_json::Value::as_str)
                .unwrap_or_default();
            let (id, name) = match (id, name) {
                (Some(id), Some(name)) if !id.is_empty() && !name.is_empty() => (id, name),
                _ => {
                    return Err(LlmError::Http(
                        "UAR completion returned a tool call without an id or function name"
                            .to_string(),
                    ));
                }
            };
            let input = super::openai::parse_tool_args(arguments)
                .map(super::openai::ensure_object)
                .map_err(|error| {
                    LlmError::Http(format!(
                        "UAR completion returned invalid arguments for tool {name}: {error}"
                    ))
                })?;
            Ok(ToolCall {
                id: id.to_string(),
                name: name.to_string(),
                input,
            })
        })
        .collect()
}

fn usage_from_json(value: Option<&serde_json::Value>) -> TokenUsage {
    TokenUsage {
        input_tokens: value
            .and_then(|usage| usage.get("prompt_tokens"))
            .and_then(serde_json::Value::as_u64)
            .unwrap_or_default(),
        output_tokens: value
            .and_then(|usage| usage.get("completion_tokens"))
            .and_then(serde_json::Value::as_u64)
            .unwrap_or_default(),
        ..TokenUsage::default()
    }
}

fn error_message(payload: &str) -> String {
    serde_json::from_str::<serde_json::Value>(payload)
        .ok()
        .and_then(|json| {
            json.pointer("/error/message")
                .and_then(serde_json::Value::as_str)
                .map(str::to_string)
        })
        .unwrap_or_else(|| payload.chars().take(500).collect())
}

fn sse_boundary(buffer: &[u8]) -> Option<(usize, usize)> {
    let crlf = buffer.windows(4).position(|window| window == b"\r\n\r\n");
    let lf = buffer.windows(2).position(|window| window == b"\n\n");
    match (crlf, lf) {
        (Some(crlf), Some(lf)) if crlf <= lf => Some((crlf, 4)),
        (Some(_), Some(lf)) | (None, Some(lf)) => Some((lf, 2)),
        (Some(crlf), None) => Some((crlf, 4)),
        (None, None) => None,
    }
}

fn ensure_sse_event_size(size: usize) -> Result<(), LlmError> {
    if size > MAX_SSE_EVENT_BYTES {
        return Err(LlmError::Http(format!(
            "UAR SSE event exceeded the {MAX_SSE_EVENT_BYTES}-byte limit"
        )));
    }
    Ok(())
}

async fn consume_sse_event(
    event: &str,
    tx: &tokio::sync::mpsc::Sender<StreamEvent>,
    text: &mut String,
    usage: &mut TokenUsage,
    streamed_tools: &mut Vec<StreamedToolCall>,
    finish_reason: &mut Option<String>,
) -> Result<bool, LlmError> {
    let data = event
        .lines()
        .filter_map(|line| line.strip_prefix("data:").map(str::trim_start))
        .collect::<Vec<_>>()
        .join("\n");
    if data.is_empty() {
        return Ok(false);
    }
    if data.trim() == "[DONE]" {
        return Ok(true);
    }

    let json: serde_json::Value = serde_json::from_str(&data)
        .map_err(|error| LlmError::Http(format!("invalid UAR SSE event: {error}")))?;
    if let Some(reason) = json
        .pointer("/choices/0/finish_reason")
        .and_then(serde_json::Value::as_str)
    {
        *finish_reason = Some(reason.to_string());
    }
    if let Some(delta) = json
        .pointer("/choices/0/delta/content")
        .and_then(serde_json::Value::as_str)
    {
        text.push_str(delta);
        let _ = tx
            .send(StreamEvent::TextDelta {
                text: delta.to_string(),
            })
            .await;
    }
    if let Some(calls) = json
        .pointer("/choices/0/delta/tool_calls")
        .and_then(serde_json::Value::as_array)
    {
        for call in calls {
            let index = call
                .get("index")
                .and_then(serde_json::Value::as_u64)
                .unwrap_or_default() as usize;
            if index >= MAX_STREAMED_TOOL_CALLS {
                return Err(LlmError::Http(format!(
                    "UAR stream returned tool-call index {index}, above the supported limit"
                )));
            }
            while streamed_tools.len() <= index {
                streamed_tools.push(StreamedToolCall::default());
            }
            let accumulator = &mut streamed_tools[index];
            if let Some(id) = call.get("id").and_then(serde_json::Value::as_str) {
                accumulator.id = id.to_string();
            }
            if let Some(function) = call.get("function") {
                if let Some(name) = function.get("name").and_then(serde_json::Value::as_str) {
                    accumulator.name = name.to_string();
                }
                if let Some(arguments) = function
                    .get("arguments")
                    .and_then(serde_json::Value::as_str)
                {
                    accumulator.arguments.push_str(arguments);
                }
                if !accumulator.started
                    && !accumulator.id.is_empty()
                    && !accumulator.name.is_empty()
                {
                    let _ = tx
                        .send(StreamEvent::ToolUseStart {
                            id: accumulator.id.clone(),
                            name: accumulator.name.clone(),
                        })
                        .await;
                    accumulator.started = true;
                }
                if accumulator.started
                    && accumulator.emitted_arguments_len < accumulator.arguments.len()
                {
                    let delta =
                        accumulator.arguments[accumulator.emitted_arguments_len..].to_string();
                    let _ = tx.send(StreamEvent::ToolInputDelta { text: delta }).await;
                    accumulator.emitted_arguments_len = accumulator.arguments.len();
                }
            }
        }
    }
    if let Some(event_usage) = json.get("usage") {
        *usage = usage_from_json(Some(event_usage));
    }
    if let Some(message) = json
        .pointer("/error/message")
        .and_then(serde_json::Value::as_str)
    {
        return Err(LlmError::Http(format!("UAR stream error: {message}")));
    }
    Ok(false)
}

async fn finish_streamed_tool_calls(
    streamed_tools: Vec<StreamedToolCall>,
    tx: &tokio::sync::mpsc::Sender<StreamEvent>,
) -> Result<Vec<ToolCall>, LlmError> {
    let mut tool_calls = Vec::new();
    for call in streamed_tools {
        if call.id.is_empty() || call.name.is_empty() {
            return Err(LlmError::Http(format!(
                "UAR stream returned an incomplete tool call (id={:?}, name={:?})",
                call.id, call.name
            )));
        }
        if !call.started {
            let _ = tx
                .send(StreamEvent::ToolUseStart {
                    id: call.id.clone(),
                    name: call.name.clone(),
                })
                .await;
            if !call.arguments.is_empty() {
                let _ = tx
                    .send(StreamEvent::ToolInputDelta {
                        text: call.arguments.clone(),
                    })
                    .await;
            }
        }
        let input = match super::openai::parse_tool_args(&call.arguments) {
            Ok(value) => super::openai::ensure_object(value),
            Err(error) => {
                return Err(LlmError::Http(format!(
                    "UAR stream returned invalid arguments for tool {}: {error}",
                    call.name
                )));
            }
        };
        let _ = tx
            .send(StreamEvent::ToolUseEnd {
                id: call.id.clone(),
                name: call.name.clone(),
                input: input.clone(),
            })
            .await;
        tool_calls.push(ToolCall {
            id: call.id,
            name: call.name,
            input,
        });
    }
    Ok(tool_calls)
}

// ---------------------------------------------------------------------------
// Request translation helpers
// ---------------------------------------------------------------------------

/// Convert a LibreFang [`CompletionRequest`] into UAR's OpenAI-compatible JSON.
///
/// Messages are serialized as OpenAI-format JSON values, which liter-llm
/// then deserializes into its own typed `Message` enum inside the driver.
fn build_uar_request(request: &CompletionRequest, stream: bool) -> serde_json::Value {
    let mut messages: Vec<serde_json::Value> = Vec::new();

    // Inject system prompt first when supplied via the dedicated field.
    if let Some(ref sys) = request.system {
        messages.push(serde_json::json!({ "role": "system", "content": sys }));
    }

    for msg in request.messages.iter() {
        match (&msg.role, &msg.content) {
            // ── System ──────────────────────────────────────────────────
            // Only include if no dedicated system field was provided.
            (Role::System, MessageContent::Text(text)) if request.system.is_none() => {
                messages.push(serde_json::json!({ "role": "system", "content": text }));
            }

            // ── User — plain text ────────────────────────────────────────
            (Role::User, MessageContent::Text(text)) => {
                messages.push(serde_json::json!({ "role": "user", "content": text }));
            }

            // ── Assistant — plain text ───────────────────────────────────
            (Role::Assistant, MessageContent::Text(text)) => {
                messages.push(serde_json::json!({ "role": "assistant", "content": text }));
            }

            // ── User — structured blocks ─────────────────────────────────
            // Tool results become separate `tool`-role messages; other content
            // (text, images) becomes a single `user`-role message with parts.
            (Role::User, MessageContent::Blocks(blocks)) => {
                let mut parts: Vec<serde_json::Value> = Vec::new();
                let mut has_tool_results = false;

                for block in blocks {
                    match block {
                        ContentBlock::ToolResult {
                            tool_use_id,
                            content,
                            ..
                        } => {
                            has_tool_results = true;
                            messages.push(serde_json::json!({
                                "role": "tool",
                                "content": if content.is_empty() { "(empty)" } else { content.as_str() },
                                "tool_call_id": tool_use_id,
                            }));
                        }
                        ContentBlock::Text { text, .. } => {
                            parts.push(serde_json::json!({ "type": "text", "text": text }));
                        }
                        ContentBlock::Image { media_type, data } => {
                            parts.push(serde_json::json!({
                                "type": "image_url",
                                "image_url": {
                                    "url": format!("data:{media_type};base64,{data}")
                                }
                            }));
                        }
                        // `ImageFile` references a local on-disk image — not
                        // sent over the wire (we'd need to read+base64-encode
                        // here; defer to callers that already inline images).
                        ContentBlock::ImageFile { .. }
                        | ContentBlock::Thinking { .. }
                        | ContentBlock::ToolUse { .. }
                        | ContentBlock::Unknown => {}
                    }
                }

                // Only emit a user message when there is non-tool-result content
                // and it wasn't a pure tool-result block list.
                if !parts.is_empty() && !has_tool_results {
                    messages.push(serde_json::json!({ "role": "user", "content": parts }));
                }
            }

            // ── Assistant — structured blocks ────────────────────────────
            // Extract text, tool-use calls, and thinking blocks.
            (Role::Assistant, MessageContent::Blocks(blocks)) => {
                let mut text_parts: Vec<String> = Vec::new();
                let mut tool_calls_json: Vec<serde_json::Value> = Vec::new();

                for block in blocks {
                    match block {
                        ContentBlock::Text { text, .. } => {
                            text_parts.push(text.clone());
                        }
                        ContentBlock::ToolUse {
                            id, name, input, ..
                        } => {
                            tool_calls_json.push(serde_json::json!({
                                "id": id,
                                "type": "function",
                                "function": {
                                    "name": name,
                                    "arguments": serde_json::to_string(&input)
                                        .unwrap_or_else(|_| "{}".to_string()),
                                }
                            }));
                        }
                        // Thinking blocks are not forwarded — providers that
                        // support thinking don't need the prior round's trace.
                        ContentBlock::Thinking { .. }
                        | ContentBlock::ToolResult { .. }
                        | ContentBlock::Image { .. }
                        | ContentBlock::ImageFile { .. }
                        | ContentBlock::Unknown => {}
                    }
                }

                let mut msg_val = serde_json::json!({ "role": "assistant" });
                msg_val["content"] = if text_parts.is_empty() {
                    serde_json::Value::Null
                } else {
                    serde_json::Value::String(text_parts.join(""))
                };
                if !tool_calls_json.is_empty() {
                    msg_val["tool_calls"] = serde_json::Value::Array(tool_calls_json);
                }
                messages.push(msg_val);
            }

            _ => {}
        }
    }

    let mut body = serde_json::json!({
        "model": request.model,
        "messages": messages,
        "tools": tools_to_openai_json(&request.tools),
        "max_tokens": request.max_tokens,
        "temperature": request.temperature,
        "stream": stream,
        "stream_mode": "openai",
        "memory_enabled": false,
        "prompt_caching_enabled": request.prompt_caching,
    });
    if let Some(session_id) = request.session_id.as_ref() {
        body["session_id"] = serde_json::Value::String(session_id.clone());
    }
    if let Some(response_format) = request.response_format.as_ref() {
        if let Ok(value) = serde_json::to_value(response_format) {
            body["response_format"] = value;
        }
    }
    if let Some(extra_body) = request.extra_body.as_ref() {
        if let Some(object) = body.as_object_mut() {
            for (key, value) in extra_body {
                if matches!(
                    key.as_str(),
                    "model" | "messages" | "tools" | "stream" | "stream_mode" | "memory_enabled"
                ) {
                    tracing::warn!(key, "ignoring reserved UAR extra_body field");
                    continue;
                }
                object.insert(key.clone(), value.clone());
            }
        }
    }
    body
}

/// Convert LibreFang [`ToolDefinition`]s to OpenAI function-calling JSON schema.
fn tools_to_openai_json(tools: &[ToolDefinition]) -> Vec<serde_json::Value> {
    tools
        .iter()
        .map(|t| {
            serde_json::json!({
                "type": "function",
                "function": {
                    "name": t.name,
                    "description": t.description,
                    "parameters": t.input_schema,
                }
            })
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use librefang_types::message::Message;
    use serial_test::serial;
    use wiremock::matchers::{body_json, body_partial_json, method, path};
    use wiremock::{Mock, MockServer, ResponseTemplate};

    async fn mount_fake_capabilities(server: &MockServer, version: &'static str) {
        Mock::given(method("GET"))
            .and(path("/readyz"))
            .respond_with(ResponseTemplate::new(200))
            .mount(server)
            .await;
        Mock::given(method("GET"))
            .and(path("/api/openapi.json"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "info": {
                    "title": "Universal Agent Runtime",
                    "version": version
                },
                "paths": {
                    "/api/chat/completion": { "post": {} }
                },
                "components": {
                    "schemas": {
                        "ChatCompletionRequest": {
                            "properties": {
                                "stream": { "type": "boolean" },
                                "stream_mode": { "type": "string" }
                            }
                        }
                    }
                }
            })))
            .mount(server)
            .await;
        Mock::given(method("GET"))
            .and(path("/api/models"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({})))
            .mount(server)
            .await;
    }

    async fn fake_uar(version: &'static str) -> MockServer {
        let server = MockServer::start().await;
        mount_fake_capabilities(&server, version).await;
        Mock::given(method("POST"))
            .and(path("/api/chat/completion"))
            .and(body_partial_json(serde_json::json!({
                "stream": false,
                "max_tokens": 64,
                "temperature": 0.0
            })))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "choices": [{
                    "message": { "role": "assistant", "content": "hello from UAR" },
                    "finish_reason": "stop"
                }],
                "usage": { "prompt_tokens": 3, "completion_tokens": 4 }
            })))
            .mount(&server)
            .await;
        Mock::given(method("POST"))
            .and(path("/api/chat/completion"))
            .and(body_partial_json(serde_json::json!({
                "stream": true,
                "max_tokens": 64,
                "temperature": 0.0
            })))
            .respond_with(
                ResponseTemplate::new(200)
                    .insert_header("content-type", "text/event-stream")
                    .set_body_string(concat!(
                        "data: {\"choices\":[{\"delta\":{\"content\":\"hello \"}}]}\n\n",
                        "data: {\"choices\":[{\"delta\":{\"content\":\"from UAR\"}}]}\n\n",
                        "data: [DONE]\n\n"
                    )),
            )
            .mount(&server)
            .await;
        server
    }

    async fn fake_tool_uar() -> MockServer {
        let server = MockServer::start().await;
        mount_fake_capabilities(&server, "0.1.0").await;
        Mock::given(method("POST"))
            .and(path("/api/chat/completion"))
            .and(body_partial_json(serde_json::json!({
                "stream": false,
                "max_tokens": 64,
                "temperature": 0.0
            })))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "choices": [{
                    "message": {
                        "role": "assistant",
                        "content": null,
                        "tool_calls": [{
                            "id": "call_1",
                            "type": "function",
                            "function": {
                                "name": "weather",
                                "arguments": "{\"city\":\"Austin\"}"
                            }
                        }]
                    },
                    "finish_reason": "tool_calls"
                }]
            })))
            .mount(&server)
            .await;
        let first = serde_json::json!({
            "choices": [{"delta": {"tool_calls": [{
                "index": 0,
                "id": "call_2",
                "type": "function",
                "function": {"name": "weather", "arguments": "{\"city\":"}
            }]}}]
        });
        let second = serde_json::json!({
            "choices": [{"delta": {"tool_calls": [{
                "index": 0,
                "function": {"arguments": "\"Chicago\"}"}
            }]}, "finish_reason": "tool_calls"}]
        });
        Mock::given(method("POST"))
            .and(path("/api/chat/completion"))
            .and(body_partial_json(serde_json::json!({
                "stream": true,
                "max_tokens": 64,
                "temperature": 0.0
            })))
            .respond_with(
                ResponseTemplate::new(200)
                    .insert_header("content-type", "text/event-stream")
                    .set_body_string(format!(
                        "data: {first}\n\ndata: {second}\n\ndata: [DONE]\n\n"
                    )),
            )
            .mount(&server)
            .await;
        server
    }

    fn request() -> CompletionRequest {
        CompletionRequest {
            model: "openai/test-model".to_string(),
            messages: Arc::new(vec![Message::user("hello")]),
            max_tokens: 64,
            ..CompletionRequest::default()
        }
    }

    fn response_text(response: &CompletionResponse) -> &str {
        match &response.content[0] {
            ContentBlock::Text { text, .. } => text,
            other => panic!("expected text response, got {other:?}"),
        }
    }

    #[test]
    fn extra_body_cannot_override_transport_critical_fields() {
        let mut request = request();
        request.extra_body = Some(std::collections::BTreeMap::from([
            ("stream".to_string(), serde_json::json!(false)),
            ("stream_mode".to_string(), serde_json::json!("broken")),
            ("model".to_string(), serde_json::json!("other/model")),
            ("max_tokens".to_string(), serde_json::json!(42)),
        ]));
        let body = build_uar_request(&request, true);
        assert_eq!(body["stream"], true);
        assert_eq!(body["stream_mode"], "openai");
        assert_eq!(body["model"], "openai/test-model");
        assert_eq!(body["max_tokens"], 42);
    }

    #[test]
    fn finish_reason_mapping_preserves_terminal_semantics() {
        assert_eq!(
            map_uar_finish_reason(Some("stop"), false),
            StopReason::EndTurn
        );
        assert_eq!(
            map_uar_finish_reason(Some("tool_calls"), true),
            StopReason::ToolUse
        );
        assert_eq!(
            map_uar_finish_reason(Some("length"), false),
            StopReason::MaxTokens
        );
        assert_eq!(
            map_uar_finish_reason(Some("content_filter"), false),
            StopReason::ContentFiltered
        );
        assert_eq!(map_uar_finish_reason(None, true), StopReason::ToolUse);
    }

    #[tokio::test]
    #[serial]
    async fn content_filtered_completion_may_have_empty_content() {
        let server = MockServer::start().await;
        mount_fake_capabilities(&server, "0.1.0").await;
        Mock::given(method("POST"))
            .and(path("/api/chat/completion"))
            .and(body_partial_json(serde_json::json!({"stream": false})))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "choices": [{
                    "message": { "role": "assistant", "content": null },
                    "finish_reason": "content_filter"
                }]
            })))
            .mount(&server)
            .await;

        set_supervised_endpoint(Some(server.uri()));
        let driver = UarDriver::create(&DriverConfig::default()).unwrap();
        let response = driver.complete(request()).await.unwrap();
        assert_eq!(response.stop_reason, StopReason::ContentFiltered);
        assert!(response.content.is_empty());
        set_supervised_endpoint(None);
    }

    #[tokio::test]
    #[serial]
    async fn completion_and_sse_stream_round_trip_through_sidecar() {
        let server = fake_uar("0.1.0").await;
        set_supervised_endpoint(Some(server.uri()));
        let driver = UarDriver::create(&DriverConfig::default()).unwrap();

        let response = driver.complete(request()).await.unwrap();
        assert_eq!(response_text(&response), "hello from UAR");
        assert_eq!(response.usage.input_tokens, 3);
        assert_eq!(response.usage.output_tokens, 4);

        let (tx, mut rx) = tokio::sync::mpsc::channel(8);
        let response = driver.stream(request(), tx).await.unwrap();
        assert_eq!(response_text(&response), "hello from UAR");
        let mut deltas = Vec::new();
        while let Some(event) = rx.recv().await {
            if let StreamEvent::TextDelta { text } = event {
                deltas.push(text);
            }
        }
        assert_eq!(deltas, ["hello ", "from UAR"]);
        set_supervised_endpoint(None);
    }

    #[tokio::test]
    #[serial]
    async fn max_token_finish_reason_round_trips_for_completion_and_stream() {
        let server = MockServer::start().await;
        mount_fake_capabilities(&server, "0.1.0").await;
        Mock::given(method("POST"))
            .and(path("/api/chat/completion"))
            .and(body_partial_json(serde_json::json!({"stream": false})))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "choices": [{
                    "message": { "role": "assistant", "content": "clipped" },
                    "finish_reason": "length"
                }]
            })))
            .mount(&server)
            .await;
        Mock::given(method("POST"))
            .and(path("/api/chat/completion"))
            .and(body_partial_json(serde_json::json!({"stream": true})))
            .respond_with(
                ResponseTemplate::new(200)
                    .insert_header("content-type", "text/event-stream")
                    .set_body_string(concat!(
                        "data: {\"choices\":[{\"delta\":{\"content\":\"clipped\"},\"finish_reason\":\"length\"}]}\n\n",
                        "data: [DONE]\n\n"
                    )),
            )
            .mount(&server)
            .await;

        set_supervised_endpoint(Some(server.uri()));
        let driver = UarDriver::create(&DriverConfig::default()).unwrap();
        assert_eq!(
            driver.complete(request()).await.unwrap().stop_reason,
            StopReason::MaxTokens
        );
        let (tx, _rx) = tokio::sync::mpsc::channel(8);
        assert_eq!(
            driver.stream(request(), tx).await.unwrap().stop_reason,
            StopReason::MaxTokens
        );
        set_supervised_endpoint(None);
    }

    #[tokio::test]
    #[serial]
    async fn truncated_sse_stream_returns_clear_error() {
        let server = MockServer::start().await;
        mount_fake_capabilities(&server, "0.1.0").await;
        Mock::given(method("POST"))
            .and(path("/api/chat/completion"))
            .and(body_partial_json(serde_json::json!({"stream": true})))
            .respond_with(
                ResponseTemplate::new(200)
                    .insert_header("content-type", "text/event-stream")
                    .set_body_string(
                        "data: {\"choices\":[{\"delta\":{\"content\":\"partial\"}}]}\n\n",
                    ),
            )
            .mount(&server)
            .await;
        set_supervised_endpoint(Some(server.uri()));
        let driver = UarDriver::create(&DriverConfig::default()).unwrap();
        let (tx, _rx) = tokio::sync::mpsc::channel(8);
        let error = driver.stream(request(), tx).await.unwrap_err().to_string();
        assert!(error.contains("ended before the [DONE] event"), "{error}");
        set_supervised_endpoint(None);
    }

    #[tokio::test]
    #[serial]
    async fn same_url_republication_rechecks_sidecar_capabilities() {
        let server = fake_uar("0.1.0").await;
        let endpoint = server.uri();
        set_supervised_endpoint(Some(endpoint.clone()));
        let driver = UarDriver::create(&DriverConfig::default()).unwrap();
        driver.complete(request()).await.unwrap();

        set_supervised_endpoint(Some(endpoint));
        driver.complete(request()).await.unwrap();

        let requests = server.received_requests().await.unwrap();
        let openapi_checks = requests
            .iter()
            .filter(|request| request.url.path() == "/api/openapi.json")
            .count();
        assert_eq!(openapi_checks, 2);
        set_supervised_endpoint(None);
    }

    #[tokio::test]
    #[serial]
    async fn completion_preserves_openai_tool_calls_with_null_content() {
        let server = fake_tool_uar().await;
        set_supervised_endpoint(Some(server.uri()));
        let driver = UarDriver::create(&DriverConfig::default()).unwrap();

        let response = driver.complete(request()).await.unwrap();
        assert_eq!(response.stop_reason, StopReason::ToolUse);
        assert_eq!(response.tool_calls.len(), 1);
        assert_eq!(response.tool_calls[0].id, "call_1");
        assert_eq!(response.tool_calls[0].name, "weather");
        assert_eq!(response.tool_calls[0].input["city"], "Austin");
        assert!(matches!(response.content[0], ContentBlock::ToolUse { .. }));
        set_supervised_endpoint(None);
    }

    #[tokio::test]
    #[serial]
    async fn sse_stream_preserves_tool_events_and_final_tool_call() {
        let server = fake_tool_uar().await;
        set_supervised_endpoint(Some(server.uri()));
        let driver = UarDriver::create(&DriverConfig::default()).unwrap();

        let (tx, mut rx) = tokio::sync::mpsc::channel(8);
        let response = driver.stream(request(), tx).await.unwrap();
        assert_eq!(response.stop_reason, StopReason::ToolUse);
        assert_eq!(response.tool_calls.len(), 1);
        assert_eq!(response.tool_calls[0].input["city"], "Chicago");

        let mut saw_start = false;
        let mut saw_delta = false;
        let mut saw_end = false;
        let mut saw_complete = false;
        while let Some(event) = rx.recv().await {
            match event {
                StreamEvent::ToolUseStart { id, name } => {
                    assert_eq!(id, "call_2");
                    assert_eq!(name, "weather");
                    saw_start = true;
                }
                StreamEvent::ToolInputDelta { text } => {
                    assert!(!text.is_empty());
                    saw_delta = true;
                }
                StreamEvent::ToolUseEnd { id, name, input } => {
                    assert_eq!(id, "call_2");
                    assert_eq!(name, "weather");
                    assert_eq!(input["city"], "Chicago");
                    saw_end = true;
                }
                StreamEvent::ContentComplete { stop_reason, .. } => {
                    assert_eq!(stop_reason, StopReason::ToolUse);
                    saw_complete = true;
                }
                _ => {}
            }
        }
        assert!(saw_start && saw_delta && saw_end && saw_complete);
        set_supervised_endpoint(None);
    }

    #[test]
    fn sse_buffer_preserves_utf8_split_across_transport_chunks() {
        let event = "data: {\"choices\":[{\"delta\":{\"content\":\"hello 🌋\"}}]}\n\n";
        let bytes = event.as_bytes();
        let emoji = event.find('🌋').unwrap();
        let mut buffer = Vec::new();
        buffer.extend_from_slice(&bytes[..emoji + 2]);
        assert_eq!(sse_boundary(&buffer), None);
        buffer.extend_from_slice(&bytes[emoji + 2..]);

        let (boundary, separator_len) = sse_boundary(&buffer).unwrap();
        assert_eq!(separator_len, 2);
        let decoded = std::str::from_utf8(&buffer[..boundary]).unwrap();
        assert!(decoded.contains("hello 🌋"));
    }

    #[test]
    fn oversized_unterminated_sse_event_is_rejected() {
        let error = ensure_sse_event_size(MAX_SSE_EVENT_BYTES + 1)
            .unwrap_err()
            .to_string();
        assert!(error.contains("exceeded"), "{error}");
    }

    #[tokio::test]
    async fn malformed_streamed_tool_arguments_fail_the_stream() {
        let (tx, _rx) = tokio::sync::mpsc::channel(4);
        let error = finish_streamed_tool_calls(
            vec![StreamedToolCall {
                id: "call_bad".to_string(),
                name: "weather".to_string(),
                arguments: "{not-json".to_string(),
                emitted_arguments_len: 0,
                started: true,
            }],
            &tx,
        )
        .await
        .unwrap_err()
        .to_string();
        assert!(
            error.contains("invalid arguments for tool weather"),
            "{error}"
        );
    }

    #[tokio::test]
    async fn buffers_tool_arguments_until_tool_use_start() {
        let (tx, mut rx) = tokio::sync::mpsc::channel(8);
        let mut text = String::new();
        let mut usage = TokenUsage::default();
        let mut tools = Vec::new();
        let mut finish_reason = None;
        consume_sse_event(
            r#"data: {"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"arguments":"{\"city\":\"Austin\"}"}}]}}]}"#,
            &tx,
            &mut text,
            &mut usage,
            &mut tools,
            &mut finish_reason,
        )
        .await
        .unwrap();
        assert!(matches!(
            rx.try_recv(),
            Err(tokio::sync::mpsc::error::TryRecvError::Empty)
        ));

        consume_sse_event(
            r#"data: {"choices":[{"delta":{"tool_calls":[{"index":0,"id":"call_late","function":{"name":"weather"}}]}}]}"#,
            &tx,
            &mut text,
            &mut usage,
            &mut tools,
            &mut finish_reason,
        )
        .await
        .unwrap();
        assert!(matches!(
            rx.recv().await,
            Some(StreamEvent::ToolUseStart { .. })
        ));
        assert!(matches!(
            rx.recv().await,
            Some(StreamEvent::ToolInputDelta { .. })
        ));
    }

    #[test]
    fn rejects_per_agent_provider_overrides_that_sidecar_cannot_honor() {
        let config = DriverConfig {
            provider: "uar".to_string(),
            api_key: Some("per-agent-key-that-is-not-inherited".to_string()),
            base_url: Some("https://per-agent.example/v1".to_string()),
            ..DriverConfig::default()
        };
        let error = match UarDriver::create(&config) {
            Ok(_) => panic!("expected per-agent UAR override to be rejected"),
            Err(error) => error.to_string(),
        };
        assert!(error.contains("one supervised provider configuration"));
        assert!(error.contains("[uar]"));
    }

    #[tokio::test]
    #[serial]
    async fn unreachable_sidecar_returns_clear_error() {
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let endpoint = format!("http://{}", listener.local_addr().unwrap());
        drop(listener);
        set_supervised_endpoint(Some(endpoint));
        let driver = UarDriver::create(&DriverConfig::default()).unwrap();
        let error = driver.complete(request()).await.unwrap_err().to_string();
        assert!(error.contains("readiness check"), "{error}");
        set_supervised_endpoint(None);
    }

    #[tokio::test]
    #[serial]
    async fn stalled_readiness_check_times_out() {
        let server = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/readyz"))
            .respond_with(ResponseTemplate::new(200).set_delay(std::time::Duration::from_secs(2)))
            .mount(&server)
            .await;
        set_supervised_endpoint(Some(server.uri()));
        let driver = UarDriver::create(&DriverConfig {
            provider: "uar".to_string(),
            request_timeout_secs: Some(1),
            ..DriverConfig::default()
        })
        .unwrap();
        let error = driver.complete(request()).await.unwrap_err().to_string();
        assert!(error.contains("timed out after 1 seconds"), "{error}");
        set_supervised_endpoint(None);
    }

    #[tokio::test]
    #[serial]
    async fn unhealthy_sidecar_returns_clear_error_before_completion() {
        let server = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/readyz"))
            .respond_with(ResponseTemplate::new(503))
            .mount(&server)
            .await;
        set_supervised_endpoint(Some(server.uri()));
        let driver = UarDriver::create(&DriverConfig::default()).unwrap();
        let error = driver.complete(request()).await.unwrap_err().to_string();
        assert!(error.contains("UAR is not ready"), "{error}");
        set_supervised_endpoint(None);
    }

    #[tokio::test]
    #[serial]
    async fn incompatible_api_version_is_rejected_before_completion() {
        let server = fake_uar("1.0.0").await;
        set_supervised_endpoint(Some(server.uri()));
        let driver = UarDriver::create(&DriverConfig::default()).unwrap();
        let error = driver.complete(request()).await.unwrap_err().to_string();
        assert!(error.contains("incompatible UAR API"), "{error}");
        assert!(error.contains("version=Some(\"1.0.0\")"), "{error}");
        set_supervised_endpoint(None);
    }

    #[tokio::test]
    #[serial]
    async fn missing_completion_capability_is_rejected_before_completion() {
        let server = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/readyz"))
            .respond_with(ResponseTemplate::new(200))
            .mount(&server)
            .await;
        Mock::given(method("GET"))
            .and(path("/api/openapi.json"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "info": {
                    "title": "Universal Agent Runtime",
                    "version": "0.1.0"
                },
                "paths": {}
            })))
            .mount(&server)
            .await;
        set_supervised_endpoint(Some(server.uri()));
        let driver = UarDriver::create(&DriverConfig::default()).unwrap();
        let error = driver.complete(request()).await.unwrap_err().to_string();
        assert!(
            error.contains("missing POST /api/chat/completion"),
            "{error}"
        );
        set_supervised_endpoint(None);
    }

    #[tokio::test]
    #[serial]
    async fn documented_completion_without_stream_fields_is_rejected() {
        let server = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/readyz"))
            .respond_with(ResponseTemplate::new(200))
            .mount(&server)
            .await;
        Mock::given(method("GET"))
            .and(path("/api/openapi.json"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "info": {
                    "title": "Universal Agent Runtime",
                    "version": "0.1.0"
                },
                "paths": {
                    "/api/chat/completion": { "post": {} },
                    "/v1/chat/completions": { "post": {} }
                }
            })))
            .mount(&server)
            .await;

        set_supervised_endpoint(Some(server.uri()));
        let driver = UarDriver::create(&DriverConfig::default()).unwrap();
        let error = driver.complete(request()).await.unwrap_err().to_string();
        assert!(
            error.contains("missing its stream/stream_mode request capabilities"),
            "{error}"
        );
        set_supervised_endpoint(None);
    }

    #[tokio::test]
    #[serial]
    async fn sparse_pinned_openapi_is_accepted_after_contract_probe() {
        let server = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/readyz"))
            .respond_with(ResponseTemplate::new(200))
            .mount(&server)
            .await;
        Mock::given(method("GET"))
            .and(path("/api/openapi.json"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "info": {
                    "title": "Universal Agent Runtime",
                    "version": "0.1.0"
                },
                "paths": {
                    "/v1/chat/completions": { "post": {} }
                }
            })))
            .mount(&server)
            .await;
        Mock::given(method("POST"))
            .and(path("/api/chat/completion"))
            .and(body_json(serde_json::json!({})))
            .respond_with(ResponseTemplate::new(400).set_body_json(serde_json::json!({
                "error": {
                    "message": "Request must include a user message",
                    "type": "invalid_request_error",
                    "param": "messages",
                    "code": "invalid_request"
                }
            })))
            .mount(&server)
            .await;
        Mock::given(method("GET"))
            .and(path("/api/models"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({})))
            .mount(&server)
            .await;
        Mock::given(method("POST"))
            .and(path("/api/chat/completion"))
            .and(body_partial_json(serde_json::json!({
                "stream": false,
                "model": "openai/test-model"
            })))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "choices": [{
                    "message": { "role": "assistant", "content": "sparse contract works" },
                    "finish_reason": "stop"
                }]
            })))
            .mount(&server)
            .await;

        set_supervised_endpoint(Some(server.uri()));
        let driver = UarDriver::create(&DriverConfig::default()).unwrap();
        assert_eq!(
            response_text(&driver.complete(request()).await.unwrap()),
            "sparse contract works"
        );
        set_supervised_endpoint(None);
    }
}
