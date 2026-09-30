# Assessment — UAR team execution architecture

Date: 29 September 2026 (America/Chicago). Stage: assess. Status: assessment complete; bounded fresh-context document review completed with model-identity limitations. This is source and existing-evidence assessment, not runtime certification, architecture approval or an implementation plan.

## Finding and recommendation

UAR has a credible foundation for durable team administration and single-member admission, but the inspected implementation does not yet provide the complete agent-visible team collaboration requested by the operator. Keep the existing catalog/actor/thread execution foundation. Resolve the bridge between durable team identities and per-run agent tools before adding automatic workflow progression.

The current provider rejection is real and narrow; it is not proof that the scheduler must be replaced. Conversely, repairing that rejection alone will not supply missing roster discovery, durable-member messaging/activation, team context composition or nested-team execution. This child is justified by those explicit product requirements and inspected gaps, not by a generic preference for more architecture work.

## Scope, authority and evidence

The operator authorized this assessment with /kbd-assess uar-team-execution-architecture. Stop after assessment for feedback, then proceed through analyze → plan → execute → reflect only at the agreed stage boundaries. Preserve the existing unbuilt three-file provider repair. No production files, dependencies, services, builds, inference requests or test suites are changed/run by this assessment.

Parent work remains C09.3. The child belongs to Cadence iteration 4 (28847cae-d6e9-45e4-880d-091bbef217c6), begun 2026-09-29T20:57:21.333Z; its 120-minute clock and visible overrun continue. Child completion cannot count as a successful product delivery or reset publication obligations. Windows 2.2.8 installed acceptance remains separately pending. Creation or assessment does not approve the outstanding C10 sequencing amendment.

Evidence classes used throughout: **operated** means an existing recorded application operation at named sources; **implemented/source-only** means an inspected path, without a passing new operation; **missing** means the required path was not found in the inspected relevant implementation; **decision required** means alternatives remain unresolved. Proposed behavior and historical receipts never certify current source.

[assessment-baseline.json](assessment-baseline.json) records current revisions and dirty paths. UAR is 006eeaf1f90e0a640b0f8fd568419badac5f4320 with uncommitted changes only in src/llm/prompt_dialect.rs, src/llm/provider_error.rs and src/llm/orchestrator.rs plus untracked build output. Boss is c00d9b68695fb452d1f09bd4b154582ecaad0035. Mini is 068c2484ddfa29f74449991f46324861911dc7a1; full pack is 80ac9d38296063063e5b7f77ffab3050eed4a826. Local Codex source is 986ff1cc7ced0081ec5014b700a376333d87f869. [source-hashes.json](source-hashes.json) distinguishes current dirty bytes from commits.

Compass lookup for this UAR worktree returned graph.json not found. The assessment uses direct source and recorded references; no fresh code-graph traversal or refresh is claimed. The historical harness research is a dated source snapshot; this assessment does not assert current exhaustive parity with every harness.

## What has actually been delivered

| Increment | Existing evidence | What it does not establish |
|---|---|---|
| C09.1 planning board | Recorded local Mac operation installed a team package, created/persisted boards, recovered after restart and isolated workspaces. | Member inference, automatic delegation, messaging consumption or full teams. |
| C09.2 ownership/mailbox | Recorded local Mac operation claimed/reassigned a task, refused stale ownership, assigned reviewer, persisted an idempotent message and recovered UI state. | Delivered/processed messages or triggered model turns; assignment was explicitly non-executable. |
| C09.3 execution | Native package, Mac build and baseline launch passed at their frozen inputs. Three real team-operation attempts failed. | Successful member response, complete feature scenario, new Windows acceptance or full collaboration conformance. |

Sources: parent openspec/changes/afc-c09-bounded-teams-and-shared-task-board/c09-1-evidence.md and c09-2-evidence.md. The latest failed receipt is .prometheus/cadence/artifacts/c09-team-runtime-operation-failed-40d29709.json; it records renderer-ready but functionalAcceptance not-performed and status failed. Earlier failures end 2f3f82c8 and f0b6a038. These receipts describe a failed scenario; the detailed causal diagnosis additionally uses recorded actor/provider evidence and inspected code. Do not infer the detailed cause from the generic launcher failure string alone.

## Why the current delivery has not finished

