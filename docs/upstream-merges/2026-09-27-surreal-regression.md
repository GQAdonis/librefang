# SurrealDB regression root cause, 2026-09-27

Owner: `surrealdb-schema-engineer` (phase-11 goal G1).
Worktrees: `/tmp/librefang-p11-surreal` (fixes, branch `p11/surreal-rca-and-storage`) and detached baselines `/tmp/librefang-p11-at-<sha>`, each with its own `CARGO_TARGET_DIR`.

## Plain-language summary

The SurrealDB 3.3.0 upgrade and the surreal-memory `f9ab1c2` → `b7e2093` bump did not break anything that worked before.
Every SurrealDB rejection reported today reproduces byte-for-byte on SurrealDB 3.2.4, and every SurrealDB-backed memory surface already failed at `16beef0fc`, the main commit before today's work.
What changed today is that the failures became visible: PR #136 made the `librefang-memory` test target compile again and PR #137 fixed the first two defects on the path (the session array type and the zero-dimension embedder), so the tests now reach the next defect instead of stopping earlier.

Three facts explain why SurrealDB "looked like it worked":

1. **The daemon has not used SurrealDB for memory since 2026-05-05.**
   The upstream merge `c767b8d16` (v2026.5.5) dropped BossFang's kernel wiring that `88cc68c73` (2026-04-24) had added: the `SurrealConnectionPool` on the kernel and the Surreal session, kv, task, proactive, usage, device, prompt and trace backends.
   Since then kernel boot opens the SQLite `MemorySubstrate` (`crates/librefang-kernel/src/kernel/boot.rs`), and SurrealDB is only used by the config store overlay, the `/api/storage/*` routes and the CLI `storage` commands.
   The Surreal memory backends are compiled but dormant, so none of their defects could reach a running daemon.
2. **Main before today did not build the daemon at all.**
   At `16beef0fc`, `librefang-api` fails to compile with the pinned toolchain (`rustc 1.94.1`): `E0716 temporary value dropped while borrowed` in `routes/uar_supervisor.rs:67`, a semantic conflict between PR #134 (`0208eaa34`) and the `config_ref()` → `arc_swap::Guard` change merged by PR #127.
   `3b231b5d0` fixed it.
   `librefang-memory`'s lib-test target also failed to compile from 2026-09-14 (PR #124 added `AgentEntry::parent_unknown` and `MemoryFragment::similarity`) until `3b231b5d0`, so none of its in-crate Surreal tests ran for two weeks.
3. **The operator's own data has not been touched since May.**
   `~/.librefang/daemon.json` records a `2026.5.2-beta8` daemon started 2026-05-04T09:08Z; the newest file under `~/.librefang/data/.librefang/librefang.surreal` and `librefang-memory.surreal` is 2026-05-04 08:09 local, and `daemon.log` ends the same morning.
   The fork pinned `surrealdb = "=3.0.5"` on 2026-05-04 (`7d672678d`), so that data was written by SurrealDB 3.0.5.
   No 3.3.0-built binary has opened it, so it has not been migrated to the 3.3 on-disk format (evidence from file metadata and logs only; the stores were not opened).
   That May log already shows SurrealDB failing on the Surreal usage path: `SurrealDB insert usage: Couldn't coerce value for field user_id` on every LLM call, the NULL-into-`option<string>` defect this report lists as pre-existing.

So the honest answer to "which commit broke it" is: nothing broke today; the defects date from April (schema and backends) and May (the kernel unwiring), and today's commits exposed them.
The one real regression in the pre-today window is the `librefang-api` compile break at `16beef0fc`, and it is already fixed on main.

## How the evidence was produced

The same test set ran at `16beef0fc`, `a76261af0`, `3b231b5d0`, `516c9e180` and `b88e2641b` (current code; main `ded34026c` differs only in docs).
Where a test did not exist at an older commit, the newest version was ported into the detached worktree (uncommitted): `p11_session_rt.rs` is `surreal_session_roundtrip_test.rs` (minus `parent_session_id` at `16beef0fc`), and `p11_semantic_probe.rs` exercises `SurrealSemanticBackend` remember → count → recall (with caller metadata) → forget → count.
Remote variants ran against local servers of the matching version: SurrealDB 3.2.4 (`surreal-v3.2.4.darwin-arm64` release binary) on `127.0.0.1:18124` for the 3.2.4 commits, 3.3.0 on `127.0.0.1:18130` for the 3.3.0 commits, both in memory mode, over `ws://` and `http://`.
Server-level behaviour was compared directly with `surreal sql --endpoint memory` on both versions (`/tmp/p11-probes/probe*.surql`).

Commands (per commit, `CARGO_TARGET_DIR=/tmp/librefang-target-p11-at-<sha> SKIP_DASHBOARD_BUILD=1`, exit code written to a file as the last action):

