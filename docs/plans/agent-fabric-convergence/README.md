# Agent Fabric Convergence

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

- [C01: Baseline reconciliation and shared contracts](openspec/changes/afc-c01-baseline-reconciliation-and-shared-contracts/proposal.md)
- [C02: Governed action and approval boundary](openspec/changes/afc-c02-governed-action-and-approval-boundary/proposal.md)
- [C03: Lossless definitions and collaboration document profile](openspec/changes/afc-c03-lossless-definitions-and-collaboration-document-profile/proposal.md)
- [C04: Replaceable service instances and placement](openspec/changes/afc-c04-replaceable-service-instances-and-placement/proposal.md)
- [C05: BossFang full-run delegation](openspec/changes/afc-c05-bossfang-full-run-delegation/proposal.md)
- [C06: Durable addressable instances and bounded turns](openspec/changes/afc-c06-durable-addressable-instances-and-bounded-turns/proposal.md)
- [C07: Local scoped observers with durable delivery](openspec/changes/afc-c07-local-scoped-observers-with-durable-delivery/proposal.md)
- [C08: BossFang and Fabric observer routing](openspec/changes/afc-c08-bossfang-and-fabric-observer-routing/proposal.md)
- [C09: Bounded teams and shared task board](openspec/changes/afc-c09-bounded-teams-and-shared-task-board/proposal.md)
- [C10: Feedback workflow and governed connector effects](openspec/changes/afc-c10-feedback-workflow-and-governed-connector-effects/proposal.md)
- [C11: Authoritative business data and offline commands](openspec/changes/afc-c11-authoritative-business-data-and-offline-commands/proposal.md)
- [C12: Personal peer sovereignty and consent](openspec/changes/afc-c12-personal-peer-sovereignty-and-consent/proposal.md)
- [C13: Embedded mobile and home/cloud execution profiles](openspec/changes/afc-c13-embedded-mobile-and-home-cloud-execution-profiles/proposal.md)
- [C14: Studio administration and isolated service consoles](openspec/changes/afc-c14-studio-administration-and-isolated-service-consoles/proposal.md)
- [C15: Portable skills, plugin contracts and cross-harness handoff](openspec/changes/afc-c15-portable-skills-plugin-contracts-and-cross-harness-handoff/proposal.md)
- [C16: Specialist, marketing, product and design teams](openspec/changes/afc-c16-specialist-marketing-product-and-design-teams/proposal.md)
- [C17: Executive assistants and consented human representation](openspec/changes/afc-c17-executive-assistants-and-consented-human-representation/proposal.md)
- [C18: Federated compatibility and release evidence](openspec/changes/afc-c18-federated-compatibility-and-release-evidence/proposal.md)

## Review and readiness

Assess, analyze, spec and plan have independent review receipts under `.kbd-orchestrator/phases/agent-fabric-convergence/review/`. The plan passed with one carried source-documentation warning: UAR’s liter-llm prose pin differs from its verified immutable Git tree; C01 records reconciliation and C15 waits for the accepted integration checkpoint. All product work remains pending. OpenSpec strict validation passes for 18 changes; [planning validation](.kbd-orchestrator/phases/agent-fabric-convergence/planning-validation.json) records the checks.

The optional shared-memory recall/mirror hook could not reach its endpoint during this turn. Local artifacts and the separate canonical KBD journal remain available; no source or acceptance evidence is claimed from that hook. The system openspec shim points to a missing temporary payload, so validation used the existing `/opt/homebrew/lib/node_modules/@fission-ai/openspec/bin/openspec.js` directly without changing installed tooling.

## C01.1 baseline reconciliation

The [baseline ledger](baseline-ledger.md) is the latest source-disposition record, superseding earlier assessment-era current-source labels. It records 11 fetched repository revisions and all 61 recommendation dispositions, preserves active integration ownership, and distinguishes unresolved conformance from missing source. C01.2/C01.3 still own agreement and adoption decisions.

## C01.2 P1 contract checkpoint

The [P1 checkpoint](.kbd-orchestrator/phases/agent-fabric-convergence/c01/p1-contract-checkpoint.md) records the frozen `the-boss.uar.sidecar/1` ownership contract and the exact merged UAR/convergence documentation commits. D-UAR-P1 remains unaccepted because the owning 2.2.3 shipping receipt still records Windows x64 installed acceptance as `pending-operator`. Overlapping product implementation remains blocked; merged documentation is not runtime acceptance.

## UAR collaboration specification child

The operator approved the documentation-only [uar-team-specification child](.kbd-orchestrator/phases/agent-fabric-convergence/children/uar-team-specification/README.md). Its contract extends C01/C03/C06/C09/C10/C14/C15 with a bounded local-team release profile; [dependency mapping](.kbd-orchestrator/phases/agent-fabric-convergence/children/uar-team-specification/dependency-map.json) preserves broader recommendations and owners. The canonical draft lives in UAR docs/agents/collaboration/v0.1.0-draft.1. This is design publication, not runtime conformance or D-UAR-P1 installed acceptance.

## UAR team definitions deployment child

The [I1 implementation child](.kbd-orchestrator/phases/agent-fabric-convergence/children/uar-team-definitions-deployment/handoff-out.md) is complete. It delivers immutable collaboration packages, private deployment bindings, agent-team creator maintenance/deployment, and SurrealDB 3.3.0 alignment while explicitly refusing team activation until I2. Its six repository PRs are published and awaiting merge. C01.2 still waits for Windows installed P1 acceptance; I1 does not transfer or duplicate execution ownership.
