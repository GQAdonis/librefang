# Assessment — UAR execution and supervision design

## Assessment question

Should BossFang embed UAR as a Rust library under Tokio task/thread control, or keep UAR behind a supervised process/service boundary?

## Provisional conclusion

Keep the full UAR runtime behind an HTTP process boundary. Do not replace it with an in-process library merely to eliminate the current timing failures. The failures do not demonstrate that the process boundary is wrong; they demonstrate that generic retry policy is being tested through the operating-system process boundary and wall-clock deadlines.

The recommended shape is hybrid lifecycle ownership over one HTTP contract:

- Local desktop and single-container deployments: BossFang supervises a local UAR child process.
- Kubernetes: the kubelet supervises a native sidecar container, or BossFang uses a separately deployed UAR endpoint. BossFang should observe/test that endpoint rather than trying to own the sibling container lifecycle.
- A future in-process mode is justified only if UAR publishes a narrow, stable library service interface with structured cancellation and the measured performance benefit outweighs the shared failure and dependency domains.

The current production design is directionally sound but not fully solid. The responsibility boundary is good; the UAR startup handshake and the test decomposition need correction.

## What the code is doing

BossFang now has two layers:

1. `crates/librefang-channels/src/sidecar.rs` owns the generic lifecycle policy: bounded retries, backoff, stable-uptime reset, shutdown-vs-retry selection, and circuit breaking. Protocol implementations supply a `SupervisionContract` containing one attempt, retry waiting, and exhaustion reporting.
2. `crates/librefang-channels/src/uar_sidecar.rs` owns the UAR protocol adapter: resolve and spawn `uar-sidecar`, parse `READY:{port}`, probe `/healthz` and `/readyz`, publish the endpoint, watch for process exit, retry recoverable failures, and close stdin before force-killing after a grace period. It can also use a configured remote endpoint without spawning.

This separation is the correct architectural direction: policy and process mechanics are distinct concepts. The tests do not consistently respect that separation.

## Execution-model comparison

| Dimension | Embedded Rust library/tasks | BossFang-supervised child process | Kubernetes sidecar/service |
|---|---|---|---|
| Failure isolation | Shares BossFang's address space, allocator, runtime, panic strategy, and `process::exit` blast radius | Contains UAR aborts, exits, memory corruption, and most dependency failures | Strongest lifecycle/resource isolation; kubelet owns restart and termination |
| Cancellation | Can be precise if every operation cooperates with `CancellationToken`/task tracking; blocking tasks are not generally abortable | EOF then grace timeout then kill is coarse but enforceable | Declarative termination with grace period and eventual force-kill |
| Dependency coupling | Cargo unifies UAR's very large graph and exact native/database pins with BossFang | Build/runtime versions are independently pinned; compatibility moves to the HTTP contract | Same decoupling, with independent resource/security policy |
| Latency | Lowest call overhead | Loopback HTTP overhead | Pod-local HTTP or network overhead |
| Runtime control | Direct structured API, if UAR exposes one | Explicit start/stop/status for desktop and single-container use | Dashboard lifecycle control conflicts with declarative orchestration ownership |
| Testability | Excellent only behind an injected service trait; tasks still have scheduler/network/time nondeterminism | Excellent when policy is tested in memory and only the boundary is integration-tested | Best exercised with deployment/integration tests, not unit tests |
| Operational fit | Good for a small trusted library | Good for a heavyweight independently versioned local runtime | Best cloud-native model |

