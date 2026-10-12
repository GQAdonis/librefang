use super::*;
use crate::types::MessageRequest;
use axum::response::sse::{Sse, Event, KeepAlive};
use tokio_stream::{wrappers::ReceiverStream, StreamExt};
use std::convert::Infallible;

fn request(req: MessageRequest)->Result<super::turns::TurnRequest,String> {
    if !req.attachments.is_empty() || req.ephemeral || req.incognito {return Err("uar_chat_text_conversation_required".into());}
    Ok(super::turns::TurnRequest {message:req.message,session_id:req.session_id,turn_id:uuid::Uuid::new_v4().to_string()})
}
/// Shared projection stream for HTTP and websocket clients. Execution continues
/// independently of the observer; disconnect never starts a replacement run.
pub async fn events(state:Arc<AppState>,id:AgentId,user:Option<Extension<AuthenticatedApiUser>>,request:super::turns::TurnRequest)
    ->Result<tokio::sync::mpsc::Receiver<Value>,String> {
    let admitted=super::turns::begin(Arc::clone(&state),id,user,request).await?;
    let (tx,rx)=tokio::sync::mpsc::channel(32);
    tokio::spawn(async move {
        let session_id=admitted.chat.as_ref().map(|chat|chat.session_id.clone());
        let mut emitted=String::new(); let mut revision=0;
        loop {
            let row=state.kernel.a2a_tasks().get_uar_delegation(&admitted.boss_task_id).unwrap_or_else(||admitted.clone());
            let output=row.output.as_deref().unwrap_or("");
            if let Some(delta)=output.strip_prefix(&emitted).filter(|delta|!delta.is_empty()) {
                if tx.send(json!({"type":"text_delta","content":delta,"session_id":session_id})).await.is_err(){break;}
                emitted=output.into();
            }
            if row.revision!=revision {
                revision=row.revision;
                if tx.send(json!({"type":"uar_projection","projection":row,"session_id":session_id})).await.is_err(){break;}
            }
            if super::turns::complete(&row) {
                let message=if row.execution_state=="completed" {json!({"type":"response","content":output,"session_id":session_id,"uar":row})}
                    else {json!({"type":"error","content":super::super::workflow::failure_reason(&row,&row.execution_state),"uar":row})};
                let _=tx.send(message).await; break;
            }
            if matches!(row.recovery_state.as_str(),"connection_reattachment_required"|"recovery_unsupported"|"unsupported") {
                let _=tx.send(json!({"type":"error","content":"uar_chat_reconnect_required","uar":row})).await;break;
            }
            if row.remote_diagnostics.iter().any(|value|value["code"]=="uar_chat_observation_interrupted") {
                let _=tx.send(json!({"type":"error","content":"uar_chat_observation_interrupted","uar":row})).await;break;
            }
            if tx.is_closed(){break;}
            tokio::time::sleep(std::time::Duration::from_millis(200)).await;
        }
    });
    Ok(rx)
}
pub async fn http(state:Arc<AppState>,id:AgentId,user:Option<Extension<AuthenticatedApiUser>>,req:MessageRequest)->Response {
    let request=match request(req){Ok(request)=>request,Err(error)=>return failure(&error)};
    let mut events=match events(state,id,user,request).await {Ok(events)=>events,Err(error)=>return failure(&error)};
    while let Some(event)=events.recv().await {
        match event["type"].as_str() {
            Some("response")=>return Json(json!({"response":event["content"],"session_id":event["session_id"],"uar":event["uar"]})).into_response(),
            Some("error")=>return failure(event["content"].as_str().unwrap_or("uar_chat_failed")), _=>{}
        }
    }
    failure("uar_chat_observation_interrupted")
}
pub async fn stream(state:Arc<AppState>,id:AgentId,user:Option<Extension<AuthenticatedApiUser>>,req:MessageRequest)->Response {
    let request=match request(req){Ok(request)=>request,Err(error)=>return failure(&error)};
    let events=match events(state,id,user,request).await {Ok(events)=>events,Err(error)=>return failure(&error)};
    let stream=ReceiverStream::new(events).map(|value| {
        let event=match value["type"].as_str(){Some("text_delta")=>Event::default().event("chunk").data(json!({"content":value["content"],"session_id":value["session_id"],"done":false}).to_string()),
            Some("response")=>Event::default().event("done").data(json!({"done":true,"content":value["content"],"session_id":value["session_id"],"uar":value["uar"]}).to_string()),
            Some("error")=>Event::default().event("error").data(value.to_string()),_=>Event::default().event("uar_projection").data(value.to_string())};
        Ok::<_,Infallible>(event)
    });
    Sse::new(stream).keep_alive(KeepAlive::default()).into_response()
}
