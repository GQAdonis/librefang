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
| G1 SurrealDB regression root cause | DONE (needs review) | Branch `p11/surreal-rca-and-storage` (pushed; worktree `/tmp/librefang-p11-surreal`), report `docs/upstream-merges/2026-09-27-surreal-regression.md` in commit `100018063`. Finding: today's PRs broke nothing that worked; the SurrealDB 3.3.0 and surreal-memory bumps are not the cause (same failures on 3.2.4 + `f9ab1c2`). The daemon has not used SurrealDB for memory since upstream merge `c767b8d16` (2026-05-05) removed the kernel wiring added in `88cc68c73`; boot uses the SQLite `MemorySubstrate`, and SurrealDB serves only the config store, `/api/storage` and CLI `storage`. `main` before today (`16beef0fc`) did not compile `librefang-api` (E0716, `uar_supervisor.rs:67`, PR #134 × #127). The operator's local data was last written 2026-05-04 by SurrealDB 3.0.5 and has not been migrated; back it up and rehearse the one-way 3.0.5→3.3.0 upgrade on a copy first. Recommendation: fix forward on 3.3.0. Correction to PR #137: UUID record-key escaping also happens on 3.2.4. Raw logs: `/tmp/p11-probes/results/`. |
| G2 restore working state (storage side) | DONE (needs review) | Same branch: `6e7bf4a7a` migration runner now checks every statement + migration 045 (`kv_store.value` any JSON, `prompt_versions.tools`/`variables` string arrays); `7682fc53c` importer decodes legacy MessagePack BLOBs via `LegacyBlobDecoder` / `librefang_memory::migration::TypedLegacyBlobDecoder` and omits NULLs, reports undecodable BLOBs; `031205763` operational Surreal backends (usage, device, prompt, task) accept their own writes. Tests pass embedded and remote (ws + http against local SurrealDB 3.3.0). surreal-memory fix at `/tmp/surreal-memory-p11` branch `fix/memory-metadata-flexible-overwrite`, commit `afde32f` (migration v22 `DEFINE FIELD OVERWRITE metadata … FLEXIBLE`; not pushed; publishing needs the operator's OK; UAR shares that pin). Remaining handoffs: switch `routes/storage.rs:429` and `commands/storage.rs:336` to `migrate_sqlite_to_surreal_with_decoder(…, &TypedLegacyBlobDecoder)`; `SurrealTaskBackend::task_reset_stuck` filters on an undefined `updated_at`. |
| G2 restore working state (memory/kernel side) | DONE (needs review) | Branch `p11/memory-wiring` (pushed; worktree `/tmp/librefang-p11-memory`): `09b65257c` Surreal memory backends now query the surreal-memory store (not the operational DB), replace the unparseable `meta::value(...)`, return real cosine scores, stop double-embedding (`store_indexed_memory` with the caller's vector), keep full error chains (`shared::memory_error`), and give proactive memory a real decay over the `memory` table; `c62b118a7` kernel selects the SurrealDB vector index from `[memory] vector_backend` (new `kernel/vector_backend.rs`; auto → surreal when an embedding driver exists, else sqlite; SQLite stays system of record; background sync of existing vectors), `semantic_backend_name()` reports the attached store, `vector_backend_boot_test` rewritten un-ignored (6/6 incl. remote ws/http). `semantic_backend_remember_recall_count_forget` stays `#[ignore]` until surreal-memory `afde32f` is published and pinned (passes 4/4 with it). Open: `VectorStore` trait has no agent/scope on insert and `SemanticStore::forget`/prune don't delete vectors (trait change in `librefang-types`, needs a decision); `StorageConfig::default()` path is CWD-relative for the operational pool; stale comment `librefang-runtime/src/context_engine.rs:509,588`. |
| G3 KBD state | PARTIAL | Committed files are consistent (phase-10 closed 8/8; phase-11 at assess). The `prometheus kbd` runtime journal is still on the phase-10 run at revision 4; writing to it was denied as a shared-resource change and needs the operator. The main checkout's registry identity was repaired (backup `~/Library/Application Support/prometheus/kbd/registry.json.bak.20260927T211954Z-librefang-identity`). |
| G4 UAR runtime pin | BLOCKED on a publishable image | Branch `p11/uar-runtime-pin` (pushed; worktree `/tmp/librefang-p11-uar`): `c50218648` pins `ghcr.io/gqadonis/universal-agent-runtime:f45941bb…@sha256:6de71856…` (newest image that exists; amd64 layers identical to `2aaeadd9`), `fac951a75` fixes the 11/37 `uar` driver tests that were failing on the base branch since `0208eaa34` (fakes now serve `/api/uar/capabilities` + `/api/uar/compatibility`; 37/37 pass), `0181bfcd0` adds a KNOWN GAP note in `Dockerfile`. **The BossFang driver on `main` requires `service_instance_placement_v1`, which no published image has, so the Docker UAR path is broken until an image of upstream `3d6bf056`+ exists.** The `GQAdonis/universal-agent-runtime` fork (which owned the GHCR publish workflow, `127e0632`) no longer exists (404) and had diverged (609 behind / 17 ahead of upstream main). Operator must either re-fork and re-apply the publish CI or add a linux/amd64 GHCR job to Prometheus-AGS UAR; then set `ARG UAR_IMAGE`, and live-probe `/api/uar/capabilities` (watch: driver default ownership `external` vs sidecar forced `managed`). Stale comment: `crates/librefang-channels/src/uar_sidecar.rs:4-6` (ephemeral port; upstream now defaults to 1906). the-boss pins UAR `92620d40` (launch token, no placement contract), surreal-memory `6acb6056`, SurrealDB `v3.2.4`: none match this repo. |
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

1. All three role branches are merged onto the phase branch (`3ba87a3e3`, `530fe2746`, `50386a393`; no file overlaps). `cargo check --workspace --lib` on the combined tree exits 0 (`/tmp/p11-combined-check.log`). Still to run on the combined tree: `cargo clippy --workspace --all-targets -- -D warnings`, `cargo test -p librefang-storage --features sqlite-backend`, `cargo test -p librefang-memory --features sqlite-backend`, `cargo test -p librefang-kernel --test vector_backend_boot_test`, `cargo test -p librefang-llm-drivers --features uar-driver uar`, `python3 scripts/enforce-branding.py --check`, plus the remote variants against a local SurrealDB 3.3.0 (`BOSSFANG_TEST_SURREAL_URL`).
2. Remaining small fixes: switch `routes/storage.rs:429` and `commands/storage.rs:336` to `migrate_sqlite_to_surreal_with_decoder(…, &librefang_memory::migration::TypedLegacyBlobDecoder)`; fix `SurrealTaskBackend::task_reset_stuck` (undefined `updated_at`); stale comments in `librefang-channels/src/uar_sidecar.rs:4-6` and `librefang-runtime/src/context_engine.rs:509,588`.
3. Independent review of the combined phase branch, one correction cycle, then open the phase PR.
4. `/kbd-assess` → `/kbd-plan` for M1–M4 (owners in `goals.md`).
5. Refresh the Compass graph after code changes (`compass update .` in the worktree; commit only the report files per `.gitignore`).
