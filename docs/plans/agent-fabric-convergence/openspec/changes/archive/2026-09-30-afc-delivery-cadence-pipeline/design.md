## Context

See proposal.md for the observed bottlenecks. The approved analysis and reviewed plan live under `.kbd-orchestrator/phases/agent-fabric-convergence/children/delivery-cadence-pipeline/`; its `draft-contracts.md` defines the proposed command/state interfaces and `research/plan-ownership.md` assigns exact files. Those artifacts are normative execution inputs for this change, not assertions that implementation exists.

The full linked 1.1.2 source is the audited baseline, while retained mini is 1.1.1 and originals include dirty 1.1.0 copies. Reconcile later source before choosing linked execution trees. Existing Boss publication expects a matching moving release-branch version. Current 120-minute cadence and four-platform publication every two successful deliveries remain fixed.

## Goals / Non-Goals

**Goals:** one active delivery and one authorized future scope, short state transactions, immutable evidence, durable attributable debt, portable shared implementation and honest recovery. Retain existing KBD owner, approval/child boundaries and hook identities.

**Non-Goals:** daemon, workflow service, generic worktree manager, automatic candidate coalescing, arbitrary cron/DST scheduling, Boss workflow source changes, Obsidian fixes, or runtime evidence inferred from planning artifacts.

## Decisions

### Adapt existing domain machinery

**Library evidence — cand-001**
- Candidate: existing full Delivery Cadence engine, baseline `1ddcc8b21b05f26aa89aa5e19776c86e5b854c96`.
- Verdict: adapt; existing storage/events, process cancellation, hooks and owned copying remain.
- Evidence: child `library-candidates.json` cand-001 and `research/source-audit.md` identify long mutex ownership, newest-delivery publication attribution and differing installed copies.
- Rejected alternative: replace with p-queue/proper-lockfile alone; neither supplies durable candidate, authority or debt semantics. BullMQ adds a forbidden service/worker dependency. No new dependency is needed.

**Library evidence — cand-002**
- Candidate: existing Boss Actions release workflow, inspected baseline `e2ae2ce21245030293c0bea96ed02ae853b820a7`.
- Verdict: adapt through its existing consumer contract only.
- Evidence: child `library-candidates.json` cand-002 records immutable platform manifests, publication serialization and default pending replacement; coordinator checks the release branch package version.
- Limitation: workflow presence is not exact-source execution or target-wide monotonic promotion proof. The adapter reports unsupported capability with a named follow-up instead of modifying Boss production code in this child.

### Separate candidate, operation and publication identities

State v3 adds candidate, workAhead, job, publicationObligation and releaseAttempt records alongside preserved history. Existing CLI takes JSON via `--input` and stable command IDs. Proposed candidate freeze, work-ahead admission/promotion, job reconciliation, checkpoint adoption, publication attempt/reconcile and tick interfaces are specified in the reviewed contract; no current command availability is asserted.

Freeze actual execution source and manifest content, including submodules/runtime/skill assets and recipe, not merely a HEAD fingerprint. Work-ahead uses distinct source/output roots. Same command ID/digest reuses result; changed content conflicts. Receipt equivalence requires approved source/command/platform/artifact provenance, with byte checks and actual feature evidence. Adoption avoids wrapper-only rebuilds.

### Keep long effects outside short transactions

Claim under lock, run outside lock, persist result, reload under lock and reconcile ownership/source tokens. Never save an old state object over newer changes. Long hooks and optional learning calls follow the same separation while retaining existing effect identities.

Physical-resource claims use the shared user/host directory `path.join(os.homedir(), '.prometheus', 'cadence', 'resources-v1')` or an explicit common override. Resolve existing ancestors with realpath and preserve platform/filesystem case semantics. Deterministic multi-resource acquisition and owned release avoid partial claims. This coordinates cooperating local runs only; it does not fence remote publishers. Unknown launch/process outcomes require reconciliation, not time-based ownership theft.

### One work-ahead scope preserves the original clock

