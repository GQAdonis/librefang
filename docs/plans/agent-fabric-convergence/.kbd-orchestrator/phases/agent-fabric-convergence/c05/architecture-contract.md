# C05 full-run delegation architecture contract

**Contract:** `afc.bossfang-full-run-delegation/1`<br>
**Status:** frozen C05 architecture contract; product implementation and conformance remain pending.<br>
**Initial supported profile:** `process-ephemeral`<br>
**Machine form:** [architecture-contract.json](architecture-contract.json)

This contract binds initiative tasks C05.1–C05.3 to the inspected C04 source baselines. It defines the minimum truthful first implementation of complete-run delegation from BossFang to UAR. It does not certify product behavior and does not authorize a second execution loop in BossFang.

## Source baselines

| Repository | Accepted baseline | Baseline role |
|---|---|---|
| universal-agent-runtime | `3d6bf0568595816ac8da4095028bb991f7d17375` (`origin/main`) | C04 service-instance placement, UAR public run and A2A execution surfaces |
| librefang | `2c5b91b5f3d8bb3aeb3d3a3ff2f062c277891627` | C04 BossFang base and current UAR provider/A2A/task surfaces |

The relevant UAR baseline surfaces are `src/uar/api/routes.rs`, `src/uar/runtime/manager.rs`, `src/uar/api/a2a/handler.rs`, `src/uar/api/a2a/thread_service.rs` and `src/uar/api/a2a/task_execution.rs`. The relevant BossFang surfaces are `crates/librefang-llm-drivers/src/drivers/uar.rs`, `crates/librefang-runtime/src/a2a.rs`, `crates/librefang-api/src/routes/network.rs`, `crates/librefang-api/src/idempotency.rs`, `crates/librefang-kernel/src/kernel/task_registry.rs` and `crates/librefang-types/src/task.rs`.

At these baselines, the UAR `LlmDriver` integration is a model-provider bridge, UAR creates native runs without a caller-supplied admission identity, UAR's A2A task-to-thread correlation is process memory, and BossFang has multiple local task representations that do not control the UAR executor. These observations establish the gap addressed by this contract; they are not claims of C05 conformance.

## Frozen authority contracts

### 1. One execution-loop owner

Full-run delegation is a separate execution mode from native BossFang execution and from UAR model-provider access.

- UAR is the sole token, tool and model loop executor for a fully delegated run.
- BossFang owns the parent workflow, delegation request, user-facing control and correlation receipt. It does not interpret delegated tool calls for replay and does not continue the delegated model loop.
- The existing UAR `LlmDriver` path remains a model-provider path and cannot be relabeled as full-run delegation.
- Every receipt and trace identifies the selected mode and `executor = universal-agent-runtime` for a delegated run.
- A single delegated attempt produces no more than one UAR admission and one set of tool effects.

### 2. Idempotent admission and recoverable control identity

BossFang creates one stable `delegationId`, `bossTaskId` and `admissionKey` before the network call. UAR owns authoritative admission and binds this tuple before starting execution:

`verified owner + normalized workspace + admission_id + canonical request digest`

The selected UAR instance is the authenticated C04 endpoint and the target deployment binding is inside the digested run body; changing either cannot reuse the original admission as equivalent work.

- First admission reserves the tuple and returns the native UAR task, thread and run identities when assigned.
- The same key and digest return the same admission receipt and never start another run.
- The same qualified key with a different digest is rejected as `admission_digest_conflict`.
- A lost or timed-out response becomes `admission-unresolved`; BossFang reconciles by the same qualified key and never retries as a new admission.
- A mutation response that is lost after dispatch does not prove that the operation failed or did not occur.
- Identity and placement come from the authenticated C04 service binding and verified principal. Payload-supplied owner, tenant, instance or credential identity is not authoritative.

The admission receipt carries `delegationId`, `admissionKey`, `requestDigest`, qualified owner and target binding, selected UAR instance/profile, effective service binding, UAR task/thread/root/run identities when known, state/revision/cursor, retention profile and expiry, and uncertainty flags. It contains no raw credential or protected prompt payload.

### 3. One task authority and one approval/effect lineage

The native UAR task/thread/run record is authoritative for delegated execution. BossFang stores a durable correlation receipt and projects UAR state; it does not create a competing execution record.

