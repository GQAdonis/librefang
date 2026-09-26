# Official draft publication outline

Proposed version: 0.1.0-draft.1. Status: operator-approved publication outline; documentation execution authorized. Normative owner: universal-agent-runtime. Extend docs/agents/AGENTS_SPEC_RFC.md with an additive link and compatibility statement; do not replace legacy agent documents. Publish the approved package under docs/agents/collaboration/v0.1.0-draft.1/. Schemas remain under docs and outside all runtime generation paths.

## Document contents

1. README.md: status, version, scope, conformance classes, compatibility matrix, normative terminology and navigation. Distinguish design-approved, source-implemented, integration-conformant and installed-certified.
2. definitions.md: AgentDefinition, TeamDefinition, WorkflowDefinition, package/lock manifest, installed DeploymentBinding and private grant boundary. Stable IDs, bounded references, role cardinality, required/optional semantics, model/skill resolution and content digests. Portable templates never contain credentials or executable approvals.
3. runtime.md: identities, state transitions, activation admission, tasks/attempts, leases and epochs, committed inbox/outbox, joins, interruption/cancellation, stop/drain, replay, migration and recovery. Include failure/uncertain-effect state tables.
4. governance.md: Cedar action/resource mapping, restrictive delegation, current effect authorization, scoped context, redaction, budgets, operator overrides and private representation grants.
5. protocols/ag-ui.md: team/member addressing, base-client projection, negotiated subagent events, namespaced CUSTOM schemas, run segment boundaries, chunk attribution, event cursors, reconnect/snapshot reset and disclosure filtering.
6. protocols/a2ui.md: approved catalog negotiation, surface owner/revision mapping, concurrent surfaces, action targeting and stale-action behavior. Preserve UAR v0.9.1 profile.
7. protocols/a2a.md: pinned 1.0.1 contract/wire 1.0, card discovery per team, task-state table, artifacts, cancel, stream/reconnect and optional team extension. Separately document legacy endpoint behavior.
8. administration.md: catalog/install/bind/launch, team/task/member views, routing/model overrides, approve/cancel/reconcile, logs/budgets; Boss IPC, preferences and translations remain adapter responsibilities.
9. compatibility.md: field-by-field current IR→artifact→catalog→binding matrix, five v2 sections and complete SkillRef, legacy heading mapping, schema migration and safe rollback constraints, eight-harness import/export capability declarations.
10. implementation.md: phased ownership, inherited recommendation IDs, dependency checkpoint and integration acceptance below.

## Schemas and representative examples

JSON Schema 2020-12 draft files for the five document types, common immutable refs, runtime snapshot and custom event/action envelopes. A package contains content hashes; examples use real calculated digests, not placeholder runtime bindings. Secret/private-grant examples describe shape without values. Examples remain illustrative until schema agreement is checked.

Development example: coordinator, two independently scoped implementers, bounded design subteam, integration role admitted only after all implementation dependencies finish. Context forks choose only authorized artifacts/history; no copied authority.
Product/feedback example: intake → product triage → independent critic → operator-approved issue creation; exact issue payload, destination, actor and effect key remain bound. Product/design review can follow the created issue. No outbound issue is created by this docs phase.
Marketing example: research, positioning, copy and critic roles; publication excluded without its own authority. Design example: brand/logo, mobile and accessibility roles with artifact/surface ownership.
Executive extension: office/role definitions separate from a named person's private consent and organization-issued grants; support/simulation is not permission to impersonate or approve. No first-release implementation dependency.

## Protocol traces

Provide valid JSONL traces for interleaved worker output, nested-team lifecycle, ordinary AG-UI client fallback, two concurrent A2UI surfaces/actions, ordinary A2A client task/stream/cancel, restart during pending approval, disconnect/replay with retention gap, stale task epoch, budget exhaustion, duplicated message and unknown issue-create outcome. Each trace states supported protocol versions, event IDs and expected authoritative transitions.

## Approval and validation

Operator may modify this outline and architecture-proposal.md before publication. After approval, write the entire package, then one document validation boundary checks all schemas/examples/traces, internal references, ownership and requirement coverage. It does not run application code or certify runtime conformance. Reflection/archive follows actual publication and parent handoff; previous-release acceptance can remain separately pending without being misrepresented.
