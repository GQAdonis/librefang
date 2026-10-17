PLAN: phase-12-sync-uar-refresh-dot-facade
Project: BossFang
Date: 2026-10-17
OpenSpec available: YES (adopted this phase; `project.json` `specBackend` set to `openspec`)
Changes to implement: 5 (parent phase, 32 tasks). G3's implementation changes are planned in the child phase that C-004 creates.
Inputs: `assessment.md`, `analysis.md`, `library-candidates.json`, decisions D-001–D-003.
Evolver bridge: none.

## Lessons applied (prior-context.md)

- "Verify main includes PR final head after merge": C-001 task 3.3, and every PR in this phase confirms the final head SHA is an ancestor of `origin/main`.
- "External integrations require at least one real-service test": C-002 runs remote SurrealDB variants against a real local 3.3.0 server, and C-003 task 3.1 is a live probe of the real UAR image, not a fake.
- "Collect zero-question execution approvals at dispatch" and "Operator controls PR merges": approvals for commits, pushes and PR creation are collected once at `/kbd-execute` dispatch; the operator merges every PR.
- "Do not push commits to a PR branch after review starts": C-001 and C-002 share one branch, and review (C-001 task 3.2) starts only after both are complete.

## Ordering rationale

- **C-000 first, alone.** `main` fails `cargo check --workspace --lib` today, so without a green baseline any post-merge failure is unattributable. It is a tiny one-file fix.
- **C-001 and C-002 together, second, continuing the existing 2026-10-16 sync rather than redoing it.** Goal G1 says nothing else starts on a pre-sync base, and the G3 surfaces collide with the sync's conflict set. C-002 lands on the C-001 branch because `CLAUDE.md` requires SurrealDB parity before a sync merges, and a single review covers both.
- **C-003 and C-004 in parallel, third.** Both are small and independent of each other, but both need the synced tree. C-003 edits `Cargo.toml` comments the merge touches, and C-004 must baseline on post-sync code.
- **Deliberately not in this plan:** G3 implementation (about 12 changes after D-003). It is planned in the child phase after C-004, against the synced tree. Planning it now would rest on code the sync rewrites.

CHANGE LIST (ordered)
1. p12-c000-default-feature-build: Restore a green baseline on `main`. This covers the dead-code build break plus the failures the 2026-10-16 merge report recorded as already present on `main`.
   - Scope: api, kernel, memory, dashboard | Depends on: NONE | Recommended agent: bossfang-feature-steward (+ delegated kernel/memory, UI-skill dashboard) | Est. complexity: M | Complexity score: Medium | Model class: frontier | Customer value: HIGH (unblocks all verification)
   - Details: Re-run each recorded failure on current `main`, fix the ones still failing at their root, and land through an independent review and PR.
2. p12-c001-upstream-sync-2026-10: Complete the existing 2026-10-16 sync (`chore/upstream-merge-2026-10-16-schema`) and bring it to the current upstream tip.
   - Scope: all | Depends on: p12-c000 merged | Recommended agent: upstream-merge-manager (+ surrealdb-schema-engineer for memory conflicts, bossfang-feature-steward for UarDriver/ACP, merge-reviewer review) | Est. complexity: L | Complexity score: High | Model class: frontier | Customer value: HIGH
   - Details: Reuse the 28 recorded resolutions, merge current `main` and the 16 newer upstream commits, add the SQLite three-lineage migration tests, fix the `CompletionResponse` field and ACP 3.3.0, run branding enforcement and the audit, update the merge report, and run the final gates after C-002.
3. p12-c002-surreal-parity-sync-2026-10: Verify and complete the existing SurrealDB parity work (migrations 050–054, manifest-version and ephemeral-run stores), close any gaps from the newer upstream commits, and fix `task_reset_stuck`. library: n/a (build; parity rule from `CLAUDE.md`).
   - Scope: db | Depends on: p12-c001 tasks 1.1–1.3 (same branch) | Recommended agent: surrealdb-schema-engineer | Est. complexity: M | Complexity score: Medium | Model class: frontier | Customer value: HIGH (default backend correctness)
   - Details: Audit the full consumed upstream schema against the `.surql` migrations, fill the gaps, run embedded tests plus remote tests against a real SurrealDB 3.3.0 (no SKIP).
