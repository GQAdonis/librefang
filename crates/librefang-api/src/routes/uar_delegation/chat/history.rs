//! Preserve the authorized native conversation once when switching executors.
use super::*;
use librefang_types::message::{ContentBlock, MessageContent, Role};

pub fn seed(state:&Arc<AppState>,id:AgentId,sid:&str,previous:&[UarDelegatedRunProjection])->Result<Vec<Value>,String> {
    if let Some(saved)=previous.iter().find_map(|row|row.chat.as_ref().and_then(|chat|chat.native_history.as_ref())) {return Ok(saved.clone());}
    // Native sessions are not appended by this adapter. Freeze their prefix on
    // first admission rather than rereading mutable history on every follow-up.
    if !previous.is_empty(){return Err("uar_chat_history_provenance_missing".into());}
    let sessions=state.kernel.list_agent_sessions(id).map_err(|_|"native_history_unavailable")?;
    if !sessions.iter().any(|row|row["session_id"].as_str()==Some(sid)) {return Ok(vec![]);}
    let session=state.kernel.export_session(id,sid.parse::<SessionId>().map_err(|_|"invalid_session_id")?)
        .map_err(|_|"native_history_unavailable")?;
    let mut history=Vec::new();
    for message in session.messages {
        // Native system policy never overrides the explicitly selected UAR definition.
        let role=match message.role {Role::System=>continue,Role::User=>"user",Role::Assistant=>"assistant"};
        match message.content {
            MessageContent::Text(content)=>if !content.is_empty(){history.push(json!({"role":role,"content":content}));},
            MessageContent::Blocks(blocks)=>{
                let mut text=Vec::new();let mut calls=Vec::new();let mut results=Vec::new();
                for block in blocks {match block {
                    ContentBlock::Text{text:content,..}=>text.push(content),
                    ContentBlock::ToolUse{id,name,input,..} if role=="assistant"=>calls.push(json!({"id":id,"type":"function","function":{"name":name,"arguments":input.to_string()}})),
                    ContentBlock::ToolResult{tool_use_id,content,..}=>results.push(json!({"role":"tool","content":content,"tool_call_id":tool_use_id})),
                    ContentBlock::Thinking{..}=>{},
                    _=>return Err("uar_chat_native_history_requires_new_conversation".into()),
                }}
                if !text.is_empty() || !calls.is_empty(){let mut value=json!({"role":role,"content":text.join("\n")});if !calls.is_empty(){value["tool_calls"]=json!(calls);}history.push(value);}
                history.extend(results);
            }
        }
    }
    Ok(history)
}
