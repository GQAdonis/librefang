## Context

See `proposal.md` for motivation and `specs/uar-service-instance-placement/spec.md` for behavior. The current integration has one optional `UarConfig`, one `UarSidecarSupervisor`, and a process-global URL plus generation consumed by every cached UAR driver. The UAR driver remains a model provider inside BossFang's native agent loop.

## Goals / Non-Goals

**Goals:** Add an identity-bearing, capability-checked service inventory while retaining one lifecycle supervisor and existing configurations. Make configuration and compatibility state observable without exposing credentials.

**Non-Goals:** This change does not move loop ownership from BossFang, implement UAR full-run delegation, migrate a live session, or reattach a UAR-native run. Those operations remain explicit unsupported capabilities for C05 to replace.

## Decisions

1. Add the instance contract beside the existing UAR config types. `UarConfig::effective_instances` adapts legacy singleton fields into one `legacy-default` instance when no inventory is present. This keeps deserialization compatible and avoids a second config authority.
2. Keep `UarSidecarSupervisor` as the only process owner. It receives the selected effective instance, treats external ownership as attach-only, and publishes a full effective binding rather than only a URL. Supporting parallel managed children was rejected because C04 requires replaceable selection and one supervisor, not a process pool.
3. Publish bindings through the existing driver bridge. The binding carries instance ID, ownership, endpoint roles, locality, profile, capabilities, and a generation. The UAR driver validates the runtime before accepting the binding and keys compatibility state by identity and generation. Reusing `DriverConfig.base_url` was rejected because it already means the upstream model-provider endpoint.
4. Use a small compatibility document discovered from the runtime API and retain the existing OpenAPI/model probes as a compatibility fallback. Identity or required-capability constraints are only accepted from explicit observed metadata; missing mandatory metadata refuses admission.
5. Return structured diagnostic objects from the supervisor API while retaining the existing status fields. The dashboard renders the inventory and selected/effective binding from that response. Credential values are never returned; only opaque reference identifiers are represented.
6. Add a dedicated A2A public URL config field and remove `[uar].base_url` from A2A URL resolution. The environment override and localhost default remain compatible.

## Risks / Trade-offs

- Runtime versions without identity/capability metadata cannot satisfy explicit mandatory constraints -> legacy instances use the configured stable identity and the existing API-profile probes; explicitly constrained instances fail closed when observations are absent.
- A selected instance change can invalidate cached compatibility state -> publish a new identity-bearing generation and require re-admission before calls proceed.
- Existing dashboards expect the flat status payload -> retain all existing status fields and add inventory/binding/diagnostics fields.
- Vault resolution is outside the sidecar process module -> carry opaque references in configuration and diagnostics, and never serialize secret values into the operator response.

## Migration Plan

1. Add serde-defaulted inventory and A2A public URL fields.
2. Adapt legacy UAR singleton settings into `legacy-default` when the inventory is empty.
3. Resolve and admit the selected instance before publishing it to the driver.
4. Extend the existing authenticated API and dashboard without removing legacy fields or routes.
5. Roll back by removing the instance list and selected-default fields; legacy singleton configuration remains valid.
