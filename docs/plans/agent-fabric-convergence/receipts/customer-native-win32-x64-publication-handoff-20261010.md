# Windows x64 native payload handoff for 2.2.26

UAR source: `1522f17944aec1e1a7db5eab3b647e732fc1a07f`.
Run: [38004042907](https://github.com/Prometheus-AGS/universal-agent-runtime/actions/runs/38004042907).

Native job `114068619913` completed the production build, complete payload
packaging and artifact upload successfully at **2026-10-10 01:04:23 UTC**.
Automatic immutable publisher job `114092978193` was queued when inspected.

`gh run download` completed exit 0 in session 78456, followed by the local
artifact integrity operation, exit 0 in session 34737:

- Archive: **131,840,105 bytes**, SHA-256
  `208225d7d5bed79e4b0763efe103f9f4bf32d91ec2004d0c2aaa913bc723a125`.
- Record SHA-256:
  `963bf76451779217f154508a1beb2e235c88ce3244d26391618f77a4cef21d28`.
- Exact source/tag/platform and `server-full` features match.
- Archive inventory matches the record; the unchanged existing
  `scripts/uar-payload-integrity.cjs` verified all **13** declared files' sizes
  and hashes using an isolated record-bound manifest.
- The executable has x64 PE machine `0x8664`; no binary was executed.

Evidence: `customer-native-win32-x64-artifact-2.2.26-20261010.json`.
Exact archive/record are retained in
`.prometheus/cadence/artifacts/customer-native-2.2.26-win32-x64/downloaded/`.
Root may publish these same bytes under the original immutable tag without a new
compile, preserving successful native-job provenance separately from replacement
of the queued automatic publisher.

The automatic publisher subsequently completed successfully before cancellation;
**no manual publication occurred for x64**. The public release was published at
2026-10-10 01:07:18 UTC. Actual public-download verification passed: archive and
record match the artifact digests above, all 13 payload-file sizes/hashes match,
and the executable is PE x64. Public receipt:
`customer-native-win32-x64-2.2.26-20261010.json`. This qualifies payload bytes,
not native Windows execution or an application installer.

After publication and public-download verification, root owns source-pin
mutation/import. The selected override in `build/integration-sources.json` must
match `1522f179...`; pass only this ready platform with
`RELEASE_PLATFORMS=win32-x64` in the process environment:

```text
node scripts/import-uar-sidecar-payloads.cjs https://github.com/Prometheus-AGS/universal-agent-runtime/releases/download/boss-sidecar-win32-x64-v1.0.0-2.2.26-1522f179/uar-sidecar-win32-x64.json
```

Commit/push exact source/artifact pins before installer dispatch:

```text
gh workflow run the-boss-release.yml --repo Prometheus-AGS/the-boss --ref <frozen-release-ref> -f release_version=2.2.26 -f release_profile=uar-enabled -f platforms=win32-x64 -f replace_published_platforms=false -f uar_win32_x64_record_url=https://github.com/Prometheus-AGS/universal-agent-runtime/releases/download/boss-sidecar-win32-x64-v1.0.0-2.2.26-1522f179/uar-sidecar-win32-x64.json
```

This handoff does not dispatch, mutate product pins, certify installed behavior
or advance KBD/Cadence counters. Public download verification, signing assessment,
installer/site publication and native Windows installed operation remain
separate evidence.
