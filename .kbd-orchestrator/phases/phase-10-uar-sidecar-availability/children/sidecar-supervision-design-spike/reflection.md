# Phase Reflection: sidecar-supervision-design-spike

**Project:** BossFang
**Date:** 2026-07-31
**Phase completion:** 90% — implementation goals and child exit are complete; canonical KBD initialization, full-workspace certification, and the upstream UAR handshake fix remain open.
**Changes completed:** 1 / 1 in the reconciled legacy child ledger and execution evidence.

## Delta

The initial response to the flaky retry-cap test increased a startup timeout. That diverged from the correct design objective: the test was meant to prove retry policy, but it crossed Python process startup, filesystem persistence, OS scheduling, and wall-clock timeout boundaries.

C-SPK-001 replaced that accidental test seam. Retry outcomes now carry `ready_uptime: Option<Duration>`; adapters measure only after protocol-specific readiness, and the policy engine no longer acquires a clock. Five policy invariants are tested by an in-memory scripted contract. The Python/filesystem retry-cap test and elapsed performance assertions were removed, while real spawn/READY/HTTP/EOF/crash integration coverage remains.

The execution-model assessment did not validate the premise that embedding would solve timing. It retained the HTTP/process boundary and recommended environment-specific lifecycle ownership: BossFang child supervision locally, kubelet/service ownership in Kubernetes, and optional future embedding only behind a supported cancellable UAR library service.

## Root Causes

1. **Contract mismatch in tests:** a pure retry-count invariant was asserted indirectly through an OS process.
2. **Semantic clock ownership:** `supervise_contract` started its clock before spawn, so slow startup incorrectly counted as stable uptime.
3. **Upstream startup race:** the pinned UAR sidecar releases its ephemeral listener and prints `READY` before configuration and server bind; health probes prevent false healthy state but do not remove the port race.
4. **KBD control-plane mismatch:** local migration initialized project runtime state, but typed stage/change commands hit a daemon serving a different project and returned `404 unknown KBD project`. The migration was rolled back from its automatic backup; the legacy child ledger was then reconciled to 1/1 and exited successfully, while canonical initialization remains unresolved.
5. **Repository baseline:** full workspace clippy is blocked by an unchanged `origin/main` trait/test-stub mismatch in `crates/librefang-kernel-handle`.
6. **Research infrastructure:** the exhaustive deep-research job remained at initializing/0%; primary-source research was used and the degradation was recorded.

## Corrective Actions

- Completed: carry post-readiness uptime in retry outcomes and test retry policy in memory.
- Completed: remove scheduler-performance upper-bound assertions; retain generous watchdogs only to prevent integration-test hangs.
- Completed: persist a blocking repository constraint that recurring timing failures require seam/design analysis, not timeout increases.
- Required upstream: retain the UAR listener through server startup and make the READY/BOUND signal truthful.
- Required KBD tooling: allow standalone canonical commands to commit to the local runtime or register/switch the control daemon's active project.
- Required repository maintenance: fix the kernel-handle test stub in a separate baseline change, then rerun full workspace clippy.

## Goals

| Goal | Status | Notes |
|---|---|---|
| Assess the shared supervision/UAR architecture | MET | Compared embedded, child-process, Kubernetes, and hybrid models; retained process isolation with explicit falsifiers. |
| Separate deterministic policy and OS-boundary tests | MET | Five in-memory policy tests now own retry invariants; process tests own spawn/protocol/lifecycle behavior. |
| Recommend and implement the smallest correction | MET | Two source files, no new dependency, one outcome-field semantic correction plus focused test changes. |

## Delivered Changes

- `C-SPK-001` — deterministic supervision policy at the readiness boundary (by: Codex).

## Verification

- PASS: 563 crate unit tests, 29 integration tests, 5 protocol tests, and 3 doc tests.
- PASS: 13 UAR process-boundary tests on five consecutive runs.
- PASS: formatting, changed-crate clippy with `-D warnings`, workspace library check, branding audit, and diff whitespace check.
- BLOCKED baseline: workspace all-target clippy, solely on three unchanged E0050 errors in the kernel-handle test stub. Exact files match `origin/main` at `ad3b34b16b248db999db6760a70ec3067e494a23`.

## Artifact Quality Summary

| Metric | Value |
|---|---|
| Changes with artifact-refiner QA | 0/1 — skipped by the fewer-than-three-files heuristic |
| Artifact-stage adversarial reviews | assess, analyze, plan |
| Final plan verdict | PASS after required verification criteria were corrected |
| Sycophancy findings | no agreement bias; assess length-only advisory |

## Technical Debt

- Upstream UAR still has the released-port and premature READY behavior.
- The child change is implemented and exited in the legacy ledger, but cannot be represented in a canonical runtime until the KBD control-plane project mismatch is repaired.
- Repository-wide clippy certification remains blocked by the unrelated origin/main kernel-handle stub mismatch.
- The UAR retry integration smoke still uses a real process and counter file intentionally; it tests adapter reconnection, not generic retry arithmetic.

## Architecture Integrity

- AGENTS.md violations: NONE.
- Constraint violations: full workspace clippy is unresolved, so repository-wide certification is partial; no lint or test was suppressed.
- BossFang preservation/branding: PASS.
- Scope: only the two explicitly allowed source files were changed by the child implementation.

## Cross-Tool Coordination Notes

- Progress tracking: PARTIAL — the legacy child ledger and parent rollup are consistent, but the local canonical runtime and configured daemon disagree on project identity, so typed canonical updates fail.
- Handoff quality: CLEAR — assessment, analysis, plan, execution, and verification artifacts preserve the decision and evidence despite the ledger fault.
- Recommendation: control-plane commands need a local fallback or explicit project registration/switch operation; migration must not leave a locally valid runtime that remote commands cannot mutate.

## Lessons Learned

- A recurring timing failure is evidence about the test seam until proven otherwise; increasing the timeout is not a root-cause fix.
- Put policy data at the semantic owner: adapters know when readiness begins, while the retry engine should consume elapsed-ready data.
- Threads/tasks reduce communication overhead but do not remove scheduler, network, provider, blocking-work, panic-abort, or shared-resource nondeterminism.
- Use process integration tests for process contracts and in-memory contracts for policy invariants.
- A READY signal emitted before retained bind/configuration is a protocol defect even when a later health probe masks false health.
- Verification results and lifecycle bookkeeping are independent; when canonical migration is unsafe, roll it back and reconcile only the supported ledger rather than fabricating canonical completion.

## Next Phase Focus

1. Fix UAR upstream startup to pass a retained listener into the server and define truthful BOUND/READY semantics.
2. Repair the KBD control-plane project registration/switch path before retrying canonical initialization; C-SPK-001 is already reconciled and exited in the legacy ledger.
3. Fix the origin/main kernel-handle test stub in a separate baseline change and restore full workspace clippy certification.

## Context for Parent Phase

The UAR sidecar remains the recommended default for the full runtime. The sidecar boundary is not what made the retry-cap test flaky; testing generic policy through that boundary did. Parent phase 10 should keep the HTTP client/local-or-remote endpoint design, incorporate this deterministic policy seam, and track the upstream retained-listener fix as a separate dependency.
