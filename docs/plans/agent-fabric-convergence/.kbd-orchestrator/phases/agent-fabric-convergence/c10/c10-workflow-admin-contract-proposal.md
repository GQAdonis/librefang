# C10 workflow administration contract proposal

Status: **unimplemented candidate contract for operator review**. This document does not approve an architecture, select or reject an external workflow engine, admit C10 implementation, change runtime qualification, or mark a C10 task begun or complete. It maps a concrete first REST shape onto inspected UAR source at `c906c24fb8114f1a3b55dc83a12feec542ae8b8d` so the comparison can be reviewed. The Boss installer is a future consumer boundary and does not block this shared UAR planning work.

This proposal refines the committed [existing-kernel substrate map](c10-existing-kernel-substrate-proposal.md) and [lead architecture proposal](c10-lead-architecture-proposal.md). The bounded slice remains **classify → draft → operator decision**. Acceptance records a decision only; it does not create an issue, communicate externally, or authorize implementation.

## Existing contracts to reuse exactly

All existing administration routes are under `/api/v1/collaboration`, authenticated from `UserContext`, and workspace-scoped with `x-uar-workspace-id`. The request body never selects its owner. [server.rs](/Users/gqadonis/.claude/worktrees/afc-c08-uar-delivery/src/server.rs:1717) [collaboration.rs](/Users/gqadonis/.claude/worktrees/afc-c08-uar-delivery/src/uar/api/collaboration.rs:206)

| Existing surface | Reuse in the candidate |
| --- | --- |
| `GET /capabilities`, `POST /packages:preflight`, `POST /packages:install`, package/version reads | Keep immutable workflow/package source identity and compilation diagnostics. Workflow documents are storable today, while workflow activation remains explicitly `false`. [collaboration.rs](/Users/gqadonis/.claude/worktrees/afc-c08-uar-delivery/src/uar/api/collaboration.rs:48) [capabilities.rs](/Users/gqadonis/.claude/worktrees/afc-c08-uar-delivery/src/uar/api/capabilities.rs:195) |
| Deployment-binding preflight/install/read/effective receipt | Pin the private binding revision, resolved models, skills, policy revision, grants, storage requirements, and runtime capabilities interpreted for a run. [collaboration.rs](/Users/gqadonis/.claude/worktrees/afc-c08-uar-delivery/src/uar/api/collaboration.rs:59) |
| `POST /team-instances`, task create/read/claim/state routes | Represent classify and draft as ordinary durable `TeamTask` records under one selected team. [team_planning.rs](/Users/gqadonis/.claude/worktrees/afc-c08-uar-delivery/src/uar/api/collaboration/team_planning.rs:23) |
| `POST /team-instances/{team}/tasks/{task}/admit` and `GET /team-instances/{team}/execution` | Admit each step through the existing stable `commandId`, team/task revision, member, reservation and context-artifact contract; read attempts, reservations, waits and continuations from the existing summary. [team_execution.rs](/Users/gqadonis/.claude/worktrees/afc-c08-uar-delivery/src/uar/api/collaboration/team_execution.rs:20) [team_execution.rs](/Users/gqadonis/.claude/worktrees/afc-c08-uar-delivery/src/uar/domain/team_execution.rs:16) |
| `GET /team-instances/{team}/artifacts` | Keep UAR's attempt-owned artifact store authoritative. Workflow records link to artifacts; they do not copy output into an engine history. [team_scope.rs](/Users/gqadonis/.claude/worktrees/afc-c08-uar-delivery/src/uar/api/collaboration/team_scope.rs:17) |
| Team recover/cancel and execution-owner view/reclaim/quiesce | Reuse execution fencing and original-producer reconciliation. Workflow recovery may request these operations but cannot replace their evidence. [team_execution.rs](/Users/gqadonis/.claude/worktrees/afc-c08-uar-delivery/src/uar/api/collaboration/team_execution.rs:37) |
| Collaboration aggregate generation CAS | Persist workflow records with the same atomic catalog boundary for the bounded candidate. Memory remains process-local; only a qualified persistent backend can advertise restart recovery. [storage.rs](/Users/gqadonis/.claude/worktrees/afc-c08-uar-delivery/src/uar/compiler/collaboration/storage.rs:15) [collaboration.rs](/Users/gqadonis/.claude/worktrees/afc-c08-uar-delivery/src/uar/domain/collaboration.rs:432) |

Current `TeamWait` is an attempt-derived peer wait over terminal task outcomes. It is reusable as a recovery and continuation pattern, but it is **not** the proposed operator wait and must not be exposed as one. [team_wait.rs](/Users/gqadonis/.claude/worktrees/afc-c08-uar-delivery/src/uar/domain/team_wait.rs:185)

