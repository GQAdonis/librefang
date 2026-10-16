# SurrealDB migration playbook

When upstream adds new SQLite schema, BossFang must add the matching
SurrealDB migration to keep the SurrealDB-as-default storage backend
in sync. This is the BossFang-exclusive Subsystem #1 — failing to add
the migration silently leaves the new feature broken on
`--features surreal-backend` (the default).

## When this fires

`scripts/scan-new-schema.sh` greps the merge diff for:

- `CREATE TABLE`
- `ALTER TABLE`
- `ADD COLUMN`
- `CREATE INDEX`

Hits anywhere in `crates/**/*.rs` or `*.sql` files in the merged-in
upstream commits indicate new schema. Manually inspect each hit to
decide if it requires a SurrealDB equivalent (some `ALTER TABLE` hits
are inside test fixtures that don't ship in production — those don't
need migrations).

## Migration registry

- File registry: `crates/librefang-storage/src/migrations/sql/NNN_<name>.surql`
- Code registry: `crates/librefang-storage/src/migrations/mod.rs` (list of `(version, name)` tuples)
- Runner: `crates/librefang-storage/src/migrations/runner.rs`

The runner enforces SHA256 checksum drift detection. Once a migration
is applied to any database, editing the file in place is forbidden —
the runner refuses to start with `MigrationError::ChecksumDrift`.
Always add a new migration (next version number); never edit applied ones.

## Numbering

Look at the highest existing version in `mod.rs`. New migrations use
the next zero-padded three-digit number. As of the current snapshot
the latest is `029_sessions_model_override.surql`, so the next is `030`.

## Writing the .surql file

Pattern: each migration is a single SurrealQL transaction. Use:

```surrealql
-- NNN_<descriptive_name>.surql
-- Mirrors upstream SQLite migration: <reference, e.g. PR #4901 or commit SHA>

BEGIN TRANSACTION;

DEFINE TABLE <name> SCHEMAFULL;

DEFINE FIELD <field> ON TABLE <name> TYPE <type> ASSERT <assertion>;

DEFINE INDEX <idx_name> ON TABLE <name> COLUMNS <fields> [UNIQUE];

COMMIT TRANSACTION;
```

For an `ALTER TABLE ADD COLUMN` upstream change: equivalent is
`DEFINE FIELD <new_field> ON TABLE <existing_table> TYPE <type>`.

For an `ADD INDEX`: `DEFINE INDEX <name> ON TABLE <table> COLUMNS
<fields>` (add `UNIQUE` if upstream did).

## Registering the migration

Edit `crates/librefang-storage/src/migrations/mod.rs`. The registry is
a simple `&[(version, name)]` slice. Append:

```rust
(30, "new_thing_v1"),
```

Filename must match: `crates/librefang-storage/src/migrations/sql/030_new_thing.surql`.

## Verifying

```bash
# Compile-check the storage crate in isolation
cargo check -p librefang-storage --lib

# If you have a SurrealDB instance around for full integration tests
cargo test -p librefang-storage migrations::
```

The migration registry round-trips through `bootstrap_schema()` on
every kernel boot — a syntax error in your `.surql` will surface on
first daemon start.

## Fork-only SQLite steps in `librefang-memory/src/migration.rs`

The SQLite ladder (`run_step!(N, migrate_vN)`) is upstream's, but BossFang occasionally adds its own step (2026-10-10: the workflow `cancelled` state, shipped as v62).
When upstream later claims the same number, keep upstream's number and body, and move the fork step to the next free number above upstream's ladder (2026-10-16: fork v62 → v64, upstream v62 `task_queue.timeout_secs`, v63 `ephemeral_runs.truncated`).
A database the fork build already stamped at N never runs upstream's step N (`run_step!` gates on `current_version < N`), so the renumbered fork step must also apply upstream's step-N DDL when it is missing and move the audit row for N back to upstream's description — the same repair upstream's own `migrate_v62` makes for its 61 renumber.
Make the fork step idempotent so it can float to the top again on the next collision, and add a test that stamps a database at the old fork number and asserts it reaches `SCHEMA_VERSION` with upstream's column present.
Every fork-only SQLite step also needs its SurrealDB counterpart: the 2026-10-16 sync found `027_workflow_runs.surql` still asserting `state IN [..., 'failed']` without `'cancelled'`.

## Common pitfalls

- **Type-name mismatch**: SQLite `INTEGER` → SurrealQL `int`; `TEXT` → `string`; `BLOB` → `bytes`; `REAL` → `float`; `BOOLEAN` → `bool`. There's no exact map; pick the closest semantic type.
- **NULL handling**: SurrealDB treats `NULL` differently from SQLite. Prefer `TYPE option<T>` for nullable fields.
- **Foreign keys**: SurrealDB uses record-id references (`record<other_table>`), not numeric FKs. The semantic is the same but the storage shape differs.
- **Indexes**: SQLite `CREATE UNIQUE INDEX` → SurrealDB `DEFINE INDEX ... UNIQUE`. Without `UNIQUE` it's a regular search index.
- **Timestamps**: SurrealDB has a native `datetime` type. Use it instead of an `int` Unix timestamp when the upstream SQLite column is meant as a time.
- **Forgetting `BEGIN TRANSACTION` / `COMMIT TRANSACTION`**: SurrealDB will still apply the statements but the migration's atomicity guarantees won't hold.
- **Adding migrations 029.5 / inserting between numbers**: the runner expects strictly increasing version numbers. Pick the next integer; renumber existing migrations only if you haven't pushed.

## Reference: existing migrations

Browse `crates/librefang-storage/src/migrations/sql/` to see patterns
for common upstream concerns:

- `001_audit_entries.surql` — basic schemaful table
- `019_retention_timestamps.surql` — adding fields to existing tables
- `024_idempotency_keys.surql` — composite-key table with TTL semantics
- `029_sessions_model_override.surql` — adding a nullable optional column
