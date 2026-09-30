# Plan: bounded Delivery Cadence pipeline

2026-09-30 · proposed execution revision 1 · `afc-delivery-cadence-pipeline` · Awaiting operator execution approval.

## Outcome and boundary

Make the existing Delivery Cadence engine support independent development while a completed, frozen delivery builds, and while its platform releases are published. Deliver the same shared implementation to full and mini packs and preserve every existing supported harness distribution route. This is one bounded skill improvement; it is not a new scheduler, queue service, worktree manager or Boss release rewrite.

Sources: [completed analysis](analysis.md), [library choices](library-candidates.json), [draft contracts](draft-contracts.md), [feature-operation clarification](feature-operation-clarification.md), and [ownership inventory](research/plan-ownership.md). Adapt the existing Cadence engine, filesystem/process helpers, copier and Boss workflow; add no dependency based on the researched queue libraries.

Keep the project policy at 120-minute deliveries, a local `pnpm build:mac:arm64` and actual new-function operation for every completed Boss delivery, and all four Mac/Windows targets plus release metadata and website every second successful delivery. Linux remains excluded. Installed acceptance remains separately visible. The proposed 90/120/150-minute signals are opt-in profile configuration after approval, not an already active rule or a license to release unfinished work.

The child’s own feature-operation is running the completed portable Cadence CLI through its workflow and recovery contract. Building an unrelated Boss DMG is not evidence for a skill repair. Carry the upgraded packaged skill into the next parent Boss delivery and preserve that parent’s Mac build obligation.

## Scope and explicit exclusions

Included: versioned state and command contracts, short transactions, physical resource ownership, frozen candidates, one work-ahead scope, truthful feature-operation readiness, external receipt adoption, durable publication obligations and attempts, reports, migration, adapters and distribution. Preserve existing child lifecycle, hooks, approvals and canonical KBD completion authority.

Excluded: application/runtime fixes, new Rust code, changes to the observed Obsidian project, arbitrary cron/DST scheduling, new daemons, automatic coalescing, repository-wide cleanups, a replacement workflow engine, wider installed-acceptance automation and promises of measured speed improvement.

The ownership inventory supplies exact file assignments: lead owns engine/lifecycle/CLI/shared schemas and children; specialists never edit these in parallel. Existing instructions requiring per-task unit/Verify evidence are reconciled in affected adapters to the completed boundary, without rewriting another project. No task completion below authorizes partial verification. Complete tasks 1–11, then perform the single completed-production operation boundary in task 12. Task 13 records cutover and handoff; it does not independently authorize reflect/archive or parent product execution.

## Ownership and dependency order

Use at most three implementers with nonoverlapping file ownership, plus the coordinating lead within harness capacity. The lead freezes shared contracts before parallel writers begin, owns shared entrypoints and integrates their outputs. No concurrent edits to `engine.mjs`, shared schemas, lock primitives or installer registries. Review/verifier roles remain dormant until the complete boundary.

- **State/operation implementer (`boss-runtime`):** source manifests, durable jobs, short transactions and shared resource registry. Full pack is authoring source.
- **Lifecycle/publication implementer (`boss-data`):** work-ahead domain, opportunity/obligation domain and reports in separate new capability modules after contract freeze. Entrypoint registration is handed to lead.
- **Adapters/distribution implementer (`boss-desktop`):** KBD/goal/loop contracts, owned copier/discovery and documentation, preserving user files. It may prepare its changes concurrently but copies final shared bytes only after integration.
- **Lead/product manager (`boss-lead` and planning `product-manager`):** canonical state, scope/approval references, common CLI/schema interfaces, v3 migration and old-writer refusal, combined wiring, completed boundary and delivery report. Existing machine and harness limits prevail; role assignment is not enforcement.

Start from the audited linked full pack `/Users/gqadonis/Projects/prometheus/worktrees/afc-c03-full-pack` (1.1.2 at `1ddcc8b21b05f26aa89aa5e19776c86e5b854c96`). Reconcile later changes before writing. Mini candidate `/Users/gqadonis/Projects/prometheus/worktrees/mini-cadence-recovery` was clean at `b0d4985d59af44f108af4a88ed097c150ec16933` (1.1.1). Preserve dirty original full/mini checkouts and installed user-authored content. The lead records final baselines and exact files using the ownership inventory before dispatch.

