# Spec Delta

## Purpose

Define the cross-product behavior for bounded teams and shared task board so compatible implementations preserve the architecture and authority boundaries.

## ADDED Requirements

### Requirement: Fenced task ownership

Teams MUST record versioned membership, task inputs/outputs/dependencies and atomic claims; child authority MUST be no broader than its delegated grant.

#### Scenario: 1 — Fenced task ownership

- **WHEN** Two workers claim one task revision and an old worker returns after reassignment
- **THEN** only one current claim can complete or authorize effects and the stale result remains nonauthoritative evidence.

### Requirement: Team resource and context isolation

Teams MUST enforce aggregate budgets, scoped memory/artifacts and independent reviewer authority with explicit parent and peer lifetime rules.

#### Scenario: 2 — Team resource and context isolation

- **WHEN** A member is removed or a parent is cancelled while workers spend from the shared budget
- **THEN** new effects from revoked workers are denied, aggregate reservations cannot overspend, and unrelated authorized peers retain their declared lifetime.

### Requirement: Report acceptance coverage

The implementation MUST satisfy all assigned report acceptance clauses below; source-gap reclassification by C01 requires a recorded equivalent or superseding contract.

- REC-008: Mirrored usage counted once; concurrent children cannot exceed reserved aggregate limits.
- REC-043: Team tasks execute through the trusted existing host with original lineage and attenuation.
- REC-044: Stale assignment cannot commit; removal prevents new access; peer team is not forced into one parent thread.
- REC-045: No implicit team-wide private memory union; cross-tenant reads and writes are denied.

#### Scenario: Supported-profile acceptance

- **WHEN** this capability is evaluated for a supported profile
- **THEN** the acceptance evidence identifies each applicable clause above, the exact source/policy/dependency revisions and the observed outcome; any unproven mandatory clause keeps that profile unsupported.
