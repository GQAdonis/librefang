use futures::StreamExt;
use librefang_types::uar_run::{UarDelegatedRunProjection, UarRunEvent};

use super::{
    binding::{ensure_same_binding, require_task_id},
    canonical::{parse_sse_events, take_complete_sse_frames},
    http::endpoint,
    UarRunClient, UarRunClientError,
};

impl UarRunClient {
    /// Consume one original-task response through EOF, publishing complete
    /// events before awaiting the next chunk. The caller establishes terminal
    /// authority with a task receipt after the stream closes.
    pub async fn observe_retained<F, Fut>(
        &self,
        projection: &UarDelegatedRunProjection,
        after: u64,
        mut publish: F,
    ) -> Result<(), UarRunClientError>
    where
        F: FnMut(UarRunEvent) -> Fut + Send,
        Fut: std::future::Future<Output = Result<(), UarRunClientError>> + Send,
    {
        let task_id = require_task_id(projection)?;
        let transport = self.original_transport(projection).await?;
        ensure_same_binding(projection, &transport.binding)?;
        self.ensure_runtime_epoch(&transport, projection).await?;
        let suffix = format!("tasks/{task_id}/stream?last_event_id={after}");
        let mut request = self
            .client
            .get(endpoint(&transport.base, &suffix))
            .header("x-uar-workspace-id", &projection.workspace_id);
        if let Some(credential) = &transport.credential {
            request = request.bearer_auth(credential.as_str());
        }
        let response = self
            .send(&transport, request, "event observation", false, &projection.workspace_id)
            .await?;
        let mut stream = response.bytes_stream();
        let mut buffer = Vec::new();
        loop {
            let next = tokio::time::timeout(self.request_timeout, stream.next())
                .await
                .map_err(|_| UarRunClientError::Transport {
                    operation: "event observation",
                    message: format!("no event arrived within {} seconds", self.request_timeout.as_secs()),
                    outcome_uncertain: false,
                })?;
            let Some(chunk) = next else { return Ok(()); };
            let chunk = chunk.map_err(|error| UarRunClientError::Transport {
                operation: "event observation",
                message: error.to_string(),
                outcome_uncertain: false,
            })?;
            buffer.extend_from_slice(&chunk);
            if let Some(frames) = take_complete_sse_frames(&mut buffer)? {
                for event in parse_sse_events(task_id, projection.revision, &frames)? {
                    publish(event).await?;
                }
            }
        }
    }

    pub async fn observe(
        &self,
        projection: &UarDelegatedRunProjection,
        after: u64,
    ) -> Result<Vec<UarRunEvent>, UarRunClientError> {
        let task_id = require_task_id(projection)?;
        let transport = self.original_transport(projection).await?;
        ensure_same_binding(projection, &transport.binding)?;
        self.ensure_runtime_epoch(&transport, projection).await?;
        let suffix = format!("tasks/{task_id}/stream?last_event_id={after}");
        let mut request = self
            .client
            .get(endpoint(&transport.base, &suffix))
            .header("x-uar-workspace-id", &projection.workspace_id);
        if let Some(credential) = &transport.credential {
            request = request.bearer_auth(credential.as_str());
        }
        let response = self
            .send(
                &transport,
                request,
                "event observation",
                false,
                &projection.workspace_id,
            )
            .await?;
        let mut stream = response.bytes_stream();
        let mut buffer = Vec::new();
        let mut events = Vec::new();
        loop {
            let next = tokio::time::timeout(self.request_timeout, stream.next())
                .await
                .map_err(|_| UarRunClientError::Transport {
                    operation: "event observation",
                    message: format!(
                        "no event arrived within {} seconds",
                        self.request_timeout.as_secs()
                    ),
                    outcome_uncertain: false,
                })?;
            let Some(chunk) = next else {
                return if buffer.is_empty() { Ok(events) } else {
                    Err(super::canonical::observation_error("incomplete observation frame at EOF"))
                };
            };
            let chunk = chunk.map_err(|error| UarRunClientError::Transport {
                operation: "event observation",
                message: error.to_string(),
                outcome_uncertain: false,
            })?;
            buffer.extend_from_slice(&chunk);
            if let Some(frames) = take_complete_sse_frames(&mut buffer)? {
                events.extend(parse_sse_events(task_id, projection.revision, &frames)?);
                // UAR closes terminal replay, including an empty replay. Drain
                // this response before publishing its authoritative terminal state.
                if projection.terminal_at.is_none() && !events.is_empty() {
                    return Ok(events);
                }
            }
        }
    }
}

impl UarRunClient {
    /// Returned events are non-executable copies; the caller must commit them
    /// atomically with its applied cursor. The receipt cursor is availability.
    pub async fn observe_presentation(
        &self, projection: &UarDelegatedRunProjection, after: u64,
    ) -> Result<(UarDelegatedRunProjection, Vec<librefang_types::uar_run::UarAttemptPresentationEvent>), UarRunClientError> {
        self.observe_presentation_mode(projection, after, true).await
    }

    /// A task snapshot consumes available history without waiting for a future
    /// approval decision when its original receipt cursor is already applied.
    pub async fn observe_available_presentation(
        &self, projection: &UarDelegatedRunProjection, after: u64,
    ) -> Result<(UarDelegatedRunProjection, Vec<librefang_types::uar_run::UarAttemptPresentationEvent>), UarRunClientError> {
        self.observe_presentation_mode(projection, after, false).await
    }

    async fn observe_presentation_mode(
        &self, projection: &UarDelegatedRunProjection, after: u64, wait_for_new: bool,
    ) -> Result<(UarDelegatedRunProjection, Vec<librefang_types::uar_run::UarAttemptPresentationEvent>), UarRunClientError> {
        let secrets = self.original_secrets(projection).await?;
        let mut current = self.lookup(projection).await?;
        let mut cursor = after;
        let mut carry = zeroize::Zeroizing::new(String::new());
        let mut projected = Vec::new();
        let mut decoded_bytes = 0usize;
        loop {
            // Only an exact cursor with no private carry can end a snapshot.
            // Live observers still wait for new frames until actual terminal.
            if (!wait_for_new || current.terminal_at.is_some()) && cursor == current.cursor && carry.is_empty() {
                return Ok((current, projected));
            }
            let events = self.observe(&current, cursor).await?;
            current = self.lookup(&current).await?;
            if events.is_empty() {
                if !carry.is_empty() || current.cursor > cursor {
                    return Err(super::canonical::observation_error("incomplete observation group"));
                }
                return Ok((current, projected));
            }
            for event in events {
                decoded_bytes = decoded_bytes.saturating_add(serde_json::to_vec(&event)
                    .map_err(|_| super::canonical::observation_error("malformed observation group"))?.len());
                if decoded_bytes > super::presentation::MAX_PRESENTATION_BYTES {
                    return Err(super::canonical::observation_error("decoded observation group exceeded limit"));
                }
                if cursor.checked_add(1) != Some(event.cursor) {
                    return Err(super::canonical::observation_error("observation cursor gap"));
                }
                cursor = event.cursor;
                projected.push(super::presentation::project_event(&event, &current, &secrets, &mut carry)?);
            }
            // A page may finish in a captured-value prefix. Keep it privately
            // until continuation or terminal flush; never acknowledge it alone.
            if carry.is_empty() { return Ok((current, projected)); }
        }
    }
}
