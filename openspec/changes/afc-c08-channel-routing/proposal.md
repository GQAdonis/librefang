# Proposal

## Why

BossFang currently routes channel messages through process-local binding and thread-ownership state. A restart or a second host can change the chosen handler, and the channel path has no durable, authorization-scoped source occurrence from which UAR observers can safely receive copies. C07 proved only local UAR logical-instance observation; it did not make channel messages or Fabric forwarding durable observer sources.

## What Changes

- Add a durable channel occurrence and route decision keyed by provider, account, workspace, room, thread, sender, and native message identity. Persist one declared handler, a conflict result when equally authoritative handlers disagree, and affinity revisions across restart.
- Separate handler execution from authorized observer copies. Preserve source occurrence and causal identity through forwarding; require independent source-disclosure, delivery, execution, and reply authority.
- Prevent replay and provider echoes from reposting; constrain replies to the authorized source scope and bound reaction depth and cumulative fanout. Expose the distinct outcomes of runtime cancellation and stream detachment.
- Adopt compatible Gate and Fabric provider contracts before enabling cross-host consumers. Unsupported profiles report an explicit refusal rather than claiming C07 local observer support is cross-host authorization.

## Capabilities

### New Capabilities

- `bossfang-channel-routing`: Durable channel occurrence identity, deterministic handler selection, observer-copy authority, scoped replies, and loop-safe forwarding at BossFang's channel boundary.

### Modified Capabilities

None. The existing `bossfang-full-run-delegation` cancel/detach distinction and `uar-service-instance-placement` binding requirements remain authoritative.

## Impact

BossFang channel adapters, router, bridge, thread ownership, storage migration and channel operator API are affected. Gate must first supply accepted provider contracts for disclosure and delivery grants; Fabric must supply provenance-preserving envelopes and transport replay without acquiring execution authority; UAR must explicitly accept or reject the channel-source observer profile. This repository change owns only BossFang behavior and contract adoption. It does not upgrade the C07 local-only UAR profile by implication. Initiative: `afc-c08-bossfang-and-fabric-observer-routing` (REC-024, REC-031, REC-032, REC-033).
