## ADDED Requirements

### Requirement: SurrealDB parity for synced SQLite schema
Every SQLite table or column added by an upstream sync SHALL have a registered SurrealDB migration and Surreal backend support before the sync merges, proven in embedded and remote mode.

#### Scenario: task timeout persisted
- **WHEN** a task with `timeout_secs` is written and read through the Surreal task-queue backend
- **THEN** the value round-trips in embedded and remote mode

#### Scenario: manifest version restore on SurrealDB
- **WHEN** a manifest version is saved and restored with the Surreal backend selected
- **THEN** the restored manifest equals the saved one and no SQLite pool is required

#### Scenario: stuck task sweep
- **WHEN** a task stays claimed past its timeout on the Surreal backend
- **THEN** `task_reset_stuck` returns it to pending
