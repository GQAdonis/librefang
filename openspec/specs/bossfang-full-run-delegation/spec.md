# bossfang-full-run-delegation Specification

## Purpose
TBD - created by archiving change afc-c05-full-run-delegation. Update Purpose after archive.

## Requirements

### Requirement: Complete runs use a distinct control path

BossFang MUST invoke UAR complete runs through the versioned full-harness client rather than `LlmDriver`, and MUST NOT replay UAR-owned tool calls.

#### Scenario: Model provider remains unchanged

- **WHEN** an agent selects `provider = "uar"`
- **THEN** the existing completion driver behavior remains in effect and no full-run task is admitted.

#### Scenario: Full-run delegation has one executor

- **WHEN** BossFang admits a full UAR run
- **THEN** UAR owns the execution loop and BossFang retains only a correlation projection.

#### Scenario: Selected instance is outside the managed sidecar boundary

- **WHEN** the selected UAR instance is external-local, remote or outside the managed loopback endpoint
- **THEN** BossFang refuses full-run admission under ADR 0001 placement S1, while model-provider access remains separate.

### Requirement: Admission is retry-safe

BossFang MUST persist a stable admission ID and canonical digest before the first admission request and MUST reconcile any uncertain response by that same ID.

#### Scenario: Admission response is lost

- **WHEN** the admission request may have reached UAR but its response is lost
- **THEN** BossFang looks up the same admission ID and does not issue another admission identity while the outcome is unresolved.

#### Scenario: Admission identity is rebound

- **WHEN** a caller attempts to reuse an admission ID with different canonical inputs
- **THEN** the operation is refused as `admission_digest_conflict` before another run is launched.

#### Scenario: Admission captures the runtime epoch

- **WHEN** BossFang prepares a new full-run admission
- **THEN** it reads the authenticated UAR capabilities contract and durably records the current runtime epoch before sending `POST /tasks`.

#### Scenario: Runtime restarts while admission is unresolved

- **WHEN** the current capability epoch differs from the epoch stored before the uncertain admission
- **THEN** BossFang records `recovery_unsupported` and does not replay the admission.

### Requirement: Projection preserves control identity

The kernel-owned A2A task store MUST retain BossFang task ID, original authenticated principal, admission ID and digest, selected instance/effective binding, exact definition identity and diagnostics, native UAR task/run IDs, lifecycle and cancellation state, cursor, epoch and retention.

#### Scenario: Process reconnects

- **WHEN** BossFang restarts and reads a persisted delegated task
- **THEN** lookup can reconcile it using the retained admission and native identities and truthfully reports unsupported or expired retention.

#### Scenario: Process exits between local persistence and remote admission

- **WHEN** BossFang establishes a new durable delegation before the UAR request
- **THEN** the A2A task and delegation projection commit atomically, so restart cannot recover one without the other.

#### Scenario: UAR accepts a run

- **WHEN** BossFang receives an admitted, submitted or working receipt
- **THEN** the projection retains `not_dispatched` because execution state alone is not evidence of an external effect.

### Requirement: Controls preserve lifecycle semantics

BossFang MUST expose lookup, observe, approve, cancel and detach as distinct operations, and MUST expose steering support or refusal as a typed result.

#### Scenario: Cancellation is acknowledged but not terminal

- **WHEN** UAR accepts cancellation while the run is still stopping
- **THEN** the projection records cancellation acknowledgement separately from terminal cancelled state.

#### Scenario: Steering is unsupported

- **WHEN** UAR reports that an admitted run cannot be steered
- **THEN** BossFang returns a typed unsupported result and does not create another message or run.

#### Scenario: Controls use the frozen UAR protocol

- **WHEN** BossFang controls a delegated task
- **THEN** it uses the snake_case `/api/uar/full-harness/v1` wire, sends the managed sidecar launch bearer, `x-uar-workspace-id` and the retained original user as `x-uar-principal`, supplies the current revision for mutations, and observes events with `last_event_id`.

#### Scenario: Caller observes incrementally

- **WHEN** a caller asks for events after a cursor
- **THEN** BossFang consumes only the first complete non-empty SSE batch, persists its greatest cursor, returns that batch, and requires a later request to continue observation.

#### Scenario: UAR returns a different effective binding

- **WHEN** a receipt does not match the admitted instance, profile, workspace locality, endpoint roles, capabilities, credential reference or deployment binding
- **THEN** BossFang refuses to project it as the selected C04 service binding.

### Requirement: Externally visible task lookup has one BossFang authority

Root A2A task lookup and cancellation MUST use the kernel-owned `A2aTaskStore`; the static UAR route store MUST NOT remain a second authority.

#### Scenario: Delegated task is queried through A2A

- **WHEN** a caller queries a delegated task through the existing A2A method
- **THEN** it resolves the same projection used by full-run controls and returns the current UAR-reconciled state.

#### Scenario: Delegated task is cancelled through A2A

- **WHEN** a caller cancels a delegated task through the existing A2A method
- **THEN** the shared `UarRunControl` forwards cancellation to UAR and projects the authoritative receipt without running a local cancellation loop.
