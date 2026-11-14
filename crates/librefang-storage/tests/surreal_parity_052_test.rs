//! Migration v52 (`052_upstream_sqlite_column_parity.surql`) against a real SurrealDB.
//!
//! The database is first brought to v51, seeded with a `prompt_experiments` row in the shape the pre-v52 backend wrote, then upgraded.
//! The test proves the upgrade applies cleanly, is a no-op when re-run (both through the runner and by replaying the script), converts the placeholder row so it can still be updated, and that every column and index the audit added is enforced.
//! The embedded variant runs on `kv-surrealkv` in a temp dir; the remote variant runs the same body over `ws://` and `http://` when `BOSSFANG_TEST_SURREAL_URL` is set, and prints an explicit SKIP line when it is not.

#![cfg(feature = "surreal-backend")]

use librefang_storage::config::{RemoteSurrealConfig, StorageBackendKind, StorageConfig};
use librefang_storage::migrations::{apply_pending, OPERATIONAL_MIGRATIONS};
use librefang_storage::{SurrealConnectionPool, SurrealSession};
use serde_json::{json, Value};

const V52: u32 = 52;

async fn rows(session: &SurrealSession, sql: &str) -> Vec<Value> {
    session
        .client()
        .query(sql)
        .await
        .unwrap_or_else(|e| panic!("{sql}: {e}"))
        .take(0)
        .unwrap_or_else(|e| panic!("{sql}: {e}"))
}

/// Run `sql` and report whether every statement in it succeeded.
async fn accepts(session: &SurrealSession, sql: &str) -> bool {
    match session.client().query(sql).await {
        Ok(res) => res.check().is_ok(),
        Err(_) => false,
    }
}

