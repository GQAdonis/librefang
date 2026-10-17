# Record UAR 1.1.0 as the qualified runtime target and remove stale UAR prose

## Observed requirement
No BossFang file pins a UAR image (BossFang borrows an independently owned UAR).
Operator decision Q10: target `ghcr.io/prometheus-ags/universal-agent-runtime:1.1.0@sha256:064f5004fb3ba76506abce5cf81285b2a8aa3e54fa5a22e2c2bfc97b1211e43b` (source `d815ef72`) now, and re-target 1.1.1 in its own change once it is published.
Several comments and docs still describe the deleted `GQAdonis/universal-agent-runtime` fork or the in-process `uar-driver` → UAR dependency.

## Scope
- Record the target, its required capabilities and the two 1.1.1 deployment prerequisites in `docs/bossfang-uar-connections.md`.
- Correct the stale prose in `crates/librefang-kernel/Cargo.toml:83`, `.github/workflows/docker-publish.yml:11` and `.claude/skills/librefang-upstream-merge/SKILL.md`.
- Mark `docs/architecture/uar-sidecar-assessment.md`, `uar-runtime-integration-research.md` and `bossfang-rebrand-completion.md` historical where they describe the superseded model.
- Prepare the human-only live probe.

The matching comment in `crates/librefang-cli/Cargo.toml:46` is excluded: `AGENTS.md` and `constraints.md` forbid modifying `librefang-cli` without explicit operator instruction, and that is pending.
Owner: `bossfang-feature-steward`.

## Boundary
No driver code change unless the live probe finds a mismatch, which becomes its own change. Historical KBD records stay unchanged.
