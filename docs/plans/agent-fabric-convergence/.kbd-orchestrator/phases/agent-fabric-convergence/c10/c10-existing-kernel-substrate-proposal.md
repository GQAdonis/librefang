# C10 existing-kernel substrate candidate proposal

Status: **source-backed architecture preparation only**. This document does not approve an architecture, select a workflow engine, admit implementation, begin or complete C10, change an approved OpenSpec artifact, qualify a runtime, or couple the shared UAR design to a Boss installer. The lead and operator retain architecture judgment. Runtime qualification remains at C08.

Source baseline: UAR `c906c24fb8114f1a3b55dc83a12feec542ae8b8d`, inspected read-only. The only existing untracked UAR path was `dist/`; it was not read as authority or modified. The four approved C10 OpenSpec artifacts and the prior UAR 6d3 preparation artifact `.prometheus/cadence/artifacts/c10-preparation-at-uar-6d3.md` were read in full. The canonical revision-482 constraint supplied for this preparation is that shared UAR design proceeds independently of Boss packaging.

## Candidate recommendation, not a substrate decision

Prepare a bounded **classify → draft → operator decision** slice on an adapter contract that the existing UAR kernel could implement. Stop after the durable operator decision. This slice has no connector write, issue creation, customer communication, roadmap commitment, or implementation admission. It therefore exercises the missing workflow cursor and decision record before C10 adds external effects.

The candidate reuses the existing team executor for the two model turns. It adds no second model loop. Progression would occur through revisioned CAS transitions invoked after settlement, decision submission, and recovery; it adds no independent timer scheduler. This shape is a recommendation for the comparison baseline, not approval to implement it and not a decision against an external engine.

```text
pinned WorkflowDefinition
          |
          v
  compiled bounded plan ---- owner/workspace/team + authority revisions
          |
          v
   classify TeamTask --successful attempt + immutable artifact--+
          |                                                |
          v                                                |
     draft TeamTask ----successful attempt + immutable artifact
                                                           |
                                                           v
                                              durable operator wait
                                                           |
                                        accept | reject | revise | cancel
                                                           |
                                                           v
                                               recorded decision only
                                      no issue write; no implementation admission
```

## Actual current-source evidence

