//! Owner-controlled connections to independently owned UAR instances.

use super::AppState;
use axum::extract::State;
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::Json;
use librefang_channels::uar_sidecar::UarSidecarStatus;
use librefang_types::config::{
    UarCompatibilityDiagnostic, UarEffectiveBinding, UarPlacementSupport, UarServiceCredentialRefs,
    UarServiceEndpoints, UarServiceInstanceConfig, UarServiceOwnership, UarWorkspaceLocality,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
#[cfg(feature = "uar-driver")]
use std::time::Instant;

pub fn router() -> axum::Router<Arc<AppState>> {
    axum::Router::new()
        .route("/uar/status", axum::routing::get(uar_status))
        .route("/uar/connect", axum::routing::post(uar_connect))
        .route("/uar/start", axum::routing::post(uar_start))
        .route("/uar/disconnect", axum::routing::post(uar_disconnect))
        .route("/uar/stop", axum::routing::post(uar_stop))
        .route("/uar/reconnect", axum::routing::post(uar_reconnect))
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
    Json(operator_status(&state).await)
}

#[derive(Debug, Serialize)]
pub(crate) struct UarInstanceView {
    id: String,
    ownership: UarServiceOwnership,
    endpoints: UarServiceEndpoints,
    workspace_locality: UarWorkspaceLocality,
    workspace: Option<std::path::PathBuf>,
    credential_ref: Option<String>,
    credential_refs: UarServiceCredentialRefs,
    profile: String,
    capabilities: Vec<String>,
    required_profile: Option<String>,
    required_capabilities: Vec<String>,
    selected: bool,
}

#[derive(Debug, Serialize)]
pub(crate) struct UarOperatorStatus {
    #[serde(flatten)]
    lifecycle: UarSidecarStatus,
    instances: Vec<UarInstanceView>,
    selected_instance_id: Option<String>,
    effective_binding: Option<UarEffectiveBinding>,
    compatibility: Option<UarCompatibilityDiagnostic>,
    placement: UarPlacementSupport,
    #[serde(rename = "delegatedHostContexts")]
    delegated_host_contexts: Vec<librefang_types::uar_run::UarDelegatedHostContext>,
}

async fn operator_status(state: &AppState) -> UarOperatorStatus {
    let lifecycle = state.uar_supervisor.status().await;
    // `config_ref()` hands back an `arc_swap::Guard`; take an owned snapshot so the borrow outlives this statement and no guard is held across the `.await` below.
    let kernel_config = std::sync::Arc::clone(&state.kernel.config_ref());
    let configured = kernel_config.uar.as_ref();
    let selected_instance = state
        .uar_supervisor
        .selected_instance()
        .await
        .or_else(|| configured.and_then(|config| config.selected_instance().ok()));
    let selected_instance_id = selected_instance
        .as_ref()
        .map(|instance| instance.id.clone());
    let mut inventory = configured
        .map(librefang_types::config::UarConfig::effective_instances)
        .unwrap_or_default();
    if let Some(selected) = &selected_instance {
        if !inventory.iter().any(|item| item.id == selected.id) {
            inventory.push(selected.clone());
        }
    }
    let instances = inventory
        .into_iter()
        .map(|instance| {
            let instance = selected_instance
                .as_ref()
                .filter(|selected| selected.id == instance.id)
                .cloned()
                .unwrap_or(instance);
            UarInstanceView {
                selected: selected_instance_id.as_deref() == Some(instance.id.as_str()),
                id: instance.id,
                ownership: instance.ownership,
                endpoints: instance.endpoints,
                workspace_locality: instance.workspace_locality,
                workspace: instance.workspace,
                credential_ref: instance.credential_ref,
                credential_refs: instance.credential_refs,
                profile: instance.profile,
                capabilities: instance.capabilities,
                required_profile: instance.required_profile,
                required_capabilities: instance.required_capabilities,
            }
        })
        .collect();
    #[cfg(feature = "uar-driver")]
    let (effective_binding, compatibility) = {
        if lifecycle.state == librefang_channels::uar_sidecar::UarSupervisorState::Healthy {
            let _ = librefang_llm_drivers::drivers::uar::admit_supervised_binding().await;
        }
        librefang_llm_drivers::drivers::uar::binding_snapshot()
    };
    #[cfg(not(feature = "uar-driver"))]
    let (effective_binding, compatibility) = (
        None,
        Some(UarCompatibilityDiagnostic {
            code: "uar_driver_disabled".to_string(),
            message: "BossFang was built without the uar-driver feature".to_string(),
            expected: None,
            observed: None,
            missing_capabilities: Vec::new(),
        }),
    );
    UarOperatorStatus {
        lifecycle,
        instances,
        selected_instance_id,
        effective_binding,
        compatibility,
        placement: UarPlacementSupport::default(),
        delegated_host_contexts: {
            #[cfg(feature = "uar-driver")]
            { librefang_llm_drivers::drivers::uar::delegated_host_contexts() }
            #[cfg(not(feature = "uar-driver"))]
            { Vec::new() }
        },
    }
}

#[cfg(feature = "uar-driver")]
async fn admit_binding() -> Result<UarEffectiveBinding, String> {
    librefang_llm_drivers::drivers::uar::admit_supervised_binding()
        .await
        .map_err(|error| error.to_string())
}

/// Optional Owner-only private handoff. Bearer is never persisted or returned.
#[derive(Default, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct ConnectRequest {
    instance: Option<UarServiceInstanceConfig>,
    bearer: Option<String>,
    workspace_id: Option<String>,
    delegated_host_contexts: Option<Vec<librefang_types::uar_run::UarDelegatedHostContext>>,
}

