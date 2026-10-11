//! `[memory] vector_backend` selection at boot.
//!
//! SQLite (`MemorySubstrate`) is the system of record for semantic memory in every mode.
//! The setting only chooses who ranks vectors for `recall_with_embedding`: the built-in SQLite cosine scan, an HTTP vector service, or the SurrealDB HNSW index in the surreal-memory store (the BossFang default).
//!
//! | Value | Selected backend |
//! |---|---|
//! | unset / `"auto"` | SurrealDB when `surreal-backend` is compiled in and an embedding driver is configured; SQLite otherwise, or when the SurrealDB store cannot be opened (logged). |
//! | `"surreal"` | SurrealDB; boot fails when the feature, the embedding driver or the store is missing. |
//! | `"sqlite"` / `""` | SQLite. |
//! | `"http"` | `HttpVectorStore` at `vector_store_url`. |

use librefang_types::config::KernelConfig;
use librefang_types::error::LibreFangError;

/// The backend `[memory] vector_backend` resolves to.
#[derive(Debug, Clone, PartialEq, Eq)]
// Without `surreal-backend` the `Surreal` arm is never attached, so its field is never read.
#[cfg_attr(not(feature = "surreal-backend"), allow(dead_code))]
pub(super) enum VectorBackendChoice {
    /// Built-in SQLite vectors; nothing is attached.
    Sqlite,
    /// Remote HTTP vector service at this URL.
    Http(String),
    /// SurrealDB HNSW index. `required` is false for the implicit default, which falls back to SQLite instead of failing boot.
    Surreal { required: bool },
}

/// Resolve `[memory] vector_backend`, rejecting values the build cannot honour.
pub(super) fn resolve(config: &KernelConfig) -> Result<VectorBackendChoice, LibreFangError> {
    match config.memory.vector_backend.as_deref() {
        None | Some("auto") => Ok(if cfg!(feature = "surreal-backend") {
            VectorBackendChoice::Surreal { required: false }
        } else {
            VectorBackendChoice::Sqlite
        }),
        Some("surreal") => {
            if cfg!(feature = "surreal-backend") {
                Ok(VectorBackendChoice::Surreal { required: true })
            } else {
                Err(LibreFangError::BootFailed(
                    "vector_backend = \"surreal\" requires a build with the `surreal-backend` feature"
                        .into(),
                ))
            }
        }
        Some("sqlite") | Some("") => Ok(VectorBackendChoice::Sqlite),
        Some("http") => config
            .memory
            .vector_store_url
            .clone()
            .map(VectorBackendChoice::Http)
            .ok_or_else(|| {
                LibreFangError::BootFailed(
                    "vector_backend = \"http\" requires vector_store_url".into(),
                )
            }),
        Some(other) => Err(LibreFangError::BootFailed(format!(
            "Unknown vector_backend: {other:?}"
        ))),
    }
}

/// The storage config the memory store is derived from.
///
/// A relative embedded path (the `StorageConfig` default is `.librefang/librefang.surreal`, which the setup wizard normally rewrites) would put the store under the daemon's working directory; it is anchored in `data_dir` instead, next to `librefang.db`.
#[cfg(feature = "surreal-backend")]
fn memory_storage_base(config: &KernelConfig) -> librefang_storage::config::StorageConfig {
    use librefang_storage::config::StorageBackendKind;
    let mut storage = config.storage.clone();
    if let StorageBackendKind::Embedded { path } = &storage.backend {
        if path.is_relative() {
            let file = path
                .file_name()
                .map(std::path::PathBuf::from)
                .unwrap_or_else(|| "librefang.surreal".into());
            storage.backend = StorageBackendKind::Embedded {
                path: config.data_dir.join(file),
            };
        }
    }
    storage
}

/// Adapts the runtime's embedding driver to the memory crate's `EmbeddingFn`.
#[cfg(feature = "surreal-backend")]
struct EmbeddingBridge(
    std::sync::Arc<dyn librefang_runtime::embedding::EmbeddingDriver + Send + Sync>,
);

#[cfg(feature = "surreal-backend")]
#[async_trait::async_trait]
impl librefang_memory::proactive::EmbeddingFn for EmbeddingBridge {
    async fn embed_one(&self, text: &str) -> librefang_types::error::LibreFangResult<Vec<f32>> {
        self.0
            .embed_one(text)
            .await
            .map_err(|e| LibreFangError::Internal(format!("Embedding failed: {e}")))
    }
}

