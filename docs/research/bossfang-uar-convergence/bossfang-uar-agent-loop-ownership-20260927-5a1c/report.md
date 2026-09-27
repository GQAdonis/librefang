---
type: research-report
title: "BossFang, UAR, surreal-memory and the-boss: agent-loop ownership, embedded vs remote UAR, and version alignment"
query: "Who should own the agent loop between BossFang and the Universal Agent Runtime, how UAR is offered embedded or remote from BossFang, and how BossFang, UAR, surreal-memory and the-boss stay version-consistent"
date: "2026-09-27"
confidence: 0.9
verification_status: partial
feynman_grade: null
sources_count: 83
contradictions_resolved: 5
package_id: "bossfang-uar-agent-loop-ownership-20260927-5a1c"
job_id: "job-1790550000-p11g5a1c"
okf_version: '0.1'
tags: [deep-research, bossfang, uar, surreal-memory, agent-runtime]
links: []
---

# BossFang, UAR, surreal-memory and the-boss: who owns the agent loop

Research for phase-11 goal G5, written by the product-manager role of the bossfang-stewards team.
Revision 2: addresses the `merge-reviewer` CHANGES REQUESTED findings on commit `697090473` (see "Review record" at the end).
Evidence is first-party source code at pinned revisions plus 23 external primary sources (83 sources in all).

Repository revisions read:

- BossFang `259f44819` (branch `kbd/phase-11-surreal-recovery-uar-convergence`).
- UAR `main` at `3d6bf056` (2026-09-27), used for every "UAR can" claim unless marked otherwise.
- UAR `2aaeadd9` (2026-07-31), the revision BossFang actually ships today (`Dockerfile:10`, `ARG UAR_IMAGE=ghcr.io/gqadonis/universal-agent-runtime:2aaeadd9…`), 609 commits behind `3d6bf056`.
- surreal-memory `b7e2093`.
- the-boss `1fe9acff43`, which ships UAR `92620d40` and surreal-memory `6acb605`.

Two confidence numbers appear in this package, and they measure different things.
The front-matter `confidence: 0.9` is the package-level, credibility-weighted mean confidence of the 38 labelled claims, as the research-package contract defines it.
The confidence in the recommendation itself (option C with the scoping in this revision) is 0.78, lower because the UAR executor has not been prototyped and two of its prerequisites are UAR-side or operator decisions.

## Executive summary

BossFang should stay the agent operating system and control plane, and keep its native agent loop as the default executor.
UAR should be offered as a second, per-agent execution runtime behind one BossFang-owned executor seam, with exactly one executor per run, and separately as an optional model gateway.
The two loops should not be merged, and BossFang should not hand every run to UAR.

Revision 2 narrows that recommendation in three ways the reviewer showed were necessary.

1. The full BossFang-governed UAR executor (BossFang approvals and BossFang tools inside a UAR run) is only possible with a UAR instance that BossFang launched itself as a loopback sidecar, because UAR accepts host tool admission only over loopback and only from a launch-token-authenticated host.
2. None of the full-run host features exist in the UAR revision BossFang ships (`2aaeadd9`), so every executor step depends on G4 moving `UAR_IMAGE` to a revision at or after `3d6bf056`.
3. The model-gateway fix is a codec change with a behaviour change for existing `provider = "uar"` agents, not a URL retarget.

Four findings change the picture the operator started from.

1. The-boss does not bundle, launch or connect to BossFang at all; it bundles UAR (as a supervised sidecar) and surreal-memory (as a Docker service) only.
2. BossFang's `UarDriver` treats UAR as a model provider, but the UAR endpoint it calls runs a whole UAR agent, ignores the caller's tool list and keeps only the last user message; this is true both at `3d6bf056` and in the shipped `2aaeadd9` image.
3. UAR exposes two correct seams: `/v1/messages`, a single-turn passthrough that returns tool calls to the caller, and `POST /api/uar/runs`, a full-run API whose host features (run-scoped MCP servers, host tool admission, seeded history) exist only on `main`.
4. The SurrealDB baseline is split: BossFang, UAR `main` and surreal-memory `HEAD` are on `=3.3.0`, while the-boss ships UAR `92620d40`, surreal-memory `6acb605` and a SurrealDB server all on `3.2.4`, and a 3.2 to 3.3 upgrade of a datastore is one-way.

## Key findings

### F1. BossFang owns a production agent loop, and has no pluggable-runtime seam today

