# C09.3 delivery evidence outline — 2026-09-29

Status: pending. This document records the authored operation plan, not a passing runtime receipt. Canonical work is `afc-c09-bounded-teams-and-shared-task-board` / `C09.3`; cadence iteration is `28847cae-d6e9-45e4-880d-091bbef217c6`. Source freeze, package build, feature operation and final completion remain the delivery lead's boundaries.

## Planned boundary and source records

| Evidence | Current outcome | Record to attach after the boundary |
|---|---|---|
| Frozen UAR source and packaged payload | Pending | Source commit, archive SHA-256, byte size and payload record |
| Frozen Boss source and Mac ARM64 build | Pending | Source commit/fingerprint, `pnpm build:mac:arm64` checkpoint, DMG SHA-256 and byte size |
| Real packaged C09.3 operation | Pending | `.prometheus/cadence/artifacts/c09-team-runtime-operation.json` |
| Canonical task/change completion | Pending | `kbd-apply end-task` receipt after successful operation |

The operation uses the current built app at `/Users/gqadonis/Projects/prometheus/worktrees/the-boss-d01-build/dist/mac-arm64/The Boss.app`. The trusted scenario is `/Users/gqadonis/Projects/prometheus/worktrees/the-boss-d01-build/scripts/cadence/uar-team-execution-scenario.mjs`; the initiative wrapper is `scripts/operate-c09-team-runtime.mjs`. The wrapper resolves the configured delivery-cadence launcher and uses a 480,000 ms inner operation timeout; the frozen cadence checkpoint still has a 240,000 ms outer limit. It writes a unique staging receipt and refuses to overwrite the final receipt. Every operation receipt stays under the initiative `.prometheus/cadence/artifacts`, outside the Boss source fingerprint.

After the complete delivery is built, execute from this initiative directory:

```text
node scripts/operate-c09-team-runtime.mjs --boss /Users/gqadonis/Projects/prometheus/worktrees/the-boss-d01-build
```

The launcher inherits the process environment. Use `BOSS_CADENCE_LITER_KEY` or `LITER_LLM_MASTER_KEY` for the gateway credential; never print its value. `BOSS_CADENCE_LITER_ENDPOINT` defaults to `http://127.0.0.1:4000`, and `BOSS_CADENCE_LITER_ALIAS` defaults to `kimi-for-coding`. The default source target is the explicitly observed `kimi-for-coding` provider / `kimi-for-coding` model at `https://api.kimi.com/coding/v1`. This mapping was reported by the delivery lead from the local gateway configuration; it is not inferred from the alias. A custom alias requires explicit `BOSS_CADENCE_LITER_SOURCE_PROVIDER` and `BOSS_CADENCE_LITER_SOURCE_MODEL`; `BOSS_CADENCE_LITER_SOURCE_BASE_URL` is optional. Only the launcher's isolated application configuration is changed. The scenario obtains the selected gateway ID through typed `prometheus.liter.catalog.read`, then records an enabled connection and alias target without a source-provider credential.

## Exact operation sequence

All operations use the packaged application's `window.api` IPC/data interfaces. There are no mocks or direct untyped runtime-router calls.

1. Create a fresh workspace, install the starter team with the explicit gateway model choice through `setup_starter`, and create an immutable team instance.
2. Add and claim a task whose string output contract requires a fresh exact marker. Admit a bounded real member turn, replay the identical admission command, and require the same attempt/run identity with one attempt. Poll authoritative execution and require the real marker response, succeeded task output and an immutable artifact in the same workspace/team namespace.
3. Run a second member task with only the first artifact ID selected. Its instruction and output contract do not repeat the marker. Require the marker returned from that explicit artifact context. Preserve original attempt/ownership epochs and enforce aggregate committed plus reserved limits.
4. Create a second workspace/team. Require an empty artifact list; refuse the first workspace's artifact as selected context and refuse a mismatched workspace/team artifact lookup. Refuse a reservation above the authoritative remaining budget without creating an attempt or changing reserved usage.
5. Display Teams settings in the packaged UI. Require the labelled execution model picker, assigned-task start, token/cost/time reservation inputs, control reason, cancellation, recovery and membership controls.
6. Admit a long bounded actor turn on a separate control team. Cancel its original attempt and revoke its member. Require the original execution epoch to remain intact, membership revision to advance, and stale admission/inbox delivery to be refused.
7. Restart the packaged UAR via `prometheus.integration.start` / `uar-restart`, then replay the same recovery command. Require exactly one original control attempt/run, retained epochs, truthful unresolved usage, and no duplicate recovery attempt. Require both completed primary turns and their scoped artifacts to survive restart; the second workspace must still have no foreign artifacts.

The evidence distinguishes execution outcome from accounting status. An actual completed marker turn may have `executionOutcome: succeeded` and accounting `status: uncertain` if authoritative pricing/usage is unavailable. That outcome preserves the full unresolved reservation and exposes uncertainty; it must never be reported as zero-cost or fully settled. A known terminal outcome frees live concurrency while its unknown accounting still reserves budget. Model evidence is the explicit immutable binding choice plus the actual actor response; team attempt/artifact receipts do not independently expose model provenance.

