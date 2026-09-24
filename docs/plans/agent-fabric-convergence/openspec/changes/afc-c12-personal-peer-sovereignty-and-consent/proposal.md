# Proposal

## Why

The report recommendations REC-014, REC-017 require a coordinated contract across the affected products. Authorized devices synchronize selected personal documents without requiring vendor cloud.

## What Changes

- Define eligible personal data classes, peer identity/membership, key rotation/recovery and explicit offline grant validity; keep organization/runtime authority outside CRDT writes.
- Compose durable authenticated peer transport and CRDT storage from existing modules; project personal context through consented scopes.
- Implement removal/revocation/tombstone behavior, reconnection and inspectable consent history without claiming deletion of previously disclosed plaintext.

## Capabilities

### New Capabilities

- `personal-peer-sovereignty-and-consent`: Authorized devices synchronize selected personal documents without requiring vendor cloud.

### Modified Capabilities

None in this initiative root. Product-level existing specifications are reconciled before implementation; this proposal does not overwrite them.

## Impact

This is an initiative-level specification. The local OpenSpec root authorizes planning edits only. Before product implementation, create or link repository-scoped changes in each affected worktree with exact file ownership, existing-spec reconciliation, and this change ID. Do not apply sibling code edits from this planning root.

Repositories: know-me-system, know-me-app, flint-realtime-fabric, universal-agent-runtime. Scope: KnowMe personal-data consent/pairing; embeddable Fabric peer profile and grant verification. Dependencies: C01, C02, C04. External checkpoints: D-KNOWME, D-FRF (definitions in dependencies.md).

No blanket storage pin upgrade; measure and negotiate embedded dependency footprint.

Acceptance: Pair two devices, disconnect/edit/reconnect, rotate/recover keys, revoke a peer and exceed offline validity; authorized documents converge and disallowed authority/data do not propagate.
