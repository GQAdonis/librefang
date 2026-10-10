# Six-hour convergence recovery — Analyze
Date: 2026-10-05. Status: completed analysis; proposed decisions await operator review and Plan. **No product code changed or executed.**

## Decision
Keep the existing UAR kernel, Boss desktop and BossFang workflow architecture. Repair two observed boundary defects, finish their complete user journeys, then build and operate the application. Do not introduce another scheduler, approval authority, dependency, general contract generator or Cadence redesign.

This addresses the current blockers. It does not establish that every remaining convergence feature is implemented or can ship within six hours.

## What is actually blocking working software

| Surface | Observation and source | Minimum necessary repair |
|---|---|---|
| Teams approval | The saved run reached a paired-host filesystem approval. All recorded owner, run, workspace, pending identity, event and cursor checks passed. The operation driver demanded raw `file_path`, but received a deliberately redacted action display. No read result exists. | Keep display and prepared execution facts separate. Reuse the protected approval read and private admission record to provide narrowly typed, correlated effect facts needed to review the requested read/edit/write. Correct the operation driver to consume that contract. Do not authorize from a truncated display target. |
| BossFang completion | The retained diagnostic contains eight nonempty text deltas and `agui.done` at cursor 18, followed by a 30-second request timeout. Native observation persisted an old execution projection; desktop correctly waited for authoritative completion. A reconnect after the terminal cursor can wait on an empty replay. | Refresh state through the existing admitted-instance run lookup when returning observation pages. Handle an already-terminal run without waiting for future events, while preserving unread event replay. Keep success dependent on authoritative completion and actual output. |
| Delivery management | One combined operation result couples Teams and BossFang. Many successful builds and launches produced no successful feature operation. | Complete both repairs before a new source freeze. Preserve separate journey receipts; rerun only the failed journey when its applicable inputs permit. Retain honest combined completion. |

The Teams finding is a **driver/inspection contract mismatch**, not evidence that the filesystem tool failed or that ownership rejection remains unfixed. BossFang did perform inference; its terminal state was not observed reliably. The retained receipt lacks a final authoritative UAR task state, so the text and done event alone cannot certify successful delegation.

### Exact repair boundaries

**Teams:** Boss `UarHostToolAdmission.ts:278–287` retains validated arguments and their digest privately; `:437–450` inspection exposes identity/state only; `:693–700` creates a display with operation/server/target. UAR `manager.rs:5552–5558` serializes that display into pending argumentsJson. Boss `UarTeamWorkAdapter.ts:119–129` forwards it. The driver `scripts/c14-operation/approvals.mjs:164` interprets it as original arguments.

Use the existing admission ID and correlated run/tool-call identity to inspect the prepared effect at the host boundary. Keep raw arguments and credentials private. Expose only necessary target/effect facts and digests, scoped to the authenticated pending approval. Do not add an endpoint, duplicate policy evaluation, approve a different invocation, or weaken current owner/hash/cursor checks. The exact fixture-content comparison is operation-driver policy; it must not become a fixture-specific production API. Preserve the ordinary redacted UI; existing details presentation should use only approved safe facts where needed.

**BossFang:** packaged-source `crates/librefang-api/src/routes/uar_delegation.rs:270–303` observes events and advances the cursor without refreshing execution state; `uar_delegation/storage.rs:75–80` only persists/readbacks. Boss `bossFang/diagnostics.ts:276` requires completed plus text. UAR `full_harness/handlers.rs:202–235` determines terminal replay from returned history; empty history after the terminal cursor can wait. Boss `BossFangService.ts:341` times out after 30 seconds.

Prefer the existing native lookup/reconciliation path. Preserve the run's admitted instance, workspace, credential boundary and cursor. Drain available terminal output before finishing observation. If a correction to UAR's empty-terminal replay is necessary for the production client path, make that narrow lifecycle correction within the same completed increment. Merely increasing timeouts or accepting done as success is rejected.

These are localized architectural contract repairs. Previously repaired owner partition and MCP session-lifetime defects remain in the selected source; the current evidence does not justify reimplementing them.

## Source and ownership
Inspected baselines: Boss `49ae6fc5bd0770009c3be77f58053dbbab470986`; UAR `82b673968593ed4a5a51a236e48c8bb1722c66e9`; initiative worktree `32e19a6c696e0078c5efcc8dc2f2dfba5c285668`; packaged BossFang source `bafa21e8d469a41104c07c7281a4e3f97cb16009`. Local changes must be preserved and frozen explicitly; a commit alone does not describe a dirty release input.

