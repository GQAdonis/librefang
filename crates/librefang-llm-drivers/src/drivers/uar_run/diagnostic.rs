//! Explicit, ephemeral no-effect definition for the connection diagnostic.
use super::{canonical::canonical_digest, PreparedAdmission, UarRunClient, UarRunClientError};
use librefang_types::{
    config::{UarEffectiveBinding, UarWorkspaceLocality},
    uar_run::{UarDefinitionIdentity, UarDefinitionMode, UarRunAdmission},
};
use serde_json::{json, Value};

impl UarRunClient {
    /// Author a current UAR domain artifact. Its source digest is not a claim
    /// about UAR's expanded, stamped native snapshot content revision.
    pub fn diagnostic_admission(
        workspace_id: String,
        provider_id: &str,
        model: &str,
        boss_task_id: String,
        binding: &UarEffectiveBinding,
    ) -> Result<UarRunAdmission, UarRunClientError> {
        if workspace_id.trim().is_empty()
            || provider_id.trim().is_empty()
            || model.trim().is_empty()
        {
            return Err(UarRunClientError::InvalidAdmission(
                "workspace, configured provider and provider-local model are required".into(),
            ));
        }
        let artifact = json!({
            "version":"1.0.0", "kind":"agent", "id":"bossfang-connection-diagnostic",
            "metadata":{"title":"BossFang connection diagnostic","description":"Selected UAR native full-run diagnostic"},
            "runtime":{"entry":"default"},
            "policy":{"provider":{"default":{"provider":provider_id,"model":model}},"tools":{},"skills":{}},
            "schemas":{}, "prompt":{"system":"Return exactly BOSSFANG_UAR_RUNTIME_OK. Do not use tools."},
            "memory":{"conversation":{"enabled":false}}, "tools":{}, "ui":{},
            "extensions":{"uar.run_policy":{"version":1,"skills":{"mode":"none"},"tools":{"mode":"none"},"mcp_servers":{"mode":"none"},"knowledge_bases":{"mode":"none"},"presentations":{"mode":"none"},"memory_enabled":false,"tool_approval":"deny"}}
        });
        let definition = UarDefinitionIdentity {
            id: "bossfang-connection-diagnostic".into(),
            version: "1.0.0".into(),
            digest: canonical_digest(&artifact),
        };
        let run = json!({
            "artifact":artifact, "input":"Perform the configured connection diagnostic.", "presentation_mode":"text",
            "service_placement":{
                "intent":"new", "expectedInstanceId":binding.instance_id, "expectedProfile":binding.profile,
                "expectedWorkspaceLocation":match binding.workspace_locality { UarWorkspaceLocality::Local=>"local", UarWorkspaceLocality::Remote=>"remote" },
                "expectedEndpoints":{"runtime":binding.endpoints.runtime,"administration":binding.endpoints.administration,"models":binding.endpoints.models,"console":binding.endpoints.console},
                "credentialRef":binding.credential_ref, "requiredCapabilities":["full_harness_delegation_v1"]
            }
        }).as_object().expect("authored run is an object").clone();
        Ok(UarRunAdmission {
            boss_task_id,
            delegation_id: String::new(),
            admission_key: String::new(),
            target_binding_id: String::new(),
            workspace_id,
            definition,
            definition_diagnostics: Vec::new(),
            run,
        })
    }

    /// Called only for the locally authored diagnostic, never the bound public
    /// admission route. No invented deployment binding is sent to UAR.
    pub fn prepare_diagnostic(
        admission: &UarRunAdmission,
    ) -> Result<PreparedAdmission, UarRunClientError> {
        if admission.admission_key.is_empty()
            || admission.delegation_id.is_empty()
            || admission.workspace_id.is_empty()
            || !admission.target_binding_id.is_empty()
        {
            return Err(UarRunClientError::InvalidAdmission(
                "inline diagnostic identities are invalid".into(),
            ));
        }
        let mut body = admission.run.clone();
        body.insert(
            "admission_id".into(),
            Value::String(admission.admission_key.clone()),
        );
        body.insert(
            "native_task_id".into(),
            Value::String(admission.boss_task_id.clone()),
        );
        Ok(PreparedAdmission {
            request_digest: canonical_digest(&Value::Object(body.clone())),
            definition_mode: UarDefinitionMode::InlineDiagnostic,
            body: Value::Object(body),
        })
    }
}
