# Agent Fabric Convergence

## Current disposition — 14 October 2026

The phase is complete and its enclosing run is administratively retired through supported KBD commands. Read [reconciled status](current-execution-status.md), [OpenSpec archive receipt](receipts/openspec-initiative-reconciled-20261014.json) and [manual certification handoff](manual-certification-handoff.md). Code remains 61/61 tasks and 20/20 changes; portfolio qualification remains 43/61 terminal with eighteen criteria pending. The Boss 2.2.38 release publication is complete; new-candidate acceptance remains separate. Cadence is retired, not waiting to resume. This main checkout is the current coordination home; earlier worktree paths and directions below are preserved provenance.

## Historical customer priority — 2026-10-05

Read [approved delivery order](customer-delivery-order.md) and [machine-readable scope map](customer-delivery-map.json) first. Teams in Work → reusable mixed teams → shared BossFang/UAR → BossFang MiniApp → GitHub feedback. Next: C14.1. New C14.4 records shared desktop runtime explicitly. Earlier chronology below is historical, not current pending-work status. Cadence remains 120 minutes, local Mac build+operate each delivery, full Mac/Windows/site every second successful delivery.

Planning initiative started 24 September 2026. Branch in every participating repository: `codex/agent-fabric-convergence`.

This initiative turns five research reports and their proposed agent-document standard into coordinated work across 11 repositories. It preserves the active UAR Working Agent integration and records existing work as dependencies. It does not authorize starting product implementation merely by creating a branch.

## Read in order

1. [Assessment](.kbd-orchestrator/phases/agent-fabric-convergence/assessment.md): current evidence and report corrections.
2. [Analysis](.kbd-orchestrator/phases/agent-fabric-convergence/analysis.md): reuse and design decisions.
3. [Plan](.kbd-orchestrator/phases/agent-fabric-convergence/plan.md): ordered delivery slices and acceptance gates.
4. [Recommendation register](recommendations.md): report-to-change coverage and explicit dispositions.
5. [Operational modes](operational-modes.md): supported compositions and failure behavior to prove.
6. [Dependencies and ownership](dependencies.md): active work, merge checkpoints and resource isolation.
7. [Repository manifest](repository-manifest.json) and [source receipts](report-sources.json): exact Git baselines and report hashes.

The shared worktree directory is `/Users/gqadonis/Projects/prometheus/worktrees/agent-fabric-convergence`. Each product is a sibling checkout. This planning directory is versioned within the `librefang` convergence branch; it is a coordination artifact, not a runtime dependency on BossFang.

## Research inputs

- R1: [BossFang, UAR and The Boss architecture](/Users/gqadonis/.prometheus/research/bossfang-uar-studio-architecture-20260924-a73e/report.md).
- R2: [KnowMe and Flint ecosystem assessment](/Users/gqadonis/.prometheus/research/knowme-flint-ecosystem-architecture-20260924-b6d2/report.md).
- R3: [UAR operational modes and observers](/Users/gqadonis/.prometheus/research/uar-agent-operational-modes-20260924-c8f1/report.md).
- R4: [KBD roles and specialist skills](/Users/gqadonis/.prometheus/research/kbd-agent-roles-skills-20260924-d4e7/report.md).
- R5: [Governed teams and executive representation](/Users/gqadonis/.prometheus/research/uar-governed-agent-teams-20260924-e92a/report.md).
- R6: [Proposed collaboration document standard](/Users/gqadonis/.prometheus/research/uar-governed-agent-teams-20260924-e92a/proposal/standard.md).

These are historical evidence packages. Their readiness scores are analyst judgments, not integration results. `report-sources.json` fixes the exact versions used here. A moved or changed source must be resolved before claiming traceability.

## KBD boundary

Use `prometheus kbd --path <this-directory> status --json`. The initiative has its own project UUID and canonical journal. Product-root journals and the mini-pack's active shipping phase remain separate. Assess, analyze, spec and plan are recorded in order; execution and reflection await their actual work. Local review receipts describe only the reviewed artifacts, never product readiness.

## Planning versus dispatch

