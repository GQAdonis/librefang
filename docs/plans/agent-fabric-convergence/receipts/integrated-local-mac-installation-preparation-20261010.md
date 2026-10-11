# Integrated local Mac installation preparation

Prepared only; the script was not invoked. No test, compiler, build, runtime probe, UI, mount, installation or operation was performed. Parent owns the completed build and actual invocation.

```text
node /Users/gqadonis/Projects/prometheus/worktrees/agent-fabric-c06/librefang/docs/plans/agent-fabric-convergence/.prometheus/cadence/inputs/stage-integrated-local-mac-2.2.31-20261010.mjs --dmg <actual-final-2.2.31-arm64-DMG> --config <actual-final-operation-config.json> --native-record <actual-final-UAR-darwin-arm64-record.json> --output <new-absolute-output-root>
```

This adapts the existing 2.2.30 staging procedure. It derives frozen Boss source/candidate digest from `builtSource`, preserves the distinct operated source and reconciliation flag, and takes UAR/BossFang sources and actual packaged hashes from the final config. It neither reads nor anticipates Git HEAD. The native record must identify the same UAR source/archive as the copied manifest. Mac ARM64, copied version 2.2.31, ASAR/signed UAR/BossFang hashes and production signature-aware payload integrity must agree.

The root-owned invocation mounts the actual DMG read-only and uses `ditto` argument arrays to copy into a fresh disposable installation, retains actual byte hashes, verifies the bundle signature and assesses Gatekeeper separately, then detaches only its mount. Signature failure makes installation fail. Gatekeeper refusal is recorded as `not-accepted-local-build`; it is not rewritten into notarization or public acceptance. No app/native process is launched, and only `verifyPackagedUarPayload` is called, never its runtime probe variant. A failed detach remains failed with its owned mount path retained for cleanup.

Output is `<output>/integrated-local-mac-2.2.31-<uuid>/installation.json` and the copied `installed/The Boss.app`. The receipt supplies `status`, `version`, frozen `source`, `app`, `installerPath`, actual DMG `sha256`, `appAsarSha256` and `sidecarSha256` required by the existing representation installation contract, plus actual signing, native integrity, config/record/driver provenance and separate pending functional/operator acceptance. Root can pass this real receipt to the prepared representation runner after actual installation succeeds. No credentials are required by staging. Existing installations, receipts and profiles are preserved; no KBD/Cadence state or counters are changed.
