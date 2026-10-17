EXECUTION: phase-12-sync-uar-refresh-dot-facade
Project: BossFang
Date: 2026-10-17T17:12:49Z
Selected backend: hybrid. OpenSpec changes are driven task by task through `kbd-apply`, and the implementation is delegated to bossfang-stewards role agents (Claude Code native Agent tool).
Status: DISPATCHED (Execute active). This is the dispatch contract, not completion evidence.

## Operator approvals (verbatim, 2026-10-17)

- "Can I commit, push branches and open PRs (on GQAdonis/librefang) for all five phase-12 changes without asking each time?" → **"Yes, pre-approve all (Recommended)"**. The operator merges every PR.
- "May c003 fix the stale uar-driver comment in crates/librefang-cli/Cargo.toml:46?" → **"Yes, fix the comment"**. This is recorded in the p12-c003 proposal and task 2.1.

## Lessons passed to every dispatched agent (prior-context.md)

- External integrations need at least one real-service test: p12-c002 runs its remote SurrealDB tests against a real server, and p12-c003 3.1 is a live probe of the real UAR image.
- Verify that main contains the PR's final head after merge.
- Do not push commits to a PR branch after review starts.
- Collect approvals once at dispatch (done above); the operator controls merges.

## Review policy (project rule over skill default)

The kbd-execute skill keeps reviewers dormant until the phase boundary.
`CLAUDE.md` requires a fresh-context review before anything merges to `main`, and the plan merges p12-c000 and p12-c001 + p12-c002 to `main` before later rounds start.
So each PR gets one fresh-context review before it opens (the tasks named in the plan), and the single cumulative phase-boundary gate (integration plus adversarial `--mode diff` over the phase diff) still runs after the last change.
`CLAUDE.md` takes precedence here, because the "Agent Fabric Convergence phase gate" deferral applies only to that closed initiative.

## Task identity

`kbd-apply list <change>` prints ordinal backend IDs (1…n), while `plan.md` keys rows by displayed IDs (1.1, 2.1, …).
The mapping is positional in `tasks.md` order, for example p12-c000: 1→1.1, 2→2.1, 3→2.2, 4→2.3, 5→3.1, 6→3.2.

## Dispatch

| Round | Change | Role agent (model) | Worktree / branch | CARGO_TARGET_DIR | Assignment ref |
|---|---|---|---|---|---|
| 1 | p12-c000-default-feature-build | bossfang-feature-steward (opus); UI subtask general-purpose (sonnet) with prometheus-ui-ux | /tmp/librefang-p12-c000 · p12/c000-green-baseline | /tmp/librefang-target-p12-c000 | plan.md rows p12-c000 1.1–3.2 |
| 2 | p12-c001-upstream-sync-2026-10 → p12-c002 | upstream-merge-manager (opus); surrealdb-schema-engineer (opus); bossfang-feature-steward (opus); merge-reviewer (opus, fresh context) | /tmp/librefang-sync-2026-10 · from chore/upstream-merge-2026-10-16-schema | /tmp/librefang-target-sync-2026-10 | rows p12-c001, p12-c002 |
| 3 | p12-c003-uar-1-1-0-reference | bossfang-feature-steward (sonnet); code-reviewer (opus) | /tmp/librefang-p12-c003 | /tmp/librefang-target-p12-c003 | rows p12-c003 |
| 3 | p12-c004-dot-facade-child-phase | product-manager (opus); code-reviewer (opus) | /tmp/librefang-p12-c004 | n/a (docs) | rows p12-c004 |

Rounds 2 and 3 are dispatched only after the previous round's PR is merged and its final head is confirmed on `origin/main`.
Reasoning effort is inherited (not set) for every route.

## Phase-boundary gates (after all five changes)

1. Production-path integration gate on `main`:
   - `cargo check --workspace --lib`
   - `cargo clippy --workspace --all-targets -- -D warnings`
   - scoped tests for every touched crate
   - `python3 scripts/enforce-branding.py --check`
   - `cargo check -p librefang-storage -p librefang-uar-spec`
2. Cumulative `/refine-validate` and `/adversarial-review --mode diff` over the phase diff.
3. `kbd-apply verify` and `kbd-apply archive` for each change.
