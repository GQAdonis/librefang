> ### Branch strategy
>
> - Active development targets `main`.

### What this PR does

Before this PR:

The default integration manifest still downloaded UAR `1522f179`, although the source pin and corrected 2.2.30 installers use `308aea46`. The release jobs used explicit payload overrides, so a later build without those overrides could package the older runtime again.

After this PR:

All four Mac/Windows default payloads use the published `308aea46ff26e7f61340281bb51f67ebe5351569` archives and recorded SHA-256 values. The existing `scripts/import-uar-sidecar-payloads.cjs` generated this update from immutable public platform records. Other tool payloads are unchanged.

Fixes # N/A — release payload reconciliation.

### Why we need it and why it was done in this way

The following tradeoffs were made:

Keep each native archive's existing immutable release URL. Three native payload tags retain a 2.2.29 label; their actual source is `308aea46`, and the application release is 2.2.30. The Mac ARM64 native payload has the 2.2.30 local-native tag. None of these records is relabelled as built from a later merge commit.

The following alternatives were considered:

Continuing to depend on ad hoc per-build overrides would leave the default packaging source inconsistent. Rebuilding already completed native archives adds no value to this manifest-only repair.

Links to places where the discussion took place: https://github.com/Prometheus-AGS/the-boss/pull/66 and https://github.com/Prometheus-AGS/universal-agent-runtime/pull/367.

### Breaking changes

None. No API, preference, migration, UI, provider or approval policy changes.

### Special notes for your reviewer

The strict native publisher checked archive closure, exact source provenance, GitHub asset checksums and complete downloaded-byte equality for each published archive. The public Apple Silicon 2.2.30 DMG passed signature, Gatekeeper, notarization and payload checks; its production Quit shut down owned UAR/BossFang processes while preserving external processes. Other platform installers are building independently at the frozen application source `aef2ec2cda68605efab9dddf33b46e726e752c2d` using these same native records.

No extra application build or test suite was run for this generated manifest-only change. Native installed Windows operation and final operator acceptance remain pending; native artifact publication does not certify them. Existing 2.2.30 installers keep their actual source and hashes.

### Checklist

- [x] Branch: This PR targets `main`
- [x] PR: The PR description is expressive enough and will help future contributors
- [x] Code: [Write code that humans can understand](https://en.wikiquote.org/wiki/Martin_Fowler#code-for-humans) and [Keep it simple](https://en.wikipedia.org/wiki/KISS_principle)
- [ ] Refactor: N/A; no adjacent refactoring.
- [x] Upgrade: Only future packaging defaults change; existing user data and immutable installers remain unchanged.
- [ ] Documentation: No new user-facing behavior or user-guide change.
- [x] Self-review: Inspected the generated diff: one manifest, only UAR source revisions, URLs and checksums.

### Release note

```release-note
NONE
```
