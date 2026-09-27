---
type: research-report
title: "BossFang, UAR, surreal-memory and the-boss: agent-loop ownership, embedded vs remote UAR, and version alignment"
query: "Who should own the agent loop between BossFang and the Universal Agent Runtime, how UAR is offered embedded or remote from BossFang, and how BossFang, UAR, surreal-memory and the-boss stay version-consistent"
date: "2026-09-27"
confidence: 0.89
verification_status: partial
feynman_grade: null
sources_count: 68
contradictions_resolved: 4
package_id: "bossfang-uar-agent-loop-ownership-20260927-5a1c"
job_id: "job-1790550000-p11g5a1c"
okf_version: '0.1'
tags: [deep-research, bossfang, uar, surreal-memory, agent-runtime]
links: []
---

# BossFang, UAR, surreal-memory and the-boss: who owns the agent loop

Research for phase-11 goal G5, written by the product-manager role of the bossfang-stewards team.
Evidence is first-party source code at pinned revisions plus 23 external primary sources.
Repository revisions: BossFang `259f44819` (branch `kbd/phase-11-surreal-recovery-uar-convergence`), UAR `Prometheus-AGS/universal-agent-runtime@3d6bf056`, surreal-memory `Prometheus-AGS/surreal-memory-server@b7e2093`, the-boss `Prometheus-AGS/the-boss@1fe9acff43`.

## Executive summary

BossFang should stay the agent operating system and control plane, and keep its native agent loop as the default executor.
UAR should be offered as a second, per-agent execution runtime behind one BossFang-owned executor seam, with exactly one executor per run, and separately as an optional model gateway.
The two loops should not be merged, and BossFang should not hand every run to UAR.
This matches what the prior BossFang, UAR and the-boss design documents already converged on, and what the-boss already does in production with UAR.

Four findings change the picture the operator started from.

1. The-boss does not bundle, launch or connect to BossFang at all; it bundles UAR (as a supervised sidecar) and surreal-memory (as a Docker service) only.
2. BossFang's current `UarDriver` treats UAR as a model provider, but the UAR endpoint it calls (`/api/chat/completion`) runs a whole UAR agent run, ignores the caller's tool list and keeps only the last user message, so today's seam is a loop nested inside a loop, and BossFang's tools never reach the model through it.
3. UAR already exposes the two correct seams: `/v1/messages`, a true single-turn passthrough that returns tool calls to the caller, and `POST /api/uar/runs`, a full-run delegation API with host-supplied MCP servers, host tool admission and host-seeded history, which the-boss uses today.
4. The SurrealDB baseline is split: BossFang, UAR `main` and surreal-memory `HEAD` are on `=3.3.0`, while the-boss ships UAR `92620d40`, surreal-memory `6acb605` and a SurrealDB server all on `3.2.4`, and a 3.2 to 3.3 upgrade of a datastore is one-way.

"Embedded" UAR must mean a supervised child process bundled in the same artifact, never an in-process crate link.
BossFang should code against a single UAR service binding (managed sidecar, external local, or remote), all over HTTP, with no silent fallback between them.

## Key findings

### F1. BossFang owns a production agent loop, and has no pluggable-runtime seam today

`run_agent_loop` in `crates/librefang-runtime/src/agent_loop/mod.rs:483` is BossFang's loop, entered from `execute_llm_agent` in `crates/librefang-kernel/src/kernel/agent_execution.rs:623`.
Around it BossFang hangs approvals (`ApprovalManager::request_approval`, `approval.rs:890`), compaction (`ContextEngine`, `mod.rs:1091-1144`), deterministic prompt caching (`mod.rs:1256-1260`), and pre- and post-run metering (`agent_execution.rs:645-648`, `:1824-1877`).
The only execution dispatch is a string match on the module prefix (`wasm:`, `python:`, otherwise LLM) at `kernel/messaging.rs:1288-1298`; there is no runtime or executor trait.
This loop is inherited from upstream librefang, so replacing it would put BossFang in conflict with every upstream sync.

