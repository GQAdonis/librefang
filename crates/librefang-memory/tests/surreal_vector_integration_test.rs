#![cfg(feature = "surreal-backend")]

use std::sync::Arc;

use librefang_memory::open_shared_memory_storage;
use librefang_memory::proactive::EmbeddingFn;
use librefang_storage::config::{StorageBackendKind, StorageConfig, DEFAULT_MEMORY_DATABASE_NAME};
use librefang_types::error::LibreFangResult;
use surreal_memory::{Memory, MemoryStorage};

#[test]
fn derived_memory_store_uses_dedicated_database_and_lock_path() {
    let tmp = tempfile::tempdir().expect("tempdir");
    let cfg = StorageConfig::embedded_default(tmp.path());
    let memory_cfg = cfg.memory_storage_config();

    let StorageBackendKind::Embedded {
        path: ref operational_path,
    } = cfg.backend
    else {
        panic!("expected embedded operational storage");
    };
    let StorageBackendKind::Embedded {
        path: ref memory_path,
    } = memory_cfg.backend
    else {
        panic!("expected embedded memory storage");
    };

    assert_ne!(operational_path, memory_path);
    assert_eq!(memory_path.file_name().unwrap(), "librefang-memory.surreal");
    assert_eq!(
        memory_cfg.effective_database(),
        DEFAULT_MEMORY_DATABASE_NAME
    );
}

/// Deterministic bag-of-words embedder: every word lands in one of `DIMS` buckets, plus a constant component so no vector is zero.
struct HashEmbedding;

const DIMS: usize = 8;

#[async_trait::async_trait]
impl EmbeddingFn for HashEmbedding {
    async fn embed_one(&self, text: &str) -> LibreFangResult<Vec<f32>> {
        let mut v = vec![0.0_f32; DIMS];
        v[0] = 1.0;
        for word in text.split_whitespace() {
            let bucket = word.bytes().map(usize::from).sum::<usize>() % DIMS;
            v[bucket] += 1.0;
        }
        Ok(v)
    }
}

#[tokio::test(flavor = "multi_thread")]
async fn shared_memory_storage_opens_once_and_can_be_shared_by_backends() {
    let tmp = tempfile::tempdir().expect("tempdir");
    let cfg = StorageConfig::embedded_default(tmp.path());

    let shared = open_shared_memory_storage(&cfg, Arc::new(HashEmbedding), DIMS)
        .await
        .expect("shared memory storage should open");
    let clone = shared.clone();

    assert!(
        Arc::ptr_eq(&shared, &clone),
        "kernel should share a single SurrealStorage Arc across memory backends"
    );
}

#[tokio::test]
async fn shared_memory_storage_rejects_zero_embedding_dimension() {
    let tmp = tempfile::tempdir().expect("tempdir");
    let cfg = StorageConfig::embedded_default(tmp.path());

    let Err(err) = open_shared_memory_storage(&cfg, Arc::new(HashEmbedding), 0).await else {
        panic!("a zero embedding dimension must be rejected");
    };

    assert!(err.contains("non-zero embedding dimension"), "{err}");
    let StorageBackendKind::Embedded { path } = cfg.memory_storage_config().backend else {
        panic!("expected embedded memory storage");
    };
    assert!(
        !path.exists(),
        "the dimension check must run before the memory store is created"
    );
}

/// `SurrealStorage` embeds with the driver it was opened with and sizes its HNSW index from the declared dimension, so a store/search round trip proves the two agree.
/// This goes through the storage directly: `SurrealSemanticBackend::remember` cannot write on surreal-memory `b7e2093`, whose `memory.metadata` field is not FLEXIBLE (its v8 migration uses `IF NOT EXISTS` on a field v1 already defined), so the nested `metadata.librefang` object is rejected.
#[tokio::test(flavor = "multi_thread")]
async fn shared_memory_storage_round_trips_through_configured_embedder() {
    let tmp = tempfile::tempdir().expect("tempdir");
    let cfg = StorageConfig::embedded_default(tmp.path());
    let storage = open_shared_memory_storage(&cfg, Arc::new(HashEmbedding), DIMS)
        .await
        .expect("shared memory storage should open");

    let agent_id = uuid::Uuid::new_v4().to_string();
    let content = "the ember fox prefers dark roast coffee";
    storage
        .add_memory(Memory::new(
            content,
            None,
            Some(agent_id.clone()),
            None,
            Vec::new(),
        ))
        .await
        .expect("add_memory should store a vector of the configured dimension");

    let recalled = storage
        .search_memories(content, None, Some(&agent_id), None, None, 5)
        .await
        .expect("search_memories should query the HNSW index");

    assert_eq!(recalled.len(), 1, "{recalled:?}");
    assert_eq!(recalled[0].content, content);
    assert_eq!(
        recalled[0].embedding.as_ref().map(Vec::len),
        Some(DIMS),
        "the stored vector must come from the configured embedder"
    );
}