4. p12-c003-uar-1-1-0-reference: Record UAR 1.1.0 as the qualified runtime, remove stale UAR prose outside `librefang-cli`, and run the human-only live probe. library: cand-010.
   - Scope: docs, comments | Depends on: p12-c001 merged | Recommended agent: bossfang-feature-steward | Est. complexity: S | Complexity score: Low | Model class: medium | Customer value: MEDIUM
   - Details: Add a "Qualified runtime" section with the digest, capabilities and 1.1.1 prerequisites. Fix the stale comments and docs, except `librefang-cli/Cargo.toml`, which is pending your instruction. Mark three architecture documents historical, prepare the probe commands, then review and PR.
5. p12-c004-dot-facade-child-phase: Open and baseline the G3 child phase for #156. library: cand-002, cand-003, cand-009, cand-011, cand-012, cand-013 (recorded as accepted inputs).
   - Scope: docs, KBD | Depends on: p12-c001 merged | Recommended agent: product-manager | Est. complexity: M | Complexity score: Medium | Model class: frontier | Customer value: HIGH
   - Details: Create the child phase with goals amended for D-003, excluding M1–M5 and including `backlog.md`. Write a child `baseline.md` with the re-verified work packages, the ownerless write-path inventory and the A01–A20 mapping draft, add the ledger row, then review and PR.

EXECUTION ROUND ORDER
Round 1: p12-c000 (merged before Round 2)
Round 2: p12-c001 tasks 1.1–2.2 → p12-c002 → p12-c001 tasks 3.1–3.3 (one branch, one merge-reviewer pass)
Round 3 (parallel, separate worktrees and `CARGO_TARGET_DIR`s): p12-c003, p12-c004
Then: child-phase assess and plan for G3, from the child created by C-004

## Risks and trade-offs

- C-001 is the critical path, estimated at 1–1.5 days. The SQLite renumbering and the memory-crate dual-path conflicts are the hard parts. If ACP 3.3.0 breaks `librefang-acp` badly, that fix stays inside C-001 rather than being deferred.
- C-003's live probe is human-only. The change can complete its docs and comment tasks while 3.1 waits on the operator. G2 is only MET once the probe evidence is recorded.
- Scope cut: the G3 implementation, re-targeting UAR 1.1.1, and repairing the KBD runtime journal (Q1) are excluded from this plan.
- Pending operator instruction: the stale `uar-driver` comment in `crates/librefang-cli/Cargo.toml:46` stays until you allow `librefang-cli` edits (`AGENTS.md` and `constraints.md`). Upstream #8605 lifted upstream's CLI freeze, but BossFang's constraint is separate.

TASK MODEL ASSIGNMENTS

Harness discovery (2026-10-17): Claude Code session on `claude-opus-5-5`. The Agent tool exposes per-agent `model` (`sonnet` | `opus` | `haiku` | `fable`) and `isolation: worktree`. Reasoning `effort` is set only on explicit operator request, so every row inherits. Role agents (`.claude/agents/*.md`) exist for upstream-merge-manager, merge-reviewer, surrealdb-schema-engineer, bossfang-feature-steward and product-manager. No liter-llm route is needed: all selected models are native. The cross-model judge (MiniMax-M3) failed to dispatch at assess and analyze, so review independence relies on fresh-context agents.

