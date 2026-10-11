//! Concrete storage backend implementations.
//!
//! Phase 5–9 of the `surrealdb-storage-swap` plan introduce SurrealDB-backed
//! implementations behind the `surreal-backend` Cargo feature. The legacy
//! [`crate::MemorySubstrate`] (rusqlite) keeps its trait impls in
//! [`crate::backend`] and remains available when callers opt into
//! `sqlite-backend`.

#[cfg(feature = "surreal-backend")]
pub mod shared;
#[cfg(feature = "surreal-backend")]
pub mod surreal;
#[cfg(feature = "surreal-backend")]
pub mod surreal_device;
#[cfg(feature = "surreal-backend")]
pub mod surreal_knowledge;
#[cfg(feature = "surreal-backend")]
pub mod surreal_kv;
#[cfg(feature = "surreal-backend")]
pub mod surreal_proactive;
#[cfg(feature = "surreal-backend")]
pub mod surreal_prompt;
#[cfg(feature = "surreal-backend")]
pub mod surreal_semantic;
#[cfg(feature = "surreal-backend")]
pub mod surreal_session;
#[cfg(feature = "surreal-backend")]
pub mod surreal_task;
#[cfg(feature = "surreal-backend")]
pub mod surreal_usage;

#[cfg(feature = "surreal-backend")]
pub use shared::open_shared_memory_storage;
#[cfg(feature = "surreal-backend")]
pub use surreal::SurrealMemoryBackend;
#[cfg(feature = "surreal-backend")]
pub use surreal_device::SurrealDeviceStore;
#[cfg(feature = "surreal-backend")]
pub use surreal_knowledge::SurrealKnowledgeBackend;
#[cfg(feature = "surreal-backend")]
pub use surreal_kv::SurrealKvBackend;
#[cfg(feature = "surreal-backend")]
pub use surreal_proactive::SurrealProactiveMemoryBackend;
#[cfg(feature = "surreal-backend")]
pub use surreal_prompt::SurrealPromptStore;
#[cfg(feature = "surreal-backend")]
pub use surreal_semantic::SurrealSemanticBackend;
#[cfg(feature = "surreal-backend")]
pub use surreal_session::SurrealSessionBackend;
#[cfg(feature = "surreal-backend")]
pub use surreal_task::SurrealTaskBackend;
#[cfg(feature = "surreal-backend")]
pub use surreal_usage::SurrealUsageStore;

/// Drop top-level keys whose value is JSON `null`.
///
/// Optional columns are typed `option<T>`, which accepts NONE but rejects NULL, and a JSON `null` arrives as NULL.
/// A key left out of a `.content()` write is stored as NONE.
#[cfg(feature = "surreal-backend")]
pub(crate) fn omit_nulls(value: serde_json::Value) -> serde_json::Value {
    match value {
        serde_json::Value::Object(map) => {
            serde_json::Value::Object(map.into_iter().filter(|(_, v)| !v.is_null()).collect())
        }
        other => other,
    }
}

/// The key part of a record id read back as a string: `table:key`, where SurrealDB escapes keys that are not plain identifiers (every UUID) as `` table:`key` `` or `table:⟨key⟩`.
#[cfg(feature = "surreal-backend")]
pub(crate) fn record_key<'a>(raw: &'a str, table: &str) -> &'a str {
    let key = raw
        .strip_prefix(table)
        .and_then(|rest| rest.strip_prefix(':'))
        .unwrap_or(raw);
    key.strip_prefix('`')
        .and_then(|k| k.strip_suffix('`'))
        .or_else(|| key.strip_prefix('⟨').and_then(|k| k.strip_suffix('⟩')))
        .unwrap_or(key)
}

#[cfg(all(test, feature = "surreal-backend"))]
mod helper_tests {
    use super::{omit_nulls, record_key};
    use serde_json::json;

    #[test]
    fn omit_nulls_drops_only_top_level_nulls() {
        assert_eq!(
            omit_nulls(json!({"a": null, "b": 1, "c": {"d": null}})),
            json!({"b": 1, "c": {"d": null}})
        );
    }

    #[test]
    fn record_key_unwraps_every_escaping_form() {
        let id = "0b7d6c1a-2f3e-4d5c-8b9a-112233445566";
        for raw in [
            format!("t:`{id}`"),
            format!("t:⟨{id}⟩"),
            format!("t:{id}"),
            id.to_string(),
        ] {
            assert_eq!(record_key(&raw, "t"), id, "raw id {raw}");
        }
        assert_eq!(record_key("t:plain_key", "t"), "plain_key");
    }
}
