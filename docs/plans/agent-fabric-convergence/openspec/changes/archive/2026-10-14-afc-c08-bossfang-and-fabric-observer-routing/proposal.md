# Proposal

## Why

The report recommendations REC-024, REC-031, REC-032, REC-033 require a coordinated contract across the affected products. Channel messages reach their declared handler and authorized observer copies across hosts.

## What Changes

- Normalize provider/account/workspace/room/thread/sender plus chosen recipient into durable mappings; specify addressing and handler precedence with conflict behavior.
- Authorize source disclosure and recipient delivery/execution; retain source occurrence across forwarding and separate per-observer cursors from worker queue groups.
- Preserve route affinity on restart, enforce reply scopes, echo/action deduplication and causal-depth/fanout budgets; make executor control distinct from stream detach.

## Capabilities

### New Capabilities

- `bossfang-and-fabric-observer-routing`: Channel messages reach their declared handler and authorized observer copies across hosts.

### Modified Capabilities

None in this initiative root. Product-level existing specifications are reconciled before implementation; this proposal does not overwrite them.

## Impact

This is an initiative-level specification. The local OpenSpec root authorizes planning edits only. Before product implementation, create or link repository-scoped changes in each affected worktree with exact file ownership, existing-spec reconciliation, and this change ID. Do not apply sibling code edits from this planning root.

Repositories: librefang, universal-agent-runtime, flint-realtime-fabric, flint-gate. Scope: BossFang source adapters/routing, Fabric envelope/consumer adapter and UAR recipient bridge. Dependencies: C05, C07. External checkpoints: D-FRF, D-GATE (definitions in dependencies.md).

Adapt accepted D-FRF control semantics before changing APIs; transport never becomes the agent executor.

Acceptance: Restart each host while forwarding, match two handlers, replay and echo posts, revoke a queued subscription and test A-B-A reactions; no wrong recipient, duplicate action or hidden gap.