Use three independent assignments from the existing team:
1. **Runtime/host contract owner:** complete Teams prepared-effect inspection across Boss/UAR and its operation consumer.
2. **BossFang runtime owner:** authoritative observation refresh and terminal reconnect, against the actual packaged-source worktree.
3. **Desktop/delivery owner:** required UI/types/locales only where these repairs change user behavior; package exact corrected payloads and reconcile existing evidence. No parallel competing edits to the same host modules.

One build writer and one publisher. The lead owns cross-repository contract decisions and canonical task advancement. No reviewer/verifier work during implementation; the completed proposal gets one review now, and the completed software gets actual operation at its delivery boundary.

## Smallest delivery and six-hour envelope
The approved revision 9 explicitly combined Teams with the urgent BossFang repair. It superseded the earlier ordering hold. **This analysis does not silently split that approved deliverable.** Plan should preserve both user journeys but separate their results/retries. A separately releasable Teams-only slice would require an explicit plan amendment; it is not needed merely to avoid rerunning a passing BossFang operation.

Proposed execution envelope, starting after Plan approval:
- Hours 0–2: parallel completion of the two identified repairs and their consumers.
- Hours 2–3: finish packaging inputs and any necessary presentation changes; freeze a uniquely identifiable release candidate.
- Hours 3–5: actual `pnpm build:mac:arm64`, launch and operate the complete Teams and BossFang journeys; correct only demonstrated failures.
- Hour 5–6: reconcile only fully satisfied tasks, commit/push, deliver the local DMG and publish ready authorized Mac/Windows artifacts. Continue platform publication through the existing cadence.

These are **budget allocations, not measured estimates or a six-hour completion promise**. Native binary compilation, new runtime failures and remote installer queues can exceed them. No overlapping candidate churn. If changed product inputs require a rebuild, record why; a driver-only repair can reuse the exact unchanged app, but the feature receipt must name the changed driver. Never relabel old binaries. No additional build for bookkeeping alone.

The boundary operates worker read/change, reviewer handoff and visible artifacts, approval/cancel/reopen behavior, and BossFang's real delegation through the shared UAR with completion/cancellation and persisted configuration. Build, launch, feature operation, publication and installed acceptance remain separate. No unit suites, mock exercises, speculative hardening or broad regression loop is added.

## Honest completion target
Parent accounting remains **34/61 checked entries = 33 COMPLETE + 1 SKIPPED**, and **11/20 changes**; 27 entries remain unfinished. This child has no implementation tasks registered yet. A successful coding journey does not automatically close the broader C14.1 administration or C14.2 lifecycle requirements. Plan must map evidence to each existing criterion and record partial coverage rather than manufacture whole-task completion.

The remaining business-data replication, personal peers, mobile/cloud profiles, broad harness qualification, executive representation and federation requirements cannot honestly be promised in the same six-hour window. Preserve the complete backlog and the smaller customer milestone. Finishing all 61/61 and 20/20 requires those requirements or an operator-approved disposition; skipping them must never be described as implementation.

Existing C15 authoring work is source-only (`5416585c...` Boss; `0dfe689c...` UAR). Retain it for the next useful increment rather than mixing more product scope into the current failed delivery.

## Research, prior lessons and rejected alternatives
Assessment's direct reflection reads supply two applicable lessons: freeze cross-process DTOs with their consumers; adopt matching receipts rather than rebuilding for bookkeeping. The analyze hook supplied no prior-context document or recalled Knowledge gaps list. No learning detour is proposed.

Local primary source answers both current blockers; no external SDK or dependency decision is necessary. This Analyze stage uses tier-1 local inspection and the already verified assessment research, rather than repeating registry/web discovery. [DORA small batches](https://dora.dev/capabilities/working-in-small-batches/) and [WIP limits](https://dora.dev/capabilities/wip-limits/) support bounded work; [Anthropic's long-running harness guidance](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents) supports durable progress. None proves our schedule or substitutes for operating this application.

Rejected: kernel rewrite; raw argument disclosure to unblock the driver; trusting done/health as completion; longer timeout as the repair; rebuilding for unchanged application inputs; adding new features to justify another candidate; counting child paperwork as product completion.

## Review and handoff
One bounded adversarial review of these completed artifacts is recorded under `review/analyze/`. Findings and dispositions must accompany the handoff. Next stage is **Plan**, only after operator review. All product work remains stopped at this stage boundary.

