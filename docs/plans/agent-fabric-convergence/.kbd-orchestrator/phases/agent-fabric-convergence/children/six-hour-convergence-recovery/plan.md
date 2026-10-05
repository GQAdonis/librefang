# Plan — six-hour-convergence-recovery
Date: 2026-10-05. Status: proposed for operator review; no product execution authorized by this Plan-stage invocation.
Project: Agent Fabric Convergence. Backend: OpenSpec.
Change: `afc-six-hour-delivery-recovery` (one bounded recovery-plan change, three tasks).

## Outcome and boundary
Restore delivery of usable Teams and BossFang, then reuse the already-written team-authoring work. Keep existing runtime ownership and repair only observed contracts. The requested three two-hour product increments are **full publication → local-only → full publication**.

This child was requested to fix the stalled plan. Its Execute stage installs the approved parent plan, dispatch contracts and cadence policy; its Reflect stage hands control back. Product repairs and their build/operation remain owned by the existing parent/product changes. This avoids the real lifecycle cycle: Cadence refuses parent ready/success while this child is unresolved. Do not pretend child paperwork delivered software.

Stop for operator review after Plan, Execute and Reflect as requested. After child return, use the parent's approved execution route. Planning/review time remains recorded against the existing iteration; no clock or prior failure is erased.

## Three delivery increments
Two hours is the target for the **whole increment**, including implementation, local build and operation. Reserve roughly 30–45 minutes for that boundary; use measured build costs to stop admitting scope earlier if necessary. Remote platform work may outlast the local window; report that separately. Overrun does not create a successful delivery.

| Recovery increment | Complete usable outcome | Required local delivery | Publication |
|---|---|---|---|
| **1** | A coding team in Work performs its bounded repository change with worker/reviewer handoff, inspectable approvals, artifacts and reopen/cancel behavior; BossFang opens from Apps/settings and delegates through the same selected UAR with authoritative completion and cancellation. | `pnpm build:mac:arm64`; launch the packaged app and operate both completed journeys. Fix observed errors before admitting the next active increment. | Commit/push all required source and pins; build **Mac ARM64/x64 + Windows x64/ARM64**; publish GitHub assets, release metadata and **https://the-boss.know-me.tools**. Publish each ready platform promptly. |
| **2** | Reuse the isolated authoring implementation to create/configure/deploy a named coding team, launch it from Work, revise it, and preserve existing runs' pinned definitions. Include required UI, strings, persistence and scoped skills. | Build a new local Mac ARM64 DMG and operate the new authoring journey. Commit the coherent source checkpoint. | **Local-only.** No new full platform dispatch or website update for this increment; finishing increment 1's outstanding publication is still required. |
| **3** | Complete reusable product/design team configuration and its scoped role/model/skill handoff using the same authoring path, including novice guidance and visible effective bindings. Carry over unfinished increment-2 work first. | Build local Mac ARM64 and operate the newly delivered team/configuration path. | Commit/push; full four-platform GitHub release and website update, including increment 2's changes. |

Iterations 2 and 3 are bounded selections from existing C15/C16 scope, not a claim that the source receipt already works. If increment 1 overruns, finish it; do not hide that time by calling its repair increment 2. If a later selection cannot fit, retain a smaller **independently usable** existing capability and explicit carryover, with approval for any material scope change. Never ship broken work to hit the clock.

The six-hour target is three usable increments, **not** a promise to finish every remaining convergence requirement. Publication and native installed acceptance may finish later. No Linux installers.

## Increment 1: exact product repair handoffs
### R1 — truthful Teams approval inspection (`library: cand-001`)
Owner **boss-runtime**. Claim Boss `src/main/ai/runtime/uar/UarHostToolAdmission.ts`, `UarTeamWorkAdapter.ts`, directly required shared types/IPC, and initiative `scripts/c14-operation/approvals.mjs`.
- Reuse private prepared arguments/digest and existing protected pending-approval read.
- Correlate effect facts by admitted run/tool-call/approval identity. Provide only necessary lossless target facts and content/edit digests; keep raw arguments, credentials and full content private.
- Keep redacted display separate from execution facts. Correct the operation consumer's mistaken raw `file_path` assumption; expected fixture content stays in that consumer.
- Preserve ownership, pending identity, hash and cursor checks. No new endpoint or approval authority.
- Touch UAR's projection only if the existing IDs are insufficient; coordinate explicit file ownership first. Do not reopen already-fixed partition/session ownership.

**Done behavior:** from the normal packaged Work route, inspect and approve the intended read/edit, obtain the actual repository change and member artifacts, finish reviewer handoff, and retain visible run state after reopening. These observations cover only mapped C14/C16 criteria.

### R2 — authoritative BossFang observation (`library: cand-002`)
Owner **boss-desktop**, acting as the explicitly authorized BossFang integration writer.
Claim packaged-source `crates/librefang-api/src/routes/uar_delegation.rs` and its storage/client helpers; claim UAR `src/uar/api/full_harness/handlers.rs` only for the observed terminal-replay gap.
- Refresh execution state through the original admitted instance's existing run lookup when returning observation pages.
- Drain unread output; an already-terminal run with empty replay must not await a future event.
- Preserve instance, principal, workspace, cursor and original run binding. Do not treat `agui.done` alone as success or lengthen timeouts to conceal stale state.
- Keep The Boss as supervisor. BossFang never starts/stops UAR.