No feature operation, build, unit suite or intermediate compiler gate was run by this document's author. Pending table entries must be replaced only with actual boundary receipts. Local Mac operation does not establish Windows installed acceptance, publication or deployment.

## Duplicate registration and net exclusions

The accidental `afc-c09-team-task-admission-context-and-membership` registration was withdrawn operationally by cancelling its only task. KBD's reducer treats a cancelled-only change as Complete, and the supported transition table rejects Complete → Cancelled/Pending. The graph therefore still contains the duplicate; this document does not claim canonical reconciliation.

At generated projection source revision 344, the phase reports 9/20 and the whole run reports 12/23. The approved initiative has 19 changes and 8 genuinely completed changes while C09.3 is pending. The accounting correction is explicit:

| Projection | Excluded entries | Net approved initiative count |
|---|---|---|
| Phase 9/20 | One duplicate registration, subtract 1 completed and 1 total | 8/19 |
| Whole run 12/23 | The same duplicate plus three completed child process/specification changes, subtract 4 completed and 4 total | 8/19 |

The three child entries are `release-cadence-optimization`, `uar-team-definitions-deployment` and `uar-team-specification`. Their history remains valid but contributes no extra initiative implementation credit. No generated projection was edited. Local supported KBD commands provide no targeted duplicate withdrawal/reconciliation that preserves this graph and immutable history; the anomaly remains recorded for supported remediation. A successful C09.3 boundary advances its task only. The approved change remains in progress while Delivery B / C09.4 is pending; net change completion advances to 9/19 only after that remaining task completes.

## Completion command held pending

Run only after the required real operation and delivery evidence pass, with this initiative as the working directory:

```text
node /Users/gqadonis/Projects/prometheus/prometheus-skills-mini/scripts/kbd-apply.mjs end-task afc-c09-bounded-teams-and-shared-task-board C09.3 3 4 "Enforce aggregate reservations, selected context/artifact namespaces, membership revocation and canonical usage deduplication."
```

The inspected supported driver uses `end-task`, not a `complete` subcommand. `C09.3` selects the existing canonical task and matches the OpenSpec checklist's `Initiative task: C09.3.` text; numeric `3` would create a different canonical task identity. C09.4 remains planned as Delivery B, so this is not the final task/change completion boundary. The command has not been executed.

## 2026-09-30 — Actual build and operation failures retained

UAR da41efb7 and Boss 150bd409 built and produced a signed, integrity-checked Mac ARM64 DMG (610023624 bytes, SHA-256 6e105d1493b333feb1b55ab84bfcd0183a36dfa790ab9f16e9b95601544d57d2). The packaged application launched and provider setup opened. The C09.3 operation remained failed: the first real turn returned its exact marker and settled 1458 tokens; the second selected-artifact turn preserved its artifact identity but failed during streaming. Safe diagnostic 139dbab4-2489-4f18-8d88-6af8d7abab58 was retained with kind provider_error. This is not a passing Gate A or evidence of missing context.

The operator then requested current mini/Liter submodule links. Mini 7e65d26d25b9f08dc67467b4478ff421ef9761b6 packages 100 source skills and 3746 runtime files. UAR 14033d57 pins Liter 12a2fae9675e34b88e9373caa2bca9959f416493 and regenerates 343 provider entries. Its actual release build failed at four removed host transport/redaction options; no installer containing this refresh exists yet. Receipts: c093-native-latest-liter-build.json and log, c093-operation-failure-observations-6d5860a5-794f-4649-a8e1-bc60cfaf2349.json, c093-build-safe-diagnostics-command.json. Original evidence is retained; none is relabelled as success.

#### Upgraded payload operation — canonical route succeeds; controls repair
Boss83090387/UAR49765c56 packaged inference ran with explicitly configured kimi-code-plan-cn pricing and unchanged kimi-for-coding wire alias. Two independent operations produced and reproduced scoped artifact markers, usage settled (1453/1631 and1405/1728 tokens). The safe DOM capture showed all required controls present and no alerts; only Queue without dispatch labels lacked associations. Evidence: .prometheus/cadence/artifacts/c093-operation-failure-observations-efadd1be-3e77-4f1e-9eda-a1d5b96ca9cd.json. Gate A remains incomplete until the repaired packaged controls and later ownership operations succeed.

## Gate A passed — 2026-09-30

The preceding pending entries and failures are historical. Actual complete Gate A passed at Boss b83e128ba1f94d720a5562aa4414707c02defbf4 and UAR 49765c56a9c60d3ecdac5a3f1227eeba25b7cf2c. The authoritative receipt is `.prometheus/cadence/artifacts/c093-gate-a-receipt.json`, linked to the frozen build, launch, full real operation proof and external procedure provenance. Cadence delivery 4 finalized successfully at 2026-09-30T09:40:47.577Z; supported KBD end-task completed C09.3 at revision385. No whole-change or phase completion is claimed. C09.4 remains pending. Older model-evidence prose described a receipt limitation; the final outer proof records exact configured route/profile, without claiming independent vendor physical model identity.
