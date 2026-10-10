# C10 first-delivery contract proposal

Status: UAR workflow ownership and completed-boundary measurement approved by the operator on 3 October 2026. This document records no implementation, measurement, operational pass or C10 completion.

The parent initiative has approved execution authority. The operator subsequently selected UAR's existing durable team runtime as workflow owner from the current source comparison and moved measurement to the completed integration gate. The earlier documentation-only child approval is not the authority for current product execution. Repository-scoped plans and file claims remain required.

The existing [substrate source proposal](c10-workflow-substrate-decision.md) supplies inspected source anchors and comparison findings. Its historical authority and C09-position statements are not current execution restrictions or fresh runtime evidence. C09's accepted completed-delivery receipt must be consumed separately before implementing this dependent slice.

The 3 October source refresh in that proposal is the current architecture assessment: UAR already has durable coordinator task waits, continuation receipts and restart reconciliation. Reuse their storage/ownership infrastructure without converting the human decision gate into a coordinator continuation. `cand-007` is a generic pattern with no selected external engine. The operator resolved the sequencing conflict in favor of source-backed UAR selection and measurement at completed delivery; no runtime capability is certified by that decision.

## Proposed useful operation

An operator opens workflows within Boss's existing Teams surface, selects an installed feedback workflow and supplies a bounded feedback text. The run classifies the feedback, drafts a response or issue description, and durably reaches **Awaiting your decision**. Boss presents the exact draft and lets the authenticated operator accept, reject or cancel. Acceptance records an accepted internal draft artifact. It creates no external issue, sends no message, and grants no implementation authority.

The proposed substrate is UAR-owned durable progression over C09 team execution. UAR remains the single ordinary model executor. Boss owns presentation, product conversation history and explicit decision controls. The decision receipt is durable in UAR; Boss stores or displays its reference through its existing product history rather than keeping the authoritative decision in component state. No new daemon, port, external scheduler dependency or second model loop is proposed.

```mermaid
flowchart LR
    B[Boss: submit scoped feedback] --> C[UAR: admit classify task]
    C --> A[Committed classification artifact]
    A --> D[UAR: admit draft task]
    D --> W[Persist exact draft and operator wait]
    W --> O[Boss: accept / reject / cancel]
    O --> R[UAR: durable decision receipt]
```

Exactly two sequential steps are supported initially: `classify`, then `draft`. Each is an ordinary C09 task with a declared output contract, one attempt, `effect: none`, no model tools authorizing external effects, and explicit context selection. The draft consumes only the submitted feedback and the committed classification artifact. It never receives blanket team histories, another workspace's artifacts or unselected conversation history.

## Schema and interpretation proposal

The inspected UAR document profile is `urn:prometheus:uar:collaboration:0.1.0-draft.2`. Its workflow schema already declares immutable identity/digest, roles, dependencies, input mappings, output schemas, effect/approval/retry/completion and failure policy. It has no operator-wait step kind. `approval: operator-exact-effect` must not be reinterpreted as a generic wait or permission to implement an issue.

Preserve draft.2 and existing examples unchanged. Propose a new required namespaced extension, `prometheus.workflow-execution`, whose value has `version: 1.0.0`, `mode: sequential-feedback-draft`, `mappingVersion: 1.0.0`, and `completionGate: { kind: operator-decision, presentedStep: draft, decisions: [accept, reject, cancel] }`. These names are proposed new contracts, not existing runtime capabilities. Publish its closed schema and matching versioned runtime capability in the repository-scoped change; declare that capability as required in both the workflow and package. An older runtime can retain the document but must refuse activation when the required execution semantics are unsupported.

The extension declares portable behavior only. It contains no operator identity, executable approval, credential, policy decision or private binding. A run pins the complete definition, canonical digest, extension interpretation version and compiled-plan digest. The private wait and decision receipt are separate execution records. Changing the extension's meaning requires a new interpretation version and immutable definition digest, never silent reuse of an existing version.

The first interpreter accepts only the two-step chain, `failurePolicy: stop-dependent`, `retry.maxAttempts: 1`, `retry.onUnknownEffect: reconcile-before-retry`, `effect: none`, and `approval: current-authority`. Both outputs must be validated artifacts before completion. `maxActivations` is enforced against durable run admissions. Required loops, parallel joins, timers, external signals, automatic retry, compensation and connector effects are refused with a field diagnostic.

