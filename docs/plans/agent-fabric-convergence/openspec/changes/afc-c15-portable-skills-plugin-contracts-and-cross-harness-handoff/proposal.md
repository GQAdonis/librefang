# Proposal

## Why

The report recommendations REC-022, REC-037, REC-040, REC-041 require a coordinated contract across the affected products. Teams can be configured and handed off with truthful native capabilities and bounded shared knowledge.

## What Changes

- Reuse four merged skills; extend task-guided role selection and model strength/cost/capability routing through liter-llm with exact selected model recorded.
- Validate all eight harness adapters against pinned CLI schemas; preserve native options/extensions and report unsupported agent/plugin/marketplace features; use Node.js/TypeScript 7 for authored shared hooks/scripts. Before authoring helpers, pin the exact Node.js and TypeScript 7 distribution and prove full/mini and harness adapter compatibility at D-MINI; if unavailable, record a blocker rather than substituting another language/version.
- Bind reviewed skill locks and plugin manifest coverage to host grants; handoffs preserve task/revision, source hashes, dirty state, evidence, Karpathy logs and scoped shared-memory references.

## Capabilities

### New Capabilities

- `portable-skills-plugin-contracts-and-cross-harness-handoff`: Teams can be configured and handed off with truthful native capabilities and bounded shared knowledge.

### Modified Capabilities

None in this initiative root. Product-level existing specifications are reconciled before implementation; this proposal does not overwrite them.

## Impact

This is an initiative-level specification. The local OpenSpec root authorizes planning edits only. Before product implementation, create or link repository-scoped changes in each affected worktree with exact file ownership, existing-spec reconciliation, and this change ID. Do not apply sibling code edits from this planning root.

Repositories: prometheus-skill-pack, prometheus-skills-mini, universal-agent-runtime, librefang, flint-forge, know-me-system, know-me-app. Scope: Existing agent-team skill family/adapters; UAR/KnowMe/Kiln portable host interfaces and signed artifact admission. Dependencies: C03, C09. External checkpoints: D-MINI, D-KNOWME, D-FORGE, D-UAR-P1 (definitions in dependencies.md).

Refresh primary CLI docs/Context7 before changing adapters. No claim of portable native sessions or Cedar enforcement inside arbitrary external harnesses.

Acceptance: Full/mini parity fixtures plus actual harness smoke workflows prove supported configuration round-trips and explicit refusal of required loss; tampered manifest or stale handoff cannot expand authority.

## Model-discovery reuse checkpoint

library: cand-010 (adapt: existing Rust liter-llm and gateway discovery). UAR baseline c29af47be3439c69e1a3c124fdcf09ce4cbb5cba pins vendor/git/liter-llm at e627af981bcb06c7fc5da027731c182b044e25d1; src/llm/liter_driver.rs imports liter_llm. This is not LiteLLM. D-UAR-P1 and D-MINI must verify exact library version, maintenance/license, gateway/catalog compatibility and observed model capabilities before adoption; no upgrade is authorized by this reuse decision.

## Approved customer-priority revision — 2026-10-05

Reuse the four merged skills and existing bindings for the initial coding preset; completing C15 is not a prerequisite for Teams in Work. Then deliver C15.1 and relevant C15.3 for reusable mixed-team configuration after the first team journey. C15.2 broad eight-harness qualification, including its authored-helper toolchain prerequisite, remains pending outside the customer milestone. Consume D-MINI/D-UAR-P1 for the selected desktop/skill scope; D-KNOWME and D-FORGE remain requirements for their later host scope, not blanket gates for local team configuration. UAR executes its teams; preserving Codex and Claude routes does not qualify either as a UAR member executor.

Delivery evidence maps to the original task IDs; partial delivery is not whole-task completion. The parent phase plan and delivery coverage map select bounded repository-owned work. Complete production wiring, UI, strings, persistence and packaged inputs before the build-and-operate boundary; no per-edit verification loop.