- `cargo test -p librefang-storage` and `--features sqlite-backend`
- `cargo test -p librefang-memory` (lib + integration), `-- --ignored` (runs `knn_hnsw_relevance`)
- `cargo test -p librefang-memory --no-fail-fast --test p11_semantic_probe --test p11_session_rt --test surreal_vector_integration_test` with `BOSSFANG_TEST_SURREAL_URL` set
- `cargo test -p librefang-kernel --test vector_backend_boot_test -- --ignored` (at `16beef0fc` and `b88e2641b`; the kernel's `vector_backend` handling is identical at every commit)

## Build breaks inside today's window

| Commit | `librefang-memory` lib | `librefang-memory` lib tests | `librefang-api` lib | Category |
|---|---|---|---|---|
| `16beef0fc` | builds | n/c: `AgentEntry::parent_unknown`, `MemoryFragment::similarity` missing (since PR #124, 2026-09-14) | n/c: E0716 in `uar_supervisor.rs` (PR #134 × PR #127) | pre-existing |
| `a76261af0` | n/c: `Session::parent_session_id` missing in `surreal_session.rs` (upstream #7991 added the field) | n/c | not reached | (a) upstream merge |
| `3b231b5d0` | builds | builds, 499 pass | builds | fixed |
| `516c9e180` | builds | builds, 499 pass | builds | — |
| `b88e2641b` | builds | builds, 502 pass | builds | — |

`a76261af0` is the only commit today that broke something that previously built, and the merge branch fixed it in `3b231b5d0` before PR #136 merged; main never carried it.
The merge commits were verified with `cargo check --workspace --lib`, which does not compile test targets, and the SurrealDB integration tests that would have exercised the backends were `#[ignore]`d.

## SurrealDB 3.2.4 vs 3.3.0 at the server

| Behaviour | 3.2.4 | 3.3.0 |
|---|---|---|
| Nested key under a strict `option<object>` in a SCHEMAFULL table | `Found field 'metadata.librefang', but no such field exists for table 'memory'` | identical |
| Array into `option<object> FLEXIBLE` | `Expected none \| object but found [...]` | identical |
| JSON `null` into `option<string>` | `Expected none \| string but found NULL` | identical |
| UUID record id rendered as a string | ``sessions:`<uuid>` `` | identical |
| `type::thing(...)` | parse error, "did you mean `type::record`" | identical |
| `math::sum(x)` over rows without `GROUP ALL` | `Expected array<number> but found 1.5f` | identical |
| `DEFINE FIELD IF NOT EXISTS` on an existing field | no-op | identical |

None of today's symptoms is a 3.3.0 behaviour change.
The claim in `d2bd0b32f` that "SurrealDB 3.3 stringifies a UUID record id with an escaped key" is wrong about the version: 3.2.4 does the same.

## Per-surface results

Legend: pass / FAIL (first failure) / n/c = does not compile / — = not applicable.
"Remote" columns are the same test over `ws://` and `http://`.

### Operational pool, migrations, config store (`librefang-storage`)

| | `16beef0fc` | `a76261af0` | `3b231b5d0` | `516c9e180` | `b88e2641b` | fix branch |
|---|---|---|---|---|---|---|
| `cargo test -p librefang-storage` (embedded) | pass (exit 0) | pass (exit 0) | pass (exit 0) | pass (exit 0) | pass (exit 0) | pass (exit 0) |
| `--features sqlite-backend` (importer) | pass (exit 0) | pass (exit 0) | pass (exit 0) | pass (exit 0) | pass (exit 0) | pass (exit 0) |
| Migrations / config store, remote | no test | no test | no test | no test | no test | pass, ws + http, 3.3.0 |

Status before/after: working at every commit for what was tested, but the tests never covered a remote server, idempotence, drift, sessions or any BLOB column.
Breaking commit: none.
Latent defects found and fixed on the branch:
- The migration runner never `check()`ed a query's per-statement results, so a DEFINE that SurrealDB rejected at execution time was recorded as applied and never retried (`runner.rs::run_migration`).
- `kv_store.value` (`006`) was `option<object>` though the runtime stores any JSON value; `prompt_versions.tools` / `variables` (`010`) were `option<object>` though they are `Vec<String>`.
Why it slipped through: embedded-only tests, and the importer tests seeded only four tables with no BLOBs and no NULLs.

### Sessions and canonical sessions (`SurrealSessionBackend`)

| | `16beef0fc` | `3b231b5d0` | `516c9e180` | `b88e2641b` |
|---|---|---|---|---|
| Round trip, embedded | FAIL `save parent: ... Expected none \| object but found [...]` | FAIL (same) | FAIL (same) | pass |
| Round trip, remote ws + http | FAIL (same error, 3.2.4 server) | FAIL (same, 3.2.4) | FAIL (same, 3.3.0) | pass (3.3.0 server) |
| Same code on 3.2.4 + `f9ab1c2` (`b88e2641b` with the dependency bump reverted) | — | — | — | pass, embedded and remote (3.2.4 server) |

Status: never worked on SurrealDB (the `005` schema has typed `messages` as an object since `d1a640a96`, 2026-04-24); fixed by `d2bd0b32f` (migration 044) in PR #137.
Category (e), pre-existing.
Why it slipped through: no test ever saved a session through the Surreal backend, and the backend has not been wired into the kernel since `c767b8d16`.

### Semantic memory and the vector store (`SurrealSemanticBackend` / `VectorStore`)

| | `16beef0fc` | `3b231b5d0` | `516c9e180` | `b88e2641b` | `b88e2641b` + surreal-memory `afde32f` |
|---|---|---|---|---|---|
| Probe, embedded | FAIL at open: `Embedding provider reported zero dimensions` | FAIL at open (same) | FAIL at open (same) | FAIL at `remember`: `add_memory` | remember passes; FAIL at `count`: `The table 'memory' does not exist` |
| Probe, remote | FAIL at open (same) | FAIL at open (same, 3.2.4) | FAIL at open (same, 3.3.0) | FAIL at `remember` | same as embedded |
| `knn_hnsw_relevance` (`--ignored`) | n/c (lib test target) | FAIL at open (zero dimensions) | FAIL at open (zero dimensions) | FAIL `remember failed for fragment 0: add_memory` | — |
| Same code on 3.2.4 + `f9ab1c2` (`b88e2641b` with the dependency bump reverted) | — | — | — | FAIL at `remember`: `Failed to create memory` (embedded and remote, 3.2.4 server) | — |

Three stacked, pre-existing defects, each hidden by the one before it:
1. The backend was built with a `NoopEmbedding` of dimension 0, which surreal-memory refuses; fixed by `941c8accf` (PR #137).
2. surreal-memory's `memory.metadata` is a strict `option<object>`: its migration 8 used `DEFINE FIELD IF NOT EXISTS … FLEXIBLE` on the field migration 2 had already created, so it was always a no-op (surreal-memory commit `9fb1ba0`, 2026-03-17).
   Every `remember` stores `metadata.librefang` / `metadata.user`, so every insert is rejected, on 3.2.4 and 3.3.0 alike.
   The same migration list is present at both `f9ab1c2` and `b7e2093` (only v20 and v21 were added), so the surreal-memory bump did not introduce it.
   Fixed upstream-side on branch `fix/memory-metadata-flexible-overwrite` (`afde32f`, migration v22 `DEFINE FIELD OVERWRITE metadata ON memory TYPE option<object> FLEXIBLE`).
   `librefang-memory` also discards the underlying error text (`Memory { message: "add_memory", source: None }`), which is why the report did not name the cause.
3. `count`, `forget`, `update_access` and the `VectorStore` methods query `self.db`, the operational session (`librefang.surreal` / database `main`), while the memories live in the separate `SurrealStorage` database (`librefang-memory.surreal` / database `memory`, introduced by `memory_storage_config`).
   They can never see a stored memory.
Category (e) for all three.
Why it slipped through: `knn_hnsw_relevance` is `#[ignore]`d with a misleading "requires a running SurrealDB" reason (it only needs a temp dir), the shared-storage integration test was `#[ignore]`d at `16beef0fc` ("run in the feature-gated Surreal/vector CI lane"), and the lib-test target did not compile from 2026-09-14 to `3b231b5d0`.

### Proactive memory (`SurrealProactiveMemoryBackend`)

Shares the same `SurrealStorage` and metadata path as the semantic backend, so it is subject to defect 2 above; it has no dedicated test at any commit.
Not re-tested here (owned by another role this phase); handed off.

### Operational backends: usage, devices, prompts, kv, agent registry

| | `b88e2641b` | fix branch |
|---|---|---|
| `surreal_operational_backends_test`, embedded | FAIL `SurrealDB insert usage: Couldn't coerce value for field channel ... found NULL` | pass |
| same, remote ws + http (3.3.0) | FAIL (same) | pass |

Defects found (all pre-existing since `88cc68c73`, 2026-04-24, category (e); the May `daemon.log` shows the first one in production):
- `SurrealUsageStore::record` sends `user_id` / `channel` as JSON `null`, rejected by `option<string>`.
- Every usage cost/token aggregate (`query_hourly`, `query_daily`, `query_summary`, the per-provider and per-user budget checks) lacks `GROUP ALL`, so SurrealDB rejects the query; every quota check errors.
- `SurrealDeviceStore` sends `push_token: null`; `SurrealPromptStore` sends `description` / `started_at` / `ended_at` as `null`, writes `tools` / `variables` as `[]` regardless of the version (data loss), cannot parse the backtick-escaped ids it reads back (so `list_versions` / `get_version` return nothing), and uses the removed `type::thing`, so every second `record_request` fails silently (the query result was never checked).
- `SurrealTaskBackend::task_reset_stuck` strips `task_queue:` but not the key escaping.
Why it slipped through: no test for any of these backends, and none is wired into the kernel.

### SQLite → SurrealDB importer (`migrate/sqlite_to_surreal.rs`)

| | `16beef0fc` … `b88e2641b` | fix branch |
|---|---|---|
| Existing tests (4 tables, no BLOBs) | pass | pass |
| Real SQLite store → import → read back through the Surreal backends, embedded | no test | pass |
| same, remote ws + http (3.3.0) | no test | pass |

Defects (pre-existing since `88cc68c73`, category (e)):
- Session histories are `rmp_serde::to_vec_named` MessagePack, but the importer parsed them as JSON and silently substituted `[]`, importing every session with an empty history; agent manifests (also MessagePack) failed to parse, so every agent was skipped with a warning.
- Canonical histories are positional MessagePack (`rmp_serde::to_vec`), which cannot be decoded without the Rust types.
- Unset optional columns were sent as JSON `null` (rejected by `option<string>`), kv values that are not objects and prompt tool lists were rejected by the column types, `paired_devices.api_key_hash` (a required column) was never sent, the agent `entry` lacked fields `AgentEntry` requires, and record ids for kv and devices did not match the runtime backends'.
- The dry-run planner counted 5 tables while the importer copies 13.
Why it slipped through: the fixture had no BLOB or NULL columns and nothing read the imported rows back through the backends.

### Kernel boot with the Surreal backends selected

| | `16beef0fc` | `b88e2641b` |
|---|---|---|
| `vector_backend_boot_test -- --ignored` | n/c (`librefang-api` E0716) | 2 pass, `vector_backend_surreal_boot_selects_surreal_backend` FAIL `BootFailed("Unknown vector_backend: \"surreal\"")` |

The kernel's `vector_backend` match only knows `http`, `sqlite` and `""`, identical at every commit since `c767b8d16`.
The two passing tests only compare `semantic_backend_name()`, which reports a name derived from config, not the backend in use; the auto test reports `"surreal"` while the kernel runs SQLite.
All three are `#[ignore]`d as needing a SurrealDB on `ws://127.0.0.1:8000`, which they never contact.
Category (a) at the May merge `c767b8d16`, not today's.

## Fixes on `p11/surreal-rca-and-storage`

| Commit | Scope |
|---|---|
| `6e7bf4a7a` | Migration runner checks every statement; migration 045 (kv values, prompt tool lists); runner and config-store tests embedded + remote, drift test |
| `7682fc53c` | SQLite importer: MessagePack decoding (generic and typed decoders), NULL omission, full column coverage, runtime-matching record ids, planner parity; embedded + remote tests including a real-store round trip |
| `031205763` | Usage, device, prompt and task backends: NULL omission, `GROUP ALL`, record-key unescaping, `type::record`, real tool lists; embedded + remote test |

surreal-memory: branch `fix/memory-metadata-flexible-overwrite`, commit `afde32f` (migration v22), not pushed.
With it patched into `b88e2641b`, `remember` succeeds and the probe stops at defect 3 (`count` on the wrong database).

Raw logs for every run are in `/tmp/p11-probes/results/` (`<label>.<step>.log` with a `.status` file holding cargo's exit code).

## Recommendation: fix forward on 3.3.0

Rolling back buys nothing: every defect reproduces on 3.2.4 with surreal-memory `f9ab1c2`, and main before today did not even build `librefang-api`.
A rollback would also have to pin surreal-memory to a commit before `ad97c9c` and UAR to a 3.2.x runtime, because surreal-memory `main` and UAR both require `surrealdb = "=3.3.0"`, so the three projects could no longer share one SurrealDB version.
The operator's data is still in the 3.0.5 format, so fixing forward must include backing it up before the first 3.3.0 open.

Fix-forward order:
1. Land this branch (importer, migrations 045, runner check, operational backends) and publish surreal-memory `afde32f`, then move the `surreal-memory` rev pin to it.
2. Fix the semantic backend's database handle for `count` / `forget` / `update_access` / `VectorStore`, and keep the surreal-memory error text (memory backends owner).
3. Re-wire the Surreal backends into kernel boot and accept `vector_backend = "surreal"` (kernel owner), with a boot test that asserts the backend actually in use.
4. Before any 3.3.0 build opens `~/.librefang/data/.librefang/*.surreal`, back the two directories up; 3.3.0 migrates an older datastore in place, one way, and the 3.0.5 → 3.3.0 jump has not been tried here, so rehearse it on a copy first.
