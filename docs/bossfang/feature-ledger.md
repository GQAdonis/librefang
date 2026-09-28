# BossFang Feature Ledger

Owner: `product-manager` (bossfang-stewards team, `.agent-team/bossfang-stewards/team.json`).
This is the canonical inventory of every BossFang-exclusive feature in the
GQAdonis/librefang fork. Each upstream sync must leave every row green; the
per-sync acceptance criteria live in `docs/bossfang/sync-criteria/<date>.md`.

- **Baseline:** pre-merge fork tip `origin/main` @ `4b30ba247`, taken before the
  2026-09-27 upstream sync (upstream/main `4ad80017f`, merge-base `78c669512`).
- **Evidence rule:** every path, test and script named here exists at the
  baseline (`git show origin/main:<path>`). "none — gap" means there is no
  automated guard today. That is a backlog item, not permission to skip the
  feature.
- **Team roles:** PM = product-manager, UMM = upstream-merge-manager,
  SSE = surrealdb-schema-engineer, BFS = bossfang-feature-steward,
  MR = merge-reviewer.
- **Status values:** `GREEN` means shipped with a guard. `PARTIAL` means shipped,
  but the guard is incomplete or known debt exists. `DEFERRED` means the gap
  was left open on purpose and documented. `DRIFT` means the docs and the code
  disagree.

## Rebrand model (applies to every row)

The three-layer rule comes from `CLAUDE.md` § BossFang Branding and
`.claude/skills/librefang-upstream-merge/references/three-layer-rebrand.md`:

| Layer | Rule |
|---|---|
| Internal (crate, module, type and function names such as `librefang_home()`) | Never rename. Take upstream's version. |
| Boundary (env vars, config keys, on-disk paths) | Additive aliases only. `BOSSFANG_*` is primary and `LIBREFANG_*` is the fallback. The default home stays `~/.librefang/`. |
| Surface (product name, binaries, packages, UA strings, Tauri identity, dashboard chrome) | Full rename. Always take ours in conflicts. |

`librefang-storage` and `librefang-uar-spec` are **path dependencies, not
`[workspace] members`** (`CLAUDE.md` line 163). As a result,
`cargo check --workspace` compiles them only as dependencies of `librefang-api`
and `librefang-kernel`, and `cargo test --workspace` never runs their tests.
Always name them with `-p`.

---

## A. Branding and surface identity