/// Attach the SurrealDB vector index to `memory`, then copy the vectors SQLite already holds into it in the background.
///
/// When `required` is false every obstacle is logged and the substrate keeps its SQLite vectors; when it is true the obstacle fails boot.
#[cfg(feature = "surreal-backend")]
pub(super) fn attach_surreal(
    config: &KernelConfig,
    memory: &std::sync::Arc<librefang_memory::MemorySubstrate>,
    embedding_driver: Option<
        &std::sync::Arc<dyn librefang_runtime::embedding::EmbeddingDriver + Send + Sync>,
    >,
    required: bool,
) -> Result<(), LibreFangError> {
    use std::sync::Arc;
    use tracing::{info, warn};

    let skip = |reason: String| -> Result<(), LibreFangError> {
        if required {
            Err(LibreFangError::BootFailed(format!(
                "vector_backend = \"surreal\": {reason}"
            )))
        } else {
            info!("Vector store backend: sqlite ({reason})");
            Ok(())
        }
    };

    let Some(driver) = embedding_driver else {
        return skip(
            "no embedding driver is configured, so there are no vectors to index (set [memory] embedding_provider, or leave fts_only unset)"
                .into(),
        );
    };
    let dimensions = driver.dimensions();
    let handle = match tokio::runtime::Handle::try_current() {
        Ok(h) if h.runtime_flavor() == tokio::runtime::RuntimeFlavor::MultiThread => h,
        _ => {
            return skip(
                "opening the SurrealDB memory store needs a multi-threaded Tokio runtime".into(),
            )
        }
    };

    let storage = memory_storage_base(config);
    let embedding: Arc<dyn librefang_memory::proactive::EmbeddingFn> =
        Arc::new(EmbeddingBridge(Arc::clone(driver)));
    let opened = tokio::task::block_in_place(|| {
        handle.block_on(librefang_memory::SurrealSemanticBackend::open_with_storage(
            &storage, embedding, dimensions,
        ))
    });
    let backend = match opened {
        Ok(b) => b,
        Err(e) if required => {
            return Err(LibreFangError::BootFailed(format!(
                "vector_backend = \"surreal\": {e}"
            )))
        }
        Err(e) => {
            warn!(error = %e, "Vector store backend: sqlite (the SurrealDB memory store could not be opened)");
            return Ok(());
        }
    };
    memory.set_vector_store(Arc::new(backend));
    info!(dimensions, "Vector store backend: surreal");

    // A store that already holds vectors would otherwise drop them all out of vector recall until each one is rewritten.
    let substrate = Arc::clone(memory);
    handle.spawn(async move {
        match substrate.sync_vector_store(dimensions).await {
            Ok(0) => {}
            Ok(copied) => info!(copied, "Copied existing memory vectors into the SurrealDB index"),
            Err(e) => warn!(
                error = %e,
                "Copying existing memory vectors into the SurrealDB index failed; memories written before the switch stay out of vector recall until the next boot retries"
            ),
        }
    });
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn with_backend(value: Option<&str>) -> KernelConfig {
        let mut config = KernelConfig::default();
        config.memory.vector_backend = value.map(str::to_string);
        config
    }

    #[test]
    fn resolves_every_documented_value() {
        let default = if cfg!(feature = "surreal-backend") {
            VectorBackendChoice::Surreal { required: false }
        } else {
            VectorBackendChoice::Sqlite
        };
        assert_eq!(resolve(&with_backend(None)).unwrap(), default);
        assert_eq!(resolve(&with_backend(Some("auto"))).unwrap(), default);
        assert_eq!(
            resolve(&with_backend(Some("sqlite"))).unwrap(),
            VectorBackendChoice::Sqlite
        );
        assert_eq!(
            resolve(&with_backend(Some(""))).unwrap(),
            VectorBackendChoice::Sqlite
        );
        assert_eq!(
            resolve(&with_backend(Some("surreal"))).is_ok(),
            cfg!(feature = "surreal-backend")
        );
        assert!(
            resolve(&with_backend(Some("http"))).is_err(),
            "http needs a URL"
        );
        let mut http = with_backend(Some("http"));
        http.memory.vector_store_url = Some("http://127.0.0.1:1".into());
        assert_eq!(
            resolve(&http).unwrap(),
            VectorBackendChoice::Http("http://127.0.0.1:1".into())
        );
        let err = resolve(&with_backend(Some("qdrant")))
            .unwrap_err()
            .to_string();
        assert!(err.contains("Unknown vector_backend"), "{err}");
    }

    #[cfg(feature = "surreal-backend")]
    #[test]
    fn relative_embedded_storage_is_anchored_in_data_dir() {
        use librefang_storage::config::{StorageBackendKind, StorageConfig};
        let mut config = KernelConfig {
            data_dir: std::path::PathBuf::from("/srv/bossfang/data"),
            storage: StorageConfig::default(),
            ..KernelConfig::default()
        };
        let StorageBackendKind::Embedded { path } = memory_storage_base(&config).backend else {
            panic!("embedded");
        };
        assert_eq!(
            path,
            std::path::Path::new("/srv/bossfang/data/librefang.surreal")
        );

        config.storage = StorageConfig::embedded_default("/var/lib/bossfang");
        let StorageBackendKind::Embedded { path } = memory_storage_base(&config).backend else {
            panic!("embedded");
        };
        assert_eq!(
            path,
            std::path::Path::new("/var/lib/bossfang/librefang.surreal")
        );
    }
}
