# UAR team execution profile 0.1.0

Contract status: frozen documentation contract for approved D1–D5, 2026-09-30. Implementation status: **proposed, not implemented or runtime-qualified by this document**. The operator's `/kbd-execute uar-team-execution-architecture` authorizes this documentation child only; [approval.json](approval.json) records that boundary. Parent implementation remains separately gated. Authority: [approved plan](plan.md), [runtime input](planning-runtime-input.md), [provider input](planning-provider-input.md). Migration behavior is specified in [legacy-migration.md](legacy-migration.md).

Profile identifier: `urn:prometheus:uar:team-execution:0.1.0`. This execution profile does not rename or claim full conformance to collaboration definition draft.2. Existing definition schemas remain authoritative until parent implementation publishes explicit compatible schema changes. Examples below are execution-profile DTOs, not directly installable draft.2 packages or evidence of endpoint availability.

## 1. Capability and compatibility contract

| Capability ID | Slice | Requirement and current evidence |
| --- | --- | --- |
| `team_execution_single_executor_v1` | A | Exclusive dedicated-catalog execution claim, authenticated recovery, fenced admission/effects. Proposed; current process-local supervision is insufficient. |
| `team_execution_endpoint_profile_v1` | A | Independent route, alias, pricing, profile/settings; default reasoning off; exact endpoint validation and visible fit disposition. Existing provider repair remains unbuilt/unverified. |
| `team_execution_selected_context_v1` | A | Existing exact member skills/tools and selected artifacts; current scope checks remain required. No arbitrary shared memory promise. |
| `team_execution_peer_tools_v1` | B | Four frozen tools, attributed messages, directed-edge authorization and atomic delegation. Proposed. |
| `team_execution_shared_instructions_v1` | B | Versioned shared guidance, bounded authorized roster and inspectable selection. Proposed. |
| `team_execution_continuations_v1` | B | Safe typed yield, waiting task, unique fresh continuation and one-slot operation. Proposed. |

A exposes manual member execution; B requires operated Gate A and all B capabilities together. A client must negotiate profile and capability IDs before offering B actions. Unknown profiles or required capabilities refuse execution with `TEAM_CAPABILITY_UNSUPPORTED`; optional unsupported context selections appear as explicit exclusions. Schema/enum parse failure is a compatibility failure, never an empty successful result. A backend can implement these types without being qualified; advertise a backend only after its completed operation evidence exists.

Deferred and explicitly unsupported: broadcasts, cross-team messaging/waits, timer wakes, automatic executor takeover, concurrent executors, arbitrary shared KB/memory/history grants, durable subteams, unmapped `permittedChildren`, full team AG-UI/A2UI/A2A conformance. No second scheduler, broker, outbox table, daemon or Boss task-state database is introduced. The existing catalog and controller own durable intent and dispatch.

## 2. Normative encoding and identities

The TypeScript notation in sections 3–7 defines frozen **specification targets**, not existing production APIs. Every object is closed: reject undeclared properties, including attempts to supply actor/owner/workspace/team identity in model-facing requests. `?` means omission permitted; otherwise fields are required. No implicit nulls, coercion or extra-body maps. `Json` means a JSON value, recursively excluding nonfinite numbers. Objects named `SchemaDocument` are JSON Schema documents validated by the implementation's existing validator; this is the only schema-shaped extension point, not executable code.

Scalar bounds: `Id` is 1–128 ASCII letters/digits/dot/underscore/hyphen, beginning with a letter or digit. `Revision` is an integer 1–9,007,199,254,740,991; `Counter` is an integer 0 through that same maximum. `Digest` is `sha256:` followed by 64 lowercase hexadecimal characters. `Instant` is an RFC3339 UTC timestamp. Text is UTF-8, with byte limits stated below. `Ref` means `{ id: Id; revision: Revision }`. Server-generated cursors are opaque, bound to principal/scope/authorization revision and limited to 2,048 bytes. Duplicate array IDs are rejected. Protected diagnostic/evidence references are opaque IDs resolved through authenticated APIs, not arbitrary filesystem paths or URLs to fetch.

Definitions, installed bindings, service instance, catalog, TeamInstance, TeamMember, TeamTask, TeamExecutionAttempt, run/root/session, message and wait each retain separate IDs. A continuation keeps task/member identity but receives a new attempt/run/root and current approval authority. A service ID may survive restart; a process incarnation never does. Display names are not effect targets. Admission captures immutable definition/binding/context/provider revisions; current policy, membership and execution ownership are rechecked at protected effects.

