# Proposal

## Why

Original Agent Fabric Convergence C14.4 requires ordinary BossFang workflows to delegate complete execution to the selected UAR. At native baseline 295ff5020, ordinary workflow steps still invoke the native message loop; the existing authenticated full-run admission and control path is separate and the dashboard does not consume it.

## What Changes

- Add an explicit UAR-bound ordinary workflow step target alongside existing native agent targets.
- Route that step through existing full-run admission, correlation, observation and controls, preserving actual output and authoritative approval/cancellation state.
- Expose the same correlation projection in ordinary workflow run detail and consume it in the existing dashboard.
- Supply one real packaged normal-profile workflow operation procedure; root owns the completed boundary.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `bossfang-full-run-delegation`: ordinary workflow target dispatch and dashboard consumption of the existing full-run authority.

## Impact

Native workflow target types/resolver, API workflow and delegation modules, shared projection types, dashboard workflow editor/run views, and The Boss operation procedure. No dependencies, database migration, scheduler, UAR source changes or runtime supervision changes. The Boss remains the sole UAR supervisor.

Authority: initiative `openspec/changes/afc-c14-studio-administration-and-isolated-service-consoles/design.md` C14.4, parent plan original C14, and `.prometheus/cadence/inputs/c14-bossfang-remaining-production-map-20261007.json`. This is independently admitted work-ahead `c14-bossfang-workflow-delegation-20261007`, not parent completion.
