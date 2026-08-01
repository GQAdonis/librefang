EXECUTION: uar-readiness-and-tooling-repair
Project: BossFang
Date: 2026-07-31
Selected backend: hybrid
Dispatched to: OpenAI Codex (SELF) in isolated linked worktrees; native KBD progress with the UAR repository's required OpenSpec delta
Backend rationale: The three changes cross repository, release, and signed-control boundaries. Codex can keep each source edit isolated and inspectable, while native KBD remains the parent ledger and UAR OpenSpec supplies repository-local traceability.
Backend entrypoint: /kbd-execute uar-readiness-and-tooling-repair C-URT-001
OpenSpec available: YES
Source plan: .kbd-orchestrator/phases/phase-10-uar-sidecar-availability/children/uar-readiness-and-tooling-repair/plan.md

EXECUTION SCOPE

- C-URT-001: Port retained-listener readiness to the shipped UAR sync line, publish its immutable image, and pin BossFang to it.
- C-URT-002: Repair KBD migration semantics and install durable project-focused control before performing a backed-up canonical migration.
- C-URT-003: Update the three stale kernel-handle test-stub method signatures and restore all-target certification.

DISPATCH CONTRACTS

- C-URT-001 → OpenAI Codex (SELF)
  Entry: Implement changes/C-URT-001/spec.md in an isolated UAR worktree, including the repository-required OpenSpec delta; integrate only after focused verification, then prove the exact GHCR SHA tag before changing BossFang.
  Model class: frontier
  Concrete model: claude-sonnet-4-6
  Model rationale: Cross-repository source, CI, publication, and immutable consumption form a high-risk release boundary.
  Progress file: .kbd-orchestrator/phases/phase-10-uar-sidecar-availability/children/uar-readiness-and-tooling-repair/progress.json
  Handoff: Mark implementation complete only when retained-listener tests, integrated source, public image, and BossFang pin are all present; preserve independent evidence/publication state.

- C-URT-002 → OpenAI Codex (SELF)
  Entry: Implement changes/C-URT-002/spec.md in an isolated Prometheus skill-system worktree; back up installed artifacts, repair/reload focused control, dry-run and apply canonical migration, then prove idempotent typed mutation and restart replay.
  Model class: frontier
  Concrete model: claude-sonnet-4-6
  Model rationale: Signed migration and daemon replay span persistence, identity, compatibility projections, and live local control.
  Progress file: .kbd-orchestrator/phases/phase-10-uar-sidecar-availability/children/uar-readiness-and-tooling-repair/progress.json
  Handoff: Never hand-edit canonical projections or delete failed runtime state; retain backup hashes and typed audit evidence.

- C-URT-003 → OpenAI Codex (SELF)
  Entry: Implement changes/C-URT-003/spec.md only in crates/librefang-kernel-handle/src/test_stub.rs and run focused test-stub clippy/test before the workspace gate.
  Model class: small
  Concrete model: Qwen3.5-9B-Q8_0
  Model rationale: Three ignored parameters in one test-only file with no production behavior change is a bounded mechanical correction.
  Progress file: .kbd-orchestrator/phases/phase-10-uar-sidecar-availability/children/uar-readiness-and-tooling-repair/progress.json
  Handoff: Record the exact focused feature commands and preserve the stub return values.

APPROVAL GATES

- Do not integrate a new UAR commit until its source and OpenSpec checks pass.
- Do not change the BossFang image pin until the exact integrated SHA is publicly pullable and contains the sidecar binary.
- Do not apply KBD migration until dry-run semantic counts pass and recoverable binary, service, and runtime backups exist.

FALLBACK CONDITIONS

- If a repository cannot retain inspectable bounded progress, fall back to its OpenSpec task driver; UAR already requires and receives this delta.
- If live KBD control cannot prove identity and replay after the repaired installation, stop operational mutation and preserve the backups and diagnostic state.

VERIFICATION REQUIREMENTS

- Execute every command in plan.md's UAR, skill-system, live KBD, and BossFang verification matrices.
- Run artifact-refiner and diff-mode adversarial review for changes touching three or more files; C-URT-003 is exempt by the documented heuristic.
- Finish with BossFang workspace check, all-target clippy, scoped sidecar tests, branding audit, and git diff validation.

PROGRESS LEDGER

- COMPLETE C-URT-001 — OpenAI Codex; UAR PR #5 merged, exact image published/probed, BossFang pinned, OpenSpec archived in PR #6
- COMPLETE C-URT-002 — OpenAI Codex; KBD PR #37 merged, focused daemon installed, migration/restart/idempotency proof passed
- COMPLETE C-URT-003 — OpenAI Codex; kernel-handle fixture signatures repaired and full all-target workspace Clippy passed

OUTPUTS

- UAR retained-listener implementation, OpenSpec delta, integrated commit, and SHA-tagged GHCR image.
- KBD migration/focus repair, tracked BossFang project manifest, canonical runtime/projections, and replay audit evidence.
- Kernel-handle test-stub signature repair and full certification evidence.

BLOCKERS

- NONE. The asynchronous UAR publication gate completed successfully.

REFLECTION HANDOFF

- Consume implementation diffs, exact verification output, UAR publication provenance, KBD backup/audit/replay evidence, QA/adversarial findings, and any residual operational risk.

EXECUTION READY