`run_agent_loop` in `crates/librefang-runtime/src/agent_loop/mod.rs:483` is BossFang's loop, entered from `execute_llm_agent` in `crates/librefang-kernel/src/kernel/agent_execution.rs:623`.
Around it BossFang hangs approvals (`ApprovalManager::request_approval`, `approval.rs:890`), compaction (`ContextEngine`, `mod.rs:1091-1144`), deterministic prompt caching (`mod.rs:1256-1260`), and pre- and post-run metering (`agent_execution.rs:645-648`, `:1824-1877`).
Its default iteration cap is 50 (`AutonomousConfig::DEFAULT_MAX_ITERATIONS`, `crates/librefang-types/src/agent.rs:147`).
The only execution dispatch is a string match on the module prefix (`wasm:`, `python:`, otherwise LLM) at `kernel/messaging.rs:1288-1298`; there is no runtime or executor trait.
This loop is inherited from upstream librefang, so replacing it would put BossFang in conflict with every upstream sync.

### F2. UAR owns a production agent loop too

UAR's run engine is `RunManager` (`src/uar/runtime/manager.rs`, 7,258 lines), and its tool loop is `chat_with_history_mode` in `src/llm/orchestrator.rs` with a hard-coded `MAX_TOOL_ITERATIONS = 10` (line 189).
It streams AG-UI events (`stream_mode = agui_spec`), supports cancellation, checkpoints, resume and human tool approval, and its LLM summarisation is disabled in production (`manager.rs:4833`).
UAR has no scheduler, cron or channel subsystem.

### F3. Today's BossFang-to-UAR provider seam is semantically broken, in the shipped image too

`UarDriver` posts OpenAI-shaped requests, including BossFang's tool list, to `{endpoint}/api/chat/completion` (`crates/librefang-llm-drivers/src/drivers/uar.rs:895`, body at `:1481-1492`) and expects `tool_calls` back for BossFang's own loop to execute.
On UAR `main` that endpoint only debug-logs the `tools` field (`src/server.rs:5171-5172`, documented as "accepted for compatibility" at `:4617`), extracts the last user message (`extract_input_message`, `:4822`), and runs a full UAR agent run with UAR's own tools (`run_manager.execute_request`, `:5533`).
`/v1/chat/completions` is routed to the same handler (`src/server.rs:1808`), so an OpenAI-format retarget is not a fix.
The reviewer confirmed the same behaviour in the shipped `2aaeadd9` image.
BossFang's tests for this driver run against `wiremock` mocks (`uar.rs:1556` onward), which is why the mismatch was not caught.

### F4. The-boss runs UAR as the loop owner, over loopback only, and BossFang not at all

The-boss's UAR runtime creates a catalog agent, then calls `POST /api/uar/runs` with `mcp_servers`, `tool_admission`, run credentials and seeded history, and streams `?stream_mode=agui_spec` (`src/main/ai/runtime/uar/UarRuntimeConnection.ts:198-252`).
It does so against a sidecar it launched itself with a launch token, over loopback (`UarSidecarService.ts`), which is the only shape UAR accepts host admission from (F9).
A search of `src`, `packages`, `scripts`, `build`, `electron-builder.yml` and `package.json` finds no reference to librefang or BossFang.

### F5. The prior design documents already agree on the split

BossFang's `docs/agent-fabric-convergence.md` (2026-09-25) keeps workflows, channels, schedules, Hands, sessions, approvals, metering and the native loop in BossFang, and plans a separate full-run delegation route (slice C05) where "BossFang does not run a shadow loop or replay UAR tool calls".
UAR's `docs/agent-fabric-convergence.md` states "UAR owns the execution loop" for an admitted run while the host owns identity, canonical history, provider secrets and the human approval decision.
UAR's `docs/librefang-integration.md` §6 recommends BossFang supervise UAR out of process rather than link the crate.

### F6. The in-process link is retired, and it should stay retired

`Cargo.lock` contains no `universal-agent-runtime` package, and `uar-driver` is now an empty feature forwarded down the crate chain (`librefang-llm-drivers/Cargo.toml:16`).
Cargo cannot build two different exact `=` pins of one crate in a semver-compatible range, and features are unioned across the graph (Cargo Book).
UAR's library build still carries liter-llm, rmcp, surreal-memory and mimalloc as non-optional dependencies, so an in-process link would reimport that coupling.

### F7. Memory is surreal-memory in all three, but as three separately versioned copies