Input mappings use a closed, versioned selector vocabulary rather than an expression language. Retain the existing example's `workflow-input:<field>` form; propose `step-artifact:<step-id>` for the exact validated predecessor artifact. The latter is new interpreter semantics and must be declared and accepted explicitly. No evaluation of arbitrary expressions, history searches or aliases is implied. The compiler validates declared input fields, predecessor dependencies, exact artifact selection and output-to-input compatibility before activation.

The bounded feedback fixture has a string input with an explicit maximum length. The classifier returns a schema-validated category and rationale; the draft returns a schema-validated title and body. Exact limits and category vocabulary belong to the installed immutable workflow, not hard-coded product heuristics. The workflow's final output contract describes the decision and draft artifact reference; it does not require a third model turn.

## Interfaces and ownership of state

The following interfaces and DTO names are proposed, not available API routes. They must be frozen in matching UAR schemas and Boss typed IPC before implementation. Every operation uses the existing authenticated owner/workspace boundary; no generic raw-router IPC escape is needed.

| Interface | Input and result contract |
| --- | --- |
| List supported workflows | Workspace selector; installed immutable workflow references and capability diagnostics. Unsupported definitions remain inspectable without being executable. |
| Start workflow | Workspace, exact definition and private binding references, team instance, bounded input, two per-step reservations, command ID and expected revisions. Return durable run and step/task identities. |
| Inspect/list runs | Workspace/run selector; pinned definition and plan, run revision, step/task/attempt references, output references, current wait/decision, execution status and accounting summary. |
| Decide | Workspace/run, exact wait ID, expected run revision, command ID, decision, presented artifact ID and digest. Return the durable decision receipt and resulting run. |
| Cancel/recover | Workspace/run, expected revision, command ID and reason. Return current authoritative disposition and original attempt references; recovery does not mean replay. |

Start admits a durable run under its immutable definition's activation ceiling. It validates the selected team/role/member resolutions, current private binding and model pricing identity through C09. Start records the two step/task identities and pinned definition before dispatching the first step. Each step records its original C09 attempt link using a deterministic scoped command ID; duplicate start/progression cannot manufacture a second task or attempt. If persistence fails, no dispatch or wait acknowledgment follows.

The stored identity includes owner, workspace, workflow run, definition/package IDs/versions/digests, compiled interpretation version/digest, team ID, role/member references, binding revision, input snapshot and revisioned step state. Current authority is revalidated before each admission and decision. Definition pinning does not preserve revoked member rights or superseded private grants.

All control receipts bind their command ID to the complete operation digest within the owner/workspace/run namespace. Identical repeated commands return the prior result. A reused command ID with different content is a conflict. Revision checks, exact wait identity and exact artifact digest prevent a stale decision from approving a different draft.

## Lifecycle and progression

Proposed run states are `ready`, `running`, `awaiting_decision`, `reconciling`, `cancellation_requested`, `accepted`, `rejected`, `cancelled` and `failed`. These are new workflow states; C09 task/attempt statuses remain unchanged. Accounting state is an independent projection and is not encoded by a run's accepted/rejected disposition.

| Transition | Required durable evidence |
| --- | --- |
| Start → ready/running classify | Pinned definition/plan, scoped input and task mapping committed; C09 admits and exclusively claims the original attempt. |
| Classify → running draft | Authoritative execution succeeded; output passes its schema and is committed as the exact selected artifact; current authority and remaining budget admit the original next task. |
| Draft → awaiting_decision | The same success/artifact checks pass; commit a stable wait ID, draft content digest, allowed decisions and run revision. No model turn stays open while waiting. |
| Awaiting decision → accepted/rejected | Authenticated current-authority command commits one receipt for the exact wait and artifact. Acceptance finalizes the draft reference without an external effect. |
| Any unfinished state → cancellation_requested | Durable cancellation intent; request C09 cancellation of the original active attempt, preserving its original execution epoch. |
| Cancellation requested → cancelled | Queued undispatched work is authoritatively cancelled, or the original producer's terminal cleanup is known. Unknown running execution stays visibly unresolved. |
| Unknown execution → reconciling | Persist ambiguity and original task/attempt identities; admit no dependent step and do not replay. |

