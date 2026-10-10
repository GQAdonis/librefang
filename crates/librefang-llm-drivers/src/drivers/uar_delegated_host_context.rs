//! Safe context inventory belongs to the applied connection, never to a host bearer.
use librefang_types::uar_run::UarDelegatedHostContext;

/// Install only public host receipts for the currently applied workspace.
pub fn configure_delegated_host_contexts(contexts: Vec<UarDelegatedHostContext>) -> Result<(), String> {
    let mut guard = super::binding_cell().write().unwrap_or_else(std::sync::PoisonError::into_inner);
    if contexts.iter().any(|context| {
        guard.workspace_id.as_deref() != Some(context.workspace_id.as_str())
            || [&context.context_id, &context.runtime_epoch, &context.binding.id, &context.binding.digest,
                &context.definition.id, &context.definition.version, &context.definition.digest]
                .iter().any(|value| value.trim().is_empty())
            || chrono::DateTime::parse_from_rfc3339(&context.expires_at).is_err()
    }) {
        return Err("delegated host context receipt does not match the applied workspace or public identity".into());
    }
    guard.delegated_host_contexts = contexts;
    Ok(())
}

/// Public metadata for future authoring; lease/effect authority remains in UAR.
#[must_use]
pub fn delegated_host_contexts() -> Vec<UarDelegatedHostContext> {
    let guard = super::binding_cell().read().unwrap_or_else(std::sync::PoisonError::into_inner);
    if guard.admitted.is_none() { return Vec::new(); }
    guard.delegated_host_contexts.clone()
}
