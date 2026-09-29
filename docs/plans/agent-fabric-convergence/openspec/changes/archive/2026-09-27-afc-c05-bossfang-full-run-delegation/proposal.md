# Proposal

## Why

The report recommendations REC-001, REC-005, REC-013 require a coordinated contract across the affected products. A BossFang task can delegate one complete run while retaining its own workflow.

## What Changes

- Add a full-harness route distinct from the existing HTTP model provider; preserve native execution and translated definition diagnostics.
- Map admission, steer, observe, approve, cancel, detach and native task IDs with durable or truthfully ephemeral retention metadata.
- Reconcile unknown admission/effect outcomes and unify externally visible A2A task lookup authority without a second loop or tool replay.

## Capabilities

### New Capabilities

- `bossfang-full-run-delegation`: A BossFang task can delegate one complete run while retaining its own workflow.

### Modified Capabilities

None in this initiative root. Product-level existing specifications are reconciled before implementation; this proposal does not overwrite them.

## Impact

This is an initiative-level specification. The local OpenSpec root authorizes planning edits only. Before product implementation, create or link repository-scoped changes in each affected worktree with exact file ownership, existing-spec reconciliation, and this change ID. Do not apply sibling code edits from this planning root.

Repositories: librefang, universal-agent-runtime. Scope: BossFang runtime/task delegation, channel workflow references and UAR public run adapter; no librefang-cli edits. Dependencies: C02, C03, C04. External checkpoints: D-UAR-P1 (definitions in dependencies.md).

Retain existing native route; stage consumer capability requirements after provider support.

Acceptance: Trace direct versus delegated execution; lose responses and reconnect; one executor and one side effect remain, cancellation reaches UAR, unsupported recovery is explicit.
