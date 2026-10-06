use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
};
use librefang_llm_drivers::drivers::uar_run::UarRunClientError;

use crate::types::{api_error, ApiErrorResponse};

pub(super) fn client_error(error: UarRunClientError) -> Response {
    match error {
        UarRunClientError::InvalidAdmission(message) => {
            api_error(StatusCode::BAD_REQUEST, "invalid_admission", message)
        }
        UarRunClientError::Remote {
            status,
            message,
            refusal,
            ..
        } => {
            let status = StatusCode::from_u16(status.as_u16()).unwrap_or(StatusCode::BAD_GATEWAY);
            let code = refusal
                .as_ref()
                .map_or("uar_remote_refusal", |item| item.code.as_str());
            api_error(status, code, message)
        }
        UarRunClientError::ConnectionReattachmentRequired => api_error(StatusCode::SERVICE_UNAVAILABLE,"uar_connection_reattachment_required","Renew the original admitted instance and workspace credential; this run cannot move or replay"),
        UarRunClientError::Binding(error) => {
            tracing::warn!(error = %error, "UAR delegation binding unavailable");
            api_error(
                StatusCode::SERVICE_UNAVAILABLE,
                "uar_binding_unavailable",
                "No compatible UAR runtime binding is available",
            )
        }
        UarRunClientError::Transport { .. } => api_error(
            StatusCode::BAD_GATEWAY,
            "uar_transport_failed",
            "The UAR runtime could not be reached",
        ),
        UarRunClientError::InvalidResponse { .. } => api_error(
            StatusCode::BAD_GATEWAY,
            "uar_invalid_response",
            "The UAR runtime returned an invalid response",
        ),
        UarRunClientError::RecoveryUnsupported { .. } => api_error(
            StatusCode::GONE,
            "recovery_unsupported",
            "The process-ephemeral UAR runtime restarted and cannot recover this task",
        ),
    }
}

pub(super) fn delegation_not_found(task_id: &str) -> Response {
    ApiErrorResponse::not_found(format!("UAR delegation '{task_id}' not found"))
        .with_code("delegation_not_found")
        .into_response()
}
