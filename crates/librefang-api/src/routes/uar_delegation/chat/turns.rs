use super::*;
use serde::Deserialize;

#[derive(Deserialize)]
#[serde(rename_all="camelCase", deny_unknown_fields)]
pub struct TurnRequest { pub message: String, pub session_id: Option<String>, pub turn_id: String }
#[derive(Default, Deserialize)]
#[serde(rename_all="camelCase")]
pub struct ConversationQuery { pub session_id: Option<String> }

pub fn projections(state: &Arc<AppState>, id: AgentId, session: &str, user: Option<&Extension<AuthenticatedApiUser>>) -> Vec<UarDelegatedRunProjection> {
    let mut rows: Vec<_> = state.kernel.a2a_tasks().list_uar_delegations().into_iter()
        .filter(|row| row.chat.as_ref().is_some_and(|chat| chat.agent_id == id.to_string() && chat.session_id == session))
        .filter(|row| super::super::enabled::stored_delegation(state, &row.boss_task_id, user).is_ok()).collect();
    rows.sort_by(|a,b| a.created_at.cmp(&b.created_at).then(a.boss_task_id.cmp(&b.boss_task_id)));
    rows
}
fn session(state: &Arc<AppState>, id: AgentId, selected: Option<&str>) -> Result<String,String> {
    let entry=state.kernel.agent_registry().get(id).ok_or("agent_not_found")?;
    let sid=selected.map(str::to_owned).unwrap_or_else(|| entry.session_id.to_string());
    sid.parse::<SessionId>().map_err(|_| "invalid_session_id")?;
    if sid != entry.session_id.to_string() && !state.kernel.list_agent_sessions(id).map_err(|_| "session_unavailable")?
        .iter().any(|row| row["session_id"].as_str().or_else(||row["id"].as_str()) == Some(sid.as_str())) { return Err("session_not_found".into()); }
    Ok(sid)
}
pub fn complete(row: &UarDelegatedRunProjection) -> bool {
    row.terminal_at.is_some() || matches!(row.execution_state.as_str(),"completed"|"failed"|"cancelled"|"canceled"|"rejected") || row.admission_state == "refused"
}
pub async fn begin(state: Arc<AppState>, id: AgentId, user: Option<Extension<AuthenticatedApiUser>>, request: TurnRequest) -> Result<UarDelegatedRunProjection,String> {
    if request.message.trim().is_empty() {return Err("message_required".into());}
    let sid=session(&state,id,request.session_id.as_deref())?;
    let turn=request.turn_id.parse::<uuid::Uuid>().map_err(|_| "invalid_turn_id")?.to_string();
    let task_id=format!("uar-chat-v1-{id}-{sid}-{turn}");
    let _admission=state.uar_supervisor.command_guard().await;
    if let Some(existing)=state.kernel.a2a_tasks().get_uar_delegation(&task_id) {
        if super::super::enabled::stored_delegation(&state,&task_id,user.as_ref()).is_err()
            || existing.chat.as_ref().is_none_or(|chat|chat.input != request.message) {return Err("chat_turn_identity_conflict".into());}
        return Ok(existing);
    }
    let previous=projections(&state,id,&sid,user.as_ref());
    if previous.iter().any(|row|!complete(row)) {return Err("uar_chat_turn_active_or_unresolved".into());}
    let target=config::target(&state,id)?.ok_or("uar_target_not_selected")?;
    if previous.iter().any(|row|row.target_binding_id != target.binding_id || row.definition != target.definition
        || row.selected_instance_id != target.instance_id || row.workspace_id != target.workspace_id) {return Err("uar_chat_target_changed_new_conversation_required".into());}
    let live=config::resolve(&target.target_id,target.model_override.as_deref()).await?;
    if target.instance_id != live.instance_id || target.workspace_id != live.workspace_id || target.binding_id != live.binding_id
        || target.binding_revision != live.binding_revision || target.definition != live.definition {return Err("uar_target_changed_review_and_save".into());}
    if previous.iter().any(|row| {
        let changed_request=row.chat.as_ref().is_some_and(|chat|chat.model_override != target.model_override);
        let admitted=row.effective_target.as_ref().and_then(|receipt|Some(format!("{}/{}",receipt["provider_id"].as_str()?,receipt["model_id"].as_str()?)));
        changed_request || admitted.is_some_and(|model|Some(model)!=live.effective_model)
    }) {return Err("uar_chat_model_changed_new_conversation_required".into());}
    let native_history=super::history::seed(&state,id,&sid,&previous)?;
    let context=librefang_llm_drivers::drivers::uar::resolve_chat_host_context(json!({"version":1,"agentId":id.to_string(),
        "deploymentBindingId":target.binding_id,"bindingRevision":target.binding_revision,"definition":target.definition,
        "model":target.model_override,"workspaceId":target.workspace_id})).await?;
    if context["workspaceId"].as_str()!=Some(target.workspace_id.as_str()) || context["binding"]["id"].as_str()!=Some(target.binding_id.as_str())
        || context["binding"]["revision"].as_u64()!=Some(target.binding_revision) || context["definition"]!=json!(target.definition)
        || context["model"].as_str()!=target.model_override.as_deref() {return Err("uar_host_context_identity_mismatch".into());}
    let context_id=context["contextId"].as_str().filter(|s|!s.is_empty()).ok_or("uar_host_context_missing")?;
    let binding=librefang_llm_drivers::drivers::uar::admit_supervised_binding().await.map_err(|_|"uar_connection_unavailable")?;
    let mut history=native_history.clone();
    for row in &previous {if let Some(chat)=&row.chat { history.push(json!({"role":"user","content":chat.input}));
        if let Some(output)=row.output.as_ref().filter(|s|!s.is_empty()) {history.push(json!({"role":"assistant","content":output}));}}}
    let mut run=json!({"input":request.message,"session_id":sid,"history":{"session_id":sid,"messages":history},"delegated_host_context_id":context_id,
        "service_placement":{"intent":"new","expectedInstanceId":binding.instance_id,"expectedProfile":binding.profile,
        "expectedWorkspaceLocation":match binding.workspace_locality {librefang_types::config::UarWorkspaceLocality::Local=>"local",librefang_types::config::UarWorkspaceLocality::Remote=>"remote"},
        "expectedEndpoints":{"runtime":binding.endpoints.runtime,"administration":binding.endpoints.administration,"models":binding.endpoints.models,"console":binding.endpoints.console},
        "bindingId":target.binding_id,"bindingRevision":target.binding_revision,"credentialRef":binding.credential_ref,
        "requiredCapabilities":["full_harness_delegation_v1","uar_target_catalog_v1"]}}).as_object().cloned().ok_or("uar_chat_request_invalid")?;
    if let Some(model)=&target.model_override {run.insert("model".into(),json!(model));}
    let admission=UarRunAdmission {boss_task_id:task_id,delegation_id:String::new(),admission_key:String::new(),target_binding_id:target.binding_id,
        workspace_id:target.workspace_id,definition:target.definition,definition_diagnostics:vec![],run};
    let chat=UarChatCorrelation {agent_id:id.to_string(),session_id:sid,turn_id:turn,input:request.message,target_id:target.target_id,model_override:target.model_override,native_history:previous.is_empty().then_some(native_history)};
    let response=super::super::enabled::admit_source(Arc::clone(&state),user,admission,false,None,Some(chat)).await;
    let row=super::super::workflow::projection_response(response).await?;
    let watching=row.clone(); let state=Arc::clone(&state);
    tokio::spawn(async move { if let Err(error)=super::super::workflow::consume(&state,&watching).await {
        let _ = error;
        if let Some(mut saved)=state.kernel.a2a_tasks().get_uar_delegation(&watching.boss_task_id) {
            saved.remote_diagnostics.push(json!({"code":"uar_chat_observation_interrupted"}));
            let _=super::super::storage::persist_and_sync(&state,saved);
        }
    }});
    Ok(row)
}

