# Decision Log — phase-11-surreal-recovery-and-uar-convergence

> Per-phase record of consequential decisions.
> `kbd-status` prints the header lines; `kbd-status --explain` expands the full entries.

## D-001 · Record the 2026-09-27 pre-phase out-of-band work          [assess · 2026-09-27]

**TL;DR:** Five PRs landed or opened on 2026-09-27 after phase-10 closed and before phase-11 existed, outside any KBD phase; they are recorded here as the baseline phase-11 starts from.

**Why:** No KBD phase was active for this work, so no change file, progress row or handoff describes it, and phase-11's G1 and G2 depend on it.

| PR | State | Merge SHA | Merged (UTC) | Summary |
|---|---|---|---|---|
| #135 | merged | `4b30ba247e6515aea82ef3ce8eaa28444057cd8d` | 2026-09-27 13:20 | Add the `bossfang-stewards` agent team (roles, skills, ownership) for all harnesses. |
| #136 | merged | `119d7494bcba8934c42d38bd4c42687d19b72d35` | 2026-09-27 19:02 | Upstream sync to `upstream/main` `b5c0803d4` (103 commits) plus SurrealDB `=3.2.4` → `=3.3.0` and surreal-memory `f9ab1c2` → `b7e2093`; report in `docs/upstream-merges/2026-09-27.md`. |
| #137 | merged | `b88e2641bd6c94958baeb121f304f56a0383fddd` | 2026-09-27 20:28 | SurrealDB 3.3 follow-ups deferred by #136: `sessions.messages` array handling and a real embedding dimension for shared memory storage. |
| #138 | merged | `ded34026ced3dd2e66217652499caf0d3b10ea72` | 2026-09-27 20:45 | Commit the compass code-graph reports. |
| #139 | open | head `780bfd3a4a1dc69da1f9d646abb16e0dfc7a8636` | — | Make the agent team the default operating mode and allow `git pull --ff-only` in the main worktree. |

SurrealDB-backed surfaces regressed after #136 and #137.
The regression is being root-caused under G1 (owner: surrealdb-schema-engineer), which bisects across the upstream sync, the SurrealDB 3.3.0 bump and the surreal-memory bump; restoration is G2.
Nothing in this entry asserts that #136 or #137 is correct.

**Alternatives:** Retro-fit the PRs as changes of phase-10 (rejected: phase-10 was already implementation-complete and none of these PRs served its goals) · Write change files under `.kbd-orchestrator/changes/` (rejected: that directory holds planned change specs, not a log of unplanned work).

**Learn more:** `docs/upstream-merges/2026-09-27.md`, and `gh pr view <n> --repo GQAdonis/librefang` for each PR.

---

## D-002 · Open phase-11 by operator direction and reconcile KBD state          [assess · 2026-09-27]

**TL;DR:** Phase-11 was opened by the operator (commit `259f44819`) because phase-10's reflection has no "Recommended Next Phase"; G3 then reconciled phase-10's closure and the phase-11 pointers by hand.

**Why:** `/kbd-next-phase` warned that phase-10 was not reflection-complete and reported "Goals met: 56/66", a project-wide rollup rather than phase-10's 8/8.
It also left `current-waypoint.json` inconsistent (`activePhaseId` and `phaseIds` still named phase-10) and `position.json` still pointed at phase-10.
The canonical runtime (`prometheus kbd status`) for project `eca657d1` is at revision 2, a 2026-07-31 legacy import whose next work is the long-finished `C-URT-001`, while the committed projections claim `sourceRevision` 72.
Replaying transitions through the runtime would write to the shared machine-local event store and re-render projections at a lower revision, so G3 reconciled the projection files by hand, removed the `generatedBy: kbd-runtime` claim from the files it rewrote, and regenerated `position.json` with `kbd_position_sync`.
Re-anchoring the runtime (`prometheus kbd migrate --apply` or a successor `prometheus kbd run`) is an operator decision.

**Alternatives:** Drive the fix through `prometheus kbd phase/stage/completion` (deferred to the operator for the reason above) · Leave the waypoint marked `generatedBy: kbd-runtime` (rejected: the runtime did not produce it, and the marker disables `kbd_position_sync`).

**Learn more:** `../phase-10-uar-sidecar-availability/decision-log.md` D-001, and `kbd-process-orchestrator/shared/lib/runtime-authority.sh`.