#[utoipa::path(post, path = "/api/uar/connect", tag = "uar", request_body = crate::types::JsonObject,
    responses((status = 200, description = "Selected UAR connected and compatibility admitted; optional body instance uses native snake_case config, bearer is private, workspaceId scopes it"),
    (status = 503, description = "Selected UAR connection or migration failed")))]
pub(crate) async fn uar_connect(
    State(state): State<Arc<AppState>>,
    request: Option<Json<ConnectRequest>>,
) -> Response {
    let _command = state.uar_supervisor.command_guard().await;
    let request = request.map(|Json(body)| body).unwrap_or_default();
    if request.bearer.is_some()
        && request
            .workspace_id
            .as_deref()
            .is_none_or(|id| id.trim().is_empty())
    {
        return operator_error(
            StatusCode::BAD_REQUEST,
            "UAR_WORKSPACE_REQUIRED: scoped bearer requires workspaceId".to_string(),
        );
    }
    if request
        .bearer
        .as_ref()
        .is_some_and(|bearer| bearer.trim().is_empty())
    {
        return operator_error(
            StatusCode::BAD_REQUEST,
            "UAR_CREDENTIAL_REQUIRED: bearer must not be empty".to_string(),
        );
    }
    let replacement = request.instance.is_some() || request.bearer.is_some();
    if replacement {
        let instance = request
            .instance
            .or(state.uar_supervisor.selected_instance().await)
            .or_else(|| {
                state
                    .kernel
                    .config_ref()
                    .uar
                    .as_ref()
                    .and_then(|config| config.selected_instance().ok())
            });
        let Some(instance) = instance else {
            return operator_error(
                StatusCode::BAD_REQUEST,
                "UAR_INSTANCE_REQUIRED: select an existing UAR instance".to_string(),
            );
        };
        let instance = match (librefang_types::config::UarConfig {
            instances: vec![instance],
            ..Default::default()
        })
        .selected_instance()
        {
            Ok(instance) => instance,
            Err(error) => return operator_error(StatusCode::BAD_REQUEST, error),
        };
        for endpoint in [
            &instance.endpoints.runtime,
            &instance.endpoints.administration,
            &instance.endpoints.models,
            &instance.endpoints.console,
            &instance.endpoints.model_provider,
        ]
        .into_iter()
        .flatten()
        {
            if let Err(error) = librefang_channels::uar_sidecar::validate_endpoint(endpoint) {
                return operator_error(StatusCode::BAD_REQUEST, error);
            }
        }
        #[cfg(feature = "uar-driver")]
        let probe_bearer = {
            let credentials = if let Some(bearer) = request.bearer.as_ref() {
                Ok(
                    librefang_llm_drivers::drivers::uar::UarResolvedCredentials::delegated(
                        bearer.clone(),
                    ),
                )
            } else {
                crate::server::resolve_uar_credentials(state.kernel.as_ref(), &instance)
            };
            let probe = credentials
                .as_ref()
                .ok()
                .and_then(|credentials| credentials.runtime.as_ref())
                .map(|bearer| bearer.to_string());
            librefang_llm_drivers::drivers::uar::configure_supervised_instance(
                Ok(instance.clone()),
            );
            librefang_llm_drivers::drivers::uar::configure_supervised_credentials(credentials);
            librefang_llm_drivers::drivers::uar::configure_connection_workspace(
                request.workspace_id.clone(),
            );
            probe
        };
        #[cfg(not(feature = "uar-driver"))]
        let probe_bearer = request.bearer;
        state.uar_supervisor.configure(instance, probe_bearer).await;
    } else if request.workspace_id.is_some() {
        #[cfg(feature = "uar-driver")]
        librefang_llm_drivers::drivers::uar::configure_connection_workspace(request.workspace_id);
    }
    match state.uar_supervisor.connect().await {
        Ok(status) => {
            publish_driver_endpoint(status.endpoint);
            #[cfg(feature = "uar-driver")]
            if let Err(error) = admit_binding().await {
                let _ = state.uar_supervisor.disconnect().await;
                state.uar_supervisor.admission_failed(&error).await;
                return operator_error(StatusCode::BAD_GATEWAY, error);
            }
            if let Some(contexts) = request.delegated_host_contexts {
                #[cfg(feature = "uar-driver")]
                if let Err(error) = librefang_llm_drivers::drivers::uar::configure_delegated_host_contexts(contexts) {
                    return operator_error(StatusCode::BAD_REQUEST, error);
                }
                #[cfg(not(feature = "uar-driver"))]
                let _ = contexts;
            }
            Json(operator_status(&state).await).into_response()
        }
        Err(error) => operator_error(StatusCode::SERVICE_UNAVAILABLE, error),
    }
}

