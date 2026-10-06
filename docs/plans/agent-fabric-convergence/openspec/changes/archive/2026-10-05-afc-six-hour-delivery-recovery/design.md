# Design
## Context
See proposal.md and ../../.. framework instructions. The detailed authority is .kbd-orchestrator/phases/agent-fabric-convergence/children/six-hour-convergence-recovery/plan.md. Current cadence is v3, iteration 8 checkpoint-failed, six successful deliveries and next publication count 7. The child is unresolved; parent ready refuses unresolved children.

## Goals / Non-Goals
Install bounded parent recovery instructions and apply supported cadence configuration without changing its engine or falsely completing software. No product edits, builds, deployments, scheduler additions or runtime-spec changes in this recovery administration change.

## Decisions
- Child Execute installs three planning/configuration tasks. Reflect restores the parent before product repair/build; parent remains sole delivery owner. Reject a child-delivery gate depending on parent ready.
- Preserve existing 120 minutes/every two successful deliveries and next-count 7, which makes the next three successes full/local/full. Store the request now; apply only after operator approves Plan. Preserve all existing publication obligations and immutable candidate history.
- Map R1 Teams prepared-effect inspection to existing C14.1/C14.2, R2 authoritative BossFang observation to C14.4, and R3 packaging/operation to mapped C14/C18 criteria. Reuse cand-001/002/003 evidence in library-candidates.json; no replacement runtime/library.
- Existing release-cadence-governance permits explicit recurring publication choice; delivery-cadence-pipeline preserves due obligations. This config choice does not rewrite those specs. skip_specs is deliberate tooling/documentation scope.
- Models: use the plan's exact child task assignments; parent product assignments remain authoritative. Register tasks using kbd-apply backend IDs, not guessed aliases.

## Risks / Trade-offs
- New runtime failure or slow native build → preserve overrun and failed outcome; do not call the clock a delivery.
- Legacy C09.4 publication debt → reconcile immutable evidence or supported covered-scope replacement; never delete.
- Publisher adapter capability gap → existing authorized workflow/manual publication with truthful receipts; no fictitious auto dispatch.
- Broader parent task criteria → partial evidence does not complete whole C14/C15/C16 tasks.
- Review waiting → retain elapsed child time; operator-requested stage stops are not bypassed.

## Migration Plan
After approval, install authored parent amendments, configure through the existing CLI with a stable command ID, and save its receipt. Review current state before applying the request; do not overwrite concurrent work. Reflect archives this change and restores the parent. Record child return through Cadence, preserve failed iteration 8, and start its evidence-linked corrected delivery. Reverting a future policy uses another configure event; prior debt/history is never rolled back.

