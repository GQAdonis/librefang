# Goals: phase-11-surreal-recovery-and-uar-convergence

Seeded from: operator direction on 2026-09-27 (phase-10's `reflection.md` has no "Recommended Next Phase" section).
Created: 2026-09-27T21:00:59Z

## Operating mode

All work runs through the `bossfang-stewards` agent team, roles in parallel in isolated worktrees, with `merge-reviewer` reviewing every change before it merges to `main` (see "Default operating mode" in `CLAUDE.md`).

## Goals

### G1 — Root-cause the SurrealDB regression (owner: surrealdb-schema-engineer)

The SurrealDB integration worked before the 2026-09-27 upstream sync and SurrealDB 3.3.0 upgrade (PRs #136 and #137).
Produce an evidence-backed explanation of what broke, which commit broke it, and why it was not caught.
Establish the last known-good baseline by running the same tests at the pre-sync commit and bisecting across the sync, the SurrealDB `=3.2.4` → `=3.3.0` bump, and the surreal-memory `f9ab1c2` → `b7e2093` bump.
Separate regressions we introduced from defects that already existed.

### G2 — Restore a working state (owners: surrealdb-schema-engineer, bossfang-feature-steward)

Every SurrealDB-backed surface works in embedded (RocksDB) and remote (ws/http) mode, proven by tests: the operational pool and migrations, sessions and canonical sessions, semantic memory (`remember` / `knn_recall` / `forget` / `count`), proactive memory, the vector store, the SQLite → SurrealDB importer, and kernel boot with the Surreal backends selected.
Deployed configuration (k8s manifests, Dockerfile, data-migration notes) is consistent with the pinned SurrealDB version.
If a fix belongs in surreal-memory, it lands there and the pin moves to it.

### G3 — Repair KBD state (owner: product-manager)

Close phase-10 consistently: one completion counter, a reflection-complete stage, and evidence / certification / publication recorded or explicitly waived.
Record the out-of-band work of 2026-09-27 (PRs #135–#139) in the KBD history.
`project.json`, `current-waypoint.json` and `position.json` agree.

### G4 — Move the UAR pin to the latest runtime (owner: bossfang-feature-steward)

Update `ARG UAR_IMAGE` in `Dockerfile` to an image built from the latest `universal-agent-runtime` commit, confirm the image exists, and verify the sidecar contract (`READY` handshake, health, supervised lifecycle) still holds.
Update every other reference to the old runtime revision.

### G5 — Resolve the BossFang / UAR / surreal-memory relationship (owner: product-manager, analysis stage)

Use the `deep-research` skill to determine how BossFang, the Universal Agent Runtime, surreal-memory and the-boss (`/Users/gqadonis/Projects/prometheus/the-boss`, which bundles all three) should work together and stay consistent.
Answer explicitly: who owns the agent loop (BossFang's kernel/runtime or UAR); how UAR is offered as a runtime from BossFang both embedded and remote; where the two projects overlap (agent loop, LLM drivers, memory, tools, sessions, storage) and which side owns each capability; and how versions (SurrealDB, surreal-memory) stay aligned across all three.
Output a recommended architecture with a decision record, and a migration path from today's state.

## Acceptance

- G1 explanation is written to `docs/upstream-merges/2026-09-27-surreal-regression.md` with commit SHAs and test evidence.
- G2 surfaces each have a passing embedded test and a remote test that was actually run against a live SurrealDB server.
- G3 `/kbd-status` renders without contradictions.
- G4 `Dockerfile` pins the latest runtime image, and the sidecar integration tests pass.
- G5 research package and decision record exist and are reviewed by `merge-reviewer`.

## Goal status

Goals are tracked here, not in `progress.json`: the progress schema (`progress.schema.json`) tracks changes only, and changes are created at `/kbd-plan`.
`/kbd-assess` updates this table.

| Goal | Status | Updated |
|---|---|---|
| G1 — Root-cause the SurrealDB regression | NOT MET | 2026-09-27 |
| G2 — Restore a working state | NOT MET | 2026-09-27 |
| G3 — Repair KBD state | PARTIAL | 2026-09-27 |
| G4 — Move the UAR pin to the latest runtime | NOT MET | 2026-09-27 |
| G5 — Resolve the BossFang / UAR / surreal-memory relationship | MET | 2026-09-27 |

G3 is PARTIAL, not MET.
The committed files agree: `project.json`, `current-waypoint.json`, `current-waypoint.md` and `position.json` all place phase-11 at `assess_pending` (waypoint revision 74), phase-10 is closed at `reflect_complete`, and `/kbd-status` renders them without contradiction (commit `5622f35d7`, decision-log D-002).
The canonical runtime journal (`prometheus kbd status`) still sits at revision 4 on the phase-10 run and names `C-URT-001` as next work, and re-anchoring it is a shared-resource change awaiting operator approval.
Any KBD step that transitions state through `prometheus kbd` (for example `/kbd-reflect`) would act on that stale state, so G3 becomes MET only once the journal agrees with the committed files.

G5 is MET: the research package (`analysis.md`, `docs/research/bossfang-uar-convergence/`) and ADR 0001 were reviewed and approved by `merge-reviewer` at `d01f5dd14`, and the operator decided placement and scope on 2026-09-27 (decision-log D-003).
Six G5 questions remain open and are listed in D-003; none blocks this phase's implementation targets.

## Implementation targets for `/kbd-plan`

From ADR 0001 "Migration", scoped by decision-log D-003 (foundation only; M5a–M5c move to phase-12).
These are the UAR-convergence targets; the G1/G2 SurrealDB recovery changes are planned alongside them.

| Step | Change | Owner | Depends on |
|---|---|---|---|
| M1 | Adopt ADR 0001 (status set to Accepted 2026-09-27); add the feature-ledger entries | product-manager | — |
| M2 | SurrealDB alignment guard in CI, including the SurrealDB version inside `UAR_IMAGE` | surrealdb-schema-engineer | — |
| M3 | Model gateway via `/v1/messages`; capability check off `/api/chat/completion`; one-release switch for `provider = "uar"` agents with a release note and no deprecated alias | bossfang-feature-steward | UAR field change for full inference-parameter fidelity |
| M4 | Executor seam at the kernel dispatch point, native implementation only | bossfang-feature-steward | — |
| G4 | Move `UAR_IMAGE` to at or after `3d6bf056`; verify the sidecar contract (`READY`, health, supervised lifecycle) | bossfang-feature-steward | — |
