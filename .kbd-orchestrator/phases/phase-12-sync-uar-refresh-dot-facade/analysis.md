# Analysis — phase-12-sync-uar-refresh-dot-facade

> **Read the review sections at the end first.** "Adversarial review corrections (round 1)" and "Unresolved review findings (round 2)" supersede the build-vs-adopt summary, the Q4, Q6 and Q11 text, and the build-required list above them wherever they conflict.

Date: 2026-10-17
Mode: stack specified (Rust workspace, SurrealDB 3.3.0, existing BossFang subsystems).
Inputs: `assessment.md` and the assess handoff, the operator's answers to Q1–Q9 (2026-10-17), and three read-only investigations.
The investigations covered channel receipt support, legacy ownership and the config store (the orchestrator), and the UAR v1.1.1 work (bossfang-feature-steward).
Stage gate: bypassed, projection-only per operator decision Q1 (see D-001, D-002).

## Lessons applied (from prior-context.md)

- "External integrations require at least one real-service test."
  The Q3 adapter choice favours one that can be exercised end to end against a real service without third-party accounts.
  UAR 1.1.0 / 1.1.1 contract claims stay "static only" until a live probe runs.
- "Verify main includes PR final head after merge."
  This applies to the pre-sync C-000 fix and the G1 merge PR.
- "Ask once at phase boundary for operator-only actions."
  The remaining operator questions (Q10, Q11) are batched below rather than asked mid-plan.

Knowledge gaps: none recorded.

## Operator decisions (recorded as D-002)

| Q | Decision | Consequence for plan |
|---|---|---|
| Q1 | Keep KBD state in repo projection files for this phase. | No `prometheus kbd` stage or gate commands; repairing the journal is out of scope. |
| Q9 | G3 becomes a child phase. | The parent phase holds C-000, G1 and G2; the G3 child is created at plan time and planned against the post-sync tree. |
| Q2 | #156 reopened (2026-10-17), handled in the next work. | #156 is G3's tracker and closes by acceptance rows A01–A20; #168 stays the umbrella. |
| Q4 | BossFang owns scheduling. | WP5 extends `crates/librefang-kernel/src/cron.rs`; UAR never schedules dot work. |
| Q5 | Runtime profile flag, a config section and the settings database, with the database authoritative once settings are copied to it on change. | Adopt the existing config store (cand-002); see below. |
| Q7 | Fixtures in `librefang-testing`. | Deterministic calendar and email provider fakes live in `crates/librefang-testing`. |

## Recommendations for the open questions

### Q3 — The v1 receipt-capable channel adapter: recommend the signed webhook durable profile

Only sidecar adapters can return native receipts.
`SidecarAdapter::send_with_native_receipt` refuses any sidecar that does not advertise `native_send_receipt` (`crates/librefang-channels/src/sidecar.rs:2438-2448`); the trait default refuses everything else (`types.rs:971`).
Two adapters advertise it today:

| Adapter | Evidence | For | Against |
|---|---|---|---|
| **Webhook, `WEBHOOK_DURABLE_PROFILE=1`** | `sdk/python/librefang/sidecar/adapters/webhook.py:642-647`; signed durable ingress landed in `8c347f37f` | Requires an account id, a callback URL and handler mode, so every message is owner-bound and signed by construction. Fully exercisable with a real HTTP callback in tests, with no third-party account. It is the natural transport for the KnowMe client app as the conversation surface. | Not a consumer chat app; reactions and threads come back as typed `Unsupported`. |
| Discord | `adapters/discord.py:400`; reply chains bound to durable actions in `bcdb61764` | A real consumer surface with native message ids. | No reactions, interactive messages or streaming in this adapter (comment at `:396-399`). Needs a bot token and guild for any real-service test. Multi-user channels complicate single-owner binding. |

**Recommendation:** make the signed webhook durable profile the v1 adapter, and qualify Discord as the second adapter after v1, as #156's "other adapters remain unavailable unless their contract tests pass" clause allows.
Either way K08 react and thread must return typed `Unsupported`, which is WP1's capability-negotiation change.

