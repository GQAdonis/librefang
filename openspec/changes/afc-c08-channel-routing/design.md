# Design

## Context

See [proposal.md](proposal.md) and [the capability delta](specs/bossfang-channel-routing/spec.md). At the C08 branch baseline, `librefang-channels/src/router.rs` keeps defaults and bindings in process memory, `thread_ownership.rs` explicitly keeps single-process TTL claims, and `bridge.rs` resolves and dispatches from both text and media paths. `SidecarMessageParams.message_id` is optional and currently falls back to a UUID; that fallback cannot recognize a provider replay after restart. `ChannelMessage` and `SenderContext` already carry much of the provider/account/chat/thread context. C05 gives BossFang one UAR full-run executor and distinguishes cancel from detach. C07's passing local gate covers C06 logical-instance source events, not channel occurrences, remote SurrealDB, or distributed observers.

The initiative C08 contract covers BossFang, UAR, Fabric, and Gate. Its D-FRF and D-GATE checkpoints are **not yet adopted immutable provider contracts**. Current Fabric transport has durable offsets and a PEP but lacks the required source/recipient/causal envelope fields, while its `AgentRunControl.cancel` is stream detach. Gate's C02 provider branch is not a cross-host disclosure/delivery grant. The BossFang change must therefore be provider-first at the cross-host boundary, with typed unsupported results until compatible revisions are pinned.

## Goals / Non-Goals

**Goals:** A locally durable channel route/occurrence identity can be completed independently; later Gate/Fabric/UAR adoption enables authorized observer copies and cross-host delivery without changing who executes the agent. One final production integration gate exercises the composed behavior.

**Non-goals:** Inventing a distributed scheduler, treating Fabric group offsets as subscriber cursors, silently promoting C07 local observers to channel-source support, forwarding arbitrary token SSE as durable semantic events, changing provider-specific legacy behavior when required native identity is absent, or moving user credentials into the route store.

## Decisions

### 1. Normalize occurrence and route identity at the BossFang channel boundary

The source adapter constructs a versioned `ChannelScope` from provider, account, workspace, room, thread, and sender. The route key uses the conversation slice (provider/account/workspace/room/thread/sender); the occurrence adds the provider-native message ID. Account is the configured sidecar instance identity if the provider has no separate bot-account ID, and the adapter records which interpretation was used. Unknown required fields do not collapse to an empty string. Only adapters with stable native IDs and complete scope enter the replay-safe profile. Unsupported adapters retain the existing local channel path with an explicit capability status.

The route and occurrence are committed before handler or observer dispatch. Source occurrence and route revision are immutable after admission; a later authorized reassignment creates a new route revision for subsequent occurrences, not a rewrite of history. Use a conditional write/unique key so concurrent host intake of the same native occurrence produces one durable result. Keep provider payload and secrets out of route identity rows; projection policy controls content separately. The in-memory thread registry can remain a hot-path optimization, but the persisted route revision wins after restart or competing host claims. Prefer the existing `librefang-storage` abstraction and a new forward-only SurrealQL migration over a second channel-specific database. The supported cross-host profile requires a shared remote SurrealDB 3.3.0 store; embedded/local storage remains one-host only. The upstream-compatible SQLite fallback retains legacy behavior and reports the new durable profile unsupported unless it gains equivalent storage.

Shared route, occurrence, action, and observer state does not make daemon configuration global. Each BossFang process supplies a stable host-local config-store scope, using `BOSSFANG_CONFIG_STORE_SCOPE` with `LIBREFANG_CONFIG_STORE_SCOPE` as the compatibility fallback. Persisted `config_overrides` are resolved inside that scope, so two hosts sharing the route database retain their own sidecar endpoint and other daemon-local settings across restart. The C08 operation uses its stable `bossA` and `bossB` process names as those scopes.

**Alternative rejected:** Reuse the current `ThreadOwnershipRegistry` as authority. Its `Instant` TTL and process-local map cannot survive restart or coordinate hosts. **Alternative rejected:** Derive idempotency from a generated UUID. The UUID changes on redelivery.

### 2. Define handler precedence and a durable conflict outcome

Resolve one handler with this order: explicitly authorized target or mention; retained durable route affinity; most-specific configured binding; direct route; user default; channel instance default; system default. Within a precedence tier, distinct equal-priority destinations are a conflict; identical destinations coalesce. A configured binding is not allowed to displace a valid retained route. An explicit authorized reassignment is the only route revision transition. Missing/ineligible affinity yields a visible recovery state and does not silently route elsewhere. Persist decision reason and candidate identities without exposing private source content. Both text and media dispatch consume the same decision, avoiding divergent routing paths.

**Alternative rejected:** Stable-sort and take the first binding. Source enumeration order is not an operator policy and may drift after reload.

### 3. Separate source disclosure, delivery, execution and reply

The BossFang source adapter publishes a metadata-only occurrence and a policy-filtered copy. Gate must authorize requested source filter and recipient delivery at current grant revision, including a recheck immediately before queue release. UAR must accept a channel-source observer profile explicitly and retain independent per-observer cursors; its C07 local subscription API cannot be used as proof of this extension. The selected handler or UAR run owns execution; an observer is never a handler merely because it received a copy. A reply is a separate, currently authorized effect scoped to the exact source provider/account/workspace/room/thread; a different target requires a separately granted action. Original caller and actor identities travel separately. In-flight revocation yields a withheld/uncertain result where an effect boundary has already been crossed, not a fabricated rollback.

**Alternative rejected:** Fan out by adding all observers to BossFang's existing broadcast handler list. Broadcast dispatch executes agents and can post replies; observation is a different authority.

