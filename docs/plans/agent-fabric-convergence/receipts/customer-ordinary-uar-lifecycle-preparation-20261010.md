# Missing ordinary-UAR lifecycle: operation preparation

Prepared only, 2026-10-10. No application, HTTP/inference operation, build or suite was run. No production code, credential, provider configuration, ledger or commit was changed.

The passing ordinary UAR baseline is public 2.2.25 Boss `35eff8c8...` / UAR `60b5922e...`, session `64c7bd75-aab6-4121-b324-1b67a0fb5d97`, selected compatibility model `cherryai::qwen`, and explicit UAR assignment `gateway:gpt-6.1-sol`. These are synthetic operation records in the retained disposable profile; they are not user conversation identifiers. The driver must find those existing records and refuses to create replacements.

## Prepared files and invocation

- `.prometheus/cadence/inputs/customer-uar-inference-lifecycle-20261010.mjs`: scenario using the same production stream open/abort/attach and message reads as the passing native lifecycle driver. It operates only retained-history follow-up, semantic streaming followed by cancellation, persisted pause, and post-cancel follow-up. Every persisted turn must retain `the-boss-gateway:gpt-6.1-sol`.
- `.prometheus/cadence/inputs/operate-retained-uar-lifecycle-20261010.mjs`: **attach-only** wrapper. Root owns launch/shutdown/UI. It checks the actual verified 2.2.27 installation receipt, ASAR/native bytes, payload source, live owned PID/executable and exact temporary profile before attaching through the existing `scripts/github-feedback-operation/client.mjs` helper.
- `.prometheus/cadence/inputs/customer-uar-lifecycle-2.2.27-configuration-20261010.json`: exact current Boss `efc36dba3e482c30d4ce97874fed2f9573a38f1b` / UAR `f55e6cf1dd0f2864b4426a614a2e8bc4dea42400`, retained profile and existing gateway endpoint. It contains no credential values.

From this initiative directory, after root releases the UI slot and launches that verified candidate against the retained isolated profile:

```text
node .prometheus/cadence/inputs/operate-retained-uar-lifecycle-20261010.mjs --execute --installation <actual-verified-2.2.27-installation.json> --launch <root-owned-live-launch.json> --configuration .prometheus/cadence/inputs/customer-uar-lifecycle-2.2.27-configuration-20261010.json
```

The launch receipt must identify `status: success`, `keptOpen: true`, the actual PID and `isolatedUserData` matching the retained profile. The installation receipt must identify the actual app, source, version, ASAR/sidecar hashes and installer digest. Later corrective source changes require an explicit configuration revision; this driver does not infer a new source from HEAD.

The scenario **reads**, without changing, the retained UAR agent assignment and external liter endpoint. Actual model discovery verifies the selected served alias. No new initial response, native Codex/Claude turn, credential staging, fake gateway, paid billing route, timeout widening or environment-profile override is performed. Errors retain bounded static codes, provider status/reason classification and a message digest; arbitrary error text/credentials are excluded.

Limitations: it requires the existing disposable profile/session and authenticated operational external gateway. It refuses an empty replacement profile; it does not copy a database or repair configuration. Cancellation is through ordinary typed IPC, not a claimed Stop-button click. The parent owns cleanup. Preparation is not a passing operation, installed acceptance or another Cadence delivery.

## Graceful shutdown: existing controls

There is **no ordinary typed `app.quit` route** in `src/shared/ipc/schemas/app.ts` or application lifecycle IPC registration. `window.close` delegates to `MainWindowService.requestClose`; on macOS its close handler intentionally hides/prevents normal close instead of quitting. `app.relaunch` calls `app.relaunch(options)` followed by **`app.exit(0)`**, so that route is not evidence of the graceful shutdown chain.

The existing native **Quit The Boss** menu (`src/main/services/AppMenuService.ts`, `role: quit`) and tray quit (`TrayService.ts` → `application.quit()`) supply the correct product path. `Application.setupQuitHandlers()` runs `before-quit` prevention and `will-quit` → `shutdown()`, which stops/destroys lifecycle services and writes either clean or unclean `Shutdown complete`; `UarSidecarService.onStop()` awaits `stopOwnedProcess()`.

Root can operate the existing native Quit menu with the app focused, without adding an API. Record the actual menu request, old app/UAR PIDs, process disappearance and exit outcome, plus only the static clean/unclean shutdown marker. A disconnect alone is insufficient. If cleanup times out or force is used, retain that failure; do not label it graceful. SIGTERM/forced group cleanup used by prior wrappers stays separate evidence.
