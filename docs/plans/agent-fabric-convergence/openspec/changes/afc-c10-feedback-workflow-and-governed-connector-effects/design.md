# Design

## Context

See proposal.md for motivation and repository scope, and the assessment/source-evidence.json for pinned current observations. Historical gaps are not assumed to persist. This is an initiative-level specification. The local OpenSpec root authorizes planning edits only. Before product implementation, create or link repository-scoped changes in each affected worktree with exact file ownership, existing-spec reconciliation, and this change ID. Do not apply sibling code edits from this planning root.

Repositories: universal-agent-runtime, librefang, the-boss, prometheus-skill-pack, prometheus-skills-mini, flint-gate, surreal-memory-server. Scope: UAR workflow/effect records and connector boundary; BossFang feedback ingress; existing studio approval/artifact views; consume C02 Gate policy and C09 memory-scope/effect evidence; modify Gate or memory adapters only for a demonstrated integration gap with its owner. Dependencies: C05, C07, C08, C09. External checkpoints: D-UAR-P1, D-MINI, D-GATE, D-MEMORY (definitions in dependencies.md).

## Goals / Non-Goals

**Goals:** Deliver C10 through existing product authorities and observable acceptance.

**Non-Goals:** Connector-specific idempotency and regulated-data eligibility are prerequisite evidence; no financial action in first slice. No implementation or service changes occur in this planning package.

## Decisions

- The operator selected UAR's existing durable team runtime as the C10 workflow owner on 3 October 2026 after the source comparison in `c10-workflow-substrate-decision.md`. Reuse its admission, dispatch, settlement, wait and recovery authority; add pinned workflow progression and the artifact-bound human decision. Measure recovery, embedding/offline behavior, ownership, throughput and cost only at the completed workflow integration gate. This supersedes the earlier pre-selection measurement sequence; source comparison does not certify runtime behavior.
- library: cand-007 — **reference pattern**, not an instantiated engine. Its candidate record names no package, version or registry. Keep it unmeasured rather than inventing a benchmark or product selection. LibreFang's current workflow engine remains a source comparison candidate; neither becomes a second UAR executor.
- Keep product conversation history in The Boss and execution context/checkpoints in the owning runtime. A delegated run has one executor; orchestration does not duplicate that loop.
- Prefer additive provider capability before consumer enforcement; reject required unsupported semantics rather than dropping them. Alternative: an all-at-once multi-repository cutover; rejected because Git branches provide no atomic multi-repository release.
- Use the sequential dependency order until exact file claims and resource isolation permit concurrency. Alternative: simultaneous writers on matching branches; rejected because matching names neither resolve semantic conflicts nor isolate shared resources.
- Historical pre-selection sequence, superseded by the 3 October decision above: first produce workload requirements and compare workflow substrates on recovery, embedding/mobile/offline constraints, idempotency/effect handling, scheduler ownership, throughput and cost. Implement against a selected adapter contract only after that decision; no external engine is presumed.

## Risks / Trade-offs

- Active integration can supersede gaps → consume immutable agreed checkpoints before assigning product files.
- Delivery groups below exceed a single-session assignment → decompose into repository-scoped, single-session tasks after C01; retain IDs and acceptance links. They are not directly dispatchable execution tasks.
- Shared ports, databases, build caches and tool installations escape Git isolation → use isolated data roots and explicit resource ownership; one local Rust build writer.

## Migration Plan

Reconcile current source and existing product specs; record accepted dependency and file-ownership checkpoints. Deliver provider changes with backward-compatible consumers where possible, then pin consumer adoption. Run this change's acceptance and relevant operational-mode rows. Record schema compatibility and rollback limitations before promotion; do not reverse already-issued external effects through a code rollback.

## Verification

Real configured test accounts or controlled production-compatible endpoints demonstrate one issue after timeout/restart, no sensitive egress, no replay posts, no issue-to-implementation auto-authorization.

Use repository-required checks and observable real-boundary scenarios; source inspection and planned checkboxes are not execution evidence. Recommendation coverage: REC-039, REC-046, REC-053, REC-056, REC-059.

## Approved customer-priority revision — 2026-10-05

C10.1 remains complete. The operator reschedules C10.2 before further connector work. GitHub issue effects and C10.3 feedback progression follow Teams in Work, reusable team configuration, shared BossFang/UAR integration and the MiniApp. Notion, Slack and Jira adapter coverage remains pending outside the customer milestone; shipping GitHub cannot complete all of C10.2. The first customer feedback profile requires explicit approval of the issue draft. Scoped standing authorization remains separate retained coverage. Reuse the selected UAR workflow owner; do not reopen substrate selection.

Delivery evidence maps to the original task IDs; partial delivery is not whole-task completion. The parent phase plan and delivery coverage map select bounded repository-owned work. Complete production wiring, UI, strings, persistence and packaged inputs before the build-and-operate boundary; no per-edit verification loop.