## Ordered OpenSpec change

1. **afc-delivery-cadence-pipeline** — bounded concurrent delivery with trustworthy operation and publication evidence. Libraries: cand-001 adapt, cand-002 adapt through existing consumer contracts; cand-003/cand-004 reference, cand-005 reject. Depends on: approved Assess/Analyze and this Plan. Scope: shared full/mini skill, pack adapters/distribution, and explicit process-spec delta. Complexity score: High; model class: frontier (project model_policy absent, preserve existing native assignments). Estimated complexity: L with uncertainty as below; customer value: high through earlier usable deliveries, not a product feature by itself. One complete vertical CLI lifecycle change; the following thirteen tasks are ownership/dependency steps, not thirteen verification gates.

## Thirteen implementation tasks

| ID | Work and concrete completion evidence | Owner | Dependencies |
|---|---|---|---|
| 1 | Freeze v3 request/state/receipt schemas and shared module boundaries from draft-contracts; inventory authoritative source deltas, preserved dirty copies, installed routes and existing live jobs. Record exact source baselines and the existing publication obligation without crediting new delivery. | Lead | Approved plan |
| 2 | Implement explicit backed-up v2→v3 migration (and the supported v1→v2→v3 path) and compatible read reporting. Preserve journal events, command IDs, unresolved hooks/children, original debt and unknown values; refuse unsupported writers and stop live old mutators before migration. | Lead | 1 |
| 3 | Implement claim/execute/reconcile for all long checkpoint, hook and optional learning effects. Add host/user-shared physical-output reservations at `~/.prometheus/cadence/resources-v1` (explicit shared override allowed; canonical existing-ancestor realpath with platform case semantics), ownership tokens and durable result records. Reload under short locks; interrupted launch and uncertain process ownership remain unknown. | State | 1,2 |
| 4 | Add frozen candidate manifests and operation-readiness declarations. Planning/dispatch/start retain the approved feature promise through child/scope splits; an operation must exist or have a named approved creation task before freeze. `ready` requires its source driver/direct procedure and completed creation task, target/evidence level and authority/prerequisites; build-generated entrypoints are checked after build. Pin actual source and artifact identity. | State + lead integration | 1,2 |
| 5 | Implement one authorized work-ahead scope with isolated source/output roots, dependency classification and resource collisions. Admission follows current production freeze; promotion waits for local delivery/hooks/review and repaired-base reconciliation. Preserve original firstWorkAt, sole KBD owner and child elapsed/debt semantics. | Lifecycle | 1,3,4 |
| 6 | Add external checkpoint receipt adoption with immutable receipt identity, approved command equivalence, source/recipe/architecture/log provenance and artifact byte checks. Preserve failed attempts and invalidate applicability without erasing history; missing feature-operation evidence cannot become success. | State | 3,4 |
| 7 | Replace global publication admission/debt clearing with stable obligations and count/interval/either/manual opportunity evaluation. Advance due thresholds when creating obligations. No-change and not-ready windows are explicit; old obligations survive config changes, children and newer results. Bound in-flight/pending capacity; no automatic replacement. | Publication | 1,2,4 |
| 8 | Add external release/platform attempts and reconciliation with dispatch intent, correlation, immutable manifests, retry boundaries and incremental platform/site receipts. Use existing Boss consumer seam only where exact-source and serialization contracts are enforceable; protect its release-branch version. Unsupported capabilities are explicitly blocked with assigned next action. | Publication + lead | 3,7 |
| 9 | Extend reports with overlapping elapsed accounting, work-ahead time, build causes, queue/debt age, platform/site/acceptance distinctions and meaningful outcomes. Preserve minimumSamples/comparability/timing-coverage rules and checkpoint learning; task counts alone do not establish velocity. | Publication | 5–8 |
| 10 | Wire source KBD, goal and loop adapters; amend OpenSpec release-cadence-governance hourly/per-delivery-prompt clauses to authorized 120-minute/every-two recurrence with manual override and existing stage feedback. Carry feature-operation contracts through planning/dispatch/child scope splits. Preserve current completion authority and hook registrations. | Adapters + lead | 4,5,7 |
| 11 | Integrate full payload, copy identical checksummed shared files to mini, update skill docs/examples/discovery/dependency closure and all existing harness routes (Codex, Claude Code, Kimi, MiniMax, Zed, OpenCode and any additional audited supported targets). Use ownership digests/backups; report unsupported route or conflicting user file rather than overwrite it. | Adapters | 2–10 |
| 12 | Operate the complete installed CLI once through the boundary scenarios below on native macOS and Windows; record portable Linux command evidence if available. Fix observed failures and repeat only failed scenarios. No unit/per-edit suites or unrelated application build. | Lead + boundary reviewer | 1–11 complete |
| 13 | Cut over the actual project after eligible boundary evidence: explicitly migrate its state with backup, preserve 120-minute/every-two policy, reconcile real owed publication and external jobs, update configured paths, record one learning/handoff and exact payload revisions. Commit/push scoped changes through ordinary policy; do not claim unavailable native Windows evidence or publisher capability. Stop for feedback before reflect. | Lead | 12; platform/capability limits explicit |

