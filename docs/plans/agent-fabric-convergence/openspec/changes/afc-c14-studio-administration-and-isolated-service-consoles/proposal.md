# Proposal

## Why

The report recommendations REC-009, REC-023 require a coordinated contract across the affected products. Operators can understand ownership, placement, grants and observer behavior from one studio.

## What Changes

- Extend existing UAR UI with definition/instance/activation/run/team/workflow distinction, task graph, budgets, binding posture and subscription lag/failures.
- Present correlated operation approvals with separate issuer challenges and authoritative decision state; expose cancel/detach/drain/stop as distinct supported verbs.
- Launch BossFang domain console per instance/account with restricted origins, isolated partition and narrow auth handoff; retain browser fallback.

## Capabilities

### New Capabilities

- `studio-administration-and-isolated-service-consoles`: Operators can understand ownership, placement, grants and observer behavior from one studio.

### Modified Capabilities

None in this initiative root. Product-level existing specifications are reconciled before implementation; this proposal does not overwrite them.

## Impact

This is an initiative-level specification. The local OpenSpec root authorizes planning edits only. Before product implementation, create or link repository-scoped changes in each affected worktree with exact file ownership, existing-spec reconciliation, and this change ID. Do not apply sibling code edits from this planning root.

Repositories: the-boss, librefang, universal-agent-runtime. Scope: Existing Boss connection/run/approval views and site-view host; BossFang console API. Dependencies: C04, C05, C07, C09, C10. External checkpoints: D-UAR-P1 (definitions in dependencies.md).

Preserve P1 product history and lifecycle architecture; do not duplicate specialized BossFang administration.

Acceptance: Two clients decide one challenge consistently; console account isolation/navigation and no generic privileged bridge are verified; unsupported controls and private data stay hidden.
