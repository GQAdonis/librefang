Task model assignments: see `.kbd-orchestrator/phases/phase-12-sync-uar-refresh-dot-facade/plan.md` → "Task model assignments", rows keyed by this change ID.

Prerequisite for every task: C-001 is merged to `main`, and this change runs on a fresh worktree from that `main`.

## 1. Record the target
- [ ] 1.1 Add a "Qualified runtime" section to `docs/bossfang-uar-connections.md` with:
  - the image, digest and source commit
  - the required capabilities: `service_instance_placement_v1`, `full_harness_delegation_v1`, `tool_admission_v2` and profile `uar.service-instance/1`
  - the 1.1.1 prerequisites: compiler REST is unavailable under remote ingress or the shared credential policy, and `security.provider_credentials.installation_id` plus an approved credential-owner migration are required

## 2. Remove stale prose
- [ ] 2.1 Correct the `uar-driver` comment in `crates/librefang-kernel/Cargo.toml` and the kreuzberg comment in `.github/workflows/docker-publish.yml`.
- [ ] 2.2 Update the upstream-merge skill gotcha that names the deleted fork, and add a "historical — superseded by connection-only UAR" note to the three architecture documents.

## 3. Live probe (human-only)
- [ ] 3.1 Write the probe commands and hand them to the operator: run `1.1.0@sha256:064f5004…`, then `GET /readyz`, `GET /api/uar/capabilities`, and `POST /api/uar/compatibility` with BossFang's request. Record the returned JSON shapes against `uar.rs` deserialization as evidence, or open a follow-up change if they don't match.

## 4. Verify and land
- [ ] 4.1 `cargo check --workspace --lib` exits 0 and `python3 scripts/enforce-branding.py --check` exits 0.
- [ ] 4.2 Fresh-context review (code-reviewer), then a PR with `--repo GQAdonis/librefang`; after the operator merges, confirm the final head SHA is an ancestor of `origin/main`.
