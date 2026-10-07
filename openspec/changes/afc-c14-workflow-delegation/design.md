# Design

## Context

The existing workflow engine resolves a StepAgent and invokes a sender with AgentId and rendered prompt. The API background driver supplies native send_message_with_session_mode. Existing `/api/uar/delegations` admission derives the authenticated principal, persists stable task/admission correlation, and uses the app-owned UarRunClient. Its controls retain the original service connection.

## Goals / Non-Goals

Goals: integrate that existing sender seam with typed UAR targets; retain native execution; expose workflow/run/step/delegation identities, actual output and existing host-issued approval events; forward cancellation through existing original-run authority.

Non-goals: another execution loop, budget/effect settlement, definition catalog, inline diagnostic substitute, UAR API changes, remaining-budget promises, federation, supervision changes or replacement of native workflows.

## Decisions

HTTP step target is mutually exclusive `uar_bound: {targetBindingId, workspaceId, definition:{id,version,digest}, run:{...native CreateRun fields}}`. Version is a string. Rendered prompt supplies `run.input`; binding admission supplies deployment_binding_id. Caller principal and private runtime credentials are never authored in a workflow. Existing native selectors remain unchanged.

The StepAgent UAR variant retains the step key. The existing engine resolves a per-step dispatch handle; its sender invokes existing admission with a stable workflow-run/step task identity. Retries reconcile that same admission rather than creating another remote run. Existing dependencies and modes remain engine-owned; UAR executes the full delegated step and owns its effects, approvals and spend.

GET ordinary workflow run adds `uar_delegations: [{step_name,delegation}]`. The existing camelCase delegation projection adds optional `workflow:{workflowId,workflowRunId,stepName}`, `output` and `pendingApproval` (an existing UarRunEvent). Output comes from `agui.message.delta` data.delta.text; pending approval is the host-issued `agui.tool_call.approval_required` event while executionState is input_required. Existing `/events`, `/approve` and `/cancel` endpoints remain the control boundary. Ordinary cancellation forwards to each admitted UAR task before local cancellation; unresolved cleanup stays visible.

The API sender waits for authoritative terminal receipt and drains events. Completion events alone cannot finish the step. Correlation and event-derived display state are persisted in the existing projection store, preserving process-ephemeral/durable retention and recovery refusals. Native-only synchronous behavior stays unchanged; UAR-bound requests use the background driver even for timed/synchronous waits.

## Risks / Trade-offs

UAR full-harness retention remains process-ephemeral → expose existing epoch/recovery/retention diagnostics; never replay a completed/unresolved admission on restart.

Definition identity is authored alongside an admitted binding → retain existing native admission checks and exact immutable identity; no new runtime authority or catalog is invented.

An engine timeout drops a delegated observation future → the background driver settles any nonterminal delegated steps through existing cancellation before returning failure; cleanup uncertainty remains in the projection.

## Migration Plan

Additive serialized variants and optional projection fields preserve existing records. Root combines dashboard and native sources, freezes exact bytes, builds once, then operates ordinary workflow approval/effect and cancellation through the packaged dashboard. No checks, tests, builds or feature operations during implementation. Native Windows and publication acceptance remain separately pending. Rollback reverts the increment without changing existing UAR tasks or native workflow records.
