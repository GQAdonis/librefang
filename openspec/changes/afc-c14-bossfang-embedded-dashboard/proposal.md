# BossFang embedded dashboard for The Boss MiniApp

## Why

The Boss will open BossFang's existing `/dashboard/` as a local MiniApp. BossFang's ordinary Rust build tolerates an empty `static/react` directory, producing a valid executable that cannot serve a usable dashboard when its BossFang-default embedded-only mode is active.

## What changes

- Require a built Vite dashboard in the native sidecar release build; reject a missing shell, JavaScript, stylesheet, or wrong base path before producing the binary.
- Keep the existing `bossfang` executable, dashboard routes, authentication flow, configuration API, and branding. The Boss owns process supervision, private configuration, endpoint selection, and MiniApp containment.

## Impact

The release build of `librefang-api` is affected only when `BOSSFANG_REQUIRE_EMBEDDED_DASHBOARD=1`. Ordinary development and library checks retain their existing behavior. This is the BossFang-owned slice of Agent Fabric Convergence C14.3; the authoritative integration contract is `docs/plans/agent-fabric-convergence/openspec/changes/afc-c14-studio-administration-and-isolated-service-consoles/` in the initiative worktree.
