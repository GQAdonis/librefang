# Handoff to Codex — phase-11 (2026-09-27)

From: Claude Code session (orchestrator), handing off because of usage limits.
To: Codex.
Read first: `CLAUDE.md` / `AGENTS.md` "Default operating mode" (agent-team-first), the phase `goals.md`, `decision-log.md` (D-001..D-003), and ADR `docs/architecture/decisions/0001-agent-loop-ownership-and-uar-runtime-integration.md`.

## Ground rules that still apply

- Work only in linked worktrees; never edit the main tree `/Users/gqadonis/Projects/references/librefang`.
- In the main tree only `git pull --ff-only [origin [main]]` is allowed (PR #139, merged). The operator still has to run it once there, because the hook in the main checkout is the pre-#139 copy until then.
- Native cargo with a per-worktree `CARGO_TARGET_DIR=/tmp/librefang-target-<name>` and `SKIP_DASHBOARD_BUILD=1`; no `cargo build` / `cargo run`; `cargo test` only with `-p`; write cargo's exit status to a file and read it.
- No AI attribution in commits or PR bodies (git-side hooks are NOT active in these clones: `core.hooksPath` points at `.git/hooks`, so check `git log -1 --format=%B` yourself before pushing).
- Run `git add <paths>` in its own shell call; the safety hook false-positives when it shares a command with other git calls.
- Never open the operator's real data under `~/.librefang/` with any binary (SurrealDB 3.3.0 migrates 3.2.x datastores in place, one way).
- Every change headed for `main` gets an independent fresh-context review (merge-reviewer for syncs; a reviewer agent otherwise), with one batched correction/confirmation cycle.

## Branches and PRs

| Item | State |
|---|---|
| Phase branch `kbd/phase-11-surreal-recovery-uar-convergence` (worktree `/tmp/librefang-phase-11`) | Pushed. Contains phase seed, KBD state repair, merged G5 research, D-003. No PR yet. |
| PR #139 team-default + ff-only pull hook | Merged (`d216411d7`). |
| PR #140 release-safety test identity fix | Merged (`d9930772f`). |
| PR #141 Play packageName from android config + audit check 6 + checklist | Open. APPROVED by merge-reviewer's confirmation pass on `53ca9fdd9` (three non-blocking LOW nits: check 6 rejects a quoted literal packageName; its `jq` check scans all of release.yml rather than the `play_gate` step; one table cell holds two sentences). Ready to merge. |
| `p11/kbd-state` | Fully merged into the phase branch. |
| `p11/uar-convergence-research` | Merged into the phase branch (`d8584d160`). |

## Goals

| Goal | Status | Where the work is |
|---|---|---|
| G1 SurrealDB regression root cause | IN PROGRESS | `/tmp/librefang-p11-surreal`, branch `p11/surreal-rca-and-storage`, **uncommitted** edits (Cargo.lock, `librefang-storage/Cargo.toml`, `librefang-memory/src/backends/{mod,surreal_device,surreal_prompt,surreal_task,surreal_usage}.rs`, `librefang-memory/src/migration.rs`). The required report `docs/upstream-merges/2026-09-27-surreal-regression.md` does **not** exist yet. |
| G2 restore working state (storage side) | IN PROGRESS | same worktree; plus surreal-memory fix at `/tmp/surreal-memory-p11` branch `fix/memory-metadata-flexible-overwrite`, commit `afde32f` (not pushed; publishing it to Prometheus-AGS/surreal-memory-server needs the operator's OK), which makes `memory.metadata` FLEXIBLE via an OVERWRITE migration. |
| G2 restore working state (memory/kernel side) | IN PROGRESS | `/tmp/librefang-p11-memory`, branch `p11/memory-wiring`, **uncommitted** edits (kernel `boot.rs`, `accessors.rs`, `mod.rs`, `tests/vector_backend_boot_test.rs`; memory `shared.rs`, `surreal_proactive.rs`, `surreal_semantic.rs`, `semantic.rs`). |
| G3 KBD state | PARTIAL | Committed files are consistent (phase-10 closed 8/8; phase-11 at assess). The `prometheus kbd` runtime journal is still on the phase-10 run at revision 4; writing to it was denied as a shared-resource change and needs the operator. The main checkout's registry identity was repaired (backup `~/Library/Application Support/prometheus/kbd/registry.json.bak.20260927T211954Z-librefang-identity`). |
| G4 UAR runtime pin | IN PROGRESS | `/tmp/librefang-p11-uar`, branch `p11/uar-runtime-pin`, commit `c50218648` "pin runtime image to f45941bb by tag and digest", plus an **uncommitted** edit to `crates/librefang-llm-drivers/src/drivers/uar.rs`. |
| G5 BossFang / UAR / surreal-memory relationship | MET | ADR 0001 accepted with placement S1; research package approved by merge-reviewer at `d01f5dd14`. |

The three IN PROGRESS worktrees were being edited by agents that may be cut off mid-change.
Before continuing each one: read its diff, run its verification, and finish or discard the partial edit deliberately.

## What each unfinished role was asked to do

**surrealdb-schema-engineer (G1 + storage G2).**
The operator says SurrealDB "was working before" today's work.
Run the same tests at `16beef0fc` (main before today), `a76261af0` (first upstream merge), `3b231b5d0` (final upstream merge), `516c9e180` (SurrealDB 3.2.4→3.3.0 + surreal-memory f9ab1c2→b7e2093) and current, in detached worktrees, to bisect which commit broke each surface (operational pool/migrations, sessions, semantic memory, proactive memory, vector store, SQLite→Surreal importer, kernel boot).
Separate regressions (upstream merge / 3.3.0 bump / surreal-memory bump / PR #137) from defects that never worked, and say why each slipped (lib-only checks, `#[ignore]`d tests, no remote run, asserting a reported name).
Write `docs/upstream-merges/2026-09-27-surreal-regression.md` (one sentence per line) with a forward-fix vs roll-back recommendation.
Storage fixes: importer must decode msgpack message BLOBs (`rmp_serde::to_vec_named` in `librefang-memory/src/session.rs`) and omit unset optionals instead of sending `null`; each fix gets an embedded test plus an env-gated remote variant actually run against a local `surreal` 3.3.0 server (`BOSSFANG_TEST_SURREAL_URL`, explicit SKIP line when unset).

**bossfang-feature-steward, memory wiring (G2).**
Kernel boot must accept `vector_backend = "surreal"` and construct the Surreal semantic/proactive backends via `open_shared_memory_storage(storage_cfg, embedding, dimensions)`; `semantic_backend_name()` must report the backend in use; un-ignore `vector_backend_surreal_boot_selects_surreal_backend` if it runs locally.
`SurrealSemanticBackend` `knn_recall` / `forget` / `count` / `get_embeddings` must query the surreal-memory store, not the operational session.
Keep full error chains (not `e.to_string()`).
`remember` writes fail on surreal-memory `b7e2093` until the `afde32f` fix is published and the pin moves.

**bossfang-feature-steward, UAR pin (G4).**
Move `ARG UAR_IMAGE` in `Dockerfile` to the newest published image (commit `c50218648` pins `f45941bb`; confirm the image exists and whether that is the latest fork commit), adapt BossFang to sidecar-contract changes since `2aaeadd9`, and run `cargo test -p librefang-api --test uar_supervisor_integration`, `cargo test -p librefang-channels uar_sidecar`, `cargo test -p librefang-uar-spec`, `cargo test -p librefang-llm-drivers --features uar-driver uar`.
Report the-boss's pins (read-only): the research found UAR `92620d40`, surreal-memory `6acb605`, SurrealDB server 3.2.4 in `build/integration-artifacts.json`.

## Decisions the operator made (D-003)

- UAR executor placement S1: full UAR runs only on the managed sidecar; external-local/remote UAR are model-gateway only; S2a is the future remote path.
- Phase-11 scope: SurrealDB recovery + migration steps M1–M4 + G4. M5a–M5c (full UAR runs) are phase-12.
- Existing `provider = "uar"` agents switch in one release (gateway off the broken `/api/chat/completion`) with a release note.

## Known live defects (confirmed by review)

- `UarDriver` posts BossFang's tools to UAR `/api/chat/completion`, which ignores them and runs a whole UAR agent; BossFang tools never reach the model and tool effects bypass `ApprovalManager`. Present in the shipped `2aaeadd9` image. M3 fixes it (recommended: point the existing Anthropic driver at UAR's `/v1/messages`; UAR drops `max_tokens` / `temperature` / `tool_choice` there today).
- surreal-memory `b7e2093` rejects nested `metadata` writes (fix `afde32f`, unpublished).
- CI Security job fails on `quick-xml` RUSTSEC-2026-0194/0195 via `object_store 0.13` ← `surrealdb-core 3.3.0`; no compatible fixed version exists. Operator decision pending (PR #141 body): `[patch]` fork, documented temporary ignore, or wait.
- `release.yml` `sync_homebrew_cask` still targets upstream's tap and LibreFang naming. Operator decision pending (PR #141 body).
- `crates/librefang-kernel/src/backends/` (Surreal approval/TOTP) is not declared in `lib.rs` and never compiles.

## Pending operator decisions

1. Allow writing the `prometheus kbd` runtime journal to align it with the committed state (G3).
2. Publish the surreal-memory fix `afde32f` to Prometheus-AGS/surreal-memory-server and move the pin.
3. quick-xml audit handling; Homebrew cask job.
4. Open G5 questions: whose provider credentials pay delegated runs; link-uar wire vs deprecate; shared user memory; surreal-memory release tags; the-boss 3.3.0 upgrade timing; whether the-boss hosts BossFang.
5. The G1 roll-back-vs-forward recommendation, once written.

## Next steps, in order

1. Finish G1 and write the regression report; it decides whether G2 fixes forward on 3.3.0 or rolls back.
2. Finish the storage and memory G2 work; combine `p11/surreal-rca-and-storage`, `p11/memory-wiring` and `p11/uar-runtime-pin` onto the phase branch; re-verify the combined tree (`cargo check --workspace --lib`, clippy on touched crates, scoped tests, `python3 scripts/enforce-branding.py --check`).
3. Independent review of the combined phase branch, one correction cycle, then open the phase PR.
4. `/kbd-assess` → `/kbd-plan` for M1–M4 (owners in `goals.md`).
5. Refresh the Compass graph after code changes (`compass update .` in the worktree; commit only the report files per `.gitignore`).
