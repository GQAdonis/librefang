# UAR team execution architecture — approval plan
Date: 2026-09-29 America/Chicago. Status: PROPOSED; operator approval required.
Phase: `agent-fabric-convergence::uar-team-execution-architecture`.
This is a planning artifact, not implementation or conformance evidence.

## 1. Outcome and execution boundary

Repair the existing UAR execution path, then make a coordinator and worker genuinely cooperate in The Boss. Retain `TeamExecutionRuntime → ActorThreadSession → RunManager → Orchestrator`; no replacement scheduler, broker, daemon or dependency upgrade.

The architecture child produces contracts and a bounded parent repair handoff. After approval, its Execute stage finalizes those documents; Reflect archives the child and restores parent C09.3. Only then does the parent implement the approved product increment. This follows the child's existing return criteria and avoids the deadlock in which Cadence refuses a parent build while its child remains unresolved.

The child clock remains part of iteration 4. Returning a child is not a delivery, build, publication or product task completion. This Plan turn changes no production source, runs no application build and stops for operator modification.

## 2. Baseline and evidence

| Source | Recorded baseline / meaning |
| --- | --- |
| UAR | `006eeaf1f90e0a640b0f8fd568419badac5f4320`; three-file 29-insertion/7-deletion provider candidate remains unbuilt and unverified. |
| The Boss | `c00d9b68695fb452d1f09bd4b154582ecaad0035`; prior payload/gate changes preserved. |
| Codex reference | `986ff1cc7ced0081ec5014b700a376333d87f869`; source model for routing/activation, not a durable-team implementation to transplant. |
| Canonical KBD at Plan entry | Revision 353, child Plan in progress, parent C09.3 pending. Projectwide 12/23 is a rollup, not this child's completion count. |
| Cadence | Iteration 4 started 2026-09-29T20:57:21.333Z, checkpoint-failed; 3 successful deliveries; next full publication due at delivery 5. Keep existing recorded schedule. |

Evidence: [assessment](assessment.md), [context and Codex comparison](assessment-context.md), [analysis](analysis.md), [provider planning input](planning-provider-input.md), [runtime planning input](planning-runtime-input.md), [candidate decisions](library-candidates.json).

**Source correction:** analysis overstates missing successful-output handling when price is unknown. Settlement already succeeds the task and readies dependents while retaining an uncertain accounting reservation. Recovery can incorrectly block that known success. Repair that inconsistency; do not replace working settlement behavior.

All paths in the two planning-input documents resolve against their explicitly named UAR/Boss roots. Proposed new modules are labelled proposed. Recheck source heads and owned dirty files before execution, without rebuilding as a reconnaissance step.

## 3. Decisions submitted for approval

### D1 — Preserve one execution owner and distinct identities

UAR owns task, attempt, mailbox, wait and policy state; The Boss projects that state through typed administration/IPC. Fabric is transport; memory is scoped storage. Neither schedules UAR work. Keep reusable definitions, installed bindings, durable instances, tasks and attempts distinct.

Single executor per dedicated catalog initially. Add a non-expiring catalog CAS claim with service ID, fresh boot incarnation, monotonic epoch and held/draining/released state. Admission, dispatch, recovery, effect revalidation and execution mutations check the same claim. Competing executors refuse execution visibly. Clean shutdown releases only after owned roots/children stop.

Crash recovery requires authenticated operator replacement with expected epoch, reason and evidence that the previous process and effect-producing children are stopped or externally fenced. Never use elapsed time as proof of death. Transfer queued dispatch authority with an audit receipt; do not replay running attempts. A claim cannot fence old binaries or retract an external effect: remote qualification requires a dedicated catalog and controlled executor versions/credentials. No automatic failover.

### D2 — Separate route, wire alias, price and request compatibility

Persist/capture four identities: configured UAR provider/model route; gateway served alias; canonical pricing identity; exact endpoint request-profile/settings revision. Repair the leaf's current qualified-model equality constraint so the internal route can differ from the wire alias without choosing a different model.

Reasoning defaults off in this narrow team profile. No `thinking` field inferred from model-family names or multi-turn history. Explicit reasoning is dispatched only when the exact endpoint profile supports the requested control; otherwise refuse before dispatch with a stable diagnostic. Unknown capability remains unknown.

