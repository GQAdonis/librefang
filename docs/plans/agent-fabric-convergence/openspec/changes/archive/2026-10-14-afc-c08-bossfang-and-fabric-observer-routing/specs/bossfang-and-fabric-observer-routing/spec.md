# Spec Delta

## Purpose

Define the cross-product behavior for bossfang and fabric observer routing so compatible implementations preserve the architecture and authority boundaries.

## ADDED Requirements

### Requirement: Deterministic channel routing

Channel routes MUST bind provider/account/workspace/room/thread/sender and chosen recipient, with explicit handler precedence and observer-copy rights.

#### Scenario: 1 — Deterministic channel routing

- **WHEN** A channel message matches two handlers and two observer subscriptions, then the bridge restarts
- **THEN** the declared conflict rule determines the handler and only authorized observers receive independent copies; affinity remains stable.

### Requirement: Cross-boundary reaction controls

Forwarded events MUST preserve source occurrence and separate disclosure, delivery, execution and reply permissions; reaction depth, fanout and duplicate effects MUST be bounded.

#### Scenario: 2 — Cross-boundary reaction controls

- **WHEN** An agent reply echoes through the channel into an A-B-A observer chain or a queued grant is revoked
- **THEN** duplicate effects and unauthorized replies are blocked, causal budgets terminate the loop, and queued revoked content is withheld.

### Requirement: Report acceptance coverage

The implementation MUST satisfy all assigned report acceptance clauses below; source-gap reclassification by C01 requires a recorded equivalent or superseding contract.

- REC-024: Cancel reaches the owning runtime or reports unsupported; stopping delivery is labeled detach.
- REC-031: Host authorizes requested filter; channel/account/thread provenance survives the bridge.
- REC-032: Two handler matches have an explicit winner/conflict; observing does not grant posting.
- REC-033: Historical replay cannot repost; A-to-B-to-A chains stop within declared budgets.

#### Scenario: Supported-profile acceptance

- **WHEN** this capability is evaluated for a supported profile
- **THEN** the acceptance evidence identifies each applicable clause above, the exact source/policy/dependency revisions and the observed outcome; any unproven mandatory clause keeps that profile unsupported.
