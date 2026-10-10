# Windows ARM64 native payload handoff for 2.2.26

UAR source: `1522f17944aec1e1a7db5eab3b647e732fc1a07f`.
Run: [38004047006](https://github.com/Prometheus-AGS/universal-agent-runtime/actions/runs/38004047006).

The native Windows ARM64 production build, complete payload packaging and artifact
upload completed successfully. Native job `114068631953` finished at
2026-10-10 00:51:44 UTC. The automatic immutable publication job
`114090232271` was queued at the inspected boundary; the release was not yet
public. No native execution or installer success is claimed from the runner
build/upload alone.

## Retained native artifact verified before publication

Root completed `gh run download` exit 0 (session 42329) into
`.prometheus/cadence/artifacts/customer-native-2.2.26-win32-arm64/downloaded/`.
The separate local artifact integrity operation passed:

- Archive: **123,352,763 bytes**, SHA-256
  `db26e69dba7ecb79210cdd929900d00999c2524f1401084674052d6dc6bef3f4`.
- Record SHA-256:
  `1e336c3e265186214e12ea9c513d81960e52bdebb259f5b21e98b233313818ff`.
- Exact source/tag/platform and `server-full` features match the native job.
- Actual archive inventory matches its record; the unchanged existing integrity
  checker verified all **13** declared payload files' sizes and hashes.
- The sidecar executable has Windows ARM64 PE machine `0xAA64`.

Evidence: `customer-native-win32-arm64-artifact-2.2.26-20261010.json`.
This is an Actions-artifact byte verification, not a public-download receipt.
Root may publish these same verified archive/record bytes under the original
immutable tag without repeating the production compile. If root replaces the
queued automatic publisher with manual publication, preserve that distinction
and the native job's successful provenance. Native Windows operation remains
pending.

Root subsequently cancelled the queued automatic publisher; its overall run
conclusion is cancelled while the native build/package/upload job remains
successful. Root manually published the **same verified artifact bytes** under
the original immutable tag. The public-download integrity operation then passed:
the GitHub archive and record match the retained artifact digests above, all 13
payload files verified again, and PE ARM64 identity matched. The separate public
receipt is `customer-native-win32-arm64-2.2.26-20261010.json`. This does not change
native execution or installer acceptance status.

After the automatic publication completes, run the prepared artifact-owned
download/integrity operation:

```text
node .prometheus/cadence/artifacts/customer-native-2.2.26-win32-arm64/verify-public-payload.mjs
```

It downloads the exact public record and archive, hashes actual streamed bytes,
matches source/platform/features/tag, inspects archive inventory and reuses the
unchanged `scripts/uar-payload-integrity.cjs` in isolated scratch with the public
record as its expected manifest. It verifies each payload file's size/hash and
the executable's ARM64 PE identity without running the executable. On success it
writes `receipts/customer-native-win32-arm64-2.2.26-20261010.json`.

The verifier refuses to overwrite downloaded assets. If interrupted, preserve
that attempt and reconcile its files before running again; a prepared command is
not a completed integrity receipt.

Exact record URL:

```text
https://github.com/Prometheus-AGS/universal-agent-runtime/releases/download/boss-sidecar-win32-arm64-v1.0.0-2.2.26-1522f179/uar-sidecar-win32-arm64.json
```

Root/publisher owns subsequent mutation. Confirm the selected source override in
`build/integration-sources.json` is `1522f179...`, then import only this ready
platform with `RELEASE_PLATFORMS=win32-arm64` in the process environment:

```text
node scripts/import-uar-sidecar-payloads.cjs https://github.com/Prometheus-AGS/universal-agent-runtime/releases/download/boss-sidecar-win32-arm64-v1.0.0-2.2.26-1522f179/uar-sidecar-win32-arm64.json
```

Commit/push the exact source/artifact manifest before dispatching the installer
workflow from its recorded source ref:

```text
gh workflow run the-boss-release.yml --repo Prometheus-AGS/the-boss --ref <frozen-release-ref> -f release_version=2.2.26 -f release_profile=uar-enabled -f platforms=win32-arm64 -f replace_published_platforms=false -f uar_win32_arm64_record_url=https://github.com/Prometheus-AGS/universal-agent-runtime/releases/download/boss-sidecar-win32-arm64-v1.0.0-2.2.26-1522f179/uar-sidecar-win32-arm64.json
```

These commands are handoff instructions, not dispatched work. Root retains
publisher, application operator and build ownership. Native Windows execution,
installed acceptance, signing assessment and live installer/site publication
remain separate. No source pins, KBD/Cadence clocks, history, counts or publication
debt were changed by this preparation.
