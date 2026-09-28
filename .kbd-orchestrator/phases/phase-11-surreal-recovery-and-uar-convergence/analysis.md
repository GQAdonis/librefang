# Analysis — phase-11-surreal-recovery-and-uar-convergence (goal G5)

**Date:** 2026-09-27 (revision 2, after `merge-reviewer` CHANGES REQUESTED on `697090473`)
**Owner:** product-manager (bossfang-stewards)
**Mode:** stack-specified (Rust / tokio / axum / reqwest; SurrealDB 3.x; three first-party repositories plus the-boss)
**Scope:** G5 only; G1, G2 and G4 are analysed by their owners.
**Inputs:** `goals.md`; `docs/architecture/uar-runtime-integration-research.md`; `docs/agent-fabric-convergence.md`; phase-10 `analysis.md` and `decision-log.md`.
**Research package:** `docs/research/bossfang-uar-convergence/bossfang-uar-agent-loop-ownership-20260927-5a1c/` (83 sources, 38 claims, `verification_status: partial`, `check-research-package.sh` PASS).
**Decision record:** `docs/architecture/decisions/0001-agent-loop-ownership-and-uar-runtime-integration.md`.
**UAR revisions:** shipped `2aaeadd9` (`Dockerfile:10`); analysed `main` `3d6bf056`, 609 commits later.

**Verdict:**
Adopt, don't build a second loop.
BossFang stays the control plane with its native loop as the default executor.
UAR becomes a per-agent executor, available only on a managed loopback sidecar at or after `3d6bf056` (placement S1), plus a model gateway through `/v1/messages`.

## 1. Headline

The loop-ownership direction is already answered by working code in the-boss and by three design documents that agree with each other.
What BossFang lacks is a seam: it has no executor abstraction, and its only UAR integration calls the wrong UAR endpoint in both the analysed and the shipped UAR revision.
UAR's trust model limits BossFang-governed UAR execution to a sidecar BossFang launched itself, because host tool admission is accepted only over loopback from a launch-token host.
The version question is cross-repository: BossFang is on the SurrealDB 3.3.0 train while the-boss ships 3.2.4, and the datastore upgrade is one-way.

## 2. What already exists (adopt, don't build)

| Asset | Where | Consequence |
|---|---|---|
| UAR full-run API with host features | UAR `main` `src/uar/api/routes.rs:40`, `CreateRunRequest` with `mcp_servers`, `tool_admission`, `history`; absent at `2aaeadd9` | The executor is a client of an existing API, after G4. |
| Host tool bridge pattern | the-boss `UarRuntimeConnection.ts:198-252` | Proven over loopback with a launch token only. |
| BossFang MCP server | `/mcp`, gated by `execute_tool` (`routes/network.rs:1552`) | The run-scoped tool surface exists; it needs claim recognition to avoid double approval. |
| UAR model passthrough | UAR `src/server.rs:1809` (`/v1/messages`), present at `2aaeadd9` | Gateway fix can ship before G4, as an Anthropic-format codec change. |
| BossFang Anthropic driver | `crates/librefang-llm-drivers/src/drivers/anthropic.rs:45` | Candidate codec for the gateway. |
| UAR sidecar supervision | `crates/librefang-channels/src/uar_sidecar.rs`, `Dockerfile:10-11`, `:359` | "Embedded" UAR already works as a supervised child process. |
| Budget reservation | `reserve_global_budget`, `librefang-kernel-metering/src/lib.rs:229` | Bounds UAR runs that make up to 10 model calls between BossFang checkpoints. |

## 3. Build-vs-adopt decisions

| Gap | Decision | Rationale |
|---|---|---|
| G5-1 `UarDriver` calls UAR's agent-run endpoint as a model | **BUILD (medium)**: Anthropic-format gateway via `/v1/messages`, C04 check moved off `/api/chat/completion`, UAR-side request-field change, release note and deprecation path | `/v1/chat/completions` shares the broken handler; `/v1/messages` drops `max_tokens`, `temperature` and `tool_choice` today. |
| G5-2 No executor seam | **BUILD (small)**: executor trait at `messaging.rs:1288`, native only | Additive, BossFang-owned, no behaviour change. |
| G5-3 No UAR full-run executor | **BUILD (large)** in three parts: M5a run client and mapping, M5b five-endpoint admission server, M5c run-scoped `/mcp` | Requires G4; limited to the managed sidecar by UAR's loopback admission rule. |
| G5-4 No drift guard | **BUILD (small)** | Include the SurrealDB version inside `UAR_IMAGE`. |
| G5-5 In-process UAR link | **DO NOT ADOPT** | Cargo exact-pin and feature-union behaviour. |
| G5-6 Merge the loops or delegate every run | **REJECT** | Destroys the upstream merge path. |
| G5-7 Half-wired `link-uar` | **Operator decision**: constrain and wire, or deprecate | It provisions a namespace nothing consumes. |

