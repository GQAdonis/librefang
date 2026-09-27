## 1. Configuration and binding contract

- [x] 1.1 Add backward-compatible UAR instance inventory, stable identity, ownership, endpoint roles, locality, opaque credential references, profile/capability requirements, selected default, and placement support types; verify the legacy singleton adapter preserves existing defaults and endpoint precedence by static contract inspection
- [x] 1.2 Add a dedicated A2A public URL setting and verify A2A URL resolution no longer consumes the UAR model-provider base URL by static call-path inspection

## 2. Supervision and driver admission

- [x] 2.1 Adapt the single UAR supervisor to the selected effective instance while preserving managed ownership and external detach-only lifecycle; verify no external-instance path spawns or stops a child by static lifecycle inspection
- [x] 2.2 Publish an identity-bearing effective binding to the UAR driver/cache and refuse wrong identity, incompatible profile, and missing required capabilities with structured diagnostics; verify every UAR call requires an admitted binding by static driver-path inspection
- [x] 2.3 Represent current calls as new-session placement and migration/native-run reattachment as unsupported; verify no native agent-loop file is changed

## 3. Operator diagnostics

- [x] 3.1 Extend the authenticated UAR API with inventory, selected/effective binding, endpoint-role, ownership, placement-support, and structured compatibility diagnostics while retaining existing status fields and routes; verify response types contain no credential values
- [x] 3.2 Enforce lifecycle-owner authorization for UAR lifecycle mutations and verify nonowner reads remain diagnostic-only by middleware policy inspection
- [x] 3.3 Update the dashboard API and UAR panel to render inventory, effective binding, endpoint roles, ownership, compatibility failures, and unsupported placement operations; verify existing lifecycle and completion-test actions remain available
