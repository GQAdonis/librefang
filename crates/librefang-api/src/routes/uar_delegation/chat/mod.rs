//! Dashboard chat adapter over the existing full-run control authority.
use std::sync::Arc;
use axum::{Extension, Json, extract::{State, Path, Query}, http::StatusCode, response::{IntoResponse, Response}};
use serde_json::{json, Value};
use librefang_types::{agent::{AgentId, SessionId}, uar_run::{UarRunAdmission, UarChatCorrelation, UarDelegatedRunProjection}};
use crate::{routes::AppState, middleware::AuthenticatedApiUser, types::api_error};
pub mod config;
pub(crate) mod turns;
mod history;
pub(crate) mod transport;
pub use turns::{start, list, stop};
pub use transport::{http, stream};
pub fn configured(state: &Arc<AppState>, id: AgentId) -> bool {
    state.kernel.agent_registry().get(id).is_some_and(|entry| entry.manifest.metadata.contains_key(config::TARGET_KEY))
}
fn failure(code: &str) -> Response { api_error(StatusCode::UNPROCESSABLE_ENTITY, code, code) }
fn authorized(state: &Arc<AppState>, id: &str, user: Option<&Extension<AuthenticatedApiUser>>) -> Result<AgentId, Response> {
    let id = id.parse::<AgentId>().map_err(|_| failure("invalid_agent_id"))?;
    if user.is_none() || !crate::routes::can_access_agent(state, id, user) { return Err(failure("agent_not_found")); }
    Ok(id)
}
