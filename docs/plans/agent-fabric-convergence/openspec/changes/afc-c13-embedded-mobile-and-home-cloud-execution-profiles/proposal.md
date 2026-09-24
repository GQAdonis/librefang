# Proposal

## Why

The report recommendations REC-020, REC-021, REC-036 require a coordinated contract across the affected products. KnowMe chooses an honest local or remote execution path across suspension and outages.

## What Changes

- Reconcile local model/tool loop with embedded UAR route; pin SDK/features and preserve each product layer contract.
- Specify offline/local, home, personal-cloud and enterprise profiles with required/optional services, inference availability and approved context placement.
- Wire suspend/resume, pending/offline authority and persistent remote job observation; consume C11/C12 when enabling their data profiles.

## Capabilities

### New Capabilities

- `embedded-mobile-and-home-cloud-execution-profiles`: KnowMe chooses an honest local or remote execution path across suspension and outages.

### Modified Capabilities

None in this initiative root. Product-level existing specifications are reconciled before implementation; this proposal does not overwrite them.

## Impact

This is an initiative-level specification. The local OpenSpec root authorizes planning edits only. Before product implementation, create or link repository-scoped changes in each affected worktree with exact file ownership, existing-spec reconciliation, and this change ID. Do not apply sibling code edits from this planning root.

Repositories: know-me-system, know-me-app, universal-agent-runtime, librefang. Scope: KnowMe Rust core runtime routes, mobile lifecycle adapter and selected home/cloud binding. Dependencies: C04, C06. External checkpoints: D-KNOWME, D-UAR-P1 (definitions in dependencies.md).

C11/C12 are additional prerequisites for enterprise-sync/peer modes; basic standalone embedding does not depend on them. Acceptance is evaluated per profile: standalone embedding requires C04/C06; enterprise sync additionally requires C11; personal peer or home/cloud context requires C12; combined profiles require both C11 and C12. Private context upload is blocked until the corresponding grant boundary is proven.

Acceptance: Physical supported mobile device and desktop prove local useful work offline, correct suspension and remote continuity, no duplicate fallback and no private-memory upload without grant.
