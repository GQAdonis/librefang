# Spec Delta

## Purpose

Define the cross-product behavior for governed action and approval boundary so compatible implementations preserve the architecture and authority boundaries.

## ADDED Requirements

### Requirement: Verified effect admission

A governed profile MUST deny protected actions when policy or required identity/context is unavailable, and expose the denial posture.

#### Scenario: 1 — Verified effect admission

- **WHEN** A direct, managed, embedded or proxied tool request supplies forged tenant or actor facts, or policy loading fails
- **THEN** the protected effect does not occur and the caller receives a reason without hidden fallback.

### Requirement: Approval revalidation

Approval MUST bind issuer, action, resource, payload digest and authority revision; delayed execution MUST recheck current grants and limits.

#### Scenario: 2 — Approval revalidation

- **WHEN** A granted request waits while its grant is revoked or its payload changes
- **THEN** the old approval cannot authorize the changed or revoked effect.

### Requirement: Report acceptance coverage

The implementation MUST satisfy all assigned report acceptance clauses below; source-gap reclassification by C01 requires a recorded equivalent or superseding contract.

- REC-010: Direct, managed, embedded and proxied paths produce equivalent protected-effect decisions for their advertised profile.
- REC-018: Caller-supplied tenant/actor strings cannot create authority; unsupported multi-hop exchange is rejected.
- REC-019: Repeated challenge is deduplicated; distinct issuer challenges stay distinct and a policy denial remains binding.
- REC-050: Invalid/missing required policy prevents protected effects and exposes effective posture.
- REC-051: A broad permit in one boundary cannot override another denial; compiled policy is proven active.
- REC-052: Revoked or altered approval cannot authorize an effect; exact target/payload identity is retained.

#### Scenario: Supported-profile acceptance

- **WHEN** this capability is evaluated for a supported profile
- **THEN** the acceptance evidence identifies each applicable clause above, the exact source/policy/dependency revisions and the observed outcome; any unproven mandatory clause keeps that profile unsupported.