## 4. Cross-repository dependencies

1. G4 must move `UAR_IMAGE` to a revision at or after `3d6bf056` before any executor step (M5a to M5c).
2. The gateway needs a UAR change to accept `max_tokens`, `temperature` and `tool_choice` on `/v1/messages`.
3. Remote or external-local UAR execution with BossFang approvals needs UAR to accept authenticated remote host admission (S2a).
4. The-boss must move its SurrealDB server, UAR and surreal-memory to 3.3.0 in one release.

## 5. Decisions proposed (awaiting operator confirmation)

- **D-1 Loop ownership:** option C, BossFang control plane with a per-agent executor choice, exactly one executor per run.
- **D-2 Placement:** S1, the BossFang-governed UAR executor only on a managed loopback sidecar; S2a named as the path to remote execution.
- **D-3 Approvals:** UAR's admission port is authoritative for UAR-executed runs, backed by `ApprovalManager`; `/mcp` recognises claimed admissions.
- **D-4 Gateway:** `/v1/messages` only, with a release note for existing `provider = "uar"` agents.
- **D-5 Storage and versions:** separate stores by default; shared server only on the same SurrealDB minor; exact pins per repository; CI drift guard.

## 6. Migration steps (owners from bossfang-stewards)

1. M1 decision record and ledger entries — product-manager.
2. M2 SurrealDB alignment guard, including the version inside `UAR_IMAGE` — surrealdb-schema-engineer.
3. M3 gateway via `/v1/messages` with a real-sidecar contract test — bossfang-feature-steward; can ship against `2aaeadd9`.
4. G4 move `UAR_IMAGE` to at or after `3d6bf056` — bossfang-feature-steward.
5. M4 executor seam, native only — bossfang-feature-steward.
6. M5a UAR executor without BossFang tools — bossfang-feature-steward; after G4 and M4.
7. M5b admission server — bossfang-feature-steward.
8. M5c run-scoped loopback `/mcp` with claim recognition — bossfang-feature-steward.
9. M6 placement capabilities in the binding; remote executor only after S2a — bossfang-feature-steward.
10. M7 storage isolation, memory `schema_version` guard, `link-uar` decision — surrealdb-schema-engineer.
11. M8 `CLAUDE.md` UAR section, stale Cargo comments, `docs/agent-fabric-convergence.md` — bossfang-feature-steward and product-manager.
12. M9 upstream-sync acceptance criteria — upstream-merge-manager with merge-reviewer.
13. M10 3.3.0 train request to the-boss — product-manager.

## 7. Open questions carried into `/kbd-spec` → `/kbd-plan`

1. Should the-boss host BossFang, as a sibling sidecar with its own store?
2. Remote and external-local UAR execution: S1, S2a or S2b?
3. Switch existing `provider = "uar"` agents in one release, or keep the nested behaviour under a deprecated name for one release?
4. Is M5a to M5c in phase-11, or only M1 to M4 plus G4?
5. Whose provider credentials pay for delegated runs?
6. `link-uar`: constrain and wire, or deprecate?
7. Should BossFang and UAR agents ever share one user memory?
8. Will surreal-memory cut release tags, and when does the-boss take the 3.3.0 upgrade?
9. Surfaced for G1/G2: surreal-memory `b7e2093` rejects BossFang's nested `metadata.librefang` writes (`crates/librefang-memory/tests/surreal_vector_integration_test.rs:92`).

The trade-offs for questions 1 to 8 are in the report's "Open questions for the operator" section and in ADR 0001.

## 8. Budget and method

The deep-research pipeline ran in-session with four isolated repository workers and one web worker, two levels of dispatch.
Every load-bearing code claim was re-read at the cited line, including the reviewer's new citations and the shipped `2aaeadd9` revision.
`merge-reviewer` served as the external adversarial review of revision 1; revision 2 awaits re-review.
The Feynman gate was not run, so the package remains `partial` by rule.