Progression is a revision/CAS-protected domain operation over these records. A completion callback may request advancement, but the persisted state decides whether advancement is eligible. Duplicate callbacks cannot double-admit. Recovery invokes the same advancement operation after reconciling original attempt ownership. It uses the existing `TeamExecutionRuntime` dispatch entry and `ActorThreadSession` execution path; it introduces no workflow agent executor or independently competing scheduler.

Crash recovery reloads the pinned definition/plan and original task/attempt mapping. Completed steps supply their existing committed artifacts and never run again to reconstruct context. A persisted wait reappears with the same artifact, digest and wait ID even if a newer definition is installed. A queued intent remains eligible only through C09's original dispatch claim. Abandoned running work is reconciled only after establishing that no local producer is live; unknown outcomes remain blocked rather than receiving replacement attempts.

## Known output with unknown accounting

The proposed policy permits progression when C09 records `executionOutcome: succeeded`, the declared output contract is satisfied, the exact scoped output artifact is durably committed, the step has no external effect, and current authority and available aggregate budget permit the next reservation. An accounting status of `uncertain` alone does not turn known execution into failure. No artifact alone substitutes for the authoritative successful attempt outcome.

C09 remains the only usage/reservation ledger. Every unsettled reservation remains held and included with committed usage when checking the next task's tokens, cost and elapsed-time ceilings. Known terminal execution releases live concurrency according to C09's contract; it does not release an unresolved budget reservation. No guessed zero usage or duplicate workflow usage charge is allowed.

Consequently a run may reach `awaiting_decision` or `accepted` while displaying **Accounting unresolved; reservation held**. Acceptance cannot settle usage. If the held reservation leaves insufficient budget, the draft remains unadmitted with an inspectable budget reason. If execution itself is unknown, the run is `reconciling` and cannot advance even if partial output exists. Revocation blocks new delivery/admission but preserves the original worker's ability to settle known usage and cancellation.

## Compatibility and repository claims

This is additive provider support before consumer enforcement. Existing agent/team execution, draft.2 packages, C09 routes and task statuses retain their semantics. Workflow capability must remain unavailable until the supported interpreter, persistence, controls and operational receipt exist. Rollback does not rewrite pinned records or synthesize completion; an older runtime refuses unsupported active execution while preserving inspectable records for a compatible runtime. No external effect is reversed by rollback.

The following are candidate responsibility claims to freeze in repository-scoped changes after the architecture decision. New filenames are proposals. Existing entry points are touched only to register the new feature or attach the completion/advance integration.

| Repository | Candidate ownership |
| --- | --- |
| UAR | New workflow execution domain/schema records; `src/uar/compiler/collaboration/workflow_execution/` for compilation, admission, progression, decision and recovery; new workflow API module under `src/uar/api/collaboration/`; catalog persistence registration. Reuse `compiler/collaboration/team_execution/{admission,scope,settlement,recovery}.rs` and `runtime/team_execution/` through their existing services, with minimal explicit progression integration. |
| Boss | New `src/main/ai/runtime/uar/UarWorkflowExecutionAdapter.ts`, new `src/shared/types/uarWorkflows.ts`, typed entries in `src/shared/ipc/schemas/prometheus.ts`, and a workflow component within the existing Teams surface under `src/renderer/pages/settings/PrometheusSettings/`; matching localization, preload/handler registration and packaging as required by the frozen typed contract. |
| BossFang/LibreFang | Existing engine is a measured comparison candidate. Feedback ingress and agreed source identity remain later C10 work; no second executor or kernel bypass is added for this direct Boss slice. |
| Gate/memory | Consume agreed owner checkpoints. No changes without a demonstrated integration gap and its owner's agreed scope. |

Each module stays within the repository's bounded-file rule. No dependency or version-pin changes are part of this proposal. Shared build directories have one writer. Consumer enforcement waits for the accepted provider checkpoint, not merely a matching branch name.

## Comparison and acceptance still required

C10 design/REC-059 require an honest comparison. The operator selected UAR from source evidence before implementation and moved runtime measurement to the completed-delivery gate. The existing LibreFang engine remains a source comparison; `cand-007` has no instantiated engine to measure. A reference whose runtime, dependencies or supported environment are unavailable is recorded as unmeasured with a reason, not assigned invented favorable or unfavorable results.

