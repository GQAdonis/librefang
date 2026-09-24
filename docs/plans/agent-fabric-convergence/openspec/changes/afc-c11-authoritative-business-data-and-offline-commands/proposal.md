# Proposal

## Why

The report recommendations REC-015, REC-016, REC-025 require a coordinated contract across the affected products. Offline business edits reconcile to one domain transaction and authorized read projections.

## What Changes

- Adopt accepted production-readiness changes; document route-specific auth/RLS and cursor/tombstone semantics.
- Persist pending command atomically with local state; preserve idempotency through Forge transaction and authoritative result lookup.
- Publish committed outbox/CDC facts and rebuild scoped read models with deletion/revocation and explicit retention-gap resnapshot.

## Capabilities

### New Capabilities

- `authoritative-business-data-and-offline-commands`: Offline business edits reconcile to one domain transaction and authorized read projections.

### Modified Capabilities

None in this initiative root. Product-level existing specifications are reconciled before implementation; this proposal does not overwrite them.

## Impact

This is an initiative-level specification. The local OpenSpec root authorizes planning edits only. Before product implementation, create or link repository-scoped changes in each affected worktree with exact file ownership, existing-spec reconciliation, and this change ID. Do not apply sibling code edits from this planning root.

Repositories: flint-forge, flint-realtime-fabric, flint-gate, know-me-system, know-me-app. Scope: Forge domain commands/RLS/realtime adapters; KnowMe durable intent/read-model lanes; Fabric delivery. Dependencies: C01, C02, C04. External checkpoints: D-FORGE, D-FRF, D-GATE, D-KNOWME (definitions in dependencies.md).

Keep Forge-only applications independent of agent runtimes; schema changes append migrations and preserve rollback constraints.

Acceptance: Crash before/after commit and publication; replay duplicate/out-of-order commands and deletes; prove tenant isolation and pending versus committed UI states through real storage/network boundaries.
