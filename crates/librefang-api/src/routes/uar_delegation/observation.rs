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
    // The observation cursor acknowledges returned events, not merely events
    // advertised by the lookup receipt while execution is still active.
    current.cursor = projection.cursor;
    if let Some(cursor) = events.iter().map(|event| event.cursor).max() {
        current.cursor = current.cursor.max(cursor);
    }
    Ok((current, events))
}