#[utoipa::path(post, path = "/api/uar/disconnect", tag = "uar",
    responses((status = 200, description = "Detached locally; UAR and its tasks are not stopped")))]
pub(crate) async fn uar_disconnect(State(state): State<Arc<AppState>>) -> Response {
    let _command = state.uar_supervisor.command_guard().await;
    match state.uar_supervisor.disconnect().await {
        Ok(_) => {
            publish_driver_endpoint(None);
            Json(operator_status(&state).await).into_response()
        }
        Err(error) => operator_error(StatusCode::INTERNAL_SERVER_ERROR, error),
    }
}
#[utoipa::path(post, path = "/api/uar/reconnect", tag = "uar",
    responses((status = 200, description = "Revalidated selected connection; never restarts UAR")))]
pub(crate) async fn uar_reconnect(state: State<Arc<AppState>>) -> Response {
    uar_connect(state, None).await
}

// Legacy aliases deliberately have only connection effects, never process effects.
#[utoipa::path(post, path = "/api/uar/start", tag = "uar", responses((status = 200, description = "Deprecated connection-only alias for connect")))]
pub(crate) async fn uar_start(state: State<Arc<AppState>>) -> Response {
    uar_connect(state, None).await
}
#[utoipa::path(post, path = "/api/uar/stop", tag = "uar", responses((status = 200, description = "Deprecated connection-only alias for disconnect")))]
pub(crate) async fn uar_stop(state: State<Arc<AppState>>) -> Response {
    uar_disconnect(state).await
}
#[utoipa::path(post, path = "/api/uar/restart", tag = "uar", responses((status = 200, description = "Deprecated connection-only alias for reconnect")))]
pub(crate) async fn uar_restart(state: State<Arc<AppState>>) -> Response {
    uar_reconnect(state).await
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
pub(crate) async fn uar_models(State(_state): State<Arc<AppState>>) -> Response {
    #[cfg(feature = "uar-driver")]
    match librefang_llm_drivers::drivers::uar::selected_model_catalog().await {
        Ok(models) => Json(models).into_response(),
        Err(error) => operator_error(StatusCode::BAD_GATEWAY, error.to_string()),
    }
    #[cfg(not(feature = "uar-driver"))]
    {
        let _ = _state;
        operator_error(
            StatusCode::SERVICE_UNAVAILABLE,
            "BossFang was built without the uar-driver feature".to_string(),
        )
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
