# Assessment — UAR team definitions, maintenance, and deployment

## Authority and scope

The operator authorized implementation on 2026-09-26 after approving the official collaboration draft. This child implements the I1 definitions/catalog slice and the matching full/mini skill adapters. It does not accept D-UAR-P1, change The Boss sidecar lifecycle, or implement durable TeamInstance execution.

Baselines:

- UAR `cbb511ac61eb6b2928d7a80c67324baeb913ca11`
- mini `d0bd4f9e41b7edf7383874d4bbcf2c050ad840c3`
- full pack `497db1cb1ff66f103dfa20d97b07184b0d5b2a0d`
- collaboration profile `urn:prometheus:uar:collaboration:0.1.0-draft.1`

## Observed gaps

1. UAR compiles one Markdown `AgentDescriptorIR` and `compile-and-register` projects it to one legacy `AgentArtifact`.
2. `/api/agents` persists one global artifact at a time. It has no immutable definition version/digest catalog, package transaction, TeamDefinition, WorkflowDefinition, or DeploymentBinding.
3. The current agent-team creator exports one legacy AgentArtifact per role plus a review-only sequence of `POST /api/agents` calls. It accurately warns that this is non-atomic and does not deploy or activate a team.
4. The creator asks task/role/ownership questions, but not coordinator, cardinality, nested-team, communication, workflow, limits, budget, deployment, or maintenance-version questions.
5. Existing `team-update` mutates local state after a state revision check. It does not create an immutable definition/package version, compare a remote catalog revision, or migrate a binding.

The implementation branches were refreshed against current `origin/main` before production edits. This brought in the merged UAR administration/tool-admission work and the latest full/mini UI/UX routing payloads without changing this child's ownership boundary.

## Required outcome

- Compile canonical AgentDefinition, TeamDefinition, WorkflowDefinition, and PackageManifest JSON without losing fields.
- Validate immutable references, exact file bytes/digests, team DAG/cardinality/coordinator rules, workflow dependencies, required capabilities/extensions, and secret/authority exclusions.
- Preflight and atomically install a package into an immutable catalog with one revision and one command receipt.
- Create owner/workspace-scoped private deployment bindings through references only. No credential values enter portable packages or receipts.
- Keep existing single-agent Markdown compilation and `/api/agents` compatible.
- Make the creator guide, author, maintain, export, preflight, install, and bind a team through the new UAR contract. Activation remains explicitly unsupported until I2.

## Final gate

One completed-change gate will create a coordinator/two-worker/integrator team, maintain it as a new version, export a canonical package, preflight/install/retrieve it through UAR, create a private binding, and exercise one projected ordinary agent. The same gate must prove a required unsupported capability is refused and legacy agent compilation still works.
