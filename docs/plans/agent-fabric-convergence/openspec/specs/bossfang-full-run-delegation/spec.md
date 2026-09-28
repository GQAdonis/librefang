# bossfang-full-run-delegation Specification

## Purpose
Define the cross-product behavior for bossfang full-run delegation so compatible implementations preserve the architecture and authority boundaries.

## Requirements

### Requirement: One delegated executor

Full-run delegation MUST be distinct from model-provider bridging; a delegated run MUST have exactly one tool/token-loop executor.

#### Scenario: 1 — One delegated executor

- **WHEN** BossFang chooses native execution, UAR provider access or full UAR delegation
- **THEN** the observable execution trace identifies which runtime owns the loop and BossFang does not replay delegated tools.

### Requirement: Recoverable control identity

Delegated run control MUST preserve native IDs and reconcile uncertain admission before retries; cancellation and detachment MUST have distinct semantics.

#### Scenario: 2 — Recoverable control identity

- **WHEN** An admission response is lost and the caller reconnects, then cancels the recovered task
- **THEN** lookup returns the existing task or a truthful unresolved state; cancellation reaches its executor and no duplicate effect is launched.

### Requirement: Report acceptance coverage

The implementation MUST satisfy all assigned report acceptance clauses below; source-gap reclassification by C01 requires a recorded equivalent or superseding contract.

- REC-001: One traced delegated operation has one executor and one set of tool effects.
- REC-005: Dropped admission/cancel responses recover without double execution; cancellation acknowledgement is not completion.
- REC-013: Every exposed task resolves to one authoritative record and accurately advertised persistence.

#### Scenario: Supported-profile acceptance

- **WHEN** this capability is evaluated for a supported profile
- **THEN** the acceptance evidence identifies each applicable clause above, the exact source/policy/dependency revisions and the observed outcome; any unproven mandatory clause keeps that profile unsupported.
