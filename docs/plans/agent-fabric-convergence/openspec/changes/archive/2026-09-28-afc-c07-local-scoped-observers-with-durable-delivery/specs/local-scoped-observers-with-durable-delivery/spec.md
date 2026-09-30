# Spec Delta

## Purpose

Define the cross-product behavior for local scoped observers with durable delivery so compatible implementations preserve the architecture and authority boundaries.

## ADDED Requirements

### Requirement: Scoped independent subscriptions

Each observer MUST have its own authorized source-agent/conversation intersection, projection, delivery cursor and acknowledgement.

#### Scenario: 1 — Scoped independent subscriptions

- **WHEN** Two observers subscribe to overlapping conversations but have different access grants
- **THEN** each receives its own permitted projection and neither receives unauthorized conversation content.

### Requirement: Durable delivery and revocation

Committed event publication and observer admission MUST recover from interruptions with stable occurrence identity; queued content MUST be checked against current authority.

#### Scenario: 2 — Durable delivery and revocation

- **WHEN** The source or observer crashes at publication, admission or acknowledgement, and a subscription is revoked before recovery
- **THEN** recoverable authorized work resumes without silent gaps; revoked queued content is withheld and any retention gap is visible.

### Requirement: Report acceptance coverage

The implementation MUST satisfy all assigned report acceptance clauses below; source-gap reclassification by C01 requires a recorded equivalent or superseding contract.

- REC-029: Crash between source commit, publication and inbox admission does not silently lose admitted work.
- REC-030: Two observers have independent cursors; agent-A/conversation-C scope excludes other conversations.
- REC-034: Attach has no unreported gap; expired retention reports missing coverage and resnapshot choices.

#### Scenario: Supported-profile acceptance

- **WHEN** this capability is evaluated for a supported profile
- **THEN** the acceptance evidence identifies each applicable clause above, the exact source/policy/dependency revisions and the observed outcome; any unproven mandatory clause keeps that profile unsupported.
