## ADDED Requirements

### Requirement: green baseline before an upstream sync
Before an upstream sync starts, `main` SHALL pass `cargo check --workspace --lib`, `cargo clippy --workspace --all-targets -- -D warnings`, the scoped tests the previous sync report recorded as failing, and the dashboard type check, with no lint suppression or ignored tests.

#### Scenario: default features
- **WHEN** `cargo check --workspace --lib` runs on a clean target directory
- **THEN** it exits 0

#### Scenario: uar-driver enabled
- **WHEN** `cargo check -p librefang-api --features uar-driver --lib` runs
- **THEN** it exits 0 and the UAR model catalog helpers are still used

#### Scenario: previously recorded failures
- **WHEN** the tests listed in `docs/upstream-merges/2026-10-16.md` "Handoffs" run on `main`
- **THEN** each passes or is recorded as already fixed
