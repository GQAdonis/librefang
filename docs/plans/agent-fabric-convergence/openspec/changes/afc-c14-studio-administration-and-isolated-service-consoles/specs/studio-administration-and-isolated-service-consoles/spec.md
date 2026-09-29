# Spec Delta

## Purpose

Define the cross-product behavior for studio administration and isolated service consoles so compatible implementations preserve the architecture and authority boundaries.

## ADDED Requirements

### Requirement: Common studio administration

The Boss MUST expose effective runtime binding, ownership, policy posture, lifecycle, budget, approvals and subscription state across local and remote instances.

The D01 delivery MAY expose C06 lifecycle and C07 local observer state sooner through the existing Boss UAR settings, but SHALL NOT claim this complete requirement until team/workflow, budget, approval and remote-instance obligations are met. The early UI SHALL reflect provider capabilities and preserve two-workspace isolation.

#### Scenario: 1 — Common studio administration

- **WHEN** An operator connects two runtimes and an externally managed BossFang service
- **THEN** the UI identifies each instance and permits only authorized controls without conflating product history with runtime checkpoints.

### Requirement: Isolated service console

BossFang channel administration MUST remain in its isolated authenticated console surface; embedding MUST preserve origin, credential and navigation boundaries.

#### Scenario: 2 — Isolated service console

- **WHEN** A console redirects, attempts privileged host operations or targets an untrusted origin
- **THEN** the host does not disclose credentials or grant ambient mini-app privileges and offers a controlled failure path.

### Requirement: Report acceptance coverage

The implementation MUST satisfy all assigned report acceptance clauses below; source-gap reclassification by C01 requires a recorded equivalent or superseding contract.

- REC-009: Per-instance/account isolation, restricted origin, credential handoff and external-browser fallback are exercised.
- REC-023: Rendered action reaches its bound authority with current identity; the rendering host cannot mint authority.

#### Scenario: Supported-profile acceptance

- **WHEN** this capability is evaluated for a supported profile
- **THEN** the acceptance evidence identifies each applicable clause above, the exact source/policy/dependency revisions and the observed outcome; any unproven mandatory clause keeps that profile unsupported.
