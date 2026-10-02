# Shared UAR design independence — 2026-10-02

Status: documentation of an approved preparation boundary. This does not admit C10 implementation, select a workflow engine, qualify C08 runtime behavior, publish The Boss, or change canonical task completion.

## Canonical decision

Cadence decision `shared-uar-design-independent-of-boss-packaging`, revision 482, records:

> Shared UAR architecture preparation is independent of Boss installers; runtime qualification and architecture approvals remain required.

The decision is bound to UAR source `c906c24fb8114f1a3b55dc83a12feec542ae8b8d`. It permits source-backed C10 preparation to continue while C08 packaging and publication proceed on their own evidence boundaries.

## Current delivery boundary

The canonical active delivery remains C08.2 followed by C08.3. Iteration 6 retains its original start and honest overrun. Its production, build, real-service operation, package, publication, and installed-acceptance evidence remain separate from C10 architecture preparation.

The shared authenticated `universal-agent-runtime` server and the managed `uar-sidecar` are separate entrypoints built from UAR `c906c24`. The shared server retains its own authentication boundary. Persistent local SurrealKV or explicitly attested persistent remote SurrealDB supplies the durability eligibility used by resident instances, local observers, and channel observers; a remote endpoint alone is not durability evidence.

The isolated C08 operation may use its owned shared runtime without making Boss packaging the architecture authority. The current 2.2.10 release remains advertised until replacement installers are actually published.

## C10 preparation documents

The source-backed preparation is split into two reviewable documents:

- [Existing-kernel substrate source map](../c10/c10-existing-kernel-substrate-proposal.md) records the inspected UAR `c906c24` contracts, missing workflow/operator contracts, substrate comparison, and unmeasured performance boundary.
- [Lead architecture proposal](../c10/c10-lead-architecture-proposal.md) applies architecture judgment for operator review while preserving the approved substrate-selection checkpoint.

Both documents remain proposals. The approved [C10 design](../../../../openspec/changes/afc-c10-feedback-workflow-and-governed-connector-effects/design.md) and [C10 tasks](../../../../openspec/changes/afc-c10-feedback-workflow-and-governed-connector-effects/tasks.md) still require their stated approval and delivery boundaries. No C10 task is begun or completed by publishing these documents.