- All lookup, steering, approval, cancellation and observation resolve through the qualified delegation receipt to the same UAR native record.
- Task lookup is scoped by authenticated owner, selected UAR instance and target binding. A bare task ID is insufficient authority.
- BossFang forwards UAR's exact approval identity, run/task identity, request or payload digest and current revision. It does not mint a second approval or broaden authority.
- UAR's tool-admission evidence remains the authoritative effect lineage. An uncertain effect is reported as `effect-unconfirmed`; neither runtime automatically replays it.
- Steering is admitted only for the same owner, target, contract and active native task. A follow-up never creates a replacement run implicitly.
- Existing BossFang A2A, async-task and workflow identifiers may correlate the parent workflow, but none substitutes for the UAR native identity.

### 4. Detach, cancellation and truthful retention

Detachment changes observation ownership; cancellation changes executor intent. They are distinct operations.

- Dropping an observation stream or explicitly detaching does not request cancellation.
- Cancellation has distinct `requested`, `acknowledged` and terminal `cancelled` states. A transport acknowledgement is never represented as terminal completion.
- Cleanup or effect settlement that cannot be proven remains `cleanup-unconfirmed` or `effect-unconfirmed`.
- Retention mode and expiry are returned with every admission and lookup receipt.
- Unsupported recovery is a protocol result, not a fabricated `not found`, success or automatic replay.

## Initial `process-ephemeral` profile

C05 initially supports one UAR process lifetime. Within that lifetime, UAR must preserve the qualified admission mapping, native task projection, reconnect cursor and control identity long enough to satisfy the declared retention window. A viewer may detach and reconnect during that window without cancelling or duplicating the run.

The initial profile does **not** claim restart recovery. If the owning UAR process restarts, task/admission reconstruction returns `recovery-unsupported` with profile and retention metadata. BossFang preserves its correlation receipt and visible unresolved posture; it does not resubmit the work. A C05 implementation must refuse any request that marks restart durability as required.

Durable restart recovery depends on C06, `afc-c06-durable-addressable-instances-and-bounded-turns`, establishing durable logical instances, ownership epochs, fenced activation and bounded retention. C06 may extend the profile without changing the one-executor, idempotency, authority or uncertainty invariants here.

## Required states

| Dimension | Required values |
|---|---|
| Admission | `pending`, `admitted`, `unresolved`, `refused` |
| Execution | `submitted`, `working`, `approval-required`, `completed`, `failed`, `cancelled` |
| Cancellation | `none`, `requested`, `acknowledged`, `terminal`, `cleanup-unconfirmed` |
| Effect | `not-dispatched`, `dispatching`, `settled`, `effect-unconfirmed` |
| Recovery | `available`, `expired`, `recovery-unsupported` |

Unsupported required semantics fail admission with a stable reason. Optional unsupported semantics are returned explicitly in the receipt and are never labeled enabled or enforced.

## Full-harness v1 wire boundary

The C05 adapter uses the runtime-role base path `/api/uar/full-harness/v1` and advertises capability `full_harness_delegation_v1` through the C04 capability document. Every route requires the selected service instance's runtime-role bearer credential. Admission, reconciliation, task, stream and control routes additionally require `x-uar-workspace-id`; the process descriptor is authenticated but workspace-independent. The verified token supplies principal and source-instance identity; request bodies cannot override either.

| Method and path | Purpose |
|---|---|
| `GET /capabilities` | Return the current runtime epoch, retention profile and unsupported-after-restart posture before admission or reconciliation. |
| `POST /tasks` | Admit one new or previously admitted task by stable admission ID. |
| `GET /admissions/{admission_id}` | Reconcile a lost admission receipt without executing. |
| `GET /tasks/{task_id}` | Read the current authoritative task receipt. |
| `GET /tasks/{task_id}/stream?last_event_id={cursor}` | Replay and follow ordered run events; disconnect only detaches observation. |
| `POST /tasks/{task_id}/tool-approval` | Apply one decision to an exact pending UAR approval. |
| `POST /tasks/{task_id}/cancel` | Request cancellation and return acknowledgement state. |
| `POST /tasks/{task_id}/detach` | End one observer attachment without cancelling execution. |
| `POST /tasks/{task_id}/steer` | Return typed unsupported posture for the process-ephemeral profile. |

The UAR wire body is snake_case JSON. BossFang's public API remains camelCase and its dedicated client isolates that public contract from the UAR wire contract:

```json
{
  "admission_id": "bossfang-owned-stable-key",
  "native_task_id": "bossfang-owned-task-id",
  "deployment_binding_id": "binding-id",
  "service_placement": {},
  "input": "delegated user input",
  "session_id": null,
  "working_directory": null,
  "reasoning_effort": null,
  "skill_attachments": [],
  "run_credentials": [],
  "mcp_servers": [],
  "tool_admission": null
}
```

