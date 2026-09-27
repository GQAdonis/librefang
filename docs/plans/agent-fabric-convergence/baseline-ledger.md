# C01.1 — Baseline and source reconciliation

All 11 origin refs were fetched without merging, rebasing or switching a source checkout. All 61 recommendation clusters have a disposition, evidence scope, responsible repository, reserved dependency and acceptance reference. Source inspection is distinct from runtime validation.

The planning baselines below remain immutable. A [27 September merged-baseline refresh](.kbd-orchestrator/phases/agent-fabric-convergence/c01/merged-baseline-refresh-2026-09-27.md) records the six merged I1 delivery commits, current default refs, retired/stale initiative worktrees, the SurrealDB 3.3.0 propagation gaps, and the still-pending Windows `D-UAR-P1` observation. The subsequent [checkpoint merge receipt](.kbd-orchestrator/phases/agent-fabric-convergence/c01/checkpoint-merge-receipt-2026-09-27.md) records the merged recovery and reconciliation PRs. These receipts update current facts without rewriting what C01.1 originally inspected.

## Findings that affect the next step

- The Boss advanced one commit to `f1314b46ad`; only `RELEASES.md` and `release-manifest.json` changed. Adoption is deferred to the owner checkpoint.
- The external integration is active: its committed administration task projection at revision 658 records 18 of 37 tasks complete. Older plan text still says hold; it is not the current execution state and does not release ownership.
- BossFang already has provider access to UAR, and The Boss already registers a UAR driver. Initial-wiring absence is superseded; complete delegated-run behavior is not proven.
- UAR actors already use the shared thread host. Extend this mechanism after ownership reconciliation.
- KnowMe System has embedded/service UAR lanes; KnowMe App’s inspected chat calls inference directly, while cancel/session-list handlers are stubs. Resolve the product boundary before adding another execution path.
- UAR policy-load failure still selects default permit in the inspected startup path. Its direct-tool handler warrants full route/middleware analysis; this pass does not claim a demonstrated exploit or deployed-profile behavior.
- Root and desktop UAR lockfiles differ. Fabric pins SurrealDB 3.1.5; KnowMe System locks 3.2.1; KnowMe App declares exact 3.0.5; BossFang/UAR-root/memory lock 3.2.4. No cross-product database compatibility or auto-upgrade is inferred.
- The `liter-llm` Git tree/prose discrepancy is resolved as an observed documentation mismatch. Exact future adoption remains D-UAR-P1/C01.2 work.

## Repositories

| Repository | Initial baseline | Fetched default | Disposition | Reserved checkpoint |
|---|---|---|---|---|
| librefang | 82809ab671 | 82809ab671 | retain-current-baseline | D-UAR-P1 |
| universal-agent-runtime | c29af47be3 | c29af47be3 | retain-current-baseline | D-UAR-P1 |
| the-boss | 2b57fa0164 | f1314b46ad | defer-adoption | D-UAR-P1 |
| flint-gate | 0edb945f1d | 0edb945f1d | retain-current-baseline | D-GATE |
| flint-realtime-fabric | 3043ca5323 | 3043ca5323 | retain-current-baseline | D-FRF |
| flint-forge | dc313be3a0 | dc313be3a0 | retain-current-baseline | D-FORGE |
| surreal-memory-server | 4ed6b2c79b | 4ed6b2c79b | retain-current-baseline | D-MEMORY |
| prometheus-skill-pack | add9b48949 | add9b48949 | retain-current-baseline | D-MINI |
| prometheus-skills-mini | 2782c3a2d3 | 2782c3a2d3 | retain-current-baseline | D-MINI |
| know-me-app | d8fa3a7c14 | d8fa3a7c14 | retain-current-baseline | D-KNOWME |
| know-me-system | c561d89e78 | c561d89e78 | retain-current-baseline | D-KNOWME |

## Recommendation dispositions

- retained: 25
- externally-owned: 9
- unresolved: 26
- superseded: 1

Retained means the requirement/audit remains valid, not that every capability is absent. Externally owned means a prerequisite or shared surface is reserved; residual convergence acceptance remains. Superseded applies narrowly to initial-wiring absence. Unresolved means conformance remains unproven by this source pass.

