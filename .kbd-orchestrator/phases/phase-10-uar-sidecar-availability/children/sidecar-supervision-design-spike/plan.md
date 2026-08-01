# PLAN: sidecar-supervision-design-spike

Project: BossFang
Date: 2026-07-31
OpenSpec available: YES; change backend: native-kbd (phase-10 pin)
Changes to implement: 1

## Change list

### 1. C-SPK-001 — Make supervision policy deterministic at the readiness boundary

- Scope: `crates/librefang-channels/src/sidecar.rs`, `crates/librefang-channels/src/uar_sidecar.rs`
- Depends on: NONE
- Library: cand-001 (internal outcome-carried ready-uptime pattern)
- Recommended agent: Codex
- Est. complexity: M
- Complexity score: Medium
- Model class: medium
- Customer value: MEDIUM — removes persistent nondeterministic failures and prevents an incorrect retry-budget reset after slow startup.
- Details: Replace the retry outcome's `reached_ready` flag with `ready_uptime: Option<Duration>`. Measure only ready-to-exit time in each real adapter, make the generic engine consume that value without acquiring a clock, and test the policy through a scripted in-memory contract. Delete the UAR process test that attempts to prove retry accounting via Python/filesystem timing and remove scheduler-performance assertions from adjacent process-boundary tests.

#### Tasks

1. Change `SupervisionOutcome::Retryable` to carry `ready_uptime: Option<Duration>`.
2. Remove `Instant::now()`/`elapsed()` acquisition from `supervise_contract`; reset only for `Some(ready_uptime) >= reset_after_secs` when the configured threshold is nonzero.
3. In `ChannelSupervisionContract`, record readiness time only after the ready notification and return its elapsed duration only for an unexpected post-ready close. Pre-ready failures return `None`.
4. In `UarSupervisionContract`, record readiness time only after both health and readiness probes succeed; pre-ready failures return `None`, and unexpected post-ready exits return `Some(ready_at.elapsed())`.
5. Add a `ScriptedContract` test seam under `sidecar.rs` tests and cover exact retry budget, stable-uptime reset, pre-ready non-reset, terminal failure, and shutdown during backoff without real sleeps/processes/files/sockets.
6. Delete `zero_stability_reset_does_not_bypass_retry_cap` from `uar_sidecar.rs`.
7. Remove elapsed upper-bound assertions from `endpoint_readiness_is_bounded_by_millisecond_budget` and `malformed_first_stdout_line_fails_immediately`; assert returned errors and states instead. Keep only generous outer watchdogs where needed to prevent a deadlocked integration test from hanging the suite.
8. Format and run scoped verification.

#### Acceptance criteria

- `supervise_contract` contains no `Instant::now()` or `elapsed()` call.
- Every adapter returns `ready_uptime: None` for pre-ready failures and `Some(elapsed)` only after its protocol-specific readiness transition; focused tests cover both paths.
- With `max_retries = 2` and reset disabled, the in-memory contract observes attempts `[0, 1, 2]` and exactly two retry waits.
- A pre-ready failure never resets the budget, regardless of any pre-ready work duration.
- A post-ready failure resets the attempt counter only when supplied ready uptime meets the configured threshold.
- Terminal outcomes and shutdown-during-backoff do not launch another attempt.
- The former Python/filesystem retry-cap test is absent.
- In `crates/librefang-channels/src/uar_sidecar.rs`, remove assertions comparing `started.elapsed()` (or equivalent elapsed wall-clock duration) against performance upper bounds; `tokio::time::timeout` may remain only as a generous watchdog that aborts a hung integration test.
- `cargo fmt --check` passes.
- `cargo test -p librefang-channels` passes.
- Focused deterministic policy tests pass, and the UAR process-boundary suite passes five consecutive runs: `for i in 1 2 3 4 5; do cargo test -p librefang-channels uar_sidecar::tests || exit 1; done`.
- `cargo clippy -p librefang-channels --all-targets -- -D warnings` passes.
- `cargo check --workspace --lib` passes.
- `cargo clippy --workspace --all-targets -- -D warnings` passes. If the already-observed unchanged `crates/librefang-kernel-handle/src/test_stub.rs` baseline mismatch recurs, prove the file and trait are identical to `origin/main`, record the full gate as a pre-existing blocker, and do not weaken or bypass the gate.
- `python3 scripts/enforce-branding.py --check` passes.

#### Explicit scope cuts

- Do not embed UAR as a library.
- Do not add a clock, retry, or process-supervision dependency.
- Do not modify the read-only upstream UAR workspace in this child. The retained-listener/READY correction is a separately recorded upstream follow-up.
- Do not redesign all process tests; retain integration coverage of real spawn/READY/HTTP/EOF/crash behavior.

## Execution round order

Round 1: C-SPK-001

## Command to run

`/kbd-execute sidecar-supervision-design-spike C-SPK-001`

## Plan complete
