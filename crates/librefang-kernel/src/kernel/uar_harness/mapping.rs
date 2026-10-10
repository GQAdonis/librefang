//! Supported opt-in service-job mapping. UAR's selected bound definition owns
//! model/tool/resource policy. A native assigned agent is a local access target,
//! not an assertion that its configuration is equivalent to that definition.
use std::{collections::HashSet, sync::Arc};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use librefang_types::{agent::UserId, config::{UarEffectiveBinding, UarWorkspaceLocality}, uar_run::*};
use librefang_llm_drivers::drivers::uar_run::UarRunControl;
use super::SelectedUarJob;

#[derive(Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ExecutionAuthority { Service, DelegatedUser }
#[derive(Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum PolicySource { BoundUarDefinition, NativeAgent }

/// Unknown fields fail extraction; there is deliberately no arbitrary run map,
/// actor/tenant header, raw token, runtime budget override or tool grant object.
#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct JobSelectionRequest {
    pub authority: ExecutionAuthority,
    pub workspace_id: String,
    pub binding_id: String,
    pub binding_revision: u64,
    /// Requested operator pin, not evidence of a receiver-verified digest.
    pub definition: UarDefinitionIdentity,
    pub configuration_policy: PolicySource,
    pub tool_policy: PolicySource,
    pub resource_policy: PolicySource,
    #[serde(default)]
    pub history: Vec<JobHistoryMessage>,
    #[serde(default)]
    pub required_limits: RequiredLimits,
    #[serde(default)]
    pub additional_grants: Vec<String>,
    #[serde(default)]
    pub paired_host_tool_admission: bool,
    #[serde(default)]
    pub required_capabilities: Vec<String>,
    #[serde(default)]
    pub requires_durable_restart_recovery: bool,
    #[serde(default)]
    pub requires_steer: bool,
    pub reasoning_effort: Option<ReasoningEffort>,
    /// Select the normal streaming hook; the admission response remains a
    /// receipt. Task5 attaches UAR observation rather than a fake native stream.
    #[serde(default)]
    pub streaming: bool,
}

#[derive(Default, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct RequiredLimits {
    pub max_tokens_per_turn: Option<u64>,
    pub max_tokens_per_session: Option<u64>,
    pub max_tool_calls_per_turn: Option<u64>,
    pub max_cost_per_session_usd: Option<f64>,
    pub timeout_seconds: Option<u64>,
    pub requests_per_minute: Option<u64>,
    pub tokens_per_minute: Option<u64>,
}
#[derive(Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ReasoningEffort { None, Low, Medium, High, Max }

#[derive(Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct JobHistoryMessage {
    pub role: String,
    pub content: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tool_call_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tool_calls: Option<Vec<HistoryToolCall>>,
}
#[derive(Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct HistoryToolCall {
    pub id: String,
    #[serde(rename = "type")]
    pub kind: String,
    pub function: HistoryToolFunction,
}
#[derive(Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct HistoryToolFunction { pub name: String, pub arguments: String }

