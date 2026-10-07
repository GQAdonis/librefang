//! Correlation and control types for a complete run delegated to UAR.
//!
//! These types describe BossFang's durable projection. They are deliberately
//! separate from the UAR HTTP wire structs so a provider protocol revision is
//! isolated in `librefang-llm-drivers::drivers::uar_run`.

use crate::config::UarEffectiveBinding;
use serde::{Deserialize, Serialize};

/// Exact immutable identity of the definition selected for one delegation.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UarDefinitionIdentity {
    pub id: String,
    pub version: String,
    pub digest: String,
}

/// Public authored target for one ordinary workflow step. Private runtime
/// credentials and host grants are attached by their existing trusted owner.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct UarWorkflowStepTarget {
    pub target_binding_id: String,
    pub workspace_id: String,
    pub definition: UarDefinitionIdentity,
    #[serde(default)]
    pub run: serde_json::Map<String, serde_json::Value>,
}

impl UarWorkflowStepTarget {
    /// Check the authored workflow persistence boundary, not UAR execution policy.
    pub fn validate(&self) -> Result<(), String> {
        if [&self.target_binding_id, &self.workspace_id, &self.definition.id,
            &self.definition.version, &self.definition.digest]
            .iter().any(|value| value.trim().is_empty())
        {
            return Err("UAR target requires binding, workspace and exact definition identity".into());
        }
        for (key, value) in &self.run {
            let valid = match key.as_str() {
                "working_directory" | "reasoning_effort" => value.as_str().is_some(),
                "skill_attachments" => value.as_array().is_some_and(|values| values.iter().all(serde_json::Value::is_string)),
                _ => return Err(format!("UAR workflow run field '{key}' is not public authored configuration")),
            };
            if !valid { return Err(format!("UAR workflow run field '{key}' has an invalid public value type")); }
        }
        Ok(())
    }
}

/// Correlation only: the workflow engine and UAR keep their original authorities.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UarWorkflowCorrelation {
    pub workflow_id: String,
    pub workflow_run_id: String,
    pub step_name: String,
}

/// One non-secret compiler or activation diagnostic retained with a definition.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UarDefinitionDiagnostic {
    pub code: String,
    pub message: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub path: Option<String>,
}

/// UAR's declared retention limits for the native task record.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UarRunRetention {
    pub mode: String,
    pub terminal_ttl_seconds: u64,
    pub terminal_record_cap: u64,
}

/// Cancellation settlement is distinct from execution terminal state.
#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UarRunCancellation {
    pub requested: bool,
    pub acknowledged: bool,
    pub terminal: bool,
    pub cleanup_uncertain: bool,
}

/// Truthful retention of the BossFang-side correlation projection.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum UarProjectionRetention {
    Durable,
    ProcessEphemeral,
}

/// Definition source, persisted independently of the provider wire selector.
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum UarDefinitionMode {
    #[default]
    Bound,
    InlineDiagnostic,
}

/// BossFang's correlation-only projection of one UAR-owned execution.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UarDelegatedRunProjection {
    pub boss_task_id: String,
    /// Original authenticated BossFang user owning this local projection.
    pub verified_principal: String,
    pub delegation_id: String,
    pub admission_key: String,
    pub request_digest: String,
    /// Empty only for the explicitly authored inline diagnostic.
    pub target_binding_id: String,
    #[serde(default)]
    pub definition_mode: UarDefinitionMode,
    pub workspace_id: String,
    pub selected_instance_id: String,
    pub effective_binding: UarEffectiveBinding,
    pub definition: UarDefinitionIdentity,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub definition_diagnostics: Vec<UarDefinitionDiagnostic>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub remote_diagnostics: Vec<serde_json::Value>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub uar_task_id: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub uar_thread_id: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub uar_root_run_id: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub uar_run_id: Option<String>,
    pub admission_state: String,
    pub execution_state: String,
    pub cancellation_state: String,
    pub effect_state: String,
    pub recovery_state: String,
    pub boss_projection_retention: UarProjectionRetention,
    pub revision: u64,
    pub cursor: u64,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub runtime_epoch: Option<String>,
    pub retention: UarRunRetention,
    pub cancellation: UarRunCancellation,
    pub detached: bool,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub unsupported_semantics: Vec<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub expires_at: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub created_at: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub terminal_at: Option<String>,
    #[serde(default, skip_serializing_if = "serde_json::Map::is_empty")]
    pub links: serde_json::Map<String, serde_json::Value>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub workflow: Option<UarWorkflowCorrelation>,
    /// Actual UAR message deltas, retained for the owning ordinary workflow.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub output: Option<String>,
    /// Existing host-issued event, never a locally generated approval request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub pending_approval: Option<UarRunEvent>,
}

/// Admission input accepted by BossFang's control seam.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UarRunAdmission {
    pub boss_task_id: String,
    pub delegation_id: String,
    pub admission_key: String,
    pub target_binding_id: String,
    pub workspace_id: String,
    pub definition: UarDefinitionIdentity,
    #[serde(default)]
    pub definition_diagnostics: Vec<UarDefinitionDiagnostic>,
    /// Existing UAR CreateRun fields. The client flattens this object into the
    /// versioned admission body instead of inventing aliases for those fields.
    pub run: serde_json::Map<String, serde_json::Value>,
}

/// One redacted event observed after a monotonic cursor.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UarRunEvent {
    pub task_id: String,
    pub cursor: u64,
    pub revision: u64,
    #[serde(rename = "type")]
    pub event_type: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub occurred_at: Option<String>,
    pub data: serde_json::Value,
}

/// Typed outcome for a steering request.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "outcome", rename_all = "snake_case")]
pub enum UarSteerOutcome {
    Accepted {
        projection: UarDelegatedRunProjection,
    },
    Unsupported {
        code: String,
        message: String,
    },
}

/// Stable remote refusal returned by the UAR full-harness API.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UarRunRefusal {
    pub code: String,
    pub message: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub task_id: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub admission_id: Option<String>,
}
