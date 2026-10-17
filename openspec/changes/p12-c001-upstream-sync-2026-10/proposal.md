# Complete the 2026-10-16 upstream sync and bring it to the current upstream tip

## Observed requirement
An upstream sync was already done outside KBD on 2026-10-16:
- `chore/upstream-merge-2026-10-16` (pushed, `be7518a85`) merges 87 upstream commits (`3bcb9a32e`), resolving the 28 conflicts, and carries `docs/upstream-merges/2026-10-16.md`.
- The local `chore/upstream-merge-2026-10-16-schema` (`107f38cd3`) adds SurrealDB parity on top.

Neither is on `origin/main`.
Since then `upstream/main` has gained 16 more commits (tip `dfd11bc4f`), and `origin/main` has gained 13 (plus C-000).
Open items for the sync:
- the compile break in `crates/librefang-llm-drivers/src/drivers/uar.rs:1176` (`CompletionResponse.text_synthesized_from_thinking`)
- the SQLite schema-version collision (BossFang v62 vs upstream v62/v63)
- ACP 3.3.0, dalek 3 and zip 9 bumps

## Scope
Continue from `chore/upstream-merge-2026-10-16-schema` instead of re-merging: merge current `origin/main` (including C-000) and the remaining upstream commits into it, reusing the recorded resolutions.
Re-check that every compile-break, SQLite and branding item is resolved on the result.
Run by `upstream-merge-manager` with the `librefang-upstream-merge` skill.
The Surreal backend conflicts in `crates/librefang-memory/src/{proactive,semantic,substrate}.rs` are handed to `surrealdb-schema-engineer`, and the `UarDriver` and ACP fixes to `bossfang-feature-steward`.
Parity work is in `p12-c002-surreal-parity-sync-2026-10` on the same branch.

## Boundary
Merging upstream's own `librefang-cli` changes (6 files in the 16 newer commits) is part of the sync and exempt from the "do not modify `librefang-cli`" constraint; no BossFang-authored CLI edits are made here.
No cherry-picks; no BossFang feature work; independent `merge-reviewer` review after C-002; the prior branches are superseded and retired once merged.