BossFang links surreal-memory as a library at rev `b7e2093` (`Cargo.toml:131`) into its own `memory` database.
UAR vendors a source snapshot of upstream `432eaa1` with a manifest patched to pin `surrealdb =3.3.0` (`vendor/git/README.md`), keeps memory off by default, and forces it off in the sidecar (`src/bin/uar-sidecar.rs:189`).
The-boss runs surreal-memory `6acb605` as a Docker MCP service against a shared SurrealDB server, off by default in workspaces.
surreal-memory owns its schema (migrations v1 to v21, applied on every connect) and has no release tags beyond `v1.8.0`.

### F8. SurrealDB versions are split across the release trains

| Component | SurrealDB client | Server it talks to |
|---|---|---|
| BossFang `259f44819` | `=3.3.0` (plus `-core`, `-types`) | embedded RocksDB, or k8s `surrealdb:v3.3.0` |
| surreal-memory `b7e2093` | `=3.3.0` | caller's choice |
| UAR `main` `3d6bf056` | `=3.3.0` | embedded SurrealKV, or remote |
| UAR `92620d40` shipped in the-boss 2.2.3 | `=3.2.4` | shared the-boss server |
| surreal-memory `6acb605` shipped in the-boss | `=3.2.4` | shared the-boss server |
| the-boss SurrealDB server | n/a | `surrealdb:v3.2.4`, surrealkv engine |

SurrealDB documents that a 3.2 datastore cannot return to 3.2 once a 3.3.0 node has started against it, and that a 3.2 node fails kNN queries after a 3.3 node writes an HNSW index.
No script or CI job in BossFang checks any of these pins against each other.
The SurrealDB client version inside BossFang's shipped UAR image `2aaeadd9` was not read for this revision; M2 must read it from the image rather than assume it.

### F9. UAR accepts BossFang-governed tool execution only from a launch-token loopback host

UAR's host tool-admission adapter accepts only an `http` loopback URL whose path is `/uar/admission/v1` (`src/uar/runtime/tool_admission/http.rs:77-87`).
`create_run` refuses any `tool_admission` without the `HostAuthenticated` extension (`src/uar/api/routes.rs:532-539`), which is inserted only by the sidecar launch-token guard (`src/uar/security/sidecar_guard.rs:168`).
A run-scoped MCP server must be either a loopback `http` URL (`src/uar/runtime/turn/host/mcp.rs:209-223`) or a grant against a destination an administrator registered globally on that UAR instance, presented by a caller holding the `host-session` role or `uar:mcp:delegate` plus an instance id (`mcp.rs:110-117`, `:249-285`, `:351-361`).
Consequence: BossFang can govern a UAR run's tools only on a UAR it launched as its own sidecar.
An external-local instance launched by someone else (for example the-boss) does not carry BossFang's launch token, so it is in the same position as a remote one.

### F10. The shipped UAR image has none of the full-run host features

At `2aaeadd9`, `CreateRunRequest` is only `{artifact, input, session_id}` (`src/uar/api/routes.rs:34-38` at that revision), and `tool_admission/http.rs`, `turn/host/mcp.rs` and `turn/host/history.rs` do not exist.
`/v1/messages` does exist there and forwards caller tools (`src/server.rs:952`, `:2901` at that revision).
So the model-gateway fix (M3) can target the shipped image, but every executor step depends on G4.

### F11. BossFang already has a half-wired "UAR on BossFang's SurrealDB server" feature

`POST /api/storage/link-uar` and `librefang storage link-uar` call `provision_uar_namespace` (`crates/librefang-storage/src/provision.rs:53`), which defines namespace `uar`, database `main` and a least-privilege `uar_app` user on BossFang's remote SurrealDB server, and then write `[uar.remote]` and optionally `share_librefang_storage` into `config.toml` (`crates/librefang-api/src/routes/storage.rs:480-600`).
The sidecar supervisor reads `surreal_data_dir` (`crates/librefang-channels/src/uar_sidecar.rs:156`) but no code outside the config type, the CLI and the storage route reads `remote` or `share_librefang_storage`, so the provisioned namespace is never handed to UAR.
`CLAUDE.md` says `provision_uar_namespace()` "is still called at boot", but its only caller is the storage route (`routes/storage.rs:504`).

## The overlap, and who should own each capability

