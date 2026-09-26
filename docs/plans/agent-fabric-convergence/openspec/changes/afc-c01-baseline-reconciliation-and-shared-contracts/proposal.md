# Proposal

## Why

The report recommendations REC-007, REC-011, REC-012, REC-042 require a coordinated contract across the affected products. Rebind every REC item to current source or accepted dependency, with exact commits and explicit owner.

## What Changes

- Refresh source and lockfile/feature evidence; classify every historical gap as retained, superseded, externally owned or unresolved. Deliver baseline-ledger.json for all 11 repositories named in repository-manifest.json, recording baseline/current revision, owner, disposition, blocking dependency and acceptance reference.
- Record accepted P1 conversation/execution/approval contract and per-module ownership; leave overlapping implementation blocked until checkpoint agreement.
- Publish versioned identity/state/action vocabulary, dependency compatibility matrix and ordered adoption/rollback checkpoints.

## Capabilities

### New Capabilities

None. Documentation and baseline reconciliation only; skip_specs is true.

### Modified Capabilities

None in this initiative root. Product-level existing specifications are reconciled before implementation; this proposal does not overwrite them.

## Impact

This is an initiative-level specification. The local OpenSpec root authorizes planning edits only. Before product implementation, create or link repository-scoped changes in each affected worktree with exact file ownership, existing-spec reconciliation, and this change ID. Do not apply sibling code edits from this planning root.

Repositories: librefang, universal-agent-runtime, the-boss, flint-gate, flint-realtime-fabric, flint-forge, surreal-memory-server, know-me-app, know-me-system, prometheus-skill-pack, prometheus-skills-mini. Scope: Planning directory; read-only product source and existing phase records. Dependencies: none. External checkpoints: D-UAR-P1, D-MINI, D-FRF, D-FORGE, D-GATE, D-KNOWME, D-MEMORY (definitions in dependencies.md).

No product code; later changes may start only after their relevant dependency checkpoint is satisfied.

Acceptance: Every REC has a source disposition, owner and acceptance reference; all 11 baselines resolve; no unresolved ownership is labeled execution-ready.