pub async fn start(State(state):State<Arc<AppState>>,Path(id):Path<String>,user:Option<Extension<AuthenticatedApiUser>>,Json(request):Json<TurnRequest>)->Response {
    let id=match authorized(&state,&id,user.as_ref()){Ok(id)=>id,Err(response)=>return response};
    match begin(state,id,user,request).await {Ok(row)=>Json(row).into_response(),Err(error)=>failure(&error)}
}
pub async fn list(State(state):State<Arc<AppState>>,Path(id):Path<String>,user:Option<Extension<AuthenticatedApiUser>>,Query(query):Query<ConversationQuery>)->Response {
    let id=match authorized(&state,&id,user.as_ref()){Ok(id)=>id,Err(response)=>return response};
    let sid=match session(&state,id,query.session_id.as_deref()){Ok(sid)=>sid,Err(error)=>return failure(&error)};
    Json(json!({"sessionId":sid,"turns":projections(&state,id,&sid,user.as_ref())})).into_response()
}
pub async fn stop(State(state):State<Arc<AppState>>,Path(id):Path<String>,user:Option<Extension<AuthenticatedApiUser>>,Json(query):Json<ConversationQuery>)->Response {
    let id=match authorized(&state,&id,user.as_ref()){Ok(id)=>id,Err(response)=>return response};
    let sid=match session(&state,id,query.session_id.as_deref()){Ok(sid)=>sid,Err(error)=>return failure(&error)};
    for row in projections(&state,id,&sid,user.as_ref()).iter().filter(|row|!complete(row)) {
        if let Err(error)=super::super::workflow::cancel(&state,row).await {return failure(&error);}
    }
    Json(json!({"cancelRequested":true})).into_response()
}

/// Explicit observer reattachment: resumes the original stream only, never a POST admission.
pub async fn resume(State(state):State<Arc<AppState>>,Path(id):Path<String>,user:Option<Extension<AuthenticatedApiUser>>,Json(query):Json<ConversationQuery>)->Response {
    let id=match authorized(&state,&id,user.as_ref()){Ok(id)=>id,Err(response)=>return response};
    let sid=match session(&state,id,query.session_id.as_deref()){Ok(sid)=>sid,Err(error)=>return failure(&error)};
    for row in projections(&state,id,&sid,user.as_ref()).into_iter().filter(|row|!complete(row)) {
        let state=Arc::clone(&state);
        tokio::spawn(async move { if super::super::workflow::consume(&state,&row).await.is_err() {
            if let Some(mut saved)=state.kernel.a2a_tasks().get_uar_delegation(&row.boss_task_id) {
                saved.remote_diagnostics.push(json!({"code":"uar_chat_observation_interrupted"}));
                let _=super::super::storage::persist_and_sync(&state,saved);
            }
        }});
    }
    Json(json!({"observationRequested":true})).into_response()
}
