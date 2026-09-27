# Analysis — phase-11-surreal-recovery-and-uar-convergence (goal G5)

**Date:** 2026-09-27
**Owner:** product-manager (bossfang-stewards)
**Mode:** stack-specified (Rust / tokio / axum / reqwest; SurrealDB 3.x; three first-party repositories plus the-boss)
**Scope:** G5 only; G1, G2 and G4 are analysed by their owners.
**Inputs:** `goals.md`; `docs/architecture/uar-runtime-integration-research.md`; `docs/agent-fabric-convergence.md`; phase-10 `analysis.md` and `decision-log.md`.
**Research package:** `docs/research/bossfang-uar-convergence/bossfang-uar-agent-loop-ownership-20260927-5a1c/` (deep-research, depth deep, scale full, 68 sources, 27 claims, `verification_status: partial`, `check-research-package.sh` PASS).
**Decision record:** `docs/architecture/decisions/0001-agent-loop-ownership-and-uar-runtime-integration.md`.
**Verdict:** adopt, don't build a second loop. BossFang stays the control plane with its native loop as the default executor, and UAR becomes a per-agent execution runtime behind one BossFang-owned executor seam, plus an optional model gateway.

## 1. Headline

The loop-ownership question is already answered by working code in the-boss and by three design documents that agree with each other.
What is missing in BossFang is not a decision but a seam: BossFang has no executor abstraction, and its only UAR integration is wired to the wrong UAR endpoint.
The version question is real and cross-repository: BossFang is on the SurrealDB 3.3.0 train while the-boss still ships 3.2.4, and the datastore upgrade is one-way.

## 2. What already exists (adopt, don't build)

| Asset | Where | Consequence |
|---|---|---|
| UAR full-run API | UAR `src/uar/api/routes.rs:40` (`POST /api/uar/runs`), AG-UI stream `?stream_mode=agui_spec` | The UAR executor is a client of an existing, production API; no UAR-side loop work is needed. |
| Host tool bridge pattern | UAR `mcp_servers` and `tool_admission` fields; the-boss `UarRuntimeConnection.ts:198-252` | BossFang can expose its tools to a UAR run as a run-scoped MCP server and keep approvals, exactly as the-boss does. |
| BossFang MCP server | `crates/librefang-runtime/src/mcp_server.rs`, mounted at `/mcp`; already used by the claude-code driver bridge | The run-scoped tool surface for UAR runs already exists. |
| UAR true model passthrough | UAR `src/server.rs:1809` (`/v1/messages`) | The model-gateway fix is a retarget, not a new UAR feature. |
| UAR sidecar supervision | `crates/librefang-channels/src/uar_sidecar.rs`, `Dockerfile:10-11`, `:359` | "Embedded" UAR already works as a supervised child process. |
| Service-binding exchange (C04) | `crates/librefang-llm-drivers/src/drivers/uar.rs` (`verify_capabilities`, `admit_supervised_binding`) | Instance identity and capability negotiation for managed, external and remote placements exist. |
| surreal-memory schema ownership | surreal-memory migrations v1 to v21, applied on connect | BossFang does not migrate memory tables; it must only avoid sharing a memory database across revisions. |

## 3. Build-vs-adopt decisions

| Gap | Decision | Rationale |
|---|---|---|
| G5-1 `UarDriver` calls UAR's agent-run endpoint as if it were a model (nested loop; BossFang tools dropped) | **BUILD (small)**: retarget to `/v1/messages`, relabel as model gateway, add a contract test against a real `uar-sidecar` | Verified in both codebases (UAR `server.rs:4617`, `:5171`, `:5533`; BossFang `uar.rs:895`, `:1484`); wiremock tests hid it. |
| G5-2 No executor seam | **BUILD (small)**: an executor trait at the kernel dispatch point (`messaging.rs:1288`), native only, manifest field defaulting to native | Additive, BossFang-owned module, no behaviour change; keeps upstream merge surface small. |
| G5-3 No UAR full-run executor | **BUILD (medium)** on UAR's existing run API | Same contract the-boss already runs; maps into BossFang sessions, approvals and metering. |
| G5-4 No drift guard | **BUILD (small)**: `scripts/check-surreal-alignment.py` in CI | No existing script covers SurrealDB or surreal-memory pins. |
| G5-5 In-process UAR link | **DO NOT ADOPT** | Cargo cannot unify conflicting exact pins, features union across the graph, and UAR's library still carries non-optional heavy dependencies. |
| G5-6 Merge the loops or delegate every run to UAR | **REJECT** | Both destroy the upstream merge path and duplicate channels, cron, Hands, approvals and budgets that UAR does not have. |

