# Execution — phase-10-uar-sidecar-availability

**Date:** 2026-07-11
**Backend:** `native-tool`
**Changes:** 8 (C-001 … C-008), 0 complete at dispatch

## Backend selection

`native-tool`. OpenSpec is initialized in the repo (`openspec/config.yaml`, PR #107) but
`.kbd-orchestrator/project.json` pins `specBackend: native-kbd` for this phase — its eight
change specs were written and reviewed as native KBD change files, and migrating them
mid-phase would rewrite them purely to change file format. Phase-11 adopts the OpenSpec
backend.

Consequence: task execution is driven directly against the native change files in
`.kbd-orchestrator/changes/C-00*.md`; there is no `/opsx:apply` dispatch.

## Dispatch contract

One change → one branch → one PR. Each change's spec file carries its own acceptance
criteria and verification commands; those are the definition of done, not this file.

**Base branch:** every change branches from `origin/main`. PRs #105, #106 and #107 are open
and unmerged, so changes must **not** stack on them — a code change sitting on an unmerged
docs branch cannot be reviewed or merged independently.

## Wave 1 — dispatched now (no dependencies)

| Change | Repo | Status |
|---|---|---|
| **C-001** make `uar-driver` genuinely opt-in | librefang | dispatched |
| **C-003** generalize bundled-binary resolution; fail loudly | librefang | dispatched |
| **C-002** publish the `uar-sidecar` binary | `GQAdonis/universal-agent-runtime` | dispatched (long pole) |
| **C-005** UAR sidecar config surface | librefang | queued behind C-001/C-003 |

C-001 and C-003 are the two changes that deliver value with **no dependency on UAR at all**,
and C-003 is the actual bug fix. C-002 is dispatched in parallel because its lead time is the
phase's critical path.

## QA gate

Per the execute protocol, artifact-refiner QA runs per change once it reaches `DONE`, and is
skipped for changes touching fewer than 3 files or that are documentation-only.

- **C-001** — 2 files (`librefang-kernel/Cargo.toml`, `CLAUDE.md`). **QA skipped** (< 3 files).
- **C-003** — code + tests in `librefang-channels`. QA gate applies.
- **C-002** — upstream repo; QA gate is not applicable to another repository's CI.

## Verification (per the phase's definition of done)

```bash
cargo check --workspace --lib
cargo test -p librefang-channels                  # C-003
cargo clippy -p librefang-channels --all-targets -- -D warnings
cargo tree -i surrealdb                            # C-001: UAR must be ABSENT by default
python3 scripts/enforce-branding.py --check
```

Local note: `cargo check` must run with `SKIP_DASHBOARD_BUILD=1` on this machine — the
dashboard `build.rs` requires corepack pnpm 10.33.0 and a Volta-managed pnpm 8 on PATH cannot
parse `dashboard/pnpm-workspace.yaml`. CI uses 10.33.0 and is unaffected.

## Blocked / not dispatched

C-004, C-006, C-007, C-008 are blocked on **C-002** — until the `uar-sidecar` binary is
published there is nothing to copy, resolve, or spawn.

Their *implementation* is unblocked once C-003 and C-005 land, because C-006 specs a **fake,
contract-honouring `uar-sidecar`** for tests. Only real end-to-end verification waits on
C-002.

## Continuation — 2026-07-31

C-001 through C-005 are merged on `origin/main`. C-004 landed in PR #118 and was
reconciled from stale `IN PROGRESS` state after validating the merged image changes and
running the BossFang branding audit. The remaining dependency chain is executed in one
isolated completion worktree so C-006 → C-007 → C-008 can be verified end to end before
the phase is closed.

| Change | Execution assignment | Model tier | Status |
|---|---|---|---|
| **C-006** UAR sidecar supervisor | Codex native tool | frontier | in progress |
| **C-007** HTTP + SSE driver | Codex native tool | frontier | queued after C-006 |
| **C-008** operator API + dashboard | Codex native tool | frontier | queued after C-007 |