### F2. UAR owns a production agent loop too

UAR's run engine is `RunManager` (`src/uar/runtime/manager.rs`, 7,258 lines), and its tool loop is `chat_with_history_mode` in `src/llm/orchestrator.rs` with a hard-coded `MAX_TOOL_ITERATIONS = 10` (line 189).
It streams AG-UI events (`stream_mode = agui_spec`), supports cancellation, checkpoints, resume and human tool approval, and its LLM summarisation is disabled in production (`manager.rs:4833`).
UAR has no scheduler, cron or channel subsystem.

### F3. Today's BossFang-to-UAR provider seam is semantically broken

`UarDriver` posts OpenAI-shaped requests, including BossFang's tool list, to `{endpoint}/api/chat/completion` (`crates/librefang-llm-drivers/src/drivers/uar.rs:895`, body at `:1481-1492`) and expects `tool_calls` back for BossFang's own loop to execute.
On the UAR side that endpoint only debug-logs the `tools` field (`src/server.rs:5171-5172`, documented as "accepted for compatibility" at `:4617`), extracts the last user message (`extract_input_message`, `:4822`), and runs a full UAR agent run with UAR's own tools (`run_manager.execute_request`, `:5533`).
BossFang's tests for this driver run against `wiremock` mocks (`uar.rs:1556` onward), which is why the mismatch was not caught.
UAR's `/v1/messages` endpoint (`src/server.rs:1809`) is the correct model-gateway surface: it converts and forwards the caller's tools and returns `tool_use` with no UAR loop (`:4040-4110`).

### F4. The-boss runs UAR as the loop owner and BossFang not at all

The-boss's UAR runtime creates a catalog agent, then calls `POST /api/uar/runs` with `mcp_servers`, `tool_admission`, run credentials and seeded history, and streams `?stream_mode=agui_spec` (`src/main/ai/runtime/uar/UarRuntimeConnection.ts:198-252`).
Its phase goals state "UAR runs the loop" while the host keeps identity, credentials, approvals and tools (`.kbd-orchestrator/phases/the-boss-shipping-and-settings/children/the-boss-universal-agent-runtime/goals.md:18`).
A search of `src`, `packages`, `scripts`, `build`, `electron-builder.yml` and `package.json` finds no reference to librefang or BossFang; BossFang appears only as an export target of the packaged agent-team-creator skill.

### F5. The prior design documents already agree on the split

BossFang's `docs/agent-fabric-convergence.md` (2026-09-25) keeps workflows, channels, schedules, Hands, sessions, approvals, metering and the native loop in BossFang, and plans a separate full-run delegation route (initiative slice C05) where "BossFang does not run a shadow loop or replay UAR tool calls".
UAR's `docs/agent-fabric-convergence.md` states "UAR owns the execution loop" for an admitted run while the host owns identity, canonical history, provider secrets and the human approval decision.
UAR's `docs/librefang-integration.md` §6 recommends BossFang supervise UAR out of process rather than link the crate.
BossFang's phase-10 decision log (2026-07-11 and 2026-07-31) chose a supervised child process over an in-process link.

### F6. The in-process link is retired, and it should stay retired

`Cargo.lock` contains no `universal-agent-runtime` package, and `uar-driver` is now an empty feature forwarded down the crate chain (`librefang-llm-drivers/Cargo.toml:16`).
Cargo cannot build two different exact `=` pins of one crate in a semver-compatible range (Cargo Book, dependency resolution), and features are unioned across the graph, which is how one hardcoded feature once forced UAR's `=3.2.1` SurrealDB pin into every BossFang build.
UAR's library build still carries liter-llm, rmcp, surreal-memory and mimalloc as non-optional dependencies (`Cargo.toml`), so an in-process link would reimport that coupling.

### F7. Memory is surreal-memory in all three, but as three separately versioned copies

