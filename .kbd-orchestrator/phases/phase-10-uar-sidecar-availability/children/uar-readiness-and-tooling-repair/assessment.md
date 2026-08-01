# ASSESSMENT: uar-readiness-and-tooling-repair

**Project:** BossFang, with bounded upstream work in Universal Agent Runtime and Prometheus KBD
**Date:** 2026-07-31
**Codebase baseline:** Phase 10 is 5/8 in the legacy ledger; the sidecar implementation is committed on `codex/phase10-sidecar-completion`, but its published UAR image and canonical KBD control path are not yet trustworthy.
**Cross-tool progress:** No repair implementation changes exist in this child yet. C-006 through C-008 were implemented in the parent phase before this child was created; the prior sibling child completed the deterministic supervision-policy correction.

## Implementation status

- **UAR retained listener:** PARTIAL — Prometheus-AGS UAR `main` contains the correct retained-listener and post-initialization readiness design in `src/bin/uar-sidecar.rs` and `src/server.rs`. The dedicated `GQAdonis/sync-gqadonis-8c7377a1` branch consumed by BossFang does not: commit `fb2e0a8ce07c904755dc06aa4ce7aa8df605002e` still drops the ephemeral listener, prints `READY:{port}`, then loads configuration and rebinds.
- **Published UAR artifact:** MISSING FIX — BossFang's `Dockerfile` pins `ghcr.io/gqadonis/universal-agent-runtime:fb2e0a8...`. That image exists and contains `uar-sidecar`, but it embodies the racing startup contract. The sync branch's `publish-ghcr.yml` publishes a commit-addressed image automatically on push.
- **BossFang readiness defense:** DONE, but not sufficient — the supervisor waits for `/healthz` and `/readyz`, so premature stdout does not become a false healthy state. Health probing does not prevent another process from claiming the released port, so the upstream defect remains material.
- **KBD project identity:** PARTIAL — this worktree has `.prometheus/project.json` with project ID `eca657d1-b62b-4085-b712-d398b35c1903`; the main worktree has no manifest. The manifest is not currently committed, so linked worktrees can acquire unrelated UUIDs.
- **KBD daemon focus:** MISCONFIGURED — launchd runs Sovereign Sync with working directory `/Users/gqadonis/Projects/prometheus/prometheus-skill-pack` and no `KBD_FOCUS_PROJECT_PATH`. Authenticated probes for both the worktree ID and the failed migration ID return `404 unknown KBD project`.
- **KBD legacy migration:** PARTIAL/DEFECTIVE — `migrate_legacy_ledgers` accepts object-form changes, but `parse_work_status` requires an exact token. BossFang uses annotated values such as `DONE (merged #108 ...)`, so five completed rows become pending and the generated parent projection falls from 5/8 to 0/8. Nested `progress.json` files are collected recursively, but `legacy_phase` assigns every imported phase `parent_phase_id: None`, flattening child phases into top-level phases.
- **Kernel-handle clippy baseline:** MISSING UPDATE — `KnowledgeGraph` added `agent_id` and `peer_id`, while `KernelHandleStub` retained the old signatures. `cargo clippy -p librefang-kernel-handle --all-targets --features test-stub -- -D warnings` reproduces exactly three E0050 errors.

## Cross-tool progress

- **C-SPK-001:** DONE (Codex) — retry policy is deterministic at the readiness boundary; five in-memory policy tests and repeated process-boundary runs pass.
- **C-001 through C-005:** Recorded DONE in the parent compatibility ledger.
- **C-006 through C-008:** Implemented and committed in the current worktree, but the parent legacy ledger still records them pending pending parent-phase reconciliation.

## Evidence and root causes

### Primary evidence carried with this artifact

The following observations were captured directly on 2026-07-31 so downstream stages and isolated reviewers do not have to trust session-local assertions.

