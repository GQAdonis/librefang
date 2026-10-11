//! Copy the legacy SQLite tables into a SurrealDB instance.
//!
//! Implementation notes
//! --------------------
//!
//! - We never delete from SurrealDB; the migrator is purely additive
//!   so a partial run can be retried without losing data already
//!   written by the daemon.
//! - Every write goes through `upsert((table, record_id))` so reruns
//!   converge on the same row instead of duplicating entries.
//!   Record ids match the ones the runtime backends use, so the daemon reads imported rows as its own.
//! - The async SurrealDB calls are bridged onto the current tokio
//!   runtime via [`tokio::task::block_in_place`], same pattern the
//!   Surreal-backed storage backends use. Callers must therefore drive
//!   the migrator from a multi-thread tokio runtime.
//! - Field shapes mirror what the runtime backends write (`librefang-runtime::backends::surreal_audit` / `surreal_trace`, `librefang-kernel::backends::surreal_approval`, and the `librefang-memory` Surreal backends), so a daemon picking up the migrated database reads the rows as if it had written them.
//! - SQLite `NULL` becomes an absent key, never JSON `null`: the target columns are `option<T>`, which accept NONE but reject NULL.
//! - A row whose BLOB cannot be decoded is skipped and listed in the receipt's `errors`, never imported with an empty payload.
//! - SQLite columns added by later schema versions are read when present, so older databases import too.

use std::collections::BTreeMap;
use std::path::Path;

use chrono::{DateTime, Utc};
use rusqlite::{Connection, OpenFlags, Row};
use serde_json::{Map, Value};
use surrealdb::{engine::any::Any, Surreal};
use tokio::runtime::Handle;
use tracing::{debug, warn};

use crate::error::{StorageError, StorageResult};
use crate::migrate::{
    LegacyBlobDecoder, MigrationKind, MigrationOptions, MigrationReceipt, IMPORTED_TABLES,
};
use crate::pool::SurrealSession;

/// At most this many skipped-row reasons are spelled out per table in the receipt.
const MAX_REPORTED_SKIPS: usize = 5;

pub(super) fn run(
    sqlite_path: &Path,
    session: &SurrealSession,
    opts: &MigrationOptions,
    decoder: &dyn LegacyBlobDecoder,
) -> StorageResult<MigrationReceipt> {
    if !sqlite_path.exists() {
        return Err(StorageError::Backend(format!(
            "legacy sqlite database not found at {}",
            sqlite_path.display()
        )));
    }

    let conn = Connection::open_with_flags(
        sqlite_path,
        OpenFlags::SQLITE_OPEN_READ_ONLY | OpenFlags::SQLITE_OPEN_URI,
    )
    .map_err(|e| StorageError::Backend(format!("open sqlite {}: {e}", sqlite_path.display())))?;

    let started_at = Utc::now();
    let db = session.client().clone();
    let mut copied = BTreeMap::new();
    let mut errors = BTreeMap::new();

    for table in IMPORTED_TABLES {
        let mut ctx = Ctx {
            conn: &conn,
            db: &db,
            dry_run: opts.dry_run,
            decoder,
            skipped: Vec::new(),
        };
        let result = match *table {
            "audit_entries" => copy_audit_entries(&mut ctx),
            "hook_traces" => copy_hook_traces(&mut ctx),
            "circuit_breaker_states" => copy_circuit_states(&mut ctx),
            "totp_lockout" => copy_totp_lockout(&mut ctx),
            "agents" => copy_agents(&mut ctx),
            "sessions" => copy_sessions(&mut ctx),
            "canonical_sessions" => copy_canonical_sessions(&mut ctx),
            "kv_store" => copy_kv_store(&mut ctx),
            "task_queue" => copy_task_queue(&mut ctx),
            "usage_events" => copy_usage_events(&mut ctx),
            "paired_devices" => copy_paired_devices(&mut ctx),
            "prompt_versions" => copy_prompt_versions(&mut ctx),
            "prompt_experiments" => copy_prompt_experiments(&mut ctx),
            other => {
                warn!(table = other, "no migrator registered; skipping");
                Ok(0)
            }
        };
        match result {
            Ok(n) => {
                debug!(table, rows = n, dry_run = opts.dry_run, "migrated table");
                copied.insert((*table).to_string(), n);
                if !ctx.skipped.is_empty() {
                    warn!(table, skipped = ctx.skipped.len(), "rows skipped");
                    errors.insert((*table).to_string(), ctx.skip_summary());
                }
            }
            Err(e) => {
                warn!(table, error = %e, "migration of table failed");
                copied.insert((*table).to_string(), 0);
                errors.insert((*table).to_string(), e.to_string());
            }
        }
    }

    let finished_at = Utc::now();
    let receipt = MigrationReceipt {
        kind: MigrationKind::SqliteToSurreal,
        started_at,
        finished_at,
        source: format!("sqlite:{}", sqlite_path.display()),
        target: format!(
            "surreal:ns={}/db={}",
            session.namespace(),
            session.database()
        ),
        dry_run: opts.dry_run,
        copied,
        errors,
    };

    if !opts.dry_run {
        if let Some(dir) = opts.receipt_dir.as_ref() {
            super::write_receipt(dir, &receipt)?;
        }
    }

    Ok(receipt)
}

fn block_on<F, T>(fut: F) -> T
where
    F: std::future::Future<Output = T>,
{
    tokio::task::block_in_place(|| Handle::current().block_on(fut))
}

/// Per-table copy state.
struct Ctx<'a> {
    conn: &'a Connection,
    db: &'a Surreal<Any>,
    dry_run: bool,
    decoder: &'a dyn LegacyBlobDecoder,
    /// One entry per row that was left out, with the reason.
    skipped: Vec<String>,
}

impl Ctx<'_> {
    /// Upsert `body` as `table:id`, unless this is a dry run.
    fn upsert(&self, table: &str, id: &str, body: Map<String, Value>) -> StorageResult<()> {
        if self.dry_run {
            return Ok(());
        }
        let body = Value::Object(without_nulls(body));
        block_on(async {
            let _: Option<Value> = self
                .db
                .upsert((table, id))
                .content(body)
                .await
                .map_err(|e| StorageError::Backend(format!("upsert {table}:{id}: {e}")))?;
            Ok(())
        })
    }

    fn skip(&mut self, row: &str, reason: impl std::fmt::Display) {
        warn!(row, %reason, "skipping legacy row");
        self.skipped.push(format!("{row}: {reason}"));
    }

    fn skip_summary(&self) -> String {
        let shown = self
            .skipped
            .iter()
            .take(MAX_REPORTED_SKIPS)
            .cloned()
            .collect::<Vec<_>>()
            .join("; ");
        format!("{} row(s) skipped: {shown}", self.skipped.len())
    }

    /// `false` when this legacy database predates `table`.
    fn has_table(&self, table: &str) -> StorageResult<bool> {
        table_exists(self.conn, table)
    }
}

/// Drop top-level keys whose value is JSON `null`, so an unset optional column is stored as NONE.
fn without_nulls(body: Map<String, Value>) -> Map<String, Value> {
    body.into_iter().filter(|(_, v)| !v.is_null()).collect()
}

