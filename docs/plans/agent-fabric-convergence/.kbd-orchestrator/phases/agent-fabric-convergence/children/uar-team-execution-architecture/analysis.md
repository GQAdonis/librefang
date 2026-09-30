# Analyze — UAR team execution architecture

Status: recommendation for operator modification, not architecture approval or runtime certification. Date: 2026-09-29 America/Chicago (2026-09-30 UTC). Scope: existing Rust UAR, Liter gateway and The Boss; no new execution framework, dependency upgrade, application build or production edit in this stage.

## Decision proposed

Keep UAR's existing catalog → admission → actor → RunManager → Orchestrator execution path. Add the missing durable-team control and context contracts around it. Deliver one working member first, then a genuinely collaborating pair. Do not call either milestone full conformance to the entire collaboration draft.

The provider failure and the missing team bridge are different problems. The former prevents the current C09.3 operation from finishing; the latter prevents ordinary model-facing tools from realizing durable peer collaboration. Replacing the execution engine would not automatically resolve either. A shared prompt is necessary for the requested team mission but cannot implement addressing, authorization or durable delivery.

Read [assessment.md](assessment.md) for the evidence classification, [assessment-context.md](assessment-context.md) for the pinned Codex comparison and context flow, [assessment-runtime.md](assessment-runtime.md) for execution/recovery, and [assessment-provider-boss.md](assessment-provider-boss.md) for the observed gateway failure. Those remain evidence, not assertions that the recommended behavior already exists.

## Baseline and research boundary

- UAR: `006eeaf1f90e0a640b0f8fd568419badac5f4320`; the same three-file unbuilt provider repair remains dirty (29 insertions, 7 deletions). No production file was edited by this analysis.
- Boss assessment baseline: `c00d9b68695fb452d1f09bd4b154582ecaad0035`. Existing C09.1/C09.2 receipts establish administration operations; three C09.3 attempts failed and remain failed.
- Codex local Rust reference reconfirmed at `986ff1cc7ced0081ec5014b700a376333d87f869`. Live source inspection reconfirmed QueueOnly versus TriggerTurn and actual registry-based recipient resolution.
- Cadence maintenance is now published: full implementation `71174cc`, full closeout `4e39254`; mini implementation `3bd4f0f`, mini closeout `b0d4985`. Six global copies were installed from full, version 1.1.1. This maintenance is not C09 completion or a new product delivery.
- Research used four GitHub repository discovery queries, Context7 resolve/query for Tokio, one crates.io search, and primary repository documentation. The 20-minute research budget was bounded; no exhaustive harness survey or performance benchmark is claimed. No dependency was installed or upgraded. Broader harness comparisons remain the dated assessment evidence.

One citation precision correction: `orchestrator.rs:397–399` replaces request parameters inside `DestinationRequestPreparations::prepare`; `Orchestrator::prepare_attempt` at lines 738–754 calls that method. The assessment correctly identified the seam but compressed those method names. Reuse both parts of the existing path.

## Alternatives and build-versus-adopt

| Candidate | Disposition | Fit and limitation |
|---|---|---|
| Existing UAR catalog CAS, attempt fences and actor kernel | Adopt existing implementation; extend missing joins | Already owns team/task identity, authority, reservations and ordinary execution. Source-only guarantees still require the completed delivery operation. |
| Pinned Codex control registry and queue/trigger separation | Adapt concepts | Codex resolves real recipients and distinguishes messages from work activation. Its root-scoped thread tree is not a durable UAR team catalog and must not replace it. |
| Explicit model-facing team tools | Recommend | Typed team/member/task IDs, actor-bound sender, current role-edge checks and observable durable receipts. Keep ordinary child-thread tools separately scoped. |
| Overload existing child tools with team/member names | Reject for first slice | Existing meanings are root-local. Overloading risks ambiguous targeting and accidental changes for ordinary agents. A future tagged selector can be considered with a compatibility contract. |
| One shared long-lived actor root for the whole team | Reject | It conflates durable membership with a live approval/execution tree and undermines the deliberate fresh-root authority boundary. |
| Tokio synchronization already in UAR | Retain as implementation primitive | Semaphore fairness is FIFO, not tenant/team fairness; cancellation loses queue position. Durable admission and recovery remain catalog responsibilities. |
| Restate | Defer to separate C10 qualification | Its durable execution/message primitives are relevant, but adopting its execution/state boundary would require ownership and packaging reconciliation. Its documented server deployment is additional infrastructure, not a fix for the observed gateway request. |
| Temporal Rust SDK | Defer to separate C10 qualification | A workflow platform candidate, not a drop-in repair for UAR's existing actor and catalog contracts. No deep API/platform qualification was done, so neither suitability nor unsuitability for C10 is concluded. |

