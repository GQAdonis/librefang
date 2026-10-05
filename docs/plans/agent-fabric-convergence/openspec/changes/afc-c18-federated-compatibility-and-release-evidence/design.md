# Design

## Context

See proposal.md for motivation and repository scope, and the assessment/source-evidence.json for pinned current observations. Historical gaps are not assumed to persist. This is an initiative-level specification. The local OpenSpec root authorizes planning edits only. Before product implementation, create or link repository-scoped changes in each affected worktree with exact file ownership, existing-spec reconciliation, and this change ID. Do not apply sibling code edits from this planning root.

Repositories: universal-agent-runtime, librefang, the-boss, know-me-system, know-me-app, flint-gate, flint-realtime-fabric, flint-forge, surreal-memory-server, prometheus-skill-pack, prometheus-skills-mini. Scope: Cross-repository manifests, conformance runners, scoped federation adapters and release documentation. Full-backlog dependency envelope (historical change-wide scheduling; use the scoped dependencies below): C05, C06, C08, C09, C10, C11, C12, C13, C14, C15, C16, C17. External checkpoints: D-UAR-P1, D-FRF, D-FORGE, D-GATE, D-MINI, D-KNOWME, D-MEMORY (definitions in dependencies.md).

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

An early local `pnpm build:mac:arm64` D01 result establishes only its exact packaged Boss/UAR journey. It does not certify this change's federation or mode matrix. Historical D01 publication used an operator choice after each local delivery. The approved current cadence supersedes that scheduling: full publication is due every second successful delivery. Full publication means UAR-enabled darwin-arm64, darwin-x64, win32-x64 and win32-arm64, with no Linux; missing Intel/ARM payload/profile support remains a blocker. Each GitHub Release artifact row binds exact source, version, architecture, size, SHA-256, signing status and download URL. The Boss `RELEASES.md` and manifest are committed/pushed from actual artifacts; `Know-Me-Tools/boss-landing-spot` generated data is synced, committed/pushed, and its connected Lovable project is deployed at the-boss.know-me.tools. Verify live URL and downloaded bytes before replacing a prior working platform link. One publisher prevents stale job metadata regression. These per-delivery publication receipts contribute to C18 evidence but cannot close C18.1–C18.3 without their original supported-profile acceptance.

## Approved customer-priority revision — 2026-10-05

C18.1 federation/trust adapters remain pending outside the next customer milestone. Relevant desktop recovery/upgrade/authority scenarios from C18.2 accompany each completed increment; the wider operational-mode matrix remains outstanding. C18.3 desktop source/artifact provenance and supported-feature reporting accompany releases; broader comparative benchmarks remain outstanding. Neither partial evidence nor a local build completes an original C18 task. Consume dependencies of the actual delivered desktop scope; the portfolio-wide dependency list applies only to full C18 completion.

Delivery evidence maps to the original task IDs; partial delivery is not whole-task completion. The parent phase plan and delivery coverage map select bounded repository-owned work. Complete production wiring, UI, strings, persistence and packaged inputs before the build-and-operate boundary; no per-edit verification loop.

## Revision 10 — six-hour convergence recovery, 2026-10-05

The parent Revision 10 addendum and `customer-delivery-map.json` recovery mapping control current scoped scheduling; earlier ordering is retained history. Revision 9's unfinished Teams plus urgent BossFang accessibility remain combined in increment 1. Recovery-child Execute installs instructions only; parent C14.1 resumes after separately requested Reflect and parent restoration. Keep original task IDs, unchecked criteria and partial source work; no product completion is credited by this amendment.

R3 freezes exact corrected Boss/UAR/BossFang sources, pins, functional dashboard/skills and checksummed native payloads; unchanged payloads are reused. Preserve separate Teams/BossFang operation results and reuse receipts only with matching input/contract identity. Actual recovery/publication receipts contribute C18.2/C18.3; wider operational matrices, federation C18.1 and controlled comparative benchmarks remain pending. Local delivery, published assets and installed acceptance have separate evidence.

The publication chain remains corrected dependency sources/native manifests → versioned Boss source → native installers → GitHub assets/checksums/source/signing metadata → committed/pushed RELEASES.md/manifest → landing sync/commit/push → existing site deployment → exact live download identity. Use a new public version from actual source/release state; never overwrite/relabel immutable releases. Retain each previous valid platform link/actual version until replacement is ready. Reconcile the legacy C09.4 obligation `3aa9f8fd-78d2-462f-9584-4f934cabd914` only through immutable receipts or supported authority-backed replacement with source/scope coverage; capability-blocked automatic publishing is not publication. Use the already authorized workflow/manual publisher and retain unresolved debt.

Three whole-increment targets are 120 minutes each: success 7 full publication → success 8 local-only → success 9 full publication, preserving the inspected six-success/nextCount-7 anchor and every-two schedule. Each delivery requires a new local `pnpm build:mac:arm64` package and actual feature operation; full publication requires Mac ARM64/x64 + Windows x64/ARM64, GitHub metadata and https://the-boss.know-me.tools; no Linux. Failed attempts/overruns, child time, legacy publication debt and independent installed acceptance survive. Complete production work before the single boundary; one build writer/publisher, at most three implementers, bounded isolated work-ahead. Six hours targets three useful increments, not completion of every original requirement.