## Proposed REST administration surface

Every route in this table is **new and unimplemented**. The candidate would add them to the existing collaboration router and reuse its owner/workspace extraction and error envelope. Mutations require a stable `commandId`; exact replay returns the original receipt, while reuse with different canonical request bytes returns `409 collaboration_revision_conflict`.

| Method and path | Candidate behavior |
| --- | --- |
| `POST /workflow-runs:activate` | Compile and pin one installed workflow/package/binding/team plan, create one durable run plus classify/draft step records, and admit only the first ready task through existing team admission. No model execution occurs in the HTTP handler. |
| `GET /workflow-runs` | List sanitized run summaries for the authenticated owner and exact workspace, optionally filtered by state. |
| `GET /workflow-runs/{runId}` | Return the pinned plan identity, run revision/state, step links, current wait link, cancellation state and timestamps. |
| `GET /workflow-runs/{runId}/steps/{stepActivationId}` | Return the durable task/attempt/artifact links and actual execution, effect and accounting dispositions for one activation. |
| `POST /workflow-runs/{runId}:cancel` | Record cancellation intent at `expectedRunRevision` and prevent dependent admission. It becomes terminal only after the original attempt/effect evidence permits that conclusion. |
| `POST /workflow-runs/{runId}:recover` | Privileged, explicit recovery request. Reconcile the pinned original task/attempt through existing team recovery, then make at most one CAS progression. It is not the normal progression loop. |
| `GET /workflow-runs/{runId}/operator-waits` | List sanitized durable waits, including decided/cancelled waits, without draft content. |
| `GET /workflow-runs/{runId}/operator-waits/{waitId}` | Return one wait, its exact draft artifact reference/digest, allowed decisions, authority revision and decision receipt link. |
| `POST /workflow-runs/{runId}/operator-waits/{waitId}:decide` | Require current human/operator authority, expected run and wait revisions, and the exact draft artifact ID/digest; atomically record `accept`, `reject`, `revise`, or `cancel`. A UAR agent/service-instance principal cannot resolve the wait. |

Candidate activation request:

```json
{
  "commandId": "stable caller command",
  "workflowDefinition": {"id": "...", "version": "...", "digest": "..."},
  "deploymentBindingId": "...",
  "expectedBindingRevision": 1,
  "teamId": "...",
  "expectedTeamRevision": 1,
  "input": {},
  "reservation": {"tokens": 1, "costMicrounits": 0, "elapsedSeconds": 1}
}
```

The reservation numbers above are the smallest structurally admissible illustration, not proposed capacity or budget defaults; activation must use the selected team's actual declared limits.

Candidate decision request:

```json
{
  "commandId": "stable caller command",
  "expectedRunRevision": 4,
  "expectedWaitRevision": 1,
  "artifact": {"artifactId": "...", "contentDigest": "sha256:..."},
  "decision": "accept",
  "reason": null,
  "revisionInstruction": null
}
```

`revisionInstruction` is accepted only with `decision: "revise"` and is stored as operator input for a separately identified activation. It is never appended to or used to mutate the accepted draft artifact.

## Proposed durable records and fields

Names are descriptive wire names, not approved Rust identifiers.

### Compiled workflow plan

- `planId`, `profile`, `interpreterVersion`, `compilerDigest`
- exact `workflowDefinition`, package and deployment-binding references with digests/revisions
- `teamId`, team definition/package/binding revisions, resolved member role and model identities
- closed ordered steps with `stepId`, ordinal, input mapping, input/output contract digests, dependencies and activation limit
- trusted instruction digest and provenance, selected context sources, closed tool/skill set and enforced `effect: "none"`
- failure/completion policy and `maxActivations`

The plan is immutable. A changed definition, binding, role/model resolution or interpreter creates another plan identity; restart never silently resolves against the current global provider.

### Workflow run

- `runId`, `activationId`, `ownerId`, `workspaceId`, `teamId`
- `planId`, `planDigest`, `revision`, `status`, `currentStepActivationId`
- `activationCount`, `maxActivations`, `stepActivationIds`, `operatorWaitIds`
- `cancellationIntent` with command receipt and reason; terminal outcome remains separate
- `createdAt`, `updatedAt`, optional `completedAt`

Run states need a closed vocabulary covering at least `classifying`, `drafting`, `waiting-operator`, `revision-requested`, `accepted`, `rejected`, `cancellation-requested`, `cancelled`, `blocked`, and `failed`. The exact vocabulary remains an approval item.

### Step activation and task link

The existing `TeamTask` already stores `id`, role, input, output contract, dependencies, status/revision, assignee/ownership epoch and assignment authority. [team_planning.rs](/Users/gqadonis/.claude/worktrees/afc-c08-uar-delivery/src/uar/domain/team_planning.rs:131) The workflow layer adds one durable link record rather than making the task a workflow cursor:

