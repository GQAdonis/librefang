use librefang_llm_drivers::drivers::uar_run::{UarRunClient, UarRunClientError};
use librefang_types::uar_run::{UarDelegatedRunProjection, UarRunEvent};

pub(super) async fn observe(
    client: &UarRunClient,
    projection: &UarDelegatedRunProjection,
    after: u64,
) -> Result<(UarDelegatedRunProjection, Vec<UarRunEvent>), UarRunClientError> {
    let mut current = client.lookup(projection).await?;
    // Lookup establishes terminal authority before observation. A terminal
    // observer drains its single replay response, without reconnecting per page.
    let events = client.observe(&current, after).await?;
    for event in &events {
        if event.cursor <= projection.cursor {
            continue;
        }
        if current.workflow.is_some() && event.data.get("code").and_then(serde_json::Value::as_str) == Some("STREAM_GAP") {
            current.recovery_state = "recovery_unsupported".into();
            current.remote_diagnostics.push(serde_json::json!({"code":"STREAM_GAP"}));
        }
        match event.event_type.as_str() {
            "agui.message.delta" if current.workflow.is_some() => {
                if let Some(text) = event.data.pointer("/delta/text").and_then(serde_json::Value::as_str) {
                    current.output.get_or_insert_with(String::new).push_str(text);
                }
            }
            "agui.tool_call.approval_required" => current.pending_approval = Some(event.clone()),
            "agui.done" | "agui.cancelled" | "agui.error" => current.pending_approval = None,
            _ => {}
        }
    }
    // The observation cursor acknowledges returned events, not merely events
    // advertised by the lookup receipt while execution is still active.
    current.cursor = projection.cursor;
    if let Some(cursor) = events.iter().map(|event| event.cursor).max() {
        current.cursor = current.cursor.max(cursor);
    }
    Ok((current, events))
}

use std::sync::Arc;
use axum::{Extension, Json, http::StatusCode, response::{IntoResponse, Response}};
use crate::{routes::AppState, middleware::{AuthenticatedApiUser, UserRole}, types::api_error};
use librefang_kernel::kernel::uar_harness::{mapping, observation as selected};
pub(super) use selected::is_selected;

pub(super) fn owns_selected(
    state: &Arc<AppState>, projection: &UarDelegatedRunProjection,
    api_user: Option<&Extension<AuthenticatedApiUser>>,
) -> bool {
    api_user.is_some_and(|user| user.0.role == UserRole::Owner && user.0.owner_principal().is_some()
        && mapping::service_initiator(state.kernel.auth_manager(), user.0.user_id)
            .is_ok_and(|principal| principal == projection.verified_principal))
}

pub(super) async fn response(
    state: &Arc<AppState>, projection: &UarDelegatedRunProjection, after: u64,
) -> Response {
    if is_selected(projection) {
        return match selected::observe(state.kernel.a2a_tasks(), state.uar_run_control.as_ref(), projection, after).await {
            Ok(view) => Json(view).into_response(),
            Err(code) => api_error(StatusCode::SERVICE_UNAVAILABLE, code, code),
        };
    }
    match observe(state.uar_run_control.as_ref(), projection, after).await {
        Ok((current, events)) => match super::storage::persist_and_sync(state, current) {
            Ok(delegation) => Json(serde_json::json!({"delegation":delegation,"events":events})).into_response(),
            Err(response) => response,
        },
        Err(error) => {
            if let Some(recovered) = UarRunClient::recovery_projection(projection, &error) {
                return super::storage::saved_view(state, recovered, StatusCode::GONE);
            }
            super::errors::client_error(error)
        }
    }
}

pub(super) async fn lookup_response(state: &Arc<AppState>, projection: UarDelegatedRunProjection) -> Response {
    let result = if projection.uar_task_id.is_some() {
        state.uar_run_control.lookup(&projection).await
    } else { state.uar_run_control.resolve(&projection).await };
    control_result(state, projection, result, "lookup")
}