Allow a **settings-only validated profile**, explicitly carrying no guaranteed-fit assertion, when endpoint schema support is known but exact tokenizer/framing is not. Keep the existing conservative unknown-capacity behavior and aggregate reservations. Guaranteed-fit mode still requires an independently justified count/limits contract; do not reuse `synthetic_exact` for Kimi or infer context limits from price. Capture this distinction in the effective receipt and UI.

Profiles are resolved by trusted UAR configuration. Boss sends a typed profile reference/settings request, not arbitrary request JSON or a renderer-defined allowlist. A settings change requires explicit revisioned rebind; historical attempts retain their captured settings. Read/edit/save preserves pricing identity and new settings.

### D3 — Context is explicit, bounded and truthful

Add optional versioned team `instructions` as shared system-level behavioral guidance. Precedence: immutable host/security policy → approved team instructions → member instructions → task instructions. Task content, peer messages and artifacts remain attributed untrusted data, not authority. Team instructions cannot widen tools, credentials, grants or Cedar policy.

Every member gets a bounded roster summary (stable IDs, roles, safe capabilities), its own identity and task assignment, plus a paged roster lookup tool. Do not copy every member's private prompt/history. Context includes selected task/team inputs and artifact references with provenance; make the effective selection inspectable.

Keep exact skill bindings. For currently unconsumed context/history/memory-grant fields, nonempty legacy declarations are required-by-default and refuse with field diagnostics until implemented; empty declarations remain compatible. New optional declarations may be explicitly excluded and reported. Required RAG is already refused and remains so. No automatic document rewriting. This deliberately changes the old behavior of silently ignoring nonempty declarations; publish migration guidance.

Shared skills/tools/KB/memory remain definition proposals with explicit capability support. The first cooperating-pair profile supports shared instructions, selected artifacts and existing exact member skills/tools, not arbitrary shared KB retrieval or implicit memory. Narrowing must be visible at install and launch.

### D4 — Durable-team tools do not overload root-local child tools

New typed operations use attempt-derived sender/owner/workspace/team identities. Proposed model-facing names: `team_roster`, `team_send`, `team_delegate`, `team_wait`; final protocol IDs freeze in the contract document before runtime implementation.

`team_send` is queue-only: explicit recipient member/task, command ID and bounded attributed payload; it never silently starts a turn. `team_delegate` names an eligible member and task contract and explicitly requests activation. Its task/envelope/queued attempt/reservation/command receipt commit in one existing catalog CAS. Same command returns the original receipt; changed payload with the same ID is a conflict.

Authorization checks directed communication/delegation edges and current scope before inbox visibility or admission. Initial release has direct messaging only; broadcast and cross-team messaging return unsupported. Ordinary child tools retain root-local semantics. Unsupported child/subteam execution declarations refuse rather than masquerade as durable members.

Delivery states remain distinct: accepted in durable inbox; delivered when selected into an attempt's context; consumed when handed to model input; task completed only by its own execution/artifact outcome. Consumed does not imply understanding or agreement.

### D5 — Yield ends a turn; continuation is a new attempt

Queued reservations count against aggregate budgets/pending-work limits, not active-turn capacity. Existing controller uses bounded pending work, round-robin eligible teams and FIFO within a team. Acquire local capacity/member lane before the queued→running CAS; revalidate catalog authority in that CAS. Skip blocked teams; no in-memory queue becomes authoritative.

A typed team-wait control commits yield intent, stops further model/tool dispatch, joins owned roots/children and confirms effect disposition before releasing active capacity. Persist unexecuted tool-call dispositions. A JSON reply telling the model to stop is insufficient.

Persist TeamWait and task waiting state. Once targets have known terminal execution outcomes, admit one uniquely linked continuation on the same task in the same CAS that resolves the wait. It uses a new run/root/approval scope with current authority, selected result artifacts and bounded continuation input. Unknown external effects block unsafe continuation; unknown price retains its reservation and may block budget admission without erasing known output.

