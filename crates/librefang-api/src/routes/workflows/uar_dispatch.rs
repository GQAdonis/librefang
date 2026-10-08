//! Workflow sender wiring; UAR retains the complete delegated execution loop.
use super::*;
use crate::middleware::AuthenticatedApiUser;
use axum::Extension;
use librefang_types::{agent::SessionMode, uar_run::UarWorkflowStepTarget};

#[derive(Clone)]
pub(super) struct Dispatch {
    state: Arc<AppState>,
    user: Option<Extension<AuthenticatedApiUser>>,
    run_id: WorkflowRunId,
    workflow_id: WorkflowId,
    targets: HashMap<AgentId, (String, UarWorkflowStepTarget)>,
}

impl Dispatch {
    pub(super) async fn new(
        state: Arc<AppState>, run_id: WorkflowRunId,
        user: Option<Extension<AuthenticatedApiUser>>,
    ) -> Result<Self, String> {
        let run = state.kernel.workflow_engine().get_run(run_id).await.ok_or("workflow run not found")?;
        let workflow = state.kernel.workflow_engine().get_workflow(run.workflow_id).await.ok_or("workflow not found")?;
        let targets: HashMap<AgentId, (String, UarWorkflowStepTarget)> = workflow.steps.iter().filter_map(|step| match &step.agent {
            StepAgent::UarBound { uar_bound, step_key } => Some((
                step_handle(step_key), (step.name.clone(), uar_bound.clone()),
            )),
            _ => None,
        }).collect();
        if !targets.is_empty() && user.is_none() {
            return Err("authenticated_owner_required: UAR workflow execution requires an authenticated user".into());
        }
        Ok(Self { state, user, run_id, workflow_id: run.workflow_id, targets })
    }

    pub(super) fn resolve(&self, agent: &StepAgent) -> Option<(AgentId, String, bool)> {
        match agent {
            StepAgent::UarBound { uar_bound, step_key } => Some((step_handle(step_key), uar_bound.definition.id.clone(), false)),
            _ => self.state.kernel.resolve_step_agent(agent),
        }
    }

    pub(super) async fn send(&self, agent_id: AgentId, input: String, session: Option<SessionMode>) -> Result<(String, u64, u64), String> {
        if let Some((step_name, target)) = self.targets.get(&agent_id) {
            return self.delegate(step_name, target, input).await;
        }
        self.state.kernel.send_message_with_session_mode(agent_id, &input, session).await
            .map(|result| (result.response, result.total_usage.input_tokens, result.total_usage.output_tokens))
            .map_err(|error| error.to_string())
    }

    #[cfg(feature = "uar-driver")]
    async fn delegate(&self, step_name: &str, target: &UarWorkflowStepTarget, input: String) -> Result<(String, u64, u64), String> {
        use crate::routes::uar_delegation::workflow;
        use librefang_types::uar_run::{UarRunAdmission, UarWorkflowCorrelation};
        target.validate()?;
        let mut run = target.run.clone();
        if let Some(context_id) = &target.delegated_host_context_id {
            run.insert("delegated_host_context_id".into(), serde_json::Value::String(context_id.clone()));
        }
        run.insert("input".into(), serde_json::Value::String(input));
        let task_id = format!("workflow:{}:{}", self.run_id, step_name);
        let binding = match self.state.kernel.a2a_tasks().get_uar_delegation(&task_id) {
            Some(existing) => existing.effective_binding,
            None => librefang_llm_drivers::drivers::uar::admit_supervised_binding().await.map_err(|error| error.to_string())?,
        };
        run.insert("service_placement".into(), serde_json::json!({
            "intent":"new", "bindingId":target.target_binding_id,
            "expectedInstanceId":binding.instance_id, "expectedProfile":binding.profile,
            "expectedWorkspaceLocation":match binding.workspace_locality {
                librefang_types::config::UarWorkspaceLocality::Local => "local",
                librefang_types::config::UarWorkspaceLocality::Remote => "remote",
            },
            "expectedEndpoints":binding.endpoints, "credentialRef":binding.credential_ref,
            "requiredCapabilities":["full_harness_delegation_v1"]
        }));
        let correlation = UarWorkflowCorrelation {
            workflow_id: self.workflow_id.to_string(), workflow_run_id: self.run_id.to_string(), step_name: step_name.into(),
        };
        let projection = workflow::admit(self.state.clone(), self.user.clone(), UarRunAdmission {
            boss_task_id: task_id.clone(), delegation_id: String::new(), admission_key: String::new(),
            target_binding_id: target.target_binding_id.clone(), workspace_id: target.workspace_id.clone(),
            definition: target.definition.clone(), definition_diagnostics: Vec::new(), run,
        }, correlation).await?;
        let projection = workflow::consume(&self.state, &projection).await?;
        if projection.recovery_state != "available" {
            return Err(workflow::failure_reason(&projection, &format!("UAR delegation {}", projection.recovery_state)));
        }
        if projection.terminal_at.is_none() {
            return Err(workflow::failure_reason(&projection, "UAR task stream closed without an authoritative terminal receipt"));
        }
        if projection.execution_state == "cancelled" {
            if let Some(run) = self.state.kernel.workflow_engine().get_run(self.run_id).await {
                if matches!(run.state, WorkflowRunState::Pending | WorkflowRunState::Running | WorkflowRunState::Paused { .. }) {
                    self.state.kernel.workflow_engine().cancel_run(self.run_id).await.map_err(|error| error.to_string())?;
                }
            }
        }
        match projection.execution_state.as_str() {
            // The engine's numeric token fields are local-driver usage.
            // UAR owns its budget; zero here never settles remote spend.
            "completed" => Ok((projection.output.unwrap_or_default(), 0, 0)),
            state => Err(workflow::failure_reason(&projection, &format!("UAR delegated step is {state}"))),
        }
    }

