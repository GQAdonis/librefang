use futures::StreamExt;
use librefang_types::uar_run::{UarDelegatedRunProjection, UarRunEvent};

use super::{
    binding::{ensure_same_binding, require_task_id},
    canonical::{parse_sse_events, take_complete_sse_frames},
    http::endpoint,
    UarRunClient, UarRunClientError,
};

impl UarRunClient {
    pub async fn observe(
        &self,
        projection: &UarDelegatedRunProjection,
        after: u64,
    ) -> Result<Vec<UarRunEvent>, UarRunClientError> {
        let task_id = require_task_id(projection)?;
        let transport = self.transport(&projection.verified_principal).await?;
        ensure_same_binding(projection, &transport.binding)?;
        self.ensure_runtime_epoch(&transport, projection).await?;
        let suffix = format!("tasks/{task_id}/stream?last_event_id={after}");
        let mut request = self
            .client
            .get(endpoint(&transport.base, &suffix))
            .header("x-uar-workspace-id", &projection.workspace_id)
            .header("x-uar-principal", &transport.verified_principal);
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
                return Ok(Vec::new());
            };
            let chunk = chunk.map_err(|error| UarRunClientError::Transport {
                operation: "event observation",
                message: error.to_string(),
                outcome_uncertain: false,
            })?;
            buffer.extend_from_slice(&chunk);
            if let Some(frames) = take_complete_sse_frames(&mut buffer)? {
                let events = parse_sse_events(task_id, projection.revision, &frames)?;
                if !events.is_empty() {
                    return Ok(events);
                }
            }
        }
    }
}
