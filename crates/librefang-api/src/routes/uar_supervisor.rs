//! Operator-only UAR sidecar lifecycle and diagnostics.

use super::AppState;
use axum::extract::State;
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::Json;
use serde::Deserialize;
use std::sync::Arc;
#[cfg(feature = "uar-driver")]
use std::time::Instant;

pub fn router() -> axum::Router<Arc<AppState>> {
    axum::Router::new()
        .route("/uar/status", axum::routing::get(uar_status))
        .route("/uar/start", axum::routing::post(uar_start))
        .route("/uar/stop", axum::routing::post(uar_stop))
        .route("/uar/restart", axum::routing::post(uar_restart))
        .route("/uar/test", axum::routing::post(uar_test_completion))
        .route("/uar/models", axum::routing::get(uar_models))
}

#[utoipa::path(
    get,
    path = "/api/uar/status",
    tag = "uar",
    responses((status = 200, description = "Current supervised UAR lifecycle state"))
)]
pub(crate) async fn uar_status(State(state): State<Arc<AppState>>) -> impl IntoResponse {
    Json(state.uar_supervisor.status().await)
}

#[utoipa::path(
    post,
    path = "/api/uar/start",
    tag = "uar",
    responses(
        (status = 200, description = "UAR started and ready"),
        (status = 503, description = "UAR failed to start")
    )
)]
pub(crate) async fn uar_start(State(state): State<Arc<AppState>>) -> Response {
    match state.uar_supervisor.start().await {
        Ok(status) => {
            publish_driver_endpoint(status.endpoint.clone());
            Json(status).into_response()
        }
        Err(error) => operator_error(StatusCode::SERVICE_UNAVAILABLE, error.to_string()),
    }
}

#[utoipa::path(
    post,
    path = "/api/uar/stop",
    tag = "uar",
    responses((status = 200, description = "UAR stopped"))
)]
pub(crate) async fn uar_stop(State(state): State<Arc<AppState>>) -> Response {
    match state.uar_supervisor.stop().await {
        Ok(status) => {
            publish_driver_endpoint(None);
            Json(status).into_response()
        }
        Err(error) => operator_error(StatusCode::INTERNAL_SERVER_ERROR, error.to_string()),
    }
}

#[utoipa::path(
    post,
    path = "/api/uar/restart",
    tag = "uar",
    responses(
        (status = 200, description = "UAR restarted and ready"),
        (status = 503, description = "UAR failed to restart")
    )
)]
pub(crate) async fn uar_restart(State(state): State<Arc<AppState>>) -> Response {
    publish_driver_endpoint(None);
    match state.uar_supervisor.restart().await {
        Ok(status) => {
            publish_driver_endpoint(status.endpoint.clone());
            Json(status).into_response()
        }
        Err(error) => operator_error(StatusCode::SERVICE_UNAVAILABLE, error.to_string()),
    }
}

#[derive(Debug, Default, Deserialize, utoipa::ToSchema)]
pub(crate) struct TestCompletionRequest {
    #[serde(default)]
    model: Option<String>,
    #[serde(default)]
    prompt: Option<String>,
}

