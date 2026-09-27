# Dependency compatibility matrix v1

**Contract:** `afc.dependency-compatibility-matrix.v1` / `1.0.0`  
**Status:** accepted planning contract; product conformance remains separately gated.  
**Machine form:** [dependency-compatibility-matrix-v1.json](dependency-compatibility-matrix-v1.json)

The matrix records exact adoption inputs for all eleven initiative repositories. `Disposition` separates an accepted narrow input/ownership boundary from broader compatibility, and `Checkpoint` controls admission. It does not make every dependency, data format or deployment mode compatible. A remote service contract cannot be used as evidence that two versions can link in the same process.

| Repository | Structured anchors | Disposition | Compatibility / checkpoint | Remaining gate |
|---|---|---|---|---|
| librefang | current default `04a8a278d6` | Accepted ownership boundary | unverified / n/a | C05; refresh worktree |
| universal-agent-runtime | merged I1 `79414bb7e1`; P1 sidecar `92620d4041` | Accepted input | adapter-compatible / accepted D-UAR-P1 | C03/C06/C09; I2 activation remains absent |
| the-boss | merged I1 `ba9e3f61a6`; release source `1cda4e5553`; publication `19fc2a7ad6` | Accepted installed boundary | adapter-compatible / accepted D-UAR-P1 | C04/C14; stale worktree unusable for release evidence |
| flint-gate | current default `0edb945f1d` | Observed candidate | unverified / pending D-GATE | C02 |
| flint-realtime-fabric | current default `3043ca5323` | Accepted transport ownership boundary | unverified / pending D-FRF | C08 |
| flint-forge | current default `dc313be3a0` | Accepted data ownership boundary | unverified / pending D-FORGE | C10/C11 |
| surreal-memory-server | merged I1 `2d8e3ceea1` | Accepted provider input | unverified / pending D-MEMORY | C06/C09 |
| prometheus-skill-pack | merged I1 `e9520f5832` | Accepted authoring input | unverified / pending D-MINI | C03/C15 dependency propagation |
| prometheus-skills-mini | merged I1 `677a4e2c71`; closeout `5f43a25dd0`; payload `2650b3d470` | Accepted authoring/closeout inputs | unverified / pending D-MINI | C03/C15 vendored-source reconciliation |
| know-me-app | current default `d8fa3a7c14` | Accepted product ownership boundary | unverified / pending D-KNOWME | C12/C13 |
| know-me-system | current default `c561d89e78` | Observed candidate | unverified / pending D-KNOWME | C12/C13 |

Compass is supporting I1 evidence rather than one of the eleven repositories. Pin `1ddd1d0797` with SurrealDB 3.3.0 and rmcp 3.4.0. Retain the two exact quick-xml exceptions until the SurrealDB dependency line admits a patched object-store release.

## Supersession and unresolved mismatches

- I1's merged 3.3.0 commits supersede older 3.2.x dependency snapshots only for the named UAR, memory, mini/full-pack metadata, Compass and The Boss payload inputs. The older snapshots remain truthful evidence of the compatibility gap.
- BossFang 3.2.4, FRF 3.1.5, KnowMe App 3.0.5 and KnowMe System 3.2.1 are not normalized by documentation. They remain isolated or blocked until their owner proves a supported boundary.
- Before product edits, stale or retired convergence worktrees must be recreated or refreshed from the exact accepted source. Matching branch names do not create a compatible release set.
- C15 must enumerate nine actual CLI/service targets; the historical “eight harnesses” description is superseded. TypeScript 7 remains pin-or-block because current pins are lower.
- liter-llm source, prose and gitlinks have differed. Any adoption uses one immutable revision plus a capability receipt.

## Database rollback rule

If a SurrealDB 3.2 datastore must remain recoverable by 3.2 software, export it before first 3.3 access. Before any later downgrade, quiesce writers, capture current 3.3 state and reconcile post-upgrade writes into an explicit migration or operator-accepted recovery point. Never point 3.2 software at potentially upgraded data or silently discard 3.3 writes.
