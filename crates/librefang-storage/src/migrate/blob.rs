//! Schema-free decoding of the legacy SQLite BLOB columns.
//!
//! The SQLite store writes session histories and agent manifests with `rmp_serde::to_vec_named`, which keeps field names, so they decode into the same JSON `serde_json::to_value` would produce.
//! `canonical_sessions.messages` is written with `rmp_serde::to_vec`, which drops field names; without the Rust types there is no way to name them, so those BLOBs are rejected here and left to a typed [`LegacyBlobDecoder`].

use serde_json::Value;

use super::LegacyBlobDecoder;

/// The [`LegacyBlobDecoder`] that needs no `librefang-types`: it reads JSON and named-field MessagePack.
#[derive(Debug, Clone, Copy, Default)]
pub struct GenericBlobDecoder;

impl LegacyBlobDecoder for GenericBlobDecoder {
    fn session_messages(&self, blob: &[u8]) -> Result<Value, String> {
        let value = decode_blob(blob)?;
        require_message_objects(&value)?;
        Ok(value)
    }

    fn canonical_messages(&self, blob: &[u8]) -> Result<Value, String> {
        let value = decode_blob(blob)?;
        let Value::Array(entries) = value else {
            return Err("canonical history is not an array".to_string());
        };
        // A named `CanonicalEntry` is `{ message, session_id }`; an older history is a bare list of messages.
        let messages = entries
            .into_iter()
            .map(|entry| match entry {
                Value::Object(mut map)
                    if !map.contains_key("role") && map.contains_key("message") =>
                {
                    map.remove("message").unwrap_or(Value::Null)
                }
                other => other,
            })
            .collect::<Vec<_>>();
        let messages = Value::Array(messages);
        require_message_objects(&messages)?;
        Ok(messages)
    }

    fn agent_manifest(&self, blob: &[u8]) -> Result<Value, String> {
        match decode_blob(blob)? {
            manifest @ Value::Object(_) => Ok(manifest),
            _ => Err("agent manifest is not an object".to_string()),
        }
    }
}

/// Decode a BLOB that holds either JSON or MessagePack.
///
/// JSON is tried first: a MessagePack array or map never starts with a byte that begins valid JSON, while a JSON document such as `[]` would decode as a MessagePack integer.
pub(crate) fn decode_blob(blob: &[u8]) -> Result<Value, String> {
    if let Ok(value) = serde_json::from_slice::<Value>(blob) {
        return Ok(value);
    }
    // Schema-free MessagePack decoding fails on anything JSON cannot hold, such as the raw 16-byte UUIDs a positional encoding writes.
    rmp_serde::from_slice::<Value>(blob).map_err(|e| {
        format!("BLOB is neither JSON nor schema-free MessagePack ({e}); importing it needs a typed LegacyBlobDecoder")
    })
}

/// A history must be a list of message objects; a list of lists means the BLOB was encoded positionally.
fn require_message_objects(value: &Value) -> Result<(), String> {
    let Value::Array(items) = value else {
        return Err("message history is not an array".to_string());
    };
    match items.iter().find(|item| !item.is_object()) {
        None => Ok(()),
        Some(Value::Array(_)) => Err(
            "message history is positional MessagePack (rmp_serde::to_vec); importing it needs a typed LegacyBlobDecoder"
                .to_string(),
        ),
        Some(other) => Err(format!("message history holds a non-object element: {other}")),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde::Serialize;
    use serde_json::json;

    #[derive(Serialize)]
    struct Msg {
        role: &'static str,
        content: &'static str,
    }

    #[derive(Serialize)]
    struct Entry {
        message: Msg,
        session_id: Option<&'static str>,
    }

    fn msgs() -> Vec<Msg> {
        vec![
            Msg {
                role: "user",
                content: "hi",
            },
            Msg {
                role: "assistant",
                content: "hello",
            },
        ]
    }

    #[test]
    fn named_msgpack_session_history_decodes_to_message_objects() {
        let blob = rmp_serde::to_vec_named(&msgs()).unwrap();
        let value = GenericBlobDecoder.session_messages(&blob).unwrap();
        assert_eq!(
            value,
            json!([{"role": "user", "content": "hi"}, {"role": "assistant", "content": "hello"}])
        );
    }

    #[test]
    fn json_session_history_still_decodes() {
        let blob = serde_json::to_vec(&json!([{"role": "user", "content": "x"}])).unwrap();
        assert_eq!(
            GenericBlobDecoder.session_messages(&blob).unwrap(),
            json!([{"role": "user", "content": "x"}])
        );
        assert_eq!(
            GenericBlobDecoder.session_messages(b"[]").unwrap(),
            json!([])
        );
    }

    #[test]
    fn empty_msgpack_history_decodes_to_empty_array() {
        assert_eq!(
            GenericBlobDecoder.session_messages(&[0x90]).unwrap(),
            json!([])
        );
    }

    #[test]
    fn positional_msgpack_history_is_rejected_not_imported() {
        let blob = rmp_serde::to_vec(&msgs()).unwrap();
        let err = GenericBlobDecoder.session_messages(&blob).unwrap_err();
        assert!(err.contains("positional"), "{err}");
    }

    #[test]
    fn garbage_blob_is_an_error() {
        assert!(GenericBlobDecoder
            .session_messages(&[0xc1, 0xff, 0x00])
            .is_err());
    }

    #[test]
    fn named_canonical_entries_unwrap_to_messages() {
        let entries = vec![Entry {
            message: Msg {
                role: "user",
                content: "hi",
            },
            session_id: Some("s-1"),
        }];
        let blob = rmp_serde::to_vec_named(&entries).unwrap();
        assert_eq!(
            GenericBlobDecoder.canonical_messages(&blob).unwrap(),
            json!([{"role": "user", "content": "hi"}])
        );
    }

    #[test]
    fn positional_canonical_entries_need_a_typed_decoder() {
        let entries = vec![Entry {
            message: Msg {
                role: "user",
                content: "hi",
            },
            session_id: None,
        }];
        let blob = rmp_serde::to_vec(&entries).unwrap();
        let err = GenericBlobDecoder.canonical_messages(&blob).unwrap_err();
        assert!(err.contains("typed"), "{err}");
    }

    #[test]
    fn named_msgpack_manifest_decodes_to_object() {
        let blob =
            rmp_serde::to_vec_named(&json!({"name": "a", "model": {"provider": "p"}})).unwrap();
        assert_eq!(
            GenericBlobDecoder.agent_manifest(&blob).unwrap(),
            json!({"name": "a", "model": {"provider": "p"}})
        );
    }
}
