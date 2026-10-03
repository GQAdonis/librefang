# Assessment: Delivery Cadence pipeline

Date: 2026-09-30. Initiative: Agent Fabric Convergence. Stage: assess, not implementation approval.

## Finding

The observed problem is real: Cadence couples development admission to publication completion and holds its state lock while running expensive checkpoint subprocesses. A publication-guard removal alone would not satisfy the operator's requirement to continue independent development during both local and full builds. The recommended direction is a bounded pipeline built on the existing engine: freeze completed production inputs, run the build/operation against that immutable candidate, permit one explicitly scoped work-ahead assignment set, and publish eligible completed deliveries through one serialized publisher. This is an assessment recommendation; analyze must settle ownership and recovery contracts, then the operator approves the plan.

Both full and mini packs are in scope. The active linked full source is 1.1.2, the original full/mini checkouts are 1.1.0 and locally modified, and installed Codex is 1.1.1. These are observed local copies, not claims about remote-main versions. Existing copies differ; changing an installed skill alone would not fix both source distributions.

## Evidence and limits

Read-only state inspection, captured in [current-state evidence](research/current-state-evidence.json), shows the parent at 14/24 completed implementation changes; this child has 0 registered implementation changes. Neither number is a task count. Cadence has five successful local deliveries, no active iteration and outstanding publication. The incoming parent handoff assigns the existing 2.2.9 release and installed acceptance to the parent; live release state was not refreshed in this assessment. This assessment does not declare any currently running build published or cancel/relabel it.

The latest stored report and state give:

| Iteration | Recorded elapsed | Build attempts | Run checkpoint attempts | Timing coverage |
|---|---:|---:|---:|---:|
| 1 | 67.4 min | 4 | 4 | 31.6% |
| 2 | 54.8 min | 2 | 1 | 10.4% |
| 3: corrective release | 109.6 min | 2 | 2 | 10.8% |
| 4: team execution and architecture child | 763.4 min | 14 | 24 | 50.0% |
| 5: cooperating teams | 454.2 min | 7 | 25 | 36.0% |

These counts include failed and successful attempts. They are checkpoint records, not counts of unique scenarios or a claim that every run repeated all scenarios. Iteration 5 records 94.7 minutes implementation, 43.4 minutes packaging-build checkpoints, 17.6 minutes run checkpoints, 7.9 minutes explicit rework, and 290.6 minutes unattributed. Native sidecar compilation, investigation, direct operations and waiting may lie outside those recorded intervals. Do not relabel unattributed time as idle time, testing or publication delay. All five reports are ineligible for the configured automatic optimization; none proves increased velocity. Source: [iteration evidence](research/iteration-evidence.json), derived from the existing report, without rewriting historical records.

Repeated work has more than one cause. The captured [checkpoint reasons](research/checkpoint-reasons.json) describe observed ownership negotiation, selected-runtime routing, rate limits, tool catalogs, provider budgets and operation-driver corrections. One build reason explicitly says a direct build passed but was repeated to obtain a Cadence checkpoint receipt. Preventing that administrative rebuild is a concrete repair candidate. Cadence cannot eliminate product defects or make unfinished functionality releasable.

## Implementation and specification gaps

| Capability | Current assessment | Gap to requested outcome |
|---|---|---|
| Canonical KBD lifecycle | Present | Keep one authoritative phase/child leaf; work-ahead must not bypass phase approval or credit future tasks early. |
| Completed local delivery | Present | Maintain separate build, launch and feature-operation receipts. Freeze inputs before running; a started build is not delivery. |
| Admission during publication | Missing in current policy | Global publicationDue refusal blocks unrelated work. Scope admission should depend on bounded outstanding work, dependencies and actual failure status. |
| Admission during local build | Missing | Single active iteration plus long-held run lock prevents durable concurrent updates. Need short state transactions and separately owned build operations, not unlocked writes. |
| Publication attribution | Partial | Current publication is tied to the latest successful iteration/global debt. With overlap, receipts must target their immutable delivery and exact owed obligations. |
| Scheduled publication opportunities | Partial | Current profile is count-based; no demonstrated calendar/elapsed-time opportunity with meaningful-candidate selection and visible skip/hold status. Analyze must compare triggers and carry the selected schedule contract into plan acceptance. |
| Full-platform build lifecycle | Partial | External workflows exist, but Cadence lacks candidate-bound per-platform attempt ownership/recovery independent of metadata/site publication. |
| Work-ahead authorization | Missing | Future work needs a durable approval reference and owned scope under the current approved parent; informal assignments or agent memory cannot authorize implementation. |
| Meaningful release eligibility | Partial | A named outcome exists; no demonstrated eligibility policy distinguishes new usable changes from bookkeeping, repeated builds or unchanged inputs. |
| External successful build adoption | Missing | Existing spans/artifacts are not authoritative checkpoint receipts. A validated receipt-import route could avoid needless rebuilds. |
| Resource-aware concurrency | Partial | Team limits are harness instructions, not a machine scheduler. Enforce ownership of shared build outputs; avoid adding a scheduler service. |
| Recovery and children | Present but needs extension | Retain IDs, old evidence and canonical reconciliation; a child entered between deliveries must not invent an active delivery. |
| Full/mini distribution | Divergent copies | Reconcile source baselines and all changed shared files, checksums and pack-specific adapters before implementation. |
| Trustworthy optimization | Present in part | Coverage is insufficient; preserve unknowns and observe pipeline overlap/backlog rather than promise faster delivery. |

