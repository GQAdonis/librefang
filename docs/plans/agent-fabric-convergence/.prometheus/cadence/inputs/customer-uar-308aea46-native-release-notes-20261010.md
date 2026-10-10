UAR native payload for The Boss 2.2.29 corrected customer delivery.

Exact UAR source: `308aea46ff26e7f61340281bb51f67ebe5351569`; package version: `1.0.0`.
Exact Boss packaging producer: `824fa5ed40999830196b6c5125faf2ebcf6a8ce4`.
The archive carries the native sidecar, model configuration, Cedar policies and native runtime libraries. Publication preserves exact platform/source/checksum identity. Application installation and actual packaged customer operation are separate evidence boundaries.

The prepared publisher is `publish-customer-uar-308aea46-native-20261010.mjs`. Run only when the selected platform's package job has succeeded:

```text
node .prometheus/cadence/inputs/publish-customer-uar-308aea46-native-20261010.mjs --run <package-run> --platform <darwin-arm64|darwin-x64|win32-arm64|win32-x64>
```

Arguments are required in that order. The helper requires authenticated `gh`, Node.js with `fetch`, and `tar`. It uses the actual `uar-sidecar-<platform>` Actions artifact, checking the frozen workflow and producer. Archive metadata uses `source`, `version`, `platform`, `asset`, `sha256`, `features`, `archive` and `binaries`; the producer's record has no archive-size field, so the receipt records measured bytes. It checks required executable/model/policy inventory, Windows DLL presence and embedded payload identity. The producer already owns per-file payload hashing.

Downloads are cached under `.prometheus/cadence/artifacts/customer-uar-308aea46-native-<run>/<platform>/package`. An incomplete cached download stops without another download. The tag is `boss-sidecar-<platform>-v1.0.0-2.2.29-308aea46`, pointing to the exact UAR commit. Existing matching tags and assets are preserved; conflicting content stops. Uploads never use clobber and existing releases are never edited. This is an immutable publication convention; the helper does not enable or assert GitHub's repository-level immutable-release setting.

Each archive and record must match uploaded GitHub asset size/SHA256 digest and actual unauthenticated public downloaded bytes. Public byte evidence stays alongside the package. Receipt schema 1, kind `published-complete-uar-native-payload`, records repository/source/version/platform, package run and URL, workflow head/path, artifact identity, release tag/URL, record path, archive size/SHA, features/binaries and `publicAssets` with names/IDs/URLs/sizes/SHA256/digest/timestamps/evidence paths. The per-platform receipt is `.prometheus/cadence/artifacts/customer-uar-308aea46-<platform>-published-20261010.json`; a matching existing receipt remains unchanged.

Preparation only: this helper has not been executed, checked, tested, built, or used to publish. The root agent owns execution and resulting evidence. No source repository or cadence state is changed by preparation.

Includes trusted standalone decision-owner projection and validated file-read display. Effect admission ownership remains unchanged; current challenge and authenticated owner checks still apply.
