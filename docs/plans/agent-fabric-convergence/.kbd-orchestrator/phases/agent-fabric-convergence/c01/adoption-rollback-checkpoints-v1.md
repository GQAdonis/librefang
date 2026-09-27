# Adoption and rollback checkpoints v1

**Contract:** `afc.adoption-rollback-checkpoints.v1` / `1.0.0`  
**Status:** accepted planning contract; product conformance remains separately gated.  
**Machine form:** [adoption-rollback-checkpoints-v1.json](adoption-rollback-checkpoints-v1.json)

Adoption is provider-first and evidence-bound. Each product change runs through its own repository OpenSpec/KBD authority and claims exact files. Matching branch names coordinate the initiative; they do not make commits, databases, ports or packages compatible.

| Order | Checkpoint | Owning changes | Required outcome |
|---:|---|---|---|
| 1 | AFC-A01 Coordination contract | C01 | Shared vocabulary, eleven-repository matrix and rollback rules; unresolved rows remain blocked. |
| 2 | AFC-A02 Governed action boundary | C02 | Establish exact action/effect identity, current policy and approval/reconciliation semantics. |
| 3 | AFC-A03 Definitions and provider inputs | C03 | Reconcile with I1 definitions/compiler/catalog/private bindings, pin provider inputs and avoid a competing representation. |
| 4 | AFC-A04 Placement and lifecycle | C04 | Establish runtime selection, capabilities and managed/external lifecycle ownership. |
| 5 | AFC-A05 Core runtime/product foundations | C05, C06, C11, C12 | Full-run delegation, durable instances and the authoritative business/peer data boundaries, each behind its own checkpoint. |
| 6 | AFC-A06 Local teams/observation/embedded | C07, C09, C13 | Authorized replay, durable local teams and embedded profiles through one UAR kernel. |
| 7 | AFC-A07 Fabric routing | C08 | Preserve recipient and causal identity without making transport a scheduler. |
| 8 | AFC-A08 Workflows and adapters | C10, C15 | Development/feedback workflows, truthful harness capabilities and provider-first payload propagation. |
| 9 | AFC-A09 Team protocol/admin I3 | C14 | AG-UI/A2UI/A2A and The Boss project the same UAR task state; no second store. |
| 10 | AFC-A10 Specialist teams | C16 | Development, product, marketing and design teams use the canonical runtime and adapters. |
| 11 | AFC-A11 Representation | C17 | Executive roles and consented human representation add no implicit authority. |
| 12 | AFC-A12 Federation/release | C18 | Publish only exact provider/consumer/payload combinations after the full C18 dependency set. |

UAR remains the sole execution-loop owner throughout. The Boss controls host admission and presents state. BossFang retains its workflow when delegating a UAR task. Fabric transports events. Memory stores scoped context. None becomes another scheduler.

## Rollback sequence

Rollback follows the reverse dependency order:

1. Stop new admission while preserving status, cancellation and reconciliation controls.
2. Drain or cancel active work under its recorded policy. Client detach is not cancellation.
3. Fence attempts and retain tasks, inboxes, approvals, audits and effect-reconciliation records.
4. Quiesce database writers and capture a current post-upgrade export before deciding on datastore rollback.
5. Roll back consumers and host projections before providers or canonical schemas.
6. Pin bindings to an earlier immutable definition, package and catalog revision.
7. Restore protected configuration and payload manifests from their recorded revision and backup.
8. For SurrealDB downgrade after 3.3 access, reconcile post-upgrade writes and use an explicit migration or operator-accepted recovery point. Never point 3.2 software at potentially upgraded data or silently discard 3.3 writes.
9. Reconcile remote effects by stable `EffectId`. A local rollback does not undo an external effect.
10. Refuse downgrade when required semantics, retained data, post-upgrade writes or authority records cannot be preserved.
11. Run the owning repository's rollback integration scenario before restoring admission.

Every release manifest records exact commits, package digests, database/image versions, protocol profiles and acceptance receipts. Unknown or stale inputs fail the checkpoint instead of floating to a nearby branch or alias.
