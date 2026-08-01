# Analysis — deterministic supervision and UAR execution boundary

## Inputs and scope

This analysis resolves the assessment's implementation question without changing the selected production boundary. The Rust/Tokio stack is fixed. The relevant code is limited to:

- `crates/librefang-channels/src/sidecar.rs`: generic restart policy and channel-sidecar contract.
- `crates/librefang-channels/src/uar_sidecar.rs`: UAR process/HTTP adapter and its tests.
- Upstream `universal-agent-runtime/src/bin/uar-sidecar.rs`: retained-listener and readiness handshake follow-up; independently inspected in the read-only reference workspace declared by `project.json`, so it is context rather than a writable artifact for this child.

## Call-graph finding

`supervise_contract` currently starts `std::time::Instant` before `run_once`, then asks only whether the attempt ever reached ready. When the attempt fails, it resets the retry count if the whole attempt duration exceeds `reset_after_secs`.

That is both hard to test and subtly wrong. The policy is documented as a **stable-uptime** reset, but the measurement includes spawn time, READY parsing, and readiness probing. A slow start followed by an immediate crash can therefore qualify as stable uptime.

The protocol adapter is the only layer that knows when readiness was actually achieved. It should measure and return `ready_uptime` as part of a retryable result:

```rust
Retryable {
    error: Option<String>,
    ready_uptime: Option<Duration>,
}
```

`None` means the attempt failed before readiness. `Some(duration)` means it became ready and remained ready for exactly that duration. The policy engine compares the supplied duration to the reset threshold. This deletes the engine's hidden clock dependency and corrects the semantic boundary.

The earlier assessment proposed `reached_ready: bool` plus `uptime: Duration`. `Option<Duration>` is stronger: it makes the invalid state “not ready but positive ready uptime” unrepresentable.

## Candidate evaluation

### Adopt internally: outcome-carried ready uptime

This is the smallest correction. Each real adapter uses `Instant::now()` only at the moment it becomes ready and returns `ready_at.elapsed()` if it later exits unexpectedly. The in-memory test contract supplies exact durations directly. No clock trait, new dependency, global test state, sleeping, process, file, or socket is required.

### Reject: injected clock trait

A clock trait would make `Instant::now()` substitutable but would not fix the semantic error unless the engine also learned the exact ready transition. It adds an abstraction and generic state for one comparison. There is no second policy in this code that independently needs wall/monotonic time.

### Reject: `mock_instant` or `chronobreak`

Both crates can replace or mock time in unit tests, but adding a test dependency to control one `Instant` is unnecessary. They also cannot make Python startup, filesystem scheduling, TCP binding, or process reaping deterministic. `mock_instant` uses a mock replacement rather than improving the production contract; `chronobreak` is broader than this need.

### Reject for this gap: Tokio paused time

Tokio's test clock controls `tokio::time`, not `std::time::Instant` and not OS process execution. Replacing the engine's `Instant` with `tokio::time::Instant` would make a unit test pausable, but the engine would still own the wrong start point and process tests would remain scheduler-dependent.

### Reference only: cancellation tokens/task tracking

Tokio's structured shutdown tools are useful if UAR later exposes an embeddable service API, but they do not address retry accounting. Task abortion is cooperative at yield points and cannot abort already-running `spawn_blocking` work. They are not a substitute for process isolation or a deterministic policy seam.

### Reject: generic retry/backoff crates

`backoff` and `tokio-retry` can repeat a future according to an exponential schedule. They do not own the domain decisions here: readiness transitions, terminal versus retryable failures, endpoint publication/withdrawal, shutdown winning a backoff race, stable-ready-uptime reset, or circuit status. Adopting one would retain nearly all of `SupervisionContract` while duplicating its small delay calculation. The existing policy is about 35 lines and already supports injected waiting, so a dependency is not an 80% solution.

### Reject: generic process-supervision wrappers

`process-wrap`, `rust_supervisor`, and similar crates provide process groups, kill-on-drop, or generic restart actors. The UAR adapter already uses Tokio's cross-platform `Command`, piped stdio, `kill_on_drop`, EOF shutdown, and an HTTP readiness contract. A generic supervisor cannot understand UAR's first-line protocol, terminal stderr classification, endpoint callback, or start waiter. Replacing the adapter would enlarge the change without removing the need for the domain contract or its tests.

## Test decomposition

### Move to in-memory policy tests in `sidecar.rs`

Use a `ScriptedContract` with queued outcomes and recorded attempts/delays/exhaustion:

1. `restart_budget_is_exact_when_reset_is_disabled`: three retryable attempts for `max_retries = 2`; no process or file.
2. `stable_ready_uptime_resets_retry_budget`: prior failed attempts are forgotten only when `ready_uptime >= threshold`.
3. `pre_ready_time_never_resets_retry_budget`: a pre-ready failure cannot reset regardless of how long spawn/readiness work took.
4. `terminal_failure_does_not_wait_or_retry`: terminal outcomes immediately exhaust with their error.
5. `shutdown_wins_during_backoff`: `wait_to_retry` returning false exits without another attempt.

The first test replaces the flaky UAR `zero_stability_reset_does_not_bypass_retry_cap` test exactly. Tests 2 and 3 protect the corrected semantics.

### Keep as process/HTTP boundary tests in `uar_sidecar.rs`

- Exact `READY:<port>` parsing.
- Missing executable diagnostic.
- Child spawn, retained endpoint health, and stdin-EOF shutdown.
- Never-READY timeout and malformed first line.
- Stop while waiting for READY.
- One retry integration smoke proving that the UAR adapter reconnects its start waiter after a failed process attempt.
- Unexpected post-ready crash causes endpoint withdrawal and a later healthy endpoint.

These tests may use a generous outer watchdog to prevent the suite hanging. They must not assert scheduler performance. In particular, remove elapsed upper-bound assertions from malformed output and HTTP readiness timeout tests; the returned error and state are the contract. The stop test can retain an outer watchdog only as a deadlock detector, with readiness/state synchronization driving when stop is sent.

## Execution-model decision

No researched library changes the production conclusion:

- Embedding trades loopback HTTP overhead for shared failure, dependency, and resource domains.
- The independently inspected pinned UAR branch currently uses `std::process::exit` in its sidecar lifecycle and documents exact SurrealDB/native dependency constraints. This is recorded with source URLs and line-level evidence in `assessment.md` and `deep-research.md`; the local UAR workspace remains read-only and is not part of this review packet's repository tree.
- BossFang already supports the same HTTP client against a local child or configured endpoint.
- Kubernetes should own a native sidecar/service lifecycle; local/desktop BossFang should own the child lifecycle.

The process boundary is therefore retained. The actionable upstream defect remains: UAR must pass its pre-bound listener into the server and fix the READY/BOUND semantic. That work is outside this child's writable scope.

## Build-vs-adopt decision

Build the approximately one-field contract correction and in-memory scripted tests. Adopt no new dependency. Keep the process adapter; delete only the policy test that improperly crosses the process boundary and remove scheduler-performance assertions adjacent to the affected lifecycle tests.

## Verification target

- The scripted policy tests pass repeatedly without wall-clock sleeps or OS processes.
- `zero_stability_reset_does_not_bypass_retry_cap` no longer exists in the UAR process test module.
- Process tests assert observable protocol/state outcomes, not elapsed upper bounds.
- Scoped `librefang-channels` tests and clippy pass.