Initially wait for all named same-team tasks to become terminal; failure/cancellation is an outcome, not success. Refuse cyclic dependencies. No timers or cross-team waits. Waiting keeps task/member ownership but releases active execution capacity. Reassignment/revocation invalidates the wait. Crash matrix and implementation paths are normative in [runtime input](planning-runtime-input.md).

## 4. Ordered child change — documentation only

OpenSpec change: `afc-uar-team-execution-architecture-contract`.
Canonical child tasks are documentation tasks, not credits toward C09 runtime delivery.

| Task | Owner | Output and completion |
| --- | --- | --- |
| 1.1 | boss-lead + runtime/provider contributors | Record operator approval and finalize execution-profile-contract.md, DTO examples, capability/compatibility table, ownership and crash semantics. Produce legacy-migration.md with every newly refused field, old/new behavior, diagnostic and operator remediation. All D1–D5 decisions trace to source or explicit proposed behavior. |
| 1.2 | boss-lead + desktop/UX/release | Finalize parent A/B task and file claims, operation procedures, deferred-owner register and exact handoff. Amend existing parent/product plans through supported commands; preserve C09.1/.2 receipts and keep C09.3 pending. |
| 1.3 | boss-lead | Check the complete document set once, record dispositions and source preservation; prepare truthful execution handoff for reflection/archive/parent restoration. No application execution claim. |

After 1.3: Reflect records rejected alternatives and limitations, archives this OpenSpec change through the supported CLI, closes/restores canonical KBD, and calls Cadence child return with the approved decision plus all four return criteria. Do not manually edit waypoint/progress projections. Reflection is lifecycle work, not another product completion.

## 5. Parent delivery A — finish C09.3 with usable member execution

User-visible result: choose an exact gateway route/settings in Boss, explicitly bind a team member, run a task, inspect output and safe failures, and retain honest budget/recovery state.

This is the existing C09.3 completion, not a duplicate new parent task. Its source-level repairs expand the existing UAR/Boss change at approved execution time.

| Work | Owner / file ownership | Depends on / done means |
| --- | --- | --- |
| A1 Contract + migration freeze | UAR provider/domain owner; registry, collaboration domain/schema, provider API | D1–D3 approved. DTO/examples distinguish route/alias/profile/price, known output vs unknown accounting, optional vs required fields. Publish child legacy-migration.md as proposed UAR docs/agents/collaboration/team-execution-profile-migration.md, covering each affected context/history/memory-grant field and unsupported child execution declaration before the release. |
| A2 Exact model execution | UAR runtime/provider owner; resolution.rs, manager.rs, orchestrator.rs, liter_driver.rs, prompt_dialect.rs, provider_error.rs | A1. Preserve/adapt dirty candidate, attach profile to actual captured leaf including retry paths; unprofiled destination refuses. Stable stream-establishment and mid-stream errors, protected diagnostic reference. |
| A3 Execution ownership and recovery | UAR runtime/data owner; collaboration storage/service and admission/settlement/recovery, controller/server/request revalidation and authenticated administration API | A1. Catalog claim and fenced mutations; reclaim requires authenticated operator identity, existing privileged administration authorization, expected epoch, reason and fencing evidence reference. Model/tool access cannot grant this permission. Recovery preserves known output while retaining unknown usage. Serialize shared domain/controller edits with A2. |
| A4 Settings and binding persistence | Boss desktop/provider; UarModelSourceAdapter, uarTeamModelSetup, starter adapters/documents, shared DTO/IPC | A1; parallel with A2/A3. No credentials in renderer. Revisioned rebind, lossless provider save, truthful capability/refusal projection. No Boss task-state database. |
| A5 Complete operator UI | Boss UX/i18n; existing model picker, Teams, ProvidersModels and Execution panels, all 13 locales | Frozen A1/A4 contracts. Requested/effective settings, ownership/recovery controls, known output/accounting uncertainty and actionable errors accessible. Use existing Impeccable guidance at completed UI boundary. |
| A6 Payload and operation | Release owner; existing runtime manifest/binary pipeline and cadence scenario | All A1–A5 production work finished. Freeze exact UAR/Boss/mini/catalog revisions; build UAR once serially, package it, run local Mac build, launch packaged Boss and operate A. |

