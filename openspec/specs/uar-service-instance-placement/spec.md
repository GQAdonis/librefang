# uar-service-instance-placement Specification

## Purpose
Define how BossFang configures, selects, verifies, supervises, and reports replaceable Universal Agent Runtime service instances without confusing service identity with network location.

## Requirements

### Requirement: Backward-compatible instance inventory

BossFang MUST accept a named inventory of UAR instances with a stable instance identifier, ownership mode, model/runtime/console endpoints, workspace locality, opaque credential references, advertised profile and capabilities, required profile and capabilities, and one selected default. Existing singleton UAR configuration MUST continue to behave as one legacy default instance.

#### Scenario: Select one of two configured instances

- **WHEN** an operator configures two named UAR instances and selects one as default
- **THEN** BossFang exposes both instances and binds new UAR model work to the selected instance

#### Scenario: Load legacy singleton configuration

- **WHEN** an existing configuration contains only the legacy singleton UAR fields
- **THEN** BossFang derives one stable legacy effective instance without changing the existing external-endpoint precedence or opt-in managed-process behavior

### Requirement: Identity and capability admission

BossFang MUST verify the selected runtime's stable identity, API profile, and required capabilities before publishing an effective binding. A wrong identity, incompatible profile, or missing required capability MUST be refused with structured diagnostics.

#### Scenario: Wrong runtime identity

- **WHEN** the selected endpoint reports an instance identifier different from the configured identifier
- **THEN** BossFang refuses the binding and reports the expected and observed identities

#### Scenario: Unsupported required capability

- **WHEN** a selected runtime lacks a required configured capability
- **THEN** BossFang refuses the binding and reports the missing capabilities without silently choosing another instance

### Requirement: Explicit lifecycle ownership

BossFang MUST supervise at most the selected managed instance. Externally owned instances MUST take endpoint precedence, MUST only be detached by BossFang lifecycle shutdown, and MUST never be stopped or replaced by BossFang.

#### Scenario: External client detaches

- **WHEN** BossFang stops or restarts its connection to an externally owned UAR instance
- **THEN** BossFang clears its binding without sending a service shutdown and without spawning a local fallback

#### Scenario: Managed instance lifecycle

- **WHEN** the selected instance is managed and the registered BossFang supervisor starts or stops it
- **THEN** the single supervisor owns the child lifecycle and publishes or clears the binding using that configured instance identity

### Requirement: Effective binding diagnostics

BossFang MUST expose the configured inventory, selected default, effective identity-bearing binding, endpoint roles, lifecycle ownership, and structured compatibility diagnostics through its authenticated UAR operator API and dashboard.

#### Scenario: Inspect an accepted binding

- **WHEN** a selected instance passes identity and capability admission
- **THEN** the API and dashboard show its stable identity, ownership, workspace locality, model/runtime/console endpoint roles, profile, capabilities, and compatible status

#### Scenario: Inspect a refused binding

- **WHEN** admission fails
- **THEN** the API and dashboard show a structured diagnostic code and expected versus observed details without exposing credential material

### Requirement: Placement operation limits

BossFang MUST identify current UAR model calls as new-session placement. Live migration and UAR-native run reattachment MUST be represented as unsupported and MUST NOT be inferred from a BossFang session identifier or endpoint change.

#### Scenario: Request unsupported migration

- **WHEN** an operator inspects placement support or requests migration or native-run reattachment
- **THEN** BossFang reports the operation as unsupported and does not create replacement work locally

### Requirement: Endpoint namespaces remain separate

BossFang MUST keep the public A2A URL separate from the UAR model-provider, runtime, and console endpoints.

#### Scenario: Configure a model-provider endpoint

- **WHEN** `[uar].base_url` configures the upstream model-provider endpoint
- **THEN** BossFang does not advertise that URL as its public A2A endpoint