### Q6 — Legacy unowned rows: they are not deprecated, so deny them under the profile, with no quarantine and no migration

Unowned rows are not a legacy artefact that can be dropped.
`Workflow.owner: None` is the documented live meaning, "unowned, visible to all" (`crates/librefang-kernel/src/workflow.rs:186-188`).
It is produced today by every workflow that predates the field and by any turn with no authenticated caller, no manifest `owner` and no `default_owner`.
Tasks are the same: `resolve_task_creator` (`routes/task_queue.rs:225-232`) returns `None` for unauthenticated posts.
The `owner: None` literals in `cron.rs:1466` and `workflow.rs:7378+` are in test modules; production cron does not create unowned rows.

**Recommendation:** under the dot profile, deny unowned rows, and create no quarantine table and no migration.
- Dot-profile reads and controls treat `owner == None` as not owned by the bound owner, so those rows are invisible and non-actionable through the facade.
  This is fail-closed and needs no backfill.
- Dot-profile writes must always stamp an owner: the bound owner, or the agent's principal for system paths.
  An unowned row cannot be created while the profile is on.
- An explicit admin adopt operation (assign owner, audited) is optional and only for operators who want old rows visible; it is not required for v1.
- Outside the profile, behaviour is unchanged, so nothing breaks for non-dot deployments.

This answers the operator's intuition that "we should not need legacy rows" without deleting data the non-dot paths still rely on.

### Q5 — How the decision maps onto existing code

The phase-9 config store already implements "database is the boss after settings are copied to it" (`crates/librefang-storage/src/config_store.rs:1-37`).
`config.toml` values seed `ConfigSource::Bootstrap` rows, UI/API edits write `ConfigSource::Runtime`, and a file value overrides an existing row only with a strictly greater bootstrap `revision`.
Plan uses it as follows:
- a `[dot]` section in `KernelConfig`, with all four config-field requirements from `CLAUDE.md`, default-off
- `dot.enabled` (the runtime profile flag) and the owner binding stored as config-store keys
- the SurrealDB row is authoritative once seeded

The store is system-scoped, which fits #156's single-owner-per-data-plane v1.
It is not a secrets store: the owner binding is an identity reference, not a credential.

### Q8 — UAR v1.1.1 and team/mailbox APIs

The operator expected v1.1.1 to cover this, but the evidence differs.
The v1.1.1 work is uncommitted in `/Users/gqadonis/Projects/prometheus/universal-agent-runtime`:
- branch `codex/uar-1-1-0-kubo-conformance` at `91a091d6`, about 111 tracked files changed, `Cargo.toml` already reading `1.1.1`
- no remote branch, tag, PR or image
- its proposal states "New Capabilities: None" and covers #380 / #385 (binding diagnostics, Anthropic SSE framing, MCP outcome fixtures, credential policy, compiler-REST restriction)

The team and mailbox APIs **already shipped in 1.1.0** and are unchanged in 1.1.1:
- `/api/v1/collaboration` (`src/server.rs:1867`), with team definitions and instances, task claim, mailbox `/team-instances/{id}/messages` (`team_mailbox.rs:27-36`), and team execution admit / dispatch / cancel / recover (`team_execution.rs:20-45`)
- capabilities `collaboration_team_planning_v1`, profile `urn:prometheus:uar:team-execution:0.1.0` with `team_execution_{peer_tools,shared_instructions,continuations}_v1`
- `collaboration_team_execution_v1` advertised only when the instance owns execution

What neither version provides: **run-scoped** teams and **per-run** depth, fan-out and budget limits.
Limits exist only on the team definition and binding (`maxMembers`, `maxDepth`, `concurrentTurns`, `maxPendingTasks`, USD budget), clamped by the binding's `effectiveLimits`.

v1.1.1 changes that matter to BossFang deployments:
- compiler REST is unavailable under remote ingress or the `shared` credential policy
- local credential owners need `security.provider_credentials.installation_id`, plus an approved migration, marked BREAKING

