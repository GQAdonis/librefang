ASSESSMENT: phase-12-sync-uar-refresh-dot-facade
Project: BossFang
Date: 2026-10-17
Codebase baseline: `origin/main` at `fd7eae85f` (PR #172 merge); `upstream/main` at `dfd11bc4f`; merge-base `b5c0803d4` (2026-09-27).
Cross-tool progress: none. The phase opened today with 0/0 changes.

Method: three read-only role agents ran in parallel against a linked worktree of `fd7eae85f` (upstream-merge-manager for G1, bossfang-feature-steward for G2, product-manager for G3).
The orchestrator spot-checked the load-bearing claims, each marked "verified" below.
Code status comes from reading the code and grep, not from running tests, except the build check noted under BUILD HEALTH.

## Stage-gate note (runtime authority)

`kbd_stage_gate assess` failed because the canonical `prometheus kbd` journal (prometheus 1.11.3) still holds the July phase-10 run at revision 4.
With operator approval, `phase create` was issued for phase-11 and phase-12.
The journal recorded both as `PhaseDefined` events r5 and r6, but the reducer does not apply them, so every follow-up `phase transition` / `phase activate` fails with "phase … was not found".
The runtime's projection also overwrote `current-waypoint.json` / `position.json` with its July state (phase-10, C-URT-001), and those files were restored from git.
The journal has an unresolved deterministic lifecycle conflict (`conflict:f488818…`, two identical `RunInitialized` events from replicas `2c7dc7e9` and `0ed6c4bc`), and its frontier stops at lamport 2 per replica.
This assessment is therefore recorded in projection-only mode, with the gate bypass stated here.
Repairing the journal is an operator or tooling task outside this phase's goals (see Open Questions, Q1).

## Lessons applied (from prior-context.md)

- "External integrations require at least one real-service test… run at least one test against the real service before claiming the work is done."
  G2's contract check against UAR `1.1.0` is static (source) only; the assessment treats the live probe as an unmet acceptance item, not an assumed pass.
- "Verify main includes PR final head after merge."
  The G1 sync PR and every G3 PR must confirm the final head SHA is an ancestor of `origin/main` before KBD records them as done.
- "Default MVP verification demos to agent-run execution with recorded authorization."
  For G3's vertical fixtures, plan agent-run verification against deterministic provider fixtures.
  The live daemon and live LLM stay human-only per `CLAUDE.md`.
- "Collect zero-question execution approvals at dispatch" and "Operator controls PR merges."
  Collect merge and outward-facing approvals once at dispatch; the operator merges.

Knowledge gaps: none recorded in `prior-context.md`.

IMPLEMENTATION STATUS

### G1 — Upstream sync

- Divergence: PARTIAL (not started).
  103 upstream commits are missing (633 files, +85,562/−12,589); origin is 861 commits ahead of the merge-base.
  The last sync was PR #136 on 2026-09-27 (`docs/upstream-merges/2026-09-27.md`).
- Conflicts: a `git merge-tree` dry run shows 28 conflicting files.
  - Hard: `crates/librefang-memory/src/{migration,proactive,semantic,substrate}.rs` (Surreal dual-path code), `routes/task_queue.rs`, `routes/config/manage.rs`, `channel_bridge.rs`, `channels/src/bridge.rs`, `kernel/messaging.rs`, `runtime/host_functions.rs`.
  - Mechanical: dashboard `api.ts`, `AgentManifestForm.tsx`, `Avatar.tsx`, `mutations/agents.ts`, `AgentsPage.tsx`, five locales, `pnpm-lock.yaml`, `Cargo.lock`, `ci.yml`, `AGENTS.md`, `deny.toml`, SDK manifests, `tauri.conf.json` (version only).
- Hard build break, verified.
  Upstream adds `CompletionResponse.text_synthesized_from_thinking: bool` (upstream `librefang-llm-driver/src/lib.rs:471`).
  `UarDriver` builds the struct literal without it (`crates/librefang-llm-drivers/src/drivers/uar.rs:1176-1183`).
  This belongs to bossfang-feature-steward inside the merge branch.
- SQLite schema-version collision, verified.
  Origin has `SCHEMA_VERSION = 62`, and its v62 is BossFang's own workflow_runs rebuild.
  Upstream has `SCHEMA_VERSION = 63` (v62 adds `task_queue.timeout_secs`, v63 adds `ephemeral_runs.truncated`) and includes renumber-repair logic keyed on stamp 61.
  This needs careful renumbering on the legacy SQLite path.
- SurrealDB parity owed (surrealdb-schema-engineer):
  - migration 050: `task_queue.timeout_secs`
  - migration 051: `ephemeral_runs.truncated`
  - the latest on `main` is `049_json_value_columns.surql` (verified)
  - a Surreal backend for the new r2d2-only `manifest_version_store.rs` (#8504); its table already exists as `035_manifest_versions.surql`
- Dependencies:
  - agent-client-protocol `=2.2.0` → `=3.3.0` hits `librefang-acp`
  - ed25519/x25519-dalek 2 → 3
  - zip 8 → 9
  - no surrealdb, surreal-memory, rusqlite or r2d2 changes
- Branding: low risk.
  No changes to `index.css`, `manifest.json`, `index.html` or icons, and the deploy workflow `--project-name` is untouched.
  `release.yml` grows by 97 lines (codesign fingerprint check), so re-run `scripts/audit-tauri-desktop.sh`.
  No new runtime `github.com/librefang` URLs.
- Upstream does not mention UAR.

### G2 — UAR references to the latest GHCR image

- Load-bearing image references: none exist.
  BossFang no longer bundles or pins UAR: `Dockerfile:343` is a comment, and no k8s, compose, CI or tauri file names a UAR image.
  The G2 goal text assumed pins to move; in practice G2 means "record the target and fix stale prose".
- Latest published image, verified (anonymous registry `HEAD` returned the same digest):
  - `ghcr.io/prometheus-ags/universal-agent-runtime:1.1.0`, also tagged `latest` and `sha-d815ef72…`
  - `@sha256:064f5004fb3ba76506abce5cf81285b2a8aa3e54fa5a22e2c2bfc97b1211e43b`
  - OCI index created 2026-10-15T18:37Z, platforms linux/amd64 and linux/arm64
  - UAR `main` HEAD `91a091d6` has no image, but its diff from `d815ef72` touches docs and tests only, with no `src`, `Cargo.toml` or `Dockerfile` changes
  - the old `ghcr.io/gqadonis/universal-agent-runtime` (newest `f45941bb`, 2026-08-01) is superseded
- Contract fit: PARTIAL (static only).
  BossFang requires:
  - `/readyz`
  - `/api/uar/capabilities` with profile `uar.service-instance/1` and `instance` / `endpoints` / `ownership` / `placement` / `capabilities[]`
  - `POST /api/uar/compatibility`
  - capabilities `service_instance_placement_v1` (always) plus `full_harness_delegation_v1` and `tool_admission_v2` (full runs)
  - `/api/models`, `/api/chat/completion`, `/api/uar/full-harness/v1/*`, `/api/uar/channel-observers/v1/subscriptions`

  UAR source at `d815ef72` advertises and implements all three capabilities and registers every route (`src/uar/api/capabilities.rs:93-123`, `src/server.rs:1704-1791`).
  Not verified: the live JSON shape of `capabilities` and `effectiveBinding` against a running `1.1.0`.
- Stale prose to fix:
  - `crates/librefang-cli/Cargo.toml:46` and `crates/librefang-kernel/Cargo.toml:83` still claim `uar-driver` reaches `dep:universal-agent-runtime`
  - `.github/workflows/docker-publish.yml:11` (the kreuzberg-via-UAR comment)
  - `.claude/skills/librefang-upstream-merge/SKILL.md`, whose gotcha still names the deleted `GQAdonis/universal-agent-runtime` fork and its npm `build.rs`
- Historical pins in `.kbd-orchestrator/phases/phase-10*`, `phase-11*`, `.refiner/` and `docs/research/` are records and stay as written.

### G3 — Issue #156, the KnowMe/dot v1 facade

- Tracker state, verified: #156 is CLOSED as COMPLETED (2026-10-17T15:33:30Z), two minutes after PR #172 cross-referenced it.
  The issue's own close rule requires WP1–WP6 and acceptance rows A01–A20, and none of that has landed.
  #168 ("[Tracking] KnowMe private dot: verified capability and meeting-mode delivery") is OPEN, with children #157–#161.
- Status by work package:

| WP | Scope | Status | Key evidence |
|---|---|---|---|
| WP1 | Owner/conversation facade (K08), owner binding, capability negotiation | MISSING (binding, routes, schemas); PARTIAL (principal, reply-target scope) | No `dot` / `owner_binding` / `km.*` code in `crates/`. `AuthenticatedApiUser::owner_principal()` at `middleware.rs:221`. Synthetic root has no owner (`:218`). `ReplyTargetScope` at `librefang-storage/src/channel_actions.rs:43`. Channel `send_reaction` defaults to `Ok(())` (`channels/src/types.rs:886`) and `send_in_thread` falls back to `send` (`:959`). |
| WP2 | Route closure under the dot profile; effect binding; intent before I/O | MISSING (inventory, legacy closure); PARTIAL (Gate, channel authority); EXISTS (selected UAR jobs intent/reconcile) | The native channel sender still sends directly (`kernel/handles/channel_sender.rs:177-215`). `uar_harness/lifecycle.rs:8,16`. |
| WP3 | Owner/workspace scoping of workflows and task queue | PARTIAL | `Workflow.owner` is "recorded, not enforced" (`kernel/src/workflow.rs`). `list_workflows` takes no principal (`routes/workflows/workflow.rs:138`). `task_queue_list` passes `None` (`routes/task_queue.rs:135`). |
| WP4 | Task projection (K07), receipt normalization, reconciliation, cancellation | MISSING (K07 projection); PARTIAL (receipts, reconcile, cancel); EXISTS (UAR event cursors) | `DeliveryStatus` has only 4 states (`types.rs:605`). `UarDelegatedRunProjection` is raw run state (`types/src/uar_run.rs:152`). |
| WP5 | Durable continuations, wakes, owner notification gate | MISSING (continuations, notification gate); PARTIAL (cron, restart restore) | `kernel/task_registry.rs` is an in-memory `HashMap`. `notify_owner_bg` picks the first owner (`kernel/assistant_routing.rs:23-57`). |
| WP6 | Role profiles, team/worker adapters, skill lock, approval preview, verticals, packaging | MISSING except PARTIAL role profiles (`librefang-uar-spec`, `docs/bossfang/knowme-dot/agent-definitions.md`, #161) | No depth, fan-out or budget limits outside channel actions; no skill lock manifest. Dashboard views not inspected. |

- Scale: about 15 PR-sized changes, at least 4 of which need SurrealDB migrations (owner binding and conversation references, task projection and receipts, continuations, notification records).
  This is by far the largest goal, and most of its surfaces are the same high-churn upstream files G1 conflicts on (`task_queue.rs`, workflow routes, channels, kernel messaging).
- Belongs in UAR, not BossFang, and is consumed here with negative fixtures only:
  - terminal EOF, MCP `isError` and fragmented Anthropic SSE handling
  - tenant-qualified credential namespaces
  - full-harness restart recovery (`process_ephemeral`, UAR #380)
  - run-scoped team and mailbox APIs
- `docs/bossfang/knowme-dot/coverage-audit.md` is mostly accurate, but it is pinned to `a2a6f89` and says it "tested nothing".

CROSS-TOOL PROGRESS
- NONE: no cross-tool activity recorded for this phase.

SPEC GAP SUMMARY
- `docs/bossfang/feature-ledger.md` has no KnowMe/dot row; a ledger entry and dot-profile spec are owed before G3 code (product-manager).
- No OpenSpec change exists yet for any goal.
- `CLAUDE.md` is stale in three places:
  - it says "24 SurrealQL migrations" while the tree has 049
  - its "Agent Fabric Convergence phase gate" points at a phase closed on 2026-10-14
  - its UAR section still references `uar-driver` → UAR dependency chains only as history (accurate), but the Cargo.toml comments contradict it (see G2)

BUILD HEALTH
- build check: FAIL — `cargo check --workspace --lib` exits 101 on `fd7eae85f` (see BUILD HEALTH addendum); `cargo check -p librefang-storage -p librefang-uar-spec` PASS.
- known violations: post-merge build break confirmed by reading (G1, `uar.rs:1176`).
- test coverage: PARTIAL.
  The UAR driver has 21 wiremock contract tests plus 8 presentation tests (`--features uar-driver`).
  Owner-scope suites cover agents, triggers and cron only (`tests/owner_scoped_routes_integration*`, `artifact_ownership_test`, `ws_agent_owner_scope_test`).
  No tests exist for any WP1–WP6 behavior.

CONSTRAINT CHECK
- AGENTS.md / CLAUDE.md violations: NONE found in the current tree.
  Risks to manage:
  - The G1 merge must keep the BossFang preservation surface (branding, SurrealDB parity, storage and uar-spec crates).
  - New G3 migrations must number after the post-sync head.
  - Deterministic prompt ordering applies to any new tool or skill registries in WP6.
- constraints.md violations: not re-audited this stage. No change touched code.

GOAL PROGRESS
- G1 Upstream sync: NOT MET.
  103 commits, 28 conflicts, one confirmed compile break, two SurrealDB migrations, one Surreal store backend, and a SQLite version renumbering.
  Estimate: 1–1.5 days as one complete merge (no staging or cherry-picks).
- G2 UAR image refresh: NOT MET, and smaller than written.
  No pins exist to move.
  The work is to record `1.1.0@sha256:064f5004…` as the qualified target, fix four stale comments and docs, and live-probe the contract (human-only or the `bauar-harness-gate.mjs` gate).
- G3 Issue #156: NOT MET.
  Nothing from WP1–WP6 has landed, the tracker was closed as completed in error or by automation, and about 15 changes with operator decisions are pending.

## Risks

1. G3 scope dwarfs G1 and G2 combined.
   Planning it as one phase alongside a 103-commit sync risks a long-lived phase; consider a child phase for G3 (`/kbd-new-child`) so G1 and G2 can close independently.
2. G1 and G3 touch the same files.
   Any G3 work started before G1 merges will conflict; G1 is a hard predecessor, as the goals already state.
3. Static-only contract verification for G2 could hide a live JSON-shape mismatch in `capabilities` / `effectiveBinding`.
4. The KBD runtime journal is non-functional for this project, so typed stage and gate commands cannot be used until it is repaired.

## Open questions for analyze/plan (operator decisions)

- Q1. KBD journal: repair it (resolve the lifecycle conflict, investigate why `PhaseDefined` r5/r6 are not reduced), or continue projection-only for this phase?
- Q2. Reopen #156, or make #168 the tracker that G3 closes?
- Q3. Which single receipt-capable channel adapter (one implementing `send_with_native_receipt`) is v1's?
- Q4. Scheduler authority for the dot profile: BossFang cron or UAR (never both)?
- Q5. Dot as a runtime profile flag or a config section (default-off), and where the owner binding lives (config store or SurrealDB table)?
- Q6. Legacy unowned workflows and tasks: quarantine, or admin adoption?
- Q7. Provider fixtures for the scheduling-recovery vertical: deterministic fakes in `librefang-testing` or beside the API tests?
- Q8. Do UAR team and mailbox APIs exist in `1.1.0`, or is a UAR issue needed first?
- Q9. Split G3 into a child phase?

## Adversarial review corrections (round 1)

Reviewed by a harness-native fresh-context judge, because the configured cross-model judge (MiniMax-M3) could not dispatch: `JUDGE_MODEL_COLLISION`, no distinct backup configured.
This is a weaker, same-family isolation guarantee (`cross_model_check: same-model-collision`), and the anti-theater sycophancy screen was skipped because its library is not installed.
Verdict: PASS, with 0 CRITICAL, 5 WARNING and 2 SUGGESTION (`review/assess/findings.json`).
Each WARNING was verified and is corrected here:

1. **G3 evidence is pre-sync and must be re-read after G1.**
   The upstream merge rewrites several cited files.
   Two upstream commits bear directly on WP1/WP2:
   - `837f6e40f` (#8526) scopes `channel_send` to the conversation's own instance
   - `8afd864e5` (#8583) records tool dispatch identity for owner assertions

   G3 planning must re-baseline its WP status table on the post-sync tree.
2. **#168's children are #157–#167, not #157–#161** (verified, all OPEN):
   - #157–#161 are the dot P1/P2 items: owner scoping, continuations and receipts, capability negotiation, support reports, role bindings
   - #162–#167 are voice, meeting, media and calls milestones M1–M5

   The M1–M5 milestones are outside the #156 v1 profile, and planning should exclude them explicitly.
   `docs/bossfang/knowme-dot/backlog.md` was not read in full during assess and is a required input for plan.
3. **More stale UAR prose for G2.**
   `docs/architecture/uar-sidecar-assessment.md` still names the deleted `GQAdonis/universal-agent-runtime` fork.
   The judge also flagged `uar-runtime-integration-research.md` and `bossfang-rebrand-completion.md` for the old in-process link.
   G2 must decide per document whether to correct it or mark it as historical.
4. **The live-check tool does not take an image.**
   `scripts/integration/bauar-harness-gate.mjs` takes local binaries and a source checkout, not `ghcr.io/prometheus-ags/universal-agent-runtime:1.1.0@sha256:064f5004…`.
   G2's live probe must run the container itself (human-only, per `CLAUDE.md`) or extend the gate to accept an image.
5. **Pre-sync build baseline.** See the BUILD HEALTH addendum below.

Suggestions taken:
- G3 planning maps acceptance rows A01–A20 to changes and tests, because #156 closes by acceptance row, not by work package.
- The single-break claim is narrowed.
  `uar.rs:1176` is a confirmed BossFang-side `CompletionResponse` literal missing the new field, but 83 `CompletionResponse {` literals exist across the drivers, runtime and kernel.
  The merge must rely on `cargo check`, not on this count, to find every break.

## BUILD HEALTH addendum

Baseline on `fd7eae85f`, with a fresh `CARGO_TARGET_DIR` and `SKIP_DASHBOARD_BUILD=1`; cargo's own exit status was written to a file:

- `cargo check --workspace --lib`: **FAIL (exit 101).**
  `librefang-api` does not compile with default features.
  `row()` and `rows()` in `crates/librefang-api/src/routes/uar_model_catalog.rs:28,46` are called only from the `#[cfg(feature = "uar-driver")]` branch (`:5-9`), so without that feature they are dead code.
  `[workspace.lints.rust] warnings = "deny"` (`Cargo.toml:375-376`) turns that into errors.
  This came in with `73bfbe7a1` / `37f05a819` (2026-10).
  `main` therefore fails the repo's mandated verification command today.
- `cargo check -p librefang-storage -p librefang-uar-spec`: PASS (exit 0).

Consequence: G1 has no green baseline.
A pre-sync change (C-000) must restore the default-feature build first, either by gating `row`/`rows` with the same `cfg` or by moving them into the gated branch.
Only then can a red build after the merge be blamed on the merge.
This is a BossFang-only file, so it falls to bossfang-feature-steward.
BUILD HEALTH above changes from UNKNOWN to **FAIL**.

ASSESSMENT COMPLETE