The failures crossed separate integration boundaries: an earlier non-executable binding projection, host context/resource selection, then provider wire parameters and error propagation. After the context repair, the gateway rejected an unsolicited thinking field. The diagnostic code was empty, so the visible team outcome lacked an actionable reason. The preserved patch removes the unsolicited parameter and adds stable provider error codes; it has not been rebuilt or operated.

Assessment: the delivery was decomposed into useful administration slices, but the joins between definition, effective binding, context, model transport and durable collaboration were not sufficiently explicit before attempting the complete path. This is an integration-contract weakness. It is not evidence that all prior work is worthless or that a new execution engine is needed. The response should be explicit contracts and a complete usable team slice, with the user-required build-and-operate boundary retained.

## Source-backed gap matrix

Specialist findings and exact source locations are in [runtime](assessment-runtime.md), [context and pinned Codex comparison](assessment-context.md), and [provider/Boss routing](assessment-provider-boss.md). Their source-only conclusions must not be presented as executed behavior.

| Area | Assessed state | Consequence / decision for analysis |
|---|---|---|
| Single execution owner | Existing TeamExecutionRuntime dispatches through the ordinary actor/RunManager path. | Preserve it; a workflow controller must not become another model/tool loop. |
| Agent-visible team identity | Durable members and ordinary run-local child threads occupy different identity/control scopes. | Define how a running member discovers and addresses its authorized durable teammates. |
| Shared context | Member prompt and selected task/artifact input exist; common team instructions/roster are not assembled in this path. | Define versioned team instruction semantics, precedence, roster projection and audit provenance. Text alone cannot repair identity routing. |
| Messaging | Durable accepted envelopes exist; consumption and trigger-turn execution are not connected in the inspected path. | Distinguish accepted, delivered, consumed and completed; specify one durable activation route. |
| Resources | Selected skills/artifacts and restrictive policy exist. Team KB/memory support is incomplete. | Preserve isolation; declare supported selectors and explicit unsupported dispositions. Do not indiscriminately inherit host inventory. |
| Subteams | Definitions can describe subteams; ordinary member execution requires an AgentDefinition. | Either implement bounded subteam activation or explicitly advertise/refuse it as unsupported in the initial profile. |
| Models and transport | Model resolution exists; observed request used a field the gateway does not accept. | Separate selected model identity, gateway alias, upstream identity and connection-specific wire capabilities. |
| Errors and accounting | Error code omission is observed; unknown usage is retained rather than invented. | Preserve actionable safe errors; define reconciliation of held reservations separately from execution success. |
| Recovery/backend guarantees | Durable state and original attempt identities exist; supported backend and process ownership need explicit qualification. | Freeze a one-UAR-instance contract and recovery proof matrix; do not imply distributed takeover. |
| Workflow progression | Proposed C10 controller/extension has not been accepted or operated. | Resolve existing sequencing conflict after the team execution contract; do not choose an engine implicitly. |
| Team protocols | Draft.1 specifies AG-UI/A2UI/A2A team projections; inspected collaboration router exposes administration/execution JSON routes. | Keep dedicated team protocol implementation as explicit owned backlog, not inferred from ordinary run streaming. |

## Priority and confidence

| Finding | Confidence and boundary | Analyze disposition |
|---|---|---|
| Unsupported provider field and empty visible reason | High for the recorded failure and source path; candidate repair has no new build/operation evidence. | Immediate C09.3 delivery blocker. |
| Durable-member discovery, inbox consumption and turn activation bridge absent in inspected path | High from actual call sites and production symbol searches; no runtime probe in this assessment. | Required for the requested peer collaboration; decide the smallest usable slice explicitly. |
| Shared team instructions and declared context grant mapping incomplete | High source confidence; member-specific prompts and required-RAG refusal already exist. | Define shared instruction precedence and explicit support/refusal semantics; no blanket inheritance. |
| Remote support claims, recovery ownership and retained-usage reconciliation | High for source mechanisms and exposed routes; no demonstrated remote race, budget bypass or corruption. | Narrow capability claims and recovery contract to the supported one-instance profile; evidence still required. |
| Subteam activation, fair admission, broader lifecycle and team protocols | High specification/source gap confidence; implementation ownership and delivery order unresolved. | Retain named backlog owners before claiming full draft conformance; avoid silently expanding C09.3. |

