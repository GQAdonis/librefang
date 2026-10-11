//! SurrealDB-backed [`crate::ProactiveMemoryBackend`] implementation.
//!
//! Provides decay (TTL-based eviction), consolidation, and vacuum operations against the `memory` table of the surreal-memory store, the same store [`crate::SurrealSemanticBackend`] writes.
//!
//! ## Design notes
//!
//! - `run_decay` applies the SQLite decay policy (`crate::decay::run_decay`) to that table: rows whose scope is `session_memory`, `agent_memory` or `episodic` and whose last access (or creation, if never accessed) is older than the scope's TTL are removed.
//!   The store has no soft-delete column, so removal goes through `MemoryStorage::delete_memory`, which records a `deleted` history row for each.
//! - `consolidate` runs surreal-memory's `expire_stale_memories` (rows whose `valid_until` has passed).
//! - `vacuum_if_shrank` is always a no-op — SurrealDB manages its own
//!   compaction without the caller needing to trigger it.

use super::shared::memory_error;
use crate::backend::ProactiveMemoryBackend;
use async_trait::async_trait;
use librefang_types::config::MemoryDecayConfig;
use librefang_types::error::LibreFangResult;
use librefang_types::memory::ConsolidationReport;
use serde_json::Value as JsonValue;
use std::sync::Arc;
use surreal_memory::{MemoryStorage, SurrealStorage};
use surrealdb::{engine::any::Any, Surreal};

/// Scopes the decay sweep expires, with the config field that sets each TTL (same scopes as `crate::decay::run_decay`).
/// Reads one scope's TTL (days) from the decay config.
type TtlOf = fn(&MemoryDecayConfig) -> u32;

const DECAYING_SCOPES: [(&str, TtlOf); 3] = [
    ("session_memory", |c| c.session_ttl_days),
    ("agent_memory", |c| c.agent_ttl_days),
    ("episodic", |c| c.episodic_ttl_days),
];

/// SurrealDB-backed implementation of [`ProactiveMemoryBackend`].
pub struct SurrealProactiveMemoryBackend {
    storage: Arc<SurrealStorage>,
    /// Connection to the memory store, for the decay selection query.
    db: Surreal<Any>,
}

impl SurrealProactiveMemoryBackend {
    /// Wrap an open `SurrealStorage` — normally the one the semantic backend uses ([`crate::SurrealSemanticBackend::storage`]).
    ///
    /// # Errors
    ///
    /// Returns an error when the storage's connection is not live.
    pub fn new(storage: Arc<SurrealStorage>) -> LibreFangResult<Self> {
        let db = storage.db().map_err(|e| {
            memory_error("SurrealProactiveMemoryBackend: memory store connection", e)
        })?;
        Ok(Self { storage, db })
    }

    /// Open the proactive memory backend on a fresh `SurrealStorage` built from `storage_cfg`.
    /// `SurrealStorage` cannot open without an embedding driver and its dimension, so the caller passes the same pair it gives [`super::shared::open_shared_memory_storage`] for the semantic backend.
    /// In embedded mode only one opener per process can hold the store, so a process that also runs the semantic backend builds this one with [`Self::new`] on that backend's storage instead.
    pub async fn open_with_storage(
        storage_cfg: &librefang_storage::config::StorageConfig,
        embedding: Arc<dyn crate::proactive::EmbeddingFn>,
        dimensions: usize,
    ) -> Result<Self, String> {
        let storage = super::shared::open_shared_memory_storage(storage_cfg, embedding, dimensions)
            .await
            .map_err(|e| format!("SurrealStorage (proactive memory): {e}"))?;
        Self::new(storage).map_err(|e| e.to_string())
    }

    /// Remove every row the decay policy expires; returns how many were removed.
    async fn decay(&self, config: &MemoryDecayConfig) -> LibreFangResult<usize> {
        let now = chrono::Utc::now();
        let mut removed = 0usize;
        for (scope, ttl_of) in DECAYING_SCOPES {
            let ttl_days = ttl_of(config);
            if ttl_days == 0 {
                continue;
            }
            let cutoff = now - chrono::Duration::days(i64::from(ttl_days));
            let rows: Vec<JsonValue> = self
                .db
                .query(
                    "SELECT record::id(id) AS key FROM memory \
                     WHERE categories[0] = $scope \
                       AND (last_accessed_at ?? created_at) < $cutoff",
                )
                .bind(("scope", scope.to_string()))
                .bind(("cutoff", surrealdb::types::Datetime::from(cutoff)))
                .await
                .map_err(|e| memory_error("SurrealProactiveMemoryBackend::run_decay", e))?
                .take(0)
                .map_err(|e| {
                    memory_error("SurrealProactiveMemoryBackend::run_decay (decode)", e)
                })?;
            for key in rows
                .iter()
                .filter_map(|r| r.get("key").and_then(JsonValue::as_str))
            {
                self.storage.delete_memory(key).await.map_err(|e| {
                    memory_error("SurrealProactiveMemoryBackend::run_decay (delete)", e)
                })?;
                removed += 1;
            }
        }
        if removed > 0 {
            tracing::info!(removed, "SurrealDB memory decay sweep completed");
        }
        Ok(removed)
    }
}

#[async_trait]
impl ProactiveMemoryBackend for SurrealProactiveMemoryBackend {
    fn run_decay(&self, config: &MemoryDecayConfig) -> LibreFangResult<usize> {
        if !config.enabled {
            return Ok(0);
        }
        // `run_decay` is a sync trait method; the connection's tasks live on the caller's runtime, so block on it in place.
        match tokio::runtime::Handle::try_current() {
            Ok(handle) => tokio::task::block_in_place(|| handle.block_on(self.decay(config))),
            Err(_) => tokio::runtime::Builder::new_current_thread()
                .enable_all()
                .build()
                .map_err(|e| memory_error("SurrealProactiveMemoryBackend::run_decay (runtime)", e))?
                .block_on(self.decay(config)),
        }
    }

    async fn consolidate(&self) -> LibreFangResult<ConsolidationReport> {
        let started = std::time::Instant::now();
        let expired = self
            .storage
            .expire_stale_memories()
            .await
            .map_err(|e| memory_error("SurrealProactiveMemoryBackend::consolidate", e))?;
        Ok(ConsolidationReport {
            memories_merged: 0,
            memories_decayed: expired,
            duration_ms: u64::try_from(started.elapsed().as_millis()).unwrap_or(u64::MAX),
        })
    }

    fn vacuum_if_shrank(&self, _pruned_count: usize) -> LibreFangResult<()> {
        // SurrealDB manages its own compaction; no manual vacuum needed.
        Ok(())
    }
}