## Build-vs-adopt summary

Everything G1–G3 need already exists inside BossFang or UAR 1.1.0; no new third-party dependency is warranted.
Registry checks (`cargo search`) found `apalis 1.0.0` and `tokio-cron-scheduler 0.15.1`, both rejected: Q4 makes BossFang's existing `cron.rs` (on `cron = "0.17"`) the scheduler, and either crate would add a second scheduler and a non-SurrealDB job store.
Details are in `library-candidates.json`.

Build required (no candidate):
- the K07 task projection and receipt normalization
- the durable continuation and wake records
- the owner notification gate
- the K08 conversation facade routes
- the per-run limit enforcement in BossFang's team adapter (see Q11)

## New questions for the operator (raised by this analysis)

- **Q10 — G2 target image.**
  `1.1.0@sha256:064f5004…` is published and satisfies the contract statically; 1.1.1 is unpublished and has a breaking credential migration.
  Recommend: target 1.1.0 now, record 1.1.1's two deployment prerequisites in the reference doc, and re-target when 1.1.1 publishes, as its own small change.
- **Q11 — Per-run depth, fan-out and budget limits (WP6b).**
  UAR enforces limits per team definition and binding only.
  Recommend: BossFang's team/worker adapter enforces per-run limits itself, always less than or equal to the binding's `effectiveLimits`, and fails closed when exceeded.
  Optionally file a UAR issue for native run-scoped limits later, not as a v1 blocker.

## Adversarial review corrections (round 1)

The judge was harness-native and same-model, because the cross-model judge collided again.
Verdict BLOCK: 1 CRITICAL, 4 WARNING, 2 SUGGESTION (`review/analyze/findings.json`).
All findings were verified against code; the corrections below supersede the sections above where they conflict.

### CRITICAL — UAR 1.1.0 already ships dot durable schedules, budgets, checkpoints and approvals (verified at tag `v1.1.0`, tag object `3bdb9435` → commit `d815ef72`)

- `src/uar/api/assistant_capabilities.rs` advertises `schedule.create|list|read|update|pause|resume|cancel` on `/api/uar/schedules/`, with authority `verified_owner_and_workspace`.
  It also advertises durable `approval.read|decide`, `checkpoint.list|resume` and supervisor `recovery.*`.
  `src/server.rs:1446-1450` builds a `ScheduleController` and registers `native_skills::schedules`, so UAR agents can create schedules themselves.
- The specs at the tag include:
  - `openspec/specs/dot-durable-schedules`: one governed occurrence per due instant across concurrent scanners, DST and revocation handling, and a busy-schedule overlap guard that coalesces occurrences behind fresh authority, revision, budget and approval checks
  - `dot-durable-budgets`: shared durable reservations, with unknown spend kept reserved until reconciled
  - `dot-checkpoint-resume`, `dot-spend-settlement`, `dot-supervisor-recovery` and `dot-durable-ingestion`
- **Impact on Q4.**
  #156 forbids scheduling the same obligation in both BossFang and UAR.
  With Q4 as answered ("BossFang owns scheduling"), the dot profile must also make UAR's schedule surface unreachable for dot work.
  That means BossFang never calls `/api/uar/schedules/`, and the bound UAR instance must report `schedule_unsupported` or the profile must refuse UAR native schedule-skill use.
  Otherwise a UAR agent can create a second schedule.
  UAR's implementation is also considerably more complete than BossFang's `cron.rs` (no DST, overlap or coalescing semantics, and an in-memory `task_registry` with no replay).
  **Q4 is re-raised for confirmation as Q4′ below.**
- **Impact on Q11 and build-required.**
  Per-run *budget* enforcement should adopt UAR durable budgets and spend settlement (cand-012) rather than be built in BossFang.
  BossFang still enforces per-run *depth and fan-out*, because UAR has those only per team definition and binding.
  "Durable continuation/wake records" stays build-required only if Q4′ keeps BossFang as the scheduler.

### WARNINGS (corrected)

