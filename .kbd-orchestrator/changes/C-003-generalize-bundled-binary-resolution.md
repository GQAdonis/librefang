# Change C-003 — Generalize bundled-binary resolution; fail loudly when unresolvable

**Phase:** phase-10-uar-sidecar-availability
**Status:** SPECCED
**Depends on:** nothing — pure in-tree refactor, testable without UAR
**Files to touch:** `crates/librefang-channels/src/sidecar.rs`
**Closes:** G-4, G-8

## Why — this is the actual bug

`resolve_sidecar_command` (`sidecar.rs:728`) already implements exactly the right
algorithm, but it is **hardcoded to one program**:

```rust
const TELEGRAM_SIDECAR_STEM: &str = "librefang-sidecar-telegram";
```

Only an empty command or that literal stem is eligible for resolution. Every other program
name — including `universal-agent-runtime` — is treated as "explicit operator intent" and
falls straight through to a bare OS `PATH` lookup via `Command::new(&ctx.command)`
(`sidecar.rs:783`).

That is why the reported error happens. The failure is then wrapped opaquely
(`sidecar.rs:822-827`):

```
Failed to spawn sidecar 'uar' (universal-agent-runtime): No such file or directory (os error 2)
```

The user sees an OS errno and concludes their `PATH` is wrong. It isn't — the binary was
never shipped, and nothing tells them where we looked.

## Scope

- Parameterize the resolver by stem so more than one bundled binary can use it.
- Make an unresolvable *bundled* binary fail with an actionable message that names every
  path searched.

**Out of scope:** spawning UAR (C-006), config (C-005). This change is self-contained and
should land on its own merits — it also improves the Telegram path.

## Tasks

1. Replace `TELEGRAM_SIDECAR_STEM` / `telegram_sidecar_file_name()` with a stem-parameterized
   helper. Keep the algorithm **byte-for-byte identical** — it is proven:
   1. `std::env::current_exe()?.parent()` + platform file name (`.exe` on Windows)
   2. `<home_dir>/bin/<file_name>`
   3. the original command (PATH fallback — historical behaviour)
2. Preserve the eligibility gate exactly: only an empty command or a known bare stem is
   eligible. Anything path-shaped, or any other program (`python3`, `uv`, …), is returned
   unchanged so explicit operator intent always wins.
3. Register `uar-sidecar` as a second known stem.
4. **Fail loudly.** When a command *was* eligible for bundled resolution and no candidate
   existed, do not silently degrade to a PATH lookup that will produce `os error 2`.
   Return an error naming each path tried:
   ```
   uar-sidecar not found. Searched:
     - /usr/local/bin/uar-sidecar            (next to the librefang executable)
     - /root/.librefang/bin/uar-sidecar      (librefang update install dir)
     - $PATH
   The UAR binary ships in the container image and the release tarball; if you are
   running a custom build, set [uar] command = "/path/to/uar-sidecar".
   ```
5. Keep the existing Telegram behaviour bit-for-bit. Its tests must pass untouched.

## Acceptance criteria

- `resolve_sidecar_command` (or its successor) resolves both the Telegram stem and
  `uar-sidecar` via the same three-step search.
- An explicit path or a foreign program name is still returned unchanged.
- A missing **bundled** binary produces the actionable multi-path error above — **never**
  a bare `No such file or directory (os error 2)`.
- All pre-existing Telegram sidecar tests pass unmodified.

## Verification

```bash
cargo test -p librefang-channels
cargo clippy -p librefang-channels --all-targets -- -D warnings
```

New unit tests (no UAR binary required — that is the point):

- resolves to the `current_exe()` sibling when present
- falls back to `<home>/bin/` when the sibling is absent
- returns an explicit absolute/relative path unchanged
- returns a foreign program name (`python3`) unchanged
- **an eligible-but-missing bundled stem errors, and the message names all three searched
  locations** — this is the regression test for the reported bug

Write the missing-binary test to resolve a nonexistent path rather than relying on a host
path existing (see #5716), so it is platform-independent.
