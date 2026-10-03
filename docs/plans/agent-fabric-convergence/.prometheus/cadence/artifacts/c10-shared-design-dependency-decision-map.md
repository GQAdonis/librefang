# C10 shared UAR design dependency and decision map

Status: preparation map only. This artifact does not approve an architecture, select or reject a workflow engine, admit implementation, begin C10, change C08 qualification, or treat a pending human answer as approval.

## Governing boundary

Canonical KBD decision `shared-uar-design-independent-of-boss-packaging`, revision 482, permits source-backed shared UAR architecture preparation to continue independently of The Boss packaging. It does not remove the approved C10 substrate-selection gate, runtime qualification, product-authority planning, or human architecture approval. [Canonical decision](./c08-shared-design-canonical-decision.json)

Current C10 authority remains:

- [OpenSpec design](../../../openspec/changes/afc-c10-feedback-workflow-and-governed-connector-effects/design.md), which requires workload requirements and a measured substrate comparison before engine selection and implementation against a selected adapter contract.
- [OpenSpec tasks](../../../openspec/changes/afc-c10-feedback-workflow-and-governed-connector-effects/tasks.md), where C10.1, C10.2 and C10.3 remain pending initiative groups rather than dispatch-ready product tasks.
- [Existing-kernel substrate proposal](../../../.kbd-orchestrator/phases/agent-fabric-convergence/c10/c10-existing-kernel-substrate-proposal.md), [lead architecture proposal](../../../.kbd-orchestrator/phases/agent-fabric-convergence/c10/c10-lead-architecture-proposal.md), and [workflow administration contract proposal](../../../.kbd-orchestrator/phases/agent-fabric-convergence/c10/c10-workflow-admin-contract-proposal.md), all explicitly proposals at UAR source `c906c24fb8114f1a3b55dc83a12feec542ae8b8d`.

## Work that can continue now

| Preparation work | Current basis | Output boundary |
| --- | --- | --- |
| Maintain the UAR kernel source map for durable teams, CAS, attempts, artifacts, waits, recovery and execution ownership. | Inspected `c906c24` contracts. | Source evidence only; revalidate if the source baseline changes. |
| Refine the bounded `classify → draft → operator decision` candidate as a comparison baseline. | Existing team executor and artifact authority; proposed workflow cursor and operator wait. | Candidate contract only. Acceptance records a decision and performs no connector write or implementation admission. |
| Refine proposed durable records and REST administration shapes. | The unimplemented admin proposal maps run, step, artifact, wait, decision, cancel and recover semantics to current owner/workspace-scoped administration. | Descriptive names and wire shapes remain unapproved and unimplemented. |
| Trace fixed safety and ownership invariants. | One UAR actor-thread model executor, UAR artifact/effect authority, CAS replay protection, exact operator authority, no blind retry of unresolved effects. | No second model loop, polling daemon, concurrent workflow advancement owner or engine-owned artifact truth may be introduced by preparation. |
| Define a falsifiable workload and comparison protocol. | The source map identifies unmeasured CAS contention, restart, wait age, storage growth, latency, throughput and cost. | Draft targets, profiles, scenarios and evidence format for operator review; do not report targets as measured capacity. |
| Research named external-engine candidates from current primary documentation. | The approved design keeps the external-engine path open. | Record candidate version, embedding/topology, persistence, offline/mobile profile and operating assumptions without selecting one. |
| Keep Boss consumption and packaging interfaces mapped. | The Boss is a future trusted administration consumer; packaging is not architecture authority. | Planning only; no installer, IPC/UI or product task admission follows from revision 482. |

This preparation can proceed while the C08 feature operation is repaired and rerun. C08 runtime qualification remains a separate evidence boundary and cannot be inferred from C10 documents.

## Decisions and evidence still required before selection

1. **Approve the comparison procedure.** The lead proposal suggests using current source/prior production evidence now and measuring the completed bounded workflow at its delivery boundary. That is a proposed change to the original pre-selection measurement gate. The pending human answer is not approval, so the original gate remains in force.
2. **Set comparison targets and supported profiles.** Define capacity, latency, restart, durable-wait age, storage growth, operating cost, embedding, mobile and offline requirements before scoring either substrate.
3. **Name the external comparator.** Pin an engine, version and deployment topology from current primary documentation. An unnamed generic engine cannot supply measured evidence.
4. **Run the measured comparison.** Compare existing-kernel and named-engine candidates on recovery, ownership fencing, embedding/offline operation, cross-system idempotency and effect reconciliation, scheduler authority, throughput and cost. Separate current-source facts from measurements and projections.
5. **Resolve operator architecture choices.** Approve the interpreter/mapping vocabulary, trusted instruction provenance, enforced no-effect policy, run/wait state vocabulary, API/resource names, artifact digest placement, operator authority, accept/reject/revise/cancel semantics, expiry policy, persistent storage profiles and bounded targets.
6. **Select one substrate and one advancement owner.** A recommendation to reuse the existing kernel is a baseline for comparison, not selection. An external engine remains open; if selected, it must dispatch into the same UAR executor and cannot become a second model loop or concurrent artifact/effect authority.

## Dependencies before implementation admission

Implementation remains blocked until the measured comparison and architecture approval above are recorded. C10 also retains its declared C05, C07, C08 and C09 dependencies and D-UAR-P1, D-MINI, D-GATE and D-MEMORY checkpoints. After approval, each affected product must create or link its own repository-scoped OpenSpec/KBD change with exact file ownership, current-baseline reconciliation and acceptance links before source work begins.

The first bounded implementation, if later approved, still stops at a durable operator decision. Connector writes, GitHub issue creation, customer communication and issue-to-implementation authorization require their later governed-effect contracts and acceptance evidence. No human answer, proposal wording, C08 package result or existing team-kernel capability silently grants that admission.

## Current decision state

| Question | State |
| --- | --- |
| May shared UAR source-backed design preparation continue independently of Boss packaging? | **Yes**, under canonical KBD revision 482. |
| Is the existing UAR kernel the approved C10 workflow substrate? | **No; proposed comparison baseline only.** |
| Has an external engine been selected or rejected? | **No.** |
| Has the measurement-procedure change been approved? | **No; human answer remains pending.** |
| Are C10 routes, records, scheduler behavior or product tasks implemented/admitted? | **No.** |
| Does the current C08 operation determine the C10 architecture? | **No; qualification and design remain separate gates.** |
