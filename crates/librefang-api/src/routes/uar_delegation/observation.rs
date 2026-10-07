use librefang_llm_drivers::drivers::uar_run::{UarRunClient, UarRunClientError};
use librefang_types::uar_run::{UarDelegatedRunProjection, UarRunEvent};

pub(super) async fn observe(
    client: &UarRunClient,
    projection: &UarDelegatedRunProjection,
    after: u64,
) -> Result<(UarDelegatedRunProjection, Vec<UarRunEvent>), UarRunClientError> {
    let mut current = client.lookup(projection).await?;
    // Lookup establishes terminal authority before observation. A terminal
    // observer drains its single replay response, without reconnecting per page.
    let events = client.observe(&current, after).await?;
    for event in &events {
        if event.cursor <= projection.cursor {
            continue;
        }
        if current.workflow.is_some() && event.data.get("code").and_then(serde_json::Value::as_str) == Some("STREAM_GAP") {
            current.recovery_state = "recovery_unsupported".into();
            current.remote_diagnostics.push(serde_json::json!({"code":"STREAM_GAP"}));
        }
        match event.event_type.as_str() {
            "agui.message.delta" if current.workflow.is_some() => {
                if let Some(text) = event.data.pointer("/delta/text").and_then(serde_json::Value::as_str) {
                    current.output.get_or_insert_with(String::new).push_str(text);
                }
            }
            "agui.tool_call.approval_required" => current.pending_approval = Some(event.clone()),
            "agui.done" | "agui.cancelled" | "agui.error" => current.pending_approval = None,
            _ => {}
        }
    }
    // The observation cursor acknowledges returned events, not merely events
    // advertised by the lookup receipt while execution is still active.
    current.cursor = projection.cursor;
    if let Some(cursor) = events.iter().map(|event| event.cursor).max() {
        current.cursor = current.cursor.max(cursor);
    }
    Ok((current, events))
}