| ID | Feature | Owning paths | Role | Guarding test / audit | Status |
|---|---|---|---|---|---|
| A1 | **Ember palette.** Muted Ember `#E04E28` in light mode, Bright Ember `#FF6A3D` in dark, blush `#F2D6CF`. It replaces upstream's sky blue `#0284c7`/`#38bdf8`. | `crates/librefang-api/dashboard/src/index.css` (`:root` / `:root.dark`), `docs/branding/branding-guide.html`, `.claude/skills/librefang-upstream-merge/references/branding-tokens.md` | BFS | `scripts/enforce-branding.py --check` (colour-token pass over `dashboard/src`, `api/static`, `desktop/frontend`, `desktop/src`); `scripts/test_enforce_branding.py` (unittest classes `ProseReplacementTests`, `AuditTests`, `DashboardProseTests`, `LocaleProseTests`, `LocaleStorageTests`, `FileLevelTests`); `.claude/skills/librefang-upstream-merge/scripts/run-branding-enforce.sh` | GREEN. Not wired into CI: no `.github/workflows/*` step runs `enforce-branding.py --check` (**gap**). |
| A2 | **Logo `boss-libre.png`** in the dashboard sidebar and mobile header, served at `/boss-libre.png`. | `docs/branding/boss-libre.png`, `crates/librefang-api/dashboard/public/boss-libre.png`, `crates/librefang-desktop/frontend/boss-libre.png`, `crates/librefang-api/dashboard/src/App.tsx` (2 `src="/boss-libre.png"` refs), `crates/librefang-api/src/webchat.rs` (`GET /boss-libre.png` handler) | BFS | `enforce-branding.py --check` flags surviving SVG fang glyphs. No test asserts that the `/boss-libre.png` route or the `App.tsx` `<img>` exists (**gap**). | PARTIAL |
| A3 | **Product name "BossFang" in dashboard chrome.** Title "BossFang Dashboard", `manifest.json` name/short_name, `index.html` title/meta, locale prose. | `crates/librefang-api/dashboard/index.html`, `crates/librefang-api/dashboard/public/manifest.json`, `crates/librefang-api/dashboard/src/locales/*.json` | BFS | `enforce-branding.py --check` (dashboard- and locale-prose passes); `scripts/test_enforce_branding.py` | GREEN. Note: `index.html` and `locales/en.json` are **in conflict** in the 2026-09-27 merge. |
| A4 | **CLI and package surface rename.** clap `name = "bossfang"`, banner ">> BossFang Agent OS", npm `@bossfang/sdk`, PyPI `bossfang-sdk` (Python modules stay `librefang_sdk`/`librefang_client`), crates.io `bossfang-sdk`. | `crates/librefang-cli/src/cli.rs`, `crates/librefang-cli/src/ui.rs`, `sdk/javascript/package.json`, `sdk/python/setup.py`, `sdk/rust/Cargo.toml` | BFS | none — gap. `scan-hardcoded-urls.sh` catches `@librefang/sdk` in *new* diffs only. | **DRIFT.** The docs (`three-layer-rebrand.md`, `bossfang-rebrand-completion.md` PR #5) claim dual `[[bin]] bossfang` + `librefang`, but `crates/librefang-cli/Cargo.toml` at the baseline declares only `[[bin]] name = "librefang"`, and git history shows no `bossfang` bin. Either restore the bin or correct the docs (PM decision; **BFS**). Note: `sdk/javascript/package.json` and `sdk/rust/Cargo.toml` are **in conflict** in this merge. |
| A5 | **Content-Type vendor prefix.** Primary `application/vnd.bossfang.v1+json`; the parser still accepts `application/vnd.librefang.*`. | `crates/librefang-api/src/versioning.rs` (`VENDOR_PREFIXES`) | BFS | `versioning.rs` unit tests `test_version_from_bossfang_accept_header*`, `test_requested_version_from_bossfang_accept_header_requires_json_suffix` | GREEN |
| A6 | **Outbound UA strings.** `BossFang/0.1` (skillhub/clawhub), `bossfang-skills/0.1` (marketplace), `bossfang-plugin-{updater,search}/1.0`, `BossFang-Webhook/1.0`. | `crates/librefang-skills/src/{skillhub,clawhub,marketplace}.rs`, `crates/librefang-api/src/routes/plugins*`, webhook sender | BFS | none — gap. No test asserts any UA string. | PARTIAL |
| A7 | **Release, deploy and publish surface.** `bossfang-<target>` artifacts, `brew install bossfang`, Cloudflare Pages projects `bossfang` and `bossfang-docs`. | `.github/workflows/release.yml`, `release-cli.yml`, `release-desktop.yml`, `deploy-web.yml` (`--project-name=bossfang`), `deploy-docs.yml` (`--project-name=bossfang-docs`) | UMM | none — gap. The only check is manual review under `CLAUDE.md` conflict rules. | PARTIAL. Note: `release.yml` and `release-cli.yml` are **in conflict** in this merge, and `release-desktop.yml` has no BossFang/GQAdonis token at all. |
| A8 | **Dashboard API-key storage key** `bossfang-api-key`, with read-legacy-then-migrate from `librefang-api-key`. | `crates/librefang-api/dashboard/src/api.ts` | BFS | `crates/librefang-api/dashboard/src/api.test.ts` (4 `bossfang-api-key` assertions) | GREEN |

## B. Boundary aliases (`BOSSFANG_*` primary, `LIBREFANG_*` fallback)

| ID | Alias | Resolution site | Role | Guarding test | Status |
|---|---|---|---|---|---|
| B1 | `BOSSFANG_HOME` | `crates/librefang-kernel/src/config.rs` `librefang_home()` | BFS | `librefang_home_prefers_bossfang_home_over_librefang_home`, `librefang_home_falls_back_to_librefang_home_when_bossfang_unset` (same file) | GREEN |
| B2 | `BOSSFANG_VAULT_KEY` | `crates/librefang-extensions/src/vault.rs` (`VAULT_KEY_ENV`), `crates/librefang-cli/src/doctor.rs` | BFS | `doctor.rs` tests `vault_key_*` via `with_vault_key` (clear `BOSSFANG_VAULT_KEY`). No precedence test in `vault.rs` (**gap**). | PARTIAL. `doctor.rs` and `vault.rs` are touched by upstream; `doctor.rs` is **in conflict**. |
| B3 | `BOSSFANG_DASHBOARD_EMBEDDED_ONLY` (default **true** in BossFang) | `crates/librefang-api/src/webchat.rs` `embedded_only_mode()` | BFS | **Gap: the tests guard the wrong function.** `embedded_only_unset_is_false` and its siblings exercise the `#[cfg(test)] is_embedded_only_value()` helper, which returns `false` when unset. The production `embedded_only_mode()` returns `true` when unset. Nothing tests the BossFang default or the alias precedence. | PARTIAL |
| B4 | `BOSSFANG_REGISTRY_PUBKEY`, `BOSSFANG_REGISTRY_PUBKEY_URL` | `crates/librefang-runtime/src/plugin_manager/registry.rs` | BFS | none — gap | PARTIAL |
| B5 | `BOSSFANG_INSTALL_DIR`, `BOSSFANG_VERSION`, `BOSSFANG_AUTO_START`, `BOSSFANG_INSTALLER_SOURCE_ONLY`, `BOSSFANG_PREFERRED_VERSION` | `web/public/install.sh`, `scripts/workers/install-sh.ts` | BFS | `scripts/tests/install_sh_test.sh`, `scripts/tests/install-redirect-workers.mjs` (verify they cover the aliases; not confirmed) | PARTIAL |
| B6 | `BOSSFANG_CONFIG_BOOTSTRAP_REVISION` (BossFang-only, no LibreFang twin) | `crates/librefang-api/src/config_store_overlay.rs` `BOOTSTRAP_REVISION_ENV` | BFS | `config_store_overlay_test.rs::seed_revision_bump_overrides_runtime_row` | GREEN |

## C. SurrealDB storage

| ID | Feature | Owning paths | Role | Guarding test / audit | Status |
|---|---|---|---|---|---|
| C1 | **`librefang-storage` crate.** SurrealDB 3.x is the default operational store. Features: `surreal-backend` (default), `sqlite-backend` (opt-in legacy). | `crates/librefang-storage/**` | SSE | `crates/librefang-storage/tests/surreal_migration_invariants_test.rs`; unit tests in `src/config.rs` (6) and `src/pool.rs` (2); CI `integration-coverage.yml` "Run Surreal storage/vector invariants" | GREEN |
| C2 | **33 `.surql` migrations** (`001_audit_entries` … `033_knowledge_graph_peer_scope`), registered in `migrations/mod.rs` with a SHA256 drift runner (`MigrationError::ChecksumDrift`). **The next free number is 034.** | `crates/librefang-storage/src/migrations/sql/*.surql`, `migrations/mod.rs`, `migrations/runner.rs` | SSE | `surreal_migration_invariants_test.rs::operational_migrations_are_ordered_and_surreal_3_flexible_syntax_safe`. **Drift detection itself has no test** (`runner.rs` has zero `#[test]`) (**gap**). | PARTIAL. Parity debt: see C8. |
| C3 | **Embedded RocksDB and remote ws/wss/http/https backends.** `StorageBackendKind::{Embedded, Remote}`, `RemoteSurrealConfig` (stores `password_env`, never the password). Operational and memory databases are kept separate. | `crates/librefang-storage/src/config.rs`, `src/pool.rs` | SSE | `config.rs::remote_overrides_namespace_database`, `round_trip_remote_through_{toml,json}`; `surreal_migration_invariants_test.rs::memory_storage_config_separates_{embedded_operational_and_memory_paths,remote_database}`. **No test connects to a live remote SurrealDB.** There is no `BOSSFANG_TEST_SURREAL_URL` (or similar) gate anywhere in `crates/` (**gap**). | PARTIAL. Remote mode is config-tested only. |
| C4 | **Surreal backends outside storage.** Kernel: approvals, TOTP used-codes. Runtime: audit, trace. Trait shells in `storage_backends.rs`. | `crates/librefang-kernel/src/backends/surreal_{approval,totp_used_codes}.rs`, `crates/librefang-kernel/src/storage_backends.rs`, `crates/librefang-runtime/src/backends/surreal_{audit,trace}.rs`, `crates/librefang-runtime/src/storage_backends.rs`, `crates/librefang-kernel/tests/vector_backend_boot_test.rs` | SSE | `surreal_approval.rs` (2 tests), `surreal_audit.rs` (4), `surreal_trace.rs` (2), `vector_backend_boot_test.rs` (4). `surreal_totp_used_codes.rs`: none — gap. | PARTIAL |
| C5 | **`sqlite → surreal` import** (`librefang storage migrate [--dry-run]`). The live importer copies 13 tables: audit_entries, hook_traces, circuit_breaker_states, totp_lockout, agents, sessions, canonical_sessions, kv_store, task_queue, usage_events, paired_devices, prompt_versions, prompt_experiments. | `crates/librefang-storage/src/migrate/{mod,sqlite_plan,sqlite_to_surreal}.rs`, `crates/librefang-cli/src/commands/storage.rs`, `crates/librefang-api/src/routes/storage.rs` | SSE | `sqlite_to_surreal.rs::{dry_run_counts_rows_without_writing, live_run_copies_rows_and_is_idempotent}`, which compile only with `--features sqlite-backend,surreal-backend`; `commands/storage.rs` (3 tests) | **DRIFT / PARTIAL.** (a) `sqlite_plan.rs::TABLES` lists only 5 tables while claiming to be "the same list" as the importer's 13, so `--dry-run` under-reports. (b) The importer does not cover `workflow_runs`, `group_roster`, `pending_approvals`, `approval_audit`, `idempotency_keys`, `kg_*`, `totp_used_codes`, `oauth_used_nonces`, or any upstream table added after v37. |
| C6 | **`surreal-memory` substrate.** Workspace dependency `surreal-memory` pinned by `rev = b7e2093…` (surreal-memory itself pins `surrealdb = "=3.3.0"`), `embedded` feature. Twelve `surreal*.rs` backend files plus `backend.rs`. | `crates/librefang-memory/src/backends/surreal*.rs`, `crates/librefang-memory/src/backend.rs`, `crates/librefang-memory/Cargo.toml` (`surreal-backend` default), workspace `Cargo.toml` lines ~120–135 | SSE | `crates/librefang-memory/tests/surreal_vector_integration_test.rs` (4, in CI, including the embedded shared-storage open, the zero-dimension rejection and a store/search round trip); `shared.rs` (2, embedding-dimension bridge); `surreal_semantic.rs` (8), `surreal.rs` (3), `surreal_knowledge.rs` (1). **No tests** in `surreal_{device,kv,proactive,prompt,session,task,usage}.rs` (**gap**). | PARTIAL. **DRIFT:** `CLAUDE.md` and `AGENTS.md` still say "9 backend files" and "24 migrations" (the `branch = "main"` claim was corrected in the 2026-09-27 SurrealDB 3.3.0 upgrade). The baseline is rev-pinned, has 12 backend files and 33 migrations. **Not wired into the kernel:** boot has no `vector_backend = "surreal"` arm, `SurrealSemanticBackend`'s KNN/forget/count queries use the operational session instead of the memory store, and its writes are rejected by surreal-memory's non-FLEXIBLE `memory.metadata` (see `docs/upstream-merges/2026-09-27.md`). |
| C7 | **Shared SurrealDB version pin** `surrealdb`, `surrealdb-core` and `surrealdb-types`, all `=3.3.0`, kept aligned with surreal-memory (UAR is a sidecar and no longer linked in-process). `librefang-storage` lists core and types as direct deps so the pins are load-bearing. | workspace `Cargo.toml`, `crates/librefang-storage/Cargo.toml` | SSE / UMM | none — gap. No script asserts that the pins move together; the 2026-09-27 upgrade checked `cargo tree -i` by hand (one version each). | PARTIAL. |
| C8 | **SQLite ↔ Surreal schema parity.** Every upstream `migrate_vNN` must have a `.surql` twin. | `crates/librefang-memory/src/migration.rs` (upstream-owned) vs `crates/librefang-storage/src/migrations/sql/` | SSE | `.claude/skills/librefang-upstream-merge/scripts/scan-new-schema.sh` (diff-based; only sees *new* hits) | **PARTIAL: pre-existing parity debt.** The fork was at SQLite `SCHEMA_VERSION = 55`, but the newest mirrored step is v47 (`033_knowledge_graph_peer_scope`). v48–v55 have no `.surql` twin: `memories.last_decayed_at` (v48), `workflow_runs.owner_agent_id` and `usage_events.billed_agent_id` (v49), `memories_fts` (v50, FTS), `memories.embedding_model` (v51), `group_roster.source` (v52), `ephemeral_runs` (v53), `agents.parent_id`/`parent_recorded` (v54), `template_versions` (v55). The affected Surreal tables are `SCHEMAFULL`, so values for undefined fields do not persist. |

## D. Universal Agent Runtime (UAR)

| ID | Feature | Owning paths | Role | Guarding test / audit | Status |
|---|---|---|---|---|---|
| D1 | **`UarDriver`**, an HTTP + SSE driver to a supervised UAR sidecar (provider `"uar"`, `provider/model` addressing). Opt-in `uar-driver` feature, forwarded `cli → api → kernel → runtime → llm-drivers`. It is absent from the default graph. | `crates/librefang-llm-drivers/src/drivers/uar.rs`, `drivers/mod.rs` (`#[cfg(feature = "uar-driver")]`), `uar-driver` feature in every chain crate's `Cargo.toml` | BFS | `uar.rs` (21 unit tests, which run only with `--features uar-driver`); CI `ci.yml` job `uar-driver` (feature-forwarding `cargo tree` check, absent-from-default check, `cargo check`/`clippy -p librefang-llm-drivers --features uar-driver`) | GREEN. `crates/librefang-runtime/Cargo.toml` is **in conflict**; the chain must survive. |
| D2 | **`librefang-uar-spec`**: UAR-AGENT-MD parser and the `AgentManifest` translator. | `crates/librefang-uar-spec/src/{lib,types,parser,translator,error}.rs` | BFS | `parser.rs` (3), `translator.rs` (2). Not run by `cargo test --workspace` (non-member). | GREEN, but **at risk this sync** (see sync criteria §3.2). `translator.rs` builds `ModelConfig { … }` exhaustively, and upstream adds 5 fields. |
| D3 | **UAR sidecar supervision, routes and A2A.** `provision_uar_namespace()`, the dashboard UAR pages and the cucumber feature. | `crates/librefang-channels/src/uar_sidecar.rs`, `crates/librefang-api/src/routes/{uar,uar_supervisor,storage}.rs`, `crates/librefang-storage/src/provision.rs`, `crates/librefang-api/dashboard/src/lib/{queries,mutations}/uar.ts`, `crates/librefang-api/dashboard/e2e/cucumber/uar-sidecar.{feature,steps.cjs}` | BFS | `uar_sidecar.rs` (13), `crates/librefang-api/tests/uar_a2a_test.rs` (8), `crates/librefang-api/tests/uar_supervisor_integration.rs` (5), `uar-sidecar.feature`. `provision.rs` and `routes/uar*.rs`: none — gap. | GREEN (phase-10 `progress.json`: C-001…C-008 all DONE; `current-waypoint.md` still says C006–C008 pending, which is **DRIFT**) |

## E. SurrealDB config store (phase 9)

| ID | Feature | Owning paths | Role | Guarding test / audit | Status |
|---|---|---|---|---|---|
| E1 | **Config store table and API.** `config_store` table, `ConfigSource::{Bootstrap, Runtime}`, `content_hash`, bootstrap revision. | `crates/librefang-storage/src/config_store.rs`, `crates/librefang-storage/src/migrations/sql/031_config_store.surql` | SSE | `config_store.rs` unit tests (`round_trips_upsert_get_list_delete`, `content_hash_is_object_key_order_independent`, `config_source_round_trips`, `list_is_sorted_by_key_regardless_of_insertion_order`) | GREEN |
| E2 | **Seed → overlay → write** for `mcp_servers` and `default_model` at boot, in the order seed → overlay → MCP connect. | `crates/librefang-api/src/config_store_overlay.rs`, `crates/librefang-api/src/server.rs` (calls at `run_daemon` ~L2321–2324), `crates/librefang-api/src/routes/skills/mcp.rs` (`write_mcp_servers`), `crates/librefang-api/src/routes/providers.rs` (`write_default_model`) | BFS | `crates/librefang-api/tests/config_store_overlay_test.rs`: `overlay_replaces_effective_mcp_servers_from_db`, `runtime_write_persists_and_survives_restart`, `seed_*` (4), `default_model_*` (2); `crates/librefang-api/tests/mcp_http_crud_test.rs` | GREEN. `server.rs` is **in conflict** in this merge. |
| E3 | **Config reload re-applies the store.** `POST /api/config/reload` re-runs seed and all three overlays. | `crates/librefang-api/src/routes/config/manage.rs` (~L1075–1078) | BFS | `config_store_overlay_test.rs::reload_reresolve_preserves_runtime_over_bootstrap` | GREEN. `manage.rs` and `crates/librefang-kernel/src/config_reload.rs` are **in conflict** (see sync criteria §5.2). |
| E4 | **Trusted-section apply.** `config_overrides` for `TRUSTED_SECTION_KEYS = ["budget", "memory", "proactive_memory", "sidecar_channels"]`, written only by the dedicated budget, memory and channels handlers. The generic `config_set` path stays restricted to `is_writable_config_path`. | `config_store_overlay.rs` (`resolve_config_with_overrides`, `read/write_config_overrides`, `overlay_config_overrides`), `crates/librefang-api/src/routes/{budget,memory,channels}.rs`, `routes/config/manage.rs` (~L1749), `routes/config/mod.rs` (`is_writable_config_path`) | BFS | `config_store_overlay_test.rs`: `config_overrides_resolve_applies_allowlisted_and_skips_blocked`, `config_overrides_store_round_trip`, `config_overrides_overlay_applies_to_live_kernel`, `budget_section_override_resolves_into_config`, `trusted_section_applies_blocked_and_unknown_are_skipped`, `memory_and_proactive_overrides_resolve_into_config`, `sidecar_channels_override_resolves_into_config` | GREEN. The phase-9 reflection lists C-005c (generic `config_set` into the store) as DEFERRED on purpose. |
| E5 | **Secret-value invariant.** No secret value ever enters SurrealDB: only env-var names (`*_env`, `password_env`) are stored, and credential paths are skipped with a WARN. | same as E4, plus `crates/librefang-storage/src/config.rs` (`password_env`), module docs in `config_store.rs` ("NOT a secrets store") | BFS | Indirect: `trusted_section_applies_blocked_and_unknown_are_skipped`. There is **no test that scans stored rows for a secret value** (for example, "write via the channels handler with a token and assert the DB row holds only `token_env`") (**gap**). | PARTIAL |

## F. Tauri desktop identity and updater

| ID | Feature | Owning paths | Role | Guarding test / audit | Status |
|---|---|---|---|---|---|
| F1 | **Desktop identity.** `productName: "BossFang"`, `identifier: "ai.bossfang.desktop"`, mobile `ai.bossfang.app`, BossFang icons. | `crates/librefang-desktop/tauri.conf.json`, `tauri.ios.conf.json`, `tauri.android.conf.json`, `crates/librefang-desktop/icons/**` | BFS | `.claude/skills/librefang-upstream-merge/scripts/audit-tauri-desktop.sh` (productName, identifiers, icon presence and size only, not icon identity) | GREEN. `tauri.conf.json` is **in conflict** in this merge. |
| F2 | **Updater endpoint and minisign key.** `plugins.updater.endpoints[0] = https://github.com/GQAdonis/librefang/releases/latest/download/latest.json`; `pubkey` key ID `E329A6B2863F1707` (not upstream's `BC91908BD3F1520D`). Repo secrets `TAURI_SIGNING_PRIVATE_KEY[_PASSWORD]`. | `crates/librefang-desktop/tauri.conf.json` (`plugins.updater`) | BFS | `audit-tauri-desktop.sh` (endpoint host and decoded key ID) | GREEN |
| F3 | **Desktop install paths and messages** (M1 of the rebrand roadmap). | `crates/librefang-cli/src/desktop_install.rs` | BFS | none — gap | Status unverified. Tracked in `docs/architecture/bossfang-rebrand-completion.md` M1. |

## G. Origin repointing knobs

Reference: `.claude/skills/librefang-upstream-merge/references/origin-knobs.md`. Audit: `.claude/skills/librefang-upstream-merge/scripts/scan-hardcoded-urls.sh`.

| ID | Knob | Owning paths | Role | Guarding test | Status |
|---|---|---|---|---|---|
| G1 | **Registry source.** `[registry]` defaults to `GQAdonis/librefang-registry` (`REGISTRY_REPO_PATH`); the Codeberg mirror is GQAdonis too. | `crates/librefang-runtime/src/registry_sync.rs`, `crates/librefang-types/src/config/types.rs` (~L6543) | BFS | `registry_sync.rs::registry_urls_none_matches_github_defaults`, `registry_urls_codeberg_host`, `registry_urls_trims_trailing_slash`, `registry_urls_explicit_github_host_uses_github_scheme` | GREEN. `origin-knobs.md` still describes `default_registry_base_url()`, but the field is now `Option` and resolves in `registry_sync.rs` (doc **DRIFT**). |
| G2 | **Skills marketplace org.** `MarketplaceConfig.github_org` defaults to `"GQAdonis"`. | `crates/librefang-skills/src/marketplace.rs` | BFS | `marketplace.rs::test_default_config`, `test_client_creation` (assert `"GQAdonis"`) | GREEN at baseline. **At risk this sync:** upstream #8478/#8179 adds `DEFAULT_MARKETPLACE_ORG = "librefang-skills"` plus `from_promotion()`. See sync criteria §5.1. The file is **in conflict**. |
| G3 | **Skill-promotion registry repo.** `registry_pr::DEFAULT_REGISTRY_REPO`. | `crates/librefang-skills/src/registry_pr.rs` | PM → BFS | none | **Not repointed.** It is still `librefang/librefang-registry` at the baseline, and upstream now also makes the target configurable via `[skills.promotion]`. **Triage decision needed** (see sync criteria §6). |
| G4 | **Dashboard release tarball.** `https://github.com/GQAdonis/librefang/releases/latest/download/dashboard-dist.tar.gz`. The path is dead by default because of B3. | `crates/librefang-api/src/webchat.rs` (~L547) | BFS | `webchat.rs::resolve_dashboard_skips_runtime_dir_in_embedded_only_mode`. The URL itself is untested (**gap**). | PARTIAL |
| G5 | **Tauri updater endpoint** | see F2 | BFS | `audit-tauri-desktop.sh` | GREEN |
| G6 | **Plugin-registry trust root.** Still upstream's `stats.librefang.ai`; operators can override via B4. | `crates/librefang-runtime/src/plugin_manager/registry.rs`, `web/workers/*/wrangler.toml`, `web/public/_worker.js` | BFS | `scripts/check-pubkey-lockstep.sh` (CI `ci.yml`), which only checks lockstep between the four sites and not ownership | DEFERRED on purpose (`origin-knobs.md`, rebrand roadmap M5) |

## H. Other BossFang-exclusive capabilities

| ID | Feature | Owning paths | Role | Guarding test | Status |
|---|---|---|---|---|---|
| H1 | **WASI Component-Model plugin host** (phases 4–8). `wasmtime-wasi` and `wasmtime-wasi-http` pinned `=47.0.3`, deny-by-default `WasiCtx`, AOT `.cwasm` cache, polyglot plugin examples. | workspace `Cargo.toml` (wasmtime-wasi pins), `crates/librefang-runtime/Cargo.toml`, `crates/librefang-runtime/src/{sandbox_component,wit_host,aot_cache}.rs`, `crates/librefang-runtime/tests/plugin_example_*.rs`, `crates/librefang-runtime/tests/support/plugin_example_harness.rs`, `examples/plugins/**`, `xtask/src/plugins.rs`, `scripts/test-wasm-toolchain.sh` | BFS | `sandbox_component.rs` (8), `wit_host.rs` (17), `aot_cache.rs` (7), `plugin_example_{c_noop,go_env_greet,js_kv_counter,python_hello_time,rust_fs_cat}.rs` | GREEN. It was **missing from `CLAUDE.md`'s preserved-features list** (doc gap). `crates/librefang-runtime/Cargo.toml` is **in conflict**. |
| H2 | **Upstream-merge tooling and steward team.** | `.claude/skills/librefang-upstream-merge/**`, `.agent-team/bossfang-stewards/team.json`, `.claude/agents/*.md` | PM / UMM | `preflight.sh`; the four audit scripts are the guards | GREEN |
| H3 | **C08 channel routing and authorized observer copies (planned).** Durable provider occurrence and handler affinity precede Gate/Fabric/UAR cross-host observer adoption; replay is never a channel post. | `openspec/changes/afc-c08-channel-routing/**`; planned `crates/librefang-channels/src/{router,bridge,thread_ownership,types,sidecar}.rs`, `crates/librefang-storage/src/**` | PM → BFS / SSE | Planned single real-host C08 integration gate in `openspec/changes/afc-c08-channel-routing/design.md`; no implementation receipt yet | PLANNED. C07 local UAR observer gate does not certify channel or cross-host delivery. D-GATE and D-FRF provider checkpoints remain unadopted. |

---

## Gap register (features without an adequate automated guard)

| # | Gap | Ledger row | Proposed owner |
|---|---|---|---|
| 1 | No remote-mode (ws/http) SurrealDB test anywhere; no `BOSSFANG_TEST_SURREAL_URL`-style gate. | C3, C2 | SSE |
| 2 | Migration checksum-drift detection is untested. | C2 | SSE |
| 3 | SQLite parity debt v48–v55 (8 schema steps with no `.surql`). | C8 | SSE |
| 4 | Importer dry-run list (5) ≠ live list (13); importer misses workflow_runs, group_roster, approvals, kg_*, and more. | C5 | SSE |
| 5 | 7 of 12 surreal memory backends have no unit tests. | C6 | SSE |
| 6 | `surreal_totp_used_codes.rs`, `provision.rs`, `routes/uar*.rs` untested. | C4, D3 | SSE / BFS |
| 7 | Secret-value invariant has no row-scanning test. | E5 | BFS |
| 8 | Embedded-only default (`true`) is untested; the test helper encodes the opposite default. | B3 | BFS |
| 9 | No test for `BOSSFANG_VAULT_KEY` precedence in `vault.rs`, or for `BOSSFANG_REGISTRY_PUBKEY*`. | B2, B4 | BFS |
| 10 | `enforce-branding.py --check` and `audit-tauri-desktop.sh` are not wired into CI. | A1, F1 | UMM |
| 11 | No guard for UA strings, CLI surface, logo route, or release-workflow naming. | A2, A4, A6, A7 | BFS |
| 12 | `surrealdb`/`surrealdb-core` pin-together has no script. | C7 | SSE |
| 13 | `[[bin]] bossfang` claimed by docs but absent. | A4 | PM decision → BFS |
| 14 | Doc drift: `CLAUDE.md`/`AGENTS.md` ("24 migrations", "9 backend files", `branch = "main"`), `origin-knobs.md` (`default_registry_base_url`), `current-waypoint.md` (phase 10 pending). | C6, G1, D3 | PM (docs) / owners |

## Upstream-feature triage decisions

Record every adopt / extend / diverge decision here. The per-sync rationale is
in the matching sync-criteria file.

| Date | Upstream feature | Decision | Ledger impact |
|---|---|---|---|
| 2026-09-27 | Agent manifest version history (`manifest_versions`, SQLite v58/v60) | **Extend**: add a SurrealDB table (migration) now, and a Surreal-backed version store when upstream lands the feature proper | New row under C when implemented |
| 2026-09-27 | Agent-type template versions (`template_versions`, v55/v60, `template_version_store.rs`) | **Extend**: Surreal table plus a Surreal-backed `TemplateVersionStore` | New row under C |
| 2026-09-27 | Session parentage (`sessions.parent_session_id`, v61, #7752) | **Adopt + mirror**: `.surql` field and index; `surreal_session.rs` must persist it | C6 |
| 2026-09-27 | Persisted `workflow_runs.total_steps` (v56/v59) | **Adopt + mirror** | C8 |
| 2026-09-27 | `memories_fts` WHEN-guarded trigger (v57) | **Diverge (N/A)**: SQLite FTS5 trigger only; Surreal search uses its own analyzer (`023_sessions_search_analyzer`). Record an explicit no-op. | C8 |
| 2026-09-27 | Configurable skill-publish GitHub host/org (#8478, #8179) | **Adopt, re-defaulted to GQAdonis** | G2, G3 |
