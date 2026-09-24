# Design

## Context

See proposal.md for motivation and repository scope, and the assessment/source-evidence.json for pinned current observations. Historical gaps are not assumed to persist. This is an initiative-level specification. The local OpenSpec root authorizes planning edits only. Before product implementation, create or link repository-scoped changes in each affected worktree with exact file ownership, existing-spec reconciliation, and this change ID. Do not apply sibling code edits from this planning root.

Repositories: know-me-system, know-me-app, universal-agent-runtime, librefang. Scope: KnowMe Rust core runtime routes, mobile lifecycle adapter and selected home/cloud binding. Dependencies: C04, C06. External checkpoints: D-KNOWME, D-UAR-P1 (definitions in dependencies.md).

## Goals / Non-Goals

**Goals:** Deliver C13 through existing product authorities and observable acceptance.

**Non-Goals:** C11/C12 are additional prerequisites for enterprise-sync/peer modes; basic standalone embedding does not depend on them. Acceptance is evaluated per profile: standalone embedding requires C04/C06; enterprise sync additionally requires C11; personal peer or home/cloud context requires C12; combined profiles require both C11 and C12. Private context upload is blocked until the corresponding grant boundary is proven. No implementation or service changes occur in this planning package.

## Decisions

- Produce the local contracts and composed profile using the existing product architecture; no external dependency is selected by this change.
- Keep product conversation history in The Boss and execution context/checkpoints in the owning runtime. A delegated run has one executor; orchestration does not duplicate that loop.
- Prefer additive provider capability before consumer enforcement; reject required unsupported semantics rather than dropping them. Alternative: an all-at-once multi-repository cutover; rejected because Git branches provide no atomic multi-repository release.
- Use the sequential dependency order until exact file claims and resource isolation permit concurrency. Alternative: simultaneous writers on matching branches; rejected because matching names neither resolve semantic conflicts nor isolate shared resources.

## Risks / Trade-offs

- Active integration can supersede gaps → consume immutable agreed checkpoints before assigning product files.
- Delivery groups below exceed a single-session assignment → decompose into repository-scoped, single-session tasks after C01; retain IDs and acceptance links. They are not directly dispatchable execution tasks.
- Shared ports, databases, build caches and tool installations escape Git isolation → use isolated data roots and explicit resource ownership; one local Rust build writer.

## Migration Plan

Reconcile current source and existing product specs; record accepted dependency and file-ownership checkpoints. Deliver provider changes with backward-compatible consumers where possible, then pin consumer adoption. Run this change's acceptance and relevant operational-mode rows. Record schema compatibility and rollback limitations before promotion; do not reverse already-issued external effects through a code rollback.

## Verification

Physical supported mobile device and desktop prove local useful work offline, correct suspension and remote continuity, no duplicate fallback and no private-memory upload without grant.

Use repository-required checks and observable real-boundary scenarios; source inspection and planned checkboxes are not execution evidence. Recommendation coverage: REC-020, REC-021, REC-036.

## Profile prerequisite gates

- standalone-embedded: C04, C06; all required acceptance evidence must pass before this profile is advertised.
- enterprise-sync: C04, C06, C11; all required acceptance evidence must pass before this profile is advertised.
- personal-peer-home-cloud: C04, C06, C12; all required acceptance evidence must pass before this profile is advertised.
- combined-personal-and-business: C04, C06, C11, C12; all required acceptance evidence must pass before this profile is advertised.

## Release eligibility

C13 implementation/profile acceptance is distinct from release eligibility. Every C13 advertised supported profile, including home/personal-cloud, requires C18 evidence for that exact mode. C18 consumes C13 implementation; this release gate is not a reverse implementation dependency and must not create a DAG cycle.