BossFang links surreal-memory as a library at rev `b7e2093` (`Cargo.toml:131`) into its own `memory` database.
UAR vendors a source snapshot of upstream `432eaa1` with a patched manifest that pins `surrealdb =3.3.0` (`vendor/git/README.md`), keeps memory off by default, and forces it off in the sidecar (`src/bin/uar-sidecar.rs:189`).
The-boss runs surreal-memory `6acb605` as a Docker MCP service against a shared SurrealDB server, off by default in workspaces.
surreal-memory owns its schema (migrations v1 to v21, applied on every connect) and has no release tags beyond `v1.8.0`, so consumers pin by git rev.

### F8. SurrealDB versions are split across the release trains

| Component | SurrealDB client | Server it talks to |
|---|---|---|
| BossFang `259f44819` | `=3.3.0` (plus `-core`, `-types`) | embedded RocksDB, or k8s `surrealdb:v3.3.0` |
| surreal-memory `b7e2093` | `=3.3.0` | caller's choice |
| UAR `main` `3d6bf056` | `=3.3.0`, vendored surreal-memory patched to `=3.3.0` | embedded SurrealKV, or remote |
| UAR `92620d40` shipped in the-boss 2.2.3 | `=3.2.4` | shared the-boss server |
| surreal-memory `6acb605` shipped in the-boss | `=3.2.4` | shared the-boss server |
| the-boss SurrealDB server | n/a | `surrealdb:v3.2.4`, surrealkv engine |

SurrealDB documents that a 3.2 datastore opens on 3.3 in place but cannot return to 3.2 once a 3.3.0 node has started against it, and that a 3.2 node fails kNN queries after a 3.3 node writes an HNSW index.
No script or CI job in BossFang checks any of these pins against each other.

## The overlap, and who should own each capability

| Capability | BossFang today | UAR today | surreal-memory today | Recommended owner |
|---|---|---|---|---|
| Agent loop (turns, tool loop, compaction, streaming) | `run_agent_loop`, production | `RunManager` + orchestrator, production, summarisation off | none | Per run, exactly one executor: BossFang native by default, UAR for agents bound to the UAR runtime |
| LLM provider drivers | `librefang-llm-drivers`, many native plus CLI drivers | liter-llm catalog of 322 providers, two tier-1 certified | none | BossFang keeps its drivers; UAR is an optional model gateway via `/v1/messages`; UAR's drivers serve UAR-executed runs |
| Tool and MCP hosting | MCP client, MCP server at `/mcp`, tool runner | MCP client, `/mcp/uar`, native and WASM tools, Cedar | MCP server in the standalone binary | The run's executor executes tools; BossFang tools reach UAR runs as a run-scoped MCP server |
| Approvals | `ApprovalManager`, persisted | tool approval plus host `tool_admission` port | none | BossFang decides; UAR enforces; host deny cannot be overridden |
| Memory (semantic, graph, tasks) | `librefang-memory` over surreal-memory library | `MemoryService` over vendored surreal-memory, off in sidecar | the library and its schema | surreal-memory owns schema and algorithms; BossFang owns memory policy for its agents, including delegated ones |
| Sessions and history | sessions, canonical sessions, `session_mode` | `PersistenceLayer` sessions, host-seeded history | none | BossFang canonical history is authoritative; UAR receives it per run |
| Storage and schema | `librefang-storage`, 44 migrations, ns `librefang` | own `.surql` migrations, ns `uar` | migrations v1 to v21 | Each schema owner migrates only its own database |
| Skills, Hands, agent specs | skills, Hands, manifests, `librefang-uar-spec` | skills loader, UAR-AGENT-MD compiler, collaboration draft | none | BossFang owns manifests and Hands; UAR-AGENT-MD stays a translated import format |
| Scheduling, triggers, workflows | cron, triggers, workflows | none | none | BossFang |
| Channels | 19-file channel crate | none | none | BossFang |
| Auth and identity | RBAC, pairing, WebAuthn | JWT, PAT, sidecar launch token, `x-uar-principal` | namespace-scoped DB users | BossFang identity is authoritative and is asserted to UAR per run |
| Metering and budgets | quota, global, provider and user budgets | metrics, cost ledger, budgets | none | BossFang is the budget authority; UAR reports per-run usage that BossFang records once |
| External protocols | A2A server, ACP (Zed) | A2A (feature-gated), ACP (partial), AG-UI (production) | A2A routes | BossFang is the external A2A and ACP face; AG-UI is the BossFang-to-UAR run stream |

