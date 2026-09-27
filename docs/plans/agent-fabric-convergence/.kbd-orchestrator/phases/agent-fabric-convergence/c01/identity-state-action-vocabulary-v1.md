# Agent Fabric identity, state and action vocabulary v1

**Contract:** `afc.identity-state-action.v1` / `1.0.0`  
**Status:** accepted planning contract; product conformance remains separately gated.  
**Machine form:** [identity-state-action-vocabulary-v1.json](identity-state-action-vocabulary-v1.json)

This vocabulary binds the accepted `the-boss.uar.sidecar/1` ownership contract to the UAR collaboration draft. It prevents the ecosystem from calling a definition, installed binding, durable instance, task, attempt, run, conversation or workflow by the same ambiguous word.

Seven version dimensions remain independent: the P1 host/runtime contract, collaboration profile, team AG-UI profile, custom-event envelope schema, definition semantic version/content digest, mutable resource revision, and event sequence/projection cursor. A compatible value in one dimension says nothing about the others.

## Authority

| System | Owns | Must not become |
|---|---|---|
| The Boss | Application/workspace/conversation identity, canonical product history, host admission, credential references and sidecar supervision | A second UAR scheduler or execution store |
| UAR | Catalog, private bindings, durable team/agent instances, tasks, attempts, leases, inboxes, checkpoints and runtime events | The product conversation or BossFang workflow authority |
| BossFang/librefang | Its workflow and kernel execution, including the record of a bounded delegation | The executor of a delegated UAR run |
| Flint Realtime Fabric | Transport envelopes, delivery and transport cursors | A scheduler, task board or approval authority |
| surreal-memory-server | Scoped memory and retrieval provenance | A conversation, workflow, task or approval store |
| Flint Gate / trusted host approval | Policy decisions, exact approval identity and grant revision. The Boss trusted host owns P1 approval presentation/tool admission; Flint Gate remains the D-GATE provider candidate. | The executor of the approved effect |

## Identity classes

The five required collaboration layers are immutable **Definition**, private **DeploymentBinding**, durable **Instance**, durable **Task**, and one-try **Attempt**. `DefinitionId` resolves with semantic version and content digest. `PackageId` adds package version/digest and an exact file lock. `RuntimeInstanceId` selects the exact provider, endpoint, model and protected credential reference. A binding adds owner, workspace, runtime and protected resource references. `AgentInstanceId` and `TeamInstanceId` remain distinct durable actors. A task survives attempt retries and reconnects. An attempt carries the current lease epoch and run association.

Execution adds `RunId`, `StepId` and `InvocationId`. Communication adds immutable `MessageId`, `EventId` and `ArtifactId`; team-local `EventSequence` and opaque `ProjectionCursor` remain separate ordering/projection values and never version an event identity. Governance adds `ApprovalChallengeId`, `ApprovalDecisionId`, `EffectId` and `EffectReceiptId`. Product and workflow state retain distinct `ConversationId`, `WorkflowId`, `PrincipalId` and `WorkspaceId` identities. Display names and paths are labels, never identifiers.

## State meanings

Binding status is `inactive`, `ready` or `suspended`. Attempt states are `admitted`, `running`, `settled`, `interrupted` and `uncertain`. UAR task states are `queued`, `ready`, `running`, `awaiting_input`, `awaiting_approval`, `reconciling`, `succeeded`, `failed` and `cancelled`. Instance states are `inactive`, `ready`, `active`, `suspended`, `draining` and `stopped`. Conversion disposition is `exact`, `translated`, `optional-unsupported` or `required-unsupported`; the last prevents activation.

Command acceptance (`accepted`, `rejected`, `conflict`) is separate from message delivery (`accepted`, `delivered`, `processed`, `rejected`), task completion and effect completion. Effect proposal, approval, admission, dispatch, known result and reconciliation are coordination milestones; C02 owns the normative effect state machine. An unknown outcome keeps its owning task `reconciling`; cancellation cannot rewrite a completed external effect.

`cancelRequested` is a durable flag, not terminal cancellation. AG-UI `RUN_FINISHED` settles one run segment, not the durable task or team. A processed message, accepted approval or finished stream is never used as a task/effect completion signal.

## Action semantics

- `register` commits an immutable catalog revision; `bind` commits a private deployment revision.
- `activate` reacquires current authority; `admit` atomically claims capacity, reserves budget and records dispatch intent.
- `assign` selects an eligible member; `claim` advances the ownership epoch; `delegate` creates a bounded child task.
- `message` commits to a durable inbox without activating an idle agent. `broadcast` freezes the authorized recipient set and records individual receipts.
- `cancel-request` records intent. `cancel-settle` is terminal only after owned effects are settled.
- `approve` records current authority for the exact effect; it does not execute the effect. `dispatch-effect` sends that exact admitted intent.
- `snapshot`, `replay` and `recover` preserve semantic identities, recheck disclosure, fence old attempts and reacquire authority.

Actions are qualified by their domain: catalog, binding, instance, task, message, approval/effect, observation or client control. Every mutation includes authenticated principal scope, `commandId`, target identity, expected revision for a mutable target and a canonical payload digest when authority depends on content. `stop`, `cancel`, `detach` and `drain` are distinct. Destructive purge is outside this profile.

## Invariants consumed by later changes

1. IDs are opaque and stable across display-name changes.
2. Definition, binding, instance, task and attempt IDs are never substituted for one another.
3. Every mutating command carries an idempotency identity and authenticated owner scope; mutable targets also carry an expected revision.
4. Current authority is checked at effect admission and after waits; portable definitions grant no permission.
5. Admission, delivery and processing receipts are not completion receipts.
6. Unknown external-effect outcomes are reconciled before retry unless the real connector contract proves retry safe.
