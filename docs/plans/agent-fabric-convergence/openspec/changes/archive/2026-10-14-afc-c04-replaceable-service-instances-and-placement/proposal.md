# Proposal

## Why

The report recommendations REC-002, REC-003, REC-004 require a coordinated contract across the affected products. Choose local, managed, external or remote instances with explicit identity and ownership.

## What Changes

- Extend accepted P1 binding with stable instance identity, API/profile capabilities, workspace location, endpoint and credential references.
- Integrate managed versus externally owned lifecycle, new-session placement and reattachment; never silently spawn a fallback.
- Expose effective binding and compatibility diagnostics with one supervisor and separate model/runtime/console endpoints.

## Capabilities

### New Capabilities

- `replaceable-service-instances-and-placement`: Choose local, managed, external or remote instances with explicit identity and ownership.

### Modified Capabilities

None in this initiative root. Product-level existing specifications are reconciled before implementation; this proposal does not overwrite them.

## Impact

This is an initiative-level specification. The local OpenSpec root authorizes planning edits only. Before product implementation, create or link repository-scoped changes in each affected worktree with exact file ownership, existing-spec reconciliation, and this change ID. Do not apply sibling code edits from this planning root.

Repositories: universal-agent-runtime, the-boss, librefang. Scope: Existing runtime driver/service registry, connection inventory and service capability endpoints. Dependencies: C01, C02, C03. External checkpoints: D-UAR-P1 (definitions in dependencies.md).

No live-session migration implied; credentials stay in host stores.

Acceptance: Select two UAR instances, refuse unsupported required capability and wrong identity, close a nonowner client without stopping service, distinguish new run from migration.
