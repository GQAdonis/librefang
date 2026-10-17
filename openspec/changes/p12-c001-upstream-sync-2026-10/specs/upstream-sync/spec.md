## ADDED Requirements

### Requirement: complete upstream sync preserves BossFang surfaces
An upstream sync SHALL consume every commit of `upstream/main` at the chosen tip and SHALL leave BossFang branding, the SurrealDB default backend, surreal-memory, the UAR connection model and the BOSSFANG_* env aliases intact.

#### Scenario: all commits consumed
- **WHEN** the sync merges
- **THEN** `git rev-list --count origin/main..upstream/<tip>` is 0

#### Scenario: branding audit
- **WHEN** `python3 scripts/enforce-branding.py --check` runs on the merged tree
- **THEN** it exits 0

### Requirement: legacy SQLite migrations apply exactly once
The SQLite migration sequence SHALL apply BossFang's and upstream's steps exactly once on fresh databases and on databases already stamped by either lineage.

#### Scenario: fresh database
- **WHEN** a new database opens on the merged build
- **THEN** every migration applies once and the schema version equals the merged `SCHEMA_VERSION`

#### Scenario: database stamped by BossFang v62
- **WHEN** a database at BossFang schema 62 opens on the merged build
- **THEN** `task_queue.timeout_secs` and `ephemeral_runs.truncated` exist and the workflow_runs rebuild is not re-run

#### Scenario: database stamped by upstream v62
- **WHEN** a database at upstream schema 62 opens on the merged build
- **THEN** `ephemeral_runs.truncated` and the workflow_runs rebuild each apply once

#### Scenario: database stamped by upstream v63
- **WHEN** a database at upstream schema 63 opens on the merged build
- **THEN** the workflow_runs rebuild applies once and no upstream step re-runs
