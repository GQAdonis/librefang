# Decision log — phase-12-sync-uar-refresh-dot-facade

## D-001 · Record assess in projection-only mode while the KBD runtime journal is unusable          [assess · 2026-10-17]

**TL;DR:** The operator approved advancing the `prometheus kbd` journal, but the runtime records `PhaseDefined` events (r5, r6) without applying them, so assess is recorded in the committed projection files only.

**Why:** `kbd_stage_gate assess` compares the working phase with canonical state.
The journal is still on the July phase-10 run, its frontier stops at lamport 2 per replica, and it holds an unresolved lifecycle conflict (`conflict:f488818…`).
Every `phase transition` / `phase activate` after `phase create` fails with "phase … was not found", and the runtime projection overwrote the waypoint with its July state, which was restored from git.
Details are in `assessment.md` under "Stage-gate note".

**Alternatives:** Keep retrying runtime commands (rejected: each append is permanent, and the reducer defect is in the tool, not the project) · Stop the phase until the journal is repaired (rejected: the assessment is independent of the journal, and projections stay authoritative for this repo today).

**Learn more:** `assessment.md` "Stage-gate note" and Open Question Q1.

## D-002 · Operator answers to Q1–Q9 and analyze recommendations          [analyze · 2026-10-17]

**TL;DR:** The operator chose: projection-only KBD state, a G3 child phase, #156 reopened as G3's tracker, BossFang-owned scheduling, settings as profile flag plus config section plus the authoritative settings database, and fixtures in `librefang-testing`. Analyze recommends: the signed webhook durable profile as the v1 adapter (Q3), denying unowned rows under the profile with no quarantine (Q6), and adopting UAR 1.1.0's existing team and mailbox APIs (Q8).

**Why:** Each recommendation is grounded in code evidence in `analysis.md`.
Unowned rows are a live documented state (`workflow.rs:186`), not deprecated data.
Only the webhook durable profile and the Discord sidecars advertise `native_send_receipt`.
The UAR v1.1.1 work adds no capabilities, and team and mailbox already shipped in 1.1.0.

**Alternatives:** Discord as the v1 adapter (deferred to second qualification) · quarantine table for unowned rows (rejected: migration cost for no v1 benefit) · wait for UAR 1.1.1 (rejected for G2 now: unpublished, breaking credential migration).

**Still open:** Q10 (G2 image 1.1.0 now, re-target at 1.1.1) and Q11 (BossFang enforces per-run limits), both with recommendations.

**Learn more:** `analysis.md`, `library-candidates.json`.

## D-003 · Scheduling, follow-ups and wakes move to UAR; G2 targets UAR 1.1.0; BossFang enforces per-run depth and fan-out          [analyze · 2026-10-17]

**TL;DR:** After review found that UAR 1.1.0 already ships durable schedules and follow-ups, the operator reversed Q4: UAR owns scheduling, follow-ups and wakes for the dot profile (Q4′).
G2 targets `ghcr.io/prometheus-ags/universal-agent-runtime:1.1.0@sha256:064f5004…`, with 1.1.1 re-targeted later (Q10).
BossFang's team adapter enforces per-run depth and fan-out, with budgets on UAR durable budgets (Q11).

**Why:** UAR at `d815ef72` implements `dot-durable-schedules` (occurrence dedup, DST handling, overlap guard, budget-gated admission) and `FollowupController` (durable inbox, quiet hours).
#156 forbids scheduling an obligation in both systems.
Rebuilding these in BossFang was G3's largest single item.

**Alternatives:** BossFang owns scheduling (the original Q4 answer; rejected after the evidence, since it needs a full scheduler build plus a UAR disable lever) · wait for UAR 1.1.1 (rejected: unpublished, breaking migration) · a UAR issue for per-run limits first (rejected as a v1 blocker).

**Learn more:** `analysis.md` "Unresolved review findings (round 2)" and "Operator resolution".

## D-004 · Plan continues the existing 2026-10-16 sync and adopts OpenSpec          [plan · 2026-10-17]

**TL;DR:** The plan finishes the unmerged 2026-10-16 upstream sync (`chore/upstream-merge-2026-10-16-schema`) instead of re-merging, widens C-000 to a full green baseline, and switches `project.json` `specBackend` to `openspec` as the phase-10 note scheduled.

**Why:** Plan review round 1 found the 2026-10-16 branches, which already merge 87 upstream commits, resolve the same 28 conflicts, and add SurrealDB parity migrations 050–054 and stores; none of this was on `main` or in any phase-12 artifact.
Their merge report also lists failures already present on `main`, which C-000 now owns so the sync starts green.

**Alternatives:** Re-merge from scratch (rejected: discards completed, documented conflict resolution) · keep native-kbd changes (rejected: `project.json` already scheduled OpenSpec adoption from phase-11).

**Learn more:** `plan.md` "Adversarial review"; `docs/upstream-merges/2026-10-16.md` on `chore/upstream-merge-2026-10-16`.