Example files use `{ runtimeConformance: false, profile, kind, data }`; `profile` is the exact identifier above, `kind` is the DTO name below, and `data` conforms to that DTO. They contain fictional IDs and fixtures only. Digests identify illustrative content unless an example explicitly says otherwise; they are not package integrity receipts or real claims of provider compatibility. New payload byte/page bounds below are proposed protocol limits, not discoveries about model capacity. Example token/cost reservations are illustrative requests, not known provider limits or measured usage.

[Structural example schema](examples/execution-profile.schema.json) checks closed object shapes, scalar types and unions. JSON Schema string lengths count characters; the stricter UTF-8 byte limits, canonical digest calculation, authorization, cross-record equality, output-contract validity and lifecycle invariants remain normative semantic requirements here. Schema validation alone cannot certify them. All illustrative examples explicitly set runtimeConformance false.

## 3. Ownership and privileged recovery

```ts
type Scope = { ownerId: Id; workspaceId: Id; teamId: Id };
type ExecutionFence = { catalogId: Id; serviceInstanceId: Id; incarnationId: Id; epoch: Revision };
type ExecutionClaim = ExecutionFence & {
  state: 'held' | 'draining' | 'released'; acquiredAt: Instant;
  auditReceiptId: Id; releasedAt?: Instant;
};
type ReclaimRequest = {
  commandId: Id; catalogId: Id; expectedEpoch: Revision;
  replacementServiceInstanceId: Id; reason: string; fencingEvidenceRef: Id;
};
type ReclaimReceipt = {
  commandId: Id; requestDigest: Digest; authenticatedActorId: Id;
  previousFence: ExecutionFence; replacementFence: ExecutionFence;
  authorizationDecisionRef: Id; fencingEvidenceRef: Id;
  transferredQueuedAttemptIds: Id[]; uncertainAttemptIds: Id[];
  committedAt: Instant;
};
type AttemptAuthority = Scope & {
  taskId: Id; memberId: Id; attemptId: Id; runId: Id;
  taskOwnershipEpoch: Revision; memberRevision: Revision;
  binding: Ref; executionFence: ExecutionFence;
};
```

Scope and AttemptAuthority are host-resolved records, never model inputs. Reason is 1–2,048 bytes. Reclaim arrays contain at most the catalog's configured pending/active limits; large recovery uses scoped paged receipts rather than truncating IDs. The fresh replacement incarnation is generated by the runtime performing the authenticated operation; callers cannot nominate a reusable boot nonce.

Acquire an absent/released claim by catalog generation CAS before admitting or advertising executable team capability. All admission, queued→running claims, effect revalidation, wait/resume transitions and execution-owned mutations require the captured fence to match the held claim in the same state that is committed. A draining claim permits only the exact owner's cleanup/settlement/release, never fresh admission or dispatch. A second executor is read-only for this profile and returns `TEAM_EXECUTION_OWNER_CONFLICT` for execution/recovery. A transport or database outage cannot manufacture authority.

Graceful release follows confirmed joining of all owned roots and effect-producing children. Unconfirmed cleanup leaves the claim held/draining and reservations retained. No lease expiry, heartbeat timeout or absent PID permits takeover. Crash recovery requires all of: authenticated operator principal; existing privileged administrative authorization for this catalog; current expected epoch; nonempty reason; inspectable evidence that the prior process and effect-producing children are stopped or externally fenced. The privileged host verifies the evidence and decision before CAS. A string reference or an operator assertion alone is not mechanical proof of physical fencing. Reject model/tool credentials regardless of what role a model claims. Reject unauthenticated, unauthorized, stale-epoch and insufficient-evidence requests before changing ownership.

An authorized replacement increments epoch, records old/new fences and an append-only audit receipt, transfers only never-dispatched queued authority, and makes interrupted dispatched work uncertain. Queued attempts keep their IDs/run IDs/command receipts; a separate transfer receipt updates their dispatch fence without rewriting original admission evidence. Old dispatched attempts keep original fences. Late old results enter only scoped operator reconciliation with original provider/effect receipts; stale normal settlement cannot complete or overwrite a current task. Existing command receipt replay returns the same reclaim result after rechecking caller authority; changed payload under the same command ID conflicts.

Dedicated remote catalog and controlled current executor versions/credentials are prerequisites. A new record cannot stop an older binary that ignores it or retract an external effect already issued. If prior-process exclusion cannot be established, replacement remains blocked. This is exclusive execution with explicit recovery, not automatic failover or exactly-once external effects.

## 4. Provider route, profile and effective settings

