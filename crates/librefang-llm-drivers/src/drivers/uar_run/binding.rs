use librefang_types::{
    config::{UarEffectiveBinding, UarServiceEndpoints, UarWorkspaceLocality},
    uar_run::{UarDefinitionMode, UarDelegatedRunProjection},
};
use serde_json::Value;

use super::UarRunClientError;

pub(super) fn require_task_id(
    projection: &UarDelegatedRunProjection,
) -> Result<&str, UarRunClientError> {
    projection
        .uar_task_id
        .as_deref()
        .ok_or_else(|| UarRunClientError::InvalidAdmission("UAR task is unresolved".to_string()))
}

pub(super) fn ensure_same_binding(
    projection: &UarDelegatedRunProjection,
    binding: &UarEffectiveBinding,
) -> Result<(), UarRunClientError> {
    let previous = &projection.effective_binding;
    let mismatch = if projection.selected_instance_id != binding.instance_id
        || previous.instance_id != binding.instance_id
    {
        Some("instance identity")
    } else if previous.profile != binding.profile {
        Some("profile")
    } else if previous.workspace_locality != binding.workspace_locality
        || previous.workspace != binding.workspace
    {
        Some("workspace location")
    } else if !same_endpoints(&previous.endpoints, &binding.endpoints) {
        Some("endpoint roles")
    } else if previous.capabilities.len() != binding.capabilities.len()
        || previous
            .capabilities
            .iter()
            .any(|capability| !binding.capabilities.contains(capability))
    {
        Some("capabilities")
    } else if previous.credential_ref != binding.credential_ref {
        Some("credential reference")
    } else if previous.ownership != binding.ownership {
        Some("ownership")
    } else if previous.placement.current_operation != binding.placement.current_operation
        || previous.placement.new_session != binding.placement.new_session
        || previous.placement.native_run_reattachment != binding.placement.native_run_reattachment
        || previous.placement.live_migration != binding.placement.live_migration
    {
        Some("placement support")
    } else {
        None
    };
    if let Some(field) = mismatch {
        Err(UarRunClientError::Binding(format!(
            "delegation's admitted UAR {field} no longer matches the selected binding"
        )))
    } else {
        Ok(())
    }
}

pub(super) fn validate_service_placement(
    body: &Value,
    binding: &UarEffectiveBinding,
    target_binding_id: &str,
    definition_mode: UarDefinitionMode,
) -> Result<(), UarRunClientError> {
    let placement = body
        .get("service_placement")
        .and_then(Value::as_object)
        .ok_or_else(|| {
            UarRunClientError::InvalidAdmission(
                "service_placement is required for a full-run delegation".to_string(),
            )
        })?;
    require_placement(placement, "intent", "new")?;
    require_placement(placement, "expectedInstanceId", &binding.instance_id)?;
    require_placement(placement, "expectedProfile", &binding.profile)?;
    require_placement(
        placement,
        "expectedWorkspaceLocation",
        match binding.workspace_locality {
            UarWorkspaceLocality::Local => "local",
            UarWorkspaceLocality::Remote => "remote",
        },
    )?;
    match definition_mode {
        UarDefinitionMode::Bound => require_placement(placement, "bindingId", target_binding_id)?,
        UarDefinitionMode::InlineDiagnostic if placement.get("bindingId").is_some() => {
            return placement_mismatch("bindingId");
        }
        UarDefinitionMode::InlineDiagnostic => {}
    }
    if placement.get("credentialRef").and_then(Value::as_str) != binding.credential_ref.as_deref() {
        return placement_mismatch("credentialRef");
    }
    let required_capabilities = placement
        .get("requiredCapabilities")
        .and_then(Value::as_array)
        .map(|values| values.iter().filter_map(Value::as_str).collect::<Vec<_>>())
        .unwrap_or_default();
    if !required_capabilities.contains(&"full_harness_delegation_v1") {
        return placement_mismatch("requiredCapabilities");
    }
    let expected_endpoints = placement
        .get("expectedEndpoints")
        .and_then(Value::as_object)
        .ok_or_else(|| placement_error("expectedEndpoints"))?;
    for (role, expected) in [
        ("runtime", binding.endpoints.runtime.as_deref()),
        (
            "administration",
            binding.endpoints.administration.as_deref(),
        ),
        ("models", binding.endpoints.models.as_deref()),
        ("console", binding.endpoints.console.as_deref()),
    ] {
        let observed = expected_endpoints.get(role).and_then(Value::as_str);
        if observed.map(trim_endpoint) != expected.map(trim_endpoint) {
            return placement_mismatch(role);
        }
    }
    Ok(())
}

fn require_placement(
    placement: &serde_json::Map<String, Value>,
    field: &'static str,
    expected: &str,
) -> Result<(), UarRunClientError> {
    if placement.get(field).and_then(Value::as_str) == Some(expected) {
        Ok(())
    } else {
        placement_mismatch(field)
    }
}

fn placement_mismatch<T>(field: &'static str) -> Result<T, UarRunClientError> {
    Err(placement_error(field))
}

fn placement_error(field: &'static str) -> UarRunClientError {
    UarRunClientError::InvalidAdmission(format!(
        "service_placement '{field}' does not match the selected UAR binding"
    ))
}

fn same_endpoints(left: &UarServiceEndpoints, right: &UarServiceEndpoints) -> bool {
    [
        (left.runtime.as_deref(), right.runtime.as_deref()),
        (
            left.administration.as_deref(),
            right.administration.as_deref(),
        ),
        (left.models.as_deref(), right.models.as_deref()),
        (left.console.as_deref(), right.console.as_deref()),
    ]
    .into_iter()
    .all(|(left, right)| left.map(trim_endpoint) == right.map(trim_endpoint))
}

fn trim_endpoint(value: &str) -> &str {
    value.trim_end_matches('/')
}