#[cfg(feature = "uar-driver")]
#[utoipa::path(
    post,
    path = "/api/uar/test",
    tag = "uar",
    responses(
        (status = 200, description = "UAR completion reply and latency"),
        (status = 502, description = "UAR completion failed")
    )
)]
pub(crate) async fn uar_test_completion(
    State(state): State<Arc<AppState>>,
    request: Option<Json<TestCompletionRequest>>,
) -> Response {
    use librefang_llm_driver::{CompletionRequest, DriverConfig};
    use librefang_types::message::{ContentBlock, Message};

    let request = request.map(|Json(value)| value).unwrap_or_default();
    let configured_model = state
        .kernel
        .config_ref()
        .uar
        .as_ref()
        .map(|uar| uar.model.clone())
        .unwrap_or_default();
    let model = request
        .model
        .filter(|value| !value.trim().is_empty())
        .unwrap_or(configured_model);
    if model.trim().is_empty() {
        return operator_error(
            StatusCode::BAD_REQUEST,
            "No UAR model is configured; select a provider/model before testing".to_string(),
        );
    }
    let prompt = request
        .prompt
        .unwrap_or_else(|| "Reply with exactly: BossFang UAR is ready.".to_string());
    let driver = match librefang_llm_drivers::drivers::create_driver(&DriverConfig {
        provider: "uar".to_string(),
        ..DriverConfig::default()
    }) {
        Ok(driver) => driver,
        Err(error) => {
            return operator_error(
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("failed to create UAR driver: {error}"),
            );
        }
    };

    let started = Instant::now();
    match driver
        .complete(CompletionRequest {
            model,
            messages: Arc::new(vec![Message::user(prompt)]),
            max_tokens: 128,
            ..CompletionRequest::default()
        })
        .await
    {
        Ok(response) => {
            let reply = response
                .content
                .iter()
                .filter_map(|block| match block {
                    ContentBlock::Text { text, .. } => Some(text.as_str()),
                    _ => None,
                })
                .collect::<String>();
            Json(serde_json::json!({
                "ok": true,
                "reply": reply,
                "latency_ms": started.elapsed().as_millis(),
            }))
            .into_response()
        }
        Err(error) => operator_error(
            StatusCode::BAD_GATEWAY,
            format!("UAR test completion failed: {error}"),
        ),
    }
}

#[cfg(not(feature = "uar-driver"))]
#[utoipa::path(
    post,
    path = "/api/uar/test",
    tag = "uar",
    responses((status = 503, description = "uar-driver feature is disabled"))
)]
pub(crate) async fn uar_test_completion(
    State(_state): State<Arc<AppState>>,
    request: Option<Json<TestCompletionRequest>>,
) -> Response {
    let _ = request.map(|Json(value)| (value.model, value.prompt));
    operator_error(
        StatusCode::SERVICE_UNAVAILABLE,
        "BossFang was built without the uar-driver feature".to_string(),
    )
}

#[utoipa::path(
    get,
    path = "/api/uar/models",
    tag = "uar",
    responses(
        (status = 200, description = "UAR model catalog"),
        (status = 503, description = "UAR is not running")
    )
)]
pub(crate) async fn uar_models(State(state): State<Arc<AppState>>) -> Response {
    let Some(endpoint) = state.uar_supervisor.endpoint().await else {
        return operator_error(
            StatusCode::SERVICE_UNAVAILABLE,
            "UAR is not running".to_string(),
        );
    };
    match librefang_http::new_client()
        .get(format!("{endpoint}/api/models"))
        .send()
        .await
    {
        Ok(response) => {
            let status = response.status();
            match response.json::<serde_json::Value>().await {
                Ok(body) if status.is_success() => Json(body).into_response(),
                Ok(body) => operator_error(
                    StatusCode::BAD_GATEWAY,
                    format!("UAR /api/models returned HTTP {status}: {body}"),
                ),
                Err(error) => operator_error(
                    StatusCode::BAD_GATEWAY,
                    format!("UAR /api/models returned invalid JSON: {error}"),
                ),
            }
        }
        Err(error) => operator_error(
            StatusCode::BAD_GATEWAY,
            format!("UAR /api/models request failed: {error}"),
        ),
    }
}

fn operator_error(status: StatusCode, error: String) -> Response {
    (
        status,
        Json(serde_json::json!({ "ok": false, "error": error })),
    )
        .into_response()
}

fn publish_driver_endpoint(endpoint: Option<String>) {
    #[cfg(feature = "uar-driver")]
    librefang_llm_drivers::drivers::uar::set_supervised_endpoint(endpoint);

    #[cfg(not(feature = "uar-driver"))]
    let _ = endpoint;
}
