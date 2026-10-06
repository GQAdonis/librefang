use librefang_llm_drivers::drivers::uar_run::{UarRunClient, UarRunClientError};
use librefang_types::uar_run::{UarDelegatedRunProjection, UarRunEvent};

pub(super) async fn observe(
    client: &UarRunClient,
    projection: &UarDelegatedRunProjection,
    after: u64,
) -> Result<(UarDelegatedRunProjection, Vec<UarRunEvent>), UarRunClientError> {
    let mut events = client.observe(projection, after).await?;
    let mut current = client.lookup(projection).await?;
    let mut cursor = events
        .iter()
        .map(|event| event.cursor)
        .max()
        .unwrap_or(after);

    // A terminal receipt can arrive before every unread output frame has been
    // returned by the paged observer. Drain through its authoritative cursor.
    while current.terminal_at.is_some() && cursor < current.cursor {
        let unread = client.observe(&current, cursor).await?;
        if unread.is_empty() {
            break;
        }
        if let Some(next_cursor) = unread.iter().map(|event| event.cursor).max() {
            cursor = next_cursor;
        }
        events.extend(unread);
    }
    // The observation cursor acknowledges returned events, not merely events
    // advertised by the lookup receipt while execution is still active.
    current.cursor = projection.cursor;
    if let Some(cursor) = events.iter().map(|event| event.cursor).max() {
        current.cursor = current.cursor.max(cursor);
    }
    Ok((current, events))
}