Tokio provides cooperative cancellation and task tracking, but cancellation only takes effect at yield points and `spawn_blocking` work cannot be aborted after it starts. Dropping to threads/tasks therefore does not create deterministic execution or guaranteed shutdown ([Tokio graceful shutdown](https://tokio.rs/tokio/topics/shutdown), [Tokio task cancellation](https://docs.rs/tokio/latest/tokio/task/index.html)). Rust's abort panic strategy terminates the entire process, and even unwind is not universally recoverable ([Rust panic reference](https://doc.rust-lang.org/stable/reference/panic.html)).

The full UAR is not a small provider client. Its dependency graph includes embedded SurrealDB, document processing, telemetry, MCP, and provider machinery. Its Cargo manifest explicitly documents that exact SurrealDB patch versions must match for an in-process link and records prior SQLite/native-link conflicts ([UAR Cargo manifest](https://github.com/GQAdonis/universal-agent-runtime/blob/sync-gqadonis-8c7377a1/Cargo.toml)). The previous BossFang integration embedded only UAR's LLM driver facade; it did not embed the full runtime/control plane that phase 10 needs to run, stop, inspect, and test.

## Confirmed design defects

### 1. UAR's `READY` handshake is a real time-of-check/time-of-use race

This behavior was verified directly in the upstream branch used by the pinned image. In `src/bin/uar-sidecar.rs`, lines 46–58 scope the pre-bound listener so it is dropped; lines 60–67 set `UAR_SERVER__PORT` and print `READY`; lines 86–93 load configuration; and line 102 only then calls `start_server_sidecar`. The source itself says the socket is released before rebinding and describes the race window as “sub-millisecond,” which is still a race rather than a correctness argument ([UAR sidecar source](https://github.com/GQAdonis/universal-agent-runtime/blob/sync-gqadonis-8c7377a1/src/bin/uar-sidecar.rs)). Another process can claim the released port, and the emitted word `READY` is semantically false because configuration may still fail and the HTTP server has not bound or begun serving.

BossFang's subsequent health/readiness probes prevent the false signal from becoming a false healthy state, but they cannot prevent a needless failed launch/retry caused by the released port.

Correct contract: UAR must retain the listener and pass it into the server. It should emit either `BOUND:{port}` once the listener is retained, followed by HTTP readiness, or emit `READY:{port}` only after configuration succeeds and the retained listener is serving. This fix belongs upstream in UAR.

### 2. Retry policy is tested through the wrong seam

`zero_stability_reset_does_not_bypass_retry_cap` is intended to prove a pure invariant: reset-after-zero cannot reset the retry budget, so three attempts occur when `max_retries == 2`. It currently proves that invariant by starting Python three times, persisting a counter in a file, depending on process scheduling and filesystem visibility, and racing each launch against a real startup timeout. Increasing the timeout merely changes how often the accidental boundary wins; it does not make the test deterministic.

`readiness_failure_retries_before_start_returns` similarly mixes retry accounting with Python startup, TCP binding, HTTP readiness, filesystem state, and wall-clock backoff. Elapsed-time assertions in readiness, malformed-output, and stop tests add scheduler-performance requirements that are not part of the functional contract.

Generic retry invariants should be tested directly against `supervise_contract` with a scripted in-memory contract. The script should return a sequence of `SupervisionOutcome` values, record attempt numbers and requested delays, and use an injected monotonic-time seam for stable-uptime reset. No process, socket, file, sleep, or wall clock should participate.

Only real boundary behaviors belong in process integration tests: executable resolution, spawn failure, exact first-line parsing, retained READY/BOUND plus HTTP readiness, stdin-EOF shutdown, crash/EOF detection, and forced kill after grace. Watchdog timeouts may prevent a hung test suite, but success must be driven by observable state/events rather than elapsed-time upper bounds.

### 3. The stable-uptime clock is only half abstracted

`SupervisionContract::wait_to_retry` injects retry waiting, so backoff tests can avoid sleeping. However, `supervise_contract` measures attempt uptime with `std::time::Instant::now()`. Tokio's paused clock cannot control that clock. The policy layer therefore still lacks the deterministic seam required to test stable-uptime reset without real waiting.

The smallest correction is to make attempt uptime data an input to the policy decision, or inject a monotonic clock. Returning a measured `uptime` alongside the attempt outcome is simpler and keeps clock ownership with the attempt implementation; a clock trait is only warranted if other policy decisions need time later.

## Evidence against embedding as the default

- Current UAR sidecar shutdown calls `std::process::exit`; embedding that behavior without a deliberate library API would terminate BossFang, not merely a task.
- An in-process link recreates exact dependency-pin coordination. UAR's own manifest calls out prior libsqlite linkage conflicts and exact SurrealDB alignment requirements.
- Tasks share CPU, memory, allocator, runtime, and panic/abort failure domains. They provide cheaper communication, not isolation.
- UAR already exposes an HTTP server/control plane, while the existing embedded integration covered only the LLM driver facade.
- The current HTTP driver supports both a supervised local process and a configured remote endpoint. That is a useful deployment abstraction that embedding would fragment.

## Evidence that could falsify this recommendation

The default should change to embedding if all of the following become true:

1. UAR publishes a supported library service API that accepts a pre-bound listener, explicit configuration, and a cancellation token, and never calls `process::exit` or performs untracked blocking work.
2. Its dependency surface can be isolated or unified without exact-pin/native-link conflicts and without materially inflating BossFang's build/release surface.
3. Benchmarks show loopback HTTP overhead materially harms an actual BossFang workload, not just microbenchmarks.
4. Fault-injection proves a UAR panic, abort, OOM, or runaway task cannot take down or starve the BossFang kernel—or the product explicitly accepts that shared failure domain.
5. The embedded and service modes can share one behavioral contract so deployment mode does not create two implementations with divergent semantics.

Those conditions are not met today.

## Kubernetes qualification

Kubernetes native sidecars have ordered startup and are terminated after the main container; the kubelet, not application code, is the natural lifecycle owner ([Kubernetes sidecar containers](https://kubernetes.io/docs/tutorials/configuration/pod-sidecar-containers/)). Running the UAR binary as a child inside the BossFang container remains appropriate for local/desktop and simple single-container packaging, but it should not be treated as the only cloud topology. The existing endpoint mode is the bridge to the Kubernetes-native topology.

## Assessment decision

- **Production boundary:** retain HTTP/process isolation; use environment-specific lifecycle ownership.
- **Immediate BossFang correction:** move retry/stability policy tests to an in-memory deterministic contract and remove the timeout increase that masked the failing test.
- **Immediate UAR follow-up:** eliminate the port-release race and correct the READY/BOUND semantic in the upstream UAR sidecar.
- **Not recommended:** replace the full UAR sidecar with threads/tasks as a reaction to test flakiness.

## Smallest recommended design correction

Attach `uptime: Duration` to `SupervisionOutcome::Retryable`. The attempt implementation already owns the start/end boundary and can report the observed uptime with its result; the policy engine only needs that value to decide whether to reset the retry budget. This is smaller than introducing a clock trait, keeps generic policy free of clock acquisition, and lets in-memory tests supply exact values. Analysis should reject this recommendation only if it finds another lifecycle policy that must read a shared monotonic clock independently of an attempt outcome.