| Capability | BossFang today | UAR today (`main`) | surreal-memory today | Recommended owner |
|---|---|---|---|---|
| Agent loop | `run_agent_loop`, production | `RunManager` + orchestrator, production, summarisation off | none | Per run, exactly one executor: BossFang native by default, UAR for agents bound to a managed UAR sidecar |
| LLM provider drivers | `librefang-llm-drivers` | liter-llm catalog, 322 providers, two tier-1 certified | none | BossFang; UAR as an optional gateway via `/v1/messages`; UAR's drivers for UAR-executed runs |
| Tool and MCP hosting | MCP client, MCP server at `/mcp`, tool runner | MCP client, `/mcp/uar`, native and WASM tools, Cedar | MCP server in the standalone binary | The run's executor executes tools; BossFang tools reach UAR runs only as a loopback run-scoped MCP server |
| Approvals | `ApprovalManager` and the `execute_tool` gate | host `tool_admission` port (loopback, launch-token host only) | none | BossFang is authoritative for managed-sidecar runs; see the approval section |
| Memory | `librefang-memory` over the surreal-memory library | `MemoryService` over vendored surreal-memory, off in sidecar | the library and its schema | surreal-memory owns schema; BossFang owns memory policy for its agents |
| Sessions and history | sessions, canonical sessions, `session_mode` | `PersistenceLayer`, host-seeded history (1,000 messages, 4 MiB cap) | none | BossFang canonical history is authoritative; BossFang compacts before seeding |
| Storage and schema | `librefang-storage`, 44 migrations, ns `librefang` | own `.surql` migrations, ns `uar` | migrations v1 to v21 | Each schema owner migrates only its own database |
| Skills, Hands, agent specs | skills, Hands, manifests, `librefang-uar-spec` | skills loader, UAR-AGENT-MD compiler | none | BossFang; UAR-AGENT-MD stays a translated import format |
| Scheduling, triggers, workflows, channels | yes | none | none | BossFang |
| Auth and identity | RBAC, pairing, WebAuthn | JWT, PAT, sidecar launch token, `x-uar-principal` | namespace-scoped DB users | BossFang identity is authoritative and asserted to UAR per run |
| Metering and budgets | quota, reservations, global/provider/user budgets | metrics, cost ledger, budgets | none | BossFang is the budget authority; UAR's ledger is informational |
| External protocols | A2A server, ACP (Zed) | A2A (feature-gated), ACP (partial), AG-UI (production) | A2A routes | BossFang faces outward; AG-UI is the BossFang-to-UAR run stream |

## Options for agent-loop ownership

### Option A: BossFang owns every loop, UAR is only a model gateway

BossFang keeps tools, approvals, sessions, metering, channels and prompt caching in one place, and upstream merges are unaffected.
It wastes UAR's run engine, governed tools and AG-UI streaming.
This is the right shape for the gateway use, not for the whole relationship.

### Option B: UAR owns every loop, BossFang delegates all runs

BossFang would become a channel and scheduling shell, every tool call and approval would cross a process boundary, and upstream loop code would be deleted or orphaned.
Channels, cron, Hands, `session_mode`, deterministic prompt caching and per-agent budgets would need UAR equivalents that do not exist.
Rejected.

### Option C: BossFang control plane, per-agent executor choice (recommended)

BossFang admits every run and dispatches it to exactly one executor through a BossFang-owned seam.
The native executor is today's `run_agent_loop`; the UAR executor calls `POST /api/uar/runs`, streams `agui_spec`, and maps the result into BossFang sessions, metering and channels.
BossFang tools reach a UAR run as a loopback run-scoped MCP server, BossFang decides tool effects through UAR's `tool_admission` port, and BossFang seeds canonical history, with UAR memory off.
This is the shape the-boss runs in production, and it is available to BossFang only against a UAR sidecar BossFang launched itself (F9) at a revision that has the host features (F10).

### Option D: merge the two loops

Merging would weld code on two independent change schedules into one loop neither project could merge cleanly.
Rejected.

## Scope of the UAR executor across placements (H1)

The first revision said one binding would serve managed sidecar, external local and remote placements with the same guarantees; F9 shows that is false.
There are two coherent ways forward.

**Option S1: scope the BossFang-governed UAR executor to the managed sidecar.**
The UAR executor, with BossFang tools and BossFang approvals, is offered only for a UAR instance BossFang launched as a loopback sidecar with its launch token.
External-local and remote UAR instances are offered only as model gateways (`/v1/messages`) until UAR supports remote host admission.
Guarantee: every tool effect in a UAR-executed run is decided by BossFang.
Cost: remote UAR cannot execute BossFang agents.
No UAR change is needed.

