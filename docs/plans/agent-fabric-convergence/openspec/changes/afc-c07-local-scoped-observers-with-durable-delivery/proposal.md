# Proposal

## Why

The report recommendations REC-029, REC-030, REC-034 require a coordinated contract across the affected products. An authorized observer watches selected agents/conversations and recovers missed work.

## What Changes

- Define stable semantic occurrence/provenance identities and source commit/outbox publication; separate ephemeral token streams.
- Persist subscription revision, source/conversation intersection, projection grant, watermark, cursor, inbox admission and per-observer acknowledgement.
- Activate independent bounded monitor turns with current authority; expose pause/backlog/retention/dead-letter state and replay-as-observe default.

## Capabilities

### New Capabilities

- `local-scoped-observers-with-durable-delivery`: An authorized observer watches selected agents/conversations and recovers missed work.

### Modified Capabilities

None in this initiative root. Product-level existing specifications are reconciled before implementation; this proposal does not overwrite them.

## Impact

This is an initiative-level specification. The local OpenSpec root authorizes planning edits only. Before product implementation, create or link repository-scoped changes in each affected worktree with exact file ownership, existing-spec reconciliation, and this change ID. Do not apply sibling code edits from this planning root.

Repositories: universal-agent-runtime. Scope: UAR committed-event publication, subscription store/inbox and monitor admission API. Dependencies: C02, C03, C06. External checkpoints: D-UAR-P1 (definitions in dependencies.md).

No forged shared parent root and no UI-SSE lifetime coupling; optional Fabric adapter follows C08.

Acceptance: Two monitors receive independent copies; producer/conversation filters prevent leakage; crash at publish/admit/ack boundaries recovers without silent loss; revocation blocks queued content.