**Done behavior:** user-invoked diagnostic returns actual model output and authoritative completed state, cancellation is correlated, dashboard/settings remain usable, and stopping BossFang leaves UAR running. Native Windows evidence remains separately required for the relevant full C14 tasks.

### R3 — integrate and deliver, no new product scope (`library: cand-003`)
Owner **boss-lead** for source/pins/build/release; **boss-renderer** only if necessary UI/types/locales change.
- Freeze exact corrected Boss/UAR/BossFang inputs and packaged dashboard/skills. Preserve all existing unrelated changes and source provenance.
- Use a new release version for each publicly released candidate and unique local candidate identification. Never overwrite/relabel an existing immutable release. Determine the next version from actual repository/release state at execution.
- Build changed native payloads once per target and reuse exact checksummed artifacts across installer jobs. One local Rust/build writer; no compilation during unfinished same-surface production edits.
- Preserve separate Teams and BossFang operation results under the combined delivery. Reuse a passing result only when its input/contract identity still applies.
- Operate the real packaged app at the completed boundary. No unit, mock, broad regression or per-edit verification loop. A changed driver alone does not require recompiling unchanged product inputs.

## Cadence policy and recovery mechanics
Use the existing `delivery-cadence@1.2.3`; no skill rewrite.
- Keep `iterationMinutes:120`, autonomous execution (`reviewEvery:0`) within approved parent scope, max three implementers, one build writer, one in-flight publisher.
- Keep all four existing Mac/Windows platforms, metadata and website required; acceptancePlatforms remains empty because installed acceptance is tracked independently, not waived.
- **Recovery delivery 1 publishes immediately, then 3, 5, …** This is a sequence of successful usable deliveries; failed attempts do not consume a publication slot.
- Current inspected state: six successful deliveries, `publicationSchedule.nextCount:7`, every two. Therefore the next successes 7/8/9 already implement full/local/full. Preserve that anchor; do not reset counts or assume global iteration parity.
- Store a reviewed configuration request preserving the existing profile and changing only its authority/policy explanation. Execute through `configure`; historical profiles are immutable. Recheck schedule on execution; if it drifted, explicitly request publication of the first successful corrected candidate through existing supported publication controls, never hand-edit state.
- Existing iteration 8 is `checkpoint-failed`; retain its original 07:58:36Z start, child interval, attempts and failures. After canonical child completion/parent restoration, record `child return`. Finalize the unrecoverable frozen attempt as failed and start an evidence-linked corrective iteration using the supported correction contract. Record recovery work's original start and linkage; a new ID never erases previous elapsed time or supplies successful credit.
- Existing legacy publication obligation `3aa9f8fd-78d2-462f-9584-4f934cabd914` covers C09.4. Reconcile actual immutable prior publication receipts if available. Otherwise carry it into the corrected candidate only through supported, authority-backed replacement with demonstrated source/scope coverage. Never clear it by editing JSON or assume the next release covers it.
- The automatic publisher adapter is currently capability-blocked. Use the existing explicitly authorized release workflow/manual publisher and its real receipt reconciliation; no new daemon or pretend adapter capability. If that reconciliation cannot represent the immutable receipts, report the exact blocker and retain debt rather than counting a dispatch as publication.

Publication sequence: push corrected dependency sources/native manifests → push versioned Boss source → native four-platform installer jobs → GitHub Releases assets/checksums/source/signing metadata → commit/push RELEASES.md and release-manifest → sync and commit/push landing repo → deploy existing site → check each exact live download's artifact identity. One publisher serializes metadata/site changes. Retain the previous valid platform link until that platform's new artifact is ready; display its actual version.

After local success, isolated **existing authorized** work-ahead may continue while frozen builds/publication finish. It is not a second active KBD iteration. Promotion requires no unresolved product failure and publisher capacity. Do not stall independent implementation solely on a remote queue; do not hide publication failure or exceed one in-flight and one pending release.

## Existing task coverage and ownership
- C14.1/C14.2 and coding portions of C16.1/C16.2: increment 1's Work journey. Original administration fields and supported lifecycle verbs remain required; missing coverage remains pending.
- C14.4/C14.3: increment 1's shared UAR and MiniApp journey. Packaging and original customer-platform requirements remain intact.
- C15.1, relevant C15.3, C16.1–C16.3 and supporting C14.1: increments 2–3. Consume the already-written authoring worktrees after increment 1; verify source ancestry when integrating.
- C18.2/C18.3: applicable recovery/publication receipts only, not broad benchmark/federation completion.
- C10 connectors, C11–C13, C15.2 broad harness qualification, C17 and C18.1 remain deferred. No requirement is cancelled by this plan.

