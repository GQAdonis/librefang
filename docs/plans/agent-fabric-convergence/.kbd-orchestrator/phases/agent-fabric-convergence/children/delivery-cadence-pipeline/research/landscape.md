# Delivery cadence pipeline: research landscape

Assessment date: 2026-09-30. Research only; no product code, builds, tests or publication.

## Recommendation

Adapt a delivery pipeline around immutable, complete candidates. Keep one active iteration engine and let already-frozen candidates progress through independently tracked build jobs. Advance independent development only after the candidate's source and dependencies are fixed and isolated; a build still running is not a successful delivery. Serialize shared build resources and publication, not all productive work.

Retain the supplied policy: a **120-minute delivery target**, actual local Mac packaging and operation of the completed new function on every delivery, and the full four Mac/Windows builds plus website publication every **two successful deliveries**. These numbers are operator policy, not conclusions of the research. Skipped or failed candidates do not advance the success counter.

## What the sources establish

| Pattern | Documented evidence | Assessment decision |
| --- | --- | --- |
| Delivery versus deployment | Continuous delivery concerns on-demand releasability; AWS describes fully automatic production deployment as optional. [S1](https://continuousdelivery.com/), [S9](https://docs.aws.amazon.com/wellarchitected/latest/devops-guidance/dl.cd.7-remove-manual-approvals-to-practice-continuous-deployment.html) | **Adopt** the distinction. Preparing a candidate does not itself authorize publishing it. |
| Build once, promote | Deployment-pipeline guidance recommends using the same tested packages downstream. [S2](https://continuousdelivery.com/implementing/patterns/) | **Adapt** per platform/configuration. A Mac binary cannot stand in for Windows evidence; signing or repackaging creates an identified output with its own checks. |
| Scheduled customer releases | GitLab combines frequent deployments with scheduled releases, an RC and a final included commit. [S8](https://handbook.gitlab.com/handbook/engineering/releases/monthly-releases/) | **Adapt** eligibility windows and frozen contents. Do not copy its monthly calendar or infrastructure. |
| Resource-specific serialization | GitLab allows build concurrency while resource groups serialize deployment jobs. [S4](https://docs.gitlab.com/ci/resource_groups/) | **Adapt** one writer per shared target/output/environment and a separate publication lock. |
| Explicit backlog | DORA recommends capacity-based WIP limits, whole-stream visibility and lead-time measurement. [S6](https://dora.dev/capabilities/wip-limits/) | **Adopt** visible build/publication debt and capacity-based backpressure. |
| Meaningful small increments | DORA supports reducing batch size to shorten feedback. [S7](https://dora.dev/capabilities/working-in-small-batches/) | **Adapt** complete user-visible increments; no unfinished-code verification. |

The source pipeline's every-commit tests conflict with this initiative's gate policy. Retain its artifact identity and stage separation, but reject its testing cadence here. No source overrides the complete-production-increment boundary.

## Queue semantics that change the design

**GitHub Actions:** current documentation distinguishes default `queue: single` (a new pending run replaces the previous pending run) from `queue: max` (up to 100 pending runs). Ordering is FIFO by entry into the concurrency wait, **not workflow dispatch or commit order**. The latter mode cannot combine with `cancel-in-progress: true`. Thus the historical blanket statement “GitHub only supports one pending run” is outdated. None of these modes establishes business release ordering. [S3](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency)

**GitLab:** default `unordered` does not order jobs; `oldest_first` orders by ascending pipeline ID, while newest modes prioritize newer pipelines and require idempotency. Nested pipelines sharing a resource can deadlock. This demonstrates why the iteration coordinator must not hold a build/publication lock while waiting for work that needs the same lock. [S4](https://docs.gitlab.com/ci/resource_groups/)

**Publication freshness:** serialization alone cannot prevent an old candidate publishing after a newer candidate. GitLab explicitly documents the overwrite race and a protection based on job start time, which can disagree with commit recency. Use a project-owned candidate sequence and expected publication predecessor, checked while holding the publication lock. Explicit rollback must be distinguished from ordinary promotion. This sequence mechanism is a proposed local adaptation. [S5](https://docs.gitlab.com/ci/environments/deployment_safety/)

## Proposed local adaptation

1. **Define and freeze.** The active engine completes the bounded functionality, UI, contracts and packaging changes. Record an immutable source revision per participating repository, dependency identities, acceptance scenario and candidate sequence. A multi-repository candidate needs a manifest; matching branch names are insufficient.
2. **Hand off the complete candidate.** Store its build request and status durably using the existing cadence execution path. Separate iteration ownership from candidate build ownership. Do not introduce another scheduler, daemon or autonomous iteration engine.
3. **Continue only independent work.** The next increment may start in an isolated source/build location when ownership and resource capacity permit. It must not modify the candidate under verification or rely on its unproven outcome. Dependent work waits for the required evidence.
4. **Earn delivery success.** Apply the one real-path gate at the completed boundary, build the actual local Mac package, then operate the new function in that package. Record implementation, verification and publication states separately. Failed verification leaves the candidate unsuccessful and identifies affected descendants.
5. **Promote the eligible release.** After two successful deliveries, preserve the full four-platform and website obligation as durable release work. Reuse an already-built artifact only where source, configuration, dependency, packaging/signing identity and required evidence match. Passing one platform does not satisfy another.
6. **Handle empty windows honestly.** At a due window with no meaningful eligible delta, record a skipped opportunity and its reason. Do not fabricate a release, re-count an old delivery or publish incomplete work. This is a local adaptation, not a claim that the cited GitLab policy skips monthly releases.
7. **Apply backpressure visibly.** Account for queued/running/failed candidates and pending full-release obligations. Choose WIP and host-resource limits from observed capacity. When downstream work cannot keep up, prioritize draining or repairing it instead of silently growing the queue. Do not invent a universal two-job limit or a performance threshold.

Full and mini packs should share the same portable Node `.mjs` contract and semantics. That is a supplied portability requirement; these sources do not establish the implementation's compatibility.

## Alternatives and pitfalls

**Prefer the smallest repair to the existing cadence path:** separate its iteration handoff from candidate build/publication status, retain immutable candidate identity, and expose pending obligations. Reuse existing locking, durable state and invocation mechanisms where their contracts suffice. A full workflow engine would add orchestration, recovery and deployment surfaces without evidence that this bounded scheduling/state separation needs them. Reject that expansion for this child; revisit only if an observed requirement cannot be met by the existing path. This is an assessment recommendation, not a code-level feasibility finding.

| Alternative | Decision and reason |
| --- | --- |
| Synchronous iteration → all builds → publication → next iteration | **Reject as default:** preserves ordering but unnecessarily couples independent development to long builds. It remains appropriate where actual shared resources or dependencies prevent isolation. |
| Unlimited asynchronous candidates | **Reject:** hides WIP, delays feedback and can exhaust CPU, memory, disk or runners. Isolation does not create capacity. |
| Multiple active iteration engines | **Reject:** independent build jobs do not justify competing scope/state writers. |
| Cancel every older job when new work arrives | **Reject as blanket policy:** can discard required evidence or an owed release. Superseding an unstarted candidate requires an explicit coverage/dependency decision and retained audit history. |
| Latest-ready publication | **Adapt cautiously:** only with monotonic promotion, complete release coverage and explicit supersession. Never let it erase a full-release obligation. |
| New queue service or cron daemon | **Reject:** existing execution and durable records are sufficient candidates to assess; project constraints prohibit new services/schedulers. |
| Rebuild from a moving branch at publication time | **Reject:** the published artifact could differ from the operated candidate. |
| Treat a due timestamp as permission to test unfinished code | **Reject:** cadence is a target; completed functionality opens the gate. |

## Evidence limits and measurement

The reading supports a design direction, not an observed local velocity gain. Measure candidate-ready → build-start queue delay, build/operation duration, meaningful successful deliveries, full-release obligation age, publication lead time and failure/rework. Compare before/after observations before claiming improvement. The 120-minute target, two-success release frequency, optimal WIP cap, runner capacity and actual overlap safety remain local policy or empirical questions.

Source details and evidence/adaptation boundaries are in [sources.json](sources.json). No implementation, platform verification, release publication or benchmark was performed for this research.
