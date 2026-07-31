# Change C-008 — Web console: run, stop, restart, and test the UAR

**Phase:** phase-10-uar-sidecar-availability
**Status:** SPECCED
**Depends on:** C-006 (supervisor), C-007 (driver)
**Files to touch:** `crates/librefang-api/src/routes/uar.rs` (or a new module), `crates/librefang-api/dashboard/src/`
**Closes:** G-7

## Why

This is the user-visible goal: *"guarantee its availability to be run, used, and tested from
within the librefang web console."*

Today the console has **no UAR process controls at all**. Its only UAR affordances are
agent-manifest import (`POST /api/agents/uar`) and SurrealDB namespace linking
(`POST /api/storage/link-uar`) — neither touches a process. Note `routes/uar.rs` is the
**A2A protocol** surface; it is unrelated to supervision. Do not overload it out of
name-similarity.

## Scope

Expose the supervisor's state and commands over HTTP, and surface them in the dashboard.
Every backing capability already exists — this is wiring, not new runtime behaviour.

## Tasks

### API

1. `GET /api/uar/status` — supervisor state (stopped / starting / healthy / degraded /
   crash-looping), the resolved binary path, the captured port, restart count, and last
   error. **Include the resolved path**: when resolution fails, the operator must be able to
   see *what we looked for and where* without reading logs. That is the whole point.
2. `POST /api/uar/start` · `/stop` · `/restart` — supervisor commands.
3. `POST /api/uar/test` — issue a canned completion through `UarDriver`; return the reply and
   the latency. This route is functional in `uar-driver` builds (including the shipped Docker
   image); deliberately minimal builds without that opt-in feature return an explicit 503.
4. `GET /api/uar/models` — proxy UAR's `/api/models`.
5. Register the new router in `server.rs::api_v1_routes()` — a handler that is never merged
   is invisible, and the reflection tests
   (`dead_route_audit_test.rs`, `openapi_path_coverage_test.rs`) will catch it if you forget.
6. Decide auth: these are operator controls. They must **not** be added to the `is_public`
   allowlist in `middleware.rs`.

### Dashboard

7. Per the `CLAUDE.md` data-layer rule, **all** access goes through hooks in
   `src/lib/queries/` and `src/lib/mutations/` — no inline `fetch()` or `api.*` in
   pages/components.
8. Add hierarchical query-key factories in `src/lib/queries/keys.ts` (`all` / `lists()` /
   `detail()`); never inline `["uar", …]` arrays.
9. Mutations (`start`/`stop`/`restart`) must `invalidateQueries` with factory keys in
   `onSuccess`/`onSettled`, colocated with the mutation hook.
10. UI: a status pill, start/stop/restart buttons, a **"Test the UAR"** button rendering the
    reply + latency, and the model list. Show the resolved-path/error detail on failure.

## Acceptance criteria

- The console shows live UAR status and transitions correctly on start/stop/restart.
- "Test the UAR" returns a real completion from the sidecar in the shipped `uar-driver` build;
  an intentionally feature-minimal build reports that the feature is disabled.
- When the binary cannot be resolved, the console shows the **actionable multi-path error**
  from C-003 — not `os error 2`, and not a blank failure.
- No inline `fetch()` in pages/components; all query keys come from the factory.
- The control endpoints are **not** publicly reachable.

## Verification

```bash
cargo test -p librefang-api --features uar-driver
cargo clippy -p librefang-api --all-targets --features uar-driver -- -D warnings
python3 scripts/enforce-branding.py --check
```

Add `#[tokio::test]` integration tests against the shared `TestAppState` production-router
harness (repo rule: every new route gets one) covering status, start/stop/restart, and
test-completion. Use C-006's fake
`uar-sidecar` so CI needs no real UAR.
