# ANALYSIS: uar-readiness-and-tooling-repair

**Date:** 2026-07-31
**Mode:** stack specified — Rust/Tokio/Axum, existing KBD runtime, macOS launchd and Linux systemd
**Research budget:** Tier 1: 3/8 queries plus direct local authoritative repository inspection; Tier 2–4: 0/8 because first-party implementations and source-level failures fully answer the candidate question. Elapsed research remained under 20 minutes for this stage.

## External-source re-verification gate

The assess-stage adversarial review required independent reinspection of the external repositories. That gate is satisfied:

- UAR source repository: `/Users/gqadonis/Projects/prometheus/universal-agent-runtime`, origin `Prometheus-AGS/universal-agent-runtime`, inspected at origin/main `563ecc23316177e8d7bece00e84de02574737a92` and GQAdonis sync `fb2e0a8ce07c904755dc06aa4ce7aa8df605002e`.
- Prometheus KBD repository: `/Users/gqadonis/Projects/prometheus/prometheus-skill-pack`, origin `Prometheus-AGS/prometheus-skill-system`, inspected at `9b170d141024f0224d2daeb721fe63631b58b213`.
- BossFang repository: current linked worktree at commit `49c19079c` before this child.

Exact external files were reopened: UAR `src/bin/uar-sidecar.rs`, `src/server.rs`, and `.github/workflows/publish-ghcr.yml`; Prometheus `substrate/kbd-runtime/src/lib.rs`, `substrate/sovereign-sync/src/kbd_control.rs`, `substrate/sovereign-sync/src/rest_api.rs`, `tools/prometheus-cli/crates/prometheus-cli/src/commands/kbd.rs`, both Sovereign Sync service templates, and `scripts/install-mcp-services.sh`. The assessment's external claims are confirmed.

## Gap 1 — UAR startup and published artifact

### Candidates

1. **Adapt the current first-party retained-listener implementation.** Current upstream already passes an owned `tokio::net::TcpListener` into `start_server_sidecar`, sends a oneshot readiness notification after application construction, and emits stdout `READY` only after the notification. Coverage: approximately 90%; remaining work is a careful port to the divergent sync branch plus regression tests and release publication.
2. **Keep the released-port protocol and rely on BossFang health probes.** Rejected. Probes prevent false healthy state but cannot prevent port theft or distinguish a competing listener from the intended child.

No concrete third-party socket-activation library was advanced to candidacy because direct inspection established that the incumbent Tokio/Axum API already supplies the exact missing capability: ownership of an existing `TcpListener` through `axum::serve`. Per the research pipeline's stop-early rule, registry/maintenance research for a redundant abstraction was not performed.

### Decision

Adapt the proven first-party implementation into a new worktree based on the GQAdonis sync branch. Do not cherry-pick the broad production-hardening commit wholesale: the sync branch diverges substantially. Port only listener ownership, a readiness channel, startup failure selection, and focused tests. Add the required OpenSpec delta. Merge into `sync-gqadonis-8c7377a1`, wait for `Publish Image (GHCR)`, verify the exact SHA tag and binary, then update BossFang's `UAR_IMAGE` pin.

Acceptance must include the release boundary. A source commit without a pullable image is incomplete.

## Gap 2 — KBD identity, migration, and typed commands

### Candidate A — operational focus only

The documented immediate remedy is to set `KBD_FOCUS_PROJECT_PATH` and fully reload launchd. This is necessary but rejected as a complete solution:

- the checked-in launchd/systemd templates do not contain the variable;
- the installer has no focus argument or placeholder, so reinstalling erases a manual edit;
- migration would still convert annotated `DONE (...)` rows to pending;
- nested children would still be imported with no parent.

### Candidate B — multi-project daemon redesign

Rejected for this child. The current Sovereign Sync control plane intentionally owns one focused KBD runtime. Adding a project registry and multiplexed stores would be a materially larger architecture change than the observed defect requires.

### Candidate C — focused migration and installer repair

Selected. It reuses all existing cryptographic, OpenRaft, redb, REST, and projection machinery and changes only the defective boundaries:

1. Parse the leading semantic status token from annotated legacy values while refusing near-matches.
2. Derive canonical nested phase IDs and parent IDs from `phases/<root>/children/<child>/.../progress.json`; translate the waypoint slug path into those canonical IDs.
3. Add migration regressions for annotated status and nested hierarchy.
4. Add a durable `--kbd-focus-project <path>` installer option (with an environment fallback), validate the project root, and render `KBD_FOCUS_PROJECT_PATH` into both launchd and systemd templates.
5. Track BossFang's immutable `.prometheus/project.json` so all merged worktrees use one repository identity.
6. Build/install the patched `prometheus` and `sovereign-sync` binaries, re-render/reload the daemon focused on the active linked worktree, and migrate only after backup plus dry-run assertions.
7. Prove an idempotent typed mutation, revision advancement, compatibility projection, full daemon restart, and replay.

No external library fits because the defects are in repository-specific legacy semantics and service installation. New parsing or service-manager dependencies would be disproportionate.

### Worktree identity constraint

`repository_fingerprint` currently falls back to the linked worktree's canonical path because `.git` is a file there, but the immutable UUID—not the fingerprint—is the control-plane routing key. Tracking the manifest is the smallest stable remedy for BossFang. A broader cross-worktree discovery redesign is not required for this child and would complicate existing identity/key-storage guarantees.

## Gap 3 — kernel-handle clippy baseline

The only candidate is a direct fixture signature update. `KernelHandleStub` deliberately returns unavailable/empty defaults. All three mismatches must be corrected:

- `knowledge_add_entity(&self, entity, agent_id: &str, peer_id: Option<&str>)`
- `knowledge_add_relation(&self, relation, agent_id: &str, peer_id: Option<&str>)`
- `knowledge_query(&self, pattern, peer_id: Option<&str>)`

The new scoping parameters remain intentionally ignored by the stub. No library, adapter, or production code change is warranted.

The focused reproducer is:

```text
cargo clippy -p librefang-kernel-handle --all-targets --features test-stub -- -D warnings
```

The final gate remains the repository-required full workspace all-target clippy command.

## Ordering analysis

1. Repair and test Prometheus migration/installer code before any live migration.
2. Repair UAR in its isolated worktree and open/merge the sync-branch change; image publication may run while local BossFang/KBD work continues.
3. Fix the independent kernel stub and verify the focused gate.
4. Install/reload KBD tooling only after its repository tests pass; then perform migration with a fresh automatic backup and semantic before/after assertions.
5. Update BossFang's UAR image pin only after GHCR resolves the exact new tag.
6. Run consolidated certification across all three repositories, record remote evidence, and exit the child.

This ordering prevents a live state migration from being used as a test harness and prevents BossFang from pinning a not-yet-published image.

## Open questions

None requires user choice. The user explicitly authorized all three repairs. The selected approaches reuse first-party mechanisms and are not contested by a comparably safe lower-scope alternative.

## Build-versus-adopt summary

- UAR listener/READY: **ADAPT** the proven upstream implementation.
- KBD runtime/control path: **ADOPT** existing signed command/OpenRaft/replay machinery; **BUILD** only parser, hierarchy, and durable focus-installation corrections.
- Project identity: **ADOPT** and track the existing immutable manifest.
- Kernel stub: **BUILD** a signature-only fixture correction.
- New third-party dependencies: **NONE**.
