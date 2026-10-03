# BossFang Embedded Dashboard

## Requirement: usable native sidecar dashboard

When building a BossFang executable for The Boss with `BOSSFANG_REQUIRE_EMBEDDED_DASHBOARD=1`, the build MUST reject missing or empty dashboard output, including the SPA shell, JavaScript, and stylesheet assets. The shell MUST target `/dashboard/`. A successful build alone does not certify runtime operation.

### Scenario: dashboard assets are absent

Given a clean checkout with no built dashboard, when the release build is configured to skip the Vite build, then the Rust build fails with a dashboard-asset diagnostic instead of emitting an apparently usable sidecar.

### Scenario: packaged dashboard is opened

Given a native packaged sidecar launched on loopback with an isolated configuration directory, when The Boss opens its resolved `/dashboard/` endpoint in the MiniApp, then BossFang serves its own SPA and handles authentication and configuration through its existing API. The Boss does not mirror its UI or put credentials in the URL.
