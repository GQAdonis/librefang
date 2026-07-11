# Change C-005 — UAR sidecar config surface

**Phase:** phase-10-uar-sidecar-availability
**Status:** SPECCED
**Depends on:** nothing (but lands with C-006)
**Files to touch:** `crates/librefang-types/src/config/types.rs`, `crates/librefang-api/tests/fixtures/kernel_config_schema.golden.json`
**Closes:** G-6

## Why

`UarConfig` (`config/types.rs:3099`) exists but describes an **in-process LLM driver**, not a
process:

```rust
api_key, model, surreal_data_dir, base_url, remote, share_librefang_storage
```

There is no enable flag, no binary path, and nothing to spawn. Note the trap: `base_url` is
an **LLM-provider** endpoint override passed through to liter-llm (`drivers/uar.rs:97`) —
it is *not* a UAR endpoint. Reusing it for the sidecar would be a silent semantic collision.

## Scope

Extend `UarConfig` with a sidecar block. Mirror `SidecarChannelConfig`'s field names so
operators learn one vocabulary, not two.

## Tasks

1. Add sidecar fields to `UarConfig`:
   - `enabled: bool` (default `false` — opt-in, matching D-2's posture)
   - `command: Option<String>` — empty/bare stem triggers C-003's bundled resolution; an
     explicit path wins
   - `endpoint: Option<String>` — override to talk to an *already-running* UAR instead of
     spawning one (this is how the existing standalone `uar` Deployment stays usable)
   - restart/backoff knobs mirroring `SidecarChannelConfig`: `restart`,
     `restart_initial_backoff_ms`, `restart_max_backoff_ms`, `restart_max_retries`,
     `restart_reset_after_secs`
   - `ready_timeout_ms` — how long to wait for the `READY:{port}` line before declaring
     failure. A child that never prints READY must not hang boot.
2. Per `CLAUDE.md` config rules: struct field + `#[serde(default)]` + a `Default` impl entry
   + Serialize/Deserialize derives. **A field missing from the `Default` impl fails the
   build** — and a field that parses but never reaches the consumer is worse: it silently
   does nothing.
3. `enabled` and `endpoint` are mutually informative: if `endpoint` is set, do **not** spawn
   — connect. Make that precedence explicit and test it.
4. Regenerate the kernel-config golden fixture:
   ```bash
   cargo test -p librefang-api --test config_schema_golden -- --ignored regenerate_golden --nocapture
   ```
5. Decide hot-reload classification in `build_reload_plan`
   (`librefang-kernel/src/config_reload.rs`) and add the row to
   `docs/operations/config-reload.md`. Spawning a process is **not** hot-reloadable in the
   general case — say restart-required rather than pretending otherwise.

## Acceptance criteria

- `[uar] enabled = true` with no `command` resolves the bundled binary via C-003.
- `[uar] endpoint = "http://…"` connects without spawning anything.
- Config round-trips (parse → serialize → parse) with no field loss.
- The golden fixture matches the new schema.
- `docs/operations/config-reload.md` has a row for each new field.

## Verification

```bash
cargo test -p librefang-types
cargo test -p librefang-api --test config_schema_golden
cargo check --workspace --lib
```
