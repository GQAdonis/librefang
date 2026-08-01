# C-URT-001 — truthful UAR readiness through published BossFang consumption

## Intent

Port the proven retained-listener/post-initialization readiness contract to the GQAdonis UAR sync branch, publish the exact repaired commit to public GHCR, and make BossFang consume that artifact.

## Scope

- UAR linked worktree based on `gqadonis/sync-gqadonis-8c7377a1`:
  - `src/bin/uar-sidecar.rs`
  - `src/server.rs`
  - focused tests
  - `openspec/changes/fix-sidecar-ready-contract/**`
- UAR remote sync branch and `Publish Image (GHCR)` workflow.
- BossFang linked worktree:
  - `Dockerfile` UAR image pin only.

## Requirements

1. The sidecar binds `127.0.0.1:0` exactly once and retains that listener until Axum serves it.
2. Configuration/runtime/application initialization happens before stdout emits `READY:{port}`.
3. Startup failure before readiness exits nonzero without a READY line.
4. The existing stdin-EOF shutdown contract remains intact.
5. Tests prove the listener is not released and READY is withheld on initialization failure without scheduler-performance assertions.
6. The change is represented by a valid UAR OpenSpec delta.
7. The repaired commit is integrated into `sync-gqadonis-8c7377a1`; its commit-addressed public GHCR image resolves and contains executable `/usr/local/bin/uar-sidecar`.
8. BossFang pins that exact commit tag, not `latest` or `sidecar-latest`.

## Non-goals

- No embedding of UAR into BossFang.
- No broad upstream production-hardening cherry-pick.
- No socket-activation dependency.
- No changes to the dirty UAR main worktree.

## Rollback

- UAR: revert the sync-branch merge commit.
- BossFang: restore the prior immutable image tag.
- The old image remains addressable by commit SHA.