## Feature-operation readiness: catch missing work before the boundary

The observed second-project problem is a scope-contract loss, not necessarily a build-lock defect. Read-only inspection found six completed Cadence iterations, no active iteration/publication debt, and a next phase whose split plan omitted a production feature-operation script while including a recording-fake scenario. That project is not changed here.

Extend the existing operation declaration, not a new validation framework. At KBD planning/dispatch and Cadence `start`/work-ahead admission, record the promised usable capability; procedure and execution entrypoint; whether the procedure exists or its approved implementation task; real versus substitute dependencies; permitted evidence level; prerequisites; isolated resources; and side effects with authority references. Inheritance through parent/child scope splits is explicit. A substitute may demonstrate a deliberately limited capability but cannot satisfy an approved claim about the real service.

At `ready`, the operation source driver or direct argument-array procedure must be implemented and its creation task resolved. A custom wrapper is not required. Declared build-produced entrypoints are checked after the build; their expected absence before compilation does not block readiness. Missing approved work produces an actionable scope/readiness record, not a silently added task or a broadening of external-effect permission. A mutable shared alias, notification or deployment still needs its existing authority. KBD owns any task/phase completion and scope amendment.

## Single completed-production operation boundary

Run the real CLI from copied full/mini payloads in disposable workspaces with actual process execution and source/artifact capture. Scenarios are combined into one bounded session; recording fixtures may exercise state mechanics only and must be labeled as such, never as live GitHub/site or product inference evidence.

1. Freeze candidate A, run a real declared build/operation, and admit independent work B in isolated source/output roots while A runs. Status/report remain available; duplicate commands do not duplicate work. A conflicting physical output from a separate run root is refused.
2. Demonstrate missing operation readiness at start, approved creation-task admission, scope-split inheritance, and `ready` refusal until actual operation exists. A baseline launch or substitute cannot satisfy a higher real-service claim. Operate the delivered CLI capability to obtain success evidence.
3. Fail A’s operation, record repair priority and prevent dependent promotion; continue only disjoint authorized edits. Complete the repair, reconcile B’s base, promote with original firstWorkAt and count overlap once. Enter/return a nested child through canonical adapter boundaries; preserve approvals, unresolved return criteria, time and debt.
4. Interrupt launch/result reconciliation, issue cancellation, resume twice concurrently and exercise late/duplicate receipts. Known success is reused; changed receipt identity is rejected; unknown external effects are not replayed automatically. Demonstrate owned process-tree cancellation on each available native platform.
5. Adopt an independently produced successful build/operation receipt against frozen inputs without rebuilding. Reject wrong source, command, bytes or feature level. Preserve earlier attempts.
6. Create every-two obligations A and B; complete A after B exists and prove B remains owed. Exercise interval/either/manual evaluation, skipped/held windows, missed intervals, pending capacity and explicit authorized replacement of unstarted candidates only. No empty release or timer-based success.
7. Exercise partial platform publication, stale predecessor refusal, lost dispatch acknowledgement and receipt reconciliation. Verify acceptance remains separate. Real consumer capability assessment states exactly which GitHub/source/serialization/site controls are present; absent controls stay blocked and are handed to a named follow-up, not passed using a local receiver.
8. Migrate a backed-up existing v2 run and operate copied full/mini installations. Preserve old receipt/command identities and historical unknowns; prove shared payload digest parity and existing harness discovery routes. Unavailable native Windows execution remains a named pending acceptance item.

