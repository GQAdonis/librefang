# Proposal

## Why

The report recommendations REC-054, REC-055 require a coordinated contract across the affected products. Authored required semantics survive compile, storage, binding and actual execution.

## What Changes

- Specify exact versioned section headings and machine schemas for AgentDefinition, TeamDefinition, WorkflowDefinition, DeploymentBinding and private RepresentationGrant.
- Preserve skill version/required/config and v2 fields; implement field-level conversion diagnostics and effective runtime binding checks.
- Add legacy migration/import/export fixtures and immutable dependency resolution; keep installed grants and secrets out of packages.

## Capabilities

### New Capabilities

- `lossless-definitions-and-collaboration-document-profile`: Authored required semantics survive compile, storage, binding and actual execution.

### Modified Capabilities

None in this initiative root. Product-level existing specifications are reconciled before implementation; this proposal does not overwrite them.

## Impact

This is an initiative-level specification. The local OpenSpec root authorizes planning edits only. Before product implementation, create or link repository-scoped changes in each affected worktree with exact file ownership, existing-spec reconciliation, and this change ID. Do not apply sibling code edits from this planning root.

Repositories: universal-agent-runtime, librefang, prometheus-skill-pack, prometheus-skills-mini. Scope: UAR compiler/IR/artifact persistence; BossFang translator; existing skill document adapters. Dependencies: C01, C02. External checkpoints: D-MINI (definitions in dependencies.md).

Existing format remains supported; draft examples are not executable until schema/adapter implementation passes.

Acceptance: Round-trip legacy and new definitions through persisted runtime, prove required skills/policies effective, reject unknown mandatory fields and required-unsupported exports.