**Option S2: define a remote contract.**
S2a (UAR-side change): extend host admission to authenticated remote hosts, for example HTTPS with a signed per-run token or mTLS and a `uar:admission:delegate` role mirroring the existing `uar:mcp:delegate` MCP grant path, and let run-scoped MCP servers use the same authenticated destination grant for BossFang's `/mcp`.
This keeps the same guarantee remotely, but it is UAR work outside this repository, it opens a network path into BossFang's approval surface, and its timeline is not ours.
S2b (stated weaker guarantee): remote runs execute with only UAR-native tools and administrator-registered MCP destinations, governed by UAR's own policy (Cedar and UAR tool approval), and BossFang records the result without deciding effects.
This needs no UAR change, but BossFang would then be running agents whose tool effects it does not approve, which contradicts the ownership table for approvals.

**Recommendation:** S1 now, with S2a as the named path to remote execution, and S2b only if the operator explicitly accepts the weaker guarantee for specific agents.
This is an operator decision (open question 2).

## UAR executor costs (M-a)

| Concern | What the code says | Consequence and proposed handling |
|---|---|---|
| Compaction | UAR LLM summarisation is off in production (`manager.rs:4833`); seeded history is capped at 1,000 messages and 4 MiB (`turn/host/history.rs:8-9`) | BossFang owns compaction for delegated runs: it compacts with its own compactor before seeding and fails loudly rather than letting UAR truncate. |
| Iteration cap | UAR: hard-coded 10 tool iterations per run (`orchestrator.rs:189`); BossFang default 50 (`agent.rs:147`) | Agents moved to UAR silently lose depth; BossFang must surface UAR's max-iteration termination as a distinct run outcome, and a configurable cap is a UAR request. |
| Budget pre-check | BossFang checks quota before a run and records after it; it has a reservation API (`reserve_global_budget`, `librefang-kernel-metering/src/lib.rs:229`) | A UAR run can spend up to 10 model calls between BossFang checkpoints; BossFang should reserve an estimated maximum before admission and settle on completion. |
| Double counting | UAR keeps its own cost ledger and budgets (`src/uar/runtime/cost_budget.rs`) | BossFang is the budget authority; UAR's ledger is informational and is never summed into BossFang totals. |
| Provider credentials | UAR can use host-passed `run_credentials` (`routes.rs:83`) or its own configured provider | Whose keys pay for a delegated run is an operator decision (open question 5); passing BossFang's credentials keeps spend attributable to BossFang providers and budgets. |
| Cancellation | UAR `POST /api/uar/runs/{id}/cancel` | BossFang stop/kill maps to that call; a channel or UI detach does not cancel the run. |
| Approval latency | UAR effect authority defaults to 300 s (`tool_admission/mod.rs:32`), overridable per artifact via `extensions.budgets.timeout_seconds` (`:101-106`); BossFang approvals can be deferred for hours | BossFang must set the artifact timeout from its approval policy, and an approval that outlives it becomes a visible expired decision, not a late execution. |
| Switching executor mid-session | UAR sessions are keyed by `session_id`; BossFang history is canonical | The executor is bound per agent; a switch starts a new UAR session seeded from BossFang history and never reuses a UAR `session_id` across a switch. |
| Prompt caching | BossFang's deterministic ordering (#3298) does not reach inside a UAR run | Accepted cost; cache behaviour of delegated runs is UAR's responsibility. |

## Approval authority and the double gate (M-b)

BossFang's `/mcp` `tools/call` handler already runs the full `execute_tool` approval, capability and taint gate (`crates/librefang-api/src/routes/network.rs:1552` calls `execute_tool_with_sender_account`; `crates/librefang-runtime/src/tool_runner/dispatch.rs:1-6`).
It returns results as MCP `content` plus `isError` (`network.rs:1608-1609`), so a deferred human approval reaches the caller as a tool result, not as a pause the caller can wait on.
UAR's admission port is a five-endpoint protocol that BossFang must serve: `/uar/admission/v1/{prepare,resolve,claim,cancel,finish}` (`tool_admission/http.rs:102-110`), with claim-before-effect semantics.

If both gates run, one BossFang tool call can be decided twice, and a deferred approval can be asked twice or be seen by UAR as a failed call.

