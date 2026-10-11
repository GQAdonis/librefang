//! Kernel boot tests for `[memory] vector_backend`.
//!
//! Each test boots a real kernel and asserts the backend the substrate actually holds (`semantic_backend_name()` reads the attached `VectorStore`), then drives a remember/recall through it.
//! The SurrealDB tests use the embedded engine in a temp dir; the remote variant runs over `ws://` and `http://` when `BOSSFANG_TEST_SURREAL_URL` is set and prints an explicit SKIP line otherwise (same variables as `librefang-memory/tests/surreal_session_roundtrip_test.rs`).
//!
//! The embedding driver is Ollama's: constructing it touches no network, and the tests pass their own vectors, so no model is ever called.

use librefang_kernel::{KernelApi, LibreFangKernel};
use librefang_types::agent::AgentId;
use librefang_types::config::{DefaultModelConfig, KernelConfig, MemoryConfig};
use librefang_types::memory::{MemoryFilter, MemorySource};
use std::collections::HashMap;

const DIMS: usize = 4;

fn base_config() -> (tempfile::TempDir, KernelConfig) {
    let tmp = tempfile::tempdir().expect("tempdir");
    let data_dir = tmp.path().join("data");
    let config = KernelConfig {
        home_dir: tmp.path().to_path_buf(),
        data_dir: data_dir.clone(),
        storage: librefang_storage::config::StorageConfig::embedded_default(&data_dir),
        default_model: DefaultModelConfig {
            provider: "openai".to_string(),
            model: "gpt-4o-mini".to_string(),
            api_key_env: "OPENAI_API_KEY".to_string(),
            base_url: None,
            message_timeout_secs: 30,
            extra_params: std::collections::BTreeMap::new(),
            cli_profile_dirs: Vec::new(),
        },
        memory: MemoryConfig {
            embedding_provider: Some("ollama".to_string()),
            embedding_model: "nomic-embed-text".to_string(),
            embedding_dimensions: Some(DIMS),
            ..Default::default()
        },
        ..KernelConfig::default()
    };
    (tmp, config)
}

fn with_backend(mut config: KernelConfig, value: Option<&str>) -> KernelConfig {
    config.memory.vector_backend = value.map(str::to_string);
    config
}

fn unit(i: usize) -> Vec<f32> {
    let mut v = vec![0.0; DIMS];
    v[i] = 1.0;
    v
}

/// Remember two vectors through the kernel's substrate and recall the nearer one.
fn remember_and_recall(kernel: &LibreFangKernel) {
    let memory = kernel.memory_substrate();
    let agent = AgentId::new();
    let near = memory
        .remember_with_embedding(
            agent,
            "near",
            MemorySource::Conversation,
            "episodic",
            HashMap::new(),
            Some(&unit(0)),
            None,
        )
        .expect("remember near");
    memory
        .remember_with_embedding(
            agent,
            "far",
            MemorySource::Conversation,
            "episodic",
            HashMap::new(),
            Some(&unit(1)),
            None,
        )
        .expect("remember far");
    let recalled = memory
        .recall_with_embedding("", 1, Some(MemoryFilter::agent(agent)), Some(&unit(0)))
        .expect("recall");
    assert_eq!(recalled.first().map(|f| f.id), Some(near), "{recalled:?}");
}

#[cfg(not(feature = "surreal-backend"))]
#[test]
fn vector_backend_surreal_requires_feature() {
    let (_tmp, cfg) = base_config();
    let err = LibreFangKernel::boot_with_config(with_backend(cfg, Some("surreal")))
        .err()
        .expect("boot must fail without surreal-backend");
    let err = format!("{err:?}");
    assert!(err.contains("surreal-backend"), "{err}");
}

#[cfg(feature = "surreal-backend")]
#[tokio::test(flavor = "multi_thread")]
async fn vector_backend_surreal_boot_selects_surreal_backend() {
    let (tmp, cfg) = base_config();
    let kernel = LibreFangKernel::boot_with_config(with_backend(cfg, Some("surreal")))
        .expect("boot with vector_backend = \"surreal\"");
    assert_eq!(kernel.semantic_backend_name(), "surreal");
    assert!(
        tmp.path().join("data/librefang-memory.surreal").exists(),
        "the SurrealDB memory store is opened in data_dir"
    );
    remember_and_recall(&kernel);
}

#[cfg(feature = "surreal-backend")]
#[tokio::test(flavor = "multi_thread")]
async fn vector_backend_auto_selects_surreal_when_an_embedding_driver_exists() {
    let (_tmp, cfg) = base_config();
    let kernel = LibreFangKernel::boot_with_config(with_backend(cfg, None))
        .expect("boot with vector_backend unset");
    assert_eq!(kernel.semantic_backend_name(), "surreal");
    remember_and_recall(&kernel);
}

