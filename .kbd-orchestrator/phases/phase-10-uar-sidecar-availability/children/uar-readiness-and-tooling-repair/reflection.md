# Phase Reflection: uar-readiness-and-tooling-repair

**Project:** BossFang
**Date:** 2026-07-31
**Phase completion:** 100%
**Changes completed:** 3 / 3

## Delta

The child began with three unresolved defects, not with a need to replace the sidecar architecture. The pinned UAR runtime released its ephemeral port and printed `READY` before configuration and server bind; KBD migration flattened child identity and misread real annotated/ordered legacy state while the daemon served another project; the BossFang all-target gate exposed three stale kernel test-stub signatures.

All three deltas are closed. UAR now retains one listener through initialization and emits readiness only after its primary HTTP application is ready; the merged runtime was published, independently probed, and pinned by exact SHA. KBD now preserves nested identity and normalized legacy completion, installs a durable focused service, and has replayed typed mutations against the canonical BossFang project. The kernel fixture now conforms to its trait and full workspace Clippy is green.

The architecture conclusion did not change: UAR is an isolated provider/runtime subsystem consumed through a supervised process and HTTP/SSE contract. The former flakiness came from testing retry policy across process, filesystem, scheduler, and wall-clock boundaries, while the startup race came from a defective listener/readiness protocol. Neither defect is evidence that UAR should share BossFang's address space.

## Root Causes

1. **UAR protocol ownership:** the sidecar treated a discovered port number as a reservation, dropped the actual listener, and announced readiness before fallible initialization.
2. **KBD migration assumptions:** exact enum parsing did not accept annotated status text; hierarchy derivation ignored directory ancestry; `ordered_changes` and empty `changes` were not normalized consistently.
3. **KBD operational focus:** repository identity and daemon focus were configured independently, so authenticated commands reached a healthy service that correctly rejected the unknown project.
4. **Certification drift:** `KernelHandleStub` did not follow three trait signature additions because narrow checks did not compile the all-target/test-stub combination.
5. **Lifecycle bookkeeping:** the child plan was reviewed and executed, but its plan handoff file was initially absent; the execute gate detected the omission before reflection and it was reconstructed from existing spec/plan evidence.

## Corrective Actions

- Retain the Tokio listener continuously and pass ownership directly into Axum; signal stdout readiness through a one-shot only after application initialization.
- Test listener exclusivity and negative readiness deterministically; keep process tests focused on process/protocol behavior.
- Publish commit-addressed images, verify the executable in CI and independently, and pin BossFang only after both proofs pass.
- Parse the status token rather than the full annotated string; derive child IDs/parents from ancestry; normalize both `changes` and `ordered_changes`.
- Make KBD focus an explicit cross-platform installer input, track the immutable project manifest, and require backup, semantic migration, typed mutation, idempotency, and restart replay evidence.
- Compile the kernel-handle test-stub surface under the required all-target workspace Clippy gate.
- Treat stage handoffs as executable gates; missing bookkeeping must block the next stage even when implementation is complete.

## Goals

| Goal | Status | Notes |
|---|---|---|
| Make UAR retain its listener and emit truthful readiness | MET | Runtime PR #5 merged; focused tests, GHCR workflow 30659172511, independent manifest/executable probes, exact BossFang pin, and OpenSpec archive PR #6 all pass. |
| Repair canonical KBD identity initialization and prove typed mutations | MET | Skill-system PR #37 merged; focused service, 14-file verified backup, 10-ledger migration, revision-16 idempotency/restart proof, and subsequent C001 typed execution all pass. |
| Fix the independent kernel-handle all-target mismatch | MET | Fixture-only signature repair passed focused tests and full `cargo clippy --workspace --all-targets -- -D warnings`. |

## Delivered Changes

