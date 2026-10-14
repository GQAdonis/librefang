# Spec Delta

## Purpose

Define the cross-product behavior for lossless definitions and collaboration document profile so compatible implementations preserve the architecture and authority boundaries.

## ADDED Requirements

### Requirement: Lossless required semantics

The definition pipeline MUST preserve required skill identity, version and configuration and reject unknown mandatory semantics.

#### Scenario: 1 — Lossless required semantics

- **WHEN** A legacy or collaboration-profile definition is compiled, persisted, loaded and bound
- **THEN** its required semantics remain effective, or binding fails with field-level diagnostics.

### Requirement: Private authority separation

Portable AgentDefinition, TeamDefinition, WorkflowDefinition and DeploymentBinding documents MUST NOT confer installed authority; private RepresentationGrant records MUST stay outside exported packages.

#### Scenario: 2 — Private authority separation

- **WHEN** A definition claiming administrator or executive authority is imported or exported
- **THEN** installation requires independent trusted grants and exports contain neither those grants nor secrets.

### Requirement: Report acceptance coverage

The implementation MUST satisfy all assigned report acceptance clauses below; source-gap reclassification by C01 requires a recorded equivalent or superseding contract.

- REC-054: Existing documents remain readable; required collaboration fields survive authoring-to-runtime or are rejected.
- REC-055: Required unsupported semantics prohibit execution; running definitions do not float with aliases.

#### Scenario: Supported-profile acceptance

- **WHEN** this capability is evaluated for a supported profile
- **THEN** the acceptance evidence identifies each applicable clause above, the exact source/policy/dependency revisions and the observed outcome; any unproven mandatory clause keeps that profile unsupported.