/// Read an optional column that may not exist in older schemas: a missing column and SQL `NULL` both give `None`.
fn opt<T: rusqlite::types::FromSql>(row: &Row<'_>, column: &str) -> Option<T> {
    row.get::<_, Option<T>>(column).ok().flatten()
}

/// `Some(json)` for `Some`, `Value::Null` otherwise (stripped before the write).
fn json_opt<T: Into<Value>>(v: Option<T>) -> Value {
    v.map_or(Value::Null, Into::into)
}

// ── audit_entries ─────────────────────────────────────────────────────

fn copy_audit_entries(ctx: &mut Ctx<'_>) -> StorageResult<u64> {
    if !ctx.has_table("audit_entries")? {
        return Ok(0);
    }
    let mut stmt = ctx
        .conn
        .prepare("SELECT * FROM audit_entries ORDER BY seq ASC")
        .map_err(map_sql)?;
    let mut rows = stmt.query([]).map_err(map_sql)?;
    let mut count = 0u64;
    while let Some(row) = rows.next().map_err(map_sql)? {
        let seq: i64 = row.get("seq").map_err(map_sql)?;
        let mut body = Map::new();
        body.insert("seq".into(), seq.into());
        for col in [
            "timestamp",
            "agent_id",
            "action",
            "detail",
            "outcome",
            "prev_hash",
            "hash",
        ] {
            body.insert(
                col.into(),
                row.get::<_, String>(col).map_err(map_sql)?.into(),
            );
        }
        for col in ["user_id", "channel"] {
            body.insert(col.into(), json_opt(opt::<String>(row, col)));
        }
        ctx.upsert("audit_entries", &format!("seq{seq}"), body)?;
        count += 1;
    }
    Ok(count)
}

// ── hook_traces ───────────────────────────────────────────────────────

fn copy_hook_traces(ctx: &mut Ctx<'_>) -> StorageResult<u64> {
    if !ctx.has_table("hook_traces")? {
        return Ok(0);
    }
    let mut stmt = ctx
        .conn
        .prepare(
            "SELECT id, trace_id, correlation_id, plugin, hook, started_at, elapsed_ms, \
                    success, error, input_preview, output_preview \
             FROM hook_traces ORDER BY id ASC",
        )
        .map_err(map_sql)?;
    let rows = stmt
        .query_map([], |row| {
            let success: i64 = row.get(7)?;
            Ok(SqliteHookRow {
                id: row.get(0)?,
                trace_id: row.get(1)?,
                correlation_id: row.get(2)?,
                plugin: row.get(3)?,
                hook: row.get(4)?,
                started_at: row.get(5)?,
                elapsed_ms: row.get::<_, i64>(6)?,
                success: success != 0,
                error: row.get(8)?,
                input_preview: row.get(9)?,
                output_preview: row.get(10)?,
            })
        })
        .map_err(map_sql)?
        .collect::<Result<Vec<_>, _>>()
        .map_err(map_sql)?;

    let mut count = 0u64;
    for row in rows {
        let started_at_ms = parse_started_at_ms(&row.started_at);
        let mut body = Map::new();
        body.insert("trace_id".into(), row.trace_id.clone().into());
        body.insert("correlation_id".into(), row.correlation_id.into());
        body.insert("plugin".into(), row.plugin.into());
        body.insert("hook".into(), row.hook.into());
        body.insert("started_at".into(), row.started_at.into());
        body.insert("started_at_ms".into(), started_at_ms.into());
        body.insert("elapsed_ms".into(), row.elapsed_ms.into());
        body.insert("success".into(), row.success.into());
        body.insert("error".into(), json_opt(row.error));
        body.insert("input_preview".into(), json_opt(row.input_preview));
        body.insert("output_preview".into(), json_opt(row.output_preview));
        let id = trace_record_id(&row.trace_id, started_at_ms, row.id);
        ctx.upsert("hook_traces", &id, body)?;
        count += 1;
    }
    Ok(count)
}

struct SqliteHookRow {
    id: i64,
    trace_id: String,
    correlation_id: String,
    plugin: String,
    hook: String,
    started_at: String,
    elapsed_ms: i64,
    success: bool,
    error: Option<String>,
    input_preview: Option<String>,
    output_preview: Option<String>,
}

fn trace_record_id(trace_id: &str, started_at_ms: i64, fallback_id: i64) -> String {
    let base = sanitise_id(trace_id);
    if base.is_empty() {
        format!("legacy_{fallback_id}_{started_at_ms}")
    } else {
        format!("{base}_{started_at_ms}")
    }
}

fn parse_started_at_ms(started_at: &str) -> i64 {
    DateTime::parse_from_rfc3339(started_at)
        .map(|dt| dt.with_timezone(&Utc).timestamp_millis())
        .unwrap_or_else(|_| Utc::now().timestamp_millis())
}

// ── circuit_breaker_states ────────────────────────────────────────────

fn copy_circuit_states(ctx: &mut Ctx<'_>) -> StorageResult<u64> {
    if !ctx.has_table("circuit_breaker_states")? {
        return Ok(0);
    }
    let mut stmt = ctx
        .conn
        .prepare("SELECT key, failures, opened_at FROM circuit_breaker_states")
        .map_err(map_sql)?;
    let rows = stmt
        .query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, i64>(1)?,
                row.get::<_, Option<String>>(2)?,
            ))
        })
        .map_err(map_sql)?
        .collect::<Result<Vec<_>, _>>()
        .map_err(map_sql)?;

    let mut count = 0u64;
    for (key, failures, opened_at) in rows {
        let mut body = Map::new();
        body.insert("key".into(), key.clone().into());
        body.insert("failures".into(), failures.into());
        body.insert("opened_at".into(), json_opt(opened_at));
        ctx.upsert("circuit_breaker_states", &sanitise_id(&key), body)?;
        count += 1;
    }
    Ok(count)
}

// ── totp_lockout ──────────────────────────────────────────────────────

fn copy_totp_lockout(ctx: &mut Ctx<'_>) -> StorageResult<u64> {
    if !ctx.has_table("totp_lockout")? {
        return Ok(0);
    }
    let mut stmt = ctx
        .conn
        .prepare("SELECT sender_id, failures, locked_at FROM totp_lockout")
        .map_err(map_sql)?;
    let rows = stmt
        .query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, i64>(1)?,
                row.get::<_, Option<i64>>(2)?,
            ))
        })
        .map_err(map_sql)?
        .collect::<Result<Vec<_>, _>>()
        .map_err(map_sql)?;

    let mut count = 0u64;
    for (sender_id, failures, locked_at) in rows {
        let mut body = Map::new();
        body.insert("sender_id".into(), sender_id.clone().into());
        body.insert("failures".into(), failures.into());
        body.insert("locked_at".into(), json_opt(locked_at));
        ctx.upsert("totp_lockout", &sanitise_id(&sender_id), body)?;
        count += 1;
    }
    Ok(count)
}

// ── agents (registry) ─────────────────────────────────────────────────

