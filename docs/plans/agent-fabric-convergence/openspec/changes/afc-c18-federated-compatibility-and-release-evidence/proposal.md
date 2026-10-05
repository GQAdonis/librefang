# Proposal

## Why

The report recommendations REC-057, REC-058, REC-060, REC-061 require a coordinated contract across the affected products. Supported profiles have reproducible interoperability, recovery and quality evidence.

## What Changes

- Implement only required remaining federation/trust adapters with independent resource-side enforcement and capability refusal; prove state/effect fencing before optional takeover.
- Run operational-mode matrix on exact source/payload/policy combinations; test upgrade, rollback, outage, retention gaps, restart and revoked authority.
- Benchmark task quality, human correction, cost/latency, duplicate/unknown effects and administration effort against controlled baselines; publish supported/unsupported matrix and release evidence after authorization.

## Capabilities

### New Capabilities

- `federated-compatibility-and-release-evidence`: Supported profiles have reproducible interoperability, recovery and quality evidence.

### Modified Capabilities

None in this initiative root. Product-level existing specifications are reconciled before implementation; this proposal does not overwrite them.

## Impact

This is an initiative-level specification. The local OpenSpec root authorizes planning edits only. Before product implementation, create or link repository-scoped changes in each affected worktree with exact file ownership, existing-spec reconciliation, and this change ID. Do not apply sibling code edits from this planning root.

Repositories: universal-agent-runtime, librefang, the-boss, know-me-system, know-me-app, flint-gate, flint-realtime-fabric, flint-forge, surreal-memory-server, prometheus-skill-pack, prometheus-skills-mini. Scope: Cross-repository manifests, conformance runners, scoped federation adapters and release documentation. Full-backlog dependency envelope (historical change-wide scheduling; use the scoped dependencies below): C05, C06, C08, C09, C10, C11, C12, C13, C14, C15, C16, C17. External checkpoints: D-UAR-P1, D-FRF, D-FORGE, D-GATE, D-MINI, D-KNOWME, D-MEMORY (definitions in dependencies.md).

One local Rust build writer while sharing host; no single green unit suite substitutes for installed multi-product acceptance.

Acceptance: Each advertised mode passes real boundary scenarios on named hosts/platforms; unsupported features remain disabled; immutable pins and rollback constraints are auditable.

## Approved customer-priority revision — 2026-10-05

C18.1 federation/trust adapters remain pending outside the next customer milestone. Relevant desktop recovery/upgrade/authority scenarios from C18.2 accompany each completed increment; the wider operational-mode matrix remains outstanding. C18.3 desktop source/artifact provenance and supported-feature reporting accompany releases; broader comparative benchmarks remain outstanding. Neither partial evidence nor a local build completes an original C18 task. Consume dependencies of the actual delivered desktop scope; the portfolio-wide dependency list applies only to full C18 completion.

Delivery evidence maps to the original task IDs; partial delivery is not whole-task completion. The parent phase plan and delivery coverage map select bounded repository-owned work. Complete production wiring, UI, strings, persistence and packaged inputs before the build-and-operate boundary; no per-edit verification loop.

## Revision 10 — six-hour convergence recovery, 2026-10-05

The parent Revision 10 addendum and `customer-delivery-map.json` recovery mapping control current scoped scheduling; earlier ordering is retained history. Revision 9's unfinished Teams plus urgent BossFang accessibility remain combined in increment 1. Recovery-child Execute installs instructions only; parent C14.1 resumes after separately requested Reflect and parent restoration. Keep original task IDs, unchecked criteria and partial source work; no product completion is credited by this amendment.

R3 freezes exact corrected Boss/UAR/BossFang sources, pins, functional dashboard/skills and checksummed native payloads; unchanged payloads are reused. Preserve separate Teams/BossFang operation results and reuse receipts only with matching input/contract identity. Actual recovery/publication receipts contribute C18.2/C18.3; wider operational matrices, federation C18.1 and controlled comparative benchmarks remain pending. Local delivery, published assets and installed acceptance have separate evidence.

The publication chain remains corrected dependency sources/native manifests → versioned Boss source → native installers → GitHub assets/checksums/source/signing metadata → committed/pushed RELEASES.md/manifest → landing sync/commit/push → existing site deployment → exact live download identity. Use a new public version from actual source/release state; never overwrite/relabel immutable releases. Retain each previous valid platform link/actual version until replacement is ready. Reconcile the legacy C09.4 obligation `3aa9f8fd-78d2-462f-9584-4f934cabd914` only through immutable receipts or supported authority-backed replacement with source/scope coverage; capability-blocked automatic publishing is not publication. Use the already authorized workflow/manual publisher and retain unresolved debt.

Three whole-increment targets are 120 minutes each: success 7 full publication → success 8 local-only → success 9 full publication, preserving the inspected six-success/nextCount-7 anchor and every-two schedule. Each delivery requires a new local `pnpm build:mac:arm64` package and actual feature operation; full publication requires Mac ARM64/x64 + Windows x64/ARM64, GitHub metadata and https://the-boss.know-me.tools; no Linux. Failed attempts/overruns, child time, legacy publication debt and independent installed acceptance survive. Complete production work before the single boundary; one build writer/publisher, at most three implementers, bounded isolated work-ahead. Six hours targets three useful increments, not completion of every original requirement.