## 4. The cross-repository dependency

The-boss 2.2.3 ships UAR `92620d40`, surreal-memory `6acb605` and a `surrealdb:v3.2.4` server, all on the 3.2.4 train (`build/integration-sources.json`, `build/integration-artifacts.json:256`).
BossFang, UAR `main` and surreal-memory `HEAD` are on 3.3.0.
SurrealDB states a datastore cannot return to 3.2 once a 3.3.0 node has started against it, so the-boss must move server, UAR and surreal-memory together in one release.
The-boss does not bundle BossFang today, so this is a coordination request to the-boss, not a BossFang blocker.

## 5. Decisions proposed (awaiting operator confirmation)

- **D-1 Loop ownership:** option C, BossFang control plane with a per-agent executor choice and exactly one executor per run.
- **D-2 UAR shapes:** managed sidecar, external local and remote, all behind one service binding over HTTP; no in-process link; no silent fallback.
- **D-3 Model gateway:** keep, but only through `/v1/messages`.
- **D-4 Storage:** separate stores by default; each schema owner migrates only its own database; never share a database across surreal-memory revisions.
- **D-5 Versions:** exact pins inside each repository; lockstep only for clients sharing a datastore; server upgraded last and never downgraded; CI drift guard in BossFang.

## 6. Migration steps (owners from bossfang-stewards)

1. M1 decision record and feature-ledger entries — product-manager.
2. M2 SurrealDB alignment guard and CI job — surrealdb-schema-engineer.
3. M3 `UarDriver` retarget to `/v1/messages` with a real-sidecar contract test — bossfang-feature-steward (after G4 moves `UAR_IMAGE`).
4. M4 executor seam, native only — bossfang-feature-steward.
5. M5 UAR full-run executor with run-scoped MCP, `tool_admission` to `ApprovalManager`, seeded history and usage recording — bossfang-feature-steward.
6. M6 external-local and remote placements over the same binding — bossfang-feature-steward.
7. M7 storage-isolation note and `schema_version` guard for the memory database — surrealdb-schema-engineer.
8. M8 remove stale in-process comments and correct the UAR sections of `CLAUDE.md` — bossfang-feature-steward.
9. M9 add the seam, gateway and executor to upstream-sync acceptance criteria — upstream-merge-manager with merge-reviewer.
10. M10 3.3.0 train and optional BossFang-sibling proposal to the-boss — product-manager.

## 7. Open questions carried into `/kbd-spec` → `/kbd-plan`

1. Should the-boss host BossFang, and if so as a sibling sidecar with its own store?
2. Is M5 (per-agent UAR delegation) in this phase, or only M1 to M4?
3. Should BossFang agents and UAR agents ever share one user memory (which would require surreal-memory as a single service)?
4. Will surreal-memory cut release tags so consumers can cite a version instead of a rev?
5. When does the-boss take the one-way 3.3.0 datastore upgrade?
6. Out of scope here but surfaced: surreal-memory `b7e2093` rejects BossFang's nested `metadata.librefang` writes (`crates/librefang-memory/tests/surreal_vector_integration_test.rs:92`), which is G1/G2 territory.

## 8. Budget and method

The deep-research pipeline ran in-session with four isolated repository workers and one web worker, two levels of dispatch.
Every load-bearing code claim was re-read by the orchestrator at the cited line before being labelled `verified`.
The surreal-memory MCP server was unreachable, the Feynman gate and the in-pipeline adversarial review were not run, and the package is `partial` by rule; phase-11 acceptance routes review to `merge-reviewer`.