```ts
type RouteIdentity = { providerId: Id; modelId: string };
type PricingIdentity = { providerId: string; modelId: string; catalogRevision: string };
type ReasoningRequest =
  | { mode: 'off' }
  | { mode: 'explicit'; effort: 'none' | 'low' | 'medium' | 'high' | 'max' };
type ModelSettingsRequest = {
  route: RouteIdentity; profile: Ref; expectedSettingsRevision: Revision;
  reasoning?: ReasoningRequest;
};
type LimitMetadata = {
  contextTokens?: Counter; outputTokens?: Counter;
  source: 'endpoint-profile' | 'provider-catalog' | 'operator-assertion' | 'unknown';
  sourceRevision?: string;
};
type FitDisposition =
  | { mode: 'settings-only'; guaranteedFit: false; reason: 'count-or-framing-unqualified' }
  | { mode: 'guaranteed-fit'; guaranteedFit: true; budgetContract: Ref; countEvidenceRef: Id };
type EffectiveModelReceipt = {
  route: RouteIdentity; wireModelAlias: string; pricingIdentity?: PricingIdentity;
  endpointKind: string; profile: Ref; settingsRevision: Revision;
  requestedReasoning: ReasoningRequest; effectiveReasoning: ReasoningRequest;
  support: 'validated'; supportEvidenceRef: Id; limits: LimitMetadata;
  fit: FitDisposition;
};
type Diagnostic = {
  code: string; field?: string; retryable: boolean;
  action: 'rebind' | 'change-settings' | 'reconcile' | 'contact-operator' | 'none';
  protectedDiagnosticRef?: Id;
};
type ModelSettingsResult =
  | { disposition: 'accepted'; effective: EffectiveModelReceipt }
  | { disposition: 'refused'; requested: ModelSettingsRequest; diagnostic: Diagnostic };
type ProviderModelSettingsRecord = {
  route: RouteIdentity; pricingIdentity?: PricingIdentity; profile: Ref;
  settingsRevision: Revision; reasoning: ReasoningRequest;
};
type RebindModelRequest = {
  commandId: Id; bindingId: Id; expectedBindingRevision: Revision;
  route: RouteIdentity; profile: Ref; settingsRevision: Revision;
};
```

Route/model/pricing/endpoint strings are nonempty and at most 512 bytes; they are exact registry identifiers, not permission to send arbitrary URLs. `endpointKind` names a trusted registered adapter. Profile resolution binds the configured route, exact trusted endpoint identity and wire alias together; a profile from another endpoint or model refuses. The wire alias need not equal the qualified internal model ID. Canonical pricing identity supplies price provenance only, never endpoint compatibility or context limits. Absent price is unknown price, never zero.

The reasoning effort vocabulary above is the existing UAR `ReasoningEffort` vocabulary. Omitted reasoning resolves to `{mode:'off'}`; this narrow profile does not inject `thinking` from model family/history. Explicit `none` remains an explicit requested control and is accepted only if the endpoint profile maps it. `off` requests no reasoning control and emits no unsolicited reasoning parameter; it does not claim the provider performs no internal reasoning. Explicit unsupported or unknown controls refuse before dispatch with `TEAM_REASONING_UNSUPPORTED`. No silent drop, arbitrary request JSON or renderer-authored allowlist is permitted.

Profile/settings metadata is resolved and validated by trusted UAR configuration, captured on the actual leaf and request preparation for every attempt/retry/allowed fallback, and stored in effective evidence. A fallback without its own qualified profile refuses. A settings save uses the expected settings revision; changing effective team settings requires explicit revisioned rebind. ModelSettingsRequest updates the named settings only: omitted pricing is not a deletion. ProviderModelSettingsRecord is the safe lossless projection; read/edit/save preserves its pricing and profile/settings. RebindModelRequest refers to already validated saved settings and increments binding revision through existing authority; a changed setting cannot reuse the old binding merely because provider/model match. Historical receipts remain immutable. Credentials stay in protected main/UAR stores and never appear here.

Settings-only mode proves request-field validation against the exact endpoint profile; it **does not prove tokenization, framing, capacity or fit**. It retains conservative unknown-capacity handling and aggregate reservations. Known limits require source/revision; unknown limits omit both token counts. Operator assertions are visibly labelled and cannot justify `guaranteedFit:true` by themselves. Guaranteed-fit requires independently justified count/limits evidence; the synthetic exact fixture cannot establish a real gateway contract. Supported explicit-reasoning examples are fictional profile fixtures, not a claim that the present gateway supports them.

## 5. Shared instructions, bounded context and directed authorization

