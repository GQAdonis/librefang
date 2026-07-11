# Plan — phase-10-uar-sidecar-availability

**Date:** 2026-07-11
**Backend:** native-kbd (pinned in `project.json`; `openspec/` is initialized but adopted from phase-11)
**Changes:** 8 (C-001 … C-008)
**Inputs:** `assessment.md`, `analysis.md`, `library-candidates.json`, `tasks.json`
**Evolver bridge:** none

## Ordering rationale

The naive order is the dependency order, which would put the upstream UAR change first and
leave librefang idle behind it. That is wrong, because **two changes deliver real value with
no dependency on UAR at all** — and one of them is the actual bug fix.

So the plan is ordered by *unblocked value*, not by the dependency chain:

1. **Wave 1 ships without waiting for anything.** C-001 and C-003 are independent, small, and
   individually worth merging. C-003 in particular converts the reported failure from an
   opaque `os error 2` into an error that names every path searched — that alone makes the
   bug diagnosable, which is most of what the user is missing today.
2. **The upstream blocker starts on day one, in parallel.** C-002 lives in another repo and
   gates half the phase. It must not be discovered late.
3. **Everything that spawns a process waits on C-002** by necessity — there is no binary to
   spawn until it lands.

A crucial consequence of the C-006 test strategy (a **fake, contract-honouring
`uar-sidecar`**): librefang's *tests* do not wait on C-002. Only the real end-to-end
verification does. This keeps C-006/C-007/C-008 implementable and reviewable while the
upstream change is in flight.

## Waves

### Wave 1 — start now, no dependencies (parallel)

| Change | Title | Size | Agent | Why now |
|---|---|---|---|---|
| **C-002** | **[UPSTREAM]** Build + publish the `uar-sidecar` binary | S | general-purpose | **Hard blocker in `GQAdonis/universal-agent-runtime`.** Gates C-004/006/007/008. Start immediately — its lead time is the phase's critical path. |
| **C-001** | Make `uar-driver` genuinely opt-in | XS | general-purpose | One line. Removes the surrealdb lockstep pin *and* UAR's entire transitive tree from the **default** build. Highest leverage per line in the phase. |
| **C-003** | Generalize bundled-binary resolution; fail loudly | S | general-purpose | **The actual bug fix.** `resolve_sidecar_command` (`sidecar.rs:728`) is hardcoded to the Telegram stem, so UAR falls through to a bare `PATH` lookup. Fully testable with **no UAR binary present**. |
| **C-005** | UAR sidecar config surface | S | general-purpose | Pure types + golden-fixture work. Unblocks C-006. |

Wave 1 is four independent changes; they can run concurrently and each merges on its own
merits.

### Wave 2 — needs the binary (C-002) or the config (C-005)

| Change | Title | Size | Depends on | Agent |
|---|---|---|---|---|
| **C-004** | Ship the UAR binary in the image + release tarball | M | C-002 | general-purpose |
| **C-006** | UAR sidecar supervisor (spawn, `READY:{port}`, health, restart, shutdown) | L | C-002, C-003, C-005 | Plan → general-purpose |

C-006 is the largest change in the phase and the one most worth designing before coding.
Its implementation can begin against the **fake** sidecar as soon as C-003 and C-005 land;
only its real-binary verification waits on C-002.

### Wave 3 — needs a live, supervised UAR

| Change | Title | Size | Depends on | Agent |
|---|---|---|---|---|
| **C-007** | `UarDriver` becomes an HTTP + SSE client | M | C-006 | general-purpose |
| **C-008** | Web console: run / stop / restart / test | M | C-006, C-007 | general-purpose |

C-008 closes the user-visible goal.

## Critical path

```
C-002 (upstream) ──► C-004 ──┐
                             ├──► C-006 ──► C-007 ──► C-008
C-003 ───────────────────────┤
C-005 ───────────────────────┘
```

**C-002 is the long pole.** Every day it is not started is a day added to the phase.

## Library reuse (from `library-candidates.json`)

Per the analyze verdict, **zero new third-party dependencies**. Changes reuse rather than
build:

- **C-004** — `library: adopt` UAR's already-published container image (`COPY --from`).
  Do *not* build UAR from source in librefang's Dockerfile; that drags its `build.rs`
  (network `models.dev` fetch + pnpm frontend) back into our hot build path.
- **C-006** — `library: reuse-internal` `librefang-channels/src/sidecar.rs`. Spawn, stderr
  classification, and restart-with-backoff already exist (`sidecar.rs:502-520`). **Do not add
  an external supervision crate and do not write a second supervisor.**
- **C-007** — `library: reuse-internal` `reqwest 0.13` (`stream`), `futures`, `tokio-stream`,
  all already in the workspace. Rejected: `reqwest-eventsource`, tonic/gRPC.
- **C-003** — a `which`-style crate was rejected on principle: `PATH` lookup is the mechanism
  being removed.

## Definition of done for the phase

- A cloud deploy exposes a healthy UAR (`/readyz` green) with **no `PATH` dependency anywhere
  in the resolution chain**.
- The console shows UAR status and can run a successful test completion.
- Killing UAR produces an automatic, backed-off restart.
- A deliberately-removed binary yields an actionable startup error **naming the searched
  paths** — not `No such file or directory (os error 2)`.
- `cargo check --workspace --lib` clean; `python3 scripts/enforce-branding.py --check` exit 0.

## Risks carried into execution

| Risk | Mitigation |
|---|---|
| C-002 slips and blocks half the phase | Start it first; the fake-sidecar test strategy keeps librefang work reviewable meanwhile |
| Baking UAR into the image balloons its size | **Measure** in C-004; do not silently accept a multi-GB image. Consider first-run fetch or a shared volume |
| UAR's cross-platform binaries are self-described as "aspirational" (`release.yml:160`) | Verify in C-002 before promising desktop/local support. **Linux/container — the reported bug — is unaffected.** |
| Version drift once the cargo pin is gone | C-007 adds a startup version/capability check; pin the UAR image tag |

## Next action

Apply **C-001** (smallest, unblocked, immediately valuable) or **C-003** (the bug fix), and
open **C-002** upstream in parallel — it is the long pole.

```
/kbd-execute phase-10-uar-sidecar-availability
```
