# Handoff in — phase-10-uar-sidecar-availability > uar-readiness-and-tooling-repair

**Spawned by:** phase-10-uar-sidecar-availability

## Why this child was spawned

The parent phase discovered that its published UAR sidecar artifact violates the listener/readiness contract, canonical KBD initialization cannot reach the focused control project, and repository-wide clippy is blocked by an independent test-stub drift. These must be closed before the parent continues.

## Inputs (paths from the parent node)

- .kbd-orchestrator/phases/phase-10-uar-sidecar-availability/assessment.md
- .kbd-orchestrator/phases/phase-10-uar-sidecar-availability/plan.md

## Success criteria

1. A UAR sync-branch commit retains the listener, emits `READY` only after initialization, publishes successfully to GHCR, and BossFang pins and verifies that exact image.
2. KBD migration preserves annotated completion and nested child hierarchy; the active BossFang worktree has a stable identity, the daemon is explicitly focused and reloaded, migration succeeds from backup, and a typed mutation survives restart/replay.
3. The kernel-handle test stub matches its trait and full workspace all-target clippy passes.
4. Each repair is committed in its owning repository with rollback and verification evidence recorded.

## Expected deliverables

- UAR source/test/OpenSpec change, published image digest, and BossFang Docker pin.
- Prometheus KBD migration source/tests plus operational focus/restart evidence.
- BossFang kernel fixture correction and restored certification.
- Child assessment, analysis, plan, execution, verification, reflection, and handoff artifacts.
