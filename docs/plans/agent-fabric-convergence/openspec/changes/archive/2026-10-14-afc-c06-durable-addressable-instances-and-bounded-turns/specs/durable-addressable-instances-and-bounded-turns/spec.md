# Spec Delta

## Purpose

Define the cross-product behavior for durable addressable instances and bounded turns so compatible implementations preserve the architecture and authority boundaries.

## ADDED Requirements

### Requirement: Durable logical instance

Request execution, on-demand instances and resident instances MUST expose distinct lifetimes; durable state MUST NOT depend on a permanently active model loop.

#### Scenario: 1 — Durable logical instance

- **WHEN** Two users instantiate the same definition and one activation passivates or crashes
- **THEN** their state remains isolated and admitted work resumes from the correct instance state on activation.

### Requirement: Fenced bounded turns

Instances MUST serialize mutating turns, bound queue/restart/retention policies, and reject stale ownership while keeping administrative cancellation responsive.

#### Scenario: 2 — Fenced bounded turns

- **WHEN** An old activation returns after replacement while a current tool call is blocked
- **THEN** the stale activation cannot commit and authorized cancellation/status control remains available.

### Requirement: Report acceptance coverage

The implementation MUST satisfy all assigned report acceptance clauses below; source-gap reclassification by C01 requires a recorded equivalent or superseding contract.

- REC-006: Viewer loss follows declared policy; restart recovery does not claim missing event replay.
- REC-026: Two tenants instantiate one definition without sharing state; restarts preserve logical identity.
- REC-027: Warm workers get fresh contexts; resident activation is opt-in with measured resource justification.
- REC-028: No identity depends on a private port; stale activation cannot commit protected state.
- REC-035: Cancel/drain respond during blocked turns; repeated activation crashes reach an inspectable failed state.

#### Scenario: Supported-profile acceptance

- **WHEN** this capability is evaluated for a supported profile
- **THEN** the acceptance evidence identifies each applicable clause above, the exact source/policy/dependency revisions and the observed outcome; any unproven mandatory clause keeps that profile unsupported.