**Proposed rule:** for UAR-executed runs, the admission port is the authoritative gate, backed by the same `ApprovalManager` and policy that `execute_tool` uses, because only it can pause a run with prepare, resolve and claim semantics.
The run-scoped MCP credential BossFang issues for that run lets `/mcp` recognise an invocation that holds a matching claimed admission and skip re-asking, while still running the capability and taint checks.
UAR-native tools (not hosted by BossFang) are governed only through the admission port.
The alternative, making `/mcp` authoritative and admission pass-through, is simpler but turns every deferred approval into an error inside the UAR run.

**Re-estimate of M5:** large, not medium; split into M5a (run client, AG-UI mapping, cancellation, usage settlement, runs with no BossFang tools), M5b (the five-endpoint admission server with persisted claims and the `ApprovalManager` bridge), and M5c (run-scoped `/mcp` exposure with claim recognition).

## The model-gateway fix is a codec change (M-c)

`/v1/messages` speaks Anthropic Messages, not OpenAI, so M3 means replacing `UarDriver`'s request, response and SSE codecs.
Two ways to do it:

- **G1: rewrite `UarDriver` to Anthropic format.**
  Keeps the C04 instance-identity and capability exchange inside the UAR driver, at the cost of a second Anthropic codec.
- **G2: point the existing Anthropic driver at UAR's base URL** (`crates/librefang-llm-drivers/src/drivers/anthropic.rs:45`, `new(api_key, base_url)`), and keep `UarDriver` only for supervision and binding.
  Reuses a tested codec, but the binding and launch-token headers must be injected into a driver that does not know about them.

Either way, three constraints apply.

1. UAR's `AnthropicMessagesRequest` (`src/server.rs:3346-3369`) has no `max_tokens`, `temperature` or `tool_choice` fields; they fall into the ignored `_extra` map and are silently dropped, so a UAR-side change is needed before the gateway honours BossFang's inference parameters.
2. The C04 capability check requires `POST /api/chat/completion` to exist (`uar.rs:2125`), so it must be changed to require `/v1/messages`.
3. Existing agents with `provider = "uar"` change behaviour from "a UAR agent with UAR's tools" to "a bare model with BossFang's tools", which needs a release note and a deprecation path.

**Recommendation:** G2 plus the UAR-side request-field change, shipped with a release note; whether to keep the old nested behaviour under a deprecated explicit name for one release is an operator decision (open question 3).

## Embedded versus remote UAR

"Embedded" can only safely mean a UAR binary shipped inside the same artifact and supervised by BossFang as a child process: the Docker image already copies `uar-sidecar` from the pinned UAR image (`Dockerfile:10-11`, `:359`), and `UarSidecarSupervisor` implements the launch-token, `READY:{port}` and stdin-EOF contract.
An in-process link would reimport UAR's exact SurrealDB pin, its non-optional dependency tree and its nightly toolchain into every BossFang build.

BossFang codes against one UAR service binding, but the binding declares which capabilities each placement offers.

| Placement | Who owns the process | Model gateway | BossFang-governed executor |
|---|---|---|---|
| Managed sidecar | BossFang supervisor, launch token, loopback | yes | yes (S1) |
| External local | OS, container or the-boss | yes | no, unless S2a lands |
| Remote | operator | yes | no, unless S2a lands; S2b only by explicit operator choice |

An explicitly selected instance that is unreachable, or that lacks a required capability, is an error, never a trigger to spawn the bundled one.

## Storage and version alignment

1. Clients that share a datastore upgrade together, and the server is upgraded last and never downgraded.
2. Each repository keeps exact `=` pins for `surrealdb`, `surrealdb-core` and `surrealdb-types`.
3. Default to separate stores: BossFang in namespace `librefang` (databases `main` and `memory`), UAR in its own embedded SurrealKV, the-boss's surreal-memory service in namespace `memory`.
4. A shared server with separate namespaces is allowed only when every client on it is on the same SurrealDB minor as the server.
5. Never point two different schema owners, or two different surreal-memory revisions, at the same database.
6. Each schema owner migrates only its own database.
7. surreal-memory should cut release tags.
8. The-boss moves its SurrealDB server, UAR sidecar and surreal-memory image to 3.3.0 in one release.
9. BossFang adds a CI drift guard (`scripts/check-surreal-alignment.py`) covering the three crate pins, the lockfile, the surreal-memory rev and that rev's own SurrealDB pin, the k8s image tag, the absence of `universal-agent-runtime` in `Cargo.lock`, and the SurrealDB version inside the pinned `UAR_IMAGE`.

