
## 2026-09-30 — Analyze recommendations, pending operator feedback

Authority: requested /kbd-analyze delivery-cadence-pipeline. These are researched recommendations, not activated policy or implementation approval.

| ID | Proposed decision | Reason / tradeoff |
|---|---|---|
| DCP-A01 | Adapt existing portable Cadence; add no queue service or dependency | Candidate identity, authority and obligations are domain contracts; p-queue/proper-lockfile provide only primitives; BullMQ adds infrastructure. |
| DCP-A02 | One active delivery plus one authorized future scope | Overlap independent implementation with frozen builds without competing KBD phase owners. |
| DCP-A03 | Claim/execute/reconcile outside short metadata locks | Current long operations block unrelated metadata progress; durable ownership must survive interruption. Shared output reservations span run roots. |
| DCP-A04 | Exact-source receipt adoption | Avoid rebuilding a successful artifact solely for its administrative wrapper; missing provenance remains unknown. |
| DCP-A05 | Candidate-bound publication obligations and attempts | Old completion cannot clear newer debt. No automatic coalescing; explicit reconciliation only for unstarted replacements. |
| DCP-A06 | Preserve incremental per-platform site publication | Earlier operator instruction requires ready customer platforms to publish promptly. Full obligation remains open until all four platforms and site receipts exist. |
| DCP-A07 | Protect publisher-branch version changes while a release runs | Existing Boss coordinator requires branch version to match. Continue edits/commits/PRs elsewhere; publisher rewrite is a separate scope. |
| DCP-A08 | Keep 120 minutes and every second successful delivery | Optional UTC interval/manual/either triggers are shared-skill capabilities. Proposed 90/120/150-minute signals need plan approval. No daemon. |
| DCP-A09 | v3 migration, full authoring and identical shared mini payload | Preserve historical evidence and dirty user files; reconcile newer linked payload before implementation. |
| DCP-A10 | Evaluate results only after comparable recorded deliveries | Latest recorded iteration has about 36% timing coverage; no quantitative velocity improvement can be established. |

Open at Plan: exact command/schema contracts, publisher adapter capability, release/resource ownership and scope boundaries. Implementation must not infer approval for a new scheduler, architecture bypass or product-repository rewrite.

## 2026-09-30 — Plan input: operation contract lost by change split

Read-only inspection of Obsidian .ipfs-sync at KBD revision 616 confirms six finished Cadence iterations, no active increment, and 07a pending 0/32. The split moved real Obsidian acceptance to 07b without naming a replacement 07a feature operation. Proposed decision: preserve capability/operation/authority contracts through planning and scope splits; require an existing source procedure or approved creation task at admission, resolve source work before freeze, and check generated entrypoints only after build. A custom wrapper and a shared production node are not universally required. No change to Obsidian or its node is authorized by this planning evidence.
