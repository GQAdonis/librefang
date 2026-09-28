# Decision log — phase-10-uar-sidecar-availability

## 2026-07-11 — Contested integration shape

**Options:** (A) child process in-container · (B) native k8s sidecar container · (C) client of the existing standalone `uar` Deployment

The three shapes were genuinely contested because they differ on the single property the phase exists to deliver — **lifecycle control from the BossFang console** — and research showed a working UAR Deployment already exists, making (C) nearly free.

| | Control | Local/desktop | Effort |
|---|---|---|---|
| A — child process in-container | **full** (start/stop/restart) | **yes** (identical behaviour) | L |
| B — native k8s sidecar container | health + use + test only — a container cannot start/stop a *sibling* container from inside the pod | no | M |
| C — client of existing Deployment | none ("use and test" only) | no | S |

**Decision: (A) child process in-container.** | **Provenance: user** (`AskUserQuestion`, kbd-analyze)

Rationale: only (A) satisfies "run, used, and tested from the web console" — (B) and (C) deliver *use* and *test* but not *run*. (A) is also the only shape that behaves identically on a laptop and in the cloud, and it needs no Service DNS or NetworkPolicy changes.

Mechanism: librefang spawns UAR's `uar-sidecar` binary as a supervised child (`READY:{port}` stdout handshake; stdin-EOF shutdown). The binary is baked into the BossFang image via multi-stage `COPY --from=<uar-image>` and resolved with `current_exe()` → `~/.librefang/bin/` → PATH, so **PATH is never load-bearing** — which is the root cause of the reported bug.

Cost accepted: UAR must add `uar-sidecar` to its release/image build (see below), and UAR's `/opt/uar` assets must be carried into the image.

## 2026-07-11 — `uar-driver` retirement posture

**Options:** un-force now + delete later · delete outright · leave as-is

**Decision: un-force now, delete later.** | **Provenance: user** (`AskUserQuestion`, kbd-analyze)

Drop the unconditional `features = ["uar-driver"]` edge at `librefang-kernel/Cargo.toml:16`, making the feature genuinely opt-in (as `CLAUDE.md` already — wrongly — claims it is). Keep the driver code in-tree but unbuilt for one release; delete it and the `universal-agent-runtime` git dependency once the sidecar path is proven in production.

Backing evidence (`cargo tree -i surrealdb`): `universal-agent-runtime` pins `surrealdb = "=3.2.1"` (**exact, rigid**) while `surreal-memory` pins `3.2.0` (**caret, flexible**). **UAR is the sole source of the lockstep pin.** Un-forcing it removes that constraint from the default build — ending the coordinated three-repo version dance that this session's upstream merge had to pay again.

## 2026-07-11 — Build-vs-adopt: no new dependencies

**Decision: adopt UAR's published image; reuse librefang's own supervisor and HTTP stack; build nothing third-party.** | **Provenance: research**

- Supervision — **reuse** `librefang-channels/src/sidecar.rs`, which already implements spawn, stderr classification, and restart-with-backoff (`sidecar.rs:502-520`). An external supervision crate was rejected as duplicating proven in-tree code.
- HTTP + SSE — **reuse** `reqwest 0.13` (`stream` feature), `futures`, `tokio-stream`, all already in the workspace. `reqwest-eventsource` and `tonic`/gRPC were rejected as unnecessary.
- Binary resolution — **generalize** the existing `resolve_sidecar_command` (`sidecar.rs:728`) rather than copy-pasting a UAR-specific variant. Notably, a `which`-style crate was rejected on principle: PATH lookup is the mechanism we are deliberately removing.

Net: **zero new third-party dependencies** in this phase.

## 2026-07-11 — Blocking upstream change identified

`GQAdonis/universal-agent-runtime` does not currently build or publish the `uar-sidecar` binary — `grep -c uar-sidecar .github/workflows/release.yml` → **0**, and `Dockerfile:225` builds only `--bin universal-agent-runtime`. Adding it is small and additive, in a repo we control, on the branch family already cut this session (`sync-gqadonis-8c7377a1`). **This blocks G-1 and must land before librefang's spawn path can be tested end-to-end.**

## 2026-07-31 — Preserve the sidecar boundary; repair its startup protocol

**Decision: keep UAR as a supervised sidecar, not an embedded library.** | **Provenance: design spike + adversarial review**

Embedding would not remove nondeterminism; it would move process-global environment, provider
runtime, and failure isolation into BossFang's address space. The actual defect was narrower:
UAR released a reserved port and announced readiness before the server owned the listener.
UAR now retains the listener through startup and announces `READY` only after successful bind
and initialization. Process-global environment bootstrap runs synchronously before Tokio's
multithread runtime is constructed.

BossFang owns lifecycle, bounded restart policy, endpoint publication, authentication, and
operator diagnostics. UAR owns its HTTP/runtime boundary and treats a loopback supervising
parent as trusted by default. Timing-sensitive retry assertions were removed from subprocess
tests and replaced with deterministic in-memory policy tests; subprocess tests now verify only
observable process behavior.

The repaired contract is pinned by immutable source SHA
`2aaeadd9c28f27532a03e68d5035b248a0cef5b8`, independently probed from GHCR, and exercised
through BossFang's authenticated `/api/uar/test` route. A final adversarial review passed with
zero critical, warning, or suggestion findings.

## D-001 · Close phase-10 without a recommended next phase          [reflect · 2026-09-27]

**TL;DR:** Phase-10 is closed at `reflect_complete` with 8/8 implementation, evidence and publication COMPLETE, and certification waived; phase-11 was opened by operator direction, not seeded from this reflection.

**Why:** `reflection.md` has no "Recommended Next Phase" section, so `/kbd-next-phase` (commit `259f44819`) had nothing to seed and warned that the stage was not reflection-complete.
The waypoint it read carried `implementationCompleted 56 / implementationTotal 66`, which is the project-wide rollup from `position.json` (all eleven phases, including unfinished phase-8 and phase-9), not phase-10's own 8/8 change counter; that is where the "Goals met: 56/66" report came from.
Reconciliation on 2026-09-27 (phase-11 G3) wrote the missing `execute` and `reflect` handoffs with `kbd_stage_handoff_write`, set the stage flags in `progress.json`, recorded evidence from `verification.md` and merged PRs #108, #109, #112, #118 and #120, and recorded publication from PR #120 plus the pinned GHCR image `2aaeadd9`.
Certification is waived rather than claimed: no signed `prometheus kbd gate` receipts exist, and the canonical runtime replica for this project is still at revision 2 (a 2026-07-31 legacy import) while the committed projections claim `sourceRevision` 72.

**Alternatives:** Retroactively add a "Recommended Next Phase" section to `reflection.md` (rejected: it would fabricate a recommendation that was never made) · Mark certification COMPLETE from the unsigned gate results (rejected: those are evidence, not signed certification) · Replay the missing transitions through `prometheus kbd` (deferred to the operator: it writes to the shared machine-local event store and would re-render projections at a revision lower than the committed 72).

**Learn more:** `verification.md`, `handoffs/execute.handoff.json`, `handoffs/reflect.handoff.json`, and `../phase-11-surreal-recovery-and-uar-convergence/decision-log.md`.