The OpenSpec changes are initiative-level contracts. Product implementation must be materialized as bounded, repository-scoped child changes after source and ownership reconciliation; the central OpenSpec root does not authorize editing sibling repositories. The 54 listed tasks are parent delivery groups, not single-session estimates.

## Change index

- [C01: Baseline reconciliation and shared contracts](openspec/changes/archive/2026-09-26-afc-c01-baseline-reconciliation-and-shared-contracts/proposal.md)
- [C02: Governed action and approval boundary](openspec/changes/archive/2026-09-27-afc-c02-governed-action-and-approval-boundary/proposal.md)
- [C03: Lossless definitions and collaboration document profile](openspec/changes/archive/2026-10-14-afc-c03-lossless-definitions-and-collaboration-document-profile/proposal.md)
- [C04: Replaceable service instances and placement](openspec/changes/archive/2026-10-14-afc-c04-replaceable-service-instances-and-placement/proposal.md)
- [C05: librefang full-run delegation](openspec/changes/archive/2026-09-27-afc-c05-bossfang-full-run-delegation/proposal.md)
- [C06: Durable addressable instances and bounded turns](openspec/changes/archive/2026-10-14-afc-c06-durable-addressable-instances-and-bounded-turns/proposal.md)
- [C07: Local scoped observers with durable delivery](openspec/changes/archive/2026-09-28-afc-c07-local-scoped-observers-with-durable-delivery/proposal.md)
- [C08: BossFang and Fabric observer routing](openspec/changes/archive/2026-10-14-afc-c08-bossfang-and-fabric-observer-routing/proposal.md)
- [C09: Bounded teams and shared task board](openspec/changes/archive/2026-10-14-afc-c09-bounded-teams-and-shared-task-board/proposal.md)
- [C10: Feedback workflow and governed connector effects](openspec/changes/afc-c10-feedback-workflow-and-governed-connector-effects/proposal.md)
- [C11: Authoritative business data and offline commands](openspec/changes/afc-c11-authoritative-business-data-and-offline-commands/proposal.md)
- [C12: Personal peer sovereignty and consent](openspec/changes/afc-c12-personal-peer-sovereignty-and-consent/proposal.md)
- [C13: Embedded mobile and home/cloud execution profiles](openspec/changes/afc-c13-embedded-mobile-and-home-cloud-execution-profiles/proposal.md)
- [C14: Studio administration and isolated service consoles](openspec/changes/archive/2026-10-14-afc-c14-studio-administration-and-isolated-service-consoles/proposal.md)
- [C15: Portable skills, plugin contracts and cross-harness handoff](openspec/changes/afc-c15-portable-skills-plugin-contracts-and-cross-harness-handoff/proposal.md)
- [C16: Specialist, marketing, product and design teams](openspec/changes/archive/2026-10-14-afc-c16-specialist-marketing-product-and-design-teams/proposal.md)
- [C17: Executive assistants and consented human representation](openspec/changes/afc-c17-executive-assistants-and-consented-human-representation/proposal.md)
- [C18: Federated compatibility and release evidence](openspec/changes/afc-c18-federated-compatibility-and-release-evidence/proposal.md)

## Review and readiness

Assess, analyze, spec and plan have independent review receipts under `.kbd-orchestrator/phases/agent-fabric-convergence/review/`. The plan passed with one carried source-documentation warning: UAR’s liter-llm prose pin differs from its verified immutable Git tree; C01 records reconciliation and C15 waits for the accepted integration checkpoint. All product work remains pending. OpenSpec strict validation passes for 18 changes; [planning validation](.kbd-orchestrator/phases/agent-fabric-convergence/planning-validation.json) records the checks.

The optional shared-memory recall/mirror hook could not reach its endpoint during this turn. Local artifacts and the separate canonical KBD journal remain available; no source or acceptance evidence is claimed from that hook. The system openspec shim points to a missing temporary payload, so validation used the existing `/opt/homebrew/lib/node_modules/@fission-ai/openspec/bin/openspec.js` directly without changing installed tooling.

## C01.1 baseline reconciliation

