//! Explicit target configuration. Catalog metadata is resolved under the
//! selected connection's authenticated workspace, never supplied as authority.
use super::*;
use serde::{Deserialize, Serialize};
use librefang_types::uar_run::UarDefinitionIdentity;

pub const TARGET_KEY: &str = "bossfang_uar_chat_target_v1";
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ChatTarget {
    pub target_id: String,
    pub instance_id: String,
    pub workspace_id: String,
    pub binding_id: String,
    pub binding_revision: u64,
    pub definition: UarDefinitionIdentity,
    // Metadata is persisted in agent.toml, which cannot represent JSON null.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub model_override: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub effective_model: Option<String>,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct SaveTarget { target_id: String, model_override: Option<String> }

pub fn target(state: &Arc<AppState>, id: AgentId) -> Result<Option<ChatTarget>, String> {
    let entry = state.kernel.agent_registry().get(id).ok_or("agent_not_found")?;
    entry.manifest.metadata.get(TARGET_KEY).cloned()
        .map(serde_json::from_value).transpose().map_err(|_| "uar_target_configuration_invalid".into())
}

pub async fn catalog() -> Result<Value, String> {
    let binding = librefang_llm_drivers::drivers::uar::admit_supervised_binding().await
        .map_err(|_| "uar_connection_unavailable")?;
    if !binding.capabilities.iter().any(|cap| cap == "uar_target_catalog_v1") {
        return Err("uar_target_catalog_upgrade_required".into());
    }
    librefang_llm_drivers::drivers::uar::selected_model_catalog().await
        .map_err(|_| "uar_target_catalog_unavailable".into())
}

pub async fn resolve(target_id: &str, model_override: Option<&str>) -> Result<ChatTarget, String> {
    let catalog = catalog().await?;
    let rows = catalog["data"].as_array().ok_or("uar_target_catalog_invalid")?;
    let row = rows.iter().find(|row| row["id"].as_str() == Some(target_id))
        .ok_or("uar_target_no_longer_installed")?;
    let meta = &row["uar"];
    if meta["available"].as_bool() != Some(true) {
        return Err(meta["reason"].as_str().unwrap_or("uar_target_unavailable").to_owned());
    }
    if meta["delegation_available"].as_bool() == Some(false) { return Err("default_agent_not_installed".into()); }
    let binding = librefang_llm_drivers::drivers::uar::admit_supervised_binding().await
        .map_err(|_| "uar_connection_unavailable")?;
    let workspace_id = librefang_llm_drivers::drivers::uar::selected_workspace_id()
        .ok_or("uar_workspace_not_configured")?;
    let effective_override = if meta["kind"].as_str() == Some("model") {
        if model_override.is_some_and(|value| value != target_id) {
            return Err("uar_model_target_override_conflict".into());
        }
        Some(target_id.to_owned())
    } else {
        model_override.filter(|value| !value.is_empty()).map(str::to_owned)
    };
    if let Some(model) = &effective_override {
        if meta["kind"].as_str() == Some("agent") && !meta["allowed_model_overrides"].as_array().is_some_and(|ids| ids.iter().any(|id| id.as_str()==Some(model.as_str()))) {return Err("uar_model_override_not_admitted_by_binding".into());}
        if !binding.capabilities.iter().any(|cap| cap == "uar_target_model_override_v1") {
            return Err("uar_model_override_upgrade_required".into());
        }
        if !rows.iter().any(|row| row["id"].as_str() == Some(model)
            && row["uar"]["kind"].as_str() == Some("model")
            && row["uar"]["available"].as_bool() == Some(true)) {
            return Err("uar_model_override_unavailable".into());
        }
    }
    Ok(ChatTarget {
        target_id: target_id.into(), instance_id: binding.instance_id, workspace_id,
        binding_id: meta["deployment_binding_id"].as_str().filter(|id| !id.is_empty())
            .ok_or("uar_target_binding_missing")?.into(),
        binding_revision: meta["binding"]["revision"].as_u64().filter(|value| *value > 0)
            .ok_or("uar_target_binding_missing")?,
        definition: serde_json::from_value(meta["definition"].clone()).map_err(|_| "uar_target_definition_missing")?,
        effective_model: effective_override.clone().or_else(||Some(format!("{}/{}",meta["provider_id"].as_str()?,meta["model_id"].as_str()?))),
        model_override: effective_override,
    })
}

pub async fn get(
    State(state): State<Arc<AppState>>, Path(id): Path<String>,
    user: Option<Extension<AuthenticatedApiUser>>,
) -> Response {
    let id = match authorized(&state, &id, user.as_ref()) { Ok(id) => id, Err(response) => return response };
    match target(&state, id) {
        Ok(target) => {
            let (catalog, error) = match catalog().await { Ok(value) => (Some(value), None), Err(error) => (None, Some(error)) };
            Json(json!({"target":target,"catalog":catalog,"error":error})).into_response()
        }
        Err(error) => failure(&error),
    }
}

pub async fn save(
    State(state): State<Arc<AppState>>, Path(id): Path<String>,
    user: Option<Extension<AuthenticatedApiUser>>, Json(request): Json<SaveTarget>,
) -> Response {
    let id = match authorized(&state, &id, user.as_ref()) { Ok(id) => id, Err(response) => return response };
    if user.as_ref().is_none_or(|user| user.0.role < crate::middleware::UserRole::Admin) {
        return failure("uar_target_admin_required");
    }
    if let Some(refusal) = crate::routes::agents::guard_provisioned_agent(&state, id) { return refusal.into_response(); }
    let target = match resolve(&request.target_id, request.model_override.as_deref()).await {
        Ok(target) => target, Err(error) => return failure(&error),
    };
    let Some(entry) = state.kernel.agent_registry().get(id) else { return failure("agent_not_found") };
    let mut manifest = entry.manifest.clone();
    manifest.metadata.insert(TARGET_KEY.into(), json!(target));
    // Explicit save changes executor semantics. Existing agents remain native
    // until this metadata exists; provider names alone never imply delegation.
    manifest.model.provider = "uar".into();
    manifest.model.model = target.target_id.clone();
    // Reject non-persistable target metadata before the kernel changes its live
    // copy: restart reconciles from TOML, not the in-memory registry.
    if toml::to_string_pretty(&manifest).is_err() {
        return failure("uar_target_save_failed");
    }
    match state.kernel.update_manifest(id, manifest) {
        Ok(()) => Json(json!({"target":target})).into_response(),
        Err(_) => failure("uar_target_save_failed"),
    }
}
