# Design

## Context

See proposal.md for motivation and repository scope, and the assessment/source-evidence.json for pinned current observations. Historical gaps are not assumed to persist. This is an initiative-level specification. The local OpenSpec root authorizes planning edits only. Before product implementation, create or link repository-scoped changes in each affected worktree with exact file ownership, existing-spec reconciliation, and this change ID. Do not apply sibling code edits from this planning root.

Repositories: librefang, universal-agent-runtime, the-boss, flint-gate, flint-realtime-fabric, flint-forge, surreal-memory-server, know-me-app, know-me-system, prometheus-skill-pack, prometheus-skills-mini. Scope: Planning directory; read-only product source and existing phase records. Dependencies: none. External checkpoints: D-UAR-P1, D-MINI, D-FRF, D-FORGE, D-GATE, D-KNOWME, D-MEMORY (definitions in dependencies.md).

## Goals / Non-Goals

**Goals:** Deliver C01 through existing product authorities and observable acceptance.

**Non-Goals:** No product code; later changes may start only after their relevant dependency checkpoint is satisfied. No implementation or service changes occur in this planning package.

## Decisions

- Produce the local contracts and composed profile using the existing product architecture; no external dependency is selected by this change.
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

Every REC has a source disposition, owner and acceptance reference; all 11 baselines resolve; no unresolved ownership is labeled execution-ready.

Use repository-required checks and observable real-boundary scenarios; source inspection and planned checkboxes are not execution evidence. Recommendation coverage: REC-007, REC-011, REC-012, REC-042.
