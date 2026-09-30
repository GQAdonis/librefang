# Implementation tasks

Canonical task IDs are positional 1–13, matching the reviewed plan and KBD registration. All completion evidence below is gathered at the completed boundary; no task creates a per-edit or partial verification gate. Complete production tasks 1–11 before task 12. No task is complete merely because this checklist exists.

## 1. Shared engine, ownership and adapters

- [x] 1. Freeze v3 request/state/receipt schemas and shared module boundaries from draft-contracts; inventory authoritative source deltas, preserved dirty copies, installed routes and existing live jobs. Record exact source baselines and the existing publication obligation without crediting new delivery. Owner: Lead. Depends on: Approved plan.

- [x] 2. Implement explicit backed-up v2→v3 migration (and the supported v1→v2→v3 path) and compatible read reporting. Preserve journal events, command IDs, unresolved hooks/children, original debt and unknown values; refuse unsupported writers and stop live old mutators before migration. Owner: Lead. Depends on: 1.

- [x] 3. Implement claim/execute/reconcile for all long checkpoint, hook and optional learning effects. Add host/user-shared physical-output reservations at `~/.prometheus/cadence/resources-v1` (explicit shared override allowed; canonical existing-ancestor realpath with platform case semantics), ownership tokens and durable result records. Reload under short locks; interrupted launch and uncertain process ownership remain unknown. Owner: State. Depends on: 1,2.

- [x] 4. Add frozen candidate manifests and operation-readiness declarations. Planning/dispatch/start retain the approved feature promise through child/scope splits; an operation must exist or have a named approved creation task before freeze. `ready` requires its source driver/direct procedure and completed creation task, target/evidence level and authority/prerequisites; build-generated entrypoints are checked after build. Pin actual source and artifact identity. Owner: State + lead integration. Depends on: 1,2.

- [x] 5. Implement one authorized work-ahead scope with isolated source/output roots, dependency classification and resource collisions. Admission follows current production freeze; promotion waits for local delivery/hooks/review and repaired-base reconciliation. Preserve original firstWorkAt, sole KBD owner and child elapsed/debt semantics. Owner: Lifecycle. Depends on: 1,3,4.

- [x] 6. Add external checkpoint receipt adoption with immutable receipt identity, approved command equivalence, source/recipe/architecture/log provenance and artifact byte checks. Preserve failed attempts and invalidate applicability without erasing history; missing feature-operation evidence cannot become success. Owner: State. Depends on: 3,4.

- [x] 7. Replace global publication admission/debt clearing with stable obligations and count/interval/either/manual opportunity evaluation. Advance due thresholds when creating obligations. No-change and not-ready windows are explicit; old obligations survive config changes, children and newer results. Bound in-flight/pending capacity; no automatic replacement. Owner: Publication. Depends on: 1,2,4.

- [x] 8. Add external release/platform attempts and reconciliation with dispatch intent, correlation, immutable manifests, retry boundaries and incremental platform/site receipts. Use existing Boss consumer seam only where exact-source and serialization contracts are enforceable; protect its release-branch version. Unsupported capabilities are explicitly blocked with assigned next action. Owner: Publication + lead. Depends on: 3,7.

- [x] 9. Extend reports with overlapping elapsed accounting, work-ahead time, build causes, queue/debt age, platform/site/acceptance distinctions and meaningful outcomes. Preserve minimumSamples/comparability/timing-coverage rules and checkpoint learning; task counts alone do not establish velocity. Owner: Publication. Depends on: 5–8.

- [x] 10. Wire source KBD, goal and loop adapters; amend OpenSpec release-cadence-governance hourly/per-delivery-prompt clauses to authorized 120-minute/every-two recurrence with manual override and existing stage feedback. Carry feature-operation contracts through planning/dispatch/child scope splits. Preserve current completion authority and hook registrations. Owner: Adapters + lead. Depends on: 4,5,7.

- [x] 11. Integrate full payload, copy identical checksummed shared files to mini, update skill docs/examples/discovery/dependency closure and all existing harness routes (Codex, Claude Code, Kimi, MiniMax, Zed, OpenCode and any additional audited supported targets). Use ownership digests/backups; report unsupported route or conflicting user file rather than overwrite it. Owner: Adapters. Depends on: 2–10.

## 2. Completed boundary and cutover

- [x] 12. Operate the complete installed CLI once through the boundary scenarios below on native macOS and Windows; record portable Linux command evidence if available. Fix observed failures and repeat only failed scenarios. No unit/per-edit suites or unrelated application build. Owner: Lead + boundary reviewer. Depends on: 1–11 complete.

- [x] 13. Cut over the actual project after eligible boundary evidence: explicitly migrate its state with backup, preserve 120-minute/every-two policy, reconcile real owed publication and external jobs, update configured paths, record one learning/handoff and exact payload revisions. Commit/push scoped changes through ordinary policy; do not claim unavailable native Windows evidence or publisher capability. Stop for feedback before reflect. Owner: Lead. Depends on: 12; platform/capability limits explicit.

The reviewed plan provides the single CLI operation scenario matrix and exact completion limitations. Delivered artifacts/source inspection establish implementation progress; native operation and remote publication claims require their own actual evidence. After Execute, stop for feedback. Reflect, cumulative OpenSpec consistency/archive, parent handoff and supported waypoint restoration are ordered lifecycle actions after their required authorization, not extra implementation tasks or permission to skip acceptance.
