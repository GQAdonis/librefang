# Agent Fabric Convergence planning workspace

This directory is an independent KBD initiative inside a BossFang linked worktree. Its `.prometheus/project.json` identifies this initiative, not BossFang or any participating product. Run every KBD command with this directory as the explicit `--path`. Never run a convergence transition against a product root or adopt this identity into another registered project.

The operator authorized worktree creation and planning. Product implementation, expensive builds, service restarts, deployments, merges and publications are not part of this planning turn. Future execution follows the reviewed plan and its dependency gates. Do not interpret unexecuted tasks as completion.

All affected repositories have separate linked worktrees on `codex/agent-fabric-convergence`; exact paths, baselines and source-checkout divergences are in `repository-manifest.json`. Never edit an original checkout, an existing integration worktree, or another task's phase records. Matching branch names do not establish cross-repository atomicity or isolate shared databases, ports, caches, installed tools or KBD identity.

The active `UAR Working Agent` task owns the UAR/Boss integration surface and its delivery. Its plan is an external dependency, not a dispatch instruction for this initiative. No competing implementation writer may start on those surfaces until a committed contract checkpoint and ownership agreement are recorded.

The parent repository's contribution and preservation rules apply to these planning files. Execution in another repository follows that repository's own instructions and pinned versions. Do not propagate conflicting commit-attribution or dependency policies between repositories.

Use typed KBD commands for state transitions; progress and waypoint files are projections. Maintain independent implementation, evidence, certification and publication status. Read README.md, the latest handoff and canonical status before resuming.

Before dispatching each remaining AFC task in any harness, run `node scripts/model-dispatch.mjs resolve --harness <codex|claude-code|opencode|kimi-code|deepseek-harness>` from this directory. The resolver checks canonical KBD completion against the linked OpenSpec task and returns the selected model and exact launch contract from `model-dispatch.json`. Do not use the historical change-level `modelClass` in `work-packages.json` to override this task-level choice. A missing native route launches an external Codex agent at the preferred model; it never silently downgrades. Use `launch --prompt-file <reviewed task handoff>` to apply the selection to a fresh agent run. Existing conversations cannot be switched by editing this policy; hand them off to a newly launched agent. Follow `model-dispatch.md` for gateway and harness limitations. Model routing does not advance a task or open a verification gate.