Gate A is recorded by the lead from A6 receipts: frozen source/payload IDs and hashes, successful local Mac package build, installed launch, and every A operation outcome below (including negative refusal outcomes), with no unresolved relevant failure. This is local functional operation, not human Windows installed acceptance. B1 depends on this named Gate A receipt; pending Windows acceptance does not prevent B. Do not rerun already-passing unrelated product gates.

A operation: actual selected alias returns the exact requested marker; inspect captured route/profile/settings, restart/readback, explicit unsupported reasoning refusal before dispatch, selected artifacts/workspace isolation, revocation/cancel and budget/usage deduplication inherited from C09.3. Operate two current executors against isolated pinned remote Surreal: one executes, the other refuses; clean shutdown, crash-without-takeover, evidenced authorized operator replacement, rejected unauthenticated/unauthorized and stale-epoch replacement, queued transfer and running uncertainty. Exercise local profile before advertising it. Other backends remain unqualified. No simulated provider answer can count.

## 6. Parent delivery B — a coordinator and worker that actually cooperate

Proposed parent addition `C09.4`: durable team context, messaging and continuation. Register only with execution approval, as an additive scope revision, never as completion of earlier C09 work. Map contract/authoring portions to C03 and C15 without reopening their completed history.

| Work | Owner / surface | Depends on / done means |
| --- | --- | --- |
| B1 Shared context and authoring | UAR compiler/domain writer + skill author after schema freeze | Gate A receipt. Team instructions, bounded roster, precedence/source receipts, refusal diagnostics. Full/mini agent-team-creator asks about shared instructions, communication/delegation, models and required resources; maintenance/export/deployment preserve revisions and private bindings. |
| B2 Durable tool/context bridge | UAR runtime/tools writer | B1. Attempt-derived authentication plus directed communication/delegation edge and current-scope authorization before inbox visibility, send and admission; revalidate revoked edges. Direct mailbox delivery/consumption, explicit delegation atomic intent and command identity. Reuse existing catalog CAS. |
| B3 Queue/yield/continuation | UAR runtime/data writer; shared files serialized with B2 | B1/B2. Pending-work limit, fair controller drain, typed loop yield, safe cleanup, durable waits, one continuation, epoch/budget checks and crash recovery. |
| B4 Team experience and packaged skills | Boss desktop/UX/i18n + full/mini authoring owner | Frozen B1–B3 contracts. Roster, messages, delegated/waiting/blocked task states and safe effective context shown in Boss; all locales; exact skill payload copies. |
| B5 Build and operate | Release/operation owner | B1–B4 complete. Same local build/launch/operation requirements; one-slot coordinator→worker→continuation, two-team isolation, duplicate/restart/cancel/revocation and uncertain-effect cases. |

The decisive B operation is a coordinator delegating to a worker with global/team capacity one, releasing its slot, then resuming once with the worker's artifact and completing the user request. B3 must implement and B5 must operate all-target completion (no early wake), a failed/cancelled target waking with its actual outcome, cycle refusal, and reassignment invalidating an old wait without inheriting its authority. B5 also operates an allowed directed edge and forbidden/revoked same-team edges: the latter cannot expose inbox content, send or delegate, even with a valid member identity. Include the durable crash matrix; use actual kernel/catalog/provider entry points at the completed boundary. No per-edit test loops.

A and B are functional increments, not promises to fit exactly two hours. B is materially larger. Before starting each, choose the bounded scope against actual source and record an estimate; stop new admission at the deadline and expose overrun. Do not call a half-wired B delivery successful to satisfy the clock.

## 7. Explicit deferred ownership

| Requirement / candidate | Disposition and owner |
| --- | --- |
| Arbitrary shared KB/memory, unimplemented context grants | Deferred UAR context/compiler increment, coordinated with C03/C09 and memory owner; required forms refuse until implemented. |
| Durable nested subteams and permittedChildren execution mapping | Deferred UAR C09 extension; definition closure is not execution support. Retain explicit capability/refusal. |
| AG-UI/A2UI/A2A full team conformance, rich admin | Existing protocol/C14 owners; A/B add only necessary current Boss contracts, not full draft certification. |
| Governed feedback-to-issue and external workflows | C10; explicit connector authorization/effect uncertainty, consumes working B. |
| Cross-harness export, broader authoring fidelity | C15; B updates team authoring for its supported profile, remainder stays owned. |
| Multi-host/federation/backend qualification | C18; no automatic ownership takeover or current multi-host claim. |
| Restate / Temporal | Defer to C10 architecture comparison, no dependency or service introduced here. |
| Marketing/design/executive teams | Existing C16/C17; consume the same kernel, not another scheduler. |

