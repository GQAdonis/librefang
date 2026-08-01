# Refinement log: C-URT-002

## Iteration 1 — 2026-07-31

- Schema inputs created from the child change contract and inherited constraints.
- Source file integrity confirmed in the isolated Prometheus worktree.
- Blocking source constraints passed through deterministic tests and lint.
- Full runtime testing exposed an ambient control-token environment leak; the test seam was corrected to use an explicit temp-file primitive and the suite was rerun successfully.
- Operational constraints remain intentionally pending until the backed-up migration/replay proof.

## Iteration 2 — adversarial review

- Round 1 found raw template substitution; plist XML and quoted systemd values now use format-aware escaping with hostile-path coverage.
- Round 2 found the macOS-only `plutil` test and a dual-key fallback gap; portable stdlib XML parsing and a `changes: []` plus populated `ordered_changes` regression closed both.
- Round 3 passed with zero findings and sycophancy score 0.0.

## Iteration 3 — live migration

- The first replay exposed phase 8 as read-only despite a green summary. Its source ledger used `ordered_changes`, so normalization and the summary counter were repaired before retry.
- The final migration ran from verified backups with the integrated release CLI; all 14 backup hashes matched and replay contained no read-only phases.
- The static shell token override for the old project produced 401s and was removed; project-scoped token discovery then succeeded.

## Iteration 4 — durable proof

- Typed phase, stage, task, and decision commands committed through sovereign-sync.
- Failed command IDs remained immutably failed as designed; corrected transitions used new IDs and respected pending → in-progress → complete.
- Duplicate decision replay stayed at revision 16, and a launchd restart returned the same revision, decision, completed change, and project identity over HTTP 200.
