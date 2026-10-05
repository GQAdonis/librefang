# C10 measured substrate comparison procedure draft

Status: **unapproved procedure draft**. This document names a comparison candidate but does not select a substrate, admit comparison implementation, begin C10, run a benchmark, relax the existing architecture gate, or turn proposed targets into measured claims. A pending human answer is not approval.

Preparation authority and the unresolved gate are recorded in the [shared-design dependency and decision map](./c10-shared-design-dependency-decision-map.md). Existing UAR reuse claims come from the committed [kernel substrate source map](../../../.kbd-orchestrator/phases/agent-fabric-convergence/c10/c10-existing-kernel-substrate-proposal.md); the REST surface remains the unimplemented [workflow administration proposal](../../../.kbd-orchestrator/phases/agent-fabric-convergence/c10/c10-workflow-admin-contract-proposal.md).

## Comparison question

For the bounded `classify → draft → operator decision` workflow, compare:

- **Candidate A — existing UAR kernel:** additive workflow records over the inspected UAR `c906c24fb8114f1a3b55dc83a12feec542ae8b8d` team executor, collaboration catalog CAS, attempts, immutable attempt artifacts, execution fencing and recovery. Settlement, decision commands and startup recovery trigger advancement; no separate scheduler or model loop is added.
- **Candidate B — Restate:** Restate Server **1.7.12** with `restate-sdk` Rust **0.12.1**, self-hosted as one additional single-node server with a persistent volume, plus one Rust adapter service. The official Restate release page listed 1.7.12 as the latest server release on 2026-10-02 and publishes `docker.restate.dev/restatedev/restate:1.7.12`; the resolved image digest must be frozen before measurement. The Rust SDK documentation states compatibility for Server 1.7 with SDK 0.11–0.12 and identifies 0.12.1 as the documented crate version. [Restate 1.7.12 release](https://github.com/restatedev/restate/releases/tag/v1.7.12)

Both candidates use the same UAR team executor for classify and draft, the same owner/workspace/team binding, the same provider/model, input fixtures, output schemas, reservations and UAR artifact authority. Neither candidate performs a connector write, creates an issue, communicates externally or admits implementation.

## Current source and primary-document facts

| Concern | Candidate A: existing UAR kernel | Candidate B: Restate 1.7.12 / Rust SDK 0.12.1 |
| --- | --- | --- |
| Durable state | Existing `CollaborationCatalogState` and generation CAS have memory, SurrealDB and Postgres implementations; only a qualified persistent profile can claim restart recovery. | A self-hosted Restate server is one binary for single- or multi-node operation. A single node requires a persistent volume. [Server overview](https://docs.restate.dev/server/overview) [Docker deployment](https://docs.restate.dev/server/deploy/docker) |
| Workflow identity | Proposed stable workflow-run and step-activation keys reuse UAR command receipts and CAS, but do not exist yet. | A Restate workflow has a unique key used to deduplicate workflow execution. [Workflow invocation](https://docs.restate.dev/llms-full.txt) |
| Recovery | Existing attempt recovery joins the original producer and refuses new admission while effects remain unresolved; workflow cursor and operator-decision recovery are proposed additions. | Restate persists completed steps in its journal and replays after process failure to resume. [Durable workflows](https://docs.restate.dev/tour/workflows) |
| Operator wait | Current UAR live tool approval is not restart-durable; the proposal adds an artifact-bound durable operator wait and immutable decision receipt. | Restate signals, awakeables and workflow promises survive retries and process restarts; workflow promises are keyed to a workflow and name. [Signals and external events](https://docs.restate.dev/llms-full.txt) |
| Idempotency | Stable command receipts, deterministic attempt artifact identity and CAS are reusable; workflow activation/step/decision keys remain proposed. | The Rust SDK exposes workflow clients with idempotency keys; service options also expose idempotency-retention and retry policies. [Rust context API](https://github.com/restatedev/sdk-rust/blob/main/_autodocs/api-reference/context.md) [Rust endpoint API](https://github.com/restatedev/sdk-rust/blob/main/_autodocs/api-reference/endpoint.md) |
| Rust/version status | UAR source is already Rust and inspected at the pinned revision. | The official SDK index identifies `restate-sdk` 0.12.1, Rust edition 2024, MSRV 1.90.0, and Server 1.6+ compatibility; the README documents Server 1.7 compatibility and warns that the SDK is in active development. [Rust SDK index](https://github.com/restatedev/sdk-rust/blob/main/_autodocs/index.md) [Compatibility table](https://github.com/restatedev/sdk-rust/blob/main/README.md) |
| Scheduler ownership | No independent workflow scheduler is proposed; UAR CAS progression follows settlement, an operator command, or startup recovery. | Restate owns journal replay, durable waiting, retry timing and workflow resumption. This is an additional scheduler/runtime process. It is compatible only if Restate is the **sole workflow advancement owner** for Candidate B and UAR remains the sole model/effect executor. Running a UAR workflow controller concurrently for the same run would violate the single-owner contract. |
| Deployment surface | Adds records and routes inside the existing UAR service and persistence boundary. | Adds one Restate server, one persistent volume and one adapter service. A three-node cluster and object-store snapshots are documented but excluded from this bounded comparison. [Cluster guide](https://docs.restate.dev/guides/cluster) |

Documentation was retrieved through Context7 from official Restate documentation and the official `restatedev/sdk-rust` repository on 2026-10-02. No external runtime was installed or invoked.

## Proposed topology under comparison

```text
Candidate A
operator/API -> UAR workflow CAS records -> existing UAR team executor
                    |                              |
                    +---- UAR artifact/effect authority

Candidate B
operator/API -> Restate 1.7.12 journal/scheduler -> Rust adapter -> existing UAR team executor
                       |                                  |
                       +---- workflow cursor/wait         +---- UAR artifact/effect authority
```

For Candidate B, Restate may retry or resume only an adapter command carrying stable UAR command, run, step and artifact identities. It must not execute a model turn, store a competing canonical artifact, infer an uncertain effect as retryable, or advance a UAR-owned workflow cursor. The adapter must return the original UAR receipt on exact replay and surface a conflict for changed canonical request bytes.

## Fixed completed-workflow workload

Run this procedure only after the operator approves the procedure and comparison-only implementation boundary.

- Two isolated owner/workspace/team scopes.
- Ten workflow runs per team, twenty total.
- One classify attempt and one draft attempt per run, both through the existing UAR executor; no more than the existing four active team-execution permits.
- One exact validated artifact per attempt, with a canonical digest recorded by the comparison adapter.
- One durable operator wait bound to the draft artifact and one authenticated decision per run: five accept, three reject, one revise and one cancel per team. For this bounded comparison contract, `revise` is an artifact-bound terminal decision receipt; it records the request but does not admit another activation or execute another draft. The exact attempt and artifact counts therefore remain fixed.
- `effect: none`, a closed tool set and no connector credentials.
- Identical pinned definitions, bindings, provider/model, fixtures, reservations and host resources for both candidates.
- Candidate A uses one approved persistent UAR backend. Candidate B uses that same UAR backend plus one single-node Restate persistent volume. Both runs start from clean comparison namespaces while preserving immutable receipts.

## Measurement sequence

1. **Baseline completion:** complete all twenty runs without injected failure. Record exact source/binary/container identities, host resources, wall time, attempt/artifact/decision counts and per-transition latency.
2. **Operator-wait restart:** after all drafts commit, stop the candidate's workflow advancement runtime, preserve storage, restart it, and submit the exact decisions. The waits must retain exact run, step, artifact digest, allowed decisions and authority revision.
3. **Unresolved-producer restart:** stop advancement while one draft attempt is live or unresolved. Restart and reconcile the original attempt. No replacement attempt may be admitted until the original producer/effect disposition permits it.
4. **Replay:** submit every activation and decision command three additional times with identical bytes. Submit one conflicting replay for each command ID with a changed artifact digest or decision. Record original-receipt returns and explicit conflicts.
5. **Offline control-plane check:** after draft artifacts and waits are durable, make the external model/provider unavailable and exercise local status, restart recovery and operator decision. This tests workflow-control availability only; it does not claim offline model execution.
6. **Bounded capacity pass:** run both teams concurrently at the fixed twenty-run load. Record active attempts, admission queue depth, CAS/revision conflicts, p50/p95/p99 transition latency, completed runs per minute, CPU time, peak RSS, disk growth, bytes written and recovery time.
7. **Forensic reconciliation:** compare durable UAR task/attempt/artifact/effect records with the candidate workflow history. Every workflow transition must trace to one authoritative UAR receipt; unknown or unresolved states stay visible.

## Falsifiable correctness and recovery gates

These proposed gates require human approval before execution:

| Gate | Pass condition |
| --- | --- |
| Exact execution count | Twenty runs produce exactly twenty classify attempts, twenty draft attempts, forty validated artifacts and twenty decision receipts; no duplicate model attempt or artifact appears after replay or restart. |
| Wait durability | All twenty waits survive the workflow-runtime restart with the same run/step identity and exact draft artifact ID/digest. |
| Recovery ownership | A live or unresolved original attempt never causes a replacement admission. After the runtime is ready, persisted waits become readable within the proposed 30-second target. |
| Decision idempotency | Each exact decision replay returns the original receipt; each conflicting command-ID reuse is rejected and leaves run/wait state unchanged. |
| Artifact/effect authority | Candidate history and UAR records reconcile one-to-one. Candidate B's Restate journal never replaces UAR artifact or effect truth. |
| Local control latency | Status and operator-decision commands complete within the proposed two-second target at the fixed load, excluding intentionally suspended model work. |
| Isolation | No run, wait, artifact, decision, authority or cursor crosses the two owner/workspace/team scopes. |
| Bounded execution | UAR never exceeds four active team attempts; cancellation or rejection admits no dependent task after terminal evidence. |

Failure of a gate is comparison evidence. Preserve the failed receipt and measurements, fix the observed failure within the already authorized comparison implementation, and repeat only the affected scenario for the affected candidate from a clean namespace. Routine fixes for an observed failure do not require another approval. Repeat both candidates only when a shared input or procedure changed and therefore invalidated the comparison. Architectural changes, procedure-scope changes and new workload remain subject to human approval.

## Capacity and operating-cost record

The comparison must publish raw measurements for both candidates without collapsing them into a single score:

- transition latency by activate, classify-settle, draft-settle, wait-create, decide, status and recover;
- total and peak throughput at the fixed load;
- UAR catalog CAS attempts/conflicts and, for Restate, invocation retries/suspensions/resumptions;
- CPU time, peak RSS, persistent bytes and write growth for UAR, its database, Restate and the adapter separately;
- startup-to-ready and restart-to-wait-readable time;
- operator actions and service/process count;
- projected monthly infrastructure cost from the measured topology, with pricing source/date kept separate from measured resource use.

The twenty-run workload establishes a small repeatable comparison, not a production capacity claim. Broader scale, clustered Restate, multi-host failure and mobile embedding remain unmeasured unless the operator approves another workload.

## Minimum human architecture decisions

Before any comparison implementation or run:

1. Approve this procedure, fixed workload, proposed 30-second recovery and two-second local-control targets, and the evidence schema.
2. Authorize the minimum comparison-only implementation needed for both candidates and define its product repositories, file ownership and disposal/retention boundary. This authorization does not admit C10 production implementation.
3. Approve Candidate A's persistent backend and Candidate B's Restate Server 1.7.12 / Rust SDK 0.12.1 single-node topology, including the exact server image digest, extra persistent volume and adapter process.
4. Decide whether Restate may be the sole workflow advancement owner for Candidate B while UAR remains the sole model, artifact and effect authority. If not, Candidate B is incompatible with the fixed ownership boundary and should be recorded as such rather than silently adding a second scheduler.
5. Approve operator identity/authority, decision semantics, digest placement, offline-control scope and whether accounting-unknown model success may advance while its reservation remains charged.

After both immutable comparison receipts exist, the human architecture gate must select a substrate or request further evidence. Source reuse, lower process count, Restate features, a passing C08 operation, or a pending answer cannot make that decision automatically.

## Boundary retained

The C10 OpenSpec design still requires a measured comparison before engine selection and implementation against a selected adapter contract. C10.1, C10.2 and C10.3 remain pending. No product code, dependency, service, phase, KBD/Cadence state, benchmark result, package, installer or architecture approval is created by this draft.
