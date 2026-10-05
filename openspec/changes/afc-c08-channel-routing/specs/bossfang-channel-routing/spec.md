# Spec Delta

## Purpose

Give each supported channel message one durable, authorized handler decision and replay-safe observer delivery while preserving the channel's source and reply scope across hosts.

## ADDED Requirements

### Requirement: Channel occurrences carry complete source identity

BossFang MUST record a stable occurrence identity and normalized provider, account, workspace, room, thread, sender, and native message identity before admitting a supported channel message to durable routing. An adapter lacking a stable provider message identity or required scope MUST report an unsupported replay-safe profile; a process-generated identifier MUST NOT be presented as provider replay identity.

#### Scenario: Same native message is redelivered
- **WHEN** a provider redelivers the same message after the channel bridge restarts
- **THEN** BossFang resolves the existing occurrence and does not create a second handler action or observer source event.

#### Scenario: Adapter omits stable message identity
- **WHEN** an adapter supplies no stable provider message ID
- **THEN** BossFang does not claim durable cross-host or replay-safe observer delivery for that message.

### Requirement: A route declares exactly one handler or a conflict

BossFang MUST distinguish the handler from observers. Explicit authorized recipient selection takes precedence over retained affinity; retained affinity takes precedence over configured binding, direct route, user default, channel default, and system default. Equal-priority matches to distinct handlers MUST produce an inspectable conflict rather than selecting the first iteration result. An explicit authorized reassignment MUST increment the durable route revision.

#### Scenario: Two equally specific handlers match
- **WHEN** two equally authoritative channel bindings choose different handlers for the same occurrence
- **THEN** no handler is dispatched and the route reports a conflict with the candidate identities.

#### Scenario: Bridge restarts with a retained route
- **WHEN** a bridge restarts after a handler was selected for a channel thread
- **THEN** the next message in that normalized scope uses the retained handler and route revision unless an authorized explicit reassignment changes it.

#### Scenario: Affinity holder is unavailable
- **WHEN** the retained handler cannot be resolved or is no longer eligible
- **THEN** the route reports a recoverable unavailable decision rather than silently falling through to a different agent.

### Requirement: Shared routing storage preserves host-local daemon configuration

BossFang hosts sharing durable route and channel state MUST resolve persisted daemon configuration overrides within a stable host-local scope. The primary scope input MUST be `BOSSFANG_CONFIG_STORE_SCOPE`, with `LIBREFANG_CONFIG_STORE_SCOPE` accepted as a compatibility fallback. Shared runtime state MUST NOT cause one host to load another host's sidecar endpoint or other daemon-local override.

#### Scenario: Two BossFang hosts restart against one route database
- **WHEN** two hosts with distinct config-store scopes share one SurrealDB route database and restart
- **THEN** each host restores the sidecar configuration persisted for its own scope while continuing to share route and channel state.

### Requirement: Observer copies require independent current authority

BossFang MUST authorize source disclosure before presenting an occurrence to a subscriber and MUST authorize recipient delivery before each queued copy is released. Observing MUST NOT confer handler execution or channel posting rights. A UAR recipient MUST additionally pass its own execution and binding authority. The initial C07 local observer capability MUST NOT be represented as supporting channel-source or cross-host observation until an explicit compatible extension is accepted.

#### Scenario: Source disclosure is allowed but delivery is revoked
- **WHEN** a copy is queued and the recipient delivery grant is revoked before release
- **THEN** no source content reaches that recipient and the withheld result is visible to the operator.

#### Scenario: Observer has no reply grant
- **WHEN** an observer receives an authorized copy but requests a channel reply
- **THEN** BossFang refuses the post unless a separate reply action and matching scope grant were explicitly authorized.

### Requirement: Transport preserves provenance without taking execution ownership

Forwarded copies MUST retain source occurrence ID, normalized channel scope, chosen handler identity, route revision, original principal, causal lineage, and policy/binding revision references. Each observer MUST have an independent delivery cursor; a Fabric consumer-group offset MUST NOT stand in for that cursor. Fabric transports delivery and replay; UAR or the designated BossFang handler remains the sole execution-loop owner.

#### Scenario: Two observers reconnect at different positions
- **WHEN** two authorized observers reconnect after one has advanced farther than the other
- **THEN** each resumes from its own cursor without changing the handler or the other observer's position.

#### Scenario: Required provenance is absent
- **WHEN** a provider envelope cannot preserve a required source or authority field
- **THEN** BossFang refuses the cross-host observer profile with a typed compatibility result instead of dropping the field.

### Requirement: Replay, replies, and reactions are bounded

Historical replay and observer copies MUST NOT invoke a channel sender. A fresh reply action MUST carry a stable action ID, current reply grant, and exact provider/account/workspace/room/thread target scope; wider or different scope requires a separate grant. BossFang MUST deduplicate provider echoes and action retries by source/action identity. Every forwarded reaction MUST carry nonresetting causal depth, cumulative fanout, and visited-route identity; exhausted budgets or an A-to-B-to-A revisit MUST terminate with an inspectable result.

#### Scenario: Replay includes a prior agent reply
- **WHEN** a previously delivered agent reply reappears through provider echo or Fabric replay
- **THEN** it is recognized by action/source identity and is not posted or executed again.

#### Scenario: Observer tries to answer another room
- **WHEN** an observer action targets a different room, thread, account, or workspace than the source grant
- **THEN** the post is refused without changing the source route.

#### Scenario: A-to-B-to-A reaction chain
- **WHEN** a reaction revisits a route identity already in its causal lineage
- **THEN** forwarding stops even if numeric depth and fanout budget remains.

### Requirement: Control results name their actual authority

BossFang MUST expose channel observation detach separately from cancellation of the owning runtime's execution. A transport stream close MUST NOT be reported as execution cancellation. If the owning runtime cannot cancel, the result MUST say unsupported and preserve the true run state.

#### Scenario: Fabric stream is detached
- **WHEN** a caller stops a Fabric delivery stream while the UAR or BossFang run continues
- **THEN** the response reports detached and the owning runtime remains active.

#### Scenario: Runtime cancellation is unsupported
- **WHEN** an authorized caller requests execution cancellation through a path without a runtime cancel contract
- **THEN** BossFang returns typed unsupported instead of merely detaching a stream and reporting cancelled.
