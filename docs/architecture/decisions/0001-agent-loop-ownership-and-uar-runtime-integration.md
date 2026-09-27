# ADR 0001: Agent loop ownership and UAR runtime integration

**Date:** 2026-09-27 (revision 2)
**Status:** Proposed (revision 2 addresses `merge-reviewer` CHANGES REQUESTED on `697090473`; re-review and operator confirmation pending)
**Deciders:** operator; product-manager (bossfang-stewards)
**Supersedes in scope:** the "UAR as an LLM provider inside the native loop" framing in `docs/agent-fabric-convergence.md`; builds on `docs/architecture/uar-runtime-integration-research.md` and the phase-10 decision log.
**Evidence:** `docs/research/bossfang-uar-convergence/bossfang-uar-agent-loop-ownership-20260927-5a1c/report.md`

This is the first record in `docs/architecture/decisions/`.
The repository had no ADR convention before it; records here use the context, options, decision, consequences layout and are numbered `NNNN-<slug>.md`.

## Context

BossFang and the Universal Agent Runtime (UAR) both contain a production agent loop.
BossFang's loop is `run_agent_loop` (`crates/librefang-runtime/src/agent_loop/mod.rs:483`), inherited from upstream librefang, surrounded by BossFang's approvals, compaction, prompt caching, metering, sessions, channels, cron, triggers and Hands.
UAR's loop is `RunManager` plus its orchestrator, with governed tools, AG-UI streaming, checkpoints and a full-run API (`POST /api/uar/runs`), and no scheduler or channels.
The operator wants UAR available from BossFang both embedded and remote, and asked who should own the loop.

Revisions this record depends on:

- BossFang ships UAR `2aaeadd9` (`Dockerfile:10`, 2026-07-31).
- UAR `main` is `3d6bf056` (2026-09-27), 609 commits later.
- Every "UAR can" statement below refers to `3d6bf056` unless it names `2aaeadd9`.

Facts that constrain the decision:

- BossFang has no executor abstraction; dispatch is a string match on the module prefix (`crates/librefang-kernel/src/kernel/messaging.rs:1288-1298`).
- `UarDriver` sends its tools to UAR's `/api/chat/completion` (`crates/librefang-llm-drivers/src/drivers/uar.rs:895`, `:1484`), but that endpoint ignores caller tools and runs a whole UAR agent on the last user message (UAR `src/server.rs:4617`, `:5171`, `:5533`); `/v1/chat/completions` uses the same handler (`:1808`); the defect is also present in the shipped `2aaeadd9` image.
- UAR's `/v1/messages` is a single-turn Anthropic-format passthrough that returns tool calls to the caller, and it exists in `2aaeadd9` too; its request type drops `max_tokens`, `temperature` and `tool_choice` (`src/server.rs:3346-3369`).
- UAR accepts host tool admission only over a loopback `/uar/admission/v1` URL from a launch-token-authenticated sidecar host (`tool_admission/http.rs:77-87`, `routes.rs:532-539`, `security/sidecar_guard.rs:168`), and run-scoped MCP servers only over loopback or through an administrator-registered destination grant (`turn/host/mcp.rs:110-117`, `:209-223`).
- `2aaeadd9` has none of the host run features: its `CreateRunRequest` is `{artifact, input, session_id}`.
- The-boss runs UAR as the loop owner for UAR agents, over loopback with its own launch token, and does not bundle BossFang.
- The in-process UAR link was retired in phase-10 because Cargo cannot unify conflicting exact pins and unions features across the graph.
- BossFang, UAR `main` and surreal-memory `HEAD` pin SurrealDB `=3.3.0`; the-boss ships 3.2.4; a 3.2 to 3.3 datastore upgrade is one-way.
- BossFang's `link-uar` provisions a `uar` namespace on BossFang's SurrealDB server (`crates/librefang-storage/src/provision.rs:53`), but the sidecar never consumes the resulting `[uar.remote]` config.

## Options considered

1. **A — BossFang owns every loop; UAR is only a model gateway.**
   Simple and merge-safe, but it wastes UAR's run engine.
2. **B — UAR owns every loop; BossFang delegates all runs.**
   It turns BossFang into a shell, sends every tool call and approval across a process boundary, and orphans upstream loop code.
3. **C — BossFang is the control plane with a per-agent choice of executor.**
   BossFang admits every run and dispatches it to exactly one executor, native or UAR, keeping identity, history, approvals, metering and channels.
4. **D — merge the two loops.**
   It welds code on two independent change schedules into one loop neither project could merge cleanly.

For the placements of the UAR executor under option C:

1. **S1 — managed sidecar only.**
   BossFang-governed UAR execution only on a UAR that BossFang launched as a loopback sidecar; other placements are model gateways only; no UAR change needed.
2. **S2a — authenticated remote admission (UAR change).**
   UAR accepts host admission and BossFang's `/mcp` from an authenticated remote host, keeping the same guarantee everywhere, at the cost of UAR work and a network path into BossFang's approvals.
3. **S2b — weaker remote guarantee.**
   Remote runs use UAR-native tools and UAR policy only, and BossFang records results without deciding effects.

## Decision

Adopt option C with placement S1, plus the model-gateway half of option A.
S2a is the named path to remote execution; S2b is not adopted unless the operator explicitly accepts it for specific agents.

