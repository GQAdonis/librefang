# Change C-007 — `UarDriver` becomes an HTTP + SSE client

**Phase:** phase-10-uar-sidecar-availability
**Status:** SPECCED
**Depends on:** C-006 (a running, health-checked UAR to talk to)
**Files to touch:** `crates/librefang-llm-drivers/src/drivers/uar.rs`
**Closes:** G-5

## Why

`UarDriver` today is an in-process library call (`drivers/uar.rs:34-103`): it imports
`universal_agent_runtime::llm::LiterLlmDriver` and constructs it directly. There is no
socket and no PID. That is what makes the embedded model unable to express a *runtime* the
console can control.

## Scope

Rewrite the driver to speak HTTP to the supervised sidecar. **Zero new dependencies** —
`reqwest 0.13` (with the `stream` feature), `futures`, and `tokio-stream` are already in
the workspace (`Cargo.toml:136`, `:156`, `:47`), and SSE is already consumed in-tree
(`librefang-runtime-mcp`).

Rejected: `reqwest-eventsource` / `eventsource-client` (an added dependency for a stream we
can already consume) and tonic/gRPC (UAR exposes it, but HTTP+SSE covers completions and
token streaming at far lower integration cost).

## UAR's surface (`src/server.rs:694+`)

| Endpoint | Use |
|---|---|
| `POST /api/chat/completion` | the completion call |
| `GET /api/live`, `/api/live/{topic}` | SSE token streaming |
| `GET /api/models`, `/api/catalog` | model catalog |
| `GET /healthz`, `/readyz` | liveness / readiness |

## Tasks

1. Replace the in-process `LiterLlmDriver` construction with a `reqwest::Client` targeting
   the supervisor's captured port (or the configured `endpoint`).
2. Map `CompletionRequest` → `POST /api/chat/completion`; map the response back to the
   `LlmDriver` trait's shape.
3. Stream tokens over SSE, preserving the existing streaming semantics the trait requires.
4. **Do not reuse `UarConfig::base_url` for the UAR endpoint.** It is an LLM-*provider*
   override passed to liter-llm (`drivers/uar.rs:97`). Reusing it is a silent semantic
   collision. Take the endpoint from the supervisor / `[uar] endpoint` (C-005).
5. **Add a startup version/capability check.** With the cargo-level pin gone, librefang's
   client and UAR's API can now drift independently — a class of failure that used to be a
   compile error and would otherwise become a silent runtime one. Check on connect and fail
   loudly on mismatch.
6. Keep the `uar-driver` feature gate. Per D-2 the in-process code stays in-tree, unbuilt,
   for one release; this driver replaces its *body*, not its gate.

## Acceptance criteria

- A completion issued through `UarDriver` reaches the sidecar and returns a correct response.
- Token streaming works end to end (SSE), matching the trait's streaming contract.
- An unreachable/unhealthy UAR produces a clear driver error — not a panic, not a hang.
- A version/capability mismatch is detected at startup and reported.
- No new entry in `Cargo.toml` dependencies.

## Verification

```bash
cargo test -p librefang-llm-drivers --features uar-driver
cargo clippy -p librefang-llm-drivers --all-targets --features uar-driver -- -D warnings
```

Test against the **fake `uar-sidecar`** from C-006 (contract-honouring stub), so CI needs no
real UAR. Cover: happy-path completion, streaming, sidecar down, version mismatch.
