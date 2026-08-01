# Change C-007 — `UarDriver` becomes an HTTP + SSE client

**Phase:** phase-10-uar-sidecar-availability
**Status:** DONE (2026-07-31)
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
| `POST /api/chat/completion` | completion; returns SSE when `stream = true` and `stream_mode = "openai"` |
| `GET /api/live`, `/api/live/{topic}` | runtime event feed (not completion-token streaming) |
| `GET /api/models`, `/api/catalog` | model catalog |
| `GET /api/openapi.json` | API identity and compatibility version |
| `GET /healthz`, `/readyz` | liveness / readiness |

## Tasks

1. Replace the in-process `LiterLlmDriver` construction with a `reqwest::Client` targeting
   the endpoint published by the supervisor. C-006 publishes both its captured child port and
   a configured remote `[uar] endpoint` through `set_supervised_endpoint`; the driver must not
   read a second configuration source or reinterpret `DriverConfig::base_url`.
2. Map `CompletionRequest` → `POST /api/chat/completion`; map text, usage, tool calls, and
   OpenAI-compatible finish reasons (`stop`, `tool_calls`, `length`, `content_filter`) back
   to the `LlmDriver` trait's shape.
3. Stream tokens over SSE, preserving the existing streaming semantics the trait requires.
4. **Do not reuse `UarConfig::base_url` for the UAR endpoint.** It is an LLM-*provider*
   override passed to liter-llm (`drivers/uar.rs:97`). Reusing it is a silent semantic
   collision. Take the endpoint from the supervisor / `[uar] endpoint` (C-005).
   The shared sidecar has one process-level provider configuration; its chat request schema
   does not accept provider keys or base URLs. Reject divergent per-agent `DriverConfig`
   overrides with an actionable error instead of silently ignoring them. Matching inherited
   `UAR_LLM__*` / `LLM_*` values remain valid because the child inherits those values.
5. **Add a startup version/capability check.** With the cargo-level pin gone, librefang's
   client and UAR's API can now drift independently — a class of failure that used to be a
   compile error and would otherwise become a silent runtime one. Check on connect and fail
   loudly on mismatch. Here “startup” means the first network connection after each supervisor
   endpoint publication (including a same-URL restart): `LlmDriver::create` is synchronous and
   the ephemeral endpoint does not exist until the asynchronous supervisor publishes it. The
   supervisor separately gates publication on `/readyz`; the driver's first connection then
   verifies API identity, version, completion/stream fields, and model-catalog shape before
   sending a completion. The pinned UAR 0.1 image exposes a sparse OpenAPI document that
   advertises `/v1/chat/completions` but omits its working internal completion route. For that
   exact documented shape, confirm `/api/chat/completion` with an empty, non-billable request
   and require UAR's structured `messages` validation error before accepting the endpoint. If
   the internal route is documented but its `stream` / `stream_mode` fields are absent, reject
   it as drift; the sparse fallback must not hide an explicitly incomplete schema.
6. Keep the `uar-driver` feature gate. Per D-2 the in-process code stays in-tree, unbuilt,
   for one release; this driver replaces its *body*, not its gate.

## Acceptance criteria

- A completion issued through `UarDriver` reaches the sidecar and returns a correct response.
- Token and tool-call streaming work end to end over the completion response's SSE stream,
  matching the trait's `TextDelta`, `ToolUseStart`, `ToolInputDelta`, and `ToolUseEnd` contract.
- An unreachable/unhealthy UAR produces a clear driver error — not a panic, not a hang.
- A version/capability mismatch is detected on the first connection after endpoint publication
  or restart, before a completion is sent, and reported.
- No new entry in `Cargo.toml` dependencies.

## Verification

```bash
cargo test -p librefang-llm-drivers --features uar-driver
cargo clippy -p librefang-llm-drivers --all-targets --features uar-driver -- -D warnings
```

Test against the **fake `uar-sidecar`** from C-006 (contract-honouring stub), so CI needs no
real UAR. Cover: happy-path completion, streaming, sidecar down, version mismatch.

## Completion evidence

- The feature-gated HTTP driver maps completions, SSE deltas, tool calls, finish reasons,
  usage, capability failures, and supervisor endpoint republication in deterministic tests.
- The 21 UAR driver module tests pass. The feature-enabled API integration suite passes and
  exercises the production route through `UarDriver`.
- The exact published UAR image returned a real Groq completion, and the BossFang operator
  route returned `BossFang UAR is ready.` through the same endpoint.
