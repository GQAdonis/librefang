# Decision log — uar-readiness-and-tooling-repair

## 2026-07-31 — Port, publish, and pin the first-party UAR readiness design

- Decision: adapt the current upstream retained-listener/oneshot-readiness implementation to the dedicated GQAdonis sync branch; merge it, verify its commit-addressed GHCR image, then update BossFang's Docker pin.
- Rejected: health-probe-only mitigation, new socket-activation dependencies, and broad cherry-picking of unrelated upstream production hardening.
- Falsifier: the sync branch's server architecture cannot accept an owned Tokio listener without a broad breaking refactor, or focused tests show the port is released before readiness.

## 2026-07-31 — Repair the existing focused KBD control plane

- Decision: retain the single-focused-project control architecture and fix annotated status parsing, nested phase identity/parent migration, and durable installer focus configuration.
- Rejected: manual plist-only editing and a new multi-project daemon registry.
- Falsifier: an identity-matched, focused daemon still cannot commit and replay an idempotent typed command after the migration fixes.

## 2026-07-31 — Track BossFang's immutable project manifest

- Decision: add the existing non-secret `.prometheus/project.json` to BossFang so linked worktrees share the same routing UUID after branch integration.
- Rejected: random identity per worktree and path-derived UUIDs.
- Falsifier: repository policy or a verified security boundary requires the manifest UUID to remain host-local.

## 2026-07-31 — Keep the kernel repair fixture-only

- Decision: add ignored scoping parameters to `KernelHandleStub`; do not change production `KnowledgeGraph` semantics.
- Falsifier: a test depends on the stub persisting or filtering by the new scopes rather than merely compiling against the trait.