fn copy_agents(ctx: &mut Ctx<'_>) -> StorageResult<u64> {
    if !ctx.has_table("agents")? {
        return Ok(0);
    }
    let mut stmt = ctx.conn.prepare("SELECT * FROM agents").map_err(map_sql)?;
    let mut rows = stmt.query([]).map_err(map_sql)?;
    let mut pending = Vec::new();
    while let Some(row) = rows.next().map_err(map_sql)? {
        pending.push(LegacyAgentRow {
            id: row.get("id").map_err(map_sql)?,
            name: row.get("name").map_err(map_sql)?,
            manifest: row.get("manifest").map_err(map_sql)?,
            state: row.get("state").map_err(map_sql)?,
            created_at: row.get("created_at").map_err(map_sql)?,
            updated_at: row.get("updated_at").map_err(map_sql)?,
            session_id: opt(row, "session_id").filter(|s: &String| !s.is_empty()),
            identity: opt(row, "identity"),
            source_toml_path: opt(row, "source_toml_path"),
            parent_id: opt(row, "parent_id"),
            parent_recorded: opt::<i64>(row, "parent_recorded").unwrap_or(0) != 0,
        });
    }
    drop(rows);

    let mut count = 0u64;
    for row in pending {
        let manifest = match ctx.decoder.agent_manifest(&row.manifest) {
            Ok(v) => v,
            Err(e) => {
                ctx.skip(&format!("agents:{}", row.id), format!("manifest: {e}"));
                continue;
            }
        };
        let entry = agent_entry(&row, manifest);
        // Same layout as `SurrealMemoryBackend::save_agent`: the full `AgentEntry` under `entry` plus denormalised lookup columns.
        let mut body = Map::new();
        body.insert("id".into(), row.id.clone().into());
        body.insert("name".into(), row.name.clone().into());
        body.insert(
            "updated_at_ms".into(),
            parse_started_at_ms(&row.updated_at).into(),
        );
        body.insert("entry".into(), entry);
        ctx.upsert("agents", &row.id, body)?;
        count += 1;
    }
    Ok(count)
}

struct LegacyAgentRow {
    id: String,
    name: String,
    manifest: Vec<u8>,
    state: String,
    created_at: String,
    updated_at: String,
    session_id: Option<String>,
    identity: Option<String>,
    source_toml_path: Option<String>,
    parent_id: Option<String>,
    parent_recorded: bool,
}

/// Rebuild an `AgentEntry` JSON document from a legacy row, the way `StructuredStore::load_agent` does.
///
/// Fields the SQLite row does not store take the values `load_agent` gives them: no children (they are derived from other rows' `parent_id`), a fresh session id when none was recorded, no tags.
fn agent_entry(row: &LegacyAgentRow, manifest: Value) -> Value {
    let state =
        serde_json::from_str::<Value>(&row.state).unwrap_or_else(|_| row.state.clone().into());
    let identity = row
        .identity
        .as_deref()
        .and_then(|s| serde_json::from_str::<Value>(s).ok())
        .unwrap_or_else(|| Value::Object(Map::new()));
    let is_hand = manifest
        .get("is_hand")
        .and_then(Value::as_bool)
        .unwrap_or(false);
    let session_id = row
        .session_id
        .clone()
        .unwrap_or_else(|| uuid::Uuid::new_v4().to_string());
    let mut entry = Map::new();
    entry.insert("id".into(), row.id.clone().into());
    entry.insert("name".into(), row.name.clone().into());
    entry.insert("manifest".into(), manifest);
    entry.insert("state".into(), state);
    entry.insert("created_at".into(), row.created_at.clone().into());
    entry.insert("last_active".into(), row.updated_at.clone().into());
    entry.insert("parent".into(), json_opt(row.parent_id.clone()));
    entry.insert("children".into(), Value::Array(Vec::new()));
    entry.insert("parent_unknown".into(), (!row.parent_recorded).into());
    entry.insert("session_id".into(), session_id.into());
    entry.insert(
        "source_toml_path".into(),
        json_opt(row.source_toml_path.clone()),
    );
    entry.insert("tags".into(), Value::Array(Vec::new()));
    entry.insert("is_hand".into(), is_hand.into());
    entry.insert("identity".into(), identity);
    Value::Object(entry)
}

// ── sessions ──────────────────────────────────────────────────────────

fn copy_sessions(ctx: &mut Ctx<'_>) -> StorageResult<u64> {
    if !ctx.has_table("sessions")? {
        return Ok(0);
    }
    let mut stmt = ctx
        .conn
        .prepare("SELECT * FROM sessions ORDER BY created_at ASC")
        .map_err(map_sql)?;
    let mut rows = stmt.query([]).map_err(map_sql)?;
    let mut pending = Vec::new();
    while let Some(row) = rows.next().map_err(map_sql)? {
        let id: String = row.get("id").map_err(map_sql)?;
        let blob: Vec<u8> = row.get("messages").map_err(map_sql)?;
        let mut body = Map::new();
        body.insert(
            "agent_id".into(),
            row.get::<_, String>("agent_id").map_err(map_sql)?.into(),
        );
        body.insert(
            "context_window_tokens".into(),
            opt::<i64>(row, "context_window_tokens").unwrap_or(0).into(),
        );
        body.insert(
            "created_at".into(),
            row.get::<_, String>("created_at").map_err(map_sql)?.into(),
        );
        body.insert(
            "updated_at".into(),
            row.get::<_, String>("updated_at").map_err(map_sql)?.into(),
        );
        for col in ["label", "model_override", "parent_session_id"] {
            body.insert(col.into(), json_opt(opt::<String>(row, col)));
        }
        for col in ["messages_generation", "last_repaired_generation"] {
            body.insert(col.into(), json_opt(opt::<i64>(row, col)));
        }
        pending.push((id, blob, body));
    }
    drop(rows);

    let mut count = 0u64;
    for (id, blob, mut body) in pending {
        let messages = match ctx.decoder.session_messages(&blob) {
            Ok(v) => v,
            Err(e) => {
                ctx.skip(&format!("sessions:{id}"), e);
                continue;
            }
        };
        let message_count = messages.as_array().map_or(0, Vec::len);
        body.insert("messages".into(), messages);
        body.insert("message_count".into(), message_count.into());
        ctx.upsert("sessions", &id, body)?;
        count += 1;
    }
    Ok(count)
}

// ── canonical_sessions ────────────────────────────────────────────────

fn copy_canonical_sessions(ctx: &mut Ctx<'_>) -> StorageResult<u64> {
    if !ctx.has_table("canonical_sessions")? {
        return Ok(0);
    }
    let mut stmt = ctx
        .conn
        .prepare("SELECT * FROM canonical_sessions")
        .map_err(map_sql)?;
    let mut rows = stmt.query([]).map_err(map_sql)?;
    let mut pending = Vec::new();
    while let Some(row) = rows.next().map_err(map_sql)? {
        let agent_id: String = row.get("agent_id").map_err(map_sql)?;
        let blob: Vec<u8> = row.get("messages").map_err(map_sql)?;
        let mut body = Map::new();
        body.insert("agent_id".into(), agent_id.clone().into());
        body.insert(
            "compaction_cursor".into(),
            opt::<i64>(row, "compaction_cursor").unwrap_or(0).into(),
        );
        body.insert(
            "updated_at".into(),
            row.get::<_, String>("updated_at").map_err(map_sql)?.into(),
        );
        for col in ["compacted_summary", "compacted_summary_session_id"] {
            body.insert(col.into(), json_opt(opt::<String>(row, col)));
        }
        pending.push((agent_id, blob, body));
    }
    drop(rows);

    let mut count = 0u64;
    for (agent_id, blob, mut body) in pending {
        match ctx.decoder.canonical_messages(&blob) {
            Ok(messages) => {
                body.insert("messages".into(), messages);
            }
            Err(e) => {
                ctx.skip(&format!("canonical_sessions:{agent_id}"), e);
                continue;
            }
        }
        ctx.upsert("canonical_sessions", &agent_id, body)?;
        count += 1;
    }
    Ok(count)
}

