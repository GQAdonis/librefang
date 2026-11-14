# SQLite to SurrealDB schema parity

This is the column-level parity audit between the upstream-compatible SQLite schema and the BossFang SurrealDB schema, taken on 2026-11-14 against `origin/main` at `b6d726604`.
The SQLite side is the effective schema after `crates/librefang-memory/src/migration.rs` runs to `SCHEMA_VERSION = 66`, dumped from `sqlite_master` and `PRAGMA table_info`, plus every schema created outside that ladder in non-test code.
The SurrealDB side is the effective schema after `OPERATIONAL_MIGRATIONS` 001 to 051 apply on a fresh embedded SurrealKV datastore, dumped with `INFO FOR TABLE`.
Both dumps were compared table by table, column by column and index by index; CHECK constraints were compared with the SurrealDB `ASSERT` clauses.

## Summary

| Outcome | Tables | Detail |
|---|---|---|
| Already covered before this audit | 24 | Every column and every index the code relies on has a SurrealDB definition. |
| Gaps filled by migration 052 | 8 | 11 fields added, 1 field retyped, 1 `ASSERT` widened, 7 indexes added. |
| Intentionally not mirrored | 8 | Each has a reason with a file reference below. |
| Handoffs (no SurrealDB home, owned elsewhere) | 4 | The UAR delegation tables of the A2A store. |

Out-of-ladder schema sites that were checked: `crates/librefang-runtime/src/trace_store.rs` (`hook_traces`, `circuit_breaker_states`), `crates/librefang-runtime/src/a2a.rs` (`a2a_tasks_v2`, `uar_delegations_v1`) and `crates/librefang-runtime/src/a2a/uar_delegation_store.rs` (three `uar_*_v1` tables).
`crates/librefang-memory/src/prompt.rs` creates schema only inside `#[cfg(test)]` (line 752 onward), `crates/librefang-runtime/src/plugin_manager/scaffold.rs:548` is a commented line in a generated plugin template, `crates/librefang-runtime/src/dangerous_command.rs` holds DDL only as test strings, and `crates/librefang-runtime-audit` holds DDL only in test fixtures, so none of them is runtime schema.

## Migration 052

`crates/librefang-storage/src/migrations/sql/052_upstream_sqlite_column_parity.surql`, registered as `upstream_sqlite_column_parity_v1`.

| SQLite source | SurrealDB definition |
|---|---|
| v16 `sessions.peer_id`, `idx_sessions_peer(agent_id, peer_id)` | `peer_id option<string>`, `idx_sessions_peer` |
| v2 `task_queue.title`, `description`, `created_by`, `result` | `option<string>` each |
| v20 `task_queue.claimed_at`, `idx_task_status_claimed_at(status, claimed_at)` | `claimed_at option<string>`, `idx_task_status_claimed_at` |
| v21 `task_queue.retry_count INTEGER NOT NULL DEFAULT 0` | `retry_count int`, existing rows migrated to 0 |
| v49 `usage_events.billed_agent_id` | `billed_agent_id option<string>` |
| v19 `idx_usage_provider_time(provider, timestamp)` | `usage_provider_time_idx` |
| v23 `idx_usage_channel_time(channel, timestamp)` | `usage_channel_time_idx` |
| v8 `idx_audit_timestamp`, `idx_audit_action`; v22 `idx_audit_channel` | the same three indexes on `audit_entries` |
| v49 `workflow_runs.owner_agent_id` | `owner_agent_id option<string>` |
| v66 (BossFang) `workflow_runs.state` CHECK gains `'cancelled'` | `state` `ASSERT` gains `'cancelled'` |
| v52 `group_roster.source TEXT NOT NULL DEFAULT 'observed'` | `source string`, existing rows migrated to `'observed'` |
| `trace_store.rs:76` `hook_traces.annotations TEXT` | `annotations option<string>` (JSON text, like `input_preview`) |
| v13 `prompt_experiments.traffic_split` (a JSON array of `u8`) | retyped from `option<object>` to `option<array<int>>` |

