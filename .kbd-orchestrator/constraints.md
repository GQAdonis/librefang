# Constraints for BossFang

These rules apply to every KBD phase and change in this repository. A blocking
constraint prevents completion or archiving until it is resolved.

## Repository and worktree discipline (blocking)

- Work only in a linked worktree. Never edit files in the primary checkout.
- Branch from the current `origin/main` using the `codex/` prefix unless the
  user requests another branch name.
- Do not modify a PR that a human maintainer has reviewed or approved unless
  that maintainer asks for the change. Open a follow-up PR instead.
- Do not close a PR or issue opened by someone else unless a maintainer
  explicitly directs it.
- Never force-push another contributor's branch. Force-pushing an owned branch
  is allowed only while its PR is still unreviewed.
- Never bypass hooks or signatures with `--no-verify`, `--no-gpg-sign`, or
  equivalent flags.
- Never add AI-tool attribution to commits or PR descriptions.

## Three-layer rebrand principle (blocking)

Every change MUST classify branding work into one of three layers. Violating
this rule inflates the conflict surface of every upstream merge.

| Layer | Rule | Concrete examples |
|---|---|---|
| **Internal** | NEVER rename | Cargo crate names (`librefang-cli`, `librefang-runtime`, ...), Rust modules (`librefang_runtime::tool_runner`), function names (`librefang_home()`), Python SDK module names (`librefang_sdk`), workspace paths, test fixtures |
| **Boundary** | Additive aliases only | Environment variables (`BOSSFANG_*` primary plus `LIBREFANG_*` fallback), config keys, and established on-disk paths |
| **Surface** | Use BossFang identity | CLI banners, product name, install output, README and documentation prose, release artifacts, and dashboard chrome |

Decision rule when in doubt:

- 0-1 expected upstream conflicts: Surface.
- A handful of expected conflicts: Boundary.
- Dozens of expected conflicts: Internal.

BossFang surface colors and assets are defined in
`docs/branding/branding-guide.html`. Upstream sky blue (`#0284c7` and
`#38bdf8`) and the upstream fang glyph must not appear in a merged surface.

## Default-value and file migration policy (blocking)

Never rename a default already present on user systems:

- The default home directory remains `~/.librefang/`.
- The default `dashboard_user` and `dashboard_pass` remain `"librefang"`.
- The `noreply@librefang.ai` workspace committer remains unchanged because
  BossFang does not own `bossfang.ai`.

For renamed filesystem artifacts, use the read-old/write-new migration pattern:

1. Detect the new name first and fall back to the legacy name.
2. Write only the new name.
3. Include a one-time migration for an existing artifact.
4. Retain the legacy read fallback for the agreed compatibility window.

## Domain ownership (blocking)

- BossFang-owned: `github.com/GQAdonis/librefang` and
  `github.com/GQAdonis/librefang-registry`.
- Upstream-owned and not to be claimed: `librefang.ai`,
  `docs.librefang.ai`, `stats.librefang.ai`, and `librefang.com`.
- `bossfang.ai` must not be used as a real URL or email domain until ownership
  is confirmed.

## BossFang fork preservation (blocking)

Every upstream merge must preserve:

- `librefang-storage`, its SurrealQL migrations, and the default
  `surreal-backend` feature.
- The embedded `surreal-memory` backends and their coordinated dependency
  revision.
- `librefang-uar-spec` and the opt-in `UarDriver` feature chain.
- Exact SurrealDB version alignment across BossFang, surreal-memory, and UAR.

Map new upstream SQLite schema changes to a new `.surql` migration and register
it in `crates/librefang-storage/src/migrations/mod.rs`. After every upstream
merge, run `python3 scripts/enforce-branding.py` before committing.

## Implementation rules (blocking)

- Do not modify `librefang-cli` without explicit user instruction.
- New `KernelConfig` fields require `#[serde(default)]`, serialization derives,
  and a matching `Default` implementation entry.
- Register every new API route in `librefang-api/src/server.rs` and implement it
  in the appropriate `routes/` module.
- Preserve the `KernelHandle` dependency boundary.
- Use `.response` on `AgentLoopResult`; `.response_text` does not exist.
- The CLI daemon command is `start`, not `daemon`.
- Do not suppress lints, ignore failing tests, or replace a root-cause fix with
  a test-only workaround.
- Treat recurring timing-sensitive test failures as a design/seam signal. Do
  not increase timeouts as the fix: identify the contract under test, inject
  time/scheduler/process boundaries for policy tests, and reserve real-time
  watchdogs for integration-test deadlock protection rather than performance
  assertions.

## Verification gates (blocking)

Every behavioral change must pass:

1. `cargo check --workspace --lib`
2. Scoped `cargo test -p <changed-crate>`
3. `cargo clippy --workspace --all-targets -- -D warnings`
4. `python3 scripts/enforce-branding.py --check`
5. Any audit or manual flow check implicated by the change

For initialization-only KBD metadata changes, JSON parsing, KBD status, the
branding audit, and a clean Git diff are sufficient; Rust compilation and
tests are not implicated.

## Operational prohibitions (blocking)

- Do not run `cargo build` from the primary checkout.
- Do not launch `librefang start` or `bossfang start` from an agent session.
- Do not push directly to `main` or `master`.
