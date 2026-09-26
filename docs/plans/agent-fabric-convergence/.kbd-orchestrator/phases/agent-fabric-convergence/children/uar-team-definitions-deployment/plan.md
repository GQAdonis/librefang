# Plan — UAR team definitions, maintenance, and deployment

## Change 1 — canonical UAR collaboration packages

1. Add typed approved-profile definitions, package input/receipt, field diagnostics, canonical digest and semantic validation.
2. Add an immutable catalog service with atomic package preflight/install, command idempotency, catalog revision conflicts, exact retrieval, and legacy AgentArtifact projections.
3. Add private deployment-binding preflight/create/read/update with authenticated owner derivation, expected revision, effective restrictions, and reference-only credentials.
4. Expose REST and MCP administration without adding a second agent loop. Advertise `collaboration_definition_packages_v1`; do not advertise local team execution.

## Change 2 — creator authoring, maintenance, and UAR deployment

1. Extend the portable team model and guide for coordinator, cardinality, nested teams, communication, workflow dependencies, limits/budget, skills/models, deployment target, and maintenance intent.
2. Make maintenance versioned: inspect/diff/update produces a new immutable definition/package version and binding migration preview.
3. Replace the UAR legacy multi-POST export with canonical AgentDefinitions, TeamDefinition, WorkflowDefinition, PackageManifest, exact file hashes, and a private binding template.
4. Add explicit preflight/install/bind/status commands against the UAR contract. Keep secrets outside request files and refuse activation until UAR advertises the I2 capability.
5. Apply the same source changes to full and mini packs, rebuild generated `.mjs` and packaged distributions once, after production implementation is complete.

## Execution and gate

Implementation roles own disjoint UAR and skill-pack paths. Review/verifier roles stay dormant until both changes are complete. Then run one integration gate across creator → package → UAR catalog → binding → retrieval → ordinary projected agent, plus required-capability refusal and legacy compiler compatibility. Fix only failures from that gate and rerun it.

### Revision 3 dependency amendment

The operator directed an immediate SurrealDB 3.3.0 convergence before the final gate. UAR and Compass use the exact Rust SDK/types 3.3.0 client family. Mini, The Boss packaging, UAR deployment assets, and surreal-memory-server use `surrealdb/surrealdb:v3.3.0@sha256:681c6c22c287421b5c7d99e0fde79b6e0d32c36c1ddeaab2762a1661cb04cd20`. The final gate resumes only after lockfiles and generated payloads reflect this pin. Existing 3.2 datastores upgrade in place on first 3.3 start; rollback requires restoring a pre-upgrade export because 3.2 cannot safely read a migrated datastore.

## Completion

Record exact commits and gate evidence, synchronize full/mini payloads, create repository PRs, reflect and restore the parent waypoint. Do not mark C01.2 accepted or claim durable team execution.