**Reconciling `link-uar` (F11).**
`link-uar` fits rule 4 (separate namespace, least-privilege user) but is half-wired and breaks rule 1 whenever the shipped UAR image's SurrealDB minor differs from the server's.
Three choices: wire it through to the sidecar and constrain it by rule 4 (the guard refuses to hand `[uar.remote]` to a UAR image on a different minor); deprecate it in favour of UAR's own embedded store; or leave it as is.
Leaving it is not recommended, because it provisions resources nothing uses.
Recommendation: constrain and wire it if the operator wants UAR state on BossFang's server for backup or ops reasons, otherwise deprecate it (open question 6).

## Migration path

Order matters: G4 must land before any executor step, and M3 can ship against the current image.

| Step | Change | Owner | Depends on |
|---|---|---|---|
| M1 | Adopt the decision record; add executor seam, gateway, executor and alignment guard to the feature ledger | product-manager | — |
| M2 | SurrealDB alignment guard and CI job, including the SurrealDB version inside `UAR_IMAGE` | surrealdb-schema-engineer | — |
| M3 | Gateway via `/v1/messages` (G1 or G2), capability check moved off `/api/chat/completion`, UAR-side request-field request, release note and deprecation path for `provider = "uar"` | bossfang-feature-steward | UAR field change for full parameter fidelity |
| G4 | Move `UAR_IMAGE` to a revision at or after `3d6bf056` and verify the sidecar contract | bossfang-feature-steward | — |
| M4 | Executor seam at the kernel dispatch point, native only, manifest field defaulting to native | bossfang-feature-steward | — |
| M5a | UAR executor: run client, AG-UI mapping, cancellation, reservation and settlement, BossFang compaction before seeding, no BossFang tools | bossfang-feature-steward | G4, M4 |
| M5b | Five-endpoint admission server backed by `ApprovalManager`, persisted claims, TTL set from approval policy | bossfang-feature-steward | M5a |
| M5c | Run-scoped loopback `/mcp` exposure with claim recognition | bossfang-feature-steward | M5b |
| M6 | Placement capabilities in the binding (S1); remote executor only if S2a lands in UAR | bossfang-feature-steward | M5c, operator decision |
| M7 | Storage-isolation note, memory `schema_version` guard, and the `link-uar` decision (constrain and wire, or deprecate) | surrealdb-schema-engineer | operator decision |
| M8 | Documentation: `CLAUDE.md` UAR section (drop "LLM/runtime provider … 142+ providers", the `dep:universal-agent-runtime` chain, and "`provision_uar_namespace()` called at boot"), stale in-process comments in `librefang-kernel/Cargo.toml:83` and `librefang-cli/Cargo.toml:45-46`, and `docs/agent-fabric-convergence.md` (add the S1 scope, the gateway correction and link to ADR 0001) | bossfang-feature-steward, product-manager for the fabric note | M1 |
| M9 | Add the seam, gateway and executor to upstream-sync acceptance criteria | upstream-merge-manager, merge-reviewer | M4 |
| M10 | 3.3.0 train request to the-boss | product-manager | — |

On `CLAUDE.md`'s "Shared SurrealDB Version Pin" section: on this branch it already reads `=3.3.0` and "Upgrade the three lines together, and check surreal-memory first" (`CLAUDE.md:480-499`), which agrees with policy item 2.
The `=3.0.5` / "NEVER upgrade without … UAR git refs" wording the reviewer quoted is not present on `kbd/phase-11-surreal-recovery-uar-convergence`; it survives in the session-level copy of `CLAUDE.md` loaded from an older checkout, so M8 needs no change there beyond confirming it after merge.

## Evidence table

| Claim | Label | Evidence |
|---|---|---|
| BossFang's loop is `run_agent_loop` and has no runtime trait | verified | `agent_loop/mod.rs:483`, `messaging.rs:1288-1298` |
| UAR `/api/chat/completion` ignores caller tools and runs a UAR agent | verified | UAR `src/server.rs:4617`, `:5171`, `:5533` |
| `/v1/chat/completions` uses the same handler | verified | UAR `src/server.rs:1808` |
| UAR `/v1/messages` forwards caller tools with no loop | verified | UAR `src/server.rs:1809`, `:4055` |
| `/v1/messages` drops `max_tokens`, `temperature`, `tool_choice` | verified | UAR `src/server.rs:3346-3369` |
| Host admission is loopback and launch-token only | verified | `tool_admission/http.rs:77-87`, `routes.rs:532-539`, `sidecar_guard.rs:168` |
| Shipped `2aaeadd9` lacks the host run features | verified | `CreateRunRequest` at `2aaeadd9`; files absent |
| `link-uar` config is not consumed by the sidecar | verified | repository search; `uar_sidecar.rs:156` |
| The-boss ships SurrealDB 3.2.4 | verified | `build/integration-artifacts.json:256` |
| 3.3 upgrade is one-way | verified | SurrealDB 3.2 to 3.3 migration guide |
| Option C with S1 scoping is the lowest-risk split | inferred | F1 to F11 and the external takeaways |

