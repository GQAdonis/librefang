# Spec Delta

## Purpose

Define the cross-product behavior for bounded teams and shared task board so compatible implementations preserve the architecture and authority boundaries.

## ADDED Requirements

### Requirement: Exact execution profile and exclusive catalog owner

Remaining C09.3 implementation MUST preserve route identity, served alias, pricing identity and captured profile/settings as distinct contracts. One catalog execution claim MUST govern admission, dispatch, recovery and effects. Replacement MUST require a privileged authenticated operator, expected epoch, reason and evidence of old executor/child exclusion; elapsed time alone MUST NOT transfer ownership. Known execution output and uncertain accounting MUST remain distinct.

#### Scenario: Corrective delivery A

- **WHEN** two executors share a supported catalog and a member is launched with selected settings
- **THEN** only the current owner can dispatch the exact prepared endpoint/profile; unsupported explicit settings refuse before dispatch; recovery retains uncertain effects without blind replay.

### Requirement: Governed cooperation and durable continuation

Additive C09.4 MUST implement the approved execution profile's four team tools, shared instructions and bounded roster through the existing kernel. Directed edge permissions MUST be checked at disclosure, send and activation. Queue-only messaging MUST NOT activate work. A typed wait MUST stop further model/tool dispatch and join exact child execution before releasing capacity. One durable continuation MUST resume the same task under a new attempt/root and current authority.

#### Scenario: Cooperating pair with one active slot

- **WHEN** an authorized coordinator delegates, waits and yields at capacity one
- **THEN** the worker can run, and one newly authorized coordinator continuation consumes the actual result and completes the request.

#### Scenario: Forbidden or revoked peer edge

- **WHEN** an otherwise valid member requests inbox disclosure, send or delegation on a forbidden or revoked directed edge
- **THEN** the operation refuses without exposing payload or admitting work; membership alone grants no peer permission.

The [architecture recovery amendment](../../architecture-recovery-amendment.md) and its linked execution profile define the full bounds and operation criteria. These are pending implementation requirements, not runtime conformance evidence.

### Requirement: Fenced task ownership

Teams MUST record versioned membership, task inputs/outputs/dependencies and atomic claims; child authority MUST be no broader than its delegated grant.

#### Scenario: 1 — Fenced task ownership

- **WHEN** Two workers claim one task revision and an old worker returns after reassignment
- **THEN** only one current claim can complete or authorize effects and the stale result remains nonauthoritative evidence.

### Requirement: Team resource and context isolation

Teams MUST enforce aggregate budgets, scoped memory/artifacts and independent reviewer authority with explicit parent and peer lifetime rules.

#### Scenario: 2 — Team resource and context isolation

- **WHEN** A member is removed or a parent is cancelled while workers spend from the shared budget
- **THEN** new effects from revoked workers are denied, aggregate reservations cannot overspend, and unrelated authorized peers retain their declared lifetime.

### Requirement: Report acceptance coverage

The implementation MUST satisfy all assigned report acceptance clauses below; source-gap reclassification by C01 requires a recorded equivalent or superseding contract.

- REC-008: Mirrored usage counted once; concurrent children cannot exceed reserved aggregate limits.
- REC-043: Team tasks execute through the trusted existing host with original lineage and attenuation.
- REC-044: Stale assignment cannot commit; removal prevents new access; peer team is not forced into one parent thread.
- REC-045: No implicit team-wide private memory union; cross-tenant reads and writes are denied.

#### Scenario: Supported-profile acceptance

- **WHEN** this capability is evaluated for a supported profile
- **THEN** the acceptance evidence identifies each applicable clause above, the exact source/policy/dependency revisions and the observed outcome; any unproven mandatory clause keeps that profile unsupported.