### 4. Forward an envelope, not execution control

The transport envelope needs a stable occurrence ID; provider/account/workspace/room/thread/sender provenance; route and handler revision; original principal; payload classification; subscriber identity; independent cursor; policy/binding revision; and causal metadata. Fabric's durable offset only locates a transport record. Its PEP checks transport admission, while Gate provides disclosure/delivery grants and the receiving runtime checks execution authority. Required fields are versioned; old envelopes remain readable for legacy transport but cannot enter the new cross-host observer profile. Replaying a transport record never calls the channel sender. `detach` stops a stream; `cancel` delegates to the actual runtime or returns unsupported.

**Alternative rejected:** Call Fabric `AgentRunControl.cancel` and report UAR cancellation. Its current behavior detaches a stream and does not govern the execution loop.

### 5. Bound causal effects and re-entry

Each reaction preserves its root occurrence, parent action, action ID, visited route identities, remaining depth, and cumulative fanout budget. Admission decrements remaining budgets atomically with the new action/copy and refuses a repeated route identity. Provider echo carries or is reconciled to the outbound action ID; redelivery and uncertain sends reuse that ID. A copy is never an implicit post. Budget exhaustion and suppression are operator-visible terminal outcomes. Initial default maxima are depth 4 and total fanout 8 per root; deployment policy may lower them but cannot raise them without a versioned policy revision. No downstream host resets counters.

**Alternative rejected:** TTL-only or per-hop local counters; both permit an A-B-A chain to restart its budget at another host.

## Repository ownership and delivery order

1. **C08.1 BossFang local source and route slice, no cross-host enablement.** The general channel-code implementer owns `crates/librefang-channels/src/{router.rs,bridge.rs,thread_ownership.rs,types.rs,sidecar.rs,lib.rs}` and may add a focused `channel_route*.rs` module in that crate. The BossFang storage owner owns `crates/librefang-storage/src/{lib.rs,channel_routes.rs,migrations/mod.rs,migrations/sql/<next-free>_channel_routes.surql}` plus the equivalent storage-facade integration if its actual source layout differs. The handoff between them is a typed occurrence/scope/decision contract, agreed before either edits shared call sites. No other agent edits these files concurrently. This slice persists source occurrence, deterministic conflict, and route affinity and exposes a local capability result; it does not dispatch observer copies.
2. **C08.2 provider contracts and source-to-observer bridge.** Record exact accepted Gate grant and Fabric envelope/control revisions first, then implement provider changes in their own repositories and pin them. UAR adds an explicit channel-source adapter and independent subscriber cursor in its own repository. BossFang consumes only those pinned contracts in its channel/API/storage surface. A provider rejection keeps cross-host profile disabled; it does not block C08.1 local work. No shared Rust target directory has parallel build writers.
3. **C08.3 scoped replies, echo/action dedupe, and bounded reactions.** The channel-code implementer extends `bridge.rs`, sidecar send path, and existing source adapter; the storage owner persists action IDs and causal state. BossFang API operator surfaces expose route conflict, retained affinity, cursor, withheld/unsupported states, and cancel versus detach. Keep a single owner for any shared file.
4. **One final C08 gate.** After all three production slices are wired, run one real-boundary integration gate with the pinned Gate/Fabric/UAR providers. See the scenarios below. No partial per-task tests or standalone builds are acceptance evidence.

## Risks / Trade-offs

- **Provider checkpoint is not accepted** → Keep cross-host consumers disabled with typed compatibility status; finish C08.1 local durability first and record exact provider revisions before C08.2.
- **Optional native message ID cannot identify redelivery** → Mark that adapter unsupported for replay-safe routing; retain its legacy local path rather than fabricating a stable identity.
- **A host dies between source commit and dispatch** → Recover the committed route/occurrence and resume by the same action ID; never issue a second identity.
- **An effect's outcome is uncertain** → Record the uncertainty and reconcile by action ID; do not infer success or blindly repost.
- **Cross-host claim races or stale grants** → Conditional source/route revision writes, current grant recheck, and visible conflict/withheld states prevent first-writer or stale-reader privilege escalation.
- **Shared storage leaks one daemon's configuration into another** → Scope config-store overrides by stable BossFang host identity while leaving route and channel state shared; restart must reload each host's own scoped sidecar configuration.
- **Policy-filtered content may still be sensitive** → Keep secrets and raw credentials out of route rows and logs; disclose only under the source grant and retain the projection classification.

## Migration Plan

Add an immutable schema migration and local route writer before switching the supported channel path to it. Existing `[[sidecar_channels]]` and agent bindings remain valid; they establish initial route choices, not synthetic historical occurrences. A deployment without the new provider checkpoint remains on its existing local channel behavior and reports unsupported cross-host observer capability. Provider adoption is additive: Gate/Fabric/UAR publish compatible versioned contracts, BossFang pins them, then enables cross-host routing for profiles meeting all required fields. Rollback may disable new admissions and preserve existing rows/cursors; it must not erase already issued external effects or make an old envelope appear authorized.

## Final integration gate

Run one composed production-path scenario after implementation: two competing handler matches yield a deterministic conflict, then an explicit recipient wins; two authorized observers receive independent copies and cursors while an unauthorized third receives none; restart BossFang, Fabric and UAR during queued forwarding and observe retained affinity/replay; revoke one queued grant before release; echo a posted reply and replay its source; force an A-B-A reaction; request a cross-room reply and a runtime cancel through a detach-only transport. Evidence records exact source/provider/policy/binding revisions, no wrong recipient, no duplicate effect, exact gap/withheld/unsupported results, and whether cancel reached the owner. A failed mandatory scenario leaves the cross-host profile unsupported.
