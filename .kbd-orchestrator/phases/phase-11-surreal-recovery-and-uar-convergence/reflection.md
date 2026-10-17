# Reflection — phase-11-surreal-recovery-and-uar-convergence

Closed: 2026-10-17 as **superseded**.
The phase never got past `assess` in KBD: its goals were done out of band on phase branches between 2026-09-27 and 2026-10-11, and the Agent Fabric Convergence phase (`docs/plans/agent-fabric-convergence/.kbd-orchestrator`) took over the UAR work.
This reflection records that outcome so the root waypoint stops pointing at a `/kbd-assess` run against goals that no longer hold.

## Goal dispositions

| Goal | Disposition | Evidence |
|---|---|---|
| G1 SurrealDB regression root cause | MET | `docs/upstream-merges/2026-09-27-surreal-regression.md`, on `main` via merge `066263da7`. The 2026-09-27 sync and the 3.3.0 / surreal-memory bumps were not the cause; the daemon had not used SurrealDB for memory since upstream merge `c767b8d16`. |
| G2 Restore a working state | MET, with carry-forward items | Storage, importer, operational-backend, Surreal memory-backend and kernel vector-backend fixes, on `main` via merge `066263da7` (migration `049_json_value_columns.surql`). Branch-level tests are recorded in `handoffs/codex-handoff-2026-09-27.md`; the consolidation merge itself was source review only, with no re-run. |
| G3 Repair KBD state | MET by this closure | Phase-10 closed at 8/8 on 2026-09-27; this closure makes the phase-11 `progress.json`, `current-waypoint.json`, `position.json` and `project.json` agree. |
| G4 Move the UAR image pin | SUPERSEDED | BossFang no longer bundles or pins a UAR image: `Dockerfile` has no `UAR_IMAGE`, and `CLAUDE.md` (Universal Agent Runtime section) now borrows an independently owned UAR over remote transport. |
| G5 BossFang / UAR / surreal-memory relationship | MET, then superseded | ADR `docs/architecture/decisions/0001-agent-loop-ownership-and-uar-runtime-integration.md` (D-003); the convergence phase replaced S1 sidecar placement with selected-instance borrowing. |

## Carry-forward (not done; any future phase must pick these up deliberately)

- surreal-memory fix `afde32f` (nested `metadata` writes) was never published; `Cargo.toml` still pins rev `b7e2093`, so `semantic_backend_remember_recall_count_forget` stays `#[ignore]`.
- `VectorStore` has no agent/scope on insert, and `SemanticStore::forget` / prune do not delete vectors (trait decision in `librefang-types`).
- `SurrealTaskBackend::task_reset_stuck` filters on an undefined `updated_at`.
- `crates/librefang-kernel/src/backends/` (Surreal approval/TOTP) is not declared in `lib.rs`.
- The operator's local `~/.librefang/` data was last written by SurrealDB 3.0.5; rehearse the one-way upgrade on a copy before the first 3.3.0 boot.

Re-check each item against current `main` before planning; some may have been fixed by convergence-phase work.

## Lesson

A phase whose work moves onto side branches and a second KBD root must be closed at the time, not left at `assess`.
Leaving it open made `/kbd-status` recommend work that was already merged or obsolete.

## Recommended Next Phase

None seeded.
The operator chooses the next phase with `/kbd-new-phase <name>`; the carry-forward list above is a candidate goal set.
