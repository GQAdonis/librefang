# Research plan: BossFang / UAR / surreal-memory / the-boss convergence

Query: who should own the agent loop between BossFang and the Universal Agent Runtime (UAR), how UAR is offered embedded or remote from BossFang, and how BossFang, UAR, surreal-memory and the-boss stay version-consistent.
Depth: deep.
Scale: full.
Operator: product-manager role, phase-11 goal G5.

## Sub-questions

- SQ1 Overlap inventory: for each capability (agent loop, LLM drivers, tools/MCP, memory, sessions, storage, skills/hands, scheduling, auth, observability/metering), what does each of BossFang, UAR and surreal-memory implement today, where, and how mature?
- SQ2 Integration today: how are BossFang and UAR connected (UarDriver, sidecar, uar-spec, retired in-process link), BossFang and surreal-memory, UAR and surreal-memory, and how does the-boss bundle, launch, configure and connect all three?
- SQ3 Agent-loop ownership: what are the real options and their consequences for tools, memory, sessions, metering, approvals, channels, prompt caching, embedded vs remote, and upstream-merge cost?
- SQ4 Embedded vs remote UAR: what can "embedded" safely mean, and what single abstraction should BossFang code against?
- SQ5 Version consistency: what alignment policy for SurrealDB and surreal-memory, shared vs separate namespaces, schema ownership, release coordination with the-boss, and a drift guard?
- SQ6 Migration path: ordered, independently shippable steps with owners.

## Search strategy

- Primary evidence is first-party source code, read directly: BossFang at `kbd/phase-11-surreal-recovery-uar-convergence` (worktree `/tmp/librefang-p11-research`), UAR at `Prometheus-AGS/universal-agent-runtime@3d6bf056` (read-only clone `/tmp/uar-ro`), surreal-memory at `Prometheus-AGS/surreal-memory-server@b7e2093`, and the-boss at `Prometheus-AGS/the-boss@1fe9acff43`.
- Four read-only code-exploration workers (threads T1 to T4), one per repository, each isolated to its own repository and question set.
- One external web worker (thread T5) for primary specs and docs on sidecar vs in-process deployment, delegation protocols (A2A, ACP, AG-UI, MCP), pluggable-runtime control planes, and Cargo exact-pin semantics.
- Prior BossFang research reused as inputs, not re-derived: `docs/architecture/uar-runtime-integration-research.md`, `docs/architecture/uar-sidecar-assessment.md`, `.kbd-orchestrator/phases/phase-10-uar-sidecar-availability/analysis.md`.

## Budget

- One session; five parallel workers; two levels of dispatch, never three.
- Web sources: 15 to 25 primary sources.

## Task ledger

- [x] 01 plan written.
- [x] 02 search: repository sweeps and web search dispatched.
- [x] 03 retrieve: excerpts collected as chunks.
- [x] 04 collect: registry built.
- [x] 05 verify: credibility scored; load-bearing code claims re-checked against source by the orchestrator.
- [x] 06 resolve: contradictions logged.
- [x] 07 graph: claims and relations built.
- [x] 08 cite: citations written.
- [x] 09 report: synthesis written.
- [x] 10 export: manifest and index written, package checked.

## Verification log

- Code claims were produced by read-only exploration workers and the load-bearing ones were re-checked by the orchestrator with `grep`/`sed` against the named files before being labelled `verified`.
- Web claims are labelled `verified` only where the worker fetched the page and returned an exact quote.

## Decision log

- Local repository files are treated as sources with `repo://<repo>@<rev>/<path>` identifiers, because the question is primarily about first-party code.
- The surreal-memory MCP server was unreachable in this session (connection refused), so stages 04 and 07 ran in their documented degraded mode: registry and graph are on disk only.
- The Feynman gate and the in-pipeline adversarial review were not run; the package is therefore `partial` by rule, and the review gate is `merge-reviewer` per the phase-11 acceptance criteria.
