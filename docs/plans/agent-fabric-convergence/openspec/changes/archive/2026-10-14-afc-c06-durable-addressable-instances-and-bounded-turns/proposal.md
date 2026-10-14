# Proposal

## Why

The report recommendations REC-006, REC-026, REC-027, REC-028, REC-035 require a coordinated contract across the affected products. Stateful instances survive activation changes without becoming immortal model loops.

## What Changes

- Implement owner-scoped instance/deployment records and request/on-demand/resident profiles over existing thread execution; fresh context per turn.
- Persist activation state and ownership epochs with bounded inbox/retention; serialize mutating turns and keep cancel/status outside the turn queue.
- Implement activate/passivate/drain/disable/restart policies, repeat-safe hooks, durable reminders and bounded restart budgets.

## Capabilities

### New Capabilities

- `durable-addressable-instances-and-bounded-turns`: Stateful instances survive activation changes without becoming immortal model loops.

### Modified Capabilities

None in this initiative root. Product-level existing specifications are reconciled before implementation; this proposal does not overwrite them.

## Impact

This is an initiative-level specification. The local OpenSpec root authorizes planning edits only. Before product implementation, create or link repository-scoped changes in each affected worktree with exact file ownership, existing-spec reconciliation, and this change ID. Do not apply sibling code edits from this planning root.

Repositories: universal-agent-runtime, surreal-memory-server. Scope: UAR existing actor/thread host, instance store and activation ownership; memory API only if an evidenced gap requires it. Dependencies: C02, C03, C04. External checkpoints: D-UAR-P1, D-MEMORY (definitions in dependencies.md).

Single-host ownership first; cross-host automatic takeover stays disabled until C18 fencing evidence.

Acceptance: Two users instantiate one definition without leakage; crash/passivate/reactivate preserves admitted work; stale owner cannot commit; cancel remains responsive during a blocked tool.
