//! Host-scoped shared memory, separate from the daemon's private key/value store.
use super::{enforce_memory_acl, require_kernel_typed, MemoryAclOp, ToolError};
use crate::kernel_handle::prelude::*;
use librefang_types::tool::ToolDefinition;
use serde_json::{json, Value};
use std::sync::Arc;

pub(super) fn definitions() -> Vec<ToolDefinition> {
    [
        ("remember", "content", "Store a fact in The Boss shared memory for the configured workspace, or privately for this agent. This is separate from BossFang memory_store. The host supplies identity and workspace; never include credentials."),
        ("retrieve", "id", "Retrieve a shared memory by its returned ID from the configured workspace or this agent's private shared-memory scope. The host enforces scope."),
        ("search", "query", "Search The Boss shared memory in the configured workspace or this agent's private shared-memory scope. This is separate from BossFang memory_recall."),
    ].into_iter().map(|(operation, field, description)| {
        let mut properties = json!({
            "scope": { "type": "string", "enum": ["workspace", "private"], "default": "workspace" }
        });
        properties[field] = json!({ "type": "string", "minLength": 1 });
        if operation == "search" {
            properties["limit"] = json!({ "type": "integer", "minimum": 1, "maximum": 100, "default": 10 });
        }
        ToolDefinition {
            name: format!("shared_memory_{operation}"), description: description.into(),
            input_schema: json!({ "type": "object", "properties": properties,
                "required": [field], "additionalProperties": false }),
        }
    }).collect()
}

pub(super) async fn execute(
    operation: &str,
    input: &Value,
    kernel: Option<&Arc<dyn KernelHandle>>,
    caller_agent_id: Option<&str>,
    sender_id: Option<&str>,
    channel: Option<&str>,
) -> Result<String, ToolError> {
    let kernel_handle = require_kernel_typed(kernel)?;
    let agent_id = caller_agent_id.ok_or_else(|| {
        ToolError::PermissionDenied(
            "Shared memory requires an authenticated registered agent context".into(),
        )
    })?;
    if !kernel_handle
        .list_agents()
        .iter()
        .any(|agent| agent.id == agent_id)
    {
        return Err(ToolError::PermissionDenied(
            "Shared memory agent is no longer registered".into(),
        ));
    }
    let field = match operation {
        "remember" => "content",
        "retrieve" => "id",
        "search" => "query",
        _ => {
            return Err(ToolError::InvalidParameter {
                name: "operation",
                reason: "Unsupported shared memory operation".into(),
            })
        }
    };
    let object = input
        .as_object()
        .ok_or(ToolError::MissingParameter(field))?;
    if object
        .keys()
        .any(|key| key != field && key != "scope" && !(operation == "search" && key == "limit"))
    {
        return Err(ToolError::PermissionDenied(
            "Shared memory arguments cannot override host identity or workspace".into(),
        ));
    }
    let value = input[field]
        .as_str()
        .filter(|value| !value.trim().is_empty())
        .ok_or(ToolError::MissingParameter(field))?;
    let scope = match input.get("scope") {
        None => "workspace",
        Some(Value::String(value)) if value == "workspace" || value == "private" => value,
        _ => {
            return Err(ToolError::InvalidParameter {
                name: "scope",
                reason: "Choose workspace or private".into(),
            })
        }
    };
    enforce_memory_acl(
        kernel,
        sender_id,
        channel,
        if operation == "remember" {
            MemoryAclOp::Write
        } else {
            MemoryAclOp::Read
        },
        &format!("boss_shared.{scope}"),
    )
    .map_err(ToolError::PermissionDenied)?;
    let mut arguments = json!({ "scope": scope });
    arguments[field] = json!(value);
    if operation == "search" {
        let limit = match input.get("limit") {
            None => 10,
            Some(value) => value
                .as_u64()
                .filter(|limit| (1..=100).contains(limit))
                .ok_or(ToolError::InvalidParameter {
                    name: "limit",
                    reason: "Choose an integer from 1 to 100".into(),
                })?,
        };
        arguments["limit"] = json!(limit);
    }
    let url = std::env::var("BOSS_SHARED_MEMORY_URL")
        .ok()
        .filter(|value| !value.is_empty());
    let token = std::env::var("BOSS_SHARED_MEMORY_TOKEN")
        .ok()
        .filter(|value| !value.is_empty());
    let (Some(url), Some(token)) = (url, token) else {
        return Err(ToolError::Unavailable("The Boss shared-memory connection; choose a workspace in Settings → BossFang and restart BossFang"));
    };
    // Host-owned callback credentials must never follow a redirect to another service.
    let client = crate::http_client::direct_client_builder()
        .redirect(reqwest::redirect::Policy::none())
        .build()
        .map_err(|_| {
            ToolError::upstream_msg("Cannot initialize the shared-memory host connection")
        })?;
    let response = client.post(url).bearer_auth(token)
        .json(&json!({ "version": 1, "agentId": agent_id, "operation": operation, "arguments": arguments }))
        .send().await.map_err(|_| ToolError::upstream_msg("Shared-memory host is unavailable; check The Boss memory connection settings. A write outcome may be unknown; do not automatically repeat it."))?;
    if !response.status().is_success() {
        return Err(ToolError::upstream_msg(format!("Shared-memory host returned HTTP {}; check The Boss memory connection and selected workspace", response.status().as_u16())));
    }
    let result: Value = response
        .json()
        .await
        .map_err(|_| ToolError::upstream_msg("Shared-memory host returned an invalid response"))?;
    let text = result
        .get("content")
        .and_then(Value::as_array)
        .map(|blocks| {
            blocks
                .iter()
                .filter_map(|block| block.get("text").and_then(Value::as_str))
                .collect::<Vec<_>>()
                .join("\n")
        })
        .ok_or_else(|| ToolError::upstream_msg("Shared-memory host response has no content"))?;
    if result.get("isError").and_then(Value::as_bool) == Some(true) {
        return Err(ToolError::upstream_msg(text));
    }
    Ok(text)
}
