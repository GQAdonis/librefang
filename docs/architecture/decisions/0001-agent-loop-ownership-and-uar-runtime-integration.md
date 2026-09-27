# ADR 0001: Agent loop ownership and UAR runtime integration

**Date:** 2026-09-27
**Status:** Proposed (awaiting operator confirmation and `merge-reviewer` review, phase-11 goal G5)
**Deciders:** operator; product-manager (bossfang-stewards)
**Supersedes in scope:** the "UAR as an LLM provider inside the native loop" framing in `docs/agent-fabric-convergence.md`; builds on `docs/architecture/uar-runtime-integration-research.md` and the phase-10 decision log.
**Evidence:** `docs/research/bossfang-uar-convergence/bossfang-uar-agent-loop-ownership-20260927-5a1c/report.md`

This is the first record in `docs/architecture/decisions/`.
The repository had no ADR convention before it; records here use the context, options, decision, consequences layout and are numbered `NNNN-<slug>.md`.

## Context

BossFang (this fork of librefang) and the Universal Agent Runtime (UAR) both contain a production agent loop.
BossFang's loop is `run_agent_loop` (`crates/librefang-runtime/src/agent_loop/mod.rs:483`), inherited from upstream librefang, surrounded by BossFang's approvals, compaction, prompt caching, metering, sessions, channels, cron, triggers and Hands.
UAR's loop is `RunManager` plus its orchestrator, with governed tools, AG-UI streaming, checkpoints and a full-run API (`POST /api/uar/runs`), and no scheduler or channels.
The operator wants UAR available from BossFang both embedded and remote, and asked who should own the loop.

Facts that constrain the decision:

- BossFang has no executor abstraction; dispatch is a string match on the module prefix (`crates/librefang-kernel/src/kernel/messaging.rs:1288-1298`).
- BossFang's `UarDriver` sends its tools to UAR's `/api/chat/completion` (`crates/librefang-llm-drivers/src/drivers/uar.rs:895`, `:1484`), but that endpoint ignores caller tools and runs a whole UAR agent on the last user message (UAR `src/server.rs:4617`, `:5171`, `:5533`), so today's seam is a nested loop.
- UAR's `/v1/messages` is a true single-turn passthrough that returns tool calls to the caller (UAR `src/server.rs:1809`, `:4055`).
- The-boss already runs UAR as the loop owner for UAR agents, supplying tools through a run-scoped MCP server and approvals through `tool_admission`, and does not bundle BossFang at all.
- The in-process UAR link was retired in phase-10 because Cargo cannot unify conflicting exact pins and unions features across the graph, which forced UAR's SurrealDB pin into every BossFang build.
- BossFang, UAR `main` and surreal-memory `HEAD` pin SurrealDB `=3.3.0`; the-boss ships a 3.2.4 server and 3.2.4 clients; a 3.2 to 3.3 datastore upgrade is one-way.

## Options considered

1. **A — BossFang owns every loop; UAR is only a model gateway.** Simple and merge-safe, but wastes UAR's run engine and still needs the gateway retargeted to work.
2. **B — UAR owns every loop; BossFang delegates all runs.** Turns BossFang into a shell, sends every tool call and approval across a process boundary, and either deletes or orphans upstream loop code, making every upstream sync expensive.
3. **C — BossFang is the control plane with a per-agent choice of executor.** BossFang admits every run and dispatches it to exactly one executor: native (`run_agent_loop`) or UAR (full-run API), with BossFang keeping identity, history, approvals, metering and channels.
4. **D — merge the two loops.** Welds code on two independent change schedules into one loop that neither project could merge cleanly.

## Decision

Adopt option C, together with the model-gateway half of option A.

1. BossFang is the agent operating system and control plane, and its native loop is the default executor.
2. BossFang adds one executor seam at the kernel dispatch point, with two implementations: native, and UAR full-run delegation over `POST /api/uar/runs` with the `agui_spec` stream.
3. Each run has exactly one executor; BossFang never replays a UAR tool call or runs a shadow loop.
4. For UAR-executed runs, BossFang's tools are exposed as a run-scoped MCP server, every effect is decided by BossFang's `ApprovalManager` through UAR's `tool_admission` port, BossFang's canonical history is seeded into the run, UAR memory stays off, and UAR usage is recorded once in BossFang metering.
5. UAR's model-gateway use goes through `/v1/messages` only; `UarDriver` stops calling `/api/chat/completion`.
6. "Embedded" UAR means a supervised child process shipped in the same artifact; BossFang never links UAR in-process.
7. BossFang codes against one UAR service binding with three placements (managed sidecar, external local, remote), all over HTTP, carrying instance identity and negotiated capabilities; an unreachable selected instance is an error, never a trigger to spawn another.
8. Storage stays separate by default: BossFang in namespace `librefang`, UAR in its own store or namespace `uar`; each schema owner migrates only its own database; two surreal-memory revisions never share a database.
9. Each repository keeps exact SurrealDB pins; clients that share a datastore upgrade together, and the server is upgraded last and never downgraded.
10. BossFang adds a CI drift guard for its SurrealDB crate pins, lockfile, surreal-memory rev and manifest, k8s image tag, and the absence of an in-process UAR package.

## Consequences

Positive:

- The upstream librefang loop stays intact, so upstream syncs keep their current cost; the new code lives in BossFang-owned modules.
- UAR delegation reuses a contract already proven in the-boss, so the UAR side needs no new loop work.
- The broken nested-loop seam is replaced by two honest seams (gateway and executor) with contract tests against a real UAR binary.
- Version drift becomes a CI failure instead of a merge-time surprise.

Negative:

- Two executors mean two code paths for AG-UI-to-BossFang event mapping, approvals and usage, which need integration tests at the injection sites.
- Delegated runs cross a process boundary for every tool call, which the sidecar pattern documents as a latency cost for chatty components.
- Prompt caching for delegated runs becomes UAR's responsibility, so BossFang's deterministic-ordering guarantees (#3298) do not cover them.
- The-boss must take a one-way SurrealDB 3.3.0 upgrade in a coordinated release before it can adopt UAR `main`.

## Migration

| Step | Change | Owner |
|---|---|---|
| M1 | Adopt this record; add ledger entries | product-manager |
| M2 | SurrealDB alignment guard and CI job | surrealdb-schema-engineer |
| M3 | Retarget `UarDriver` to `/v1/messages`; real-sidecar contract test | bossfang-feature-steward |
| M4 | Executor seam, native only, manifest field defaulting to native | bossfang-feature-steward |
| M5 | UAR full-run executor with run-scoped MCP, approvals, seeded history, usage | bossfang-feature-steward |
| M6 | External-local and remote placements over the same binding | bossfang-feature-steward |
| M7 | Storage-isolation note and memory `schema_version` guard | surrealdb-schema-engineer |
| M8 | Remove stale in-process comments; correct `CLAUDE.md` UAR sections | bossfang-feature-steward |
| M9 | Add the seam, gateway and executor to upstream-sync acceptance criteria | upstream-merge-manager, merge-reviewer |
| M10 | 3.3.0 train request to the-boss; optional BossFang-sibling proposal | product-manager |

## Open questions

1. Should the-boss host BossFang at all?
2. Is per-agent UAR delegation (M5) in scope for phase-11?
3. Should BossFang and UAR agents ever share one user memory?
4. Will surreal-memory cut release tags?
5. When does the-boss take the 3.3.0 datastore upgrade?
