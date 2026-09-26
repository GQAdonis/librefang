# Proposal

## Why

The report recommendations REC-008, REC-043, REC-044, REC-045 require a coordinated contract across the affected products. Reusable teams coordinate bounded tasks without sharing all authority or memory.

## What Changes

- Persist team instance/member revisions and task input/output/dependency contracts; support supervisor-worker, bounded map/reduce and peer board.
- Implement atomic claim/reassign with fenced epochs, task-state transitions, narrowed child authority, team mailbox grants and independent reviewer assignment.
- Enforce aggregate reservations, selected context/artifact namespaces, membership revocation and canonical usage deduplication.

## Capabilities

### New Capabilities

- `bounded-teams-and-shared-task-board`: Reusable teams coordinate bounded tasks without sharing all authority or memory.

### Modified Capabilities

None in this initiative root. Product-level existing specifications are reconciled before implementation; this proposal does not overwrite them.

## Impact

This is an initiative-level specification. The local OpenSpec root authorizes planning edits only. Before product implementation, create or link repository-scoped changes in each affected worktree with exact file ownership, existing-spec reconciliation, and this change ID. Do not apply sibling code edits from this planning root.

Repositories: universal-agent-runtime, surreal-memory-server. Scope: UAR team domain/store, existing thread admission and memory scopes. Dependencies: C02, C03, C04, C06. External checkpoints: D-UAR-P1, D-MEMORY (definitions in dependencies.md).

No replacement thread engine, global shared transcript or union of member permissions.

Acceptance: Competing workers cannot own one revision; stale worker/removal cannot cause new protected effect; parent cancel and independent peer lifetime remain distinct; team cap holds under concurrency.
