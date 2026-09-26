# Spec Delta

## Purpose

Define the cross-product behavior for personal peer sovereignty and consent so compatible implementations preserve the architecture and authority boundaries.

## ADDED Requirements

### Requirement: Personal peer sovereignty

KnowMe personal documents MUST preserve authorized peer synchronization and explicit home/cloud participation, with schema compatibility and recovery policy.

#### Scenario: 1 — Personal peer sovereignty

- **WHEN** A permitted device reconnects after offline edits while a different peer lacks permission
- **THEN** authorized compatible data converges according to document policy and the unauthorized peer receives no new disclosure.

### Requirement: Revocation-aware sharing

Consent and data-use boundaries MUST be enforced for new synchronization and agent access; offline validity limits and residual downloaded copies MUST be disclosed.

#### Scenario: 2 — Revocation-aware sharing

- **WHEN** Sharing is revoked or device credentials are rotated while another peer remains offline
- **THEN** new online access is denied and offline behavior follows the declared bounded policy; the system does not claim remote erasure of already downloaded copies.

### Requirement: Report acceptance coverage

The implementation MUST satisfy all assigned report acceptance clauses below; source-gap reclassification by C01 requires a recorded equivalent or superseding contract.

- REC-014: Authorized peers converge permitted documents; business grants and task ownership cannot be CRDT-written.
- REC-017: Revoked or expired grants cannot authorize fresh protected operations; offline limitations are visible.

#### Scenario: Supported-profile acceptance

- **WHEN** this capability is evaluated for a supported profile
- **THEN** the acceptance evidence identifies each applicable clause above, the exact source/policy/dependency revisions and the observed outcome; any unproven mandatory clause keeps that profile unsupported.
