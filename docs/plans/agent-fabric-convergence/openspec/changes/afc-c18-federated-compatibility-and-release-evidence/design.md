# Design

## Context

See proposal.md for motivation and repository scope, and the assessment/source-evidence.json for pinned current observations. Historical gaps are not assumed to persist. This is an initiative-level specification. The local OpenSpec root authorizes planning edits only. Before product implementation, create or link repository-scoped changes in each affected worktree with exact file ownership, existing-spec reconciliation, and this change ID. Do not apply sibling code edits from this planning root.

Repositories: universal-agent-runtime, librefang, the-boss, know-me-system, know-me-app, flint-gate, flint-realtime-fabric, flint-forge, surreal-memory-server, prometheus-skill-pack, prometheus-skills-mini. Scope: Cross-repository manifests, conformance runners, scoped federation adapters and release documentation. Dependencies: C05, C06, C08, C09, C10, C11, C12, C13, C14, C15, C16, C17. External checkpoints: D-UAR-P1, D-FRF, D-FORGE, D-GATE, D-MINI, D-KNOWME, D-MEMORY (definitions in dependencies.md).

## Goals / Non-Goals

**Goals:** Deliver C18 through existing product authorities and observable acceptance.

**Non-Goals:** One local Rust build writer while sharing host; no single green unit suite substitutes for installed multi-product acceptance. No implementation or service changes occur in this planning package.

## Decisions

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

Each advertised mode passes real boundary scenarios on named hosts/platforms; unsupported features remain disabled; immutable pins and rollback constraints are auditable.

Use repository-required checks and observable real-boundary scenarios; source inspection and planned checkboxes are not execution evidence. Recommendation coverage: REC-057, REC-058, REC-060, REC-061.

## D01 and later full publication boundary

An early local `pnpm build:mac:arm64` D01 result establishes only its exact packaged Boss/UAR journey. It does not certify this change's federation or mode matrix. After every functioning local delivery, the operator chooses full macOS/Windows publication now or wait. A now choice means UAR-enabled darwin-arm64, darwin-x64, win32-x64 and win32-arm64, with no Linux; missing Intel/ARM payload/profile support remains a blocker. Each GitHub Release artifact row binds exact source, version, architecture, size, SHA-256, signing status and download URL. The Boss `RELEASES.md` and manifest are committed/pushed from actual artifacts; `Know-Me-Tools/boss-landing-spot` generated data is synced, committed/pushed, and its connected Lovable project is deployed at the-boss.know-me.tools. Verify live URL and downloaded bytes before replacing a prior working platform link. One publisher prevents stale job metadata regression. These per-delivery publication receipts contribute to C18 evidence but cannot close C18.1–C18.3 without their original supported-profile acceptance.