## Contradictions and how they were resolved

- BossFang's convergence note calls `UarDriver` "an LLM provider inside the native loop", but UAR runs a full agent behind that endpoint; the code wins.
- The operator's framing says all three projects come together in the-boss, but the-boss bundles only UAR and surreal-memory; the code wins.
- UAR's docs claim 142 or more providers while its catalog lists 322 and certifies two; "two certified" is the operative number for support.
- The-boss's goals say UAR falls back to its embedded store when Docker is down, but no automatic fallback exists in code; the code wins.
- Revision 1 of this report said one binding gives the same guarantees in every placement; UAR's admission and MCP rules show it does not; revision 2 scopes the executor (S1).
- UAR's `versions.toml` pins liter-llm `1.18.2` while its lockfile resolves `2.0.3`; unresolved, for UAR's maintainers.

## Confidence and limits

Package confidence 0.9 is the credibility-weighted mean of claim confidences.
Recommendation confidence is 0.78.
The facts are strong (every load-bearing code claim was re-read at the cited line, including the reviewer's new citations), while cost and the remote story are weaker: M5 is unprototyped, S2a is UAR work with no date, and the SurrealDB version inside the shipped UAR image was not read.

## Open questions for the operator

1. **Should the-boss host BossFang?**
   As a sibling sidecar with its own store it would gain channels and schedules; the cost is a second daemon, a second store and a second version train inside the desktop app.
2. **Remote and external-local UAR execution: S1, S2a or S2b?**
   S1 keeps every tool effect under BossFang approval but limits UAR execution to the managed sidecar; S2a keeps the guarantee remotely but needs UAR work and opens a network path to BossFang's approvals; S2b works remotely today but lets UAR policy, not BossFang, decide tool effects.
3. **Gateway transition for existing `provider = "uar"` agents.**
   Switch in one release with a release note (simplest, silently changes behaviour for anyone relying on UAR's tools), or keep the nested behaviour under a deprecated explicit name for one release (safer, carries a known-broken path longer).
4. **Is the UAR executor (M5a to M5c) in phase-11, or only M1 to M4 plus G4?**
   M5 is now estimated large and depends on G4.
5. **Whose provider credentials pay for delegated runs?**
   BossFang's (spend stays attributable to BossFang budgets and keys, credentials cross into UAR per run) or UAR's own (no credential transfer, but spend escapes BossFang budgets).
6. **`link-uar`: constrain and wire, or deprecate?**
   Wiring gives operators UAR state on BossFang's server with namespace isolation but couples the UAR image to the server's SurrealDB minor; deprecating removes that coupling and an unused feature.
7. **Should BossFang and UAR agents ever share one user memory?**
   Sharing requires surreal-memory as one service rather than two library copies at different revisions.
8. **Will surreal-memory cut release tags, and when does the-boss take the one-way 3.3.0 upgrade?**

## Review record

- 2026-09-27: `merge-reviewer` ran as the external adversarial review of revision 1 (commit `697090473`) and returned CHANGES REQUESTED with two HIGH, three MEDIUM plus one omission, and three LOW findings; direction (option C) held and F3 was confirmed as a live defect in the shipped `2aaeadd9` image.
- Revision 2 addresses every finding; a re-review by `merge-reviewer` is pending.
- The Feynman gate was not run, so the package remains `partial` by rule.

## References

See `citations.json` for the full list with credibility scores.
Primary external sources: Microsoft Azure Architecture Center, Sidecar pattern; Kubernetes, Sidecar containers; Dapr sidecar overview; A2A specification and Linux Foundation announcement; Agent Client Protocol introduction and Zed's announcement; AG-UI events; MCP 2025-06-18 tools; OpenAI function calling; Anthropic Agent SDK overview and permissions; AWS Bedrock AgentCore Runtime; LangChain Agent Protocol; Microsoft Agent Framework; Cargo Book resolver, dependency specification and features; SurrealDB 2.x to 3.x and 3.2 to 3.3 migration guides; SurrealDB namespace and database architecture.