Boundary reports distinguish implementation completion, native-platform operation, remote consumer conformance, actual publication and installed acceptance. A local simulation of remote receipts proves only local reconciliation semantics. No exact-source CI claim is inferred from a workflow input, branch name or successful dispatch.

## Cutover, rollback and release obligations

Stop old live mutators before explicit state migration; save journal/snapshot and installed ownership inventory. Roll back payload/configuration only against that backup after accounting for any new v3 effects; never erase delivered external effects or downgrade a live journal in place. Keep legacy tools from mutating v3. Preserve user-authored files and existing full-pack precedence.

One active local delivery, one work-ahead scope, one heavy local build writer, one full release in flight and one pending release are the initial approved bounds. Public release version/branch promotion waits while the existing Boss publisher needs that version; edits and PRs proceed separately. If exact-source dispatch or target-wide serialization cannot be demonstrated using existing interfaces, task 8 produces blocked adapter capability plus a scoped consumer follow-up for operator approval. It does not modify Boss production code or promise fully autonomous publication.

Execution approval does not create a permanent background trigger. Explicit `tick`, normal commands or an already authorized scheduler evaluate opportunities. No process running means no autonomous clock-triggered release.

## Estimates and learning

Planning estimate: roughly 8–14 focused agent-hours of implementation/distribution and 2–4 hours for the completed operation boundary and corrections, with a possible elapsed range of 6–12 hours using independent ownership. These are uncertain ranges, not a two-hour promise; existing source drift, interrupted-job recovery and native Windows access can extend elapsed time. Re-estimate once task 1 freezes contracts and baselines. Do not inflate task completion counts by registering this plan.

The repair should remove proven serialization and duplicate-receipt-build costs. It cannot guarantee delivery every two hours or cure genuine product defects. Evaluate after at least three comparable deliveries with adequate timing coverage, reporting delivered capability, elapsed time, build repeats, blocked time and repair costs. Do not claim higher velocity from more tasks, more agents or a shorter reported clock.

## Exit and next command

Plan approval authorizes only this bounded skill change when explicitly requested with `/kbd-execute delivery-cadence-pipeline`. After Execute, stop for feedback; Reflect/archive and parent restoration follow their own lifecycle. Record unresolved remote/native evidence as dependency work, not success. No product feature task or parent release is completed merely by fixing Cadence.

## Ordered lifecycle closeout (after the thirteen implementation tasks)

These are lifecycle actions, not additional implementation tasks or automatic permission to skip operator feedback.

1. **Execute handoff:** after task13, record delivered code/distribution, native operation, consumer capability and unresolved acceptance separately; write execute handoff and stop for operator feedback.
2. **Reflect:** on the operator’s /kbd-reflect delivery-cadence-pipeline, compare goals with actual outcomes, preserve failed/unknown results, record one supported lesson via existing Karpathy interface, and review the completed evidence without rerunning passing product gates. A missing required native/consumer acceptance remains pending, not silently waived.
3. **Archive:** perform cumulative OpenSpec consistency verification for this bounded change, sync its approved specification delta and archive only once its completion requirements are met. Reconcile canonical task/change status through supported commands, never edit generated projections.
4. **Parent restoration:** write parent handoff with full/mini exact revisions, preserved publication obligations, evidence limits, next eligible parent work and packaged-skill inclusion requirement; use supported child-exit/phase commands to restore agent-fabric-convergence. Do not create a second active Cadence iteration or credit child tasks twice. Commit/push the scoped closeout through normal policy.

If a required acceptance cannot be completed, report the unresolved condition and obtain an explicit scope disposition; no phase-complete claim or automatic archive follows from thirteen checked boxes.
