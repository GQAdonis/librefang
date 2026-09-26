# Analysis — ownership and design

## Decision

Adopt an atomic collaboration package as the deployment unit. Reject a longer loop of per-agent `POST /api/agents` calls because it can leave a partially installed team and overwrites identity by unversioned agent ID.

The existing Markdown compiler becomes a legacy AgentDefinition input adapter. The canonical compiler consumes the approved structured JSON documents; this child does not invent a team Markdown dialect.

## Data flow

1. The creator gathers missing authoring and deployment facts and produces a portable manifest.
2. Export emits exact UTF-8 definition files plus PackageManifest and a private binding template containing references only.
3. UAR preflight verifies byte digests before parsing, document semantics, exact lock closure, capability support, conversion dispositions, and an expected catalog revision.
4. Install repeats preflight and commits package, immutable definitions, conversion reports, compatibility projections, command receipt, and one catalog revision atomically.
5. Binding preflight resolves installed skills/models/storage/policy. Binding creation derives the owner from authenticated context and stores a private, revisioned record.
6. Team activation is refused in I1. I2 will create durable instances through the existing kernel using the pinned binding.

## Identities and mutation

- Definition identity is `(profile, kind, id, version, contentDigest)`.
- Reusing `(kind,id,version)` with different content is a conflict.
- Package installation is append-only and idempotent by `commandId` plus request digest.
- Maintenance produces a new semantic version/digest/package. It does not edit installed definitions.
- A binding is mutable only with expected revision. Existing runtime instances remain pinned until a later explicit migration.

## Trust boundaries

Portable documents cross an untrusted-input boundary and receive structural/semantic/digest validation. Package contents cannot carry credential values, approval grants, or representation grants. Deployment bindings contain credential references, and the authenticated server derives owner identity. Safe receipts contain no resolved secrets.

## Repository ownership

- UAR: canonical types/compiler, catalog transaction, REST/MCP deployment surface, legacy projection.
- Full pack: source skill and TypeScript runtime.
- Mini: Windows-native source skill and compiled `.mjs` payload; preserve parity with full pack.
- Convergence child: contracts, task state, evidence, reflection, parent handoff.

No files in The Boss or the pending P1 sidecar/release path belong to this child.