Exact source baselines, references and candidate files are in [the source audit](research/source-audit.md). Implementation-table status describes inspected source, not newly exercised runtime behavior. Current-state and report figures come from separate read-only JSON inspection; they do not claim fresh functional operation. Build health for the proposed repair is UNKNOWN: no repair code exists and no build/test suite was run in assessment.

## External research and alternatives

The team researched nine primary sources using Firecrawl discovery/retrieval and Context7 documentation cross-checks. The [research landscape](research/landscape.md) and [source register](research/sources.json) distinguish documented behavior from our adaptations.

- [Deployment-pipeline patterns](https://continuousdelivery.com/implementing/patterns/) support promoting identified artifacts rather than rebuilding from a moving branch. Adapt this per platform and signing configuration; a Mac DMG does not qualify Windows.
- [GitLab resource groups](https://docs.gitlab.com/ci/resource_groups/) separate parallel build work from serialized deployments. Its [deployment safety guidance](https://docs.gitlab.com/ci/environments/deployment_safety/) documents stale-deployment risks: one publisher is necessary but insufficient without release ordering.
- [GitHub concurrency](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency) now documents both a single-pending default and queue:max. Queue order is not business release order; preserve a local candidate sequence and expected publication predecessor regardless of CI behavior. No workflow edit is authorized by this assessment.
- [DORA WIP limits](https://dora.dev/capabilities/wip-limits/) support limiting work in progress to capacity; [small batches](https://dora.dev/capabilities/working-in-small-batches/) support independently usable increments. Neither proves a particular two-hour/WIP setting is optimal here.
- [GitLab scheduled releases](https://handbook.gitlab.com/handbook/engineering/releases/monthly-releases/) demonstrate frequent development with a release cutoff. Skip-empty opportunities are our proposed adaptation, not an assertion about GitLab policy.

| Option | Assessment |
|---|---|
| Change instructions/remove publication guard only | Insufficient: local lock still blocks durable work-ahead and global debt/latest-delivery attribution becomes unsafe. |
| Extend existing candidate/attempt receipts and bounded admission | Recommended for analyze: addresses observed seams, retains existing engine, needs deliberate concurrency/recovery design. |
| Replace Cadence with a workflow/queue service | Reject for this child: unsupported scope, deployment and maintenance cost, violates no-new-daemon constraint. |

Do not adopt source recommendations for per-commit testing where they conflict with the operator's complete-increment boundary. Build/operate only completed functionality; continuation during the build is independent implementation, not testing unfinished code.

## Recommended model to analyze

Keep the existing distinction between production work and completed-delivery evidence, with four explicit responsibilities:

1. **Implementation owner:** selects the next independently usable outcome, with owned files, dependencies and UI/strings/persistence/packaging obligations. At most one bounded future increment is worked ahead while the current candidate builds. Authorization must be a durable, inspectable record referencing the already approved parent/change scope, owner, repository/worktree and dependency classification. No informal or agent-memory-only permission is sufficient; crossing into an unapproved phase remains forbidden. Its pre-admission work and time remain visible; it is not a completed next iteration and cannot silently advance KBD.
2. **Build/operation owner:** runs the frozen candidate in an isolated checkout/output directory, then operates its actual new function. A short state transaction records intent and ownership; the expensive process must not hold the run-wide metadata lock. A later transaction reconciles the exact result using a stable operation ID and revision/ownership check. Recovery must reconcile existing processes or unknown outcomes before restarting; this is not a daemon.
3. **Platform-build owner:** claims each required Mac/Windows attempt against an eligible immutable release candidate, with platform, source/input identity, resource ownership, execution reference, state and eventual artifact receipt. Full-build progress, uncertain outcomes, retry ownership and failure effects remain separately recoverable; CI dispatch is not success. Healthy independent platform builds may overlap development and each other where resources allow. Analysis must specify how the existing harness/workflow is reattached without duplicate dispatch or moving-source rebuilds.
4. **Publication owner:** consumes completed eligible deliveries, preserves all platform receipts, updates release metadata/site serially, and never lets an older completion regress newer links. An analyze-stage option is to update each verified platform's exact link as it becomes available while retaining previous valid artifacts for pending platforms. Compare that with atomic all-platform presentation, reconcile the operator's earlier immediate-platform-publication direction, and specify visible mixed-version, rollback and recovery behavior before plan approval; the full obligation remains pending until all required platform and site/metadata receipts exist. Prevent regression per platform, not merely with a single release-wide version comparison. Native platform build jobs may run independently when resources allow; serialization applies to contested resources and publication mutations, not every compiler everywhere.

Suggested bound for analysis: one frozen local candidate, one future implementation scope, one full release publishing and at most one pending release candidate. These are hypotheses for approval, not established performance laws or newly applied defaults. If capacity fills, do not grow an unlimited queue; prioritize repairs, reduce admission, and report why. Do not demand every historical intermediate artifact be published when an explicitly authorized newer candidate legitimately covers the same changes; equally, never silently clear debt. Decide supersession and obligation coverage in analysis before code.

If a build or operation fails, the failed delivery remains failed/unaccepted. Give its owner repair priority and block dependent promotion. Disjoint work can continue only within its existing authorized scope, resource limits and dependency contract. This reconciles the latest request for work during builds with the standing rule to repair delivery errors before claiming the next successful delivery. A new phase still requires its normal human approval.

## Meaningful releases and schedule

Preserve the approved project policy: 120-minute target, required local Mac ARM64 build and actual new-feature operation per successful delivery, full Mac ARM64/x64 and Windows x64/ARM64 plus website every second successful delivery; no Linux. No-change intervals, bookkeeping-only updates or rebuilds of the same candidate are not successful new deliveries and must not advance publication frequency.

Define an eligible candidate as completed named user-visible functionality or a user-impacting correction, exact release-input changes, applicable build/operation evidence, and a concise operator-readable change note. Task count, line count or a model's confidence is insufficient. Packaged skill or configuration changes may be meaningful even when no application source changed; do not blanket-exclude them from fingerprints. Scope completion remains under KBD, not a new cadence authority.

A schedule creates a publication opportunity, never permission to ship unfinished code. If nothing eligible is ready, record why the opportunity was skipped and retain existing owed publication. The current every-two-deliveries policy is count-based, not a promise of a release every four wall-clock hours. Scheduled meaningful-update support is a required assessment outcome, not an optional omission. Analyze must compare (a) the existing successful-delivery counter, (b) elapsed-time or calendar release opportunities evaluated by the owning session/existing CI, and (c) a combined policy. It must define the chosen trigger, cutoff, eligible candidate, no-change skip, unmet-debt hold, and operator-visible status at each opportunity, and put those in plan acceptance. Preserve this project's approved every-two-successful-deliveries default unless the operator approves a replacement; schedule configuration must not move an already owed deadline indefinitely. No new cron job or daemon belongs to this repair. Candidate coalescing also requires an explicit coverage decision.

The 90-minute implementation/30-minute build reserve is a candidate scope-sizing heuristic only. Build durations vary. At the target deadline, stop admitting more scope, report completion/failure and overrun, and take a bounded repair/scope decision. Never call unfinished functionality done to hit the clock. Build only the completed boundary; no per-edit, unit, broad regression or partial-function test loops.

## Bounded implementation surface and non-goals

The later plan should own full-pack shared engine/state/checkpoint/publication/receipt/report modules and copy the same versioned payload into mini, plus the existing KBD/goal/loop adapters and discovery/distribution entries that actually reference it. Preserve Node 22+ .mjs portability, existing installed user files, historical events, command IDs, hook delivery identities, old-run migration and separate installed acceptance. Native Windows execution remains pending until genuinely exercised.

Do not rewrite the workflow engine, adopt a new service, change UAR/The Boss product features, upgrade dependencies, revise the two-hour/frequency policy silently, or build a general distributed scheduler. A publication fix alone is too small for the stated problem; a replacement orchestrator is too large. Select the smallest engine extension that supports durable work-ahead and independently reconciled builds/publication.

## Questions analysis must settle

- How can one active iteration record bounded future work without losing its timestamps or double-counting completion when that scope becomes current?
- Which exact local build operation contract releases the state lock while retaining single-writer resource ownership and safe Windows restart/cancellation?
- What evidence qualifies an externally run build/operation for import, and how is its frozen input/command/artifact provenance checked?
- Which failures block dependent work or promotion, and when does unresolved publication debt stop new admission?
- How are old and new publication obligations covered by a newer candidate without fabricating completion or regressing a platform's website link?
- Which checked-in full/mini versions are the implementation baseline, and how do old consumers reject or migrate new state safely?

## Review and stage boundary

Primary-source research and one isolated adversarial review accompany this assessment. Sycophancy screening checks the assessment and reviewer findings; detector scores are not correctness proofs. Review results, dispositions and any unresolved caveats are recorded separately. The assessment supplies options and gaps; it does not freeze architecture or authorize execution.

Next: operator feedback, then /kbd-analyze delivery-cadence-pipeline.

## Completed assessment review

Isolated GPT-5.6-sol review: round 1 raised two critical gaps and three warnings; round 2 passed with zero critical findings and three evidence/policy warnings. The final clarifications label attempts accurately, attach child/change and checkpoint-reason evidence, identify parent release ownership as a handoff assertion, and keep website presentation an analyze-stage choice reconciled with prior operator direction. See review/findings.json and review/dispositions.md. These final clarifications were not subjected to a third review.

Sycophancy Correction screened the assessment (0.018, low verbosity flag, no mandatory correction) and final reviewer findings (0.0, no flags). The gateway judge was unavailable due to unresolved canonical identities; the harness-native review is explicitly recorded instead, with exact producer-model identity unverified. Review is artifact evidence only.
