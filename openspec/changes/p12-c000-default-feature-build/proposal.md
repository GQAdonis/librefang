# Restore a green baseline on main before the sync

## Observed requirement
`cargo check --workspace --lib` exits 101 on `main` (`fd7eae85f`).
`row()` and `rows()` in `crates/librefang-api/src/routes/uar_model_catalog.rs:28,46` are only called from the `#[cfg(feature = "uar-driver")]` branch, and `[workspace.lints.rust] warnings = "deny"` (`Cargo.toml:375-376`) makes the dead code an error.
`docs/upstream-merges/2026-10-16.md` (on `chore/upstream-merge-2026-10-16`) also records failures already present on `origin/main`, untouched by that merge:
- `substrate::tests::test_task_prune_finished_respects_age_and_status`
- `uar_a2a_test`: 7 failures, 401 on `/api/uar/discovery/agents` and the A2A routes
- `task_board_assignee_wake_test`
- kernel `every_config_field_is_reload_classified` (`a2a_public_url`)
- `the_tool_schema_advertises_the_step_routing_fields_the_spec_accepts` (`uar_bound`)
- clippy `-D warnings` in `bauar_harness_host.rs`, `bauar_harness_delegation.rs` and `config_store_overlay_test.rs`
- dashboard `tsc` errors in `StepAgentBinding.test.tsx` and `UarChatControl.tsx`

Without a green baseline, a post-sync failure cannot be attributed to the sync.

## Scope
Re-run each listed check on current `main`, then fix every one still failing at its root: no `#[ignore]`, no lint suppression, no widened assertions.
Owners: bossfang-feature-steward for UAR/API, a delegated agent for kernel and memory, `prometheus-ui-ux` skill-bound work for the two dashboard files.

## Boundary
No behaviour change beyond what each fix requires; checks already passing on current `main` are recorded as already fixed.
