# Design

## Context

See proposal.md for motivation and repository scope, and the assessment/source-evidence.json for pinned current observations. Historical gaps are not assumed to persist. This is an initiative-level specification. The local OpenSpec root authorizes planning edits only. Before product implementation, create or link repository-scoped changes in each affected worktree with exact file ownership, existing-spec reconciliation, and this change ID. Do not apply sibling code edits from this planning root.

Repositories: librefang, universal-agent-runtime. Scope: BossFang runtime/task delegation, channel workflow references and UAR public run adapter; no librefang-cli edits. Dependencies: C02, C03, C04. External checkpoints: D-UAR-P1 (definitions in dependencies.md).

## Goals / Non-Goals

**Goals:** Deliver C05 through existing product authorities and observable acceptance.

**Non-Goals:** Retain existing native route; stage consumer capability requirements after provider support. No implementation or service changes occur in this planning package.

## Decisions

- library: cand-002 — **adopt** Accepted P1 UAR driver and host bridge. Adopt only an agreed immutable checkpoint; do not duplicate current integration. Evidence: source-evidence.json and D-UAR-P1; prior research/source evidence reused, no new registry verification Risks: Current runtime conformance and dependency compatibility require the assigned acceptance gate.
- library: cand-006 — **reference** A2A/MCP/AG-UI/CloudEvents boundary conventions. Revalidate selected versions before adoption; protocols do not establish authority/durability. Evidence: Primary references indexed by R1–R6; prior research/source evidence reused, no new registry verification Risks: Current runtime conformance and dependency compatibility require the assigned acceptance gate.
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

Trace direct versus delegated execution; lose responses and reconnect; one executor and one side effect remain, cancellation reaches UAR, unsupported recovery is explicit.

Use repository-required checks and observable real-boundary scenarios; source inspection and planned checkboxes are not execution evidence. Recommendation coverage: REC-001, REC-005, REC-013.
