# Assessment — UAR team specification

Date: 2026-09-26. Evidence class: source inspection and primary documentation, not runtime acceptance. Architecture not yet frozen.

## Baseline and prior phase

baseline-ledger.json records all eleven convergence checkouts, primary checkouts, dirty state, retained worktrees, note hashes and remote main observations. No checkout was merged or rebased. UAR remote main is a54dd9591dfeaff8694252b69d2d40f0f28e2250; Boss remote main is f20b9d9a4fe93043f489f7586331276a672408df. The convergence branches predate these merges. Implementation must use the accepted merge checkpoint, not blindly execute against those branches.

release-baseline.json records GitHub release v2.2.3 and four assets. Its release target is 1cda4e55535b42dfab8f064d7bbc16d82e0807fa. GitHub-reported checksums are metadata, not downloaded-byte verification in this phase. Both installed customer-platform acceptances remain pending by operator confirmation. Integration administration has 35/37 tasks, one in-progress change, and canonical 0/1 completed changes. Do not describe 0/1 as missing production implementation or use 35/37 as installed certification.

## Confirmed source findings

| ID | Finding | Exact evidence | Confidence / scope |
|---|---|---|---|
| G01 | Existing root-scoped thread host already owns scheduling and calls the shared kernel | UAR src/uar/runtime/thread/service.rs, attach and RootHost; same source in inspected HEAD and remote-main commit | High, source only |
| G02 | Root completion cancels descendants and clears mailboxes; captured authority cannot be reused as a durable team identity | service.rs:1241-1277 | High, explicit lifecycle |
| G03 | Child message enqueue updates an in-memory mailbox and sequence; this path does not commit a durable inbox | service.rs:1340-1355; messages.rs | High for this path; not a claim that all UAR persistence is absent |
| G04 | Skill version, required and config exist in IR but conversion retains only skill IDs | ir.rs:409-422; to_artifact.rs:131-134,189-198 | High; full IR remains in compiled descriptor, but runtime conversion loses fields |
| G05 | Lossy conversion is used by actual catalog registration | remote-main api/compiler.rs:255-300 converts descriptor payload then persists through agent_store | High; observed source defect, no reproducer run in this documentation phase |
| G06 | Five additive v2 IR sections are not copied into the converter's extension stash | ir.rs:69-90 versus to_artifact.rs:189-198 | High for conversion; other execution routes require field-level inventory |
| G07 | Tree defaults are four concurrent children, depth three, sixteen lifetime children | runtime/thread/limits.rs | High; configurable type exists, specification currently fixes defaults |
| G08 | Existing AG-UI adapter already emits standard named subagent lifecycle events | api/adapters.rs AgentThreadStarted/Finished/Error mapping | High; preserve and negotiate, do not invent duplicates |
| G09 | UAR A2UI production profile is v0.9.1; v1.0 is explicitly experimental | docs/protocols/a2ui-profile.md; a2ui/protocol.rs | High for UAR contract; Context7's newer upstream examples do not authorize a version change |
| G10 | Existing A2A types use legacy card fields and an RC-v1 label, not proof of current v1.0.1 conformance | api/a2a/types.rs:236-260; agent_card.rs discovery path | High for mismatch; interoperability untested |
| G11 | Portable skill-pack team manifests and local ledgers are not UAR runtime team/task authority | full and mini docs/agent-fabric-convergence.md and agent-team documentation | High for declared boundary; adapter execution remains unverified |
| G12 | No accepted shared team specification covers durable team activation and all three protocol views | RFC-0001, prior draft collaboration proposal, C03/C06/C09 plans | High for inspected contracts; not a blanket claim UAR has no multi-agent code |

The primary UAR branch differs from merged main in approval code: merged main contains owner-scoped pending-approval projections absent from that branch. All approval design must use merged main; no regression is inferred from an older checkout. Source receipts name immutable revisions.

## Cross-repository responsibility

UAR supplies runtime/definitions. Boss supplies operator UI and its trusted host bridge. BossFang supplies its own workflow/channel owner and a later full-run adapter; its current UarDriver is a provider adapter. Fabric is transport, Gate is an effect/identity boundary, Forge owns business transactions, surreal-memory owns scoped retrieval. KnowMe-system is a consumer through its Rust facade; KnowMe-app has a separate disposition prerequisite. Full/mini supply authoring/export and packaged templates. Their eleven notes were read; independent product readiness was not tested.

## Assessment conclusion

Extend the kernel with a durable collaboration domain above bounded turns. Do not stretch one root run into an immortal team, move authority to Electron, or use a memory TaskStream as the scheduler. Repair compiler-to-catalog fidelity before launching newly declared semantics. Current library/protocol version ambiguity must be made explicit in the proposal.

A single bounded independent review will cover assessment, analysis and the complete proposal together, as the operator requested. Per-stage review loops in generic skills are superseded by that instruction.