Primary external sources: [Tokio semaphore](https://docs.rs/tokio/latest/tokio/sync/struct.Semaphore.html), [Restate repository](https://github.com/restatedev/restate), [Temporal Rust SDK](https://github.com/temporalio/sdk-rust). Registry discovery reported Tokio 1.53.1; this is discovery metadata, not a recommendation to alter repository pins. Mini's own `versions.toml` still contains older Surreal pins; this documentation stage does not alter them or use them to override the UAR deployment baseline.

## Proposed contracts

### 1. Separate persistent identities from executing threads

Keep TeamDefinition, deployment binding, TeamInstance, TeamMember, TeamTask, Attempt and root Thread/Run identifiers distinct. Every attempt captures immutable definition/binding/context/request-profile revisions, but validates current authority again at effect admission. A member may have many attempts over its lifetime. A new attempt gets a fresh execution root; durable state is recovered through the catalog, not by reviving old approval authority.

The Boss remains a typed presentation/controller client. Fabric transports events. Memory provides selected context. BossFang retains ownership of its delegated workflows. None becomes another model/tool loop or writes an independent task-state truth.

### 2. Add shared instructions with explicit composition

Recommend an optional versioned team `instructions` field in the next draft, with immutable revision/digest captured in the effective execution receipt. Use the repository's typed prompt fragments; do not create a second prompt engine.

Proposed precedence, requiring approval: platform policy and operator-authorized host restrictions → team instructions → member specialization → current task request. Team instructions constrain member specialization; reject statically identifiable configuration conflicts and record the resulting ordered fragments. Natural-language conflict detection cannot be guaranteed. Tool authority is enforced structurally by policy and bindings, never by prompt precedence.

Team purpose, the member's responsibility, selected task contract and an authorized roster summary accompany the shared instructions. Peer messages and artifact bodies remain untrusted data fragments; they do not become host instructions. Record source identity, selected/excluded resources, truncation and token allocation. The mission must remain available in every member attempt, including after restart; do not copy every member's conversation history.

Roster summary is bounded: self, coordinator and relevant permitted collaborators. A paged roster tool supplies remaining authorized members. A displayed name is never the effect target: immutable team/member identity and current authorization resolve it.

### 3. Connect durable communication to existing admission

Recommend a dedicated team tool family for roster discovery, inbox reading, sending and task delegation/status. Names and schemas are Plan-stage contracts. Calls derive sender and owner/workspace from the bound attempt; the model may not impersonate another sender. Enforce current membership, communication edges, task assignment and existing Cedar/approval boundaries.

Queue-only messages persist and become eligible context at a later admitted turn. Triggering work commits an activation intent tied to the task/message and uses the existing admission path; a message itself is not permission to execute. Select the existing catalog CAS as the sole commit boundary. Extend [UAR admission](/Users/gqadonis/Projects/prometheus/worktrees/agent-fabric-c09-uar/src/uar/compiler/collaboration/team_execution/admission.rs:206) so one successful generation change records the accepted envelope, linked queued attempt, captured reservation and command receipt together. The queued attempt is the durable dispatch intent: no separate broker, outbox table or scheduler. If admission refuses, the trigger command commits neither envelope nor attempt; queue-only remains a separate explicit command. [UAR dispatch controller](/Users/gqadonis/Projects/prometheus/worktrees/agent-fabric-c09-uar/src/uar/runtime/team_execution/controller.rs:80) claims committed queued attempts by CAS before dispatch. An authorized startup/recovery drain re-drives only queued intents; repeated command IDs return the prior attempt ID and never create another. A crash after the running claim is conservatively uncertain and is not automatically replayed. This applies the transactional-outbox principle inside the existing aggregate. [AWS pattern guidance](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html) supplies the atomic-record/idempotent-consumer rationale; it does not certify UAR or imply adopting AWS services.

Define receipts precisely:

- **Accepted:** envelope and command identity durably committed.
- **Delivered:** a particular admitted attempt durably records that the envelope was selected for its context.
- **Consumed:** the runtime records model-input handoff; this is not proof that the model understood it.
- **Completed:** the correlated task/attempt outcome and selected output artifact are recorded separately.

Duplicate commands reuse their receipts. Restart can re-drive undispatched committed intents; it cannot automatically replay an attempt that may have produced an external effect. No exactly-once inference or external-effect promise. Membership/role revocation after acceptance must be rechecked before disclosure and effect execution. Store rejected/expired disposition when a queued message can no longer be delivered.

### 4. Bounded execution and waits

Retain per-member turn serialization and authoritative aggregate concurrency/budget limits. Separate durable queued work from active worker permits. In the collaborating-pair slice, a coordinator waiting for a teammate must release execution capacity through a persisted wait/continuation boundary; otherwise a one-slot team can deadlock itself. Do not keep a model turn occupying its only slot while synchronously waiting for a child task.

Recommendation for the bounded local profile: one executing turn per member, configured per-team/global active ceilings, ordered runnable intents and explicit queue/blocked reasons. Recommend round-robin selection across eligible teams, FIFO within each team, one dispatch per team per pass, skipping teams blocked on their own budget/member lane. Catalog sequence records ordering; active permits remain process-local resources. A Tokio semaphore alone does not establish this policy. Scheduling metadata cannot grant capabilities or budget beyond catalog admission.

Nested ordinary child threads retain captured policy intersection. Before advertising ordinary delegation within the team profile, map `permittedChildren` to immutable allowed definitions; if this mapping is absent, refuse that requested capability for the profile. Durable subteams remain a separate later implementation with child TeamInstance identity and a shared ancestor budget, not flattened child threads.

### 5. Model route is not a wire contract

Preserve chosen model identity, gateway served alias, canonical pricing identity and actual endpoint protocol as separate values. Bind the team route to the existing `EndpointRequestProfile` / `DestinationRequestPreparations` path. Model-family prompt formatting must not independently add request fields rejected by the selected gateway.

Minimum immediate delivery: default reasoning off emits no unsolicited `thinking`; explicitly requested unsupported reasoning produces an actionable pre-dispatch refusal. A supported request uses an exact versioned gateway profile. Reject unsupported required controls rather than silently dropping them. Known context/output metadata comes from the bound route with provenance; unknown capacity remains unknown and retains conservative admission. Do not infer gateway capability from successful `/models` listing or upstream price identity.

UAR supplies stable error categories and a bounded protected diagnostic/run reference; Boss supplies translated explanations and recovery actions. Do not send raw provider prose into i18n keys, leak credentials or turn a failed request into a successful empty response. Keep the preserved candidate patch, but Plan must address explicit reasoning and profile resolution, not only its default-trigger fix.

### 6. Resources, recovery and honest capability claims

Keep exact skill bindings and selected artifacts. In the first executable profile, explicitly report KB/memory/history features as unsupported where they are not mapped. Migration recommendation: absent/empty legacy selections retain the narrow profile. Nonempty legacy context/history/memoryScopes/contextGrants requests are required by default and refuse activation until their semantics are implemented; no implicit downgrade. The next schema may explicitly mark a request optional; an unsupported optional request is excluded with a field-level diagnostic and an effective-receipt entry. Existing required-RAG refusal remains. This changes formerly ignored nonempty declarations into visible refusals; surface an operator migration diagnostic and do not rewrite stored definitions. UAR compiler owns this mapping, full/mini authoring adapters emit the selected schema, and Boss displays the disposition.

Support one executing UAR process per catalog/workspace ownership scope for the initial profile, whether storage is local or remote. Record and enforce this deployment restriction with the existing sidecar/instance ownership mechanism where available; assess the actual mechanism before selecting a new lock. Remote database access alone is not multi-host execution support. Publish backend capability claims only for the qualified path and distinguish code availability from operated support.

Keep execution outcome, external-effect uncertainty and usage settlement separate. Completed output with unknown price remains known output with reserved capacity. Failed requests without usage receipts do not justify zero cost. Provide a scoped operator reconciliation action with evidence reference, actor, reason, revision check and append-only adjustment; never rewrite the original attempt. Unknown effects block unsafe replay. Proposed readiness rule: a known successful execution with confirmed output and no uncertain effects can satisfy its task dependency while its unknown usage reservation remains fully charged. Every next attempt passes aggregate admission including that reservation; no capacity is invented. Known execution failure cannot satisfy a success dependency. Unknown execution or external-effect outcome blocks dependent progression and replay pending reconciliation. UAR settlement/recovery owns these separate transitions; Boss displays both. This is a requested change to current conservative task blocking, not existing operated behavior.

### Ownership evidence and qualification boundary

The Boss `UarSidecarService` has an in-process mutex/startPromise (lines 109–112, 425–434), one recorded owned child, scoped data root and managed-versus-external lifecycle separation. [Boss single-instance entry](/Users/gqadonis/Projects/prometheus/worktrees/the-boss-d01-build/src/main/core/preboot/singleInstance.ts:39) uses Electron's app lock. UAR's sidecar binds an available port and follows its parent pipe; these mechanisms are not a cross-process remote-catalog lease. Runtime recovery's live-job check is likewise process-local. This supports controlled local supervision, not proof that independently launched UAR servers cannot share a remote catalog.

| Proposed deployment combination | Current team-execution operation evidence | Release disposition |
|---|---|---|
| One Boss-owned UAR; local SurrealKV data directory | C09.3 failed; not qualified | Candidate A profile; require completed packaged operation/recovery |
| One designated UAR; dedicated remote Surreal namespace/database | No passing C09.3 receipt in inspected evidence | Preserve remote configuration; qualify before advertising durable-team execution on this path |
| Multiple UAR execution processes sharing a team catalog | No ownership lease or acceptance proof found | Unsupported first profile; no failover or takeover claim |

Scope backend qualification to one designated executing UAR and an isolated catalog. Plan must specify how registration refuses overlapping deployments before expanding remote availability. There is no qualified team-execution backend combination to report today. This enforcement/proof gap is carried as a review warning, not described as a solved lock or a reason to introduce distributed leasing in A.

## Repository ownership and delivery sequence

| Slice | User-visible outcome | Ownership | Boundary / dependencies |
|---|---|---|---|
| A: finish C09.3 | In Boss, choose an executable model route, run one member, see output or actionable localized failure and truthful accounting/recovery | UAR runtime/provider lead; Boss desktop + UX/i18n owner; release owner | Preserve existing code; implement exact request-profile resolution and narrow support/refusal contract. Finish production/UI/payload first, then local Mac build and real packaged operation. This is manual member execution, not full teams. |
| B: cooperating pair | Coordinator discovers an authorized worker, delegates a task, receives a result and completes the user's request | UAR runtime/data owns durable tools/mailbox/admission/waits; Boss UI owns team/task/message projection; compiler owner owns shared instructions | Depends on A and approved contracts above. Two workspaces, replay/restart, revocation and one-slot wait behavior belong to this completed slice's operation, not pre-edit tests. |
| C: bounded delegation/resources | Permitted child definitions, scoped context/resource selection and later bounded subteam execution | UAR compiler/runtime; full+mini authoring adapters; Boss settings | Split into independently usable increments in Plan. Do not defer all visible UI until the end. Required unsupported semantics remain refused until each capability exists. |
| D: protocols and workflows | Team AG-UI/A2UI/A2A views and development/feedback-to-issue stories | UAR protocol lead, Boss UX, convergence C10/C14/C15 owners | Consume the same catalog/attempt state. C10 engine qualification remains open; do not approve its proposed sequencing amendment by implication. |

These are proposed delivery slices, not newly completed canonical tasks or approved dates. A two-hour cadence is a budget and observation window, not evidence that each slice can fit two hours. Plan should bound A from the actual diff, then estimate B from the agreed mailbox/wait contract. Unknown capacity/latency targets remain to be measured and explicitly set in Plan; no fabricated throughput estimate is supplied.

At each product delivery, build `pnpm build:mac:arm64` and operate the completed new function. Fix observed build/operation failures before admitting unrelated scope. Full Mac/Windows publication remains every second successful delivery; no Linux. Installed acceptance remains separately pending where the operator has allowed it. Research and skill redistribution do not increment that schedule.

## Decisions requested before Plan freezes implementation

1. Approve preserving the current execution kernel and explicit durable-team tools rather than overloading child-thread tools.
2. Approve the shared team-instructions layer and proposed precedence; legacy documents omit it and retain existing behavior.
3. Approve A first, followed by a cooperating-pair B; keep broader subteams/resources/protocols owned but outside A.
4. Freeze the one-executing-instance deployment contract and exact supported local/remote backend scope.
5. Approve the explicit readiness, required-by-default legacy context and round-robin admission recommendations above; Plan then specifies their typed contracts and implementation tasks.

The child remains open. C09.3 remains unaccepted. No architectural approval is inferred from this analysis, and the original Cadence clock has not been reset.

## Review and learning

The bounded independent artifact review and disposition are recorded under `review/analyze/`. Any unresolved warnings travel into the stage handoff. This is document review, not a production verification gate.

Learning: explicit identity, message, activation and provider-profile contracts make the missing work visible. A shared prompt or larger framework cannot substitute for those joins. Measure the next actual delivered operation before claiming this analysis or the new Cadence distribution improved velocity.

### Unresolved review findings and final correction

The second and final bounded review returned BLOCK because three repository-relative code references were resolved against the initiative directory and reported missing. They now use repository-qualified absolute links, and all three target files were checked to exist. Their source was inspected during this analysis. No third review was run; the last independent verdict remains BLOCK on the pre-correction artifact, with this reference correction locally confirmed rather than independently re-reviewed. The separate remote-catalog exclusivity/backend-qualification warning remains unresolved and is an explicit Plan dependency. REST could not establish canonical distinct model identities; the native reviewer had isolated context, but cross-model identity remains unverified.