- `C-URT-001` — retained-listener/truthful-READY UAR runtime, immutable image publication and BossFang pin (by: Codex; UAR PRs #5 and #6).
- `C-URT-002` — identity-safe KBD migration, focused service installation, canonical initialization, and replay proof (by: Codex; skill-system PR #37).
- `C-URT-003` — fixture-only kernel-handle trait conformance repair (by: Codex).

## Verification

- PASS: UAR listener-retention and startup-failure tests, binary check, focused OpenSpec validation, and four adversarial rounds.
- PASS: GHCR exact-SHA workflow and independent `linux/amd64` manifest/pull/executable probe.
- PASS: KBD 22-test runtime suite, all-target runtime Clippy, installer rendering test, migration inventory, backup hashes, HTTP identity, idempotency, and restart replay.
- PASS: BossFang workspace library check, all-target Clippy, kernel feature tests, 14 sidecar supervisor tests, 2 API subprocess integrations, formatting, branding, and diff integrity.

## Artifact Quality Summary

| Metric | Value |
|---|---|
| Changes with artifact-refiner QA | 2/3 |
| First-pass pass rate | 0/2 (0%) |
| Changes requiring refinement | 2 |
| Total refinement iterations | 6 |
| Final adversarial verdicts | 2 PASS, zero findings |

### Recurring Constraint Violations

None recurred across changes. C001 required protocol/publication-contract corrections; C002 required format-aware rendering, portable tests, and complete legacy-shape normalization. C003 was exempt from artifact-refiner by the bounded single-file heuristic and was certified by focused plus workspace gates.

## Technical Debt

- The UAR repository still has 495 pre-existing repository-wide Clippy diagnostics outside the repaired files. The child resolved every change-local diagnostic and did not suppress the baseline.
- UAR's repository-wide `openspec validate --all` reports 131 unrelated pre-existing invalid items. The archived sidecar protocol spec validates independently.
- The GHCR workflow emits pre-existing action-runtime annotations for Node 20 deprecation and an empty optional `github_token` BuildKit secret; publication and executable verification succeed, but the workflow should be modernized separately.
- The published UAR image currently provides `linux/amd64` plus its attestation manifest, not a native arm64 runtime image.
- Parent phase changes C006–C008 remain canonical `PENDING` even though their implementation commit exists. The parent must reconcile and certify them in order rather than inheriting completion from this child.

## Architecture Integrity

- AGENTS.md violations: NONE.
- Constraint violations introduced by this child: NONE.
- Main worktrees: untouched; all source edits used linked worktrees.
- BossFang preservation and branding: PASS.
- Sidecar decision: retained. Process isolation, independent failure domain, deployment flexibility, and a narrow HTTP/SSE contract outweigh in-process call overhead. Embedding becomes rational only if UAR exposes a supported cancellable library service and measured latency/footprint falsifies the process boundary.

## Cross-Tool Coordination Notes

- Progress tracking: RELIABLE after repair. Typed tasks, changes, stages, projections, duplicate-command behavior, and restart replay agree on the same project and revisions.
- Initial gap: migration/project focus and one missing plan handoff prevented trustworthy lifecycle progress; both were detected by hard gates and repaired from source evidence rather than by editing projections.
- Handoff quality: CLEAR after repair. Assessment, analysis, plan, execution, verification, refinement, adversarial, and publication evidence are all persisted under the child.
- Recommendation: keep immutable command IDs and stage gates; expose project focus/status more prominently so a healthy but wrong-project daemon is immediately obvious.

## Lessons Learned

- A port number is not a reservation; retain the listener object across every fallible startup step.
- Readiness is a semantic milestone, not an early log line. It must be emitted by the component that knows initialization completed.
- Threads do not make scheduler or external I/O timing controllable; deterministic tests come from moving policy behind an injectable semantic seam.
- Migration must be tested against the shapes that actually exist: annotations, nested directories, empty preferred fields, and populated fallbacks.
- A healthy control daemon can still be the wrong daemon for the project. Identity, authentication, and focus are separate checks.
- Immutable publication evidence belongs in the completion contract when another repository consumes the artifact.
- Lifecycle gates are useful precisely when implementation appears done: the missing plan handoff was found before closure instead of becoming silent process debt.

## Next Phase Focus

Resume parent `phase-10-uar-sidecar-availability` at C006:

1. Reconcile the already-implemented supervisor against the now-published truthful UAR artifact and mark C006 only from parent-owned evidence.
2. Verify and reconcile C007's HTTP/SSE `UarDriver` behavior against the exact pinned runtime.
3. Complete C008's operator UI flow and the parent phase's evidence/certification/publication dimensions.

## Context for Parent Phase

The child removes the external blockers that prevented honest parent certification. The sidecar design is sound for the current product: BossFang owns lifecycle and retry policy, UAR owns provider/runtime concerns, and their contract is retained-listener readiness plus HTTP/SSE. Parent work should continue from C006 without reopening the sidecar-versus-library decision unless new measured evidence falsifies this boundary.