    #[cfg(not(feature = "uar-driver"))]
    async fn delegate(&self, _step_name: &str, _target: &UarWorkflowStepTarget, _input: String) -> Result<(String, u64, u64), String> {
        let _ = self.workflow_id;
        Err("uar_driver_disabled: BossFang was built without full-run delegation".into())
    }

    pub(super) async fn finish(&self, result: Result<String, String>) -> Result<String, String> {
        if let Err(failure) = &result {
            let cleanup = cancel(&self.state, self.run_id, self.user.as_ref()).await
                .map_err(|error| format!("{failure}; UAR cancellation cleanup failed: {error}"))?;
            if cleanup.iter().any(|value| value["cancellation"]["cleanupUncertain"] == true) {
                return Err(format!("{failure}; UAR cancellation cleanup remains unconfirmed"));
            }
        }
        result
    }
}

fn step_handle(step_key: &str) -> AgentId { AgentId::from_name(&format!("uar-workflow-step:{step_key}")) }

pub(super) async fn has_targets(state: &Arc<AppState>, workflow_id: WorkflowId) -> bool {
    state.kernel.workflow_engine().get_workflow(workflow_id).await
        .is_some_and(|workflow| workflow.steps.iter().any(|step| matches!(step.agent, StepAgent::UarBound { .. })))
}

pub(super) fn projections(state: &Arc<AppState>, run_id: WorkflowRunId, user: Option<&Extension<AuthenticatedApiUser>>) -> Vec<serde_json::Value> {
    #[cfg(feature = "uar-driver")]
    {
        crate::routes::uar_delegation::workflow::projections(state, &run_id.to_string(), user).into_iter()
            .map(|delegation| serde_json::json!({"step_name":delegation.workflow.as_ref().map(|workflow| &workflow.step_name),"delegation":delegation})).collect()
    }
    #[cfg(not(feature = "uar-driver"))]
    { let _ = (state, run_id, user); Vec::new() }
}

pub(super) async fn cancel(state: &Arc<AppState>, run_id: WorkflowRunId, user: Option<&Extension<AuthenticatedApiUser>>) -> Result<Vec<serde_json::Value>, String> {
    #[cfg(feature = "uar-driver")]
    {
        let store = state.kernel.a2a_tasks();
        let mut outcomes = Vec::new();
        for projection in store.list_uar_delegations().into_iter().filter(|projection|
            projection.workflow.as_ref().is_some_and(|workflow| workflow.workflow_run_id == run_id.to_string())) {
            // Reject control of a known workflow task if its original owner differs.
            super::super::uar_delegation::enabled::stored_delegation(state, &projection.boss_task_id, user)
                .map_err(|response| format!("UAR workflow ownership HTTP {}", response.status()))?;
            let receipt = crate::routes::uar_delegation::workflow::cancel(state, &projection).await?;
            outcomes.push(serde_json::json!({"bossTaskId":receipt.boss_task_id,"executionState":receipt.execution_state,"cancellationState":receipt.cancellation_state,"cancellation":receipt.cancellation}));
        }
        Ok(outcomes)
    }
    #[cfg(not(feature = "uar-driver"))]
    { let _ = (state, run_id, user); Ok(Vec::new()) }
}