`deployment_binding_id` selects the C04 binding and `service_placement` carries its placement expectation. Opaque run credentials, MCP servers and tool-admission input retain their existing run-API shapes; raw resolved secrets are forbidden. UAR computes the admission digest over the canonical run body plus the normalized workspace identity. The qualified idempotency key is `(verified owner, workspace, admission_id)`.

Tool approval contains `approval_id` and `approved`; detach contains `observer_id`; cancel has no additional intent. Steering is explicitly unsupported by this profile. Admission reconciliation is a qualified GET by admission ID and performs no execution. BossFang captures the runtime epoch before the admission effect and compares it before reconciliation, so a lost admission response followed by process restart becomes `recovery-unsupported` without replay.

All successful UAR endpoints return the same snake_case task receipt containing `admission_id`, `task_id`, `native_task_id`, `run_id`, `workspace_id`, `runtime_epoch`, `revision`, `cursor`, `state`, `retention`, `effective_service_binding`, diagnostics, cancellation settlement, detach state, timestamps, unsupported semantics and control links. BossFang maps that receipt into its durable camelCase correlation projection and adds admission, execution, effect and recovery postures. Streamed native run events preserve their UAR event IDs; a cursor gap or expired retention returns a typed posture rather than restarting observation at an invented position.

## Cross-repository acceptance scenarios

The completed C05 boundary must exercise these scenarios through the real BossFang-to-UAR path against exact source revisions:

1. **Execution ownership:** run equivalent native, provider-bridge and full-delegation requests; the delegated trace identifies UAR as the only loop executor and each admitted tool effect occurs once.
2. **Lost admission response:** discard the first admission response, reconcile with the same key and digest, and observe the original UAR task/run with one execution and one effect lineage.
3. **Conflicting replay:** reuse the qualified admission ID with a changed request and receive `admission_digest_conflict` without a new run.
4. **Detach and reconnect:** disconnect observation beyond the former stream grace period; the run continues, reconnect resumes from the advertised cursor, and no cancellation is emitted.
5. **Cancellation settlement:** request cancellation through BossFang, observe the request reach the exact UAR run, distinguish acknowledgement from terminal cancellation, and retain cleanup uncertainty if settlement cannot be proven.
6. **Approval round trip:** observe one UAR approval identity through BossFang, apply one authorized decision to that identity, and continue the same native task without a second approval authority.
7. **Unknown effect outcome:** lose an effect response after possible dispatch; both products preserve the same native lineage, expose `effect-unconfirmed`, and perform no automatic replay.
8. **Qualified lookup isolation:** a different owner, workspace, target agent or UAR instance cannot observe, steer, approve or cancel the task even with its raw task ID.
9. **Service placement:** the delegation uses the admitted C04 instance, endpoint roles and opaque credential references; an identity/profile/capability mismatch is refused before admission.
10. **Process restart:** under `process-ephemeral`, restart the UAR process and receive explicit `recovery-unsupported`; BossFang does not claim recovery, report success or resubmit. This scenario becomes a durable recovery scenario only after C06 conformance.
11. **Retention expiry:** after advertised expiry, lookup returns an explicit expired posture carrying the qualified correlation identity rather than implying that the task never existed.
12. **Native compatibility:** existing native BossFang execution and UAR model-provider use retain their current executor ownership and are not routed through the full-run adapter.

Passing source inspection, unit checks or mock-only transport tests does not satisfy this acceptance set. The final receipt records exact UAR and BossFang revisions, selected profile, task/run identities, event or request counts, terminal or unresolved posture, and observed effect count for each scenario.

## Installed baseline evidence

On 2026-09-27 the operator reported: **the Windows installation worked and UAR was active on port 1906**. This establishes the pre-C05 installed baseline only: packaged UAR presence, launch and preferred-port binding on that Windows system. It does not demonstrate full-run delegation, idempotent admission, task reconciliation, detach/cancel behavior, approval forwarding, restart recovery or any other C05 requirement. It is therefore not C05 acceptance or certification.

## Dependency and conformance posture

- C02 governs protected-effect admission and uncertain external outcomes.
- C03 governs lossless definitions and runtime-enforced semantics.
- C04 supplies the selected service-instance identity, endpoint roles, opaque credential references and placement admission.
- C06 is required before any C05 profile claims restart-durable task identity or recovery.
- C05 is conformant only when both repositories implement this contract and the cross-repository acceptance boundary passes. Documentation, merged code or the Windows baseline alone is insufficient.
