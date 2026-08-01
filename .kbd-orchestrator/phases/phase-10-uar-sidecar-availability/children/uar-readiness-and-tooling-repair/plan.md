# PLAN: uar-readiness-and-tooling-repair

**Project:** BossFang with bounded UAR and Prometheus KBD upstream repairs
**Date:** 2026-07-31
**Backend:** native-kbd for this child; C-URT-001 additionally creates the OpenSpec delta required by the UAR repository
**Changes to implement:** 3

## Goal-to-change coverage

| Goal | Change | Completion evidence |
|---|---|---|
| Truthful UAR startup protocol | C-URT-001 | listener/negative readiness tests, merged sync commit, successful SHA-tagged GHCR publication, BossFang pin |
| Canonical KBD initialization and typed mutations | C-URT-002 | migration regressions, durable focus templates, tracked manifest, backup/apply, idempotent command + restart replay |
| Restore workspace certification | C-URT-003 | exact three signature updates, focused feature clippy, full workspace all-target clippy |

## Change list

### 1. C-URT-001 — Port, publish, and consume truthful UAR readiness

- **Library:** cand-001 — adapt the first-party retained-listener/oneshot pattern.
- **Scope:** external UAR source/tests/OpenSpec and remote sync branch; BossFang Docker image pin.
- **Depends on:** none.
- **Recommended agent:** Codex in isolated worktrees.
- **Estimated complexity:** M.
- **Complexity score:** High — cross-repository release and immutable artifact consumption.
- **Model class:** frontier.
- **Customer value:** HIGH — removes a startup race from the actual shipped runtime.
- **Execution:** create the prescribed UAR worktree from the sync branch, port only the proven listener/ready contract, add negative and exclusivity tests, validate OpenSpec, verify and commit. Push a review branch, integrate it into the sync branch without force, then verify `Publish Image (GHCR)` produces the exact SHA tag before changing BossFang's Dockerfile.
- **Hard gate:** source completion does not complete this change; the public image and BossFang pin must both be proven.

### 2. C-URT-002 — Repair KBD migration and establish durable focused control

- **Libraries:** cand-002 and cand-003 — retain the signed/OpenRaft runtime and tracked immutable manifest.
- **Scope:** isolated Prometheus skill-system worktree; KBD runtime migration, service templates/installer/tests; local installed binaries/service; BossFang manifest and generated canonical projections.
- **Depends on:** none for source repair; live migration depends on its source tests and recoverable binary/service backups.
- **Recommended agent:** Codex in an isolated worktree, with operator-grade live verification.
- **Estimated complexity:** L.
- **Complexity score:** High — signed state migration, service reload, and cross-process replay.
- **Model class:** frontier.
- **Customer value:** HIGH — restores trustworthy lifecycle state and cross-tool typed control.
- **Execution:** add failing fixtures for annotated statuses, nested IDs/parents, duplicate child slugs, and installer focus. Implement only those boundaries. Commit and build the repaired CLI/daemon; preserve existing binaries and service definition; track BossFang's manifest; install/reload with explicit focus; run check/apply only after semantic dry-run assertions. Commit an idempotent typed child-owned decision/task, restart the daemon fully, and prove replay plus projection consistency.
- **Hard gate:** never hand-edit canonical projections or delete the failed runtime to obtain a pass.

### 3. C-URT-003 — Restore kernel-handle all-target certification

- **Scope:** `crates/librefang-kernel-handle/src/test_stub.rs` only.
- **Depends on:** none.
- **Recommended agent:** Codex.
- **Estimated complexity:** S.
- **Complexity score:** Low.
- **Model class:** small.
- **Customer value:** MEDIUM — restores the repository's required certification signal.
- **Execution:** add ignored `agent_id`/`peer_id` parameters to exactly the three stale methods without changing stub results. Run focused feature clippy/test, then use the repaired baseline in the final full-workspace gate.
- **Hard gate:** no production knowledge-graph edits.

## Execution round order

The source portions are independent. Operational ordering minimizes idle time and state risk:

1. **Round 1A:** Start C-URT-001 through UAR commit/PR so remote CI/publication can run.
2. **Round 1B:** While remote work is running, implement and verify C-URT-003.
3. **Round 1C:** Implement and verify C-URT-002 in its isolated worktree.
4. **Round 2:** Install/reload repaired KBD tooling, then perform backed-up migration and typed restart/replay proof.
5. **Round 3:** After UAR integration and GHCR success, pin BossFang to the exact repaired SHA.
6. **Round 4:** Consolidated repository certification and child reflection/exit.

The plan does not require concurrent agents; the remote UAR workflow is the only asynchronous lane.

## Verification matrix

### UAR repository

