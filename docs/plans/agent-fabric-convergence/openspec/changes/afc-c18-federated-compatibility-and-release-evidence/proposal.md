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

Repositories: universal-agent-runtime, librefang, the-boss, know-me-system, know-me-app, flint-gate, flint-realtime-fabric, flint-forge, surreal-memory-server, prometheus-skill-pack, prometheus-skills-mini. Scope: Cross-repository manifests, conformance runners, scoped federation adapters and release documentation. Dependencies: C05, C06, C08, C09, C10, C11, C12, C13, C14, C15, C16, C17. External checkpoints: D-UAR-P1, D-FRF, D-FORGE, D-GATE, D-MINI, D-KNOWME, D-MEMORY (definitions in dependencies.md).

One local Rust build writer while sharing host; no single green unit suite substitutes for installed multi-product acceptance.

Acceptance: Each advertised mode passes real boundary scenarios on named hosts/platforms; unsupported features remain disabled; immutable pins and rollback constraints are auditable.