## Options for agent-loop ownership

### Option A: BossFang owns every loop, UAR is only a model gateway

BossFang keeps all tools, approvals, sessions, metering, channels and prompt caching in one place, and upstream merges are unaffected.
It wastes UAR's run engine, governed tools and AG-UI streaming, and requires retargeting `UarDriver` to `/v1/messages` to work at all.
This is the right shape for the model-gateway use, but not for the whole relationship.

### Option B: UAR owns every loop, BossFang delegates all runs

BossFang would become a channel and scheduling shell, and every tool call, approval and memory write would cross a process boundary.
BossFang's native loop is upstream code that keeps changing, so either the fork deletes it and absorbs conflict on every sync, or keeps it dead and pays merge cost for nothing.
Channels, cron, Hands, `session_mode`, deterministic prompt caching and per-agent budgets would all need UAR equivalents that do not exist.
Rejected.

### Option C: BossFang is the control plane, with a per-agent choice of executor (recommended)

BossFang admits every run (channels, cron, triggers, Hands, API) and then dispatches it to exactly one executor through a BossFang-owned seam.
The native executor is today's `run_agent_loop`; the UAR executor calls `POST /api/uar/runs`, streams `agui_spec`, and maps the result back into BossFang sessions, metering and channels.
BossFang's tools are offered to a UAR run as a run-scoped MCP server (BossFang already serves `/mcp` for the claude-code driver), and every tool effect passes BossFang's approvals through UAR's `tool_admission` port.
Canonical history stays in BossFang and is seeded into each UAR run, and UAR memory stays off for delegated runs so memory is not written twice.
This is the same shape the-boss runs in production with UAR, which is evidence the UAR side of the contract works.
The seam is additive and lives in BossFang-owned modules, so upstream merge cost is small.

### Option D: merge the two loops

Merging would weld code that changes on two independent schedules (upstream librefang and UAR) into one loop that neither project could merge cleanly.
Rejected.

### Consequences of the recommendation

| Concern | Native executor | UAR executor |
|---|---|---|
| Tools | BossFang tool runner | UAR executes; BossFang tools via run-scoped MCP |
| Approvals | `ApprovalManager` in loop | BossFang decides through `tool_admission`; UAR pauses and enforces |
| Sessions | BossFang session | BossFang canonical history seeded per run; result appended to the BossFang session |
| Memory | BossFang memory | BossFang memory injected as context or MCP; UAR memory off |
| Metering | pre-check and record | pre-check in BossFang; UAR usage recorded once on completion |
| Channels | unchanged | unchanged; the channel sees one BossFang run |
| Prompt caching | BossFang deterministic ordering | UAR's responsibility inside the run |
| Embedded vs remote | n/a | same client over the service binding |
| Upstream merges | unchanged | new code in BossFang-owned modules only |

## Embedded versus remote UAR

"Embedded" can only safely mean a UAR binary shipped inside the same artifact and supervised by BossFang as a child process: the Docker image already copies `uar-sidecar` from the pinned UAR image (`Dockerfile:10-11`, `:359`), and `UarSidecarSupervisor` implements the launch-token, `READY:{port}` and stdin-EOF contract (`crates/librefang-channels/src/uar_sidecar.rs`).
An in-process link would reimport UAR's exact SurrealDB pin, its non-optional dependency tree and its nightly toolchain into every BossFang build.
UAR's transport-free `EmbeddedRuntime` library is appropriate for hosts that must run in one process (for example a mobile app), not for BossFang.