- `stepActivationId` and stable `uniquenessKey = runId + stepId + activationOrdinal`
- `runId`, `runRevision`, `stepId`, ordinal and `compiledStepDigest`
- `teamId`, `taskId`, admitted task revision, member ID/revision and ownership epoch
- original `attemptId`, run/root/approval scope, binding revision and execution fence
- selected input artifact references/digests and one selected output artifact reference/digest
- actual `attemptStatus`, `executionOutcome`, `effectDisposition`, `accountingState`, reservation and usage revision
- `state`, `stateReason`, `createdAt`, `updatedAt`

No replacement attempt may be admitted while the original is live or its effect disposition is unresolved. Authoritative model success plus a committed valid artifact may advance while accounting remains `reserved-unknown`; the reservation remains charged and visible.

### Artifact reference

Current `TeamArtifact` persists ID, owner/workspace/team/task/member/attempt, content and creation time, but no content digest. [team_execution.rs](/Users/gqadonis/.claude/worktrees/afc-c08-uar-delivery/src/uar/domain/team_execution.rs:80) The candidate adds `contentDigest`, computed over canonical artifact content at the same immutable artifact commit. Workflow links store:

- `artifactId`, `attemptId`, `contentDigest`
- `outputContractDigest` and artifact `createdAt`

The runtime already validates output against the task JSON Schema before adding the artifact, and the artifact ID is deterministic per attempt. [execution.rs](/Users/gqadonis/.claude/worktrees/afc-c08-uar-delivery/src/uar/runtime/team_execution/execution.rs:93) [scope.rs](/Users/gqadonis/.claude/worktrees/afc-c08-uar-delivery/src/uar/compiler/collaboration/team_execution/scope.rs:46)

### Operator wait and decision receipt

Operator wait:

- `waitId`, `runId`, `stepActivationId`, `ownerId`, `workspaceId`
- `revision`, `state`, exact `draftArtifactId` and `draftContentDigest`
- `allowedDecisions`, `decisionAuthorityRef`, `authorityRevision`
- `createdAt`, `updatedAt`, `decisionReceiptId`; no automatic expiry in the proposed default
- sanitized `presentationCursor` for Boss refresh/event delivery; no draft content or credentials

Decision receipt:

- `receiptId`, `commandId`, `requestDigest`
- authenticated `actorId` and current authority reference/revision
- `waitId`, `expectedWaitRevision`, exact artifact ID/digest
- decision, optional reason or revision instruction, `committedAt`

The decision and wait transition commit atomically with the run revision. Exact command replay returns the recorded receipt; a changed decision, artifact or expected revision conflicts. A model-visible tool cannot produce this receipt.

## Progression, recovery and ownership

There is one workflow-advancement authority and the existing UAR actor thread remains the only model executor. The current process-local team controller explicitly contains no model loop. [controller.rs](/Users/gqadonis/.claude/worktrees/afc-c08-uar-delivery/src/uar/runtime/team_execution/controller.rs:39)

Normal advancement has only three triggers:

1. Existing attempt settlement plus immutable artifact commit advances classify to draft or draft to an operator wait through one catalog CAS.
2. An authenticated operator decision advances the wait/run through one catalog CAS; `revise` may admit one separately identified task activation through existing team admission.
3. Ready-runtime startup recovery or the explicit recover route reconstructs nonterminal runs from durable records, reconciles the original producer/effects, and performs at most one replay-safe transition.

There is no polling daemon, timer scheduler, second model loop, engine-owned artifact store, or second workflow database in this candidate. If an external engine is later selected, it must dispatch into the same UAR executor and preserve UAR artifact/effect authority; its scheduler cannot become a concurrent advancement owner.

## Unresolved approval items

1. Approve or revise the route/resource names, closed run/wait state vocabularies, and activation response shape.
2. Define the exact human/operator authority claim and whether the existing administrator key is sufficient; the fixed requirement is that agent/service-instance credentials cannot decide.
3. Approve the interpreter/mapping vocabulary, instruction provenance contract, and runtime-enforced no-effect tool policy.
4. Decide whether the canonical digest extends `TeamArtifact` directly or is a separately versioned immutable artifact receipt.
5. Approve accept/reject/revise/cancel semantics and the proposed no-expiry default.
6. Select the single workflow advancement owner and qualified persistent storage profiles.
7. Decide the substrate only after the named external-engine comparison and agreed capacity targets. No engine is selected here.

No C10 endpoint or field above exists at `c906c24` unless explicitly identified as current reuse. No code, service, scheduler, build, test, review, package, installer, approved specification, or canonical progress record changed as part of this preparation.