#[derive(Debug, thiserror::Error)]
#[error("{0}")]
pub struct MappingError(pub &'static str);

pub fn service_initiator(
    auth: &crate::auth::AuthManager, user_id: UserId,
) -> Result<String, MappingError> {
    // No synthetic root/default_owner fallback: a real registered Owner must
    // hold the policy-changing permission in the application's live registry.
    auth.authorize(user_id, &crate::auth::Action::ModifyConfig)
        .map_err(|_| MappingError("registered_service_owner_required"))?;
    Ok(format!("user:{user_id}"))
}

pub fn validate_requirements(request: &JobSelectionRequest) -> Result<(), MappingError> {
    if matches!(request.authority, ExecutionAuthority::DelegatedUser) {
        return Err(MappingError("delegated_user_mapping_unsupported"));
    }
    for (policy, code) in [
        (&request.configuration_policy, "native_configuration_inheritance_unsupported"),
        (&request.tool_policy, "native_tool_policy_inheritance_unsupported"),
        (&request.resource_policy, "native_resource_policy_inheritance_unsupported"),
    ] {
        if !matches!(policy, PolicySource::BoundUarDefinition) { return Err(MappingError(code)); }
    }
    if !request.additional_grants.is_empty() { return Err(MappingError("additional_resource_grants_unsupported")); }
    if request.paired_host_tool_admission { return Err(MappingError("paired_host_authority_mapping_unsupported")); }
    let limits = &request.required_limits;
    for (present, code) in [
        (limits.max_tokens_per_turn.is_some(), "required_max_tokens_per_turn_unsupported"),
        (limits.max_tokens_per_session.is_some(), "required_max_tokens_per_session_unsupported"),
        (limits.max_tool_calls_per_turn.is_some(), "required_max_tool_calls_per_turn_unsupported"),
        (limits.max_cost_per_session_usd.is_some(), "required_max_cost_per_session_usd_unsupported"),
        (limits.timeout_seconds.is_some(), "required_timeout_seconds_unsupported"),
        (limits.requests_per_minute.is_some(), "required_requests_per_minute_unsupported"),
        (limits.tokens_per_minute.is_some(), "required_tokens_per_minute_unsupported"),
    ] {
        if present { return Err(MappingError(code)); }
    }
    if request.requires_durable_restart_recovery { return Err(MappingError("required_restart_recovery_unsupported")); }
    if request.requires_steer { return Err(MappingError("required_steer_unsupported")); }
    validate_history(&request.history)
}

/// Mirrors the accepted provider HostHistoryInput limits/identity rules.
/// Caller-owned history is an explicit export by the registered service Owner;
/// this does not read another user's session or treat tool history as commands.
fn validate_history(history: &[JobHistoryMessage]) -> Result<(), MappingError> {
    if history.len() > 1000 { return Err(MappingError("history_too_large")); }
    let mut bytes = 0usize;
    let mut calls = HashSet::new();
    let mut results = HashSet::new();
    for message in history {
        bytes = bytes.saturating_add(message.content.len());
        if !matches!(message.role.as_str(), "user" | "assistant" | "tool")
            || (message.content.is_empty() && message.tool_calls.as_ref().is_none_or(Vec::is_empty))
        { return Err(MappingError("history_invalid")); }
        if message.role == "assistant" {
            for call in message.tool_calls.as_deref().unwrap_or_default() {
                if call.id.is_empty() || call.function.name.is_empty() || call.kind != "function"
                    || serde_json::from_str::<Value>(&call.function.arguments).is_err()
                    || !calls.insert(call.id.as_str())
                { return Err(MappingError("history_invalid")); }
                bytes = bytes.saturating_add(call.id.len()).saturating_add(call.function.name.len())
                    .saturating_add(call.function.arguments.len());
            }
        } else if message.tool_calls.is_some() { return Err(MappingError("history_invalid")); }
        if message.role == "tool" {
            let id = message.tool_call_id.as_deref().ok_or(MappingError("history_invalid"))?;
            if !calls.contains(id) || !results.insert(id) { return Err(MappingError("history_invalid")); }
            bytes = bytes.saturating_add(id.len());
        } else if message.tool_call_id.is_some() { return Err(MappingError("history_invalid")); }
        if bytes > 4 * 1024 * 1024 { return Err(MappingError("history_too_large")); }
    }
    Ok(())
}

/// Build only the supported service body. The actual stored task, not a
/// request-supplied replacement input/creator/attempt counter, supplies input.
pub fn map_service_job(
    auth: &crate::auth::AuthManager,
    user_id: UserId,
    task: &Value,
    binding: &UarEffectiveBinding,
    request: JobSelectionRequest,
    control: Arc<UarRunControl>,
) -> Result<SelectedUarJob, MappingError> {
    let principal = service_initiator(auth, user_id)?;
    validate_requirements(&request)?;
    let job = JobAttemptRef {
        job_id: task["id"].as_str().ok_or(MappingError("stored_job_identity_invalid"))?.to_string(),
        attempt: 1,
    };
    let boss_task_id = job.selected_task_id().ok_or(MappingError("stored_job_identity_invalid"))?;
    if task["status"].as_str() != Some("pending") { return Err(MappingError("selected_job_not_pending")); }
    let title = task["title"].as_str().ok_or(MappingError("stored_job_input_invalid"))?;
    let description = task["description"].as_str().ok_or(MappingError("stored_job_input_invalid"))?;
    if request.workspace_id.trim().is_empty() || request.binding_id.trim().is_empty()
        || request.binding_revision == 0 || request.definition.id.trim().is_empty()
        || request.definition.version.trim().is_empty() || request.definition.digest.trim().is_empty()
    { return Err(MappingError("bound_definition_pin_required")); }
    let mut capabilities = request.required_capabilities;
    if !capabilities.iter().any(|v| v == "full_harness_delegation_v1") {
        capabilities.push("full_harness_delegation_v1".into());
    }
    let session_id = format!("{boss_task_id}-session");
    let mut run = serde_json::Map::new();
    run.insert("input".into(), json!(format!("{title}\n\n{description}")));
    run.insert("session_id".into(), json!(session_id));
    run.insert("history".into(), json!({"session_id": session_id, "messages": request.history}));
    run.insert("service_placement".into(), json!({
        "intent": "new", "expectedInstanceId": binding.instance_id,
        "expectedProfile": binding.profile,
        "expectedWorkspaceLocation": match binding.workspace_locality { UarWorkspaceLocality::Local => "local", UarWorkspaceLocality::Remote => "remote" },
        "expectedEndpoints": {"runtime": binding.endpoints.runtime, "administration": binding.endpoints.administration,
            "models": binding.endpoints.models, "console": binding.endpoints.console},
        "bindingId": request.binding_id, "bindingRevision": request.binding_revision,
        "credentialRef": binding.credential_ref, "requiredCapabilities": capabilities,
    }));
    if let Some(reasoning) = request.reasoning_effort { run.insert("reasoning_effort".into(), json!(reasoning)); }
    // Working directory/tool catalog/model/budget/resources are deliberately the
    // bound definition's policy, not native manifest fields silently copied or
    // dropped. No paired-host proof is fabricated from an ordinary service key.
    Ok(SelectedUarJob {
        job, verified_subject: principal, verified_tenant: None,
        admission: UarRunAdmission {
            delegation_id: format!("{boss_task_id}-delegation"), admission_key: format!("{boss_task_id}-admission"),
            boss_task_id, target_binding_id: request.binding_id, workspace_id: request.workspace_id,
            definition: request.definition, definition_diagnostics: vec![], run,
        },
        credential_revision: None, required_capabilities: capabilities,
        requires_durable_restart_recovery: false, requires_steer: false, control,
    })
}

/// Recreate only an observation context from durable original metadata. No
/// newly supplied policy/body/credentials can become a replacement execution.
pub fn existing_service_job(
    principal: &str, original: UarReservedJobAttempt, control: Arc<UarRunControl>,
) -> Result<SelectedUarJob, MappingError> {
    let saved = original.projection;
    let reservation = original.reservation;
    if reservation.verified_subject != principal || saved.verified_principal != principal
        || reservation.verified_tenant.is_some()
        || reservation.job.selected_task_id().as_deref() != Some(saved.boss_task_id.as_str())
    { return Err(MappingError("selected_owner_or_identity_mismatch")); }
    Ok(SelectedUarJob {
        job: reservation.job, verified_subject: reservation.verified_subject, verified_tenant: None,
        admission: UarRunAdmission {
            boss_task_id: saved.boss_task_id, delegation_id: saved.delegation_id,
            admission_key: saved.admission_key, target_binding_id: saved.target_binding_id,
            workspace_id: saved.workspace_id, definition: saved.definition,
            definition_diagnostics: vec![], run: Default::default(),
        },
        credential_revision: reservation.credential_revision,
        required_capabilities: reservation.required_capabilities,
        requires_durable_restart_recovery: false, requires_steer: false, control,
    })
}
