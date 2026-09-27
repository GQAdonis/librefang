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
