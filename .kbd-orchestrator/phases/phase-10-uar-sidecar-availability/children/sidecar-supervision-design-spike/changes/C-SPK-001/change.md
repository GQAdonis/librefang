# C-SPK-001 — Deterministic supervision policy at the readiness boundary

Status: implemented
Library: cand-001
Complexity: Medium
Model class: medium

## Intent

Make retry-budget and stable-uptime behavior deterministic without weakening real process-boundary coverage or changing the UAR execution model.

## Source scope

- `crates/librefang-channels/src/sidecar.rs`
- `crates/librefang-channels/src/uar_sidecar.rs`

## Tasks

- [x] Replace `reached_ready` with `ready_uptime: Option<Duration>`.
- [x] Measure elapsed time only after each adapter reaches its protocol-specific ready state.
- [x] Make `supervise_contract` consume supplied uptime without acquiring a clock.
- [x] Add in-memory `ScriptedContract` tests for retry cap, stable reset, pre-ready non-reset, terminal failure, and interrupted backoff.
- [x] Delete the Python/filesystem retry-cap test and remove elapsed performance assertions from UAR process tests.
- [x] Run the plan's scoped and repository verification gates.

## Acceptance

- With max retries 2 and reset disabled, attempts are exactly `[0, 1, 2]` with two waits.
- Pre-ready failures never reset the budget.
- Only sufficient post-ready uptime resets the budget.
- No policy unit test starts an OS process, opens a socket, writes a counter file, or sleeps on wall time.
- Real UAR spawn/READY/HTTP/EOF/crash integration coverage remains.
- All verification commands in `plan.md` are executed and their results recorded.

## Deferred

The upstream UAR retained-listener and truthful READY/BOUND change is not writable in this child and remains a separate follow-up.

## Verification result

Implementation and scoped certification passed. Full workspace clippy remains blocked by an unchanged `origin/main` trait/test-stub mismatch outside this change; `verification.md` records exact evidence.
