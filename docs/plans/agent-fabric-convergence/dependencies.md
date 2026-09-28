# Dependencies, ownership and isolation

## Protected external work

| Dependency | Existing scope / location | Required convergence checkpoint |
|---|---|---|
| D-UAR-P1 | Accepted The Boss 2.2.3 Windows x64 and Apple Silicon closeout; frozen `the-boss.uar.sidecar/1` contract; mini closeout `5f43a25dd027311a8bcbc690eed022031d45aafd` | Accepted. Consume the recorded conversation/execution/approval ownership and immutable release evidence. Windows occupied-port fallback remains unobserved. Later work still requires its own change dependencies, repository-scoped tasks and explicit owner; P2-P5 are not complete. |
| D-MINI | Original mini local shipping commits diverge from origin/main; original full pack has uncommitted distribution/context changes | Reconcile exact shipped/accepted commit through the owning work. Never replace it with an older pin because the branch name matches. Reuse merged agent-team skills. |
| D-FRF | Fabric `codex/production-readiness-integration`, with pending work and local commits. C08 candidate source `8966d6b` is **not** an accepted checkpoint. | Map agent-control semantics, identity, shape/replay/sync and observer features to accepted work before enabling C08 cross-host consumers. Candidate revisions are source leads, not conformance evidence. |
| D-FORGE | Forge production-readiness branch plus database-role and GraphQL worktrees | Agree domain-write/outbox/RLS/shape contract; preserve role and GraphQL changes. |
| D-GATE | Gate `codex/aso-task-status-projection` and existing authorization/stream edits. C08 candidate source `27e2e75` is **not** an accepted checkpoint. | Establish owner and disposition for token exchange, approval storage, transport PEP and task projection before enabling C08 source-disclosure or delivery grants. Candidate revisions are source leads, not conformance evidence. |
| D-KNOWME | App `main`; system `feat/embedded-memory-crud` with vendor/config/spec WIP | Preserve app/system identities, Rust-core ownership, consent and embedding contracts; explicitly reconcile any duplicate local loop. |
| D-MEMORY | surreal-memory original dependency branch and newer fetched main | Record exact auth/namespace/storage API and pins. Sharing uses a service or designated in-process handle, never two processes opening one embedded directory. |

The C01 [compatibility matrix](.kbd-orchestrator/phases/agent-fabric-convergence/c01/dependency-compatibility-matrix-v1.md) records the exact source anchor, boundary type, accepted capability, unresolved incompatibility, owner and rollback anchor for every repository. The [adoption contract](.kbd-orchestrator/phases/agent-fabric-convergence/c01/adoption-rollback-checkpoints-v1.md) keeps unresolved external checkpoints blocked and orders provider adoption before consumer enforcement.

No messages or dispatches were sent to the other task. Ownership described here is a planning reservation based on its recorded plan, not an agreement to transfer work.

## Merge protocol

1. Before a slice starts, fetch only; record default-branch and dependency SHAs and compare with the manifest. Do not auto-pull or rebase an active writer's branch.
2. Classify each relevant incoming change as already merged, dependency to adopt, conflicting contract, or unrelated. Review exact commits and uncommitted work boundaries with the owner.
3. Incorporate an agreed immutable checkpoint into this initiative's corresponding worktree. No force-push, reset, broad stash or cherry-pick of guessed fixes. Update the manifest and compatibility matrix in the same planned change.
4. Implement one coherent slice and validate its real boundary. Merge provider capability before dependent consumers require it; use capability negotiation or a documented compatibility window.
5. Commit submodule/git dependency pins only after the target commit is available from its configured remote. A collection of matching branches is never an atomic release.

The convergence branches are local planning branches. No new PR, remote publication or deployment is implied by their creation. Future PRs should be small ordered slices; avoid one long-running ecosystem-wide merge.

## Resource isolation

Use separate Rust target directories, Node outputs, test workspaces, database files/namespaces, app-data directories, queues, ports and service credentials for convergence. Do not modify installed skill deployment, launch agents, shared Docker volumes or the running UAR/Boss services to test this branch. Reserve one local Rust build writer at a time while the existing integration uses this memory-constrained host. Plan platform runners before expensive compilation.

Only this directory's independent KBD identity is activated. Product roots may contain tracked identities or absolute `focus_project_path` fields copied from another checkout: do not run their KBD commands until ownership/identity isolation is explicitly resolved. Use the initiative's exact path for every transition. Local logs and memory indexes are evidence, not shared write locks.

## Initial ownership

The convergence planner owns this planning directory and the 11 new branch/worktree registrations. No product implementation file is claimed yet. A future dispatch must name repository, change/task IDs, file/module write scope, dependency checkpoint, model/harness, output directory and review owner. Two sessions may read the same source; only one writes a given assigned surface.
