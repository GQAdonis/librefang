# Spec Delta

## Purpose

Define the cross-product behavior for federated compatibility and release evidence so compatible implementations preserve the architecture and authority boundaries.

## ADDED Requirements

### Requirement: Evidence-bound compatibility

A release MUST advertise only deployment/protocol/schema/policy combinations that passed the operational-mode scenarios on identified builds and hosts.

#### Scenario: 1 — Evidence-bound compatibility

- **WHEN** A new combination is requested without interoperability or recovery evidence
- **THEN** it remains unsupported or explicitly experimental with required features disabled; success on a unit suite cannot certify the combination.

### Requirement: Safe takeover and outcome claims

Automatic cross-host takeover MUST remain disabled until state and effect fencing are demonstrated; release evidence MUST distinguish quality, cost, recovery and unknown outcomes.

#### Scenario: 2 — Safe takeover and outcome claims

- **WHEN** Two hosts can believe they own a recovering run or an external effect has uncertain completion
- **THEN** stale authority cannot commit and recovery reconciles uncertainty without promising exactly-once effects.

### Requirement: Report acceptance coverage

The implementation MUST satisfy all assigned report acceptance clauses below; source-gap reclassification by C01 requires a recorded equivalent or superseding contract.

- REC-057: Coding/design/marketing/feedback/executive-support results report failures and supported confidence limits.
- REC-058: External harness cannot receive protected authority it cannot enforce; negative capability negotiation is demonstrated.
- REC-060: No automatic failover until state/effect fencing is demonstrated; residency chosen from measurements.
- REC-061: Exact provider/consumer/payload pins pass supported deployment modes; rollback preserves migrated data.

#### Scenario: Supported-profile acceptance

- **WHEN** this capability is evaluated for a supported profile
- **THEN** the acceptance evidence identifies each applicable clause above, the exact source/policy/dependency revisions and the observed outcome; any unproven mandatory clause keeps that profile unsupported.
