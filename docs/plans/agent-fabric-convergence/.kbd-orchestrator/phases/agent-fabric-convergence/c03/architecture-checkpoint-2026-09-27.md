# C03 architecture checkpoint

## Accepted interpretation

C03 extends the official UAR collaboration JSON profile from `0.1.0-draft.1` to `0.1.0-draft.2`. It does not create Markdown dialects for teams, workflows, deployment bindings, or representation grants. UAR-AGENT-MD remains the legacy AgentDefinition adapter and retains its existing versioned headings.

The draft.2 profile defines AgentDefinition, TeamDefinition, WorkflowDefinition, PackageManifest, private DeploymentBinding, private RepresentationGrant, conversion report, effective binding receipt, and sanitized deployment-binding template schemas. RepresentationGrant reuses the C02 grant identity, revision, constraint digest, validity, revocation, action, resource, audience, and evidence-reference vocabulary. C03 defines and validates this private boundary without claiming the C17 human-representation behavior.

Portable packages contain AgentDefinition, TeamDefinition, and WorkflowDefinition only. Deployment bindings and representation grants are private installed state. Portable export refuses private material. A separate sanitized binding-template export removes private identifiers and records every removal before a receiving installation performs fresh binding.

The canonical SkillRef is the lossless superset of the current collaboration and legacy fields: identity, exact version, digest when resolved, required state, configuration, legacy entrypoint, and required tools. Required unsupported semantics prevent activation or export. Optional unsupported semantics remain preserved with an explicit field-level disposition.

Conversion diagnostics use JSON Pointer paths and bind source identity/revision/profile, target profile, disposition, stable reason, message, effective binding reference/revision, and whether activation is blocked. Omitted v2 fields remain distinguishable from explicitly authored defaults through preserved source material and authored-field identity.

## Verified baseline and gaps

- UAR `852b0657adf2792aa6ed755e5c4540573b685795` already contains the draft.1 collaboration catalog and SurrealDB 3.3.0 client/server pin. Exact package bytes and canonical documents persist, but executable projections collapse skill semantics to preferred IDs, v2 sections are not effective at runtime, binding validation does not resolve effective resources, export is absent, and RepresentationGrant has no private schema.
- Full pack `e9520f5` includes creator/deployment commit `79cd048`. Mini `f38a98a` includes creator/deployment commit `28c008d`. Both author and deploy canonical multi-agent packages, but require one large inline JSON graph and do not fully validate top-level team topology, kind-correct references, legacy migration, or required-unsupported semantics.
- The earlier creator-to-UAR evidence used SurrealDB 3.3.0 and proved package/binding catalog behavior. Its `skills` arrays were empty, so it does not prove C03 skill fidelity or effective runtime binding.

## Product ownership

1. UAR owns draft.2 schemas, runtime validation, conversion/import/export, effective binding, exact skill/v2 enforcement, private grant references, and the ordinary single-agent compatibility path.
2. Mini owns the Windows-native Node 22+/TypeScript 7 file-backed authoring workspace and concise guided maintenance flow.
3. Full pack mirrors the accepted portable authoring behavior after the mini source contract freezes, then regenerates its distributions.
4. Team execution remains deferred to C06/C09. C03 may catalog and preflight TeamDefinition and WorkflowDefinition without claiming team activation.

Verifier and reviewer roles remain dormant until all three product implementations are complete. The single C03 integration gate runs legacy and draft.2 import through persistent catalog reload, private binding resolution, ordinary single-agent execution, sanitized export/reimport, required skill/v2 behavior, mandatory-unsupported refusal, immutable topology validation, and private grant/secret exclusion.
