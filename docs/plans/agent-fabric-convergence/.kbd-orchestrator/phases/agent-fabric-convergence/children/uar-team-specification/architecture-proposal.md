# Architecture proposal — UAR collaboration profile 0.1.0-draft.1

Status: PROPOSED; operator architecture approval required before official draft publication. None of the endpoints or new record types below is advertised as implemented.

## 1. Ownership and execution

UAR adds a collaboration service over its existing catalog, persistence, admission, run kernel and event adapters. It owns TeamInstance, AgentInstance, TeamTask, TaskAttempt, InboxMessage, TaskLease and TeamEvent records. An instance is durable and can be idle with no model loop in memory. An activation admits a bounded turn through the existing kernel. The Boss is a client and trusted host-tool bridge, not a scheduler. A2A is another client of the same task service.

TeamTask may contain a bounded DAG of child tasks. A nested team is a separately identified TeamInstance bound to a parent task, with its own membership, inherited ceilings and shared root budget ledger. Definition references form an acyclic graph; recursive definitions are rejected before activation. Runtime children retain their kernel lineage. Logical team/task identity never replaces authenticated owner/workspace/run identity.

Each workflow object has one owner. A BossFang workflow delegates a UAR task and retains its own scheduling outside that task. No mirrored independently mutable task board is created. Fabric/memory/Forge remain transport/context/business owners.

## 2. Document family and registry

Proposed profile ID: urn:prometheus:uar:collaboration:0.1.0-draft.1. It is not an externally registered standard. UAR is the canonical schema authority. Five documents: AgentDefinition, TeamDefinition, WorkflowDefinition, DeploymentBinding, and a package manifest. Private RepresentationGrant is an authority-plane extension, not distributed content.

Common fields: schema/profile version, kind, stable definition ID, semantic version, content digest, provenance, required capabilities and optional namespaced extensions. Canonical JSON is the machine form; Markdown agent authoring and YAML/JSON companion documents normalize into it. Definition version, schema version and runtime revision are distinct.

AgentDefinition retains legacy sections and adds collaboration requests: permitted child definitions, role/when-to-use, input/output contracts, context-sharing selections, skill version/required/config, model capability requirements and requested limits. TeamDefinition pins member agents or subteams, role cardinalities, coordinator role, communication paths, task acceptance policy, routing policy, aggregate budgets and nested limits. WorkflowDefinition describes bounded tasks/dependencies/joins and retry/effect classifications. No embedded executable expression language is introduced.

DeploymentBinding resolves a definition package to owner, workspace, UAR instance, model/provider aliases, skill hashes, storage, credentials by private reference and effective policy revisions. It is installed state; export produces a redacted template requiring a fresh binding. A content signature authenticates origin, never permission.

Registration preserves an immutable canonical descriptor alongside any legacy runtime projection. Catalog revision/CAS replacement is reused. Existing IDs remain valid. Legacy conversion reports exact/preserved, translated, optional-unsupported and required-unsupported fields. Missing required semantics prevent activation. Skill metadata and the five v2 IR sections must survive compilation, registration, lookup and runtime binding.

## 3. Durable task, inbox and activation semantics

Task states: queued, ready, running, awaiting_input, awaiting_approval, reconciling, succeeded, failed, cancelled. Cancellation requested is a separate flag until active execution/effects settle. Terminal state is monotonic; retry creates a new attempt under the same task contract. Team/member lifecycle: inactive, ready, active, suspended, draining, stopped. Removing a member stops new assignments; its active attempt is explicitly drained or cancelled.

A storage transaction atomically claims a ready task, increments its ownership epoch, reserves budget and writes the dispatch intent/outbox event. One mutating turn per AgentInstance. The selected UAR persistence backend must provide compare-and-swap and transaction semantics for that path; unsupported durable storage cannot advertise this profile. Do not make surreal-memory the task database.

Messages carry host-authenticated sender/recipient, message ID, team/task correlation, recipient sequence, trigger mode, content projection and receipt status. Enqueue is committed before acknowledging acceptance. Message-only delivery never starts a turn; task delivery schedules a fresh activation. Repeated message/command IDs return the existing receipt. Broadcast captures the authorized recipient set and individual receipts; membership changes do not widen an old broadcast.

Recovery loads committed task/inbox/binding revisions, reconciles in-flight attempts, and invalidates old live-run admission tokens. Fresh execution rechecks current policy and grants. Durable intent to obtain approval may survive; an obsolete executable approval does not. Unknown tool/connector effects are reconciled using their original identity, never silently replayed. A task is not called cancelled merely because its UI stream closed.

Coordinator waits release turn capacity. Ready tasks are selected round-robin across owners, then teams, FIFO within a priority class. Human control/cancel remains responsive outside model execution slots. Model-generated routing recommendations cannot acquire leases directly.

## 4. Routing, governance and scaling

Eligibility filtering enforces current owner/workspace, capability, model support, tool/skill availability, context access, policy and budget. Assignment then honors explicit operator selection, declared role preference, available capacity and configured model cost class, with stable-ID tie breaking. Record candidates excluded with safe reasons and the selected model/binding revision. Do not use an LLM classifier in the initial scheduler's mandatory path.

Defaults proposed for local v1: four concurrent turns per team, eight globally, sixteen members per root team graph, nested team depth three. These are host ceilings; children may only narrow them. Existing kernel per-run limits remain independently enforced. Queues are bounded at 1,000 pending tasks per team; overload returns an actionable admission result. Only authorized admin changes ceilings. No unlimited agent spawning claim.

