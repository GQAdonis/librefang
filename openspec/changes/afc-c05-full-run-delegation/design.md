## Context

BossFang already has two separate authorities that must remain separate: its native `agent_loop` owns local execution and `UarDriver` owns OpenAI-compatible model calls. C05 adds a third invocation mode in which UAR owns the complete run. C04 established selected-instance identity, endpoint roles, protected credential references and compatibility admission. C03 established exact definition identity and conversion diagnostics. This change consumes those contracts without duplicating either runtime's loop.

## Goals / Non-Goals

**Goals:** admit one UAR-owned run exactly once; preserve exact definition identity and diagnostics; survive a lost admission response; expose native identity and lifecycle controls; truthfully advertise retention and steering support; make the kernel A2A store the one BossFang-side projection.

**Non-Goals:** changing `provider = "uar"`; replaying UAR events as local tool execution; changing native agent messaging; editing `librefang-cli`; adding distributed scheduling; claiming the BossFang projection is the UAR source of truth.

## Decisions

### Stable admission precedes the network effect

BossFang creates a task ID and admission ID, hashes the canonical admission inputs, and atomically persists the local A2A task with its submitted projection before calling UAR. A durable store commits both rows in one SQLite transaction; an in-memory store publishes both under the same mutation authority. An unresolved projection is reconciled with `GET /admissions/{admission_id}`. It is never replaced by a fresh admission ID. Reusing an admission ID with a different digest is refused locally and by UAR.

### UAR owns execution; BossFang owns only correlation

The projection stores the BossFang task ID, admission identity/digest, selected instance and effective binding, exact definition identity plus diagnostics, native UAR task/run IDs, lifecycle and cancel states, event cursor, runtime epoch and retention. UAR remains authoritative for execution, tool approvals, terminal state and artifacts. BossFang never executes a tool event received from UAR. Admission and execution-state receipts do not prove an external effect, so they retain `not_dispatched`; only an uncertain transport/effect outcome sets `effect_unconfirmed`. A later phase may advance this field only from explicit effect evidence.

### One control seam outside `LlmDriver`

`UarRunControl` is the single app-owned authority shared by the delegation and A2A routes. Its isolated `UarRunClient` implementation exposes admit, lookup, observe, approve, cancel, detach and steer without entering the model-driver interface. The current supervised binding supplies the runtime endpoint and protected runtime-role credential only after C04 compatibility admission. All wire types remain isolated in the client module so protocol field evolution does not affect kernel or public route contracts.

The downstream UAR wire is snake_case under `/api/uar/full-harness/v1`: `GET /capabilities`, `POST /tasks`, `GET /admissions/{admission_id}`, `GET /tasks/{task_id}`, `GET /tasks/{task_id}/stream?last_event_id={cursor}`, and the task control routes. Every call carries the runtime bearer and `x-uar-workspace-id`. BossFang's public `/uar/delegations` JSON remains its own camelCase API and does not redefine the UAR protocol.

### One BossFang task projection

`A2aTaskStore` gains an optional delegation projection and persists it with the existing task. The root `/a2a` JSON-RPC route stops using its static map and reads/writes the kernel store. Native A2A tasks remain native; delegated tasks are recognized by their projection and control is forwarded to UAR.

### Steering is capability-gated

The control response distinguishes supported steering from a typed unsupported refusal. BossFang does not reinterpret an unsupported steer as a new message, new run or local prompt injection.

## Security boundaries

- Full-run calls use only the selected instance's protected runtime credential; secret values never enter the projection, API response or log fields.
- Exact definition identity is caller-supplied immutable identity and digest; diagnostics are retained separately so lossy conversion cannot masquerade as the original definition.
- Admission ID and digest are compared before any remote effect, preventing an existing key from being rebound to different work.

## Recovery

Before persisting the pending projection or sending `POST /tasks`, BossFang reads UAR capabilities and records the current runtime epoch, process retention and unsupported semantics. On a transport failure after admission may have reached UAR, the projection remains submitted with an unresolved admission. Lookup first compares the current capability epoch with the recorded epoch, then reconciles by admission ID. An epoch change becomes `recovery_unsupported` and never triggers another admission. Same-epoch expiry remains `retention_expired`; an unknown admission remains `task_unresolved`. Cancellation acknowledgement and terminal cancellation remain distinct. Detach stops BossFang observation without cancelling UAR.

Reusing an admission with changed canonical input is `admission_digest_conflict`. All mutating controls carry the observed revision. A response binding must match the complete admitted C04 binding, including instance, profile, workspace locality, endpoint roles, required capabilities, credential reference and definition deployment binding.

Public observation is cursor-based incremental polling. Each request opens UAR's SSE stream with `last_event_id`, returns the first complete non-empty event batch, advances the projection cursor and closes that observation connection. A subsequent request resumes from the supplied cursor. C05 does not claim a continuously proxied public SSE connection or transparent browser reconnect.

The installed Windows report that UAR is active on port 1906 is retained as baseline service evidence. It is not C05 delegated-run acceptance.

## Verification boundary

After all production code is complete, one integration gate will cover a successful delegated run, a lost admission response reconciled by the same key, lookup/observe, approval, cancellation acknowledgement versus terminal state, detach, typed steer refusal, exact definition identity/diagnostics, root A2A lookup, and one observed UAR executor/tool effect. No partial tests or builds are authorized before that boundary.