// ── kv_store ──────────────────────────────────────────────────────────

fn copy_kv_store(ctx: &mut Ctx<'_>) -> StorageResult<u64> {
    if !ctx.has_table("kv_store")? {
        return Ok(0);
    }
    let mut stmt = ctx
        .conn
        .prepare("SELECT agent_id, key, value, version, updated_at FROM kv_store")
        .map_err(map_sql)?;
    let rows = stmt
        .query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, Vec<u8>>(2)?,
                row.get::<_, i64>(3)?,
                row.get::<_, String>(4)?,
            ))
        })
        .map_err(map_sql)?
        .collect::<Result<Vec<_>, _>>()
        .map_err(map_sql)?;

    let mut count = 0u64;
    for (agent_id, key, value, version, updated_at) in rows {
        // `StructuredStore::set` writes `serde_json::to_vec(&value)`.
        let value = match serde_json::from_slice::<Value>(&value) {
            Ok(v) => v,
            Err(e) => {
                ctx.skip(
                    &format!("kv_store:{agent_id}/{key}"),
                    format!("value is not JSON: {e}"),
                );
                continue;
            }
        };
        let mut body = Map::new();
        body.insert("agent_id".into(), agent_id.clone().into());
        body.insert("key".into(), key.clone().into());
        body.insert("value".into(), value);
        body.insert("version".into(), version.into());
        body.insert("updated_at".into(), updated_at.into());
        ctx.upsert("kv_store", &kv_record_id(&agent_id, &key), body)?;
        count += 1;
    }
    Ok(count)
}

/// Same record id as `SurrealKvBackend::record_id`.
fn kv_record_id(agent_id: &str, key: &str) -> String {
    let safe = |s: &str| {
        s.chars()
            .map(|c| {
                if c.is_ascii_alphanumeric() || c == '-' {
                    c
                } else {
                    '_'
                }
            })
            .collect::<String>()
    };
    format!("{}__k__{}", safe(agent_id), safe(key))
}

// ── task_queue ────────────────────────────────────────────────────────

fn copy_task_queue(ctx: &mut Ctx<'_>) -> StorageResult<u64> {
    if !ctx.has_table("task_queue")? {
        return Ok(0);
    }
    let mut stmt = ctx
        .conn
        .prepare("SELECT * FROM task_queue ORDER BY created_at ASC")
        .map_err(map_sql)?;
    let mut rows = stmt.query([]).map_err(map_sql)?;
    let mut pending = Vec::new();
    while let Some(row) = rows.next().map_err(map_sql)? {
        let id: String = row.get("id").map_err(map_sql)?;
        let payload: Vec<u8> = opt(row, "payload").unwrap_or_default();
        let mut body = Map::new();
        for col in ["agent_id", "task_type", "status", "created_at"] {
            body.insert(
                col.into(),
                row.get::<_, String>(col).map_err(map_sql)?.into(),
            );
        }
        body.insert(
            "priority".into(),
            opt::<i64>(row, "priority").unwrap_or(0).into(),
        );
        for col in [
            "scheduled_at",
            "completed_at",
            "delegated_by",
            "assigned_to",
        ] {
            body.insert(col.into(), json_opt(opt::<String>(row, col)));
        }
        body.insert(
            "finished_at".into(),
            json_opt(opt::<i64>(row, "finished_at")),
        );
        pending.push((id, payload, body));
    }
    drop(rows);

    let mut count = 0u64;
    for (id, payload, mut body) in pending {
        // `task_post` writes an empty payload; anything else is JSON.
        if !payload.is_empty() {
            match serde_json::from_slice::<Value>(&payload) {
                Ok(v @ Value::Object(_)) => {
                    body.insert("payload".into(), v);
                }
                Ok(other) => {
                    ctx.skip(
                        &format!("task_queue:{id}"),
                        format!("payload is not an object: {other}"),
                    );
                    continue;
                }
                Err(e) => {
                    ctx.skip(
                        &format!("task_queue:{id}"),
                        format!("payload is not JSON: {e}"),
                    );
                    continue;
                }
            }
        }
        ctx.upsert("task_queue", &id, body)?;
        count += 1;
    }
    Ok(count)
}

// ── usage_events ──────────────────────────────────────────────────────

fn copy_usage_events(ctx: &mut Ctx<'_>) -> StorageResult<u64> {
    if !ctx.has_table("usage_events")? {
        return Ok(0);
    }
    let mut stmt = ctx
        .conn
        .prepare("SELECT * FROM usage_events ORDER BY timestamp ASC")
        .map_err(map_sql)?;
    let mut rows = stmt.query([]).map_err(map_sql)?;
    let mut pending = Vec::new();
    while let Some(row) = rows.next().map_err(map_sql)? {
        let id: String = row.get("id").map_err(map_sql)?;
        let mut body = Map::new();
        for col in ["agent_id", "timestamp", "model"] {
            body.insert(
                col.into(),
                row.get::<_, String>(col).map_err(map_sql)?.into(),
            );
        }
        body.insert(
            "provider".into(),
            opt::<String>(row, "provider").unwrap_or_default().into(),
        );
        for col in ["input_tokens", "output_tokens", "tool_calls", "latency_ms"] {
            body.insert(col.into(), opt::<i64>(row, col).unwrap_or(0).into());
        }
        body.insert(
            "cost_usd".into(),
            opt::<f64>(row, "cost_usd").unwrap_or(0.0).into(),
        );
        for col in ["user_id", "channel", "session_id"] {
            body.insert(col.into(), json_opt(opt::<String>(row, col)));
        }
        pending.push((id, body));
    }
    drop(rows);

    let mut count = 0u64;
    for (id, body) in pending {
        ctx.upsert("usage_events", &id, body)?;
        count += 1;
    }
    Ok(count)
}

// ── paired_devices ────────────────────────────────────────────────────

fn copy_paired_devices(ctx: &mut Ctx<'_>) -> StorageResult<u64> {
    if !ctx.has_table("paired_devices")? {
        return Ok(0);
    }
    let mut stmt = ctx
        .conn
        .prepare("SELECT * FROM paired_devices")
        .map_err(map_sql)?;
    let mut rows = stmt.query([]).map_err(map_sql)?;
    let mut pending = Vec::new();
    while let Some(row) = rows.next().map_err(map_sql)? {
        let device_id: String = row.get("device_id").map_err(map_sql)?;
        let mut body = Map::new();
        body.insert("device_id".into(), device_id.clone().into());
        for col in ["display_name", "platform", "paired_at", "last_seen"] {
            body.insert(
                col.into(),
                row.get::<_, String>(col).map_err(map_sql)?.into(),
            );
        }
        body.insert(
            "push_token".into(),
            json_opt(opt::<String>(row, "push_token")),
        );
        // `api_key_hash` is a required string column (v14); older databases predate it and default to '' like SQLite's own migration.
        body.insert(
            "api_key_hash".into(),
            opt::<String>(row, "api_key_hash")
                .unwrap_or_default()
                .into(),
        );
        pending.push((device_id, body));
    }
    drop(rows);

    let mut count = 0u64;
    for (device_id, body) in pending {
        // Same record id as `SurrealDeviceStore::save_paired_device`.
        let id = device_id.replace([':', '/'], "_");
        ctx.upsert("paired_devices", &id, body)?;
        count += 1;
    }
    Ok(count)
}