```text
$ rg -n "UAR_IMAGE" Dockerfile
10:ARG UAR_IMAGE=ghcr.io/gqadonis/universal-agent-runtime:fb2e0a8ce07c904755dc06aa4ce7aa8df605002e

$ docker manifest inspect ghcr.io/gqadonis/universal-agent-runtime:fb2e0a8...
mediaType: application/vnd.oci.image.index.v1+json
linux/amd64 digest: sha256:9b386c2b4786dcf9aed9c571aadef77405b50f425472a78044906ccd00626750

$ git show gqadonis/sync-gqadonis-8c7377a1:src/bin/uar-sidecar.rs
let port = {
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await?;
    listener.local_addr()?.port()
};
// The pre-bound socket is dropped here, releasing the port briefly.
let ready_line = format!("READY:{port}\n");
// AppConfig::load() and server::start_server_sidecar(config) occur afterward.

$ git show Prometheus-AGS/main:src/bin/uar-sidecar.rs
let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await?;
let (ready_tx, mut ready_rx) = tokio::sync::oneshot::channel();
let server = server::start_server_sidecar(config_manager, listener, ready_tx);
// READY is emitted only after ready_rx resolves.

$ git show gqadonis/sync-gqadonis-8c7377a1:.github/workflows/publish-ghcr.yml
on:
  push:
    branches:
      - sync-gqadonis-*
# The workflow tags the public GHCR image with GITHUB_SHA and verifies
# /usr/local/bin/uar-sidecar is executable.

$ PlistBuddy -c 'Print :WorkingDirectory' ai.prometheus.sovereign-sync.plist
/Users/gqadonis/Projects/prometheus/prometheus-skill-pack
$ PlistBuddy -c 'Print :EnvironmentVariables:KBD_FOCUS_PROJECT_PATH' ...
Entry does not exist

$ authenticated GET /api/v1/kbd/projects/eca657d1-.../status
HTTP 404 {"error":"unknown KBD project"}
$ authenticated GET /api/v1/kbd/projects/679c55e8-.../status
HTTP 404 {"error":"unknown KBD project"}

$ cargo clippy -p librefang-kernel-handle --all-targets --features test-stub -- -D warnings
E0050 knowledge_add_entity: expected 4 parameters, found 2
E0050 knowledge_add_relation: expected 4 parameters, found 2
E0050 knowledge_query: expected 3 parameters, found 2
```

KBD source inspection additionally established that `parse_work_status` matches only exact uppercase tokens, while live parent rows contain strings beginning with `DONE (`. `legacy_phase` accepts object-form rows but always constructs `Phase { parent_phase_id: None, ... }`, even for recursively discovered files beneath `children/<slug>/progress.json`.

### UAR

The pinned sidecar explicitly scopes the listener to a block, releases it, and documents a supposedly acceptable race. It emits `READY` before `AppConfig::load()` and before `start_server_sidecar()` binds. The current upstream implementation instead passes the retained `TcpListener` into the server and receives a oneshot notification only after runtime, routes, and HTTP application initialization. The required repair is therefore a bounded port of an already-proven upstream design to the dedicated sync branch, followed by a real GHCR publication and a BossFang image-pin update.

This is explicitly cross-repository work:

- **External UAR worktree:** create under `~/.claude/worktrees/` from `GQAdonis/sync-gqadonis-8c7377a1`; expected source paths are `src/bin/uar-sidecar.rs`, `src/server.rs`, an OpenSpec change directory, and focused tests. The dirty UAR main checkout is evidence-only and must remain untouched.
- **BossFang worktree:** update only `/tmp/librefang-phase10-sidecar-completion/Dockerfile` to the newly published commit tag, plus child evidence/spec bookkeeping. BossFang does not duplicate UAR's server implementation.
- **Remote publication boundary:** `.github/workflows/publish-ghcr.yml` belongs to the UAR sync branch and triggers on `sync-gqadonis-*`; its successful output must be inspected before the BossFang pin changes.

### KBD

The 404 is not an authentication failure: the same bearer token reaches the service and receives a project-domain 404. The daemon is simply focused on the skill-pack working directory. A configuration-only focus change is necessary but not sufficient because migration would still corrupt annotated completion state and hierarchy. Canonical initialization is complete only when:

1. the immutable manifest is stable for the BossFang repository/worktree;
2. the daemon is reloaded with the active BossFang worktree as `KBD_FOCUS_PROJECT_PATH`;
3. migration preserves 5/8 parent completion and both child relationships;
4. a typed command commits through the control plane and replays after restart;
5. compatibility projections remain consistent with the committed journal.

#### Current typed-mutation path and observed gap

The typed path exists; it is blocked before submission by project focus, not absent:

1. `tools/prometheus-cli/.../commands/kbd.rs` opens the repository's canonical manifest/runtime, obtains current state with `ControlClient::status`, builds a signed `CommandEnvelope` with `expected_revision` and a unique `command_id`, then POSTs it to `/api/v1/kbd/projects/{project_id}/commands` (`ControlClient::submit`, lines 527–537).
2. `substrate/sovereign-sync/src/rest_api.rs` registers that authenticated route (line 738) and rejects an ID that differs from its focused runtime as `unknown KBD project`.
3. `substrate/sovereign-sync/src/kbd_control.rs::submit` validates and commits through OpenRaft `client_write` (line 254), surfaces state-machine validation errors, then writes compatibility projections from the committed state (line 268).
4. On daemon startup, `bootstrap_standalone_audit_log` imports a compatible standalone signed journal into the single-voter redb/Raft state when the manifest project ID matches. `Runtime::replay` independently verifies the local signed journal.

