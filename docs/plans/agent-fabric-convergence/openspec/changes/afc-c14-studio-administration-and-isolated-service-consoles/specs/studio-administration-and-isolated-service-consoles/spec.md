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

### Requirement: Usable teams in Work precede BossFang integration

The Boss MUST let a user choose a coding team and workspace, submit a natural-language task, follow member activity and streamed outputs/artifacts, decide authoritative approvals, cancel supported work and reopen persisted runs through Work. Team configuration SHALL remain in settings. The implementation MUST reuse the existing UAR kernel, catalog, bindings, typed host IPC and approval contracts; no second scheduler or duplicate team state authority is introduced. The supported customer journey MUST NOT require raw JSON, seeded fixtures or a development-only execution profile. BossFang and unused connector completion MUST NOT gate this journey.

#### Scenario: Coding team from an installed application

- **WHEN** a user chooses the coding preset and a disposable repository workspace in the packaged application, requests a bounded change and approves the permitted effects
- **THEN** workers and reviewer produce attributable results and visible artifacts; after reopening the application the same persisted run and decisions remain understandable, and cancellation follows the supported UAR authority.

### Requirement: Shared UAR identity and lifecycle ownership

In The Boss integrated profile, BossFang MUST delegate to the already selected UAR instance rather than launch or install another UAR. The Boss SHALL supervise its managed UAR and supply a resolved binding with stable runtime identity, current endpoint, compatibility and authenticated admission. Managed-by-Boss, managed-by-BossFang and external ownership MUST be distinct; a consumer MUST NOT stop or reconfigure a process it does not own. Endpoint changes and restarts MUST rebind through the existing supervision/admission contracts, not a hard-coded port. Endpoint possession or copying the host launch token MUST NOT constitute delegated authorization. Unavailable or incompatible UAR MUST produce visible actionable failure without silently changing executor. Standalone BossFang configuration and native execution MUST remain supported without silent migration.

#### Scenario: Restart changes the shared runtime endpoint

- **WHEN** The Boss restarts its UAR on a different available port while BossFang is configured to delegate to that instance
- **THEN** BossFang resolves and authenticates the updated binding, preserving the intended instance relationship; it neither starts a second UAR nor switches executor, and any unresolved compatibility or admission failure remains visible.

#### Scenario: External instance ownership

- **WHEN** the selected UAR is externally managed or BossFang attempts a lifecycle operation on a Boss-owned instance
- **THEN** only the owning supervisor can perform the operation, and the UI identifies the owner and the appropriate configuration surface.

### Requirement: Single authority for delegated execution

BossFang MUST own its workflow schedules, triggers and orchestration records; UAR MUST own delegated agent/team member scheduling, execution checkpoints and tool effects. Stable catalog/run/workflow identifiers SHALL correlate state without independently editable duplicate definitions, a second delegated agent loop, or replayed effects. Existing approval and budget reservation/settlement authorities MUST remain authoritative across both surfaces, without duplicate prompts, reservations or charges for the same operation. Model bindings SHOULD reuse configured liter-llm/UAR connections and expose the effective model without redundant credential entry. Shared storage services MUST preserve memory namespaces and access scopes; sharing a server grants no cross-scope access. The Boss owns conversation history and presents links to the owning configuration interface.

#### Scenario: One workflow delegates one team execution

- **WHEN** a BossFang workflow delegates to a UAR team and The Boss displays both orchestration and member execution
- **THEN** identifiers correlate one authoritative run, effect and decision; approval or cancellation reaches that authority once, budget settlement remains singular, and scoped memory is not exposed to other teams.

### Requirement: MiniApp acceptance includes shared-runtime delegation

C14.4 MUST provide the pinned BossFang executable, functional dashboard assets and supervision packaging needed to operate shared-UAR delegation before C14.3. C14.3 SHALL consume that payload and retain its original packaging/lifecycle requirements through exact C14.4 evidence, then deliver Apps/settings entry points and isolated MiniApp sessions/navigation. The managed BossFang MiniApp MUST embed its real packaged dashboard and follow C14.4 shared-instance integration and usable-team deliveries. An Apps tile, a healthy port or an external-daemon shortcut alone MUST NOT satisfy managed MiniApp acceptance.

#### Scenario: Packaged dashboard controls the integrated workflow

- **WHEN** the user opens BossFang from Apps or settings on the supported customer packages
- **THEN** its isolated dashboard permits a real configuration action and a workflow delegates to the same UAR used by Work, with observable execution, approval and cancellation and without a second UAR process.
