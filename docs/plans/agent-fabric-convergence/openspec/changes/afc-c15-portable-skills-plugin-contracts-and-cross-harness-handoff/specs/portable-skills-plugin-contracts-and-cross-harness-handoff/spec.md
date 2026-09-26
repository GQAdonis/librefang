# Spec Delta

## Purpose

Define the cross-product behavior for portable skills, plugin contracts and cross-harness handoff so compatible implementations preserve the architecture and authority boundaries.

## ADDED Requirements

### Requirement: Truthful harness portability

The skill family MUST preserve supported native configuration and explicitly diagnose required unsupported options across UAR, Codex, Claude Code, Copilot, Kimi Code, MiniMax CLI, OpenCode and DeepSeek Harness.

#### Scenario: 1 — Truthful harness portability

- **WHEN** A team with a required native feature is exported to a harness without that feature
- **THEN** export fails with a capability diagnostic instead of silently dropping semantics or claiming equivalent plugin/team support.

### Requirement: Auditable model and memory handoff

Guided team creation MUST discover model capabilities/cost classes and bind reviewed skills; handoffs MUST record source revision, artifacts, authority and selected memory references.

#### Scenario: 2 — Auditable model and memory handoff

- **WHEN** A coding task transfers between supported harnesses
- **THEN** the receiver verifies the checkpoint and available capabilities before work; private memory is not copied wholesale, and full/mini helpers use the declared Node.js/TypeScript 7 toolchain.

### Requirement: Report acceptance coverage

The implementation MUST satisfy all assigned report acceptance clauses below; source-gap reclassification by C01 requires a recorded equivalent or superseding contract.

- REC-022: Tampered capability manifest fails admission; imported package receives fresh install identity and scoped grants.
- REC-037: Handoff carries revision/task/evidence and preserves four completion dimensions; logs cannot mark execution complete.
- REC-040: Required skill/version/config reaches runtime; unsupported required tools block binding.
- REC-041: UAR/Codex/Claude Code/Copilot/Kimi Code/MiniMax CLI/OpenCode/DeepSeek Harness each retain exact supported options or report loss.

#### Scenario: Supported-profile acceptance

- **WHEN** this capability is evaluated for a supported profile
- **THEN** the acceptance evidence identifies each applicable clause above, the exact source/policy/dependency revisions and the observed outcome; any unproven mandatory clause keeps that profile unsupported.
