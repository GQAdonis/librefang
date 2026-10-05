# Design

## Context

See proposal.md for motivation and repository scope, and the assessment/source-evidence.json for pinned current observations. Historical gaps are not assumed to persist. This is an initiative-level specification. The local OpenSpec root authorizes planning edits only. Before product implementation, create or link repository-scoped changes in each affected worktree with exact file ownership, existing-spec reconciliation, and this change ID. Do not apply sibling code edits from this planning root.

Repositories: prometheus-skill-pack, prometheus-skills-mini, universal-agent-runtime, librefang, flint-forge, know-me-system, know-me-app. Scope: Existing agent-team skill family/adapters; UAR/KnowMe/Kiln portable host interfaces and signed artifact admission. Dependencies: C03, C09. External checkpoints: D-MINI, D-KNOWME, D-FORGE, D-UAR-P1 (definitions in dependencies.md).

## Goals / Non-Goals

**Goals:** Deliver C15 through existing product authorities and observable acceptance.

**Non-Goals:** Refresh primary CLI docs/Context7 before changing adapters. No claim of portable native sessions or Cedar enforcement inside arbitrary external harnesses. No implementation or service changes occur in this planning package.

## Decisions

- library: cand-005 — **adopt** Merged agent-team skills and Agent Skills format. Extend existing guides and adapters, keeping exact pinned skill identities. Evidence: R4; source-evidence.json; prior research/source evidence reused, no new registry verification Risks: Current runtime conformance and dependency compatibility require the assigned acceptance gate.
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

Full/mini parity fixtures plus actual harness smoke workflows prove supported configuration round-trips and explicit refusal of required loss; tampered manifest or stale handoff cannot expand authority.

Use repository-required checks and observable real-boundary scenarios; source inspection and planned checkboxes are not execution evidence. Recommendation coverage: REC-022, REC-037, REC-040, REC-041.

## Operator toolchain constraint

The operator explicitly required: “The skills should only use node.js and typescript 7 for hooks, scripts, etc., so the same version can work with the full and mini skill packages.” This is a user constraint, not a claim that a specific distribution was verified. Exact Node.js/TypeScript 7 versions and adapter compatibility must be pinned and tested at the D-MINI checkpoint; inability to meet it blocks authored helper implementation.

## Model-discovery reuse checkpoint

library: cand-010 (adapt: existing Rust liter-llm and gateway discovery). UAR baseline c29af47be3439c69e1a3c124fdcf09ce4cbb5cba pins vendor/git/liter-llm at e627af981bcb06c7fc5da027731c182b044e25d1; src/llm/liter_driver.rs imports liter_llm. This is not LiteLLM. D-UAR-P1 and D-MINI must verify exact library version, maintenance/license, gateway/catalog compatibility and observed model capabilities before adoption; no upgrade is authorized by this reuse decision.

## Approved customer-priority revision — 2026-10-05

Reuse the four merged skills and existing bindings for the initial coding preset; completing C15 is not a prerequisite for Teams in Work. Then deliver C15.1 and relevant C15.3 for reusable mixed-team configuration after the first team journey. C15.2 broad eight-harness qualification, including its authored-helper toolchain prerequisite, remains pending outside the customer milestone. Consume D-MINI/D-UAR-P1 for the selected desktop/skill scope; D-KNOWME and D-FORGE remain requirements for their later host scope, not blanket gates for local team configuration. UAR executes its teams; preserving Codex and Claude routes does not qualify either as a UAR member executor.

Delivery evidence maps to the original task IDs; partial delivery is not whole-task completion. The parent phase plan and delivery coverage map select bounded repository-owned work. Complete production wiring, UI, strings, persistence and packaged inputs before the build-and-operate boundary; no per-edit verification loop.

## Revision 10 — six-hour convergence recovery, 2026-10-05

The parent Revision 10 addendum and `customer-delivery-map.json` recovery mapping control current scoped scheduling; earlier ordering is retained history. Revision 9's unfinished Teams plus urgent BossFang accessibility remain combined in increment 1. Recovery-child Execute installs instructions only; parent C14.1 resumes after separately requested Reflect and parent restoration. Keep original task IDs, unchecked criteria and partial source work; no product completion is credited by this amendment.

After combined increment 1, reuse already-written isolated authoring work with verified source ancestry for increment 2's named coding-team create/configure/deploy/launch/revise journey and pinned existing-run definitions. Increment 3 carries unfinished work first, then delivers reusable product/design configuration and scoped role/model/skill handoff. These contribute C15.1/relevant C15.3 and supporting C14/C16 only. Preserve skill locks, host grants, handoff provenance and full/mini requirements; broad C15.2 eight-harness/toolchain qualification and later host coverage remain pending. No new model routing or helper toolchain is selected by this plan installation.

Three whole-increment targets are 120 minutes each: success 7 full publication → success 8 local-only → success 9 full publication, preserving the inspected six-success/nextCount-7 anchor and every-two schedule. Each delivery requires a new local `pnpm build:mac:arm64` package and actual feature operation; full publication requires Mac ARM64/x64 + Windows x64/ARM64, GitHub metadata and https://the-boss.know-me.tools; no Linux. Failed attempts/overruns, child time, legacy publication debt and independent installed acceptance survive. Complete production work before the single boundary; one build writer/publisher, at most three implementers, bounded isolated work-ahead. Six hours targets three useful increments, not completion of every original requirement.
