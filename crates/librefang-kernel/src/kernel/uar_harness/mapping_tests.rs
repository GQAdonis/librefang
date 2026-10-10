//! Source scenarios, not executed acceptance or substitutes for the real gate.
use super::mapping::*;
use librefang_types::{agent::UserId, config::{UserConfig, UarEffectiveBinding}, uar_run::JobAttemptRef};
use serde_json::json;

fn request() -> JobSelectionRequest {
    serde_json::from_value(json!({
        "authority":"service", "workspaceId":"workspace-1", "bindingId":"bound-agent", "bindingRevision":7,
        "definition":{"id":"remote-definition", "version":"3", "digest":"sha256:requested-pin"},
        "configurationPolicy":"bound_uar_definition", "toolPolicy":"bound_uar_definition",
        "resourcePolicy":"bound_uar_definition", "history":[{"role":"user", "content":"authorized earlier context"}]
    })).unwrap()
}

#[test]
fn required_limits_and_unmapped_authorities_refuse_explicitly() {
    let mut value = request();
    value.required_limits.max_tokens_per_turn = Some(1);
    assert_eq!(validate_requirements(&value).unwrap_err().0, "required_max_tokens_per_turn_unsupported");
    let mut value = request();
    value.authority = ExecutionAuthority::DelegatedUser;
    assert_eq!(validate_requirements(&value).unwrap_err().0, "delegated_user_mapping_unsupported");
    let mut value = request();
    value.paired_host_tool_admission = true;
    assert_eq!(validate_requirements(&value).unwrap_err().0, "paired_host_authority_mapping_unsupported");
    let mut value = request();
    value.configuration_policy = PolicySource::NativeAgent;
    assert_eq!(validate_requirements(&value).unwrap_err().0, "native_configuration_inheritance_unsupported");
}

#[test]
fn stored_job_input_and_explicit_history_reach_canonical_body_and_revision_pin() {
    let config: UserConfig = serde_json::from_value(json!({"name":"service-owner", "role":"owner"})).unwrap();
    let auth = crate::auth::AuthManager::new(&[config]);
    let binding: UarEffectiveBinding = serde_json::from_value(json!({
        "instance_id":"instance-1", "ownership":"external", "endpoints": {"runtime":"https://uar.example", "administration":"https://uar.example", "models":"https://uar.example"},
        "workspace_locality":"remote", "workspace":null, "credential_ref":"service-reference",
        "profile":"uar.service-instance/1", "capabilities":["full_harness_delegation_v1"],
        "placement":{"current_operation":"new_session", "new_session":true, "native_run_reattachment":false, "live_migration":false}
    })).unwrap();
    let task = json!({"id":"00000000-0000-0000-0000-000000000001", "title":"Stored title",
        "description":"Stored description", "status":"pending", "retry_count":999});
    let selected = map_service_job(&auth, UserId::from_name("service-owner"), &task, &binding,
        request(), std::sync::Arc::new(librefang_llm_drivers::drivers::uar_run::UarRunControl::default())).unwrap();
    assert_eq!(selected.job.attempt, 1);
    assert_eq!(selected.admission.run["input"], "Stored title\n\nStored description");
    assert_eq!(selected.admission.run["history"]["messages"][0]["content"], "authorized earlier context");
    assert_eq!(selected.admission.run["service_placement"]["bindingRevision"], 7);
    assert!(selected.admission.run.get("tool_admission").is_none());
    assert!(selected.admission.run.get("max_tokens").is_none());
    let prepared = librefang_llm_drivers::drivers::uar_run::UarRunControl::prepare(&selected.admission).unwrap();
    let mut changed = selected.admission;
    changed.run["history"]["messages"][0]["content"] = json!("changed");
    assert_ne!(prepared.request_digest, librefang_llm_drivers::drivers::uar_run::UarRunControl::prepare(&changed).unwrap().request_digest);
}

#[test]
fn namespace_does_not_follow_retry_count_or_accept_arbitrary_internal_ids() {
    let mut job = JobAttemptRef { job_id:"00000000-0000-0000-0000-000000000001".into(), attempt:1 };
    assert_eq!(job.selected_task_id().as_deref(), Some("uar-job-v1-00000000-0000-0000-0000-000000000001-1"));
    job.attempt = 2;
    assert!(job.selected_task_id().is_none());
    job.attempt = 1;
    job.job_id = "arbitrary-task".into();
    assert!(job.selected_task_id().is_none());
    assert!(service_initiator(&crate::auth::AuthManager::new(&[]), UserId::from_name("root")).is_err());
}