async fn exercise(session: &SurrealSession) {
    let db = session.client();
    let pre_52: Vec<_> = OPERATIONAL_MIGRATIONS
        .iter()
        .filter(|m| m.version < V52)
        .cloned()
        .collect();
    apply_pending(db, &pre_52).await.expect("migrate to v51");

    // The pre-v52 `SurrealPromptStore::create_experiment` wrote `{}` placeholders into both JSON columns.
    assert!(
        accepts(
            session,
            "CREATE prompt_experiments:legacy CONTENT { name: 'exp', agent_id: 'a', status: 'running', \
             traffic_split: {}, success_criteria: {}, created_at: '2026-01-01' }"
        )
        .await,
        "a v51 database accepts the placeholder row"
    );
    // Populated tables are what SurrealDB 4 guards: a new non-optional field or a changed ASSERT needs MIGRATE EXISTING ROWS there.
    for seed in [
        "CREATE task_queue:legacy CONTENT { agent_id: 'a', task_type: 'x', status: 'pending', priority: 0, \
         created_at: '2026-01-01' }",
        "CREATE group_roster:legacy CONTENT { channel_type: 'tg', chat_id: 'old', user_id: 'u', display_name: 'U' }",
        "CREATE workflow_runs:legacy CONTENT { workflow_id: 'w', state: 'failed', started_at: '2026-01-01', \
         created_at: '2026-01-01' }",
    ] {
        assert!(accepts(session, seed).await, "v51 seed: {seed}");
    }

    let applied = apply_pending(db, OPERATIONAL_MIGRATIONS)
        .await
        .expect("apply v52");
    assert_eq!(applied, vec![V52]);
    let again = apply_pending(db, OPERATIONAL_MIGRATIONS)
        .await
        .expect("re-run");
    assert!(again.is_empty(), "re-run applied {again:?}");
    // Replaying the script itself is also harmless: every DEFINE is IF NOT EXISTS / OVERWRITE and the UPDATEs converge.
    let v52 = OPERATIONAL_MIGRATIONS
        .iter()
        .find(|m| m.version == V52)
        .expect("v52 registered");
    db.query(v52.sql)
        .await
        .expect("replay v52")
        .check()
        .expect("replayed v52 statements succeed");

    // Rows written before v52 read back with SQLite's backfill values and still accept writes.
    let task = rows(session, "SELECT * FROM task_queue:legacy").await;
    assert_eq!(task[0]["retry_count"], 0, "{task:?}");
    let roster = rows(session, "SELECT * FROM group_roster:legacy").await;
    assert_eq!(roster[0]["source"], "observed", "{roster:?}");
    for update in [
        "UPDATE task_queue:legacy SET status = 'in_progress', claimed_at = '2026-01-02T00:00:00Z'",
        "UPDATE group_roster:legacy SET display_name = 'V'",
        "UPDATE workflow_runs:legacy SET state = 'cancelled'",
    ] {
        assert!(accepts(session, update).await, "post-v52 write: {update}");
    }

    // The placeholder row was cleared, so a later update re-validates against the new type.
    let legacy = rows(session, "SELECT * FROM prompt_experiments:legacy").await;
    assert!(legacy[0].get("traffic_split").is_none(), "{legacy:?}");
    assert!(legacy[0].get("success_criteria").is_none(), "{legacy:?}");
    assert!(
        accepts(
            session,
            "UPDATE prompt_experiments:legacy MERGE { status: 'paused' }"
        )
        .await,
        "a converted row still updates"
    );
    assert!(
        accepts(
            session,
            "UPDATE prompt_experiments:legacy SET traffic_split = [70, 30]"
        )
        .await,
        "a real split is accepted"
    );
    assert!(
        !accepts(
            session,
            "UPDATE prompt_experiments:legacy SET traffic_split = { a: 1 }"
        )
        .await,
        "an object split is rejected"
    );

    // workflow_runs.state accepts BossFang's v66 'cancelled' and still rejects unknown states.
    let run = "CREATE workflow_runs CONTENT { id: 'r1', workflow_id: 'w', state: 'cancelled', \
               started_at: '2026-01-01', created_at: '2026-01-01', owner_agent_id: 'owner-1' }";
    assert!(accepts(session, run).await, "cancelled is a valid state");
    let owner = rows(session, "SELECT owner_agent_id FROM workflow_runs:r1").await;
    assert_eq!(owner[0]["owner_agent_id"], "owner-1");
    assert!(
        !accepts(
            session,
            "CREATE workflow_runs CONTENT { id: 'r2', workflow_id: 'w', state: 'bogus', \
             started_at: '2026-01-01', created_at: '2026-01-01' }"
        )
        .await,
        "an unknown state is rejected"
    );

    // group_roster.source defaults like SQLite's DEFAULT 'observed'.
    assert!(
        accepts(
            session,
            "CREATE group_roster CONTENT { channel_type: 'tg', chat_id: 'c', user_id: 'u', display_name: 'U' }"
        )
        .await
    );
    let roster = rows(session, "SELECT source FROM group_roster").await;
    assert_eq!(roster[0]["source"], "observed");

    // task_queue carries the v2 / v20 / v21 columns; retry_count defaults to 0.
    assert!(
        accepts(
            session,
            "CREATE task_queue:t1 CONTENT { agent_id: 'a', task_type: 'x', status: 'in_progress', priority: 0, \
             created_at: '2026-01-01', title: 'T', description: 'D', created_by: 'boss', result: 'R', \
             claimed_at: '2026-01-01T00:00:00Z' }"
        )
        .await
    );
    let task = rows(session, "SELECT * FROM task_queue:t1").await;
    assert_eq!(task[0]["retry_count"], 0);
    assert_eq!(task[0]["claimed_at"], "2026-01-01T00:00:00Z");
    assert_eq!(task[0]["result"], "R");

    // The remaining new fields are kept by their SCHEMAFULL tables instead of being dropped.
    for (create, select, field, expected) in [
        (
            "CREATE usage_events:u1 CONTENT { agent_id: 'w', timestamp: 't', provider: 'p', model: 'm', input_tokens: 0, \
             output_tokens: 0, cost_usd: 0.0, tool_calls: 0, latency_ms: 0, billed_agent_id: 'parent' }",
            "SELECT * FROM usage_events:u1",
            "billed_agent_id",
            json!("parent"),
        ),
        (
            "CREATE sessions:s1 CONTENT { agent_id: 'a', context_window_tokens: 0, created_at: 't', updated_at: 't', \
             peer_id: 'tg:chat' }",
            "SELECT * FROM sessions:s1",
            "peer_id",
            json!("tg:chat"),
        ),
        (
            "CREATE hook_traces:h1 CONTENT { trace_id: 't', correlation_id: 'c', plugin: 'p', hook: 'h', started_at: 's', \
             started_at_ms: 0, elapsed_ms: 1, success: true, annotations: '{\"k\":1}' }",
            "SELECT * FROM hook_traces:h1",
            "annotations",
            json!("{\"k\":1}"),
        ),
    ] {
        assert!(accepts(session, create).await, "{create}");
        let row = rows(session, select).await;
        assert_eq!(row[0][field], expected, "{field}: {row:?}");
    }

    // The indexes the SQLite read paths rely on exist.
    for (table, index) in [
        ("sessions", "idx_sessions_peer"),
        ("task_queue", "idx_task_status_claimed_at"),
        ("usage_events", "usage_provider_time_idx"),
        ("usage_events", "usage_channel_time_idx"),
        ("audit_entries", "idx_audit_timestamp"),
        ("audit_entries", "idx_audit_action"),
        ("audit_entries", "idx_audit_channel"),
    ] {
        let info: Option<Value> = db
            .query(format!("INFO FOR TABLE {table}"))
            .await
            .expect("info")
            .take(0)
            .expect("info row");
        let info = info.expect("table info");
        assert!(
            info["indexes"].get(index).is_some(),
            "{table} is missing {index}: {info}"
        );
    }
}

