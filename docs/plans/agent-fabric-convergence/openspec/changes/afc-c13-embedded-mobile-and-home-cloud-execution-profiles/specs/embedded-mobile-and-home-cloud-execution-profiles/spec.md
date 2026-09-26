# Spec Delta

## Purpose

Define the cross-product behavior for embedded mobile and home/cloud execution profiles so compatible implementations preserve the architecture and authority boundaries.

## ADDED Requirements

### Requirement: Truthful deployment profiles

UAR deployment profiles MUST declare supported embedding, storage, tools and governance capabilities independently of BossFang, Gate, Fabric or The Boss availability.

#### Scenario: 1 — Truthful deployment profiles

- **WHEN** A mobile or embedded host lacks a required sandbox, tool or governance facility
- **THEN** the affected capability refuses admission or uses an explicitly selected constrained profile without silently expanding authority.

### Requirement: Mobile suspension and remote placement

Mobile suspension and home/cloud disconnection MUST have explicit queue, retention and resumption semantics; a device MUST NOT promise perpetual background residency.

#### Scenario: 2 — Mobile suspension and remote placement

- **WHEN** The mobile process is suspended while an observer or remote workflow has admitted work
- **THEN** durable work is resumed or a documented gap is surfaced; selecting a new host does not silently migrate the existing session.

### Requirement: Report acceptance coverage

The implementation MUST satisfy all assigned report acceptance clauses below; source-gap reclassification by C01 requires a recorded equivalent or superseding contract.

- REC-020: Each required/optional service and loss behavior is explicit and exercised for the chosen profile.
- REC-021: Route inventory and migration preserve behavior; exactly one loop owns each run.
- REC-036: A schedule fires once under one owner; suspended local work never masquerades as remotely running.

#### Scenario: Supported-profile acceptance

- **WHEN** this capability is evaluated for a supported profile
- **THEN** the acceptance evidence identifies each applicable clause above, the exact source/policy/dependency revisions and the observed outcome; any unproven mandatory clause keeps that profile unsupported.

### Requirement: Profile prerequisite gates

Acceptance MUST be profile-specific: standalone embedding requires C04/C06; enterprise-sync additionally requires C11; personal-peer or home/cloud private-context profiles require C12; combined profiles require both. Private-context upload MUST stay blocked until its governing grant boundary is proven.

#### Scenario: Premature profile activation

- **WHEN** a peer/home-cloud or enterprise-sync profile is requested before its specific data and grant prerequisites pass
- **THEN** that profile refuses activation while an independently accepted standalone profile remains available.

### Requirement: Mode-specific release evidence

A C13 profile MUST NOT be advertised as supported until C18 passes its mode-specific compatibility/recovery/release evidence. Feature implementation acceptance alone MUST NOT confer release eligibility.

#### Scenario: Implemented but unreleased home profile

- **WHEN** home/personal-cloud implementation acceptance passes while C18 evidence for that mode remains pending
- **THEN** the mode remains unreleased or explicitly experimental and cannot be advertised as supported.
