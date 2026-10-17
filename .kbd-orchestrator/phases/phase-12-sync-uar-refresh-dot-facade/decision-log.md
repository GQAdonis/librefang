# Decision log — phase-12-sync-uar-refresh-dot-facade

## D-001 · Record assess in projection-only mode while the KBD runtime journal is unusable          [assess · 2026-10-17]

**TL;DR:** The operator approved advancing the `prometheus kbd` journal, but the runtime records `PhaseDefined` events (r5, r6) without applying them, so assess is recorded in the committed projection files only.

**Why:** `kbd_stage_gate assess` compares the working phase with canonical state.
The journal is still on the July phase-10 run, its frontier stops at lamport 2 per replica, and it holds an unresolved lifecycle conflict (`conflict:f488818…`).
Every `phase transition` / `phase activate` after `phase create` fails with "phase … was not found", and the runtime projection overwrote the waypoint with its July state, which was restored from git.
Details are in `assessment.md` under "Stage-gate note".

**Alternatives:** Keep retrying runtime commands (rejected: each append is permanent, and the reducer defect is in the tool, not the project) · Stop the phase until the journal is repaired (rejected: the assessment is independent of the journal, and projections stay authoritative for this repo today).

**Learn more:** `assessment.md` "Stage-gate note" and Open Question Q1.