#[tokio::test(flavor = "multi_thread")]
async fn migration_52_upgrades_a_v51_database_embedded() {
    let dir = tempfile::tempdir().expect("tempdir");
    let cfg = StorageConfig {
        backend: StorageBackendKind::embedded(dir.path().join("v52.surreal")),
        namespace: "librefang".into(),
        database: "main".into(),
        legacy_sqlite_path: None,
    };
    let session = SurrealConnectionPool::new()
        .open(&cfg)
        .await
        .expect("open embedded");
    exercise(&session).await;
}

fn remote_urls(url: &str) -> Vec<String> {
    for (ws, http) in [("ws://", "http://"), ("wss://", "https://")] {
        if let Some(rest) = url.strip_prefix(ws).or_else(|| url.strip_prefix(http)) {
            return vec![format!("{ws}{rest}"), format!("{http}{rest}")];
        }
    }
    vec![url.to_string()]
}

#[tokio::test(flavor = "multi_thread")]
async fn migration_52_upgrades_a_v51_database_remote() {
    let Ok(url) = std::env::var("BOSSFANG_TEST_SURREAL_URL") else {
        eprintln!("SKIP remote surreal: BOSSFANG_TEST_SURREAL_URL unset");
        return;
    };
    let username = std::env::var("BOSSFANG_TEST_SURREAL_USER").unwrap_or_else(|_| "root".into());
    let password_env = std::env::var("BOSSFANG_TEST_SURREAL_PASS_ENV")
        .unwrap_or_else(|_| "BOSSFANG_TEST_SURREAL_PASS".into());
    for url in remote_urls(&url) {
        let database = format!("v52_{}", uuid::Uuid::new_v4().simple());
        eprintln!("remote surreal: migration v52 against {url} db={database}");
        let session = SurrealConnectionPool::new()
            .open_remote(&RemoteSurrealConfig {
                url: url.clone(),
                namespace: "bossfang_test".into(),
                database: database.clone(),
                username: username.clone(),
                password_env: password_env.clone(),
                tls_skip_verify: false,
            })
            .await
            .unwrap_or_else(|e| panic!("open remote {url}: {e}"));
        exercise(&session).await;
        session
            .client()
            .query(format!("REMOVE DATABASE IF EXISTS {database}"))
            .await
            .expect("drop test database");
    }
}