SurrealDB 4 refuses, on a populated SCHEMAFULL table in a compatibility-level-4 database, a field definition that does not accept every value already stored.
Migration 052 therefore says what existing rows hold with `MIGRATE EXISTING ROWS` for `retry_count`, `source`, `state` and `traffic_split`, and drops and restores `idx_workflow_runs_state` around the `state` redefinition because SurrealDB 4 will not migrate a field an index reads.
The `traffic_split` retype migrates the old `{}` placeholder to NONE, and a `{}` `success_criteria` becomes NONE so it decodes as `SuccessCriteria::default()` rather than all-false criteria.

## Covered tables

| SQLite table | SurrealDB home | Notes |
|---|---|---|
| `approval_audit` | 028 | All 13 columns and both indexes. |
| `audit_entries` | 001, 012, 030, 052 | Indexes completed by 052. |
| `canonical_sessions` | 005, 032, 044 | |
| `channel_instance_defaults`, `conversation_bindings` | 039 | Composite primary keys are `UNIQUE` indexes. |
| `entities` | `kg_entities` (011, 033) | Renamed; `id` is `entity_id`. |
| `relations` | `kg_relations` (011, 033) | Renamed. |
| `ephemeral_runs` | 042, 050 | The status CHECK is an `ASSERT`. |
| `experiment_variants`, `experiment_metrics` | 010 | |
| `goal_runs` | 037 | The phase CHECK is an `ASSERT`. |
| `idempotency_keys` | 024 | |
| `kv_store` | 006, 049 | `(agent_id, key)` is a `UNIQUE` index. |
| `manifest_versions` | 035 | |
| `template_versions` | 036 | |
| `mcp_server_configs` | 040 | |
| `oauth_used_nonces` | 017 | |
| `paired_devices` | 009, 014 | |
| `pending_approvals` | 016, 025, 026 | |
| `prompt_versions` | 010, 049 | `UNIQUE(agent_id, version)` is `pv_agent_version_idx`. |
| `totp_lockout` | 004 | |
| `totp_used_codes` | 015, 021 | |
| `webauthn_credentials` | 038 | |
| `circuit_breaker_states` (trace_store.rs) | 003 | |
| `a2a_tasks_v2` (a2a.rs:353) | `a2a_tasks` (041) | The `_v2` suffix is a SQLite rename artefact. |

The 8 tables 052 completes (`sessions`, `task_queue`, `usage_events`, `audit_entries`, `workflow_runs`, `group_roster`, `hook_traces`, `prompt_experiments`) are covered in every other column.
SQLite `DESC` index ordering has no SurrealDB counterpart and is not needed for equality or range lookups.

## Intentionally not mirrored

| SQLite table | Reason |
|---|---|
| `agents` | The SurrealDB agent registry is a SCHEMALESS table that stores the whole `AgentEntry` under `entry` (`crates/librefang-memory/src/backends/surreal.rs:64`); `parent_id` and the v40 columns live inside that document. |
| `memories` | Semantic memory lives in surreal-memory's own `memory` table (`crates/librefang-memory/src/backends/surreal_semantic.rs:456`), which that crate migrates; the stub `memories` table from 019 carries only the retention field. |
| `memories_fts` and its five shadow tables | FTS5 virtual table; surreal-memory owns memory search. |
| `sessions_fts` and its five shadow tables, `sessions_fts_map` | FTS5 virtual table and its rowid map (v12, v33, v64); 023 defines the `sessions_unicode` analyzer, and there is no SurrealDB session-search backend to index for yet. |
| `events` | Created by v1 and never read or written by any non-test code. |
| `migrations` | SQLite's ladder ledger; SurrealDB records applied migrations in `_schema_version` (`crates/librefang-storage/src/migrations/runner.rs`). |
| `sqlite_sequence` | SQLite's internal AUTOINCREMENT counter. |

## Handoffs

| SQLite table | Where | Why it is not added here |
|---|---|---|
| `uar_delegations_v1` | `crates/librefang-runtime/src/a2a.rs:364` | The A2A store has no SurrealDB backend (`a2a_tasks` from 041 has no reader either); a schema without a backend would fix no record id or field shape. |
| `uar_job_attempts_v1`, `uar_attempt_events_v1`, `uar_attempt_terminal_observations_v1` | `crates/librefang-runtime/src/a2a/uar_delegation_store.rs:29` | Same; owned by the UAR runtime path. |

## Importer coverage