| Concern | Current UAR contract at `c906c24` | C10 consequence |
|---|---|---|
| Immutable authored definitions | Package compilation verifies manifest content digest, exact file-byte digests and the package graph before activation. `validation.rs: src/uar/compiler/collaboration/validation.rs:46` `validation.rs: src/uar/compiler/collaboration/validation.rs:64` `validation.rs: src/uar/compiler/collaboration/validation.rs:114` | Reuse the immutable source identity. Add a compiled-plan record that pins the workflow, package and binding revisions actually interpreted. |
| Authored workflow shape | Draft.2 already defines steps, input mappings, effects, approvals, retry, completion, failure policy and `maxActivations`. `workflow schema: docs/agents/collaboration/v0.1.0-draft.2/schemas/workflow-definition.schema.json:46` `workflow schema: docs/agents/collaboration/v0.1.0-draft.2/schemas/workflow-definition.schema.json:65` `workflow schema: docs/agents/collaboration/v0.1.0-draft.2/schemas/workflow-definition.schema.json:141` | Interpretation is still missing: selector vocabulary, role resolution, mapping evaluation, instruction authority and contract compatibility need a versioned closed contract. |
| Executability | UAR advertises `WorkflowDefinition` storage but explicitly reports workflow activation `false`; only team activation is enabled dynamically for qualified service instances. `capabilities.rs: src/uar/api/capabilities.rs:167` `capabilities.rs: src/uar/api/capabilities.rs:202` `capabilities.rs: src/uar/api/capabilities.rs:212` | Lossless catalog support is not workflow execution. C10 cannot treat stored definitions as runnable. |
| Durable team/task identity | `TeamInstance` and `TeamTask` hold owner/workspace scope, revisions, dependencies, role, input and output contract. `team_planning.rs: src/uar/domain/team_planning.rs:131` `team_planning.rs: src/uar/domain/team_planning.rs:159` | Classify and draft can be ordinary team tasks, but a workflow run must durably map each step to its task, original attempt and selected artifact. |
| Admission and idempotency | `admit_team_task` accepts a stable `command_id`, expected team/task revisions, reservation and context artifact IDs; command receipts are committed with the attempt under CAS. `admission.rs: src/uar/compiler/collaboration/team_execution/admission.rs:13` `admission.rs: src/uar/compiler/collaboration/team_execution/admission.rs:275` | Reuse command replay protection and reservations. Add one workflow activation identity so recovery cannot admit another classify or draft attempt for the same step activation. |
| Attempts and uncertain outcomes | `TeamExecutionAttempt` records run/root/approval scope, ownership and execution epochs, reservation, effect disposition, accounting state, outcome and output. `team_execution.rs: src/uar/domain/team_execution.rs:35` Settlement makes terminal outcome immutable and retains `reserved-unknown` accounting when usage is absent. `settlement.rs: src/uar/compiler/collaboration/team_execution/settlement.rs:120` `settlement.rs: src/uar/compiler/collaboration/team_execution/settlement.rs:152` | Workflow progression must define whether authoritative model success may advance while accounting remains unresolved. It must never convert unknown effects into retry permission. |
| Output validation and artifacts | Runtime validates output against the task JSON Schema before calling `add_team_artifact`. `execution.rs: src/uar/runtime/team_execution/execution.rs:93` Artifact identity is deterministic per attempt and an existing artifact is immutable. `scope.rs: src/uar/compiler/collaboration/team_execution/scope.rs:46` `scope.rs: src/uar/compiler/collaboration/team_execution/scope.rs:68` | Reuse the artifact store. Add a canonical content digest and an explicit selected-artifact link on the workflow step and operator wait. Current `TeamArtifact` stores content and attempt identity but no digest field. `team_execution.rs: src/uar/domain/team_execution.rs:80` |
| Aggregate persistence | `CollaborationCatalogState` already contains teams, attempts, artifacts, waits, continuations, command receipts and execution ownership records. `collaboration.rs: src/uar/domain/collaboration.rs:432` `CollaborationStorage` exposes generation compare-and-swap for memory, SurrealDB and Postgres implementations. `storage.rs: src/uar/compiler/collaboration/storage.rs:15` `storage.rs: src/uar/compiler/collaboration/storage.rs:22` | Workflow records could join the same aggregate. Only SurrealDB/Postgres provide restart durability; the memory implementation is process-local and cannot prove the C10 restart requirement. Whole-catalog CAS contention at target load is unmeasured. |
| Peer waits | `TeamWait` is an attempt-derived wait over delegated task IDs; current admission accepts only `all-terminal`, 1–16 targets, and reserves a fresh continuation. `team_wait.rs: src/uar/domain/team_wait.rs:185` `waits.rs: src/uar/compiler/collaboration/team_execution/waits.rs:13` `waits.rs: src/uar/compiler/collaboration/team_execution/waits.rs:19` | Reuse its durable identity, authority and continuation patterns. It is not an operator decision wait and must not be stretched into one. |
| Wait continuation and recovery | Readiness requires terminal confirmed target outcomes, then commits a unique fresh continuation attempt. `continuations.rs: src/uar/compiler/collaboration/team_execution/continuations.rs:11` `continuations.rs: src/uar/compiler/collaboration/team_execution/continuations.rs:195` Recovery explicitly does not restore a future; it joins the original thread tree and rejects unresolved effect evidence before CAS admission. `recovery.rs: src/uar/runtime/team_execution/recovery.rs:1` `recovery.rs: src/uar/runtime/team_execution/recovery.rs:9` | A workflow recovery contract should follow the same rule: reconstruct from durable records and admit a new action only after the original producer/effects are resolved. |
| Model execution ownership | Process-local workers consume catalog-owned attempts and explicitly contain no model loop; the existing actor thread executes the request. `controller.rs: src/uar/runtime/team_execution/controller.rs:39` `execution.rs: src/uar/runtime/team_execution/execution.rs:273` | C10 should schedule existing attempts only. A workflow controller must not become another model executor. |
| Current operator approval path | Tool approval exposes one owner-scoped **live** waiter, resolved through an in-process broker and bounded to five minutes. `approvals.rs: src/uar/runtime/thread/approvals.rs:30` `approvals.rs: src/uar/runtime/thread/approvals.rs:96` `approvals.rs: src/uar/runtime/thread/approvals.rs:241` Persisted tool-admission evidence converts an approval pending at restart to `interrupted`; it does not restore the human waiter. `tool_admission.rs: src/uar/persistence/tool_admission.rs:52` | Reuse the authenticated owner/API/event pattern only. C10 needs a separate durable operator-wait and decision receipt bound to the exact draft artifact; current tool approval is not that substrate. |
| Step isolation | Ordinary team resolution adds team collaboration tools when profile B is active, and selected context can include authorized inbox and referenced artifacts. `resolution.rs: src/uar/compiler/collaboration/team_execution/resolution.rs:150` `context.rs: src/uar/compiler/collaboration/team_execution/context.rs:29` | The candidate classify/draft plan needs explicit `effect: none`, a closed tool set, selected context, and trusted instruction provenance. Task input alone cannot confer instruction authority. |

