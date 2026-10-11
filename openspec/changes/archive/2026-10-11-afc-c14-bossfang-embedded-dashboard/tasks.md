> Archived administratively on 2026-10-11 during operator-directed main consolidation. These original branch tasks retain their historical status; the unchecked package scenarios are not certified by this archive. The accepted public 2.2.32 core customer scope and manual qualification handoff are recorded separately in docs/plans/agent-fabric-convergence. This record opens no additional runtime approval or build cycle.

# Tasks

- [x] Add opt-in release-build validation for the dashboard shell and executable assets while retaining the ordinary development build.
- [x] Add a source-pinned, native Apple Silicon and Windows x64 workflow that uploads checksummed staging payloads without publishing a release.
- [ ] Build pinned native Apple Silicon and Windows x64 executables with `BOSSFANG_REQUIRE_EMBEDDED_DASHBOARD=1` and record source, binary, asset, size, and checksum provenance.
- [ ] In the completed The Boss C14.3 gate, launch each packaged sidecar, fetch `/dashboard/`, and operate a real configuration action through the contained MiniApp. Record authentication and ownership behavior accurately.