1. **Q6: one production write path creates unowned workflows.**
   `owner: None` at `crates/librefang-kernel/src/workflow.rs:7378` is production code: `#[cfg(test)]` starts at `:7592`.
   It is the template-instantiate path behind `POST /api/workflow-templates/{id}/instantiate` (`routes/workflows/templates.rs:117-130`).
   Under the profile, that path must stamp the bound owner.
2. **Q6: task ownership is spoofable, so "deny unowned" is not fail-closed for tasks.**
   `resolve_task_creator` (`routes/task_queue.rs:225-232`) falls back to a free-form `created_by` string from the request body when there is no authenticated user.
   Under the profile, task creation must require an authenticated principal and ignore the supplied string.
   Ownership checks must compare principals, not free-form strings.
3. **Q5: the config store has properties that conflict with single-owner binding.**
   - Keys can be scoped per host via `BOSSFANG_CONFIG_STORE_SCOPE` (`crates/librefang-api/src/config_store_overlay.rs:41`).
   - The store is overlaid into the kernel at boot.
   - SQLite parity is deferred.
   - Keys can be changed through `config_set`.

   Plan must make the owner binding and `dot.enabled` non-scoped, apply changes through the reload path rather than boot only, refuse the profile on the SQLite backend, and exclude the binding from the generic `config_set` allowlist, with a dedicated audited, owner-only route instead.
4. **Q3 and Q6 rest on pre-sync code.**
   Both recommendations cite files G1 conflicts on (`task_queue.rs`, `channels/src/bridge.rs`), and they ignore upstream #8526 (`channel_send` scoped to the conversation's instance) and #8583 (tool dispatch identity for owner assertions).
   They are provisional until re-verified on the post-sync tree, which is the G3 child phase's first task.

### SUGGESTIONS (accepted)

- **Webhook receipt trust.**
  A native receipt from the webhook durable profile is a message id reported by the callback receiver, so it is only as trustworthy as that endpoint.
  v1 must treat the KnowMe callback endpoint as part of the trusted, authenticated deployment and record that assumption in the spec.
- **UAR evidence precision.**
  - The UAR line numbers in the Q8 section came from the uncommitted 1.1.1 working tree; at tag `v1.1.0` the collaboration nest is at `server.rs:1845` and schedules at `:1867`.
  - Paths in Q8 refer to the UAR repository (`Prometheus-AGS/universal-agent-runtime`), not BossFang.
  - The 1.1.1 branch `codex/uar-1-1-0-kubo-conformance` does exist on `origin`, at the same commit as `main`; only its 1.1.1 changes are uncommitted.
  - The 1.1.1 work also changes `dot-durable-budgets` and `dot-durable-ingestion`.

## Questions for the operator (final list for this stage)

- **Q4′ — Re-confirm scheduling ownership, given UAR 1.1.0's dot durable schedules.**
  (a) BossFang owns, as answered: build durable continuations and wakes in BossFang, and disable UAR's schedule surface for the dot profile.
  (b) UAR owns: BossFang drives `/api/uar/schedules/` through the facade and projects occurrences into owner task views, with no scheduler build in BossFang.
  Recommendation: **(b)**.
  UAR's implementation already meets the occurrence, DST, overlap and budget requirements #156 names, and BossFang still owns the owner-facing projection and notification.
  If the reason for (a) is that schedules must survive without UAR, keep (a).
- **Q10** and **Q11** as above.
  Q11 narrows to per-run depth and fan-out only; budgets adopt UAR durable budgets.

## Unresolved review findings (round 2, accepted at the 2-round cap)

Round-2 verdict BLOCK: 1 CRITICAL, 3 WARNING, 2 SUGGESTION (`review/analyze/findings.json`; round 1 is in `findings-round1.json`).
Per the review protocol the artifact is accepted with these items carried into plan.
The CRITICAL is verified and turned into operator question Q4′ (widened), so it does not block planning once answered.