- `openspec validate fix-sidecar-ready-contract`
- `cargo fmt --all -- --check`
- `cargo test --locked --no-default-features --features server-full --bin uar-sidecar sidecar_listener_is_retained_until_readiness`
- `cargo test --locked --no-default-features --features server-full --bin uar-sidecar startup_failure_emits_no_ready_signal`
- `cargo check --locked --no-default-features --features server-full --bin uar-sidecar`
- `cargo clippy --locked --no-default-features --features server-full --bin uar-sidecar -- -D warnings`
- `git merge-base --is-ancestor <integrated-sha> gqadonis/sync-gqadonis-8c7377a1`
- `gh run list --repo GQAdonis/universal-agent-runtime --workflow publish-ghcr.yml --branch sync-gqadonis-8c7377a1 --commit <integrated-sha> --json databaseId,status,conclusion,headSha`
- `gh run watch <run-id> --repo GQAdonis/universal-agent-runtime --exit-status`
- `docker manifest inspect ghcr.io/gqadonis/universal-agent-runtime:<integrated-sha>` and assert at least one `linux/amd64` manifest
- `docker run --rm --entrypoint sh ghcr.io/gqadonis/universal-agent-runtime:<integrated-sha> -c 'test -x /usr/local/bin/uar-sidecar'`

### Prometheus skill-system repository

- migration unit tests for annotated status, nested hierarchy, duplicate slugs, active path
- `bash shared/scripts/tests/test-kbd-focus-service-install.sh` for launchd/systemd rendering and invalid-root rejection
- `cargo fmt --all -- --check`
- `cargo clippy -p kbd-runtime --all-targets -- -D warnings`
- `cargo test -p kbd-runtime`
- `cargo check --manifest-path tools/prometheus-cli/Cargo.toml -p prometheus-cli`
- `cargo test --manifest-path substrate/sovereign-sync/Cargo.toml -p sovereign-sync kbd_control`
- source commit excludes dirty main-worktree memory files

### Live KBD control

- `git ls-files --error-unmatch .prometheus/project.json`
- `jq -e '.schemaVersion == "1" and .projectId == "eca657d1-b62b-4085-b712-d398b35c1903" and (.repositoryFingerprint | startswith("sha256:"))' .prometheus/project.json`
- old binaries and service definition backed up
- `bash scripts/install-mcp-services.sh --restart --kbd-focus-project /tmp/librefang-phase10-sidecar-completion` and `PlistBuddy` assertion that the rendered environment contains that exact path
- `curl --fail http://127.0.0.1:7892/health` plus authenticated GET for project `eca657d1-b62b-4085-b712-d398b35c1903` returning HTTP 200
- `prometheus kbd --path . migrate --check` JSON assertions: expected progress-file count, `invalid_files == 0`, `alias_conflicts == 0`
- `prometheus kbd --path . migrate --apply` and SHA-256 verification of every entry in its generated backup manifest
- `prometheus kbd --path . status --json` plus `jq` assertions that `.project_id == "eca657d1-b62b-4085-b712-d398b35c1903"`, phase 10 is 5/8 before parent reconciliation, and both child canonical IDs have the phase-10 parent
- `jq -e --slurpfile manifest .prometheus/project.json '.projectId == $manifest[0].projectId and .generatedBy == "kbd-runtime"' .kbd-orchestrator/current-waypoint.json`
- `prometheus kbd --path . decision record --expected-revision <n> --command-id child-proof-001 ...`; repeat the same command ID and assert unchanged committed revision/result
- `launchctl bootout` + `launchctl bootstrap` of `ai.prometheus.sovereign-sync`, then status/audit assertions for the same run/revision/decision
- `prometheus kbd --path . rollout observe ... --unexplained-projection-mismatches 0` only after the runtime's direct compatibility mismatch check reports an empty set

### BossFang repository

- `grep -F "ARG UAR_IMAGE=ghcr.io/gqadonis/universal-agent-runtime:<integrated-sha>" Dockerfile`
- focused kernel-handle feature clippy/test
- `cargo fmt --all -- --check`
- `cargo check --workspace --lib`
- `cargo clippy --workspace --all-targets -- -D warnings`
- `cargo test -p librefang-kernel-handle --features test-stub`
- `cargo clippy -p librefang-kernel-handle --all-targets --features test-stub -- -D warnings`
- `cargo test -p librefang-channels uar_sidecar`
- `cargo test -p librefang-api --test uar_supervisor_integration`
- `python3 scripts/enforce-branding.py --check`
- `git diff --check`

## Rollback checkpoints

1. UAR remote integration remains revertible and old GHCR tags stay immutable.
2. KBD migration relies on the runtime's automatic SHA-256 backup; installed binaries and service definition receive separate timestamped backups before replacement.
3. BossFang Docker pin and kernel fixture remain isolated, conventional commits.
4. No force push, destructive reset, or deletion of user/runtime data is permitted.

## Explicit scope cuts

- No multi-project KBD daemon architecture.
- No general linked-worktree identity discovery redesign.
- No UAR embedding or broad sync-branch modernization.
- No production knowledge-graph behavior changes.
- No unrelated cleanup in any dirty main worktree.

## Commands to begin

```text
/kbd-execute uar-readiness-and-tooling-repair C-URT-001
```

## Plan complete

The child is ready for execution once adversarial review confirms dependency ordering and acceptance criteria.