`crates/librefang-storage/src/migrate/sqlite_to_surreal.rs` copies the tables in `IMPORTED_TABLES`, which are the tables with a SurrealDB backend.
This audit added `experiment_variants` and `experiment_metrics` to it, and added the columns `sessions.peer_id`, `task_queue.title` / `description` / `created_by` / `result` / `claimed_at` / `retry_count`, `usage_events.billed_agent_id` and `hook_traces.annotations`.
It also unwraps the quoted JSON status SQLite stores for `prompt_experiments` (`"\"running\""`), which previously made every imported experiment read back as `Draft`, and keys imported `experiment_metrics` rows by `{experiment_id}_{variant_id}` so `SurrealPromptStore::record_request` keeps counting into them.
`totp_used_codes` and `oauth_used_nonces` are replay caches with a 120-second and TTL-bounded lifetime and are not worth importing.
Tables with a SurrealDB schema but no SurrealDB backend (`workflow_runs`, `goal_runs`, `idempotency_keys`, `group_roster`, `webauthn_credentials`, `mcp_server_configs`, `template_versions`, `manifest_versions`, `ephemeral_runs`, `channel_instance_defaults`, `conversation_bindings`, `pending_approvals`, `approval_audit`, `a2a_tasks`) are not imported, because no backend defines the record ids a copy would have to match.
`hook_traces` and `circuit_breaker_states` live in a separate file (`~/.librefang/hook_traces.db`, `crates/librefang-runtime/src/plugin_manager.rs:1711`), so they import only when the importer is pointed at that file.

## Backend parity fixed in this audit

- `SurrealSessionBackend` now persists and loads `peer_id` and `messages_generation`, which the SQLite `save_session` writes (`crates/librefang-memory/src/session.rs:770`).
- `SurrealUsageStore` now writes `billed_agent_id`.
- `SurrealPromptStore` now persists the traffic split, the success criteria and the variants of an experiment (with a zeroed metrics row per variant, in one transaction, and a typed not-found for a missing prompt version), loads variants in `get_experiment` / `list_experiments`, and joins `variant_name` into the metrics it returns.

## Findings outside the storage layer

- `crates/librefang-runtime/src/backends/surreal_trace.rs:308` reads `annotations` as `None` and `insert_inner` (line 91) never writes it, so the field 052 adds stays empty on the SurrealDB trace path.
- `UsageBackend` (`crates/librefang-memory/src/backend.rs:258`) has no `query_billed_summary`, which the SQLite `UsageStore` has (`crates/librefang-memory/src/usage.rs:1389`), so the spend rollup that `billed_agent_id` feeds is not queryable through the trait.
- `PromptStore::update_experiment_status` (`crates/librefang-memory/src/prompt.rs:547`) reads `started_at` as a non-null `String`, so starting an experiment whose `started_at` is NULL fails with "Invalid column type Null" on the SQLite path.
- Outside tests, the only SurrealDB stores constructed at runtime are the semantic vector backend (`crates/librefang-kernel/src/kernel/vector_backend.rs:148`) and the config store (`crates/librefang-api/src/config_store_overlay.rs:124`); `SurrealSessionBackend`, `SurrealUsageStore`, `SurrealPromptStore`, `SurrealKvBackend`, `SurrealDeviceStore`, `SurrealTaskBackend` and the kernel/runtime TOTP, audit and trace backends are exercised by tests but not wired into boot, so the operational tables above are SurrealDB-ready schema while the live daemon still writes them to SQLite.
- `SurrealTaskBackend::task_reset_stuck` (`crates/librefang-memory/src/backends/surreal_task.rs:44`) still matches `status = 'running'` and an `updated_at` field the schema never defined, while the SQLite path uses `'in_progress'`, `claimed_at`, `timeout_secs` and `retry_count`; nothing writes `task_queue` through SurrealDB yet, so it is recorded here rather than rewritten without a writer to test it against.
- The SQLite-only stores `workflow_store.rs`, `goal_run_store.rs`, `idempotency.rs`, `roster_store.rs`, `passkey_store.rs`, `mcp_config_store.rs`, `template_version_store.rs`, `ephemeral_run_store.rs`, `channel_binding_store.rs` and `agent_tables.rs` (all under `crates/librefang-memory/src/`), and the approval tables in `crates/librefang-kernel/src/approval.rs`, have SurrealDB schema but no SurrealDB backend.