| ID | Change | Disposition | Evidence |
|---|---|---|---|
| REC-001 | C05 | retained | SRC-001, SRC-025, SRC-042 |
| REC-002 | C04 | retained | SRC-002, SRC-042, SRC-043 |
| REC-003 | C04 | externally-owned | SRC-002, SRC-042, SRC-043 |
| REC-004 | C04 | externally-owned | SRC-002, SRC-042, SRC-043 |
| REC-005 | C05 | unresolved | SRC-001, SRC-025, SRC-042 |
| REC-006 | C06 | unresolved | SRC-006, SRC-039 |
| REC-007 | C01 | retained | SRC-001, SRC-002, SRC-006, SRC-007, SRC-009, SRC-010, SRC-011, SRC-012, SRC-022, SRC-040, SRC-041 |
| REC-008 | C09 | unresolved | SRC-006, SRC-039 |
| REC-009 | C14 | externally-owned | SRC-002, SRC-042, SRC-043 |
| REC-010 | C02 | retained | SRC-003, SRC-004, SRC-008, SRC-026, SRC-027 |
| REC-011 | C01 | retained | SRC-001, SRC-002, SRC-006, SRC-007, SRC-009, SRC-010, SRC-011, SRC-012, SRC-022, SRC-040, SRC-041 |
| REC-012 | C01 | superseded | SRC-001, SRC-002, SRC-006, SRC-007, SRC-009, SRC-010, SRC-011, SRC-012, SRC-022, SRC-040, SRC-041 |
| REC-013 | C05 | unresolved | SRC-001, SRC-025, SRC-042 |
| REC-014 | C12 | unresolved | SRC-030, SRC-031, SRC-035, SRC-038 |
| REC-015 | C11 | unresolved | SRC-028, SRC-029, SRC-030, SRC-031, SRC-032, SRC-033 |
| REC-016 | C11 | unresolved | SRC-028, SRC-029, SRC-030, SRC-031, SRC-032, SRC-033 |
| REC-017 | C12 | unresolved | SRC-030, SRC-031, SRC-035, SRC-038 |
| REC-018 | C02 | retained | SRC-003, SRC-004, SRC-008, SRC-026, SRC-027 |
| REC-019 | C02 | externally-owned | SRC-003, SRC-004, SRC-008, SRC-026, SRC-027 |
| REC-020 | C13 | unresolved | SRC-035, SRC-036, SRC-037, SRC-038, SRC-044, SRC-045 |
| REC-021 | C13 | retained | SRC-035, SRC-036, SRC-037, SRC-038, SRC-044, SRC-045 |
| REC-022 | C15 | unresolved | SRC-014, SRC-015, SRC-016, SRC-017, SRC-018, SRC-019, SRC-020, SRC-021, SRC-040 |
| REC-023 | C14 | externally-owned | SRC-002, SRC-042, SRC-043 |
| REC-024 | C08 | unresolved | SRC-013, SRC-023, SRC-024, SRC-030, SRC-031 |
| REC-025 | C11 | unresolved | SRC-028, SRC-029, SRC-030, SRC-031, SRC-032, SRC-033 |
| REC-026 | C06 | retained | SRC-006, SRC-039 |
| REC-027 | C06 | retained | SRC-006, SRC-039 |
| REC-028 | C06 | retained | SRC-006, SRC-039 |
| REC-029 | C07 | retained | SRC-006, SRC-023, SRC-024 |
| REC-030 | C07 | retained | SRC-006, SRC-023, SRC-024 |
| REC-031 | C08 | retained | SRC-013, SRC-023, SRC-024, SRC-030, SRC-031 |
| REC-032 | C08 | retained | SRC-013, SRC-023, SRC-024, SRC-030, SRC-031 |
| REC-033 | C08 | retained | SRC-013, SRC-023, SRC-024, SRC-030, SRC-031 |
| REC-034 | C07 | retained | SRC-006, SRC-023, SRC-024 |
| REC-035 | C06 | retained | SRC-006, SRC-039 |
| REC-036 | C13 | retained | SRC-035, SRC-036, SRC-037, SRC-038, SRC-044, SRC-045 |
| REC-037 | C15 | retained | SRC-014, SRC-015, SRC-016, SRC-017, SRC-018, SRC-019, SRC-020, SRC-021, SRC-040 |
| REC-038 | C16 | unresolved | SRC-014, SRC-018 |
| REC-039 | C10 | unresolved | SRC-004, SRC-013, SRC-026, SRC-027, SRC-039 |
| REC-040 | C15 | externally-owned | SRC-014, SRC-015, SRC-016, SRC-017, SRC-018, SRC-019, SRC-020, SRC-021, SRC-040 |
| REC-041 | C15 | externally-owned | SRC-014, SRC-015, SRC-016, SRC-017, SRC-018, SRC-019, SRC-020, SRC-021, SRC-040 |
| REC-042 | C01 | retained | SRC-001, SRC-002, SRC-006, SRC-007, SRC-009, SRC-010, SRC-011, SRC-012, SRC-022, SRC-040, SRC-041 |
| REC-043 | C09 | retained | SRC-006, SRC-039 |
| REC-044 | C09 | unresolved | SRC-006, SRC-039 |
| REC-045 | C09 | unresolved | SRC-006, SRC-039 |
| REC-046 | C10 | unresolved | SRC-004, SRC-013, SRC-026, SRC-027, SRC-039 |
| REC-047 | C16 | unresolved | SRC-014, SRC-018 |
| REC-048 | C17 | unresolved | SRC-003, SRC-008, SRC-035 |
| REC-049 | C17 | unresolved | SRC-003, SRC-008, SRC-035 |
| REC-050 | C02 | retained | SRC-003, SRC-004, SRC-008, SRC-026, SRC-027 |
| REC-051 | C02 | retained | SRC-003, SRC-004, SRC-008, SRC-026, SRC-027 |
| REC-052 | C02 | retained | SRC-003, SRC-004, SRC-008, SRC-026, SRC-027 |
| REC-053 | C10 | unresolved | SRC-004, SRC-013, SRC-026, SRC-027, SRC-039 |
| REC-054 | C03 | externally-owned | SRC-005, SRC-014, SRC-018 |
| REC-055 | C03 | externally-owned | SRC-005, SRC-014, SRC-018 |
| REC-056 | C10 | unresolved | SRC-004, SRC-013, SRC-026, SRC-027, SRC-039 |
| REC-057 | C18 | unresolved | SRC-007, SRC-009, SRC-010, SRC-011, SRC-012, SRC-022, SRC-037 |
| REC-058 | C18 | unresolved | SRC-007, SRC-009, SRC-010, SRC-011, SRC-012, SRC-022, SRC-037 |
| REC-059 | C10 | retained | SRC-004, SRC-013, SRC-026, SRC-027, SRC-039 |
| REC-060 | C18 | unresolved | SRC-007, SRC-009, SRC-010, SRC-011, SRC-012, SRC-022, SRC-037 |
| REC-061 | C18 | unresolved | SRC-007, SRC-009, SRC-010, SRC-011, SRC-012, SRC-022, SRC-037 |

## Receipts and remaining boundaries

[Machine ledger](baseline-ledger.json), [recommendation details](.kbd-orchestrator/phases/agent-fabric-convergence/c01/recommendation-dispositions.json), [source receipts](.kbd-orchestrator/phases/agent-fabric-convergence/c01/source-receipts.json), [dependency inventory](.kbd-orchestrator/phases/agent-fabric-convergence/c01/dependency-inventory.json), [external checkpoints](.kbd-orchestrator/phases/agent-fabric-convergence/c01/external-checkpoints.json).

C01.2 has now frozen the ownership and API/history/approval contract in [the P1 checkpoint](.kbd-orchestrator/phases/agent-fabric-convergence/c01/p1-contract-checkpoint.md). Its operational checkpoint remains unaccepted because Windows x64 installed acceptance is pending in the owning shipping phase. C01.3 must define the vocabulary, compatibility decisions and adoption/rollback sequence after D-UAR-P1 acceptance. No product slice is execution-ready from this ledger alone.
