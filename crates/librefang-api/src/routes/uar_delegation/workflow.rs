//! Ordinary workflow facade over the same authenticated full-run authority.
use crate::{middleware::AuthenticatedApiUser, routes::AppState};
use axum::{Extension, response::Response};
use librefang_types::uar_run::{UarDelegatedRunProjection, UarRunAdmission, UarWorkflowCorrelation};
use std::sync::Arc;

pub(crate) async fn admit(
    state: Arc<AppState>,
    user: Option<Extension<AuthenticatedApiUser>>,
    admission: UarRunAdmission,
    workflow: UarWorkflowCorrelation,
) -> Result<UarDelegatedRunProjection, String> {
    projection_response(super::enabled::admit_source(state, user, admission, false, Some(workflow)).await).await
}

async fn projection_response(response: Response) -> Result<UarDelegatedRunProjection, String> {
    let status = response.status();
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await.map_err(|error| format!("delegation response body: {error}"))?;
    if !status.is_success() {
        let value: serde_json::Value = serde_json::from_slice(&body).map_err(|error| error.to_string())?;
        let code = value.get("code").or_else(|| value.pointer("/error/code")).or_else(|| value.get("error"))
            .and_then(serde_json::Value::as_str).unwrap_or("delegation_refused");
        return Err(format!("UAR delegation HTTP {status}: {code}"));
    }
    serde_json::from_slice(&body).map_err(|error| format!("delegation projection: {error}"))
}

pub(crate) fn projections(
    state: &Arc<AppState>, run_id: &str, user: Option<&Extension<AuthenticatedApiUser>>,
) -> Vec<UarDelegatedRunProjection> {
    state.kernel.a2a_tasks().list_uar_delegations().into_iter()
        .filter(|projection| projection.workflow.as_ref().is_some_and(|workflow| workflow.workflow_run_id == run_id))
        .filter(|projection| super::enabled::stored_delegation(state, &projection.boss_task_id, user).is_ok())
        .collect()
}

pub(crate) async fn observe(
    state: &Arc<AppState>, projection: &UarDelegatedRunProjection,
) -> Result<UarDelegatedRunProjection, String> {
    let observed = if projection.uar_task_id.is_none() {
        state.uar_run_control.resolve(projection).await
    } else {
        super::observation::observe(state.uar_run_control.as_ref(), projection, projection.cursor)
            .await.map(|(current, _)| current)
    };
    let current = match observed {
        Ok(current) => current,
        Err(error) => match librefang_llm_drivers::drivers::uar_run::UarRunClient::recovery_projection(projection, &error) {
            Some(recovered) => recovered,
            None => return Err(error.to_string()),
        },
    };
    super::storage::persist_and_sync(state, current).map_err(|response| format!("delegation persistence HTTP {}", response.status()))
}

pub(crate) async fn cancel(
    state: &Arc<AppState>, projection: &UarDelegatedRunProjection,
) -> Result<UarDelegatedRunProjection, String> {
    let client = state.uar_run_control.as_ref();
    let current = if projection.uar_task_id.is_none() {
        client.resolve(projection).await
    } else {
        client.lookup(projection).await
    }.map_err(|error| error.to_string())?;
    let current = if current.terminal_at.is_some() || current.cancellation.acknowledged { current } else {
        match client.cancel(&current).await {
            Ok(receipt) => receipt,
            Err(error) if error.outcome_uncertain() => {
                let mut uncertain = current;
                uncertain.cancellation.requested = true;
                uncertain.cancellation.cleanup_uncertain = true;
                uncertain.cancellation_state = "cleanup_unconfirmed".into();
                uncertain.remote_diagnostics.push(serde_json::json!({"code":"operation_outcome_unresolved","operation":"cancel"}));
                uncertain
            }
            Err(error) => return Err(error.to_string()),
        }
    };
    super::storage::persist_and_sync(state, current).map_err(|response| format!("delegation persistence HTTP {}", response.status()))
}