| Phase path | Change ID | Backend task ID | Requirements | Provider/model | Reasoning effort | Rationale and dated evidence | Harness and route | Worker launch and handoff | Native alternative | Availability and verification | Prerequisites |
|---|---|---|---|---|---|---|---|---|---|---|---|
| phase-12-sync-uar-refresh-dot-facade | p12-c000-default-feature-build | 1.1 | run baseline checks across crates + dashboard tsc; read exit codes from file | Anthropic claude-opus (Agent model=opus) | inherit (not set) | triage across several crates needs judgment (2026-10-17) | Claude Code; native Agent tool | Agent(subagent_type=bossfang-feature-steward, model=opus); worktree /tmp/librefang-p12-c000; result → execution.md | sonnet | configured (Agent tool schema, 2026-10-17); not yet exercised | own CARGO_TARGET_DIR |
| phase-12-sync-uar-refresh-dot-facade | p12-c000-default-feature-build | 2.1 | one-file cfg fix | Anthropic claude-opus (Agent model=opus) | inherit (not set) | same agent as 1.1 (model inherited from launch) | Claude Code; native Agent tool | same agent as 1.1 | sonnet | configured (Agent tool schema, 2026-10-17); not yet exercised | 1.1 |
| phase-12-sync-uar-refresh-dot-facade | p12-c000-default-feature-build | 2.2 | root-cause fixes for pre-existing test/clippy failures in api, kernel, memory | Anthropic claude-opus (Agent model=opus) | inherit (not set) | several unrelated root causes; medium uncertainty | Claude Code; native Agent tool | same agent; kernel/memory fixes may be split to Agent(subagent_type=general-purpose, model=opus) in its own worktree per CLAUDE.md | sonnet | configured (Agent tool schema, 2026-10-17); not yet exercised | 1.1 |
| phase-12-sync-uar-refresh-dot-facade | p12-c000-default-feature-build | 2.3 | two dashboard tsc errors; UI code | Anthropic claude-sonnet (Agent model=sonnet) | inherit (not set) | small typed fixes; UI skill required by CLAUDE.md | Claude Code; native Agent tool | Agent(subagent_type=general-purpose, model=sonnet) with prometheus-ui-ux skill; worktree /tmp/librefang-p12-c000-ui | opus | configured (Agent tool schema, 2026-10-17); not yet exercised | 1.1; pnpm available |
| phase-12-sync-uar-refresh-dot-facade | p12-c000-default-feature-build | 3.1 | re-run all checks | Anthropic claude-opus (Agent model=opus) | inherit (not set) | same agent as 1.1 | Claude Code; native Agent tool | same agent as 1.1 | sonnet | configured (Agent tool schema, 2026-10-17); not yet exercised | 2.1–2.3 |
| phase-12-sync-uar-refresh-dot-facade | p12-c000-default-feature-build | 3.2 | independent review + PR + ancestry check | Anthropic claude-opus (Agent model=opus) | inherit (not set) | fresh-context reviewer required | Claude Code; native Agent tool | Agent(subagent_type=rust-reviewer, model=opus) (+ typescript-reviewer if 2.3 changed files), fresh context; orchestrator opens PR | fable | configured (Agent tool schema, 2026-10-17); not yet exercised | operator merges |
| phase-12-sync-uar-refresh-dot-facade | p12-c001-upstream-sync-2026-10 | 1.1 | continue 2026-10-16 sync; merge origin/main + 16 upstream commits; high context | Anthropic claude-opus (Agent model=opus) | inherit (not set) | highest reasoning load; role encodes merge skill | Claude Code; native Agent tool | Agent(subagent_type=upstream-merge-manager, model=opus); worktree /tmp/librefang-sync-2026-10; skill librefang-upstream-merge; result → docs/upstream-merges + execution.md | fable | configured (Agent tool schema, 2026-10-17); not yet exercised | C-000 merged |
| phase-12-sync-uar-refresh-dot-facade | p12-c001-upstream-sync-2026-10 | 1.2 | verify SQLite renumbering + three-lineage tests; fix only if regressed | Anthropic claude-opus (Agent model=opus) | inherit (not set) | correctness-critical data migration | Claude Code; native Agent tool | same upstream-merge-manager agent | fable | configured (Agent tool schema, 2026-10-17); not yet exercised | 1.1 |
| phase-12-sync-uar-refresh-dot-facade | p12-c001-upstream-sync-2026-10 | 1.3 | memory-crate Surreal conflict resolution | Anthropic claude-opus (Agent model=opus) | inherit (not set) | role owns Surreal backends | Claude Code; native Agent tool | Agent(subagent_type=surrealdb-schema-engineer, model=opus) on the sync branch; handoff from 1.1 | sonnet | configured (Agent tool schema, 2026-10-17); not yet exercised | 1.1 |
| phase-12-sync-uar-refresh-dot-facade | p12-c001-upstream-sync-2026-10 | 1.4 | verify UarDriver field; ACP 3.3.0 / dalek 3 / zip 9 consumers | Anthropic claude-opus (Agent model=opus) | inherit (not set) | cross-crate compile repair; role owns UAR driver | Claude Code; native Agent tool | Agent(subagent_type=bossfang-feature-steward, model=opus) on the sync branch; handoff from 1.1 | sonnet | configured (Agent tool schema, 2026-10-17); not yet exercised | 1.1 |
| phase-12-sync-uar-refresh-dot-facade | p12-c001-upstream-sync-2026-10 | 2.1 | branding scripts and audit | Anthropic claude-opus (Agent model=opus) | inherit (not set) | same agent as 1.1 (model inherited) | Claude Code; native Agent tool | same upstream-merge-manager agent | sonnet | configured (Agent tool schema, 2026-10-17); not yet exercised | 1.1–1.4 |
| phase-12-sync-uar-refresh-dot-facade | p12-c001-upstream-sync-2026-10 | 2.2 | merge report + changelog fragment | Anthropic claude-opus (Agent model=opus) | inherit (not set) | same agent as 1.1 (model inherited) | Claude Code; native Agent tool | same upstream-merge-manager agent | sonnet | configured (Agent tool schema, 2026-10-17); not yet exercised | 1.1–1.4 |
| phase-12-sync-uar-refresh-dot-facade | p12-c001-upstream-sync-2026-10 | 3.1 | final workspace gates on combined branch; long-running | Anthropic claude-opus (Agent model=opus) | inherit (not set) | interpreting failures across crates | Claude Code; native Agent tool | same upstream-merge-manager agent | sonnet | configured (Agent tool schema, 2026-10-17); not yet exercised | C-002 complete |
| phase-12-sync-uar-refresh-dot-facade | p12-c001-upstream-sync-2026-10 | 3.2 | independent review; must not share builder context | Anthropic claude-opus (Agent model=opus) | inherit (not set) | fresh-context reviewer required by CLAUDE.md | Claude Code; native Agent tool | Agent(subagent_type=merge-reviewer, model=opus), fresh context; read-only; findings → review/ | fable | configured (Agent tool schema, 2026-10-17); not yet exercised | 3.1 |
| phase-12-sync-uar-refresh-dot-facade | p12-c001-upstream-sync-2026-10 | 3.3 | PR with --repo GQAdonis/librefang; ancestry; retire old branches | Anthropic claude-opus (orchestrator session) | inherit (not set) | outward-facing step under dispatch approval | Claude Code; native Agent tool | orchestrator itself (no worker) | same | configured (Agent tool schema, 2026-10-17); not yet exercised | operator merges |
| phase-12-sync-uar-refresh-dot-facade | p12-c002-surreal-parity-sync-2026-10 | 1.1 | schema audit across consumed upstream commits | Anthropic claude-opus (Agent model=opus) | inherit (not set) | completeness-critical | Claude Code; native Agent tool | Agent(subagent_type=surrealdb-schema-engineer, model=opus) on sync branch; result → execution.md | sonnet | configured (Agent tool schema, 2026-10-17); not yet exercised | C-001 1.1–1.3 |
| phase-12-sync-uar-refresh-dot-facade | p12-c002-surreal-parity-sync-2026-10 | 2.1 | migrations add/renumber + registration | Anthropic claude-opus (Agent model=opus) | inherit (not set) | same agent (model inherited) | Claude Code; native Agent tool | same agent | sonnet | configured (Agent tool schema, 2026-10-17); not yet exercised | 1.1 |
| phase-12-sync-uar-refresh-dot-facade | p12-c002-surreal-parity-sync-2026-10 | 2.2 | backend read/write + store selection | Anthropic claude-opus (Agent model=opus) | inherit (not set) | dual-path backend code | Claude Code; native Agent tool | same agent | sonnet | configured (Agent tool schema, 2026-10-17); not yet exercised | 2.1 |
| phase-12-sync-uar-refresh-dot-facade | p12-c002-surreal-parity-sync-2026-10 | 2.3 | verify task_reset_stuck; fix only if regressed | Anthropic claude-opus (Agent model=opus) | inherit (not set) | same agent | Claude Code; native Agent tool | same agent | sonnet | configured (Agent tool schema, 2026-10-17); not yet exercised | 2.1 |
| phase-12-sync-uar-refresh-dot-facade | p12-c002-surreal-parity-sync-2026-10 | 3.1 | embedded + remote tests vs real SurrealDB 3.3.0 | Anthropic claude-opus (Agent model=opus) | inherit (not set) | real-service test lesson | Claude Code; native Agent tool | same agent; local surreal server required | sonnet | configured (Agent tool schema, 2026-10-17); not yet exercised | local SurrealDB 3.3.0 binary |
| phase-12-sync-uar-refresh-dot-facade | p12-c003-uar-1-1-0-reference | 1.1 | operator doc section from verified facts | Anthropic claude-sonnet (Agent model=sonnet) | inherit (not set) | documentation; cheaper model suffices | Claude Code; native Agent tool | Agent(subagent_type=bossfang-feature-steward, model=sonnet); worktree /tmp/librefang-p12-c003 | opus | configured (Agent tool schema, 2026-10-17); not yet exercised | C-001 merged |
| phase-12-sync-uar-refresh-dot-facade | p12-c003-uar-1-1-0-reference | 2.1 | comment corrections (kernel Cargo.toml, workflow) | Anthropic claude-sonnet (Agent model=sonnet) | inherit (not set) | same agent (model inherited) | Claude Code; native Agent tool | same agent | opus | configured (Agent tool schema, 2026-10-17); not yet exercised | C-001 merged |
| phase-12-sync-uar-refresh-dot-facade | p12-c003-uar-1-1-0-reference | 2.2 | skill gotcha + historical notes in 3 docs | Anthropic claude-sonnet (Agent model=sonnet) | inherit (not set) | same agent | Claude Code; native Agent tool | same agent | opus | configured (Agent tool schema, 2026-10-17); not yet exercised | C-001 merged |
| phase-12-sync-uar-refresh-dot-facade | p12-c003-uar-1-1-0-reference | 3.1 | probe command authoring; live run is human-only | Anthropic claude-sonnet (Agent model=sonnet) | inherit (not set) | commands only; CLAUDE.md forbids agent live runs | Claude Code; native Agent tool | same agent writes commands; operator executes | opus | configured (Agent tool schema, 2026-10-17); not yet exercised | operator runs container |
| phase-12-sync-uar-refresh-dot-facade | p12-c003-uar-1-1-0-reference | 4.1 | check + branding audit | Anthropic claude-sonnet (Agent model=sonnet) | inherit (not set) | verification | Claude Code; native Agent tool | same agent | opus | configured (Agent tool schema, 2026-10-17); not yet exercised | own CARGO_TARGET_DIR |
| phase-12-sync-uar-refresh-dot-facade | p12-c003-uar-1-1-0-reference | 4.2 | review + PR + ancestry | Anthropic claude-opus (Agent model=opus) | inherit (not set) | fresh-context reviewer | Claude Code; native Agent tool | Agent(subagent_type=code-reviewer, model=opus), fresh context; orchestrator opens PR | fable | configured (Agent tool schema, 2026-10-17); not yet exercised | operator merges |
| phase-12-sync-uar-refresh-dot-facade | p12-c004-dot-facade-child-phase | 1.1 | KBD child-phase creation with amended goals | Anthropic claude-opus (Agent model=opus) | inherit (not set) | goal-setting judgment; role owns KBD phases | Claude Code; native Agent tool | Agent(subagent_type=product-manager, model=opus); worktree /tmp/librefang-p12-c004; skill kbd-new-child | sonnet | configured (Agent tool schema, 2026-10-17); not yet exercised | C-001 merged |
| phase-12-sync-uar-refresh-dot-facade | p12-c004-dot-facade-child-phase | 2.1 | re-verify WP table on synced tree; large code survey | Anthropic claude-opus (Agent model=opus) | inherit (not set) | broad context, evidence-heavy | Claude Code; native Agent tool | same agent; may use Explore subagent | sonnet | configured (Agent tool schema, 2026-10-17); not yet exercised | C-001 merged |
| phase-12-sync-uar-refresh-dot-facade | p12-c004-dot-facade-child-phase | 2.2 | ownerless write-path inventory | Anthropic claude-opus (Agent model=opus) | inherit (not set) | security-relevant completeness | Claude Code; native Agent tool | same agent | sonnet | configured (Agent tool schema, 2026-10-17); not yet exercised | C-001 merged |
| phase-12-sync-uar-refresh-dot-facade | p12-c004-dot-facade-child-phase | 2.3 | A01–A20 mapping draft | Anthropic claude-opus (Agent model=opus) | inherit (not set) | requirements traceability | Claude Code; native Agent tool | same agent | sonnet | configured (Agent tool schema, 2026-10-17); not yet exercised | 2.1 |
| phase-12-sync-uar-refresh-dot-facade | p12-c004-dot-facade-child-phase | 3.1 | ledger row | Anthropic claude-opus (Agent model=opus) | inherit (not set) | same agent (model inherited) | Claude Code; native Agent tool | same agent | sonnet | configured (Agent tool schema, 2026-10-17); not yet exercised | none |
| phase-12-sync-uar-refresh-dot-facade | p12-c004-dot-facade-child-phase | 3.2 | review + PR + ancestry | Anthropic claude-opus (Agent model=opus) | inherit (not set) | fresh-context reviewer | Claude Code; native Agent tool | Agent(subagent_type=code-reviewer, model=opus), fresh context; orchestrator opens PR | fable | configured (Agent tool schema, 2026-10-17); not yet exercised | operator merges |

