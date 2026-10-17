//! Dashboard chat adapter over the existing full-run control authority.
use crate::{middleware::AuthenticatedApiUser, routes::AppState, types::api_error};
use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::{IntoResponse, Response},
    Extension, Json,
};
use librefang_types::{
    agent::{AgentId, SessionId},
    uar_run::{UarChatCorrelation, UarDelegatedRunProjection, UarRunAdmission},
};
use serde_json::{json, Value};
use std::sync::Arc;
pub mod config;
mod history;
pub(crate) mod transport;
pub(crate) mod turns;
pub use transport::{http, stream};
pub use turns::{list, start, stop};
pub fn configured(state: &Arc<AppState>, id: AgentId) -> bool {
    state
        .kernel
        .agent_registry()
        .get(id)
        .is_some_and(|entry| entry.manifest.metadata.contains_key(config::TARGET_KEY))
}
fn failure(code: &str) -> Response {
    api_error(StatusCode::UNPROCESSABLE_ENTITY, code, code)
}
fn authorized(
    state: &Arc<AppState>,
    id: &str,
    user: Option<&Extension<AuthenticatedApiUser>>,
) -> Result<AgentId, Box<Response>> {
    let id = id
        .parse::<AgentId>()
        .map_err(|_| Box::new(failure("invalid_agent_id")))?;
    if user.is_none() || !crate::routes::can_access_agent(state, id, user) {
        return Err(Box::new(failure("agent_not_found")));
    }
    Ok(id)
}
