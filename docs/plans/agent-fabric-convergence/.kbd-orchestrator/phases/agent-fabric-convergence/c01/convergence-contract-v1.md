# Agent Fabric Convergence contract v1

**Machine form:** [convergence-contract-v1.json](convergence-contract-v1.json)

**Status:** accepted planning contract; product conformance remains separately gated.

This C01 coordination contract has three normative parts:

1. [Identity, state and action vocabulary](identity-state-action-vocabulary-v1.md) defines stable identity classes, qualified state machines, mutation semantics and system authority.
2. [Dependency compatibility matrix](dependency-compatibility-matrix-v1.md) binds all eleven initiative repositories to exact inspected or accepted revisions and names every unresolved adoption gate.
3. [Adoption and rollback checkpoints](adoption-rollback-checkpoints-v1.md) orders provider and consumer adoption, durable-team activation, protocol projection, ecosystem checkpoints and final release.

The machine-readable companions are the source for automation. These documents coordinate repository-owned changes; they are not runtime schemas and do not establish product conformance.

For merge and checkpoint status, the accepted `p1-contract-checkpoint.json` supersedes historical sentences in the I1 handoff that say its PRs still need merging or C01.2 remains open. For current adoption disposition, the C01.3 compatibility matrix supersedes the older dependency inventory and merged-baseline snapshot; those older files remain immutable evidence of what was observed at their capture time.

Version dimensions remain independent: `the-boss.uar.sidecar/1`, `urn:prometheus:uar:collaboration:0.1.0-draft.1`, `uar.team.agui/1`, custom-event `schemaVersion: "1"`, definition semantic version/content digest, mutable resource revision and event sequence/cursor. No consumer may substitute one dimension for another.