```ts
type TeamInstructions = { revision: Revision; digest: Digest; text: string };
type RosterMember = { memberId: Id; role: Id; label: string; safeCapabilities: Id[] };
type ContextSelection = {
  sourceId: Id; sourceKind: 'team-input' | 'task-input' | 'artifact' | 'message' | 'skill';
  disposition: 'selected' | 'excluded'; reasonCode?: string;
  originalBytes: Counter; selectedBytes: Counter; truncated: boolean;
};
type TeamContextReceipt = {
  authority: AttemptAuthority; rootId: Id; approvalScopeId: Id; teamInstructions?: TeamInstructions;
  instructionOrder: ['host-policy', 'team-instructions', 'member-instructions', 'task-instructions'];
  self: RosterMember; coordinatorMemberId: Id; roster: RosterMember[];
  authorizationRevision: Revision; selections: ContextSelection[];
  targetOutcomes: TargetOutcome[]; targetOutcomeDataTrust: 'untrusted-attributed-data';
  contextBudgetTokens: Counter; countQuality: 'exact' | 'conservative' | 'unknown';
};
type RosterRequest = { cursor?: string; limit: number };
type RosterResult = { members: RosterMember[]; authorizationRevision: Revision; nextCursor?: string };
```

Instructions text is at most 16,384 bytes; labels at most 256 bytes; safeCapabilities at most 32 entries per member. Initial context roster is at most 16 members; roster tool pages are 1–50 members and contain only currently authorized entries. Context selections are at most 128, with explicit field diagnostics for required material that cannot fit. Every attempt, including continuation, receives current approved shared instructions, self/assignment, mission/team input and an authorized bounded roster; required guidance is not silently truncated. Receipt fields disclose selection, exclusions, truncation and token budget. Unknown count quality is not exact counting. Private peer prompts/history are never roster data.

Behavioral precedence is immutable host/security policy → approved team instructions → member specialization → approved task instructions. This is prompt composition order, not capability delegation. Task inputs, model-authored delegated payloads, peer messages and artifact bodies remain attributed untrusted data; text inside them cannot promote itself into any instruction layer. Team instructions cannot widen Cedar policy, credentials, approvals, tools or resource grants. Static configuration conflicts refuse; natural-language contradictions are not claimed to be mechanically decidable.

Authorization is required **before roster visibility, inbox selection/disclosure, send, delegation admission and wait-target/result disclosure**, and is rechecked before model handoff and every protected effect. Resolve actual members/roles under the attempt's current scope and binding. A membership check alone is insufficient. Resolve exact directed `fromRole → toRole` communication edges and permitted mode from the installed definition. No reverse edge is inferred.

- `team_send`: sender → recipient edge permitting `queue-only`, plus current recipient/task scope.
- `team_delegate`: sender → recipient edge permitting `trigger-turn`, plus current task-acceptance/coordinator delegation authority and eligible recipient role. A trigger-turn edge alone cannot grant task-authoring authority.
- Roster visibility: self plus peers for which current definition/binding permits a relevant communication/delegation relation; redact unauthorized members before pagination. Coordinator identity is visible only under the definition's authorized team context; an execution requiring an undisclosable coordinator is unsupported.
- Inbox disclosure: only messages addressed to self/current task; the original sender → recipient edge must still authorize the original mode. Delegation receipts do not grant reply permission. Worker-to-coordinator messages require a reverse edge. Task-result wake/disclosure requires both the authorized delegation relation and current worker → coordinator `queue-only` result-disclosure edge. Configure both directions for the cooperating-pair profile.
- Wait authorization: coordinator owns the waiting task; all targets are same-team delegated tasks visible to it under those current edges. Revoked edges prevent content disclosure/admission even if an earlier receipt was accepted. Persist a safe rejected disposition without leaking forbidden message bodies.

No model-facing inbox tool is added in 0.1.0. Runtime selects authorized inbox envelopes into admitted context and records delivery/consumption; queue-only sending does not activate a turn. This keeps the frozen family at four tools. Broader inbox search is deferred.

## 6. Frozen tools, atomic delegation and receipts

Exact model-facing tool IDs: **`team_roster`, `team_send`, `team_delegate`, `team_wait`**. Ordinary child-thread tool IDs and root-local semantics are unchanged. The selected profile determines these tool schemas; a profile version is not supplied inside model arguments.