## Substrate comparison

The approved C10 design requires this comparison and explicitly selects no engine. [design.md](../../../../openspec/changes/afc-c10-feedback-workflow-and-governed-connector-effects/design.md#L17) [design.md](../../../../openspec/changes/afc-c10-feedback-workflow-and-governed-connector-effects/design.md#L21)

| Criterion | Candidate A: additive records over existing UAR team/CAS kernel | Candidate B: external durable workflow engine | Evidence boundary / decision still needed |
|---|---|---|---|
| Embedding | Stays within the UAR service and current collaboration storage/runtime boundaries. No new process is implied. | Requires an engine adapter and may require a worker, service or control plane; no candidate has been named, so topology is unknown. | Determine supported embedded profiles and whether any external candidate can run within them. Boss packaging is not the design authority. |
| Offline operation | SurrealDB/Postgres collaboration storage can persist the aggregate; process-local memory cannot survive restart. No offline C10 run was exercised here. | Offline behavior is unknown until a concrete engine and persistence topology are selected from current primary documentation. | Define the offline profile and required restart interval before scoring either option. |
| Recovery | Existing attempts, effect dispositions, ownership fences, waits and joined-tree recovery supply reusable invariants. New workflow cursor and operator-decision recovery remain required. | An engine may supply workflow cursor/wait recovery, but compatibility with UAR effect evidence, actor trees and ownership fences is unmeasured. | Require one restart scenario with an original attempt unresolved and one with a draft awaiting operator decision. |
| Ownership | UAR currently fences one execution owner and stores owner/workspace/team scope with every attempt. Additive records can remain under that authority. | Engine ownership, worker leases and UAR execution fencing would need one explicit authority boundary and recovery order. | Choose one owner for workflow advancement and define how engine lease, UAR fence and operator authority interact. |
| Idempotency | Command receipts, deterministic attempt artifact identity and CAS already protect current mutations. A new workflow activation/step/decision key is still necessary. | Engine replay semantics do not automatically make UAR model turns or connector effects idempotent; cross-system identity and reconciliation would still be required. | Define stable keys for workflow run, step activation, decision and later connector intent before implementation. |
| Operator wait | Current live tool approval can inform authentication and event presentation but cannot survive restart as a pending decision. An additive durable wait is required. | An engine may provide durable human tasks, but exact artifact binding, UAR authority and client/API integration remain local contracts. | Decide allowed decisions, decision authority, expiry, revise behavior and whether acceptance creates a separate immutable artifact. |
| Model loop | Existing `TeamExecutionRuntime` schedules the one UAR actor-thread model loop. | An external engine must dispatch into the same executor and must not host or duplicate model execution. | This is a fixed boundary, not a scoring preference. |
| Scheduler ownership | Advancement can be a CAS transition triggered by settlement, decision commands and startup recovery. No separate polling/timer scheduler is required for the bounded slice. | External scheduling is part of the engine’s ownership model; introducing it without a selected engine would create two advancement authorities. | Select exactly one advancement authority before implementation. |
| Artifact truth | Existing output validation and immutable attempt artifacts are directly reusable, after adding canonical digest and selected-artifact linkage. | Engine payload/history cannot replace UAR artifact authority without changing product contracts. | Keep UAR artifact identity authoritative under either option. |
| Throughput and operating cost | Whole-catalog CAS, backend behavior and controller wake-up cost are unmeasured for C10 load. | No engine candidate, version, deployment shape or price basis has been selected or measured. | Set capacity and cost targets, then measure both candidates. Source structure cannot decide this row. |
| Change surface | Additive UAR domain/service/API/runtime records; Boss can consume typed administration later. | Adds dependency, adapter, operations and failure-boundary work in addition to UAR integration. Exact scope is unknown without a candidate. | Compare against a named engine only after primary documentation and dependency compatibility are verified. |

Candidate A is the recommended baseline for the bounded slice because it reuses observed contracts and exposes the exact missing records without adding a second execution authority. This is not an engine rejection. If measured capacity, recovery or operational requirements exceed the existing aggregate, Candidate B remains open and the approved C10 substrate decision remains unresolved.

## Exact new contracts required by the bounded candidate

Names below are descriptive candidate names, not approved Rust/API identifiers.

1. **Compiled workflow plan** — versioned interpreter contract; source workflow/package/binding refs and digests; closed selector/mapping vocabulary; resolved roles; validated step input/output compatibility; trusted instruction provenance; step effect/approval/retry/completion semantics; failure policy; `maxActivations`; compiler version/digest.
2. **Workflow run** — stable run and activation IDs; owner/workspace/team; pinned compiled plan; revision and status; activation budget; current step dispositions; original task/attempt/artifact links; cancellation intent; created/updated timestamps.
3. **Workflow step activation** — stable uniqueness key; step ID and ordinal; task ID; original admitted attempt ID; selected input artifact IDs/digests; selected output artifact ID/digest; execution/effect/accounting disposition; no replacement while the original remains unresolved.
4. **Canonical artifact digest** — digest over canonical artifact content, recorded with the existing attempt-owned `TeamArtifact`; workflow and decision records bind both artifact ID and digest.
5. **Durable operator wait** — wait ID; workflow/step revision; exact draft artifact ID/digest; allowed decisions; decision authority and revision; state; expiry policy if any; presentation/event cursor; no model-accessible resolver.
6. **Operator decision receipt** — stable command ID and request digest; authenticated actor/authority reference; wait revision; exact artifact ID/digest; decision; optional reason/revision instruction; committed timestamp; replay returns the original result; conflicting replay is refused.
7. **Progression contract** — classify advances only after authoritative success plus its committed artifact; draft follows the same rule; draft completion creates the durable operator wait; operator acceptance records a decision but does not create an issue or admit implementation. Reject/cancel are terminal for this slice. Revise behavior remains an operator choice.
8. **Step execution policy** — explicit `effect: none`; closed tool allow-list; exact context sources; trusted workflow instructions distinct from untrusted feedback/task input; reservation and activation limits; no connector credentials or write capabilities in this slice.
9. **Recovery contract** — one workflow advancement owner; startup scans durable nonterminal runs; original task/attempt/effect disposition is reconciled before any new admission; existing live producer blocks recovery; CAS and uniqueness keys make recovery replay-safe.
10. **Typed administration and capability contract** — create/read/list/cancel/decide operations with expected revisions and stable command IDs; sanitized events/views; workflow activation stays unavailable until the selected implementation and supported storage profiles are qualified.

## Capacity facts and unmeasured targets

Observed source limits are not performance evidence:

- peer waits accept 1–16 target tasks;
- authored workflows allow `maxActivations` from 1 to 1,000;
- team execution defaults to four process-local active permits and is also bounded by team/binding `concurrentTurns`. `controller.rs: src/uar/runtime/team_execution/controller.rs:77` `settlement.rs: src/uar/compiler/collaboration/team_execution/settlement.rs:53`

No approved C10 throughput, queue-depth, decision-wait age, restart-time, CAS-contention, storage-growth, latency or operating-cost target was found in the four C10 artifacts. No C10 benchmark, offline run, restart scenario, mobile/embedded qualification, connector call, build or test was executed during this preparation. External-engine behavior is intentionally unasserted because no engine/version/topology has been selected and no primary engine documentation was needed for this source-only comparison.

Before a substrate decision, the operator must set the capacity and supported-profile targets that make the comparison falsifiable. Until then, “reuse is fast enough” and “an engine scales better” are both unsupported claims.

## Unresolved operator architecture choices

1. Select the workflow substrate only after a named, measured comparison; this proposal does not select one.
2. Choose the single workflow-advancement owner and define its relation to UAR execution fencing and service-instance recovery.
3. Choose a dedicated workflow team or an existing team, plus exact member roles, context sources and trusted instruction layers.
4. Decide whether a successful model output with unresolved provider accounting may advance, while preserving the reservation and visible uncertainty.
5. Define operator decision authority, allowed decisions, expiry, revise semantics, immutable artifact binding and terminal cancel/reject behavior.
6. Decide which persistence profiles are supported for C10. The in-memory backend cannot satisfy restart durability.
7. Set capacity, latency, restart, wait-age, storage-growth and operating-cost targets before scoring an external engine.
8. Accept or revise the versioned workflow interpreter/extension vocabulary. The existing schema alone does not define executable selector/mapping semantics.
9. Define later connector-effect intent, outcome and unknown-effect reconciliation separately. The bounded candidate deliberately contains no external effect.

## Preparation boundary

This artifact updates the earlier 6d3 source map to UAR `c906c24` and supplies comparison evidence for lead/operator review. It creates no product task, implementation change, scheduler, model loop, service, package, test evidence, architecture approval or C10 progress claim. The approved C10 tasks remain pending. [tasks.md](../../../../openspec/changes/afc-c10-feedback-workflow-and-governed-connector-effects/tasks.md#L7)
