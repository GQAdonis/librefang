## Why

BossFang currently supervises one managed UAR or attaches to one external endpoint, while its driver cache and diagnostics identify the runtime only by URL. Agent Fabric Convergence C04 requires a stable, capability-checked binding so operators can select configured instances without conflating model, runtime, console, or A2A endpoints.

## What Changes

- Add backward-compatible UAR instance definitions with stable identity, ownership mode, endpoint roles, workspace locality, credential references, required profile/capabilities, and one selected default.
- Adapt the current singleton configuration into one legacy default instance and keep one supervisor authority for the selected managed process.
- Publish identity-bearing effective bindings to the UAR driver, include binding identity in driver reuse, and refuse wrong identity or unsupported required capability.
- Preserve external endpoint precedence and detach-only shutdown; enforce lifecycle ownership on start, stop, and restart.
- Expose structured inventory, effective binding, and compatibility diagnostics through the existing UAR API and dashboard.
- Separate the A2A public URL from the existing upstream model-provider `base_url`.
- Represent live migration and UAR-native full-run reattachment as unsupported; C05 owns full-harness execution.

## Capabilities

### New Capabilities

- `uar-service-instance-placement`: Replaceable BossFang UAR instance configuration, supervised selection, immutable driver binding, and operator diagnostics.

### Modified Capabilities

None.

## Impact

This affects librefang UAR configuration types, sidecar supervision, UAR driver selection/cache identity, supervisor routes and middleware, OpenAPI/dashboard projections, and the A2A public URL setting. It consumes initiative C04 while preserving the native BossFang execution loop and opt-in UAR feature chain.
