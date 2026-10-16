//! Safe context inventory belongs to the applied connection, never to a host bearer.
use librefang_types::uar_run::UarDelegatedHostContext;

/// Install only public host receipts for the currently applied workspace.
pub fn configure_delegated_host_contexts(
    contexts: Vec<UarDelegatedHostContext>,
) -> Result<(), String> {
    let mut guard = super::binding_cell()
        .write()
        .unwrap_or_else(std::sync::PoisonError::into_inner);
    if contexts.iter().any(|context| {
        guard.workspace_id.as_deref() != Some(context.workspace_id.as_str())
            || [
                &context.context_id,
                &context.runtime_epoch,
                &context.binding.id,
                &context.binding.digest,
                &context.definition.id,
                &context.definition.version,
                &context.definition.digest,
            ]
            .iter()
            .any(|value| value.trim().is_empty())
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
    let guard = super::binding_cell()
        .read()
        .unwrap_or_else(std::sync::PoisonError::into_inner);
    if guard.admitted.is_none() {
        return Vec::new();
    }
    guard.delegated_host_contexts.clone()
}

/// Private host callback. Never serialized into dashboard state or model input.
#[derive(Clone, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct HostContextResolver {
    url: String,
    token: String,
}

pub fn configure_host_context_resolver(
    resolver: Option<HostContextResolver>,
) -> Result<(), String> {
    if let Some(value) = &resolver {
        let url = reqwest::Url::parse(&value.url).map_err(|_| "invalid host context resolver")?;
        if url.scheme() != "http"
            || url.host_str() != Some("127.0.0.1")
            || value.token.is_empty()
            || !url.username().is_empty()
            || url.password().is_some()
        {
            return Err("host context resolver must be an authenticated loopback callback".into());
        }
    }
    super::binding_cell()
        .write()
        .unwrap_or_else(std::sync::PoisonError::into_inner)
        .host_context_resolver = resolver;
    Ok(())
}

pub async fn resolve_chat_host_context(
    request: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let resolver = super::binding_cell()
        .read()
        .unwrap_or_else(std::sync::PoisonError::into_inner)
        .host_context_resolver
        .clone()
        .ok_or("uar_host_context_resolver_unavailable")?;
    let response = reqwest::Client::builder()
        .redirect(reqwest::redirect::Policy::none())
        .build()
        .map_err(|_| "uar_host_context_transport_failed")?
        .post(&resolver.url)
        .bearer_auth(&resolver.token)
        .json(&request)
        .send()
        .await
        .map_err(|_| "uar_host_context_unavailable")?;
    if !response.status().is_success() {
        return Err("uar_host_context_refused".into());
    }
    response
        .json()
        .await
        .map_err(|_| "uar_host_context_invalid".into())
}
