# Supported desktop recovery contract

Recorded 2026-10-10 by the assigned runtime/security member. Read-only source and retained-receipt inspection; no application operation, build, suite, production edit, commit, publication or ledger transition. Root remains the sole packaged-UI operator.

Inspected Boss source: `ff98af813c59e7c2733db74306ebfe087fec069a` (2.2.27 packaging metadata correction). Native source remains `f55e6cf1dd0f2864b4426a614a2e8bc4dea42400`. These identities do not imply that the new application package has built, launched or passed recovery.

## Graceful quit: the existing product path

- macOS application menu **Quit The Boss**, including Cmd+Q, is `AppMenuService.ts:123`, Electron `role: quit`.
- Tray **Quit** is `TrayService.ts:107–108,140–141` and calls `application.quit()`.
- `Application.ts:480–508` handles `before-quit` (critical-operation holds can refuse quit), then `will-quit` → awaited `shutdown()` → exit.
- `shutdown()` (`Application.ts:251–285`) flushes pending boot configuration, stops lifecycle services in reverse initialization order, destroys services and distinguishes **Shutdown complete** from **Shutdown complete, but not cleanly**. Logger completion follows cleanup. The per-service ceiling is 5 seconds; the overall quit fuse is 30 seconds. A timeout/forced exit is not a clean pass.
- `UarSidecarService.ts:226–229,949–965` retires the owned generation, ends child stdin, waits up to 5 seconds, then escalates through the owned process-tree terminator if necessary. A stopped external instance is not an intended effect: the service's owned-child state is separate from external connections.
- `BossFangService.ts:92–100,413–421` disconnects its UAR connection and stops only its owned BossFang child. `bossFang/connection.ts:132–150` clears renewal/retained authentication and disconnects; this is not a command to stop the borrowed UAR server.

**Controls that do not prove this:** `window.close` can hide the macOS main window (`MainWindowService.ts:708–754`). `app.relaunch` deliberately uses `app.exit`, bypassing graceful teardown. There is no ordinary typed `app.quit` in `src/shared/ipc/schemas/app.ts`; no new API is needed. SIGTERM can enter application shutdown, but existing SIGTERM receipts without the clean marker are not retroactively promoted to menu-quit qualification.

## Upgrade, migrations and rollback limits

`DbService.onInit()` runs the packaged SQLite migration chain and seeders. `applyMigrations.ts` applies outstanding forward migrations and replays custom SQL. The existing restore admission (`restore/restorePromotion.ts:279–295`) admits an actual applied migration chain only when it is a prefix of the bundled chain; a fork or ahead-of-code database is refused. Its local pre-commit rollback is a **restore transaction recovery**, not a desktop application downgrade guarantee.

`AppUpdaterService.ts:106–107` disables automatic installation on quit; installation requires the user's Install Now action. All inspected update-feed selections set `allowDowngrade = false` (lines 214,263,281). **No supported in-place desktop downgrade or general migrated-data rollback is claimed.** MiniApp rollback documentation concerns individual MiniApp snapshots, not The Boss or UAR databases.

The desktop shutdown/update/database/migration source paths are unchanged between public 2.2.25 (`35eff8c8c40555a4a464ee03b7305bcc4949666b`) and this Boss commit, based on a bounded source-path diff. That preserves applicable prior upgrade evidence, not new-package acceptance. UAR persistence changed since that public baseline; app-level SQLite source equality does not certify native database rollback.

