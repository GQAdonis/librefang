Task model assignments: see `.kbd-orchestrator/phases/phase-12-sync-uar-refresh-dot-facade/plan.md` → "Task model assignments", rows keyed by this change ID.

## 1. Bring the existing sync forward
- [ ] 1.1 In a linked worktree, check out a new branch from `chore/upstream-merge-2026-10-16-schema`, read `docs/upstream-merges/2026-10-16.md`, then merge current `origin/main` (with C-000) and `upstream/main` using the librefang-upstream-merge skill; confirm `git rev-list --count HEAD..upstream/main` is 0.
- [ ] 1.2 Verify (the 2026-10-16 branch already renumbered to `SCHEMA_VERSION = 64` with tests) and fix only if regressed: the SQLite migration sequence in `crates/librefang-memory/src/migration.rs` apply BossFang's workflow_runs rebuild and upstream's `timeout_secs`/`truncated` steps exactly once, with tests for a fresh database, a database stamped by BossFang v62, and one stamped by upstream v62/v63 (covering the stamp-61 repair logic).
- [ ] 1.3 (sequential, after 1.1; same branch, one agent at a time) Hand the `librefang-memory` Surreal backend conflicts (`proactive.rs`, `semantic.rs`, `substrate.rs`) to surrealdb-schema-engineer and confirm the resolution keeps the Surreal paths.
- [ ] 1.4 (sequential, after 1.3) Hand off to bossfang-feature-steward: verify (already set at `uar.rs:1192` on the 2026-10-16 branch) and fix only if regressed: `text_synthesized_from_thinking` in every BossFang-only `CompletionResponse` literal (starting with `uar.rs:1176`) and adapt `librefang-acp` to agent-client-protocol 3.3.0 and confirm the ed25519/x25519-dalek 3 and zip 9 bumps compile in their consumers.

## 2. Preserve and verify
- [ ] 2.1 Run `python3 scripts/enforce-branding.py` then `--check` (exit 0), `scripts/audit-tauri-desktop.sh`, and `grep -rn 'github.com/librefang' crates/` for new runtime URLs.
- [ ] 2.2 Update `docs/upstream-merges/2026-10-16.md` (or add `2026-10-<dd>.md`) for the additional commits and resolutions, and add a changelog fragment.

## 3. Final gate, review and merge (after C-002)
- [ ] 3.1 On the combined C-001 + C-002 branch, all exit 0:
  - `cargo check --workspace --lib` and `cargo check -p librefang-storage -p librefang-uar-spec`
  - `cargo clippy --workspace --all-targets -- -D warnings`
  - scoped `cargo test` for `librefang-memory`, `librefang-storage`, `librefang-api`, `librefang-kernel`, `librefang-llm-drivers --features uar-driver`, `librefang-acp` and `librefang-cli`, plus `cargo check -p librefang-cli --features uar-driver --lib` for the uar-driver feature chain
  - `python3 scripts/enforce-branding.py --check`
- [ ] 3.2 Independent `merge-reviewer` review of the combined branch, with one batched correction cycle.
- [ ] 3.3 Open the PR with `--repo GQAdonis/librefang`; after the operator merges, confirm the final head SHA is an ancestor of `origin/main`, and delete the superseded `chore/upstream-merge-2026-10-16*` branches and worktrees.
