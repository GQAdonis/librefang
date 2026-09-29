use librefang_types::uar_run::UarRunEvent;
use serde_json::Value;
use sha2::{Digest, Sha256};

use super::UarRunClientError;

pub(super) fn canonical_digest(value: &Value) -> String {
    let mut canonical = String::new();
    write_canonical(value, &mut canonical);
    format!(
        "sha256:{}",
        hex::encode(Sha256::digest(canonical.as_bytes()))
    )
}

fn write_canonical(value: &Value, output: &mut String) {
    match value {
        Value::Null => output.push_str("null"),
        Value::Bool(value) => output.push_str(if *value { "true" } else { "false" }),
        Value::Number(value) => output.push_str(&value.to_string()),
        Value::String(value) => output.push_str(
            &serde_json::to_string(value).expect("serializing a JSON string cannot fail"),
        ),
        Value::Array(values) => {
            output.push('[');
            for (index, value) in values.iter().enumerate() {
                if index > 0 {
                    output.push(',');
                }
                write_canonical(value, output);
            }
            output.push(']');
        }
        Value::Object(values) => {
            output.push('{');
            let mut entries = values.iter().collect::<Vec<_>>();
            entries.sort_by(|left, right| left.0.cmp(right.0));
            for (index, (key, value)) in entries.into_iter().enumerate() {
                if index > 0 {
                    output.push(',');
                }
                output.push_str(
                    &serde_json::to_string(key).expect("serializing a JSON key cannot fail"),
                );
                output.push(':');
                write_canonical(value, output);
            }
            output.push('}');
        }
    }
}

pub(super) fn parse_sse_events(
    task_id: &str,
    revision: u64,
    body: &str,
) -> Result<Vec<UarRunEvent>, UarRunClientError> {
    body.split("\n\n")
        .filter_map(|frame| {
            let mut cursor = None;
            let mut event_type = None;
            let mut data = None;
            for line in frame.lines() {
                if let Some(value) = line.strip_prefix("id:") {
                    cursor = value.trim().parse::<u64>().ok();
                } else if let Some(value) = line.strip_prefix("event:") {
                    event_type = Some(value.trim().to_string());
                } else if let Some(value) = line.strip_prefix("data:") {
                    data = Some(value.trim().to_string());
                }
            }
            data.map(|data| (cursor, event_type, data))
        })
        .filter(|(_, _, data)| !data.is_empty() && data != "[DONE]")
        .map(|(cursor, event_type, data)| {
            let cursor = cursor.ok_or_else(|| UarRunClientError::InvalidResponse {
                operation: "event observation",
                message: "SSE event omitted its monotonic id".to_string(),
            })?;
            let data = serde_json::from_str(&data).map_err(|error| {
                UarRunClientError::InvalidResponse {
                    operation: "event observation",
                    message: error.to_string(),
                }
            })?;
            Ok(UarRunEvent {
                task_id: task_id.to_string(),
                cursor,
                revision,
                event_type: event_type.unwrap_or_else(|| "message".to_string()),
                occurred_at: None,
                data,
            })
        })
        .collect()
}

pub(super) fn take_complete_sse_frames(
    buffer: &mut Vec<u8>,
) -> Result<Option<String>, UarRunClientError> {
    const MAX_PENDING_FRAME_BYTES: usize = 1024 * 1024;
    let Some(end) = buffer.windows(2).rposition(|bytes| bytes == b"\n\n") else {
        if buffer.len() > MAX_PENDING_FRAME_BYTES {
            return Err(UarRunClientError::InvalidResponse {
                operation: "event observation",
                message: "SSE frame exceeded the one-megabyte observation limit".to_string(),
            });
        }
        return Ok(None);
    };
    let complete = buffer.drain(..end + 2).collect::<Vec<_>>();
    String::from_utf8(complete)
        .map(Some)
        .map_err(|error| UarRunClientError::InvalidResponse {
            operation: "event observation",
            message: error.to_string(),
        })
}
