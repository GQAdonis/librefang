Task model assignments: see `.kbd-orchestrator/phases/phase-12-sync-uar-refresh-dot-facade/plan.md` → "Task model assignments", rows keyed by this change ID.

Prerequisite for every task: C-001 is merged to `main`.

## 1. Child phase
- [ ] 1.1 Create the G3 child phase under phase-12 with goals amended for D-003, excluding M1–M5 (#162–#167), naming #156 as its tracker and `backlog.md` as an input.

## 2. Baseline on the synced tree (child `baseline.md`)
- [ ] 2.1 Re-verify the WP1–WP6 status table and the Q3/Q6 recommendations on post-sync `main`, including upstream #8526 and #8583.
- [ ] 2.2 Inventory every code path that writes an unowned workflow or task, and every path that trusts a caller-supplied creator string.
- [ ] 2.3 Draft the mapping of acceptance rows A01–A20 to proposed changes and test suites.

## 3. Ledger and land
- [ ] 3.1 Add the KnowMe/dot facade row to `docs/bossfang/feature-ledger.md` with owner, status and the #156 link.
- [ ] 3.2 Fresh-context review, then a PR with `--repo GQAdonis/librefang`; after the operator merges, confirm the final head SHA is an ancestor of `origin/main`.