Admission requires completed frozen predecessor production, approved scope/owner and known independence. Up to three disjoint implementers operate under the existing team and harness capacity. Promotion waits for local success, hooks/review, child resolution and repaired-base reconciliation; original firstWorkAt becomes the next iteration start. Failure prioritizes repair while disjoint editing can continue. No competing KBD leaf is created.

### Feature operation is part of scope before implementation

Planning, dispatch and child splitting preserve promised capability, procedure/driver, dependencies and evidence level, prerequisites, resources and effect authority. Admission accepts an existing operation or approved creation task. Ready requires completed source driver/direct sequence; generated entrypoints are resolved after build. No custom wrapper is intrinsically required. A substitute is acceptable only for its approved limited claim. This addresses the observed loss of 07a's operation contract without editing that project or adding its task implicitly.

### Durable obligations replace a global publication barrier

Count/UTC interval/either/manual opportunity evaluation occurs on invocation, never in a new daemon. Meaningful completed candidates qualify; skipped and held windows do not generate fake delivery credit. Obligations bind original due ordinal/time and candidate coverage; thresholds advance on obligation creation, not eventual publication. One full release and one pending candidate are bounded; further debt can still be recorded. No automatic coalescing; explicit replacement of unstarted candidates requires authority and complete coverage/provenance.

Attempts preserve dispatch correlation and reconcile unknown acknowledgement instead of redispatching blindly. Publish ready platforms incrementally and retain previous pending-platform URLs. Full completion still requires four Mac/Windows platforms, metadata and live site receipts, separately from installed acceptance. Protect publisher-branch version promotion while its release runs. Missing consumer enforcement blocks that capability and gets assigned follow-up; a local reservation or simulation cannot prove remote correctness.

### Shared authoring and one completed boundary

Lead owns CLI/engine/lifecycle/schemas/migration/children; runtime owns jobs/resources/adoption; data owns work-ahead/opportunities/publication/reporting; desktop owns adapters/docs/distribution. Full authors shared code and mini receives identical checksummed files through existing owned copier. Existing harness routes remain; user conflicts are preserved. No parallel edits to shared entrypoints.

Complete all production wiring and distribution before one real CLI operation boundary. Operate native macOS/Windows where available and report unavailable platforms pending. Remote-receipt fixtures establish only local reconciliation. No unit/per-edit loops or unrelated DMG are required to prove this skill. Carry the skill into the next parent Boss delivery.

## Risks / Trade-offs

- [Remote consumer lacks exact-source or serialization guarantees] → Report blocked capability and scoped follow-up; do not weaken receipt contract or modify Boss implicitly.
- [Unknown process ownership after interruption] → Preserve unknown until observed reconciliation; do not kill guessed PIDs or reclaim solely by age.
- [Source drift across pack copies] → Compare exact baselines and ownership digests, preserve dirty originals and generate identical shared payloads.
- [No autonomous evaluator is running] → Status exposes next/overdue opportunities; explicit owner/authorized CI invocation is required.
- [One pending candidate increases backpressure] → Bound admission and preserve owed work; do not automatically erase/coalesce debt.
- [Native Windows unavailable] → Track pending operation evidence and prevent universal-runtime acceptance claims.
- [Task counts appear faster without real delivery] → Compare at least configured eligible samples using adequate timing coverage and delivered capability.

## Migration Plan

Stop old mutators, back up journal/snapshot and ownership inventory, then explicitly migrate supported v1→v2→v3 or v2→v3. Append migration event; preserve command identities, receipts, unresolved children/hooks and known original debt. Missing jobs/timestamps remain unknown. Update bound CLI/adapter paths and owned distributions together; audited old writers reject v3.

Cut over the actual project only after eligible completed-boundary evidence and reconcile its real publication jobs/debt. Keep duration/publication settings unchanged. Rollback restores payload/configuration against recorded backups only after accounting for new external effects; never downgrade a live v3 journal or erase effects. Execute stops for feedback; subsequent reflect/archive/parent restoration use their required lifecycle authorization and preserve acceptance dependencies.