Replacing an installer never undoes approved external effects (including issue #63). If an operator needs a prior candidate, the only bounded experiment here is a retained **pre-upgrade disposable profile snapshot** paired with its exact original installer; do not open a migrated live profile with older code or advertise that as supported. No such rollback operation is passed by this note. Record in-place downgrade as unsupported rather than requiring new migration machinery during closeout.

## Existing evidence and exact missing subsets

| Criterion | Retained evidence | Remaining customer operation |
|---|---|---|
| Upgrade without replay of an approved external effect | `customer-public-mac-2.2.25-feedback-recovery-20261009-operation.json`: intentional whole-app replacement, same draft/issue #63/effect/dispatch/receipt, no new effect intent. | None for this unchanged contract. Final candidate package/acceptance stays separate; create no new issue. |
| Reopening completed coding work | `customer-coding-retained-reopen-2.2.26-20261010.json`: immutable bindings, attempts, artifact digests and README preserved; no original turn replay. | None for that subset. Its partial status is retained; later cancellation/isolation receipt closes the named missing controls. |
| Persisted cancellation and workspace isolation | `customer-coding-cancellation-isolation-2.2.26-20261010.json`: real Work Stop, cancelled state after reopen, foreign execution/artifact/approval reads refused. | Do not repeat that passing cancellation to claim outage or pending-approval recovery. |
| BossFang port/instance settings and borrowed ownership across restart | `customer-bossfang-settings-persistence-2.2.26-20261010.json`: same disposable profile, requested port/instance persisted, borrowed UAR PID survived BossFang restart. | Authenticated alternate-instance operation is separate and pending in the closeout matrix. |
| Retained feedback preview awaiting a decision | `.prometheus/cadence/artifacts/c18-original-profile-recovery-b419/restart-75168b73-6338-4a57-b8fb-bc5bb0ec200e/operation.json`: success, same intake/draft/wait/binding/model/config, no new attempt/approval/effect, visible preview. | This is older feedback-preview evidence, not current native tool-approval authority recovery. Two earlier `C18_RESTART_OBSERVATION_UNAVAILABLE` failures remain failures. |
| Graceful product quit | Coding/BossFang shutdown receipts explicitly report `gracefulQuitConfirmed: false`; process exit/SIGTERM is observed. | Operate native Quit, confirm clean lifecycle marker and owned app/UAR/BossFang exit. |
| Native pending approval across outage/restart | No passing current customer receipt found for preserving a pending tool challenge across runtime loss with correct effect fencing. | Operate only this missing subset on a disposable read-only request; do not infer it from completed coding reopen or a confirmed issue receipt. |
| Gateway/service outage feedback and recovery | Ordinary UAR lifecycle preparation is not an operation receipt; actual earlier provider failures establish failures, not a recovery pass. | One disposable bounded outage/recovery of the selected customer path, preserving unknown outcomes and avoiding effect replay. |
| Native platform installed acceptance | Existing records preserve their original candidate identities. | Final-candidate Mac ARM64 and Windows x64 evidence/acceptance remains pending; Mac Intel/Windows ARM64 package publication is distinct. |

## Bounded steps for the root operator

1. After the actual corrected package is installed, identify its exact installation receipt, owned main/UAR/BossFang PIDs and disposable profile. Reuse the already retained coding/feedback results; no fresh original edit or GitHub POST.
2. While that profile is idle, focus the actual app and select **Quit The Boss** (or Cmd+Q). Record which existing control was invoked, clean/unclean static shutdown marker, exit outcome and disappearance of owned PIDs. A CDP disconnect alone is insufficient. Do not terminate unrelated external UAR/gateway processes.
3. Relaunch the same candidate/profile and read the retained bindings, tasks, artifacts, settings and confirmed effect IDs. Count only the missing graceful-control evidence; existing reopening passes remain linked.
4. For the missing pending-approval subset, use a disposable allowed-root **read-only** request and stop before approval. Capture its run/attempt/admission/workspace/owner identities, challenge revision/digest and unchanged file digest. Cause loss only of the explicitly owned app/runtime; reopen the same profile and inspect the authoritative recovered state. If it is interrupted/expired rather than still pending, report that actual supported state. An old approval is never converted into a fresh grant: decide only a live challenge under its current owner, after actual human approval when required. Confirm no effect was executed while undecided; do not replay the original turn blindly.
5. For a missing outage path, temporarily select an unavailable endpoint **only in the disposable configuration**, preserve the prior binding, observe visible failure classification, restore the exact endpoint through normal settings and operate a bounded read-only follow-up. Configuration outage proves that path only, not killing a real service. If the retained criterion specifically requires owned runtime loss, record/operate that distinct supported restart and its generation fencing; do not manufacture a service crash or global provider configuration change.
6. Keep outcome-unknown, unsupported rollback, absent native environment and operator acceptance explicit. These steps qualify only their identified customer subsets; they do not complete the broader C18 matrix or change portfolio counters.

No hypothetical product repair is proposed. Failure of an actual operation is retained and diagnosed before any further source change.
