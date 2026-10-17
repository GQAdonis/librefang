Task model assignments: see `.kbd-orchestrator/phases/phase-12-sync-uar-refresh-dot-facade/plan.md` → "Task model assignments", rows keyed by this change ID.

## 1. Re-baseline
- [x] 1.1 On a linked worktree of current `main`, run `cargo check --workspace --lib`, `cargo clippy --workspace --all-targets -- -D warnings`, the scoped tests named in the proposal, and the dashboard `tsc`; record which still fail (exit status read from file).

## 2. Fix
- [x] 2.1 Gate `row`/`rows` in `routes/uar_model_catalog.rs` on `feature = "uar-driver"` without `allow(dead_code)`.
- [x] 2.2 Fix every still-failing Rust test and clippy error from 1.1 at its root.
- [x] 2.3 Fix every still-failing dashboard `tsc` error from 1.1.

## 3. Verify and land
- [x] 3.1 Re-run every check from 1.1 plus `cargo check -p librefang-api --features uar-driver --lib`; all exit 0.
- [ ] 3.2 Fresh-context review (rust-reviewer, plus typescript-reviewer if 2.3 changed files), then a PR with `--repo GQAdonis/librefang`; after the operator merges, confirm the final head SHA is an ancestor of `origin/main`.
