# Spec Delta

## Purpose

Define the cross-product behavior for replaceable service instances and placement so compatible implementations preserve the architecture and authority boundaries.

## ADDED Requirements

### Requirement: Explicit replaceable binding

Clients MUST bind a run to a verified service instance and compatible capability profile, with credential references rather than embedded credentials.

#### Scenario: 1 — Explicit replaceable binding

- **WHEN** A user selects between two UAR instances or selects an instance missing a mandatory feature
- **THEN** new work uses the selected compatible instance or refuses admission with a specific diagnostic.

### Requirement: Lifecycle ownership

Only the registered lifecycle owner MAY stop or replace a managed service; clients MUST distinguish reattachment from new-session placement and migration.

#### Scenario: 2 — Lifecycle ownership

- **WHEN** A nonowner client closes while a remote service has active runs
- **THEN** the service keeps running; reconnect preserves the native run identity without silently creating a replacement.

### Requirement: Report acceptance coverage

The implementation MUST satisfy all assigned report acceptance clauses below; source-gap reclassification by C01 requires a recorded equivalent or superseding contract.

- REC-002: Closing a nonowner client cannot stop a service; workflow and child identities remain separate.
- REC-003: Two UAR instances are selectable; wrong identity/version/required capability is visibly refused.
- REC-004: A timed-out remote run is reconciled by identity and never silently started locally.

#### Scenario: Supported-profile acceptance

- **WHEN** this capability is evaluated for a supported profile
- **THEN** the acceptance evidence identifies each applicable clause above, the exact source/policy/dependency revisions and the observed outcome; any unproven mandatory clause keeps that profile unsupported.