- **CRITICAL (verified): UAR 1.1.0 also owns durable follow-ups and wakes, not just schedules.**
  At commit `d815ef72`, `src/server.rs:1453-1458` builds a `FollowupController` and registers `native_skills::followups`, and `:1869` mounts `/api/uar/followups`.
  These deliver wakes into a durable conversation inbox with quiet hours, driven by their own scanner.
  BossFang's "durable continuation/wake records" and "owner notification gate" builds therefore overlap a shipped UAR capability, and a second UAR scanner exists alongside schedules.
  Checkpoint resume and durable approvals also still need verdicts.
  Resolution path: Q4′ now covers scheduling, follow-ups and wakes together, and plan assigns verdicts for checkpoint resume and approvals.
- **WARNING: option (a) has no BossFang-side disable lever.**
  UAR reports schedules as supported whenever its store is durable, and it registers the schedule and follow-up native skills on every boot.
  If (a) is chosen, plan must add a UAR-side profile switch (a UAR issue) or a BossFang admission rule refusing those native skills for dot runs.
- **WARNING: option (b) has no occurrence read route.**
  UAR's `src/uar/api/schedules.rs:18-20` exposes only list/create, show/edit and control, with no route for occurrences.
  Projecting occurrences into owner task views needs a UAR addition, or BossFang must project from run and follow-up events.
  Option (b) also amends G3's goal text, which says BossFang owns continuation records.
- **WARNING: Q6 has more unowned write paths.**
  Besides template instantiate (`workflow.rs:7378`), the round-1 review cites the wizard-drafted manifests (`wizard.rs:160`) and the channel-bridge `/btw` path (`kernel/messaging.rs:872`).
  The G3 child phase must inventory every ownerless write path on the post-sync tree, not just these.
- **SUGGESTION:** cand-009 evidence corrected below; `3bdb9435` is the tag object and the commit is `d815ef72` (fixed above).
- **SUGGESTION:** stale top-half statements are flagged by the banner at the top rather than rewritten, to keep the record auditable.

### Q4′ (widened) — Who owns scheduling, follow-ups and wakes for the dot profile?

- **(a) BossFang owns them** (the original answer).
  Build durable continuations, wakes and the notification gate in BossFang on top of `cron.rs`, and add a disable path for UAR's schedule and follow-up native skills (UAR issue or BossFang admission rule).
- **(b) UAR owns them.**
  BossFang drives `/api/uar/schedules/` and `/api/uar/followups` through the facade, owns the owner-facing task projection from run and follow-up events, and adds an occurrence-read route upstream in UAR if needed.
  G3's goal text is amended accordingly.
- Recommendation: **(b)**.
  UAR already implements DST handling, occurrence deduplication, overlap guards, budget-gated admission, quiet hours and a durable inbox.
  Rebuilding all of that in BossFang is the largest single item in G3 and duplicates shipped, specified behaviour.

## Operator resolution (2026-10-17, after review)

- **Q4′ → (b) UAR owns scheduling, follow-ups and wakes for the dot profile.**
  This supersedes Q4.
  BossFang drives `/api/uar/schedules/` and `/api/uar/followups` through the facade and owns the owner-facing task projection and notification surface.
  It builds no scheduler or continuation store.
  The G3 goal text is amended in the child phase.
  A UAR occurrence-read route is raised upstream if projection from run and follow-up events proves insufficient.
- **Q10 → target UAR `1.1.0@sha256:064f5004…` now, and re-target 1.1.1 in its own change once it is published.**
- **Q11 → the BossFang team adapter enforces per-run depth and fan-out**, never looser than the binding's `effectiveLimits`, failing closed.
  Budgets adopt UAR durable budgets (cand-012).

Final candidate verdicts after resolution: cand-011 (UAR schedules) and cand-013 (UAR follow-ups) move from reference to **adopt**; cand-005 (BossFang cron) moves to **reject for dot work**; the cron engine itself is unchanged.
Build-required drops "durable continuation/wake records".
"Owner notification gate" narrows to the BossFang-side owner/destination binding and dedup over UAR follow-up deliveries.
