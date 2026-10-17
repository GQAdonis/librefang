Task model assignments: see `.kbd-orchestrator/phases/phase-12-sync-uar-refresh-dot-facade/plan.md` → "Task model assignments", rows keyed by this change ID.

## 1. Audit
- [ ] 1.1 Diff the merged SQLite schema (all `CREATE TABLE` / `ALTER TABLE` / `ADD COLUMN` in consumed upstream commits) against `crates/librefang-storage/src/migrations/sql/` and `migrations/mod.rs`, and list every missing Surreal equivalent.

## 2. Complete
- [ ] 2.1 Add or renumber migrations for every gap from 1.1 (after the merged head's highest number) and register them.
- [ ] 2.2 Ensure the Surreal backends read and write each parity column, and that the manifest-version and ephemeral-run stores are selected whenever the Surreal backend is active.
- [ ] 2.3 Verify `SurrealTaskBackend::task_reset_stuck` (rewritten in `107f38cd3`) filters only on fields the schema defines; fix only if regressed.

## 3. Verify
- [ ] 3.1 Add embedded tests for each parity column, store and `task_reset_stuck`, plus remote variants actually run against a local SurrealDB 3.3.0 (`BOSSFANG_TEST_SURREAL_URL` set; a SKIP is not acceptable for this change). `cargo test -p librefang-storage` and `-p librefang-memory` must exit 0. The workspace gates are re-run in C-001 task 3.1.