BossFang should code against one abstraction: a UAR service binding with three placements.

| Placement | Who owns the process | Transport | Storage |
|---|---|---|---|
| Managed sidecar | BossFang supervisor | loopback HTTP, launch token | UAR's own embedded SurrealKV under the BossFang home |
| External local | OS, container or the-boss | loopback HTTP, configured credentials | whatever that instance uses |
| Remote | operator | HTTPS, configured credentials | whatever that instance uses |

The binding carries instance identity and negotiated capabilities (the C04 compatibility exchange already in `uar.rs`), and an explicitly selected instance that is unreachable is an error, never a trigger to spawn the bundled one.

## Version-alignment policy

1. The rule that matters is "clients that share a datastore upgrade together, and the server is upgraded last and never downgraded", not "every repository uses identical pins".
2. Keep exact `=` pins inside each repository for `surrealdb`, `surrealdb-core` and `surrealdb-types`, because minor releases change internal APIs; this is safe now that no two of the projects link into one binary.
3. Default to separate stores: BossFang in namespace `librefang` (databases `main` and `memory`), UAR in its own embedded SurrealKV or namespace `uar`, the-boss's surreal-memory service in namespace `memory`.
4. Never point two different schema owners, or two different surreal-memory revisions, at the same database.
5. Each schema owner migrates only its own database: `librefang-storage` for `librefang/main`, surreal-memory for whichever memory database its consumer names, UAR for `uar`.
6. surreal-memory should cut release tags so BossFang and UAR can cite the same version, and UAR's vendored snapshot should record an upstream commit that is an ancestor of, or equal to, BossFang's pin whenever the two might share a memory database.
7. The-boss must move its SurrealDB server, UAR sidecar and surreal-memory image to the 3.3.0 train in one release, because the datastore upgrade is one-way.
8. BossFang gets a drift guard (`scripts/check-surreal-alignment.py`, run in CI) that fails when the three SurrealDB crate pins differ, when `Cargo.lock` resolves a different version, when the surreal-memory rev in `Cargo.toml` and `Cargo.lock` differ, when surreal-memory's own manifest at that rev pins a different SurrealDB version, when the k8s SurrealDB image tag differs from the crate version, or when `Cargo.lock` contains `universal-agent-runtime`.

## Migration path

| Step | Change | Owner | Independently shippable because |
|---|---|---|---|
| M1 | Adopt the decision record and add the executor seam, UAR gateway, UAR executor and alignment guard to `docs/bossfang/feature-ledger.md` | product-manager | documentation only |
| M2 | Add the SurrealDB alignment guard script and CI job | surrealdb-schema-engineer | pure check, no behaviour change |
| M3 | Retarget `UarDriver` to `/v1/messages`, relabel it as the UAR model gateway, and add a contract test against a real `uar-sidecar` binary | bossfang-feature-steward | fixes a live defect behind the existing feature |
| M4 | Add an executor seam at the kernel dispatch point with the native executor as the only implementation and a manifest field defaulting to native | bossfang-feature-steward | no behaviour change |
| M5 | Implement the UAR executor over `POST /api/uar/runs`, AG-UI stream mapping, run-scoped BossFang MCP, `tool_admission` to `ApprovalManager`, seeded history and usage recording, with integration tests | bossfang-feature-steward | opt-in per agent |
| M6 | Extend the executor to external-local and remote placements over the same binding, with no silent fallback | bossfang-feature-steward | opt-in per binding |
| M7 | Document storage isolation and add a check that refuses a memory database whose `schema_version` is newer than the linked surreal-memory knows | surrealdb-schema-engineer | guard only |
| M8 | Remove stale in-process comments and correct the UAR sections of `CLAUDE.md` | bossfang-feature-steward | documentation and comments |
| M9 | Add the seam, gateway and executor to upstream-sync acceptance criteria and review every sync against them | upstream-merge-manager, merge-reviewer | process only |
| M10 | Hand the-boss the 3.3.0 train change and, if wanted, a BossFang sibling-sidecar proposal | product-manager | cross-repository request, no BossFang code |