Library annotations: A `library: uar-existing-kernel`; B `library: codex-control-patterns, transactional-outbox-pattern`, `build: explicit-team-tools`; retain existing Tokio. Reject overloaded root-local child tools and one permanent team root. Candidate IDs are those in library-candidates.json.

## 8. Team, resources, cadence and release

Lead freezes contracts and file claims first. At most three independent implementers plus lead: one Rust writer, one Boss UI/IPC writer (split only when slots and disjoint contracts allow), one Node/skills/payload writer. No concurrent edits to orchestrator/domain/controller. Parallel Node/UI work must not start competing Rust builds. One build writer and one metadata/site publisher. Reviewer/verifier dormant until completed delivery.

Existing role routing lives in Boss `.agent-team/project-routing.json` and `.agent-team/boss-core/team.json`. Runtime/data own authority; providers own exact route contracts; desktop/UX own projection; release owns packaging. Named Rust skills must be located/loaded before Rust edits; consultation did not find rust-best-practices/rust-async-patterns in its searched locations, so resolve that prerequisite explicitly rather than claiming they were used.

120-minute cadence continues; no reset for child/rework. Each successful product delivery requires `pnpm build:mac:arm64`, launch and real newly delivered feature operation with frozen-source evidence. Full publication remains every second success using the existing next-due counter (currently delivery 5): four Mac/Windows installers, GitHub assets, checksums/source/architecture/signing, release metadata and website links. Installed acceptance remains separately pending where not demonstrated. No Linux.

Record task/change/phase counts separately, including documentation vs product scope. Record implementation/build/operation/wait/rework and unattributed time. Prior failed iteration and preserved dirty candidate receive no completion credit. Optional Karpathy service failure must not stop local logging. A child return does not emit a successful-delivery hook.

No unit/TDD/per-task gates from generic planning or old repository instructions apply; they conflict with the operator's explicit completed-boundary policy. Plan artifact consistency is not runtime verification. Source pins remain operator-owned: UAR 3.3.0 Surreal pin is not downgraded to mini's stale declaration; record any pin mismatch before packaging and request operator resolution if changing versions.toml is necessary.

## 9. Approval, artifact acceptance and handoff

Approve or modify D1–D5 and the two-delivery sequence. Approval of the child authorizes finalizing its contracts and closeout; parent implementation still requires explicit parent execution authority, which may be granted in the same user instruction. No approval is inferred from this planning request.

Completed planning set: this plan, two source-grounded task inputs, candidate dispositions, independent bounded review, OpenSpec proposal/design/spec/tasks and plan-stage handoff. Validate the completed artifact set once; record limitations. Execute must read the approval record before changing source.

Suggested next command after approval: `/kbd-execute uar-team-execution-architecture`. It finalizes the architecture contract and handoff. Reflection restores `agent-fabric-convergence` C09.3; then `/kbd-execute agent-fabric-convergence` starts approved product delivery A. Do not mistake the documentation child for a functioning team release.

## 10. Review disposition

Two fresh-context/native review rounds completed. Round 1: one critical and three warnings, all confirmed resolved by round 2. Round 2: one critical omission in explicit B2/B5 authorization criteria; those criteria were added above. The final correction has not received a third independent review because the two-round cap is binding. No clean independent PASS is claimed.

### Unresolved review findings

No known finding is left without a written correction. Independent confirmation of the final directed-edge authorization correction remains pending operator consideration; execution must preserve B2/B5 as explicit completion criteria. REST review could not select a distinct canonical backup. Producer identity is unknown, so cross-model identity is unverified; native isolation and reviewer model gpt-5.6-sol are recorded honestly. See review/plan/dispositions.md.