Current failure ordering is therefore:

```text
CLI/worktree manifest eca657d1-...
  -> authenticated REST request
  -> daemon focused on skill-pack runtime
  -> project-ID mismatch / HTTP 404
  -> no typed command reaches OpenRaft
```

After the focus repair and safe migration, the proof must exercise the full path rather than merely observing `status`: register or transition a disposable child-owned typed task/decision, assert revision advancement and compatibility projection content, fully restart Sovereign Sync, then assert the same command result/state replays. A duplicate submission with the same command ID should return the original committed result rather than append another event. Failure of any of those assertions is a control-plane blocker.

### Kernel stub

This is a surgical fixture drift issue, not an architectural defect. Adding ignored `agent_id`/`peer_id` parameters restores trait conformance without changing stub behavior.

## Spec gap summary

- The parent UAR sidecar specification describes `READY` as listener-bound, but the pinned artifact violates that contract.
- KBD's immutable project-identity contract is not operational for this linked worktree because the manifest is local/uncommitted and the daemon has no project focus.
- KBD migration fixtures do not cover annotated status strings or nested legacy child directories, despite both shapes existing in a live project.
- The kernel test-stub feature is absent from narrow default clippy checks; workspace feature unification exposes the stale signatures only in all-target certification.

## Build health

- BossFang workspace library check: PASS from parent verification.
- BossFang `librefang-channels` tests and scoped clippy: PASS from the prior child.
- BossFang kernel-handle with `test-stub`: FAIL — three E0050 signature errors.
- BossFang full all-target clippy: FAIL for the same baseline mismatch.
- Pinned UAR image existence: PASS — public amd64 OCI image resolves.
- Pinned UAR readiness semantics: FAIL by direct source inspection.
- KBD daemon health: PASS at `/health`; project status: FAIL with authenticated 404.
- Canonical KBD runtime initialization: NOT INITIALIZED after the prior unsafe attempt was rolled back.

## Constraint compliance

- BossFang main worktree remains untouched; all BossFang changes stay in the linked worktree.
- The dirty UAR main worktree contains user changes and will not be edited. Any UAR repair must use a new worktree under `~/.claude/worktrees/` based on the dedicated sync branch.
- The dirty Prometheus skill-pack main worktree contains memory writes and will not be edited. Any migration repair must use a separate linked worktree.
- No verification suppression, ignored test, timeout inflation, force push, or destructive reset is acceptable.
- UAR requires an OpenSpec delta for the startup-contract correction.

## Test coverage assessment

- UAR needs a regression proving the listener remains exclusively owned until serving readiness, plus a failure-path assertion that configuration/server startup cannot emit `READY`.
- KBD needs migration fixtures for annotated statuses and nested parent/child progress paths, plus an authenticated typed-command/restart proof against the locally focused daemon.
- Kernel-handle needs the existing all-target feature compilation gate; no new behavioral test is necessary because the change only restores trait conformance.

## Gaps and risks

1. A source-only UAR fix is incomplete until the new commit-addressed GHCR image exists and BossFang pins it.
2. Reconfiguring launchd without fixing migration would merely make a corrupting migration reachable.
3. Tracking the immutable project manifest is required for repository-wide identity, but daemon compatibility projections still target its configured focus worktree; the focus must remain explicit.
4. UAR's sync branch has diverged from current upstream APIs, so wholesale cherry-picking is riskier than a minimal retained-listener/ready-channel port.
5. Canonical migration is stateful and destructive to projections; an automatic backup and before/after semantic assertions are mandatory.

## Assessment conclusion

All three repairs are bounded and actionable. The UAR and KBD items each require more than the initially stated one-line remedy: UAR must close the release/consumption loop, and KBD must correct migration semantics before reconfiguration and initialization. The kernel fixture update is independent and surgical.

## Unresolved adversarial-review findings

After two revision rounds, artifact-mode review still reports one CRITICAL evidence-isolation finding: the review packet is rooted in the BossFang repository and therefore cannot verify source paths in the external Prometheus KBD repository even though command excerpts and observations are carried above. The finding is not dismissed. The analyze stage must independently reopen the exact external KBD files, record commit identities and line-addressed excerpts in its own evidence, and must not plan or execute the KBD repair if those claims fail re-verification. The review's contradiction warning was resolved by distinguishing parent-phase implementation from this child's repair work.