## Evidence table

| Claim | Label | Evidence |
|---|---|---|
| BossFang's loop is `run_agent_loop` and has no runtime trait | verified | `agent_loop/mod.rs:483`, `messaging.rs:1288-1298` |
| UAR `/api/chat/completion` ignores caller tools and runs a UAR agent | verified | UAR `src/server.rs:4617`, `:5171`, `:5533` |
| `UarDriver` sends tools to that endpoint | verified | `uar.rs:895`, `:1484` |
| UAR `/v1/messages` forwards caller tools with no loop | verified | UAR `src/server.rs:1809`, `:4055` |
| The-boss delegates full runs to UAR and does not reference BossFang | verified | `UarRuntimeConnection.ts:198-252`, repository search |
| The-boss ships SurrealDB 3.2.4 | verified | `build/integration-artifacts.json:256` |
| BossFang, UAR main and surreal-memory HEAD pin 3.3.0 | verified | the three `Cargo.toml` files |
| 3.3 upgrade is one-way | verified | SurrealDB 3.2 to 3.3 migration guide |
| Cargo cannot unify two exact pins | verified | Cargo Book, dependency resolution |
| Option C is the lowest-risk ownership split | inferred | from F1 to F8 and the external takeaways |

## Contradictions and how they were resolved

- BossFang's convergence note says `UarDriver` makes UAR "an LLM provider inside the native loop", but UAR's code runs a full UAR agent behind that endpoint; the code wins, and the seam is a nested loop.
- The operator's framing says all three projects come together in the-boss, but the-boss's code bundles only UAR and surreal-memory; the code wins.
- UAR's documentation claims 142 or more providers while its catalog lists 322 and certifies two; these measure different things, and "two certified" is the operative number for support.
- The-boss's goals say UAR falls back to its embedded store when Docker is down, but no automatic fallback exists in code, only rollback of a failed profile apply; the code wins.
- UAR's `versions.toml` pins liter-llm `1.18.2`, while its lockfile resolves `2.0.3`; this is unresolved and belongs to UAR's maintainers.

## Confidence and limits

Confidence in the ownership recommendation is 0.82.
It is high on the facts (every load-bearing code claim was re-read at the cited line), and lower on cost, because the UAR executor (M5) has not been prototyped and the size of the AG-UI-to-BossFang event mapping is estimated from the-boss's adapter.
The Feynman gate and the in-pipeline adversarial review were not run, so this package is `partial` by rule; phase-11 acceptance routes review to `merge-reviewer`.

## Open questions for the operator

1. Should the-boss host BossFang at all, and if so as a sibling sidecar with its own store (the "both managed sidecars" mode), or should BossFang stay a server-side product?
2. Is per-agent UAR delegation (M5) wanted this phase, or is the corrected model gateway (M3) enough for now?
3. Should BossFang agents and UAR agents ever share one user memory, which would require surreal-memory to run as one service rather than two library copies?
4. Will surreal-memory start cutting release tags?
5. When should the-boss take the one-way 3.3.0 datastore upgrade?

## References

See `citations.json` for the full list with credibility scores.
Primary external sources: Microsoft Azure Architecture Center, Sidecar pattern; Kubernetes, Sidecar containers; Dapr sidecar overview; A2A specification and Linux Foundation announcement; Agent Client Protocol introduction and Zed's announcement; AG-UI events; MCP 2025-06-18 tools; OpenAI function calling; Anthropic Agent SDK overview and permissions; AWS Bedrock AgentCore Runtime; LangChain Agent Protocol; Microsoft Agent Framework; Cargo Book resolver, dependency specification and features; SurrealDB 2.x to 3.x and 3.2 to 3.3 migration guides; SurrealDB namespace and database architecture.
