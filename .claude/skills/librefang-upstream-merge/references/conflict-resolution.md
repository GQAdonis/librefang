# Merge-conflict resolution rules

Authoritative table. Reapplies the BossFang-specific overlays after
`git merge upstream/main` produces conflicts.

## Always-take-ours (BossFang identity files)

These files contain BossFang's brand identity. When `git` produces a
conflict, take the BossFang version verbatim; cherry-pick any new
upstream additions (e.g. new fields) manually if needed.

| File | Why ours wins | What to keep |
|---|---|---|
| `crates/librefang-desktop/tauri.conf.json` | productName + identifier + updater config are BossFang | `productName: "BossFang"`, `identifier: "ai.bossfang.desktop"`, BossFang descriptions, and the `plugins.updater` block — endpoint `https://github.com/GQAdonis/librefang/releases/latest/download/latest.json`, pubkey key ID `E329A6B2863F1707`; merge upstream's new keys (CSP, etc.) by hand. Upstream #6283 folded the former `tauri.desktop.conf.json` updater config in here. |
| `crates/librefang-desktop/tauri.ios.conf.json` | identifier is BossFang | `identifier: "ai.bossfang.app"` |
| `crates/librefang-desktop/tauri.android.conf.json` | identifier is BossFang | `identifier: "ai.bossfang.app"` |
| `crates/librefang-desktop/icons/*` | binary BossFang artwork | Never overwrite from upstream; regenerate from `docs/branding/boss-libre.png` with `cargo tauri icon` if a refresh is needed |
| `crates/librefang-api/dashboard/src/index.css` `:root` / `:root.dark` blocks | ember palette | All `--brand-color`, `--brand-muted`, `--bg-main` tokens; merge upstream's new utility classes / animations manually |
| `crates/librefang-api/dashboard/src/App.tsx` sidebar brand block | logo + name | `<img src="/boss-libre.png" alt="BossFang" ...>` and the "BossFang" text |
| `crates/librefang-api/dashboard/src/App.tsx` mobile header brand block | same | Same as sidebar |
| `crates/librefang-api/dashboard/public/manifest.json` | PWA manifest | `name: "BossFang Dashboard"`, `short_name: "BossFang"`, `background_color: "#0B0F14"`, `theme_color: "#0B0F14"` |
| `crates/librefang-api/dashboard/index.html` | page title + meta tags | `<title>BossFang Dashboard</title>`, `<meta name="apple-mobile-web-app-title" content="BossFang">`, `<meta name="theme-color" content="#0B0F14">` |
| `crates/librefang-desktop/frontend/connection.html` | desktop connect screen | `<title>BossFang — Connect</title>`, embedded ember palette, `<img alt="BossFang">` |
| `Cargo.toml` workspace `[workspace.package]` `repository` / `homepage` | GQAdonis URLs | `https://github.com/GQAdonis/librefang` for both |
| `crates/librefang-types/src/config/types.rs` `RegistryConfig::default()` | base_url default | `default_registry_base_url()` returns `https://github.com/GQAdonis/librefang-registry` (NOT empty string) |
| `crates/librefang-cli/Cargo.toml` `[[bin]]` block | dual binary | `bossfang` (primary) + `librefang` (legacy alias), both from `src/main.rs` |
| `crates/librefang-api/src/versioning.rs` `VENDOR_PREFIXES` | dual vendor prefix | Array of both `application/vnd.bossfang.` and `application/vnd.librefang.` for back-compat |
| `crates/librefang-skills/src/marketplace.rs` `MarketplaceConfig::default()` | github_org default | `"GQAdonis"` (NOT `"librefang-skills"`) |
| `crates/librefang-api/src/webchat.rs` dashboard release URL | hardcoded BossFang | `https://github.com/GQAdonis/librefang/releases/latest/download/dashboard-dist.tar.gz` |
| `crates/librefang-runtime/src/registry_sync.rs` | upstream URL constants intentionally preserved as the empty-`base_url` rollback path | `DEFAULT_REGISTRY_BASE_URL` constant comment explaining empty = upstream fallback |
| `scripts/enforce-branding.py` | scan dirs + token mappings | Keep BossFang ember replacements and the desktop-crate scan dirs |
| `.github/SECRETS.md` | TAURI_SIGNING_PRIVATE_KEY descriptor | Note that BossFang uses its own minisign keypair (not upstream's) |
| `docs/architecture/plugin-signing.md` | BossFang trust-root status | Section noting plugin-registry trust-root is not rotated; env-only override |

## Take-upstream-then-perl-rewrite (new TSX with sky-blue tokens)

When upstream adds a new component with inline sky-blue colours, take
upstream's content (it has the new logic / feature you want), then run
`python3 scripts/enforce-branding.py` to flip the tokens. The script
covers `.ts`, `.tsx`, `.css`, `.html`, `.json`, `.rs` files under
`crates/librefang-api/dashboard/src/`, `crates/librefang-api/static/`,
`crates/librefang-desktop/frontend/`, and `crates/librefang-desktop/src/`.

Token map (sky-blue → ember):

| Upstream | BossFang |
|---|---|
| `#0284c7` | `#E04E28` (Muted Ember) |
| `#38bdf8` | `#FF6A3D` (Bright Ember) |
| `#0ea5e9` | `#FF6A3D` |
| `#020617` | `#0B0F14` (Deep Charcoal) |
| `rgba(14,165,233,...)` | `rgba(255,106,61,...)` |
| `rgba(2,132,199,...)` | `rgba(224,78,40,...)` |
| `rgba(56,189,248,...)` | `rgba(255,106,61,...)` |
| `rgba(2,6,23,...)` | `rgba(11,15,20,...)` |
| `linear-gradient(135deg,#a78bfa,#7c3aed)` | `linear-gradient(135deg,#FF6A3D,#E04E28)` |

After running the script, run it again with `--check` to surface any
remaining upstream tokens (typically SVG fang glyphs that need
manual replacement with `<img src="/boss-libre.png" alt="BossFang" ...>`).

## Take-upstream-as-is

Everything else. Specifically:

- Runtime / kernel / API logic that isn't a brand surface
- New tools, channels, providers, drivers
- Test files (unless they assert on a BossFang-specific string — see "Upstream tests that assert upstream identity" below)
- Workflow files that don't touch BossFang-renamed artifact names
- Anything in `crates/librefang-uar-spec/` (BossFang-exclusive but stable surface)
- Anything in `crates/librefang-storage/` migrations (BossFang-exclusive; upstream doesn't ship migrations here)

## Upstream tests that assert upstream identity

Take-upstream-as-is is wrong for a test whose expectations are upstream identity values that BossFang overrides.
These merge cleanly (no conflict marker), so they only surface as a CI failure after the sync lands.
Take upstream's test logic, then flip the identity expectations to the BossFang value the fork actually ships — never flip the fork's surface back to match the test.

| Test or workflow value | Upstream value | BossFang value | Source of truth |
|---|---|---|---|
| `.github/workflows/release.yml` `mobile_android` "Upload to Play Internal Testing" `packageName` | `ai.librefang.app` (hardcoded) | `${{ steps.play_gate.outputs.package_name }}`, derived in `play_gate` from `tauri.android.conf.json` (`ai.bossfang.app`) | `crates/librefang-desktop/tauri.android.conf.json` `identifier`. The step is `continue-on-error`, so a mismatch fails every Play upload silently. |
| `scripts/tests/test_release_tag_workflow_safety.py` `MACOS_CLI_SIGNING_JOBS` (#8234) | `ai.librefang.cli`, `ai.librefang.sidecar-telegram` | `ai.bossfang.cli`, `ai.bossfang.sidecar-telegram` | the `sign <binary> <identifier>` lines in the `cli_mac` / `cli_mac_mini` jobs of `.github/workflows/release.yml` and `release-cli.yml` |

Found in the 2026-09-27 sync: the Quality job's "Check release workflow input safety" step failed on `main` until the table was flipped.
`scripts/audit-tauri-desktop.sh` check 6 now fails when that test still expects `ai.librefang.*`, when a release workflow signs a non-BossFang identifier, or when the Play `packageName` is not the Android identifier.
The Play `packageName` row is a workflow value, not a test: it merged in upstream form and went unnoticed because its step is `continue-on-error`.
After every sync, also run each `scripts/tests/*.py` / `*.sh` the Quality job in `.github/workflows/ci.yml` runs, and grep the merge diff for new `ai.librefang.` / `LibreFang` literals under `scripts/tests/` to catch the next test of this kind.

## After conflict resolution

1. `git status` — confirm no unmerged paths
2. `git diff --stat HEAD..` — sanity-check the conflict-resolution diff
3. `git merge --continue` (or `git commit` if `--continue` complains)
4. Move to Phase 3 (audit)