```ts
type Reservation = { tokens: Counter; costMicrounits: Counter; elapsedSeconds: Counter };
type DirectRecipient = { memberId: Id; taskId?: Id };
type AttributedPayload = { text: string; artifactIds: Id[] };
type SendRequest = { commandId: Id; recipient: DirectRecipient; payload: AttributedPayload };
type DelegateRequest = {
  commandId: Id; recipientMemberId: Id; expectedTeamRevision: Revision;
  task: { taskId: Id; role: Id; input: Json; outputContract: SchemaDocument; dependsOn: Id[] };
  payload: AttributedPayload; reservation: Reservation;
};
type CommandReceipt = {
  commandId: Id; requestDigest: Digest; scope: Scope;
  operation: 'team_send' | 'team_delegate' | 'team_wait';
  senderMemberId: Id; senderAttemptId: Id; acceptedAt: Instant;
  messageId?: Id; taskId?: Id; attemptId?: Id; waitId?: Id;
};
type MessageDelivery = {
  messageId: Id; recipientMemberId: Id; recipientTaskId?: Id;
  status: 'accepted' | 'delivered' | 'consumed' | 'rejected';
  selectedAttemptId?: Id; selectedAt?: Instant; consumedAt?: Instant; rejectionCode?: string;
};
type SendResult = { receipt: CommandReceipt; delivery: MessageDelivery };
type DelegateResult = { receipt: CommandReceipt; delivery: MessageDelivery; queuedAttemptId: Id };
```

Tool map: `team_roster(RosterRequest) → RosterResult`; `team_send(SendRequest) → SendResult`; `team_delegate(DelegateRequest) → DelegateResult`; `team_wait(WaitRequest) → WaitAccepted` with the internal yield behavior below. Errors return Diagnostic with a stable code and no raw provider prose. Payload text ≤8,192 bytes, artifactIds ≤16; task input and output schema ≤32,768 serialized UTF-8 bytes each; dependsOn ≤16. Reservations require positive tokens and elapsedSeconds, with nonnegative costMicrounits; unknown price cannot be represented as authoritative zero-cost usage. Existing binding budgets may require a positive cost reservation before admission. All limits narrow against binding/host policy.

Command namespace is authenticated owner + workspace + team + originating attempt + commandId. Retries of the same canonical operation/request return original IDs and acceptance time; a changed operation/payload conflicts with `TEAM_COMMAND_CONFLICT`. Retries recheck current visibility authority before returning content. Runtime, not the model, injects sender identity and computes digest. A taskId already associated with a different delegation request conflicts; no overwrite. A deliberate new task uses a new taskId/commandId. Receipt links required by operation: send has messageId; delegate has messageId/taskId/attemptId matching queuedAttemptId; wait has taskId/waitId. No inapplicable link is emitted.

Queue-only send commits envelope + command receipt. Delegation atomically commits the new task, assigned recipient, attributed envelope, queued attempt, captured reservation and command receipt in one catalog generation CAS. Check edges/current scope, task acceptance, cycles/dependencies, pending-work bounds, aggregate budgets and profile readiness before commit. Failure commits none of these. Queued intent may wait for a predecessor; it is not dispatched until dependencies satisfy the task's success requirements. The controller is the sole consumer and must claim queued→running before executing.

Accepted means durable envelope; delivered means durably selected into a specific admitted attempt's context; consumed means durably recorded model-input handoff. Consumed does not establish understanding, agreement or task success. Store selection/consumption per message+attempt; duplicate context assembly cannot consume twice. If input handoff becomes uncertain, preserve uncertainty and never claim consumed from selection alone. Task completion is an independent execution/output-contract/artifact outcome. Legacy `processed` is not automatically relabelled consumed without matching handoff evidence.

## 7. Durable wait, typed yield and continuation

```ts
type WaitRequest = {
  commandId: Id; targetTaskIds: Id[]; predicate: 'all-terminal';
  continuationInput: AttributedPayload; continuationReservation: Reservation;
};
type WaitAccepted = { receipt: CommandReceipt; waitId: Id; state: 'yield_requested' };
type TeamWait = {
  waitId: Id; authority: AttemptAuthority; targetTaskIds: Id[];
  predicate: 'all-terminal'; continuationInput: AttributedPayload;
  continuationReservation: Reservation; state: 'yield_requested' | 'waiting' | 'blocked' | 'resumed' | 'invalidated';
  continuationAttemptId?: Id; wakeOutcomes: TargetOutcome[]; reasonCode?: string;
};
type TargetOutcome = {
  taskId: Id; memberId: Id; attemptId: Id; executionOutcome: 'succeeded' | 'failed' | 'cancelled';
  effectDisposition: 'confirmed'; artifactIds: Id[];
};
type KernelTeamYield = {
  kind: 'team-yield'; waitId: Id; yieldingAttemptId: Id; durableReceiptId: Id;
  remainingToolCalls: { toolCallId: Id; disposition: 'not-executed-due-to-yield' }[];
};
type ContinuationReceipt = {
  waitId: Id; uniquenessKey: string; previousAttemptId: Id;
  authority: AttemptAuthority; rootId: Id; approvalScopeId: Id; authorizationRevision: Revision;
  taskId: Id; continuationAttemptId: Id; runId: Id; executionFence: ExecutionFence;
  reservation: Reservation; selectedArtifactIds: Id[]; targetOutcomes: TargetOutcome[];
  committedAt: Instant;
};
```