/// With no embedding driver there are no vectors to index; the implicit default keeps SQLite, and an explicit `"surreal"` refuses to boot.
#[cfg(feature = "surreal-backend")]
#[tokio::test(flavor = "multi_thread")]
async fn vector_backend_without_embedding_driver() {
    let (_tmp, mut cfg) = base_config();
    cfg.memory.fts_only = Some(true);
    let kernel = LibreFangKernel::boot_with_config(with_backend(cfg, Some("auto")))
        .expect("boot fts-only with vector_backend = \"auto\"");
    assert_eq!(kernel.semantic_backend_name(), "sqlite");
    drop(kernel);

    let (_tmp2, mut cfg) = base_config();
    cfg.memory.fts_only = Some(true);
    let err = LibreFangKernel::boot_with_config(with_backend(cfg, Some("surreal")))
        .err()
        .expect("explicit surreal without an embedding driver must fail boot");
    let err = format!("{err:?}");
    assert!(err.contains("embedding driver"), "{err}");
}

#[cfg(feature = "surreal-backend")]
#[tokio::test(flavor = "multi_thread")]
async fn vector_backend_explicit_sqlite_bypasses_surreal() {
    let (tmp, cfg) = base_config();
    let kernel = LibreFangKernel::boot_with_config(with_backend(cfg, Some("sqlite")))
        .expect("boot with vector_backend = \"sqlite\"");
    assert_eq!(kernel.semantic_backend_name(), "sqlite");
    assert!(!tmp.path().join("data/librefang-memory.surreal").exists());
    remember_and_recall(&kernel);
}

#[cfg(feature = "surreal-backend")]
#[tokio::test(flavor = "multi_thread")]
async fn vector_backend_unknown_value_fails_boot() {
    let (_tmp, cfg) = base_config();
    let err = LibreFangKernel::boot_with_config(with_backend(cfg, Some("qdrant")))
        .err()
        .expect("unknown backend must fail boot");
    assert!(format!("{err:?}").contains("Unknown vector_backend"));
}

/// The same boot against a live SurrealDB server, over both transports.
#[cfg(feature = "surreal-backend")]
#[tokio::test(flavor = "multi_thread")]
async fn vector_backend_surreal_boot_remote() {
    use librefang_storage::config::{RemoteSurrealConfig, StorageBackendKind};
    let Ok(url) = std::env::var("BOSSFANG_TEST_SURREAL_URL") else {
        eprintln!("SKIP remote surreal (kernel boot): BOSSFANG_TEST_SURREAL_URL unset");
        return;
    };
    let username = std::env::var("BOSSFANG_TEST_SURREAL_USER").unwrap_or_else(|_| "root".into());
    let password_env = std::env::var("BOSSFANG_TEST_SURREAL_PASS_ENV")
        .unwrap_or_else(|_| "BOSSFANG_TEST_SURREAL_PASS".into());
    let rest = url
        .split_once("://")
        .map(|(_, r)| r.to_string())
        .unwrap_or_else(|| url.clone());
    for url in [format!("ws://{rest}"), format!("http://{rest}")] {
        let namespace = format!("bossfang_boot_{}", uuid::Uuid::new_v4().simple());
        eprintln!("remote surreal (kernel boot): {url} ns={namespace}");
        let (tmp, mut cfg) = base_config();
        cfg.storage.backend = StorageBackendKind::Remote(RemoteSurrealConfig {
            url: url.clone(),
            namespace: namespace.clone(),
            database: "main".into(),
            username: username.clone(),
            password_env: password_env.clone(),
            tls_skip_verify: false,
        });
        let kernel = LibreFangKernel::boot_with_config(with_backend(cfg, Some("surreal")))
            .unwrap_or_else(|e| panic!("boot against {url}: {e:?}"));
        assert_eq!(kernel.semantic_backend_name(), "surreal");
        assert!(!tmp.path().join("data/librefang-memory.surreal").exists());
        remember_and_recall(&kernel);
        drop(kernel);

        let db = surrealdb::engine::any::connect(url.as_str())
            .await
            .expect("connect");
        db.signin(surrealdb::opt::auth::Root {
            username: username.clone(),
            password: std::env::var(&password_env).expect("password env"),
        })
        .await
        .expect("signin");
        db.query(format!("REMOVE NAMESPACE IF EXISTS {namespace}"))
            .await
            .expect("drop test namespace");
    }
}
