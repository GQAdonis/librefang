# C01 merged-baseline refresh — 2026-09-27

This refresh records the merged defaults after the I1 collaboration-package delivery. It does not replace the immutable planning baselines, accept `D-UAR-P1`, complete C01.2, or claim runtime conformance.

| Repository | Current `origin/main` | Convergence checkout | State |
|---|---|---|---|
| librefang | `cfd5285df6` | `1c5d5a6261` | C01 checkpoint branch, one commit ahead |
| universal-agent-runtime | `79414bb7e1` | `676f995c73` | stale by one merged commit |
| the-boss | `ba9e3f61a6` | `480703469a` | materially stale; do not use for release evidence |
| flint-gate | `0edb945f1d` | `4cf940a5b7` | one initiative documentation commit ahead |
| flint-realtime-fabric | `3043ca5323` | `941e250879` | one initiative documentation commit ahead |
| flint-forge | `dc313be3a0` | `8068c94ce7` | one initiative documentation commit ahead |
| surreal-memory-server | `2d8e3ceea1` | `a335fdfe6b` | stale after merged SurrealDB 3.3.0 delivery |
| prometheus-skill-pack | `e9520f5832` | absent | manifest worktree retired; source checkout is not an initiative writer |
| prometheus-skills-mini | `677a4e2c71` | absent | manifest worktree retired; active source checkout belongs to shipping closeout |
| know-me-app | `d8fa3a7c14` | `b07b2d1fd3` | one initiative documentation commit ahead |
| know-me-system | `c561d89e78` | `390c152042` | one initiative documentation commit ahead |

## Merged I1 checkpoints

- UAR PR #304: `79414bb7e134dad45330008999ee1dca999d44af`
- The Boss PR #10: `ba9e3f61a6fcb7b45083fec323be22e30a6347ad`
- mini PR #7: `677a4e2c71d6a608e778a7106c41e0b00d55df7a`
- full skill-system PR #104: `e9520f5832c598270bcfee79a6e9af39853d2760`
- surreal-memory-server PR #28: `2d8e3ceea13b8c448a7611353cb86f233046f448`
- Compass PR #9: `1ddd1d07979d67aa8ca715aec27fe8f3936bbb43`

## Compatibility facts carried into C01.3

- UAR, surreal-memory-server, The Boss managed service metadata, and mini metadata now identify SurrealDB 3.3.0. The accepted container pin is `surrealdb/surrealdb:v3.3.0@sha256:681c6c22c287421b5c7d99e0fde79b6e0d32c36c1ddeaab2762a1661cb04cd20`.
- BossFang remains pinned to SurrealDB 3.2.4 for its same-process storage graph. That is an unresolved same-process compatibility boundary; it is not repaired by the remote-service protocol lane.
- Mini and full-pack gitlinks for surreal-memory still precede the merged 3.3.0 source, and The Boss integration metadata still names an older surreal-memory source/image. C01.3 must assign an adoption and rollback order instead of treating the merged service repository as a propagated payload.
- Flint Realtime Fabric, KnowMe App, and KnowMe System use distinct SurrealDB client lines. Their current remote-service integration does not prove same-process compatibility with UAR 3.3.0.

## Active dependency

Windows x64 installed acceptance for The Boss 2.2.3 remains the only missing fact for `D-UAR-P1`: the installed application must launch UAR, show the effective port, and demonstrate port-1906 conflict fallback. Until that observation is recorded by the shipping closeout, C01.2 remains open and C01.3 is not started.