Wait targets contain 1–16 distinct IDs and cannot include self. Refuse cycles across both task-dependency and wait edges, including indirect waits on tasks depending on the waiting task. Same-team failure/cancellation qualifies as a terminal outcome; unknown execution/effects do not. Wait has no timeout or caller-selected wake date. The normal control API can cancel the task/wait; cancellation never invents completion of outstanding effects. Continuation reservation is a requested future reservation, charged only when the continuation is admitted, so it cannot be double-counted with the yielding turn. It remains subject to aggregate remaining budget then.

Wait state invariants: yield_requested retains active capacity; waiting requires confirmed ended root/children and effects; blocked retains a wake reason but has no continuation; resumed has exactly one continuationAttemptId; invalidated cannot resume. wakeOutcomes remains empty until all targets qualify. A blocked or resumed wait records exactly one terminal outcome per target. Reassignment/revocation invalidates waits and their old authority; resuming an invalidated wait requires a new explicitly authorized task flow, not revival.

Continuation admission captures complete current AttemptAuthority: authenticated owner/workspace/team, task/member, new attempt/run, current task ownership epoch, member revision, installed binding revision and execution fence. The same admission CAS reserves fresh rootId and approvalScopeId, captures authorizationRevision, and commits the immutable ContinuationReceipt. These identifiers belong only to that continuation; dispatch materializes the reserved root/approval scope under current authority, never the yielding turn's scopes. The duplicated taskId, continuationAttemptId, runId and executionFence MUST equal authority.taskId, authority.attemptId, authority.runId and authority.executionFence in that CAS; mismatch refuses the transaction. The wait's current owner/task/member assignment and task ownership epoch must still agree, rather than substituting a new assignee into an old wait. Revalidation at dispatch and model handoff remains required; a captured authorization revision never grants permission after revocation.

ContinuationReceipt.targetOutcomes contains 1–16 entries: exactly one immutable terminal outcome per wait target, in the exact order of TeamWait.targetTaskIds, with task/member/attempt provenance resolved by the host. TeamWait.wakeOutcomes and the continuation's ordered outcomes must agree in the admission CAS. A failure or cancellation with artifactIds `[]` is a complete outcome and MUST remain present. selectedArtifactIds cannot substitute for outcomes. TeamContextReceipt.targetOutcomes contains that complete ordered outcome set for a continuation; it is empty only for a non-continuation turn. Its authority/rootId/approvalScopeId identify the actual new execution, and authorizationRevision identifies the current successful disclosure check.

Before model-input handoff, resolve and authorize every target's provenance and required directed edges again. Hand the entire ordered targetOutcomes field to the model as a distinct attributed untrusted-data fragment marked by targetOutcomeDataTrust; include failed/cancelled targets even when they have no artifact or textual output. It is model input, not merely hidden receipt metadata or instruction authority. If any target's current disclosure authorization fails, or the complete required outcome set cannot fit, refuse the continuation's model dispatch with the appropriate edge/context diagnostic; do not filter out the forbidden/failed/cancelled row and run with a partial success view. Model-handoff evidence must identify the exact context receipt and complete outcome set. These remain specification requirements, not claims of implemented validation or disclosure.

1. A valid wait commits yield intent and command receipt while the coordinator is still active. The native team tool produces `KernelTeamYield`, a host-only control value, only after durable acceptance. Model JSON cannot manufacture it. `WaitAccepted` is the public receipt, not an instruction to continue the normal model loop.
2. The orchestrator stops before the next model request or any later tool call in that batch; persist every unexecuted tool-call disposition. Join exact owned root/children, finish already-started effects and record their disposition. Unknown/pending effects or failed cleanup block safe yield; do not release the slot merely because the model stopped speaking.
3. After confirmed end, commit yielded attempt outcome, task waiting state, wait waiting state and usage/retained reservation together. Only then release active capacity/member execution lane. The waiting task retains member ownership; unrelated work cannot run another coordinator turn. Yield is not task success and cannot satisfy a normal success dependency.
4. Both wait finalization and target settlement evaluate all-target readiness in the same catalog CAS as their state change. This prevents lost wakeups if the worker finishes first. One internal uniqueness key, exactly `team-wait:<waitId>:continuation:1`, governs continuation admission. Atomically record wait resolved/resumed state, fresh queued continuation attempt, reservation, command receipt and linkage on the same task. Repeated notifications/recovery return the existing continuation ID. This is one new legitimate turn, never replay of the yielding attempt.
5. If current authority or budget denies admission, store blocked with reason and no continuation. An authorized budget reconciliation/change or recovery operation reevaluates blocked waits; the original wake evidence remains durable. Do not poll with another scheduler or drop the event. A changed target/revoked edge requires current authorization before any selected output disclosure.
6. Dispatch the continuation through existing admission/controller/kernel with new run/root/approval scope, current policy/context/profile, all target outcomes and only authorized selected artifacts. Do not restore an in-memory future or replay prior tools. Unknown price retains the old reservation; it may block future budget admission while leaving known output/task success intact.