Capacity target for final integration on an 8-core/16-GiB host: 32 idle durable teams, 8 concurrent real-provider turns, 1,000 queued tasks, and a 100,000-event replay dataset. Control API p95 under 250 ms locally; committed status visible p95 under 500 ms; reconnect of 1,000 retained events under 2 seconds; cancellation admitted under 250 ms; recovery of 32 idle teams within 5 seconds. Measure provider latency separately. These are proposed acceptance targets, not measured claims. Record machine, backend, payload size and model latency; adjust only by an explicit performance decision, not silently.

Cedar checks cover definition administration, team activation/membership, task assignment, message delivery, context access and real effects. Reuse exact tool approval identities and restrictive host/runtime composition. A coordinator cannot approve on a human's behalf. Role text and A2UI actions are untrusted input. Secret values and private reasoning never enter public event projections.

## 5. API and protocol projections

Proposed additive REST resources: /api/v1/team-definitions; /api/v1/team-instances; instance members, tasks, messages, events and diagnostics subresources. Task commands include submit, assign, cancel, reconcile; instance commands include activate, suspend, drain and stop. Mutations carry command identity and expected revision where state replacement is involved. Runtime authentication and ownership are applied before resolving resource identities. Existing single-agent routes remain compatible.

AG-UI team invocation: POST /api/v1/team-instances/{id}/ag-ui. Each submitted user work request has a stable TeamTask and one current AG-UI run segment. Follow-up/resume uses a new admitted run segment linked to the same task. A long-lived team is not one never-ending RUN_STARTED. The background instance event endpoint is separately cursor-addressable; do not send new live updates on an already finished run.

Standard text/tool/run events remain standard. Existing SUBAGENT_STARTED/FINISHED/ERROR mapping is reused only for clients declaring the supported subagent profile; base clients receive coordinator output and ordinary run state. Additional CUSTOM names use uar.team.v1.* for membership, task changes, routing, message receipts, budget and recovery. Each value has event ID, owner-safe team/task/member/attempt IDs, sequence, causation and schema version. The server derives identity fields; input cannot spoof them.

Text chunks retain one message ID and per-message order; streams from different members interleave with explicit attribution. Structured progress, artifact references and surface messages have separately tagged payload schemas rather than being concatenated into text. Large artifacts are references. Replay preserves event identity and reauthorizes disclosure; retention gaps return a snapshot/cursor reset, not fabricated history. Slow consumers use bounded buffering and reconnect recovery. A final run event is emitted only after that segment's child output settles.

A2UI uses existing uar.a2ui/1, v0.9.1 and its approved component catalog. Team/member surfaces have server-owned globally unambiguous IDs and an ownership mapping to team/task/member/run/catalog revision. Server-side action lookup revalidates that mapping, expected surface revision and current authority; client-supplied routing fields are hints, not authority. Surface updates/deletion preserve existing profile payloads, with team attribution in the negotiated envelope. Stale actions produce visible conflict results. No v1.0 actionResponse semantics are implied.

A2A team endpoint is a new versioned adapter targeting released v1.0.1 with wire version 1.0. Its team AgentCard advertises a supported interface and optionally the UAR team extension. Standard send/stream/get/cancel/subscribe map onto TeamTask, TaskAttempt and artifacts. The endpoint registry provides the team card URL; root discovery may advertise the registry/default agent without claiming every team owns the host's well-known path. Legacy RC-labelled routes remain separately classified. Unsupported protocol versions or required extensions are rejected explicitly. Enhanced clients can observe task structure; ordinary clients see an opaque team agent. No remote team execution is required by accepting remote clients.

Internal states map to the exact pinned A2A states: queued/ready to submitted, running/reconciling to working with safe status detail, awaiting_input/awaiting_approval to input-required (approval remains on the trusted host path), success/failure/cancel to matching terminal states. Authentication-required is only an authentication challenge. A status message is never approval evidence. Unknown effect outcome cannot be mapped to successful completion.

## 6. Boss and skill experience

Dedicated Teams administration within UAR settings covers catalog versions, bindings, members/subteams, role/model choices, routing rationale, queue, budgets, approvals, logs and recovery. Conversations can target a team or an authorized member; the view makes that choice visible. Task board and activity panels are projections of durable UAR state. Preserve IPC/main-process trust boundaries, generated preference schemas and every existing locale. Existing single-agent conversations remain usable.

Full pack owns authored team procedures/templates; mini receives the portable subset and promised byte-identical runtime assets. Both import/export the UAR profile with explicit loss reports; neither executes UAR tasks from its local coordination ledger. Initial templates are development and product-feedback; marketing/design are specification examples. Executive roles and named-human representation stay extensions requiring private grants.

## 7. Delivery, compatibility and approval

First milestone includes both complete local stories and customer-platform acceptance. No prerequisite on full BossFang delegation, Fabric routing, Forge replication, mobile sync, executive twins or federation. Preserve recommendation IDs and later owners in dependency-map.json.

One document validation boundary follows the complete artifact set. Runtime phases later implement all production behavior before their single integration gate. The development template itself encodes this rule: integration role starts after all implementation dependencies are done, except an explicitly approved independently shipped phase.

Approval requested: this architecture, versioned protocol split, lifecycle/recovery semantics, proposed limits/performance targets, and first-release decomposition. Approval freezes a draft contract; it does not certify runtime behavior or authorize implementation in this documentation child.
