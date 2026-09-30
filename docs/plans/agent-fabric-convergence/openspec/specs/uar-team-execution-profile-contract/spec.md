# UAR team execution profile contract

## Purpose

Provide operators and implementation owners with an approved, source-backed UAR team execution profile and bounded repair handoff while keeping documentation completion distinct from working runtime delivery.

## Requirements

### Requirement: Approved execution contract
The architecture change SHALL publish a versioned contract recording operator approval, source provenance, implemented versus proposed behavior, and exact ownership, provider, context, messaging and continuation semantics.

#### Scenario: Plan awaits approval
- **WHEN** the plan is complete but architecture approval is absent
- **THEN** execution remains unapproved and no production implementation or runtime conformance is recorded

#### Scenario: Approved contract is finalized
- **WHEN** the operator approves D1–D5
- **THEN** the contract records that approval and the accepted decisions, including authenticated authorized recovery and directed-edge authorization before inbox visibility or admission

### Requirement: Explicit compatibility and migration
The published contract SHALL identify every newly refused legacy declaration, its former behavior, diagnostic, remediation and capability disposition without rewriting user documents or asserting unsupported runtime capabilities.

#### Scenario: Nonempty unconsumed declaration
- **WHEN** a legacy context, history or memory-grant declaration has no implemented consumer
- **THEN** the migration table identifies required-by-default refusal and explains the supported remediation; empty declarations retain compatibility

### Requirement: Bounded parent implementation handoff
The change SHALL hand off delivery A to pending C09.3 and proposed delivery B to an explicitly approved scope revision with repository/file ownership, dependency order, real operation criteria and deferred owners.

#### Scenario: First product delivery is selected
- **WHEN** the parent resumes after child closeout
- **THEN** its handoff requires complete A production wiring followed by the Mac build, launch and actual member operation gate before B; no documentation task credits C09.3

#### Scenario: Durable team continuation is planned
- **WHEN** delivery B is handed off
- **THEN** the operation contract includes one-slot yield/resume, all-target completion, failed/cancelled target outcomes, cycle refusal, reassignment/revocation, duplicate/restart recovery and forbidden directed-edge non-disclosure

### Requirement: Truthful lifecycle and cadence restoration
The change SHALL preserve the parent's continuous clock, immutable evidence and publication obligation and SHALL restore the parent only through supported canonical KBD and Cadence interfaces after reflection and archival.

#### Scenario: Documentation child completes
- **WHEN** contracts and handoff are complete and the child is reflected, archived and canonically closed
- **THEN** parent C09.3 resumes with its product work still pending, prior delivery count unchanged and child time included

#### Scenario: Review has a bounded limitation
- **WHEN** the two-round review ends with a correction made after the final reviewer response
- **THEN** findings and the correction are retained and no independent confirmation or runtime certification is claimed