COMMANDS TO RUN
OpenSpec changes are already emitted and validated (`openspec validate <id> --strict`):
- openspec/changes/p12-c000-default-feature-build
- openspec/changes/p12-c001-upstream-sync-2026-10
- openspec/changes/p12-c002-surreal-parity-sync-2026-10
- openspec/changes/p12-c003-uar-1-1-0-reference
- openspec/changes/p12-c004-dot-facade-child-phase

Next: `/kbd-execute phase-12-sync-uar-refresh-dot-facade` (starts p12-c000).

## Adversarial review

Both rounds used a harness-native, same-model judge, because the cross-model judge collided (`cross_model_check: same-model-collision`).
- Round 1 (`review/plan/findings-round1.json`): BLOCK, 2 CRITICAL / 8 WARNING / 3 SUGGESTION.
  The two criticals are resolved: the plan now continues the existing 2026-10-16 sync, and C-002 parity now covers all of it.
- Round 2 (`review/plan/findings.json`): PASS, 0 CRITICAL / 2 WARNING / 4 SUGGESTION.
  Applied:
  - three tasks reworded as "verify, fix only if regressed"
  - the upstream CLI merge recorded as exempt from the CLI constraint
  - `librefang-cli` tests and a uar-driver feature-chain check added to the final gate
  - task references corrected
  - dalek and zip consumers named
  - C-001 tasks 1.3 and 1.4 made sequential
  - an upstream-v62 scenario added

PLAN COMPLETE
