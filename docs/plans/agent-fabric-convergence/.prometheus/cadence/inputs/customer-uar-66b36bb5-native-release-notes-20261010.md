UAR native payload for The Boss 2.2.28 corrected customer delivery.

Exact UAR source: `66b36bb54feb24bb1bd660c5f1e6a50bdf7d4ad4`; package version: `1.0.0`.
Exact Boss packaging producer: `6de6477cdddb0886387dcb752913c43bf3ec3de2`.
The archive carries the native sidecar, model configuration, Cedar policies and native runtime libraries. Publication preserves exact platform/source/checksum identity. Application installation and actual packaged customer operation are separate evidence boundaries.

The prepared publisher is `publish-customer-uar-66b36bb5-native-20261010.mjs`. Run only when the selected platform's package job has succeeded:

```text
node .prometheus/cadence/inputs/publish-customer-uar-66b36bb5-native-20261010.mjs --run <package-run> --platform <darwin-arm64|darwin-x64|win32-arm64|win32-x64>
```

Arguments are required in that order. The helper requires authenticated `gh`, Node.js with `fetch`, and `tar`. It uses the actual `uar-sidecar-<platform>` Actions artifact, checking the frozen workflow and producer. Archive metadata uses `source`, `version`, `platform`, `asset`, `sha256`, `features`, `archive` and `binaries`; the producer's record has no archive-size field, so the receipt records measured bytes. It checks required executable/model/policy inventory, Windows DLL presence and embedded payload identity. The producer already owns per-file payload hashing.

Downloads are cached under `.prometheus/cadence/artifacts/customer-uar-66b36bb5-native-<run>/<platform>/package`. An incomplete cached download stops without another download. The tag is `boss-sidecar-<platform>-v1.0.0-2.2.28-66b36bb5`, pointing to the exact UAR commit. Existing matching tags and assets are preserved; conflicting content stops. Uploads never use clobber and existing releases are never edited. This is an immutable publication convention; the helper does not enable or assert GitHub's repository-level immutable-release setting.

Each archive and record must match uploaded GitHub asset size/SHA256 digest and actual unauthenticated public downloaded bytes. Public byte evidence stays alongside the package. Receipt schema 1, kind `published-complete-uar-native-payload`, records repository/source/version/platform, package run and URL, workflow head/path, artifact identity, release tag/URL, record path, archive size/SHA, features/binaries and `publicAssets` with names/IDs/URLs/sizes/SHA256/digest/timestamps/evidence paths. The per-platform receipt is `.prometheus/cadence/artifacts/customer-uar-66b36bb5-<platform>-published-20261010.json`; a matching existing receipt remains unchanged.

Preparation only: this helper has not been executed, checked, tested, built, or used to publish. The root agent owns execution and resulting evidence. No source repository or cadence state is changed by preparation.