// ── prompt_versions ───────────────────────────────────────────────────

fn copy_prompt_versions(ctx: &mut Ctx<'_>) -> StorageResult<u64> {
    if !ctx.has_table("prompt_versions")? {
        return Ok(0);
    }
    let mut stmt = ctx
        .conn
        .prepare(
            "SELECT id, agent_id, version, content_hash, system_prompt, tools, variables, \
                    created_at, created_by, is_active, description \
             FROM prompt_versions ORDER BY version ASC",
        )
        .map_err(map_sql)?;
    let rows = stmt
        .query_map([], |row| {
            let is_active: i64 = row.get(9)?;
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, i64>(2)?,
                row.get::<_, String>(3)?,
                row.get::<_, String>(4)?,
                row.get::<_, String>(5)?,
                row.get::<_, String>(6)?,
                row.get::<_, String>(7)?,
                row.get::<_, String>(8)?,
                is_active != 0,
                row.get::<_, Option<String>>(10)?,
            ))
        })
        .map_err(map_sql)?
        .collect::<Result<Vec<_>, _>>()
        .map_err(map_sql)?;

    let mut count = 0u64;
    for (
        id,
        agent_id,
        version,
        content_hash,
        system_prompt,
        tools,
        variables,
        created_at,
        created_by,
        is_active,
        description,
    ) in rows
    {
        let (tools, variables) = match (
            serde_json::from_str::<Value>(&tools),
            serde_json::from_str::<Value>(&variables),
        ) {
            (Ok(t), Ok(v)) => (t, v),
            (Err(e), _) | (_, Err(e)) => {
                ctx.skip(
                    &format!("prompt_versions:{id}"),
                    format!("tools/variables are not JSON: {e}"),
                );
                continue;
            }
        };
        let mut body = Map::new();
        body.insert("agent_id".into(), agent_id.into());
        body.insert("version".into(), version.into());
        body.insert("content_hash".into(), content_hash.into());
        body.insert("system_prompt".into(), system_prompt.into());
        body.insert("tools".into(), tools);
        body.insert("variables".into(), variables);
        body.insert("created_at".into(), created_at.into());
        body.insert("created_by".into(), created_by.into());
        body.insert("is_active".into(), is_active.into());
        body.insert("description".into(), json_opt(description));
        ctx.upsert("prompt_versions", &id, body)?;
        count += 1;
    }
    Ok(count)
}

// ── prompt_experiments ────────────────────────────────────────────────

fn copy_prompt_experiments(ctx: &mut Ctx<'_>) -> StorageResult<u64> {
    if !ctx.has_table("prompt_experiments")? {
        return Ok(0);
    }
    let mut stmt = ctx
        .conn
        .prepare(
            "SELECT id, name, agent_id, status, traffic_split, success_criteria, \
                    started_at, ended_at, created_at \
             FROM prompt_experiments ORDER BY created_at ASC",
        )
        .map_err(map_sql)?;
    let rows = stmt
        .query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, String>(3)?,
                row.get::<_, String>(4)?,
                row.get::<_, String>(5)?,
                row.get::<_, Option<String>>(6)?,
                row.get::<_, Option<String>>(7)?,
                row.get::<_, String>(8)?,
            ))
        })
        .map_err(map_sql)?
        .collect::<Result<Vec<_>, _>>()
        .map_err(map_sql)?;

    let mut count = 0u64;
    for (id, name, agent_id, status, traffic, criteria, started_at, ended_at, created_at) in rows {
        let (traffic_split, success_criteria) = match (
            serde_json::from_str::<Value>(&traffic),
            serde_json::from_str::<Value>(&criteria),
        ) {
            (Ok(t), Ok(c)) => (t, c),
            (Err(e), _) | (_, Err(e)) => {
                ctx.skip(
                    &format!("prompt_experiments:{id}"),
                    format!("traffic_split/success_criteria are not JSON: {e}"),
                );
                continue;
            }
        };
        let mut body = Map::new();
        body.insert("name".into(), name.into());
        body.insert("agent_id".into(), agent_id.into());
        body.insert("status".into(), status.into());
        body.insert("traffic_split".into(), traffic_split);
        body.insert("success_criteria".into(), success_criteria);
        body.insert("started_at".into(), json_opt(started_at));
        body.insert("ended_at".into(), json_opt(ended_at));
        body.insert("created_at".into(), created_at.into());
        ctx.upsert("prompt_experiments", &id, body)?;
        count += 1;
    }
    Ok(count)
}

// ── shared helpers ────────────────────────────────────────────────────

fn map_sql(e: rusqlite::Error) -> StorageError {
    StorageError::Backend(format!("sqlite: {e}"))
}

/// Returns `true` if `table` exists in the SQLite database.
fn table_exists(conn: &Connection, table: &str) -> StorageResult<bool> {
    let count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=?1",
            rusqlite::params![table],
            |r| r.get(0),
        )
        .map_err(map_sql)?;
    Ok(count > 0)
}

