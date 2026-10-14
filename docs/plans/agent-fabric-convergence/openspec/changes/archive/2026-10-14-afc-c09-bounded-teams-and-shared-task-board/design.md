# Design

## Context

See proposal.md for motivation and repository scope, and the assessment/source-evidence.json for pinned current observations. Historical gaps are not assumed to persist. This is an initiative-level specification. The local OpenSpec root authorizes planning edits only. Before product implementation, create or link repository-scoped changes in each affected worktree with exact file ownership, existing-spec reconciliation, and this change ID. Do not apply sibling code edits from this planning root.

Repositories: universal-agent-runtime, surreal-memory-server. Scope: UAR team domain/store, existing thread admission and memory scopes. Dependencies: C02, C03, C04, C06. External checkpoints: D-UAR-P1, D-MEMORY (definitions in dependencies.md).

## Goals / Non-Goals

**Goals:** Deliver C09 through existing product authorities and observable acceptance.

**Non-Goals:** No replacement thread engine, global shared transcript or union of member permissions. No implementation or service changes occur in this planning package.

## Decisions

- library: cand-001 — **adapt** Existing UAR execution/thread/actor/compiler. Keep the existing trusted host; add missing lifecycle/team contracts. Evidence: R3 and R5; source-evidence.json; prior research/source evidence reused, no new registry verification Risks: Current runtime conformance and dependency compatibility require the assigned acceptance gate.
- Keep product conversation history in The Boss and execution context/checkpoints in the owning runtime. A delegated run has one executor; orchestration does not duplicate that loop.
- Prefer additive provider capability before consumer enforcement; reject required unsupported semantics rather than dropping them. Alternative: an all-at-once multi-repository cutover; rejected because Git branches provide no atomic multi-repository release.
- Use the sequential dependency order until exact file claims and resource isolation permit concurrency. Alternative: simultaneous writers on matching branches; rejected because matching names neither resolve semantic conflicts nor isolate shared resources.

## Risks / Trade-offs

- Active integration can supersede gaps → consume immutable agreed checkpoints before assigning product files.
- Delivery groups below exceed a single-session assignment → decompose into repository-scoped, single-session tasks after C01; retain IDs and acceptance links. They are not directly dispatchable execution tasks.
- Shared ports, databases, build caches and tool installations escape Git isolation → use isolated data roots and explicit resource ownership; one local Rust build writer.

## Migration Plan

Reconcile current source and existing product specs; record accepted dependency and file-ownership checkpoints. Deliver provider changes with backward-compatible consumers where possible, then pin consumer adoption. Run this change's acceptance and relevant operational-mode rows. Record schema compatibility and rollback limitations before promotion; do not reverse already-issued external effects through a code rollback.

## Verification

Competing workers cannot own one revision; stale worker/removal cannot cause new protected effect; parent cancel and independent peer lifetime remain distinct; team cap holds under concurrency.

Use repository-required checks and observable real-boundary scenarios; source inspection and planned checkboxes are not execution evidence. Recommendation coverage: REC-008, REC-043, REC-044, REC-045.

## Approved architecture recovery — 2026-09-30

The [architecture recovery amendment](architecture-recovery-amendment.md) controls remaining C09.3 delivery A and additive C09.4 delivery B. Preserve completed receipts; both new runtime outcomes remain pending.
