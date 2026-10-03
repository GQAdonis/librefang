# Library evaluation: Delivery Cadence pipeline

Analyzed 2026-09-30. Stack specified: Node 22+ and portable `.mjs`; no new daemon or scheduler. This is a build-versus-adopt decision, not implementation approval.

## Decision

**Adapt the existing Cadence engine and existing The Boss release workflow. Add no dependency for this child.** The observed gaps concern candidate identity, short state transactions, authorized work-ahead and publication obligations. Existing queue/lock libraries cover primitives but cannot supply those project-specific contracts.

| Candidate | Verdict | Fit and remaining gap |
| --- | --- | --- |
| cand-001: existing Cadence | Adapt | Reuse events, snapshots, evidence gates, hooks and full/mini distribution; extend attempt and obligation ownership. |
| cand-002: existing Boss release workflow | Adapt | Reuse native platform jobs and incremental publication; reconcile them into durable candidate records. |
| cand-003: p-queue | Reference | Controls promise concurrency within one process; not the cross-process durable coordinator needed here. |
| cand-004: proper-lockfile | Reference | Supplies filesystem locking; cannot establish stopped build processes or fence external effects. |
| cand-005: BullMQ | Reject | Durable queue benefits require external backend/worker infrastructure outside this child's constraints. |

No coverage percentages are reported: there is no measured denominator or implementation to score.

## Evidence and version health

The [existing storage implementation](https://github.com/Prometheus-AGS/prometheus-skill-system/blob/1ddcc8b21b05f26aa89aa5e19776c86e5b854c96/skills/process/delivery-cadence/scripts/lib/storage.mjs) was inspected locally at the assessment's linked full-pack baseline; it already records exclusive ownership, sequenced events and recoverable state. [The assessment source audit](source-audit.md) identifies the surrounding engine gaps. This is the smallest viable extension, not evidence that simply deleting the publication guard is safe.

[p-queue](https://github.com/sindresorhus/p-queue/blob/main/readme.md) is ESM and offers concurrency/backpressure controls. Registry evidence reports stable **9.3.3**, MIT, Node >=20, released July 22, 2026. This fits the runtime floor but does not solve restart reconciliation. [Registry metadata](https://registry.npmjs.org/p-queue/9.3.3)

[proper-lockfile 4.1.2](https://github.com/moxystudio/node-proper-lockfile/blob/v4.1.2/README.md) renews filesystem lock timestamps and detects some compromises. Different expiry settings and manual lock removal are documented limitations. Its latest registry release is January 25, 2021; no Node engine requirement is present in the inspected metadata. Age alone does not prove incompatibility. Context7's code/default descriptions differ from the README, so no numeric timeout is proposed. [Registry metadata](https://registry.npmjs.org/proper-lockfile/4.1.2)

[BullMQ 6.3.10](https://github.com/taskforcesh/bullmq/blob/v6.3.10/README.md) documents persistent Redis queue/worker operation. Its repository description also mentions PostgreSQL, but that alternative was not investigated because an additional backend already fails the architecture constraint. Registry metadata reports MIT, Node >=14.17.0 and a September 29, 2026 release. No claim is made that Redis is its only possible backend. [Registry metadata](https://registry.npmjs.org/bullmq/6.3.10)

The three repository searches returned 7, 21 and 388 open issues respectively. These are dated snapshots, not normalized quality scores. Download counts were not queried. Published versions are research facts, not requested dependency upgrades.

## Existing workflow reuse has limits

The clean local [Boss release workflow](https://github.com/Prometheus-AGS/the-boss/blob/e2ae2ce21245030293c0bea96ed02ae853b820a7/.github/workflows/the-boss-release.yml) at `e2ae2ce` already has platform matrix builds, per-platform manifests, callbacks and a serialized metadata/site publisher. Preserve per-platform incremental publication rather than replacing it with an all-platform barrier.

Its publication concurrency group uses `cancel-in-progress: false` without `queue: max`. GitHub's default still replaces an older pending run; disabling cancellation of running work does not retain every callback. Reconcile immutable platform manifests and exact execution references independently of callback count. Queue entry order also does not establish candidate order. [Concurrency documentation](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency)

The coordinating analysis identified another existing contract: the publisher resets its isolated checkout to the release branch and checks its application version against the expected release. Protect version-changing promotion on that branch while publication is owed; independent implementation may continue in separate worktrees/PRs. Keep one full release active at a time. This is a bounded compatibility choice, not a claim that the workflow already accepts arbitrary source revisions. Source: [publication coordinator](https://github.com/Prometheus-AGS/the-boss/blob/e2ae2ce21245030293c0bea96ed02ae853b820a7/scripts/coordinate-release-publication.cjs), inspected by the coordinating analysis.

GitHub artifact immutability and transfer help identify bytes, but automatic digest mismatch reporting is a **warning**. Candidate acceptance must enforce its required identity checks rather than equate artifact download with a passing gate. Hosted platform jobs also cannot replace the required local Mac package and actual new-function operation. [Artifact documentation](https://docs.github.com/en/actions/tutorials/store-and-share-data)

## Domain work still required

The machine-readable [candidate set](../library-candidates.json) records six precise build requirements:

- Immutable candidate manifests and durable KBD-authorized work-ahead.
- Short claim/execute/reconcile transactions with owned local/platform attempts.
- Candidate-bound obligations, missed-callback reconciliation and monotonic per-platform publication.
- Adoption of existing successful execution receipts without administrative rebuilds.
- Scheduled meaningful-release opportunities combined with the retained two-successful-delivery obligation.
- Compatible migration, identical shared full/mini behavior and honest overlap/backlog reporting.

Retain one active iteration engine. A resource lock controls who may execute; a result ownership/revision check controls who may record a result. Neither alone proves a previous compiler stopped or makes an uncertain publication safe to retry. Reuse existing primitives, adding only the domain semantics established by the assessment.

## Research budget and evidence boundary

Tier 1 used **7 queries**: three repository searches, two code searches that returned no results, and two tagged README retrievals. Local source reads supplied evidence where GitHub code search did not. Tier 2 used **7 calls**: three candidate resolutions and four documentation queries, reusing the GitHub library ID resolved in assessment. Tier 3 used **3 npm registry queries**. Tier 4 used **0**: the earlier assessment landscape was sufficient and no new broad search was justified. All tiers stayed below eight queries and the twenty-minute cap.

Tagged README retrievals after registry inspection resolved a concrete version/documentation discrepancy; they did not expand the candidate search. Context7 snippets under generated `_autodocs` were treated as leads, with relevant conclusions tied to primary README/code or registry evidence.

No packages installed, dependencies upgraded, product code changed, workflows dispatched, builds or tests run. JSON/schema inspection is artifact validation only. Native Windows compatibility, process recovery, source-isolated overlap, actual package operation and publication remain unverified until the later complete implementation boundary.