fn sanitise_id(input: &str) -> String {
    input
        .chars()
        .map(|c| {
            if c.is_ascii_alphanumeric() || c == '_' || c == '-' {
                c
            } else {
                '_'
            }
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::config::{RemoteSurrealConfig, StorageBackendKind, StorageConfig};
    use crate::migrate::GenericBlobDecoder;
    use crate::pool::SurrealConnectionPool;
    use rusqlite::params;
    use serde_json::json;
    use tempfile::tempdir;

    fn seed_sqlite(path: &Path) {
        let conn = Connection::open(path).unwrap();
        conn.execute_batch(
            "CREATE TABLE audit_entries (
                seq INTEGER PRIMARY KEY,
                timestamp TEXT NOT NULL,
                agent_id TEXT NOT NULL,
                action TEXT NOT NULL,
                detail TEXT NOT NULL,
                outcome TEXT NOT NULL,
                prev_hash TEXT NOT NULL,
                hash TEXT NOT NULL
            );
            CREATE TABLE hook_traces (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                trace_id TEXT NOT NULL DEFAULT '',
                correlation_id TEXT NOT NULL DEFAULT '',
                plugin TEXT NOT NULL,
                hook TEXT NOT NULL,
                started_at TEXT NOT NULL,
                elapsed_ms INTEGER NOT NULL,
                success INTEGER NOT NULL,
                error TEXT,
                input_preview TEXT,
                output_preview TEXT
            );
            CREATE TABLE circuit_breaker_states (
                key TEXT PRIMARY KEY,
                failures INTEGER NOT NULL DEFAULT 0,
                opened_at TEXT
            );
            CREATE TABLE totp_lockout (
                sender_id TEXT PRIMARY KEY,
                failures INTEGER NOT NULL,
                locked_at INTEGER
            );",
        )
        .unwrap();

        conn.execute(
            "INSERT INTO audit_entries (seq, timestamp, agent_id, action, detail, outcome, prev_hash, hash) \
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![
                0i64,
                "2026-04-21T00:00:00Z",
                "agent-1",
                "AgentSpawn",
                "spawn",
                "ok",
                "0".repeat(64),
                "a".repeat(64),
            ],
        )
        .unwrap();

        conn.execute(
            "INSERT INTO hook_traces (trace_id, correlation_id, plugin, hook, started_at, elapsed_ms, success) \
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params!["trace-1", "corr-1", "plugin", "ingest", "2026-04-21T00:00:01Z", 12i64, 1i64],
        )
        .unwrap();

        conn.execute(
            "INSERT INTO circuit_breaker_states (key, failures, opened_at) VALUES (?1, ?2, ?3)",
            params!["plugin/ingest", 3i64, Some("2026-04-21T00:00:02Z")],
        )
        .unwrap();

        conn.execute(
            "INSERT INTO totp_lockout (sender_id, failures, locked_at) VALUES (?1, ?2, ?3)",
            params!["slack:U12345", 5i64, Some(1_700_000_000i64)],
        )
        .unwrap();
    }

    const AGENT: &str = "6f1c1e0e-5c8e-4c6a-9d49-0a0e2b1f2c3d";
    const SESSION: &str = "0b7d6c1a-2f3e-4d5c-8b9a-112233445566";
    const EMPTY_SESSION: &str = "1b7d6c1a-2f3e-4d5c-8b9a-112233445566";
    const BAD_SESSION: &str = "2b7d6c1a-2f3e-4d5c-8b9a-112233445566";

    /// Messages in the named shape `rmp_serde::to_vec_named(&Vec<Message>)` produces.
    fn messages() -> Value {
        json!([
            {"role": "user", "content": "hello", "pinned": false},
            {"role": "assistant", "content": [
                {"type": "text", "text": "calling a tool"},
                {"type": "tool_use", "id": "t1", "name": "search", "input": {"q": "surreal", "opts": {"limit": 3}}}
            ], "pinned": true}
        ])
    }

    /// The tables whose BLOB, NULL and type handling the importer has to get right, with the column sets of a current SQLite store.
    fn seed_rich_sqlite(path: &Path) {
        seed_sqlite(path);
        let conn = Connection::open(path).unwrap();
        conn.execute_batch(
            "CREATE TABLE agents (
                id TEXT PRIMARY KEY, name TEXT NOT NULL, manifest BLOB NOT NULL, state TEXT NOT NULL,
                created_at TEXT NOT NULL, updated_at TEXT NOT NULL, session_id TEXT DEFAULT '',
                identity TEXT DEFAULT '{}', source_toml_path TEXT DEFAULT NULL,
                parent_id TEXT DEFAULT NULL, parent_recorded INTEGER NOT NULL DEFAULT 0
            );
            CREATE TABLE sessions (
                id TEXT PRIMARY KEY, agent_id TEXT NOT NULL, messages BLOB NOT NULL,
                context_window_tokens INTEGER DEFAULT 0, message_count INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL, updated_at TEXT NOT NULL, label TEXT, peer_id TEXT DEFAULT NULL,
                parent_session_id TEXT DEFAULT NULL, model_override TEXT DEFAULT NULL,
                messages_generation INTEGER NOT NULL DEFAULT 0
            );
            CREATE TABLE canonical_sessions (
                agent_id TEXT PRIMARY KEY, messages BLOB NOT NULL, compaction_cursor INTEGER NOT NULL DEFAULT 0,
                compacted_summary TEXT, updated_at TEXT NOT NULL, compacted_summary_session_id TEXT
            );
            CREATE TABLE kv_store (
                agent_id TEXT NOT NULL, key TEXT NOT NULL, value BLOB NOT NULL,
                version INTEGER NOT NULL DEFAULT 1, updated_at TEXT NOT NULL, PRIMARY KEY (agent_id, key)
            );
            CREATE TABLE usage_events (
                id TEXT PRIMARY KEY, agent_id TEXT NOT NULL, timestamp TEXT NOT NULL, model TEXT NOT NULL,
                input_tokens INTEGER NOT NULL DEFAULT 0, output_tokens INTEGER NOT NULL DEFAULT 0,
                cost_usd REAL NOT NULL DEFAULT 0.0, tool_calls INTEGER NOT NULL DEFAULT 0,
                latency_ms INTEGER NOT NULL DEFAULT 0, user_id TEXT, channel TEXT, session_id TEXT,
                provider TEXT NOT NULL DEFAULT ''
            );
            CREATE TABLE paired_devices (
                device_id TEXT PRIMARY KEY, display_name TEXT NOT NULL, platform TEXT NOT NULL,
                paired_at TEXT NOT NULL, last_seen TEXT NOT NULL, push_token TEXT,
                api_key_hash TEXT NOT NULL DEFAULT ''
            );
            CREATE TABLE prompt_versions (
                id TEXT PRIMARY KEY, agent_id TEXT NOT NULL, version INTEGER NOT NULL, content_hash TEXT NOT NULL,
                system_prompt TEXT NOT NULL, tools TEXT NOT NULL, variables TEXT NOT NULL, created_at TEXT NOT NULL,
                created_by TEXT NOT NULL, is_active INTEGER NOT NULL DEFAULT 0, description TEXT
            );
            CREATE TABLE prompt_experiments (
                id TEXT PRIMARY KEY, name TEXT NOT NULL, agent_id TEXT NOT NULL, status TEXT NOT NULL,
                traffic_split TEXT NOT NULL, success_criteria TEXT NOT NULL, started_at TEXT, ended_at TEXT,
                created_at TEXT NOT NULL
            );
            CREATE TABLE task_queue (
                id TEXT PRIMARY KEY, agent_id TEXT NOT NULL, task_type TEXT NOT NULL, payload BLOB NOT NULL,
                status TEXT NOT NULL DEFAULT 'pending', priority INTEGER NOT NULL DEFAULT 0, scheduled_at TEXT,
                created_at TEXT NOT NULL, completed_at TEXT, assigned_to TEXT, finished_at INTEGER DEFAULT NULL
            );",
        )
        .unwrap();

        let manifest = rmp_serde::to_vec_named(
            &json!({"name": "helper", "tags": ["ops"], "model": {"provider": "p", "model": "m"}}),
        )
        .unwrap();
        conn.execute(
            "INSERT INTO agents (id, name, manifest, state, created_at, updated_at, session_id, identity) \
             VALUES (?1, 'helper', ?2, '\"Running\"', '2026-04-21T00:00:00+00:00', '2026-04-22T00:00:00+00:00', ?3, '{}')",
            params![AGENT, manifest, SESSION],
        )
        .unwrap();

        let named = rmp_serde::to_vec_named(&messages()).unwrap();
        conn.execute(
            "INSERT INTO sessions (id, agent_id, messages, context_window_tokens, created_at, updated_at, label, parent_session_id) \
             VALUES (?1, ?2, ?3, 1234, '2026-04-21T00:00:00+00:00', '2026-04-21T01:00:00+00:00', NULL, NULL)",
            params![SESSION, AGENT, named],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO sessions (id, agent_id, messages, created_at, updated_at, label, model_override) \
             VALUES (?1, ?2, x'90', '2026-04-21T00:00:00+00:00', '2026-04-21T00:00:00+00:00', 'empty', 'p/m')",
            params![EMPTY_SESSION, AGENT],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO sessions (id, agent_id, messages, created_at, updated_at) \
             VALUES (?1, ?2, x'c1ff00', '2026-04-21T00:00:00+00:00', '2026-04-21T00:00:00+00:00')",
            params![BAD_SESSION, AGENT],
        )
        .unwrap();

        // `SessionStore` writes the canonical history positionally (`rmp_serde::to_vec`), which only a typed decoder can read.
        let positional = rmp_serde::to_vec(&vec![("user", "positional", false)]).unwrap();
        conn.execute(
            "INSERT INTO canonical_sessions (agent_id, messages, compaction_cursor, compacted_summary, updated_at) \
             VALUES (?1, ?2, 0, NULL, '2026-04-21T00:00:00+00:00')",
            params![AGENT, positional],
        )
        .unwrap();

        for (key, value) in [
            ("greeting", json!("hello")),
            ("count", json!(3)),
            ("list", json!([1, {"a": 2}])),
            ("obj", json!({"nested": {"k": [1, 2]}})),
        ] {
            conn.execute(
                "INSERT INTO kv_store (agent_id, key, value, version, updated_at) VALUES (?1, ?2, ?3, 2, '2026-04-21T00:00:00+00:00')",
                params![AGENT, key, serde_json::to_vec(&value).unwrap()],
            )
            .unwrap();
        }

        conn.execute(
            "INSERT INTO usage_events (id, agent_id, timestamp, model, input_tokens, output_tokens, cost_usd, tool_calls, user_id, channel) \
             VALUES ('u-1', ?1, '2026-04-21T00:00:00+00:00', 'm', 10, 20, 0.5, 1, NULL, NULL)",
            params![AGENT],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO paired_devices (device_id, display_name, platform, paired_at, last_seen, push_token, api_key_hash) \
             VALUES ('ios:dev/1', 'Phone', 'ios', '2026-04-21', '2026-04-22', NULL, 'hash')",
            [],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO prompt_versions (id, agent_id, version, content_hash, system_prompt, tools, variables, created_at, created_by, is_active, description) \
             VALUES ('pv-1', ?1, 1, 'h', 'sys', '[\"search\"]', '[]', '2026-04-21', 'me', 1, NULL)",
            params![AGENT],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO prompt_experiments (id, name, agent_id, status, traffic_split, success_criteria, started_at, ended_at, created_at) \
             VALUES ('pe-1', 'exp', ?1, 'draft', '{}', '{}', NULL, NULL, '2026-04-21')",
            params![AGENT],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO task_queue (id, agent_id, task_type, payload, status, priority, created_at, assigned_to) \
             VALUES ('t-1', ?1, 'task', x'', 'pending', 0, '2026-04-21', 'helper')",
            params![AGENT],
        )
        .unwrap();
    }

    async fn migrated_session(cfg: &StorageConfig) -> SurrealSession {
        let session = SurrealConnectionPool::new()
            .open(cfg)
            .await
            .expect("open surreal");
        crate::migrations::apply_pending(
            session.client(),
            crate::migrations::OPERATIONAL_MIGRATIONS,
        )
        .await
        .expect("migrations");
        session
    }

    fn embedded(dir: &Path) -> StorageConfig {
        StorageConfig {
            backend: StorageBackendKind::embedded(dir.join("surreal")),
            namespace: "librefang".into(),
            database: "main".into(),
            legacy_sqlite_path: None,
        }
    }

    async fn select_one(session: &SurrealSession, table: &str, id: &str) -> Value {
        let row: Option<Value> = session
            .client()
            .select((table, id))
            .await
            .unwrap_or_else(|e| panic!("select {table}:{id}: {e}"));
        row.unwrap_or_else(|| panic!("{table}:{id} missing"))
    }

    #[tokio::test(flavor = "multi_thread", worker_threads = 2)]
    async fn dry_run_counts_rows_without_writing() {
        let dir = tempdir().unwrap();
        let sqlite_path = dir.path().join("librefang.db");
        seed_sqlite(&sqlite_path);

        let session = migrated_session(&embedded(dir.path())).await;
        let opts = MigrationOptions {
            dry_run: true,
            receipt_dir: None,
        };
        let receipt = run(&sqlite_path, &session, &opts, &GenericBlobDecoder).expect("dry run");
        assert!(receipt.dry_run);
        assert_eq!(receipt.copied.get("audit_entries"), Some(&1));
        assert_eq!(receipt.copied.get("hook_traces"), Some(&1));
        assert_eq!(receipt.copied.get("circuit_breaker_states"), Some(&1));
        assert_eq!(receipt.copied.get("totp_lockout"), Some(&1));

        // Surreal tables stay empty under dry-run.
        let rows: Vec<Value> = session
            .client()
            .query("SELECT seq FROM audit_entries")
            .await
            .unwrap()
            .take(0)
            .unwrap();
        assert!(rows.is_empty(), "dry-run wrote rows: {rows:?}");
    }

    #[tokio::test(flavor = "multi_thread", worker_threads = 2)]
    async fn live_run_copies_rows_and_is_idempotent() {
        let dir = tempdir().unwrap();
        let sqlite_path = dir.path().join("librefang.db");
        seed_sqlite(&sqlite_path);

        let session = migrated_session(&embedded(dir.path())).await;
        let receipts_dir = dir.path().join("migrations");
        let opts = MigrationOptions {
            dry_run: false,
            receipt_dir: Some(receipts_dir.clone()),
        };
        let receipt = run(&sqlite_path, &session, &opts, &GenericBlobDecoder).expect("first run");
        assert!(!receipt.dry_run);
        assert!(receipt.is_clean(), "errors: {:?}", receipt.errors);

        let count_audit: Vec<Value> = session
            .client()
            .query("SELECT seq FROM audit_entries")
            .await
            .unwrap()
            .take(0)
            .unwrap();
        assert_eq!(count_audit.len(), 1);

        // Re-running must converge, not duplicate.
        let second = run(&sqlite_path, &session, &opts, &GenericBlobDecoder).expect("second run");
        assert!(second.is_clean());
        let still_one: Vec<Value> = session
            .client()
            .query("SELECT seq FROM audit_entries")
            .await
            .unwrap()
            .take(0)
            .unwrap();
        assert_eq!(still_one.len(), 1);

        // Receipt files exist (one per run).
        let entries: Vec<_> = std::fs::read_dir(&receipts_dir)
            .unwrap()
            .filter_map(Result::ok)
            .collect();
        assert!(entries.len() >= 2, "expected receipts, got {entries:?}");
    }

    /// The shared body of the rich import tests: imports every table and checks what the runtime backends will read back.
    async fn import_rich_fixture_and_verify(session: &SurrealSession, sqlite_path: &Path) {
        let opts = MigrationOptions {
            dry_run: false,
            receipt_dir: None,
        };
        let receipt = run(sqlite_path, session, &opts, &GenericBlobDecoder).expect("import");

        // Exactly the two undecodable BLOBs are reported, and nothing else.
        assert_eq!(
            receipt.errors.keys().cloned().collect::<Vec<_>>(),
            vec!["canonical_sessions".to_string(), "sessions".to_string()],
            "errors: {:?}",
            receipt.errors
        );
        assert!(receipt.errors["sessions"].contains(BAD_SESSION));
        assert!(receipt.errors["canonical_sessions"].contains("typed"));
        assert_eq!(receipt.copied.get("sessions"), Some(&2));
        assert_eq!(receipt.copied.get("canonical_sessions"), Some(&0));
        for table in [
            "agents",
            "usage_events",
            "paired_devices",
            "prompt_versions",
            "prompt_experiments",
            "task_queue",
        ] {
            assert_eq!(receipt.copied.get(table), Some(&1), "{table}");
        }
        assert_eq!(receipt.copied.get("kv_store"), Some(&4));

        // Sessions: the MessagePack history arrives as the message objects the runtime serialises, with NONE for unset optionals.
        let session_row = select_one(session, "sessions", SESSION).await;
        assert_eq!(session_row["messages"], messages());
        assert_eq!(session_row["message_count"], 2);
        assert_eq!(session_row["context_window_tokens"], 1234);
        assert!(session_row.get("label").is_none(), "{session_row}");
        assert!(session_row.get("parent_session_id").is_none());
        let empty = select_one(session, "sessions", EMPTY_SESSION).await;
        assert_eq!(empty["messages"], json!([]));
        assert_eq!(empty["label"], "empty");
        assert_eq!(empty["model_override"], "p/m");
        let bad: Option<Value> = session
            .client()
            .select(("sessions", BAD_SESSION))
            .await
            .unwrap();
        assert!(
            bad.is_none(),
            "an undecodable history must not be imported as empty"
        );

        // Agents: the MessagePack manifest decodes, and the entry carries every field `AgentEntry` requires.
        let agent = select_one(session, "agents", AGENT).await;
        assert_eq!(agent["entry"]["manifest"]["name"], "helper");
        assert_eq!(agent["entry"]["state"], "Running");
        assert_eq!(agent["entry"]["session_id"], SESSION);
        assert_eq!(agent["entry"]["tags"], json!([]));
        assert_eq!(agent["entry"]["children"], json!([]));
        assert_eq!(agent["entry"]["parent_unknown"], true);

        // kv values of every JSON type, under the runtime backend's record id.
        let kv_id = |key: &str| kv_record_id(AGENT, key);
        assert_eq!(
            select_one(session, "kv_store", &kv_id("greeting")).await["value"],
            "hello"
        );
        assert_eq!(
            select_one(session, "kv_store", &kv_id("count")).await["value"],
            3
        );
        assert_eq!(
            select_one(session, "kv_store", &kv_id("list")).await["value"],
            json!([1, {"a": 2}])
        );
        assert_eq!(
            select_one(session, "kv_store", &kv_id("obj")).await["value"],
            json!({"nested": {"k": [1, 2]}})
        );

        let usage = select_one(session, "usage_events", "u-1").await;
        assert!(usage.get("user_id").is_none());
        assert_eq!(usage["cost_usd"], 0.5);
        let device = select_one(session, "paired_devices", "ios_dev_1").await;
        assert_eq!(device["api_key_hash"], "hash");
        assert!(device.get("push_token").is_none());
        let prompt = select_one(session, "prompt_versions", "pv-1").await;
        assert_eq!(prompt["tools"], json!(["search"]));
        assert_eq!(prompt["variables"], json!([]));
        let experiment = select_one(session, "prompt_experiments", "pe-1").await;
        assert!(experiment.get("started_at").is_none());
        let task = select_one(session, "task_queue", "t-1").await;
        assert_eq!(task["assigned_to"], "helper");
        assert!(task.get("payload").is_none());

        // Idempotent: a second run converges on the same rows.
        let second = run(sqlite_path, session, &opts, &GenericBlobDecoder).expect("re-import");
        assert_eq!(second.copied, receipt.copied);
        let sessions: Vec<Value> = session
            .client()
            .query("SELECT id FROM sessions")
            .await
            .unwrap()
            .take(0)
            .unwrap();
        assert_eq!(sessions.len(), 2);
    }

    #[tokio::test(flavor = "multi_thread", worker_threads = 2)]
    async fn rich_import_decodes_blobs_and_omits_nulls_embedded() {
        let dir = tempdir().unwrap();
        let sqlite_path = dir.path().join("librefang.db");
        seed_rich_sqlite(&sqlite_path);
        let session = migrated_session(&embedded(dir.path())).await;
        import_rich_fixture_and_verify(&session, &sqlite_path).await;
    }

    #[tokio::test(flavor = "multi_thread", worker_threads = 2)]
    async fn rich_import_decodes_blobs_and_omits_nulls_remote() {
        let Ok(url) = std::env::var("BOSSFANG_TEST_SURREAL_URL") else {
            eprintln!("SKIP remote surreal: BOSSFANG_TEST_SURREAL_URL unset");
            return;
        };
        let username =
            std::env::var("BOSSFANG_TEST_SURREAL_USER").unwrap_or_else(|_| "root".into());
        let password_env = std::env::var("BOSSFANG_TEST_SURREAL_PASS_ENV")
            .unwrap_or_else(|_| "BOSSFANG_TEST_SURREAL_PASS".into());
        let dir = tempdir().unwrap();
        let sqlite_path = dir.path().join("librefang.db");
        seed_rich_sqlite(&sqlite_path);
        for url in crate::migrations::test_support::remote_urls(&url) {
            let database = format!("import_{}", uuid::Uuid::new_v4().simple());
            eprintln!("remote surreal: importer against {url} db={database}");
            let cfg = StorageConfig {
                backend: StorageBackendKind::Remote(RemoteSurrealConfig {
                    url: url.clone(),
                    namespace: "bossfang_test".into(),
                    database: database.clone(),
                    username: username.clone(),
                    password_env: password_env.clone(),
                    tls_skip_verify: false,
                }),
                namespace: "bossfang_test".into(),
                database: database.clone(),
                legacy_sqlite_path: None,
            };
            let session = migrated_session(&cfg).await;
            import_rich_fixture_and_verify(&session, &sqlite_path).await;
            session
                .client()
                .query(format!("REMOVE DATABASE IF EXISTS {database}"))
                .await
                .expect("drop test database");
        }
    }

    #[test]
    fn nulls_are_dropped_but_other_values_kept() {
        let mut body = Map::new();
        body.insert("a".into(), Value::Null);
        body.insert("b".into(), json!(0));
        body.insert("c".into(), json!({"inner": null}));
        let out = without_nulls(body);
        assert!(!out.contains_key("a"));
        assert_eq!(out["b"], 0);
        assert_eq!(
            out["c"],
            json!({"inner": null}),
            "only top-level nulls are optional columns"
        );
    }

    #[test]
    fn kv_record_id_matches_the_runtime_backend() {
        assert_eq!(kv_record_id("agent-1", "a.b/c"), "agent-1__k__a_b_c");
    }
}