The [baseline ledger](baseline-ledger.md) is the latest source-disposition record, superseding earlier assessment-era current-source labels. It records 11 fetched repository revisions and all 61 recommendation dispositions, preserves active integration ownership, and distinguishes unresolved conformance from missing source. C01.2/C01.3 still own agreement and adoption decisions.

## C01.2 P1 contract checkpoint

The [P1 checkpoint](.kbd-orchestrator/phases/agent-fabric-convergence/c01/p1-contract-checkpoint.md) records the frozen `the-boss.uar.sidecar/1` ownership contract, exact merged UAR/convergence documentation commits and accepted 2.2.3 customer-platform evidence. D-UAR-P1 is accepted: Windows x64 installation worked with packaged UAR active on port 1906, and Apple Silicon installed acceptance is recorded separately. Windows occupied-port fallback was not exercised. C01.3 and dependent changes may consume the contract only through their own dependency and ownership gates.

## C01.3 shared convergence contract

The [Agent Fabric Convergence contract v1](.kbd-orchestrator/phases/agent-fabric-convergence/c01/convergence-contract-v1.md) binds the accepted P1 boundary and I1 collaboration package to a versioned identity/state/action vocabulary, an eleven-repository compatibility matrix and ordered adoption/rollback checkpoints. It preserves UAR as the sole execution-loop owner and records the SurrealDB 3.3.0 provider-first migration and rollback rule. These are planning contracts; each product change still requires its own repository-scoped implementation and complete integration gate.

C01 is complete and archived under `openspec/changes/archive/2026-09-26-afc-c01-baseline-reconciliation-and-shared-contracts`. Its final documentation gate and independent review passed at canonical KBD revision 203. C02 is the next change; no later product behavior is implied by C01 completion.

## UAR collaboration specification child

The operator approved the documentation-only [uar-team-specification child](.kbd-orchestrator/phases/agent-fabric-convergence/children/uar-team-specification/README.md). Its contract extends C01/C03/C06/C09/C10/C14/C15 with a bounded local-team release profile; [dependency mapping](.kbd-orchestrator/phases/agent-fabric-convergence/children/uar-team-specification/dependency-map.json) preserves broader recommendations and owners. The canonical draft lives in UAR docs/agents/collaboration/v0.1.0-draft.1. This is design publication, not runtime conformance or D-UAR-P1 installed acceptance.

## UAR team definitions deployment child

The [I1 implementation child](.kbd-orchestrator/phases/agent-fabric-convergence/children/uar-team-definitions-deployment/handoff-out.md) is complete. It delivers immutable collaboration packages, private deployment bindings, agent-team creator maintenance/deployment, and SurrealDB 3.3.0 alignment while explicitly refusing team activation until I2. Its six repository PRs merged on 26 September 2026; their immutable heads and merge commits are recorded in the P1 checkpoint. D-UAR-P1 is now accepted through the separate installed 2.2.3 closeout; I1 does not transfer or duplicate execution ownership.

## Phase closed — operator handoff, 11 October 2026

The operator closed this phase administratively after accepting The Boss 2.2.32 on Mac ARM64 and Windows x64. [Manual certification handoff](manual-certification-handoff.md) assigns the remaining 18 portfolio criteria to the operator. Code remains 61/61 tasks and 20/20 changes; qualification remains 43/61 terminal (42 qualified, one historical skipped duplicate). No remaining criterion is certified by this closure. [Canonical closeout receipt](receipts/phase-manual-closeout-20261011.json). Earlier next-task directions below or in historical plans are retained history, not an instruction to resume.

## Final administrative closeout

The phase is closed by operator direction. See the [main-only consolidation and recovery index](main-consolidation-closeout.md) and [remaining manual certification scenarios](manual-certification-handoff.md). Remaining qualification is not marked passed.

## Cadence retired — 11 October 2026

The operator requested removal of active Cadence state, profiles and reports. They were moved intact to the private archive documented in the [Cadence evidence relocation index](receipts/cadence-retirement-relocation-20261011.md). Historical delivery counts and schedules remain provenance; there is no active Cadence configuration for this initiative. Reusable skill source and the manual certification handoff remain.
