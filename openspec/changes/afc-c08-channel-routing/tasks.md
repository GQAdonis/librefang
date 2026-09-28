# Tasks

Implementation tasks are grouped by initiative C08.1–C08.3. Static inspection and recorded source mapping are the per-task completion evidence; the **single** executable integration gate is task 4.1 after all production wiring. Do not run partial test suites or standalone verification builds between tasks.

## 1. C08.1 — BossFang source identity and durable handler route

- [ ] 1.1 Agree the typed normalized scope/occurrence/route-decision contract between the channel and storage owners. Verify by recording exact source-field mapping from `ChannelMessage`, `SenderContext`, and sidecar ingress, including which adapters lack stable native IDs and the legacy unsupported result.
- [ ] 1.2 Add conditional occurrence and route-revision persistence using the next free forward-only SurrealQL migration and the `librefang-storage` abstraction. Verify by static inspection that duplicate native IDs converge to one occurrence, competing host claims cannot both win, historical decisions remain immutable, and secrets/raw provider payload do not enter route rows.
- [ ] 1.3 Wire the same durable decision into text and media paths in `librefang-channels`, preserving explicit target > affinity > configured binding > direct route > user/channel/system defaults and producing a typed conflict for equal-priority distinct handlers. Verify by source-tracing both bridge entry paths and restart reconstruction; do not dispatch observer copies yet.
- [ ] 1.4 Expose a truthful local capability/status for durable routing and preserve the legacy channel path for incomplete provider identity, SQLite fallback, and unavailable shared storage. Verify by static inspection of supported and unsupported admission branches. C08.1 is complete only when the source/route slice is production-wired, with no cross-host profile claim.

## 2. C08.2 — Provider-first observer contracts and bridge

- [ ] 2.1 Record accepted immutable D-GATE and D-FRF provider revisions and their source-disclosure, recipient-delivery, envelope, replay, and cancel/detach contracts; record the explicit UAR channel-source profile revision. Verify each against its own repository's production source and integration receipt. Until these exist, cross-host observer admission remains unsupported.
- [ ] 2.2 Add the BossFang source adapter and independent subscriber cursor/queue projection, with current disclosure and delivery rechecks and metadata-only unauthorized projection. Verify by tracing route occurrence to each recipient and the revocation-before-release branch without conflating Fabric group offsets with observer cursors.
- [ ] 2.3 Consume versioned Fabric envelopes without losing occurrence, channel scope, handler, principal, binding/policy revisions or causal fields, and reject incompatible envelopes. Verify by source-tracing producer and consumer field mappings; record the exact provider revision in the acceptance receipt.
- [ ] 2.4 Route authorized recipient execution through the selected BossFang handler or UAR service binding, never a second loop; preserve the separate cancel and detach contracts. Verify by tracing both control operations to their actual owners and the unsupported result where runtime cancellation is absent.

## 3. C08.3 — Scoped effects and reaction bounds

- [ ] 3.1 Persist reply/action identities and exact source scope grants before sending. Verify by static inspection that observer copies and historical replay cannot call the channel sender, while uncertain retries reuse the same action ID.
- [ ] 3.2 Reconcile provider echoes with outbound action IDs; reject cross-room/account/workspace/thread replies without a separate grant. Verify by tracing send, echo ingress, and denial paths through the same source/action identity.
- [ ] 3.3 Carry root occurrence, parent action, visited routes, remaining depth and cumulative fanout through every local and cross-host reaction; stop A-B-A revisits and exhausted budgets with operator-visible results. Verify by static inspection that a downstream host cannot reset a causal budget.

## 4. Completed change boundary

- [ ] 4.1 Run the one composed real-host C08 integration gate described in `design.md` after tasks 1–3 are fully wired. Verify handler conflict, explicit reassignment and restart affinity; two independent authorized observer cursors; queued revocation; replay/echo no-repost; scoped reply denial; A-B-A termination; runtime cancel versus detach; and exact provider/policy/binding revision receipts. Fix a failed gate and rerun only that gate.
- [ ] 4.2 Reconcile the BossFang feature ledger, accepted provider receipts, initiative C08.1–C08.3 task evidence and OpenSpec result without claiming installed Windows or Apple Silicon acceptance from the local gate. Verify that the recorded source commits and supported profiles match the passing final gate.
