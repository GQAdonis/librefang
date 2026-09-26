# Spec Delta

## Purpose

Define the cross-product behavior for executive assistants and consented human representation so compatible implementations preserve the architecture and authority boundaries.

## ADDED Requirements

### Requirement: Consented representation and office grants

Executive assistance MUST distinguish role assistance, simulation, disclosed human representation and delegated organizational action through separate trusted grants.

#### Scenario: 1 — Consented representation and office grants

- **WHEN** A human authorizes a personal twin but the organization has not granted spending authority
- **THEN** the twin may perform permitted personal representation and cannot spend organizational funds.

### Requirement: Revocation and human separation

Offboarding, expiry and revocation MUST block new protected access/effects; a simulated human approval MUST NOT satisfy a required real-human decision.

#### Scenario: 2 — Revocation and human separation

- **WHEN** An offboarded executive twin attempts an action or generates a simulated approval
- **THEN** the effect is denied and the audit records the governing grant state and unmet real-human requirement.

### Requirement: Report acceptance coverage

The implementation MUST satisfy all assigned report acceptance clauses below; source-gap reclassification by C01 requires a recorded equivalent or superseding contract.

- REC-048: CEO/CFO/CIO/intelligence/security/marketing/product role titles confer no privileges.
- REC-049: Offboarding and revocation stop new access/effects; a twin cannot satisfy required human approval.

#### Scenario: Supported-profile acceptance

- **WHEN** this capability is evaluated for a supported profile
- **THEN** the acceptance evidence identifies each applicable clause above, the exact source/policy/dependency revisions and the observed outcome; any unproven mandatory clause keeps that profile unsupported.
