# Corrective 2.2.26 native payload publication readiness

Read-only preparation by the existing lead/release delegation. No job was dispatched, payload downloaded/imported, artifact published, application launched, build run, or ledger changed. Root retains the publisher, packaged-UI operator and build writer. This report does not certify a delivery or qualification task.

Inspection timestamp: **2026-10-10 00:05:29 UTC**. One successful status snapshot per supplied UAR run was read; an initial lookup in The Boss repository returned 404 because these runs belong to `Prometheus-AGS/universal-agent-runtime`. No failure was inferred from that wrong-repository lookup.

## Actual job state

All four runs use exact UAR source `1522f17944aec1e1a7db5eab3b647e732fc1a07f`. Each native job was **in progress at Build production sidecar**. Setup, checkout, required submodule checkout, target installation and cache restoration passed. Packaging and artifact upload had not completed. No native build failure or completed payload was visible in this snapshot. Skipped GHCR jobs are expected for sidecar tags.

| Platform | Run | Native job | Build step began UTC | Immutable tag |
| --- | --- | --- | --- | --- |
| Windows x64 | [38004042907](https://github.com/Prometheus-AGS/universal-agent-runtime/actions/runs/38004042907) | 114068619913 | 2026-10-09 23:23:57 | `boss-sidecar-win32-x64-v1.0.0-2.2.26-1522f179` |
| Mac ARM64 | [38004043889](https://github.com/Prometheus-AGS/universal-agent-runtime/actions/runs/38004043889) | 114068622467 | 2026-10-09 23:22:55 | `boss-sidecar-darwin-arm64-v1.0.0-2.2.26-1522f179` |
| Mac Intel | [38004045703](https://github.com/Prometheus-AGS/universal-agent-runtime/actions/runs/38004045703) | 114068628197 | 2026-10-09 23:24:23 | `boss-sidecar-darwin-x64-v1.0.0-2.2.26-1522f179` |
| Windows ARM64 | [38004047006](https://github.com/Prometheus-AGS/universal-agent-runtime/actions/runs/38004047006) | 114068631953 | 2026-10-09 23:24:57 | `boss-sidecar-win32-arm64-v1.0.0-2.2.26-1522f179` |

The inspected committed UAR workflow `.github/workflows/deploy.yml` builds each native target, packages through `scripts/package-boss-sidecar.mjs`, uploads `uar-sidecar-<platform>` (90-day retention), then automatically runs **Publish immutable The Boss sidecar payload**. Its `gh release create` publishes both the `.tar.gz` archive and `.json` record under the existing tag with `--verify-tag --latest=false --prerelease`. No second Rust build or The Boss native-cache repack workflow is required for this path. Darwin x64 uses `server-full,tract-embeddings`; the others use `server-full`. These feature identities must remain in provenance.

The native-job artifact upload alone is insufficient for the application import: the importer requires public immutable GitHub Release record URLs, not Actions artifact URLs. If native build and artifact upload pass but the publication job fails, retain the successful archive/record and diagnose that failed publication step; do not relaunch a passing Rust compile merely to obtain a release URL.

## Observed source-pin mismatch to resolve before import

The inspected Boss worktree was `codex/customer-closeout-tooling-checkpoint`, HEAD `1c6e0ffbd67c1706b4f8b86ae96f57b67e320a91`, package version `2.2.26`. Its `build/integration-sources.json` top-level UAR revision is `1522f179...`, but all four `sources.uar.platformRevisions` still name public-baseline `60b5922e3e11dd73bfd8a47e5bc28f3c16332889`. Its `build/integration-artifacts.json` also retains the four 2.2.25 UAR packages.

`scripts/import-uar-sidecar-payloads.cjs` resolves the expected source as `platformRevisions[platform] ?? revision`. Therefore a correct new 1522f179 record is rejected while its platform override remains 60b592. Root must update each selected platform override to its exact completed payload source, or remove that override when all targets deliberately use the common exact revision. Do not remove unrelated pins or label old platform packages as corrected. The import rewrites only selected payload records while retaining other platforms.

This report makes no source edit. Pending-platform metadata remains old until its matching new record is available.

## Immutable record URLs

Expected URLs below follow the actual tags and source packaging contract. Their availability and bytes have **not** yet been verified; the builds were still running.

- Windows x64: `https://github.com/Prometheus-AGS/universal-agent-runtime/releases/download/boss-sidecar-win32-x64-v1.0.0-2.2.26-1522f179/uar-sidecar-win32-x64.json`
- Mac ARM64: `https://github.com/Prometheus-AGS/universal-agent-runtime/releases/download/boss-sidecar-darwin-arm64-v1.0.0-2.2.26-1522f179/uar-sidecar-darwin-arm64.json`
- Mac Intel: `https://github.com/Prometheus-AGS/universal-agent-runtime/releases/download/boss-sidecar-darwin-x64-v1.0.0-2.2.26-1522f179/uar-sidecar-darwin-x64.json`
- Windows ARM64: `https://github.com/Prometheus-AGS/universal-agent-runtime/releases/download/boss-sidecar-win32-arm64-v1.0.0-2.2.26-1522f179/uar-sidecar-win32-arm64.json`

For each completed payload, retain the run, native source, tag, record digest, archive SHA-256 and size, packaged-file manifest, actual features and publication URL. The import validates HTTPS GitHub/repository/tag/asset identity, tool version `1.0.0`, selected source, archive type, SHA-256 syntax, unique paths and required executable/manifest/Cedar files. **It does not itself download and hash the archive.** Actual archive bytes and packaged manifest must be checked through the existing payload/package integrity path before claiming artifact verification; record-import success alone does not prove archive integrity.

## Import and installer dispatch contract

From the frozen, committed Boss release branch, import all four records when available:

```text
node scripts/import-uar-sidecar-payloads.cjs <win32-x64-record-url> <darwin-arm64-record-url> <darwin-x64-record-url> <win32-arm64-record-url>
```

For a ready subset, set `RELEASE_PLATFORMS` to exactly that subset and pass only matching ready record URLs. Default import selection requires all four. The portable caller can supply environment through `execFileSync(process.execPath, ['scripts/import-uar-sidecar-payloads.cjs', ...recordUrls], { env: { ...process.env, RELEASE_PLATFORMS: readyPlatforms.join(',') }, stdio: 'inherit' })`. Root performs that mutation and commits/pushes the source pins and imported manifest before selecting the release ref.

The supported application workflow is `.github/workflows/the-boss-release.yml`, dispatched with:

| Input | Required value / meaning |
| --- | --- |
| `release_version` | `2.2.26`, matching the selected ref's `package.json` |
| `release_profile` | `uar-enabled` |
| `platforms` | Exact ready platform set: `win32-x64`, `darwin-arm64`, `darwin-x64`, `win32-arm64`, comma-separated; no Linux |
| `replace_published_platforms` | `false` for a new source/version; do not overwrite immutable 2.2.25 assets |
| `uar_win32_x64_record_url` | Ready immutable Windows x64 record above, when selected |
| `uar_darwin_arm64_record_url` | Ready immutable Mac ARM64 record above, when selected |
| `uar_darwin_x64_record_url` | Ready immutable Mac Intel record above, when selected |
| `uar_win32_arm64_record_url` | Ready immutable Windows ARM64 record above, when selected |

CLI form for a ready customer-priority pair, **after** its exact records and frozen ref exist:

```text
gh workflow run the-boss-release.yml --repo Prometheus-AGS/the-boss --ref codex/customer-closeout-tooling-checkpoint -f release_version=2.2.26 -f release_profile=uar-enabled -f platforms=win32-x64,darwin-arm64 -f replace_published_platforms=false -f uar_win32_x64_record_url=https://github.com/Prometheus-AGS/universal-agent-runtime/releases/download/boss-sidecar-win32-x64-v1.0.0-2.2.26-1522f179/uar-sidecar-win32-x64.json -f uar_darwin_arm64_record_url=https://github.com/Prometheus-AGS/universal-agent-runtime/releases/download/boss-sidecar-darwin-arm64-v1.0.0-2.2.26-1522f179/uar-sidecar-darwin-arm64.json
```

The command is a documented handoff, not execution or a claim that this branch's future head is frozen. Record the actual dispatched Boss commit and verify the resulting run names that commit. Intel/Windows ARM64 may be dispatched separately without blocking the two customer-priority targets, using their exact platform and URL inputs.

The installer workflow imports payloads in its selection job and again per native installer job, performs release capacity/NSIS or signing preflights, builds the actual installers, publishes installer assets directly to GitHub, and queues serialized per-platform metadata/site publication. Native installers remain a separate artifact from sidecar payloads and local Mac build evidence.

## Metadata and website completion

`scripts/queue-release-publication.cjs` verifies each installer manifest matches platform, architecture, version and `GITHUB_SHA`, uploads an immutable manifest named `release-platform-v2.2.26-uar-enabled-<platform>-<arch>-<Boss-source>.json`, and sends `boss_release_platform_published` to The Boss repository.

The repository-dispatch lane uses default-branch workflow/source and serialized `the-boss-release-publication` concurrency. `scripts/coordinate-release-publication.cjs` validates the exact immutable platform manifest, commits/pushes `RELEASES.md` and `release-manifest.json`, publishes the release, verifies GitHub release bytes, then dispatches `Know-Me-Tools/boss-landing-spot`. A dispatch receipt does not prove live-site deployment. Root must preserve downstream deployment and live installer-link evidence, actual signing/notarization status and operator acceptance separately.

Potential source-version precondition is explicit: if the default branch's package version differs from 2.2.26, the coordinator only permits backfill when its current release manifest already names matching 2.2.26 source/profile/features. Do not assume a successful branch installer job automatically made default-branch metadata publication admissible. Root owns reconciling the current main-branch release state, preserving unrelated work and exact installer provenance.

## Sources inspected

- UAR committed `1522f179...:.github/workflows/deploy.yml` and `scripts/package-boss-sidecar.mjs`.
- Boss `build/integration-sources.json`, `build/integration-artifacts.json`, `.github/workflows/the-boss-release.yml`, `.github/workflows/package-uar-existing-native.yml`, `.github/workflows/integration-payload.yml`.
- Boss `scripts/import-uar-sidecar-payloads.cjs`, `scripts/package-uar-from-native-artifact.cjs`, `scripts/release-preflight.cjs`, `scripts/queue-release-publication.cjs`, `scripts/coordinate-release-publication.cjs`.
- Current CLI documentation via Context7: [run inspection](https://cli.github.com/manual/gh_run_view), [workflow dispatch](https://cli.github.com/manual/gh_workflow_run), [run artifact download](https://cli.github.com/manual/gh_run_download).

No qualification counter or Cadence delivery/debt/clock state is advanced by this preparation.
