//! BossFang correlation and control for UAR-owned complete runs.
use super::AppState;
use std::sync::Arc;
#[cfg(feature = "uar-driver")]
mod errors;
#[cfg(feature = "uar-driver")]
mod storage;
#[cfg(not(feature = "uar-driver"))]
pub fn router() -> axum::Router<Arc<AppState>> {
    axum::Router::new()
}
#[cfg(feature = "uar-driver")]
mod enabled {
    use super::errors::{client_error, delegation_not_found};
    use super::storage::{persist_and_sync, persist_initial, saved_view};
    use super::*;
    use crate::{
        middleware::{AuthenticatedApiUser, UserRole},
        types::api_error,
    };
    use axum::{
        extract::{Path, Query, State},
        http::StatusCode,
        response::{IntoResponse, Response},
        Extension, Json,
    };
    use librefang_kernel::a2a::A2aTask;
    use librefang_llm_drivers::drivers::uar_run::{UarRunClient, UarRunClientError};
    use librefang_types::uar_run::{
        UarDelegatedRunProjection, UarRunAdmission, UarRunEvent, UarSteerOutcome,
    };
    use serde::{Deserialize, Serialize};
    pub fn router() -> axum::Router<Arc<AppState>> {
        axum::Router::new()
            .route("/uar/delegations", axum::routing::post(admit))
            .route("/uar/delegations/{task_id}", axum::routing::get(lookup))
            .route(
                "/uar/delegations/{task_id}/events",
                axum::routing::get(observe),
            )
            .route(
                "/uar/delegations/{task_id}/approve",
                axum::routing::post(approve),
            )
            .route(
                "/uar/delegations/{task_id}/cancel",
                axum::routing::post(cancel),
            )
            .route(
                "/uar/delegations/{task_id}/detach",
                axum::routing::post(detach),
            )
            .route(
                "/uar/delegations/{task_id}/steer",
                axum::routing::post(steer),
            )
    }
    #[derive(Serialize)]
    #[serde(rename_all = "camelCase")]
    struct ObservationView {
        delegation: UarDelegatedRunProjection,
        events: Vec<UarRunEvent>,
    }
    #[derive(Deserialize)]
    struct ObserveQuery {
        #[serde(default)]
        after: u64,
    }
    #[derive(Deserialize)]
    #[serde(rename_all = "camelCase")]
    struct ApprovalRequest {
        approval_id: String,
        approved: bool,
    }
    #[derive(Deserialize)]
    #[serde(rename_all = "camelCase")]
    struct DetachRequest {
        observer_id: String,
    }
    #[derive(Deserialize)]
    struct SteerRequest {
        input: String,
    }
    async fn admit(
        State(state): State<Arc<AppState>>,
        api_user: Option<Extension<AuthenticatedApiUser>>,
        Json(mut admission): Json<UarRunAdmission>,
    ) -> Response {
        let Some(verified_user) = api_user.as_ref() else {
            return api_error(
                StatusCode::UNAUTHORIZED,
                "authenticated_owner_required",
                "Full-run delegation requires an authenticated BossFang user",
            );
        };
        let verified_principal = format!("user:{}", verified_user.0.user_id);
        if admission.boss_task_id.trim().is_empty() {
            admission.boss_task_id = uuid::Uuid::new_v4().to_string();
        }
        let store = state.kernel.a2a_tasks();
        let existing = store.get_uar_delegation(&admission.boss_task_id);
        if let Some(existing) = &existing {
            admission.delegation_id.clone_from(&existing.delegation_id);
            admission.admission_key.clone_from(&existing.admission_key);
        } else {
            admission.delegation_id = uuid::Uuid::new_v4().to_string();
            admission.admission_key = uuid::Uuid::new_v4().to_string();
        }
        let prepared = match UarRunClient::prepare(&admission) {
            Ok(prepared) => prepared,
            Err(error) => return client_error(error),
        };
        if let Some(existing) = existing {
            let Some(task) = store.get(&admission.boss_task_id) else {
                return api_error(
                    StatusCode::CONFLICT,
                    "delegation_projection_incomplete",
                    "The delegation projection exists without its BossFang task record",
                );
            };
            if !can_access(&task, api_user.as_ref()) {
                return delegation_not_found(&admission.boss_task_id);
            }
            if !same_admission(&existing, &admission, &prepared.request_digest) {
                return api_error(
                    StatusCode::CONFLICT,
                    "admission_digest_conflict",
                    "The BossFang task is already bound to different admission inputs",
                );
            }
            return reconcile_existing(&state, existing).await;
        }
        if store.get(&admission.boss_task_id).is_some() {
            return api_error(
                StatusCode::CONFLICT,
                "task_identity_conflict",
                "The BossFang task identity is already used by a native task",
            );
        }
        let client = state.uar_run_control.as_ref();
        let pending = match client
            .prepare_projection(&admission, &prepared, &verified_principal)
            .await
        {
            Ok(projection) => projection,
            Err(error) => return client_error(error),
        };
        let pending = match persist_initial(
            &state,
            A2aTask {
                id: admission.boss_task_id.clone(),
                session_id: None,
                status: librefang_kernel::a2a::A2aTaskStatus::Submitted.into(),
                messages: Vec::new(),
                artifacts: Vec::new(),
                agent_id: Some(admission.definition.id.clone()),
                caller_a2a_agent_id: caller_scope(api_user.as_ref()),
            },
            pending,
        ) {
            Ok(projection) => projection,
            Err(response) => return response,
        };
        match client.admit(&admission, &prepared, &pending).await {
            Ok(projection) => saved_view(&state, projection, StatusCode::CREATED),
            Err(error) if outcome_uncertain(&error) => {
                let mut unresolved = pending;
                unresolved.admission_state = "unresolved".to_string();
                unresolved.effect_state = "effect_unconfirmed".to_string();
                unresolved.remote_diagnostics.push(serde_json::json!({
                    "code": "admission_outcome_unresolved"
                }));
                saved_view(&state, unresolved, StatusCode::ACCEPTED)
            }
            Err(error) => {
                let mut refused = pending;
                refused.admission_state = "refused".to_string();
                refused.execution_state = "failed".to_string();
                if let Err(response) = persist_and_sync(&state, refused) {
                    return response;
                }
                client_error(error)
            }
        }
    }
    async fn reconcile_existing(
        state: &Arc<AppState>,
        projection: UarDelegatedRunProjection,
    ) -> Response {
        if projection.admission_state == "refused" {
            return api_error(
                StatusCode::CONFLICT,
                "admission_refused",
                "The stable admission was previously refused",
            );
        }
        let client = state.uar_run_control.as_ref();
        let refreshed = if projection.uar_task_id.is_some() {
            client.lookup(&projection).await
        } else {
            client.resolve(&projection).await
        };
        match refreshed {
            Ok(projection) => saved_view(state, projection, StatusCode::OK),
            Err(error) if UarRunClient::recovery_projection(&projection, &error).is_some() => {
                saved_view(
                    state,
                    UarRunClient::recovery_projection(&projection, &error)
                        .expect("recovery projection was checked"),
                    StatusCode::GONE,
                )
            }
            Err(error)
                if projection.admission_state == "unresolved" && outcome_uncertain(&error) =>
            {
                (StatusCode::ACCEPTED, Json(projection)).into_response()
            }
            Err(error) => client_error(error),
        }
    }
    async fn lookup(
        State(state): State<Arc<AppState>>,
        api_user: Option<Extension<AuthenticatedApiUser>>,
        Path(task_id): Path<String>,
    ) -> Response {
        let (_, projection) = match stored_delegation(&state, &task_id, api_user.as_ref()) {
            Ok(value) => value,
            Err(response) => return response,
        };
        if projection.uar_task_id.is_none() {
            return (StatusCode::ACCEPTED, Json(projection)).into_response();
        }
        match state.uar_run_control.lookup(&projection).await {
            Ok(projection) => saved_view(&state, projection, StatusCode::OK),
            Err(error) if UarRunClient::recovery_projection(&projection, &error).is_some() => {
                saved_view(
                    &state,
                    UarRunClient::recovery_projection(&projection, &error)
                        .expect("recovery projection was checked"),
                    StatusCode::GONE,
                )
            }
            Err(error) => client_error(error),
        }
    }
    async fn observe(
        State(state): State<Arc<AppState>>,
        api_user: Option<Extension<AuthenticatedApiUser>>,
        Path(task_id): Path<String>,
        Query(query): Query<ObserveQuery>,
    ) -> Response {
        let (_, mut projection) = match stored_delegation(&state, &task_id, api_user.as_ref()) {
            Ok(value) => value,
            Err(response) => return response,
        };
        let events = match state
            .uar_run_control
            .observe(&projection, query.after)
            .await
        {
            Ok(events) => events,
            Err(error) => {
                if let Some(recovered) = UarRunClient::recovery_projection(&projection, &error) {
                    return saved_view(&state, recovered, StatusCode::GONE);
                }
                return client_error(error);
            }
        };
        if let Some(cursor) = events.iter().map(|event| event.cursor).max() {
            projection.cursor = projection.cursor.max(cursor);
        }
        let projection = match persist_and_sync(&state, projection) {
            Ok(projection) => projection,
            Err(response) => return response,
        };
        Json(ObservationView {
            delegation: projection,
            events,
        })
        .into_response()
    }
    async fn approve(
        State(state): State<Arc<AppState>>,
        api_user: Option<Extension<AuthenticatedApiUser>>,
        Path(task_id): Path<String>,
        Json(request): Json<ApprovalRequest>,
    ) -> Response {
        let (_, projection) = match stored_delegation(&state, &task_id, api_user.as_ref()) {
            Ok(value) => value,
            Err(response) => return response,
        };
        let result = state
            .uar_run_control
            .approve(&projection, &request.approval_id, request.approved)
            .await;
        mutation_result(&state, projection, result, "tool_approval")
    }
    async fn cancel(
        State(state): State<Arc<AppState>>,
        api_user: Option<Extension<AuthenticatedApiUser>>,
        Path(task_id): Path<String>,
    ) -> Response {
        let (_, projection) = match stored_delegation(&state, &task_id, api_user.as_ref()) {
            Ok(value) => value,
            Err(response) => return response,
        };
        let result = state.uar_run_control.cancel(&projection).await;
        mutation_result(&state, projection, result, "cancel")
    }
    async fn detach(
        State(state): State<Arc<AppState>>,
        api_user: Option<Extension<AuthenticatedApiUser>>,
        Path(task_id): Path<String>,
        Json(request): Json<DetachRequest>,
    ) -> Response {
        let (_, projection) = match stored_delegation(&state, &task_id, api_user.as_ref()) {
            Ok(value) => value,
            Err(response) => return response,
        };
        let result = state
            .uar_run_control
            .detach(&projection, &request.observer_id)
            .await;
        mutation_result(&state, projection, result, "detach")
    }
    async fn steer(
        State(state): State<Arc<AppState>>,
        api_user: Option<Extension<AuthenticatedApiUser>>,
        Path(task_id): Path<String>,
        Json(request): Json<SteerRequest>,
    ) -> Response {
        let (_, projection) = match stored_delegation(&state, &task_id, api_user.as_ref()) {
            Ok(value) => value,
            Err(response) => return response,
        };
        match state
            .uar_run_control
            .steer(&projection, &request.input)
            .await
        {
            Ok(UarSteerOutcome::Accepted { projection }) => {
                match persist_and_sync(&state, projection) {
                    Ok(projection) => {
                        Json(UarSteerOutcome::Accepted { projection }).into_response()
                    }
                    Err(response) => response,
                }
            }
            Ok(unsupported @ UarSteerOutcome::Unsupported { .. }) => {
                Json(unsupported).into_response()
            }
            Err(error) if outcome_uncertain(&error) => {
                uncertain_mutation(&state, projection, "steer")
            }
            Err(error) => client_error(error),
        }
    }
    fn mutation_result(
        state: &Arc<AppState>,
        projection: UarDelegatedRunProjection,
        result: Result<UarDelegatedRunProjection, UarRunClientError>,
        operation: &'static str,
    ) -> Response {
        match result {
            Ok(projection) => saved_view(state, projection, StatusCode::OK),
            Err(error) if UarRunClient::recovery_projection(&projection, &error).is_some() => {
                saved_view(
                    state,
                    UarRunClient::recovery_projection(&projection, &error)
                        .expect("recovery projection was checked"),
                    StatusCode::GONE,
                )
            }
            Err(error) if outcome_uncertain(&error) => {
                uncertain_mutation(state, projection, operation)
            }
            Err(error) => client_error(error),
        }
    }
    fn uncertain_mutation(
        state: &Arc<AppState>,
        mut projection: UarDelegatedRunProjection,
        operation: &'static str,
    ) -> Response {
        projection.remote_diagnostics.push(serde_json::json!({
            "code": "operation_outcome_unresolved",
            "operation": operation
        }));
        match operation {
            "cancel" => {
                projection.cancellation.requested = true;
                projection.cancellation.cleanup_uncertain = true;
                projection.cancellation_state = "cleanup_unconfirmed".to_string();
            }
            "tool_approval" | "steer" => {
                projection.effect_state = "effect_unconfirmed".to_string();
            }
            _ => {}
        }
        saved_view(state, projection, StatusCode::ACCEPTED)
    }
    fn stored_delegation(
        state: &Arc<AppState>,
        task_id: &str,
        api_user: Option<&Extension<AuthenticatedApiUser>>,
    ) -> Result<(A2aTask, UarDelegatedRunProjection), Response> {
        let store = state.kernel.a2a_tasks();
        let Some(task) = store.get(task_id) else {
            return Err(delegation_not_found(task_id));
        };
        if !can_access(&task, api_user) {
            return Err(delegation_not_found(task_id));
        }
        let Some(projection) = store.get_uar_delegation(task_id) else {
            return Err(delegation_not_found(task_id));
        };
        Ok((task, projection))
    }
    fn same_admission(
        projection: &UarDelegatedRunProjection,
        admission: &UarRunAdmission,
        request_digest: &str,
    ) -> bool {
        projection.admission_key == admission.admission_key
            && projection.delegation_id == admission.delegation_id
            && projection.request_digest == request_digest
            && projection.target_binding_id == admission.target_binding_id
            && projection.workspace_id == admission.workspace_id
            && projection.definition == admission.definition
    }
    fn caller_scope(api_user: Option<&Extension<AuthenticatedApiUser>>) -> Option<String> {
        crate::routes::uar::delegated_tasks::caller_scope(api_user.map(|user| &user.0))
    }
    fn can_access(task: &A2aTask, api_user: Option<&Extension<AuthenticatedApiUser>>) -> bool {
        let Some(user) = api_user else {
            return task.caller_a2a_agent_id.is_none();
        };
        user.0.role >= UserRole::Admin
            || task.caller_a2a_agent_id.as_deref()
                == crate::routes::uar::delegated_tasks::caller_scope(Some(&user.0)).as_deref()
            || task.caller_a2a_agent_id.as_deref() == Some(&user.0.user_id.to_string())
    }
    fn outcome_uncertain(error: &UarRunClientError) -> bool {
        error.outcome_uncertain() || matches!(error, UarRunClientError::InvalidResponse { .. })
    }
}
#[cfg(feature = "uar-driver")]
pub use enabled::router;