1. BossFang is the agent operating system and control plane, and its native loop is the default executor.
2. BossFang adds one executor seam at the kernel dispatch point, with native and UAR implementations; each run has exactly one executor, and BossFang never replays a UAR tool call.
3. The UAR executor requires a managed loopback sidecar at a UAR revision at or after `3d6bf056`; it is unavailable with the shipped `2aaeadd9` image, so G4 precedes it.
4. For UAR-executed runs, UAR's admission port is the authoritative approval gate, served by BossFang and backed by the same `ApprovalManager` and policy as `execute_tool`; BossFang's `/mcp` recognises a claimed admission and does not ask twice, but still runs capability and taint checks.
5. BossFang owns compaction for delegated runs and seeds UAR with compacted canonical history within UAR's 1,000-message and 4 MiB caps; UAR memory stays off.
6. BossFang is the budget authority: it reserves before admission and settles on completion; UAR's own cost ledger is informational.
7. BossFang sets UAR's effect-authority timeout from its approval policy, and an approval that outlives it is a visible expired decision.
8. The executor is bound per agent; switching executor starts a new UAR session seeded from BossFang history.
9. UAR's model-gateway use goes through `/v1/messages` only, which is an Anthropic-format codec change, needs a UAR-side change to honour inference parameters, and changes the behaviour of existing `provider = "uar"` agents.
10. "Embedded" UAR means a supervised child process shipped in the same artifact; BossFang never links UAR in-process.
11. BossFang codes against one UAR service binding whose declared capabilities differ by placement: managed sidecar (gateway and executor), external local and remote (gateway only under S1).
12. An unreachable or under-capable selected instance is an error, never a trigger to spawn another.
13. Storage stays separate by default; a shared server with separate namespaces is allowed only when every client is on the server's SurrealDB minor; each schema owner migrates only its own database.
14. Each repository keeps exact SurrealDB pins; clients that share a datastore upgrade together; the server is upgraded last and never downgraded; BossFang adds a CI drift guard that also checks the SurrealDB version inside `UAR_IMAGE`.

## Consequences

Positive:

- The upstream librefang loop stays intact, so upstream syncs keep their current cost.
- UAR delegation reuses the contract the-boss already runs, under the same loopback trust model UAR was built for.
- The nested-loop seam is replaced by two honest seams with contract tests against a real UAR binary.
- Version drift becomes a CI failure instead of a merge-time surprise.

Negative:

- Remote and external-local UAR instances cannot execute BossFang agents until UAR supports authenticated remote admission (S2a).
- The UAR executor is a large piece of work: a five-endpoint admission server (`/uar/admission/v1/{prepare,resolve,claim,cancel,finish}`), AG-UI mapping, reservation and settlement, and run-scoped MCP with claim recognition.
- Delegated agents are capped at UAR's hard-coded 10 tool iterations per run, against BossFang's default 50.
- Prompt caching for delegated runs is UAR's responsibility.
- Existing `provider = "uar"` agents change behaviour when the gateway moves to `/v1/messages`.
- The-boss must take a one-way SurrealDB 3.3.0 upgrade before it can adopt UAR `main`.

## Migration

| Step | Change | Owner | Depends on |
|---|---|---|---|
| M1 | Adopt this record; ledger entries | product-manager | — |
| M2 | SurrealDB alignment guard in CI, including the version inside `UAR_IMAGE` | surrealdb-schema-engineer | — |
| M3 | Gateway via `/v1/messages`, capability check off `/api/chat/completion`, release note and deprecation path | bossfang-feature-steward | UAR field change for full parameter fidelity |
| G4 | Move `UAR_IMAGE` to at or after `3d6bf056`; verify the sidecar contract | bossfang-feature-steward | — |
| M4 | Executor seam, native only | bossfang-feature-steward | — |
| M5a | UAR executor without BossFang tools: run client, AG-UI mapping, cancellation, reservation, compaction before seeding | bossfang-feature-steward | G4, M4 |
| M5b | Admission server backed by `ApprovalManager` | bossfang-feature-steward | M5a |
| M5c | Run-scoped loopback `/mcp` with claim recognition | bossfang-feature-steward | M5b |
| M6 | Placement capabilities in the binding; remote executor only after S2a | bossfang-feature-steward | M5c, operator |
| M7 | Storage isolation, memory `schema_version` guard, `link-uar` decision | surrealdb-schema-engineer | operator |
| M8 | `CLAUDE.md` UAR section, stale Cargo comments, `docs/agent-fabric-convergence.md` update | bossfang-feature-steward, product-manager | M1 |
| M9 | Upstream-sync acceptance criteria | upstream-merge-manager, merge-reviewer | M4 |
| M10 | 3.3.0 train request to the-boss | product-manager | — |

## Open questions (operator decisions)

1. Should the-boss host BossFang, as a sibling sidecar with its own store, at the cost of a second daemon, store and version train in the desktop app?
2. Remote and external-local execution: S1 (full guarantee, managed sidecar only), S2a (full guarantee remotely, needs UAR work and a network path into approvals) or S2b (works remotely now, UAR policy decides tool effects)?
3. For existing `provider = "uar"` agents, switch in one release with a release note, or keep the nested behaviour under a deprecated explicit name for one release?
4. Is the UAR executor (M5a to M5c) in phase-11, or only M1 to M4 plus G4?
5. Do delegated runs spend BossFang's provider credentials (attributable to BossFang budgets) or UAR's own (no credential transfer, spend outside BossFang budgets)?
6. Should `link-uar` be constrained and wired (UAR state on BossFang's server, coupled to its SurrealDB minor) or deprecated?
7. Should BossFang and UAR agents ever share one user memory?
8. Will surreal-memory cut release tags, and when does the-boss take the 3.3.0 upgrade?