A concrete compatibility gap also exists for `permittedChildren`: graph closure is validated but the inspected ordinary spawn path does not consume those immutable references. Existing authorization and restrictive policy intersection remain in force. This is a definition-fidelity decision, not evidence of arbitrary privileged spawning. See the context assessment for both the gap and counterevidence.

## Architecture boundaries to retain

- UAR owns durable team/task/attempt/message state, admission and execution. Boss presents it through its trusted typed boundary.
- Definitions request semantics; private deployment bindings resolve resources; current policy governs effects. A prompt, role or stored task assignment grants no authority.
- A durable team member can outlive a run; a new admitted turn must reacquire current authority. Ordinary child threads remain useful within a turn and must not silently masquerade as durable teammates.
- Selected shared artifacts are separate from private history and memory. Roster visibility and message disclosure are independently scoped.
- Known execution outcome and usage settlement are separate. Unknown external effects require reconciliation before retry; missing usage is not zero cost.
- BossFang retains delegated workflow ownership; Fabric carries events and memory supplies context. Neither becomes an additional UAR scheduler.

## Choices for the analyze stage

1. Define the smallest honest executable-team capability profile and a capability matrix: planning, task ownership, manual member execution, agent-driven team coordination, subteams, memory/KB and protocols.
2. Decide the team-context envelope and shared instruction format, including precedence, immutable revision/digest, eligible roster and resource provenance. Decide which fields are required versus optional; unsupported required semantics must be refused.
3. Select the bridge from model-facing team tools to the existing authoritative catalog/admission/mailbox. Compare explicit team tools with adapting existing tools using typed durable selectors; do not default to name-based lookups or a second registry.
4. Set the model/provider boundary so prompt style does not imply unsupported request fields. Decide behavior for explicitly requested reasoning unsupported by the configured gateway. The current patch addresses unsolicited reasoning only. Reuse the existing exact-endpoint request-profile seam in `src/llm/mod.rs` and `Orchestrator::prepare_attempt`, described in the provider assessment; do not propose a duplicate transport framework.
5. Freeze backend/process ownership and recovery/usage reconciliation semantics. Record the scope and proof still required; do not add distributed leases merely to meet an imagined federation requirement.
6. Reconcile the first usable delivery and parent backlog. A successful manually admitted model turn is useful but not complete autonomous team orchestration. Keep C10 automatic workflow work pending these choices.

## Scope discipline and acceptance

Analyze should recommend the minimum repair set, alternatives and repository ownership; plan should freeze it for operator approval. No new architecture is approved by this assessment. Full nested teams, all protocol adapters, distributed execution, every business workflow and all memory backends must not be silently added to the next two-hour slice. Requirements deferred from the full specification must remain owned and visible, with compatibility/capability consequences stated.

The next production boundary must build the complete approved increment and operate its intended team function in the packaged Boss app. Retain the existing C09.3 failure evidence and exercise only the completed, affected path. Do not run unit/per-edit/partial suites to substitute for the missing end-to-end operation. A combined useful-team scenario should eventually show an agent discovering a permitted teammate, delegating work, receiving a result through the authoritative records and completing the requested output; its exact scope is a plan decision, not a test started during assessment.

## Independent review and learning

One fresh-context GPT-5.6-sol artifact review returned PASS with zero findings and an explicit checked-classes record. The REST dispatcher refused review because canonical model identities could not establish an independent reviewer. The native review has no producing-session history, but canonical cross-model identity remains unverified; it is not a clean REST certification. See [review dispositions](review/dispositions.md) and the preserved packet/findings. No production reviewer/verifier gate was opened.

The strict sycophancy screen scored the assessment 0.018, flagging only low-severity length, and the review 0.0 with no flags. This does not prove technical correctness. Detailed traceability is retained in the documents while the operator handoff is concise. All eleven captured UAR source hashes remain unchanged, including the three-file candidate repair. Concurrent submodule-status differences in Boss/full-pack are recorded in [source-preservation.json](source-preservation.json), preserved without attribution.

Karpathy lesson candidate: distinguish a durable team administration plane from a usable agent execution plane; define the identity/context/transport joins before claiming team capability. Keep planning, ownership, inference, collaboration and publication receipts separate. This is a local learning note, not an automatic rule promotion or a completion event for C09.3.
