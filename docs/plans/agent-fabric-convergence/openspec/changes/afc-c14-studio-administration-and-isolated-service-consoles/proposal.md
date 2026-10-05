# Proposal

## Why

The report recommendations REC-009, REC-023 require a coordinated contract across the affected products. Operators can understand ownership, placement, grants and observer behavior from one studio.

## What Changes

- Make teams usable in Work before BossFang integration, with natural-language task entry, workspace selection, member activity, artifacts and durable approvals/recovery.
- Add C14.4: BossFang delegates to the existing Boss-owned UAR instance with scoped authentication, explicit lifecycle ownership and no duplicate sidecar or execution loop.

- Extend existing UAR UI with definition/instance/activation/run/team/workflow distinction, task graph, budgets, binding posture and subscription lag/failures.
- Present correlated operation approvals with separate issuer challenges and authoritative decision state; expose cancel/detach/drain/stop as distinct supported verbs.
- Launch BossFang's existing locally served `/dashboard/` web application as a MiniApp from The Boss Apps screen and from relevant settings links. Enable and package its real dashboard assets in the BossFang sidecar; do not recreate its configuration interface in The Boss.
- In C14.4, package and supervise pinned native BossFang binaries for customer Mac Apple Silicon and Windows x64 installers, binding the managed dashboard to loopback with a resolved live port. An explicitly configured external daemon remains externally owned. C14.3 consumes this payload and its packaging/lifecycle receipts while owning Apps/settings entry points and isolated MiniApp sessions/navigation.
- Keep the BossFang console isolated per instance/account with restricted origins, its own login and browser fallback. Any authentication handoff must use an existing narrow, authenticated contract; never put a credential in the MiniApp URL or grant it The Boss's ambient privileges.

## Capabilities

### New Capabilities

- `studio-administration-and-isolated-service-consoles`: Operators can understand ownership, placement, grants and observer behavior from one studio.

### Modified Capabilities

None in this initiative root. Product-level existing specifications are reconciled before implementation; this proposal does not overwrite them.

## Impact

This is an initiative-level specification. The local OpenSpec root authorizes planning edits only. Before product implementation, create or link repository-scoped changes in each affected worktree with exact file ownership, existing-spec reconciliation, and this change ID. Do not apply sibling code edits from this planning root.

Repositories: the-boss, librefang, universal-agent-runtime. Scope: Existing Boss connection/run/approval views and site-view host; BossFang console API. Full-backlog dependency envelope (historical change-wide scheduling; use the scoped dependencies below): C04, C05, C07, C09, C10. External checkpoints: D-UAR-P1 (definitions in dependencies.md).

Preserve P1 product history and lifecycle architecture; do not duplicate specialized BossFang administration.

Acceptance: Two clients decide one challenge consistently; console account isolation/navigation and no generic privileged bridge are verified; unsupported controls and private data stay hidden.

## Approved customer-priority revision — 2026-10-05

Select C14.1 next. Teams in Work (C14.1/C14.2 with coding portions of C16.1/C16.2) ships first; reusable mixed-team configuration follows. Their prerequisites are accepted C03/C04/C05/C07/C09 contracts, C10.1 only where workflow presentation consumes it, and the relevant existing skill bindings. They do not depend on completing C10 connectors, all of C15, C14.4, or the BossFang MiniApp. Next deliver new C14.4 shared-instance integration, then C14.3 MiniApp; C14.3 depends on C14.4 and the usable-team deliveries. Preserve every original administration, approval and console requirement.

Delivery evidence maps to the original task IDs; partial delivery is not whole-task completion. The parent phase plan and delivery coverage map select bounded repository-owned work. Complete production wiring, UI, strings, persistence and packaged inputs before the build-and-operate boundary; no per-edit verification loop.
