# Spec Delta

## Purpose

Define the cross-product behavior for authoritative business data and offline commands so compatible implementations preserve the architecture and authority boundaries.

## ADDED Requirements

### Requirement: Business authority and read replicas

Forge business writes MUST remain server-authoritative; read projections MUST disclose freshness and permission scope separately from personal peer documents.

#### Scenario: 1 — Business authority and read replicas

- **WHEN** An offline client views stale data and submits a business write against a changed version
- **THEN** the view reports freshness and the server accepts, rejects or conflicts the command through the authoritative API.

### Requirement: Durable offline command outcomes

Offline business commands MUST retain stable identity and expose queued, accepted, rejected, conflicted or uncertain outcomes without treating transport acknowledgement as acceptance.

#### Scenario: 2 — Durable offline command outcomes

- **WHEN** A command is resent after reconnect or its response is lost
- **THEN** the client reconciles one authoritative outcome or a visible uncertain state, without duplicate business effects.

### Requirement: Report acceptance coverage

The implementation MUST satisfy all assigned report acceptance clauses below; source-gap reclassification by C01 requires a recorded equivalent or superseding contract.

- REC-015: Tenant-filtered updates/deletes survive disconnect or explicitly require a resnapshot.
- REC-016: Crash/retry retains one command identity; domain commit is distinct from broker acknowledgement.
- REC-025: GraphQL/REST/reflection effects enforce the declared contract and documented differences.

#### Scenario: Supported-profile acceptance

- **WHEN** this capability is evaluated for a supported profile
- **THEN** the acceptance evidence identifies each applicable clause above, the exact source/policy/dependency revisions and the observed outcome; any unproven mandatory clause keeps that profile unsupported.
