# Verification — phase-10-uar-sidecar-availability

**Result:** PASS
**Date:** 2026-07-31

## Runtime publication

- UAR merge SHA: `2aaeadd9c28f27532a03e68d5035b248a0cef5b8`
- Image: `ghcr.io/gqadonis/universal-agent-runtime:2aaeadd9c28f27532a03e68d5035b248a0cef5b8`
- linux/amd64 digest: `sha256:8ce03effd1c774b3122adc7563e4fc92683738d2834e5054cba32e567c934748`
- Publication workflow `30679093670`: passed in 1h03m06s
- Independent image proof: executable present; truthful `READY`; `/healthz`, `/readyz`,
  `/api/openapi.json`, and `/api/models` returned HTTP 200; Groq returned
  `BossFang UAR completion verified`.

## BossFang behavior

- Supervisor integration: 4/4 passed in minimal and feature-enabled builds.
- Auth public-allowlist tests: 10/10 passed; operator routes remain protected.
- UAR driver module: 21/21 passed.
- Live shipped path: authenticated BossFang `/api/uar/status` and `/api/uar/start` returned
  `healthy`; `/api/uar/test` returned HTTP 200 and exactly `BossFang UAR is ready.`.
- Missing-binary failure reports searched bundled paths and `$PATH`, plus remediation.
- Minimal builds return an explicit 503 from the completion-test route.

## Repository gates

- `cargo fmt --all -- --check`: passed
- `SKIP_DASHBOARD_BUILD=1 cargo check --workspace --lib`: passed
- `SKIP_DASHBOARD_BUILD=1 cargo clippy --workspace --all-targets -- -D warnings`: passed
- Dashboard tests: 88 files, 902 tests passed
- Dashboard typecheck: passed
- Dashboard lint: passed with 86 pre-existing warnings and no errors
- `python3 scripts/enforce-branding.py --check`: passed
- Final adversarial review: PASS, 0 critical / 0 warning / 0 suggestion

## Unrelated baseline findings

- `pnpm test:i18n-parity` reports eight pre-existing Ukrainian plural keys; the same failure
  occurs on `origin/main`.
- The full `librefang-llm-drivers` feature suite has three pre-existing `codex_cli` failures
  caused by a duplicate `--skip-git-repo-check` argument. The 21 UAR tests pass and this phase
  does not modify `librefang-cli` or the unrelated Codex CLI driver.

The phase goal is satisfied without timing assumptions: policy is deterministic in memory,
process tests assert process contracts, the runtime image is immutable, and the production
HTTP route proves the end-to-end boundary.