| Required comparison | Current measurement |
| --- | --- |
| Pinned definition and exact artifact retained through wait/restart | Unknown; source requirements only. |
| Exclusive admission/claim and recovery of original attempt identity | Unknown for workflow progression; consume C09 evidence separately. |
| Durable waits, joins, retry and compensation guarantees | Unknown for this proposed controller; only operator wait is proposed in the first slice. Others remain explicitly unsupported. |
| Idempotency and unknown external-effect handling | Unknown; first slice has no connector writes and cannot certify them. |
| Embedded/mobile/offline constraints and storage/backend profile | Unknown measurements; desktop operation will not certify mobile. |
| Progression overhead, transitions/storage, recovery latency, memory and operational cost | Unknown; measure separately from model latency, tokens and cost. |

The workflow owner decision is approved. Implementation readiness still requires the accepted C09 dependency receipt, repository-specific OpenSpec reconciliation and exact file claims. Completed-boundary measurements remain pending and cannot be reported as implementation proof in advance.

## Completed-delivery operation plan

Finish the selected slice's production persistence, runtime integration, schemas/API, typed Boss IPC, accessible UI, all required locales and packaging before opening its gate. No intermediate unit/mock/per-edit gate is planned. At the complete slice boundary, run only the new workflow path and required local build/packaged checks; consume passing C09 receipts rather than repeat its unrelated scenarios. Fix an observed failed gate and rerun only that gate.

Use the repository's required UAR build and Boss `pnpm build:mac:arm64`, with serialized writers for shared targets. Launch the actual current built Boss application through the existing cadence launcher using isolated data and a trusted scenario. Execute through `window.api` typed contracts and displayed controls, not a mock runtime or unknown raw-router bypass. Exact operation script and immutable source/build receipts are authored with the repository-scoped delivery; no script is run by this document.

The real operation submits a fresh feedback marker, uses a configured real model and immutable binding, obtains a schema-valid classification, then a draft carrying that marker through the explicitly selected classification artifact. Record exposed binding identity plus actual responses; do not invent model provenance. Verify the durable wait in accessible Boss UI. Install a newer definition, restart through the existing integration restart control, and confirm that the original run still presents the original pinned draft and wait. Accept the exact draft through typed IPC/UI and observe the durable receipt; repeat the identical decision and observe the same receipt, without another task or attempt.

Workflow-specific failure rows include an isolated second workspace unable to inspect or decide the first run; stale/conflicting wait decisions refused; revoked authority unable to advance or accept; held reservations truthfully refusing an over-budget next step; cancellation/recovery retaining original attempt identities and unknown-execution blocking progression. These rows must be controlled real operations at the completed delivery boundary, not guessed restart success or fabricated zero accounting. A known successful output with unresolved accounting passes only the business-output row under the policy above, while accounting uncertainty and held budget remain explicitly reported.

Capture comparison measurements on the same bounded workload and backend profile, including workflow overhead separate from model execution. All results are pending. Write immutable operation receipts only to the initiative's `.prometheus/cadence/artifacts/`, excluded from product source fingerprints; credentials remain secret environment references and never appear in receipts or error response dumps.

## Retained C10 scope and decision points

This draft slice does not complete C10.1 without the accepted substrate comparison and pinning/recovery evidence, and does not complete C10.2 or C10.3. Retain GitHub issue normalization and Notion/Slack/Jira read/draft/write adapters, target/credential/egress scopes, durable effect intent/outcome and unknown-response reconciliation. Full acceptance still requires one issue after timeout/restart, no sensitive egress, no replay posts, and no issue-to-implementation authorization. Retain observe/classify/deduplicate/standing-policy intake and product/design/reviewer outputs with explicit implementation admission. Direct Boss access does not waive the eventual agreed BossFang ingress path or C05/C07/C08/C09 and D-UAR-P1/D-MINI/D-GATE/D-MEMORY checkpoints.

The operator approved UAR workflow ownership and completed-boundary measurement. The bounded first-delivery contract still requires a versioned extension, closed mapping vocabulary, known successful no-effect output with held accounting, and an internal-draft-only decision. Required measurements and repository ownership checkpoints remain unresolved. This document does not complete a canonical task, change or phase.