Preserve parent **33 COMPLETE + 1 SKIPPED /61**, **11/20 changes** until actual criteria are met. Three recovery-child tasks do not increase the parent numerator. Use canonical `kbd-apply` IDs and mirror OpenSpec after each genuine task completion.

## Child Execute: one short plan-installation change
These are bounded recovery administration tasks, not extra product architecture or test projects. Target one short installation pass, then operator-requested Reflect before parent execution.
1. **1.1 Install recovery repair contracts and parent coverage mapping.** Record the approved parent plan revision; update customer delivery order/map, applicable C14/C15/C16/C18 OpenSpec prose and execution dispatch with R1–R3 above. Preserve existing IDs, unchecked criteria and all partial source work. Do not add another duplicate product task ledger.
2. **1.2 Apply the two-hour full/local/full cadence policy without losing history.** Apply the preserved profile request through the CLI; record next-success anchor, failed-iteration/child-return procedure, legacy obligation and isolated publisher/work-ahead limits. No build, workflow dispatch, history reset or fabricated receipt in this task.
3. **1.3 Complete dispatch handoff and planning closeout.** Confirm scoped ownership/model routes, parent next task C14.1, frozen-source policy and exact commands; make one artifact consistency check, record Karpathy lessons and commit/push only this planning revision. Stop for Reflect review. Reflect archives this recovery change and restores parent; it does not certify repaired software.

Order: 1.1 → 1.2 → 1.3; do not spend the product window redesigning the recovery system. Product R1/R2 then run concurrently under existing parent ownership, followed by R3. No product work launches during Plan.

## Task model assignments
Planning authority is this table for this child; parent product tasks retain their existing `model-dispatch.json` assignments.

| Phase path | Change ID | Backend task ID | Requirements | Provider/model | Effort | Evidence/rationale (2026-10-05) | Harness/worker and handoff | Alternative / prerequisites |
|---|---|---|---|---|---|---|---|---|
| agent-fabric-convergence::six-hour-convergence-recovery | afc-six-hour-delivery-recovery | 1 | Cross-repository contracts, preserve approvals and canonical IDs | OpenAI/gpt-6.1-sol | high | Current parent implementation policy and exposed Codex model; careful bounded editing, no new architecture | Codex native fresh worker, boss-lead role, initiative cwd; return changed paths and coverage diff | gpt-6-astra high only by recorded reassignment; availability listed, execution rechecked |
| agent-fabric-convergence::six-hour-convergence-recovery | afc-six-hour-delivery-recovery | 2 | Stateful cadence configuration and debt preservation | OpenAI/gpt-6.1-sol | high | Same native policy; supported CLI and observed nextCount 7 | Codex native, same owner serially; receipt to execution.md; no concurrent state writer | Same alternative; need fresh status before mutation |
| agent-fabric-convergence::six-hour-convergence-recovery | afc-six-hour-delivery-recovery | 3 | Handoff, truthful consistency and scoped commit | OpenAI/gpt-6.1-sol | medium | Bounded work but shared-state risks favor one continuing owner | Codex native same worker; lead owns KBD completion and review stop | gpt-6-luna medium only for isolated prose after explicit reassignment |

Backend IDs 1/2/3 are the exact ordinals emitted by kbd-apply list; their OpenSpec displayed labels remain 1.1/1.2/1.3. This is identity reconciliation, not a scope change.

Native tool supports fresh agents with model/effort overrides; inherited full-history forks cannot change model. Implementation dispatch rechecks model policy and exact task first; no workers start while planning. Parent R1/R2 follow current gpt-6.1-sol implementation policy; architecture escalation remains gpt-6-astra. Tools: filesystem/Git, canonical KBD/OpenSpec/Cadence Node CLIs; relevant Rust/async skills only when parent crate edits begin.

Cross-harness policies remain: Claude opus/sonnet/haiku, OpenCode configured github-copilot IDs, Kimi k3 where available; these are configuration entries, not newly verified execution routes. DeepSeek native route is unresolved. If selected model is non-native, use the documented external Codex worker or a verified liter-llm plus tool-enabled worker, never a bare inference call as an executor. Preserve unsupported-route reporting.

## Acceptance and stop
One bounded adversarial review of this plan, then one consistency check of completed planning artifacts: task IDs, scope mapping, full/local/full schedule, no premature completion, no lifecycle cycle. No product tests/builds in this child plan-installation change.

Child completion means a usable recovery instruction set installed and reflected. Parent delivery completion requires build + packaged launch + feature operation; publication additionally requires actual assets, metadata and live site. Windows/Mac installed acceptance remains separately recorded.

Prior lessons: freeze contracts with consumers; reuse matching receipts instead of rebuilding for bookkeeping. Analyze's local source findings answer the repair scope; no further broad research/library selection is needed. Missing prior-context recall is not filled with invented lessons.

**Next command after reviewing this plan:** `/kbd-execute six-hour-convergence-recovery`. Stop after that installation for `/kbd-reflect six-hour-convergence-recovery`, then resume `/kbd-execute agent-fabric-convergence`.