Queued reservations count against aggregate budgets and configured pending limits, not active-turn ceilings. Existing controller drains catalog order: round-robin eligible teams, FIFO runnable intent within a team, skip blocked teams, one dispatch per team per pass. Acquire local active capacity/member lane before queued→running CAS; validate ownership epoch, current task/member authority, dependency readiness and team/global capacity in that CAS. Process-local permits are resources, not authority. Notifications after enqueue/yield/settlement/recovery prompt the same controller to read durable state; notifications carry no sole copy of intent. Conservatively uncertain live execution continues to fence capacity until reconciled.

| Crash/duplicate cut point | Required recovery |
| --- | --- |
| Delegation committed, reply lost | Same command returns original task/message/queued attempt; never create a second attempt. |
| Yield intent committed, root still live/unknown | No slot release or worker dispatch based only on receipt; preserve uncertain cleanup/effect fence. |
| Root ended, wait final CAS unconfirmed | Complete yield once from canonical exact-run terminal/effect evidence; otherwise reconcile. |
| Worker ends before wait finalization | Finalization observes persisted outcomes and attempts one continuation admission. |
| Worker ends after wait finalization | Settlement observes wait and attempts one continuation admission. |
| Continuation commit succeeds, notification/reply lost | Recover linked queued continuation, not another continuation. |
| Continuation claimed running, process lost | Mark uncertain; do not turn it back into queued. |
| Ownership replacement or duplicate settlement | Current fence and uniqueness receipt decide; stale actor cannot mutate current task. |
| Edge revocation/reassignment before wake | No content disclosure or continuation under stale authority; persist invalidated/blocked disposition. |

## 8. Stable diagnostics and state projection

Frozen codes: `TEAM_PROFILE_UNSUPPORTED`, `TEAM_CAPABILITY_UNSUPPORTED`, `TEAM_EXECUTION_OWNER_CONFLICT`, `TEAM_EXECUTION_EPOCH_STALE`, `TEAM_RECLAIM_UNAUTHORIZED`, `TEAM_RECLAIM_EVIDENCE_REQUIRED`, `TEAM_SCOPE_DENIED`, `TEAM_EDGE_DENIED`, `TEAM_COMMAND_CONFLICT`, `TEAM_REVISION_CONFLICT`, `TEAM_ROUTE_PROFILE_MISMATCH`, `TEAM_REASONING_UNSUPPORTED`, `TEAM_FIT_UNQUALIFIED`, `TEAM_CONTEXT_REQUIRED_UNSUPPORTED`, `TEAM_CONTEXT_REQUIRED_TOO_LARGE`, `TEAM_PENDING_LIMIT`, `TEAM_BUDGET_EXHAUSTED`, `TEAM_WAIT_CYCLE`, `TEAM_EFFECTS_UNCERTAIN`, `TEAM_WAIT_INVALIDATED`, `TEAM_PROVIDER_REQUEST_REJECTED`, `TEAM_PROVIDER_STREAM_FAILED`. Field diagnostics use JSON Pointers; safe protected references resolve only within scope. Raw provider prose is not an i18n key. Boss maps stable codes to translated explanations and permitted recovery actions.

Attempt lifecycle is queued/running/cancellation_requested/yielded/succeeded/failed/cancelled/uncertain. Separate `executionOutcome` (unknown/yielded/succeeded/failed/cancelled), `effectDisposition` (confirmed/uncertain) and accounting state (settled/reserved-unknown) in projection. A known succeeded task and selected output survive unknown pricing; reservation stays charged. Recovery must not block an already known successful task solely because accounting is uncertain. A failed execution never satisfies a success dependency. Unknown effects block unsafe replay/wake regardless of output text. No blanket zero-cost inference from a failed provider request.

## 9. Implementation seams and evidence limits

Actual inspected source, not newly implemented contract:

- [Catalog aggregate](/Users/gqadonis/Projects/prometheus/worktrees/agent-fabric-c09-uar/src/uar/domain/collaboration.rs), [CAS storage](/Users/gqadonis/Projects/prometheus/worktrees/agent-fabric-c09-uar/src/uar/compiler/collaboration/storage.rs), [admission](/Users/gqadonis/Projects/prometheus/worktrees/agent-fabric-c09-uar/src/uar/compiler/collaboration/team_execution/admission.rs), [settlement](/Users/gqadonis/Projects/prometheus/worktrees/agent-fabric-c09-uar/src/uar/compiler/collaboration/team_execution/settlement.rs), [recovery](/Users/gqadonis/Projects/prometheus/worktrees/agent-fabric-c09-uar/src/uar/compiler/collaboration/team_execution/recovery.rs).
- [Existing dispatcher](/Users/gqadonis/Projects/prometheus/worktrees/agent-fabric-c09-uar/src/uar/runtime/team_execution/controller.rs), [actor host](/Users/gqadonis/Projects/prometheus/worktrees/agent-fabric-c09-uar/src/uar/runtime/thread/actor_host.rs), [effect revalidator](/Users/gqadonis/Projects/prometheus/worktrees/agent-fabric-c09-uar/src/uar/runtime/turn/request.rs), [ordinary live-turn wait](/Users/gqadonis/Projects/prometheus/worktrees/agent-fabric-c09-uar/src/uar/runtime/thread/control.rs).
- [Reasoning vocabulary](/Users/gqadonis/Projects/prometheus/worktrees/agent-fabric-c09-uar/src/config.rs:1793), [leaf model/profile constraints](/Users/gqadonis/Projects/prometheus/worktrees/agent-fabric-c09-uar/src/llm/liter_driver.rs), [request preparation/tool loop](/Users/gqadonis/Projects/prometheus/worktrees/agent-fabric-c09-uar/src/llm/orchestrator.rs), [definition directed communication modes](/Users/gqadonis/Projects/prometheus/worktrees/agent-fabric-c09-uar/docs/agents/collaboration/v0.1.0-draft.2/schemas/team-definition.schema.json).
- [Boss sidecar lifecycle](/Users/gqadonis/Projects/prometheus/worktrees/the-boss-d01-build/src/main/ai/runtime/uar/UarSidecarService.ts), [closed attempt parser](/Users/gqadonis/Projects/prometheus/worktrees/the-boss-d01-build/src/main/ai/runtime/uar/UarTeamExecutionAdapter.ts), [shared team contracts](/Users/gqadonis/Projects/prometheus/worktrees/the-boss-d01-build/src/shared/types/uarTeams.ts).

Source baselines remain those in the approved plan. Current queued work consumes concurrency; current wait_agents stays in the live turn; current recovery uses process-local job knowledge. None satisfies this profile by documentation alone. Parent A/B must deliver all contracts/UI/packaging before the lead's sole completed-boundary operation. DTO/example consistency is documentation evidence only. The difficult case remains an already issued external effect whose origin process cannot be proven stopped: the correct result is blocked recovery, not a fabricated successful continuation.

## 10. Bounded example set

- Provider: [default request](examples/model-default-off-request.json), [default result](examples/model-default-off-result.json), [supported explicit fixture](examples/model-supported-explicit-fixture.json), [unsupported request refusal](examples/model-unsupported-reasoning.json), [settings before](examples/provider-settings-before.json), [settings after](examples/provider-settings-after.json), [explicit rebind](examples/model-rebind.json). The before/after pair preserves identical route and pricing identity while revising only the approved profile/settings.
- Ownership: [held claim](examples/execution-claim.json), [reclaim request](examples/reclaim-request.json), [authorized reclaim receipt](examples/authorized-reclaim-receipt.json). Request data is not authorization: the receipt's actor/decision originate in authenticated administration. The reclaim sequence is independent of the successful wait sequence and must not be read as simultaneous histories.
- Communication: [queue-only send](examples/direct-send.json), [delegation request](examples/delegate-request.json), [atomic delegation result](examples/delegate-result.json), [forbidden edge diagnostic](examples/forbidden-edge-diagnostic.json). A denied edge produces no accepted message/task/attempt receipt; its protected diagnostic can reference scoped rejection evidence.
- Continuation/context: [wait request](examples/wait-request.json), [typed internal yield](examples/kernel-yield.json), [confirmed waiting record](examples/waiting-record.json), [successful continuation](examples/continuation-receipt.json), [successful context](examples/context-receipt.json), [failed-target continuation](examples/failed-continuation-receipt.json), [failed-target context](examples/failed-context-receipt.json), [cancelled-target continuation](examples/cancelled-continuation-receipt.json), [cancelled-target context](examples/cancelled-context-receipt.json). Each outcome variant is an independent illustrative history. Failure/cancellation examples explicitly carry empty artifact lists and still disclose the terminal outcome. The waiting record shows no active root; the same logical task obtains the separately identified continuation with complete authority and fresh root/approval scope. No example proves runtime cleanup or authorized graph edges.
