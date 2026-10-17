# SurrealDB parity for the upstream sync (verify and complete the 2026-10-16 schema work)

## Observed requirement
`chore/upstream-merge-2026-10-16-schema` already adds:
- migrations `050_task_queue_timeout_secs`, `051_task_queue_claim_columns`, `052_ephemeral_runs_truncated`, `053_workflow_runs_cancelled`, `054_run_ownership_columns` (`e2f5382a2`)
- Surreal manifest-version and ephemeral-run stores, and per-task claim TTL (`107f38cd3`)

The 16 newer upstream commits brought in by C-001 may add more SQLite schema.
`SurrealTaskBackend::task_reset_stuck` filters on an undefined `updated_at` (phase-11 carry-forward).

## Scope
Review and complete the existing parity work on the C-001 branch:
- confirm each migration is registered and numbered after the merged head
- confirm every new SQLite table and column from all consumed upstream commits has a Surreal migration and backend support (`timeout_secs`, claim columns, `truncated`, workflow `cancelled`, `owner_agent_id` / `billed_agent_id`, the manifest-version and ephemeral-run stores)
- fix the `task_reset_stuck` sweep

Owner: `surrealdb-schema-engineer`.

## Boundary
No surrealdb or surreal-memory pin changes; schema work limited to parity for synced upstream schema plus the `task_reset_stuck` defect.