pub(super) fn control_result(
    state: &Arc<AppState>, projection: UarDelegatedRunProjection,
    result: Result<UarDelegatedRunProjection, UarRunClientError>, operation: &'static str,
) -> Response {
    match result {
        Ok(current) => super::storage::saved_view(state, selected::receipt(current), StatusCode::OK),
        // Exact approval/revision conflicts are definitive refusals: no new
        // approval was resolved. Preserve the original durable outcome.
        Err(UarRunClientError::Remote { operation: "tool approval", status, refusal: Some(ref refusal), .. })
            if operation == "tool_approval" && status == StatusCode::CONFLICT
                && matches!(refusal.code.as_str(), "revision_conflict" | "approval_unresolved")
                && refusal.task_id == projection.uar_task_id
                && refusal.admission_id.as_deref() == Some(projection.admission_key.as_str()) =>
        {
            api_error(StatusCode::CONFLICT, "selected_approval_conflict", "selected_approval_conflict")
        }
        Err(error) => {
            // Raw remote refusal/error bodies never become selected HTTP or
            // durable diagnostics. IDs/revisions are not rewritten or retried.
            let status = match &error {
                UarRunClientError::Remote { status, .. } if status.is_client_error() => *status,
                UarRunClientError::InvalidAdmission(_) => StatusCode::BAD_REQUEST,
                _ => StatusCode::ACCEPTED,
            };
            let mut unknown = selected::unknown(&projection);
            if operation == "cancel" {
                unknown.cancellation.requested = true;
                unknown.cancellation.cleanup_uncertain = true;
                unknown.cancellation_state = "cleanup_unconfirmed".into();
            }
            match super::storage::persist_and_sync(state, unknown) {
                Ok(delegation) => (status, Json(serde_json::json!({
                    "code":"selected_control_refused_or_unknown", "delegation":delegation
                }))).into_response(),
                Err(response) => response,
            }
        }
    }
}

/// Merge a delivered workflow frame without claiming terminal receipt authority.
pub(super) fn apply_workflow_event(
    current: &mut UarDelegatedRunProjection,
    event: &UarRunEvent,
) -> Result<(), UarRunClientError> {
    if current.uar_task_id.as_deref() != Some(event.task_id.as_str()) {
        return Err(UarRunClientError::InvalidResponse {
            operation: "event observation",
            message: "event original task identity changed".into(),
        });
    }
    if let Some(root) = event.data.get("root_run_id").and_then(serde_json::Value::as_str) {
        if current.uar_root_run_id.as_deref().is_some_and(|known| known != root) {
            return Err(UarRunClientError::InvalidResponse {
                operation: "event observation",
                message: "event original root_run_id identity changed".into(),
            });
        }
        current.uar_root_run_id = Some(root.to_owned());
    }
    if event.cursor <= current.cursor { return Ok(()); }
    if event.data.get("code").and_then(serde_json::Value::as_str) == Some("STREAM_GAP") {
        current.recovery_state = "recovery_unsupported".into();
        current.remote_diagnostics.push(serde_json::json!({"code":"STREAM_GAP"}));
    }
    match event.event_type.as_str() {
        "agui.message.delta" => {
            if let Some(text) = event.data.pointer("/delta/text").and_then(serde_json::Value::as_str) {
                current.output.get_or_insert_with(String::new).push_str(text);
            }
        }
        // The workflow consumer refreshes receipt authority once for this
        // challenge; replay after a decision cannot reopen a resolved approval.
        "agui.tool_call.approval_required" if current.execution_state == "input_required" => {
            current.pending_approval = Some(event.clone());
        }
        "agui.error" => {
            current.pending_approval = None;
            // The remote event is a disclosure boundary: retain its bounded
            // machine code, never the message or arbitrary payload fields.
            if let Some(code) = event.data.get("code").and_then(serde_json::Value::as_str)
                .filter(|code| !code.is_empty() && code.len() <= 128
                    && code.bytes().all(|byte| byte.is_ascii_lowercase() || byte.is_ascii_digit() || byte == b'_'))
            {
                let diagnostic = serde_json::json!({"code":code,"eventType":"agui.error"});
                if !current.remote_diagnostics.contains(&diagnostic) {
                    current.remote_diagnostics.push(diagnostic);
                }
            }
        }
        "agui.done" | "agui.cancelled" => current.pending_approval = None,
        _ => {}
    }
    current.cursor = event.cursor;
    Ok(())
}
