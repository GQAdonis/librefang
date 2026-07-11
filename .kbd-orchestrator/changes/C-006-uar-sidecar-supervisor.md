# Change C-006 — UAR sidecar supervisor (spawn, READY handshake, health, restart, shutdown)

**Phase:** phase-10-uar-sidecar-availability
**Status:** SPECCED
**Depends on:** C-002 (binary published), C-003 (resolution), C-005 (config)
**Files to touch:** `crates/librefang-channels/src/sidecar.rs` (or a new sibling module), kernel boot wiring
**Closes:** G-3

## Why

Nothing in librefang supervises a UAR process. This is the capability the phase exists to
add, and it is the only thing that makes "run / stop / restart UAR from the console"
expressible at all.

## Scope

**Reuse** the existing supervisor. `sidecar.rs` already implements spawn, stderr
classification, and restart-with-backoff (`sidecar.rs:502-520`: `restart`,
`initial_backoff_ms`, `max_backoff_ms`, `max_retries`, `reset_after_secs`). Do **not**
introduce an external supervision crate and do **not** write a second supervisor.

What is genuinely new is the two halves of UAR's parent-process contract that the channel
supervisor does not have: the **`READY:{port}` stdout handshake** and **stdin-EOF shutdown**.

## UAR's contract (read from `src/bin/uar-sidecar.rs` — do not improvise)

| Behaviour | Detail |
|---|---|
| Binding | `127.0.0.1:0` — the OS picks a free ephemeral port |
| Readiness | Emits **exactly one** line `READY:{port}\n` to **stdout**, after the listener binds and *before* it accepts connections |
| Shutdown | Reads stdin; **EOF terminates the process cleanly.** Deliberately chosen because SIGTERM is unreliable on Windows |
| Logging | Forces JSON log format |
| Mode flag | Sets `UAR_SIDECAR=1` |

## Tasks

1. **Spawn** with piped stdin/stdout/stderr, using the command from C-005 resolved through
   C-003.
2. **Parse the readiness line.** Read stdout until `READY:<port>`; capture the port. Apply
   `ready_timeout_ms` — **a child that never prints READY must fail, not hang boot.** Treat
   a malformed line as a failure, not as port 0.
3. **Health-check** `GET /healthz` on the captured port; gate readiness on `/readyz`.
4. **Restart with backoff** using the existing machinery. Classify stderr to distinguish a
   crash-loop (bad config, missing API key) from a transient fault, and surface the former
   to the operator instead of retrying silently forever.
5. **Graceful shutdown by closing the child's stdin** — this is UAR's documented contract
   and is what works on Windows. Escalate to SIGTERM, then kill, on a timeout.
6. **Never leak the child.** Kill it on daemon exit. An orphaned UAR holding a port is a
   worse failure than not starting.
7. **Endpoint mode.** When `[uar] endpoint` is set (C-005), skip spawning entirely and just
   health-check the remote. Do not spawn *and* connect.

## Acceptance criteria

- With `[uar] enabled = true`, the daemon spawns `uar-sidecar`, reads `READY:{port}`, and
  reports healthy once `/readyz` passes.
- Killing the child triggers a backed-off restart, capped by `restart_max_retries`.
- Daemon shutdown closes the child's stdin and the child exits **0**; no orphan remains.
- A child that never prints `READY` fails after `ready_timeout_ms` with a clear error —
  boot does not hang.
- With `[uar] endpoint` set, no process is spawned.
- A missing binary produces C-003's actionable multi-path error, **not** `os error 2`.

## Verification

```bash
cargo test -p librefang-channels
cargo clippy -p librefang-channels --all-targets -- -D warnings
```

Integration test in `crates/librefang-api/tests/` per the repo's mandatory integration-test
rule. Do **not** require a real UAR binary in CI — script a **fake** `uar-sidecar` (a shell
script or a tiny Rust test binary) that honours the contract: print `READY:<port>`, serve
`/healthz`, exit on stdin EOF. That makes the whole supervisor testable hermetically, and
lets you test the failure modes that matter:

- happy path: spawn → READY → healthy
- never prints READY → times out with a clear error
- crashes → restarts with backoff
- stdin closed → exits 0
- binary missing → actionable error naming searched paths
