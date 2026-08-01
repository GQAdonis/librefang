# C-URT-002 — identity-safe KBD migration and durable focused control

## Intent

Make canonical KBD initialization safe for BossFang's real legacy ledger, install a durable explicit daemon focus, and prove typed command commit/idempotency/restart replay end to end.

## Scope

- Prometheus skill-system linked worktree:
  - `substrate/kbd-runtime/src/lib.rs`
  - focused runtime tests/fixtures
  - `shared/launchagents/ai.prometheus.sovereign-sync.plist`
  - `shared/systemd/ai.prometheus.sovereign-sync.service`
  - `scripts/install-mcp-services.sh`
  - focused installer tests/docs if implicated
- BossFang linked worktree:
  - `.prometheus/project.json`
  - KBD compatibility projections generated only by the repaired runtime.
- Local installed `prometheus` and `sovereign-sync` binaries and managed service definition.

## Requirements

1. Annotated statuses such as `DONE (merged #108 ...)` import as complete, while near-matches such as `DONEISH` remain pending.
2. Nested legacy child directories import with canonical IDs and correct `parent_phase_id`; duplicate child slugs under different parents cannot collide.
3. The active waypoint slug path maps to the corresponding canonical phase-ID path.
4. Existing migration backup, identity, signature, and replay guarantees remain intact.
5. The service installer accepts a validated KBD focus project path and renders it into macOS and Linux definitions; reinstall/restart preserves the focus.
6. BossFang's immutable manifest is tracked and contains no credential.
7. Migration dry-run reports expected files with no invalid/alias-conflict rows; apply creates a SHA-256 backup manifest.
8. Generated parent progress remains 5/8 before the current parent changes are reconciled, and both child relationships remain nested.
9. An authenticated typed mutation advances revision, duplicate command ID is idempotent, and the state survives full Sovereign Sync restart/replay.
10. No manual projection edits are used to manufacture canonical state.

## Non-goals

- No multi-project daemon registry.
- No weakening of signatures, expected-revision checks, idempotency, or Raft persistence.
- No destructive deletion of the failed migration runtime; it may be archived recoverably after proof.

## Rollback

- Migration: restore the newest automatic migration backup after verifying its SHA-256 manifest.
- Service: restore the previous plist/unit and fully reload it.
- Binaries: preserve the previously installed binaries before replacement.
- Source: revert the Prometheus repair commit.
