//! Root A2A lookup and cancellation for native and UAR-delegated tasks.

use crate::{
    middleware::{AuthenticatedApiUser, UserRole},
    routes::AppState,
};
use axum::Extension;
use librefang_kernel::a2a::A2aTask;
#[cfg(feature = "uar-driver")]
use librefang_kernel::a2a::A2aTaskStatus;
#[cfg(feature = "uar-driver")]
use librefang_types::uar_run::UarDelegatedRunProjection;

use super::{rpc_error, JsonRpcResponse, TaskRefParams};

pub(super) async fn dispatch_tasks_get(
    state: &AppState,
    api_user: Option<&Extension<AuthenticatedApiUser>>,
    id: Option<serde_json::Value>,
    params: Option<serde_json::Value>,
) -> JsonRpcResponse {
    let params = match parse_task_ref(id.clone(), params) {
        Ok(params) => params,
        Err(response) => return response,
    };

    match refresh_task(state, &params.id, api_user.map(|user| &user.0)).await {
        Ok(Some(task)) => JsonRpcResponse::ok(id, task),
        Ok(None) => JsonRpcResponse::err(id, rpc_error::TASK_NOT_FOUND, "task not found"),
        Err(error) => JsonRpcResponse::err(id, rpc_error::TASK_CONTROL_FAILED, error),
    }
}

pub(super) async fn dispatch_tasks_cancel(
    state: &AppState,
    api_user: Option<&Extension<AuthenticatedApiUser>>,
    id: Option<serde_json::Value>,
    params: Option<serde_json::Value>,
) -> JsonRpcResponse {
    let params = match parse_task_ref(id.clone(), params) {
        Ok(params) => params,
        Err(response) => return response,
    };

    match cancel_task(state, &params.id, api_user.map(|user| &user.0)).await {
        Ok(Some(task)) => JsonRpcResponse::ok(id, task),
        Ok(None) => JsonRpcResponse::err(id, rpc_error::TASK_NOT_FOUND, "task not found"),
        Err(error) => JsonRpcResponse::err(id, rpc_error::TASK_CONTROL_FAILED, error),
    }
}

pub(crate) async fn refresh_task(
    state: &AppState,
    task_id: &str,
    api_user: Option<&AuthenticatedApiUser>,
) -> Result<Option<A2aTask>, String> {
    let store = state.kernel.a2a_tasks();
    let Some(task) = store.get(task_id) else {
        return Ok(None);
    };
    if !can_access(&task, api_user) {
        return Ok(None);
    }
    let Some(projection) = store.get_uar_delegation(task_id) else {
        return Ok(Some(task));
    };
    #[cfg(feature = "uar-driver")]
    {
        if projection.uar_task_id.is_some() {
            let projection = match state.uar_run_control.lookup(&projection).await {
                Ok(projection) => projection,
                Err(error) => {
                    librefang_llm_drivers::drivers::uar_run::UarRunClient::recovery_projection(
                        &projection,
                        &error,
                    )
                    .ok_or_else(|| error.to_string())?
                }
            };
            persist_and_sync(state, projection)?;
        }
        Ok(store.get(task_id))
    }
    #[cfg(not(feature = "uar-driver"))]
    {
        let _ = projection;
        Err("UAR full-run control is unavailable in this build".to_string())
    }
}

pub(crate) async fn cancel_task(
    state: &AppState,
    task_id: &str,
    api_user: Option<&AuthenticatedApiUser>,
) -> Result<Option<A2aTask>, String> {
    let store = state.kernel.a2a_tasks();
    let Some(task) = store.get(task_id) else {
        return Ok(None);
    };
    if !can_access(&task, api_user) {
        return Ok(None);
    }
    let Some(projection) = store.get_uar_delegation(task_id) else {
        return Ok(store.cancel(task_id).then(|| store.get(task_id)).flatten());
    };
    #[cfg(feature = "uar-driver")]
    {
        if projection.uar_task_id.is_none() {
            return Err("delegated task admission is unresolved".to_string());
        }
        let projection = match state.uar_run_control.cancel(&projection).await {
            Ok(projection) => projection,
            Err(error) => {
                librefang_llm_drivers::drivers::uar_run::UarRunClient::recovery_projection(
                    &projection,
                    &error,
                )
                .ok_or_else(|| error.to_string())?
            }
        };
        persist_and_sync(state, projection)?;
        Ok(store.get(task_id))
    }
    #[cfg(not(feature = "uar-driver"))]
    {
        let _ = projection;
        Err("UAR full-run control is unavailable in this build".to_string())
    }
}

fn parse_task_ref(
    id: Option<serde_json::Value>,
    params: Option<serde_json::Value>,
) -> Result<TaskRefParams, JsonRpcResponse> {
    params
        .ok_or_else(|| "params required".to_string())
        .and_then(|value| serde_json::from_value(value).map_err(|error| error.to_string()))
        .map_err(|error| JsonRpcResponse::err(id, rpc_error::INVALID_PARAMS, error))
}

#[cfg(feature = "uar-driver")]
fn persist_and_sync(state: &AppState, projection: UarDelegatedRunProjection) -> Result<(), String> {
    let store = state.kernel.a2a_tasks();
    let task_id = projection.boss_task_id.clone();
    let status = task_status(&projection);
    let retention = store.put_uar_delegation(projection)?;
    let stored = store
        .get_uar_delegation(&task_id)
        .ok_or_else(|| "committed UAR delegation projection could not be read back".to_string())?;
    if stored.boss_projection_retention != retention {
        return Err("committed UAR delegation retention did not match the store".to_string());
    }
    if let Some(mut task) = store.get(&task_id) {
        task.status = status.into();
        store.insert(task);
    }
    Ok(())
}

#[cfg(feature = "uar-driver")]
fn task_status(projection: &UarDelegatedRunProjection) -> A2aTaskStatus {
    match projection.execution_state.as_str() {
        "submitted" => A2aTaskStatus::Submitted,
        "approval_required" | "approval-required" | "input_required" => {
            A2aTaskStatus::InputRequired
        }
        "completed" => A2aTaskStatus::Completed,
        "failed" | "rejected" => A2aTaskStatus::Failed,
        "cancelled" => A2aTaskStatus::Cancelled,
        _ => A2aTaskStatus::Working,
    }
}

pub(crate) fn caller_scope(api_user: Option<&AuthenticatedApiUser>) -> Option<String> {
    api_user.map(|user| format!("user:{}", user.user_id))
}

fn can_access(task: &A2aTask, api_user: Option<&AuthenticatedApiUser>) -> bool {
    let Some(user) = api_user else {
        return task.caller_a2a_agent_id.is_none();
    };
    user.role >= UserRole::Admin
        || task.caller_a2a_agent_id.as_deref() == caller_scope(Some(user)).as_deref()
        || task.caller_a2a_agent_id.as_deref() == Some(&user.user_id.to_string())
}
