# D01.3 local Apple Silicon delivery receipt

Recorded 2026-09-28 10:50 UTC. This is a local development delivery, not a public release or installed Windows acceptance.

| Item | Observed result |
|---|---|
| The Boss source | `9f2a0a4374` (`codex/d01-local-mac-durable-agent-delivery`) |
| UAR source | `48bc45b59d02d4febf4ed36e352af367fef73049` (`codex/d01-uar-payload`) |
| Mini payload | `f38a98a6ed064f9e5b8b9837e8b91781af570d22` |
| Build | Exact `pnpm build:mac:arm64` with `THE_BOSS_LOCAL_UAR_SOURCE_DIR` pointing to the pinned UAR checkout; completed successfully. |
| DMG | `/Users/gqadonis/Projects/prometheus/worktrees/the-boss-d01-build/dist/The-Boss-2.2.3-mac-arm64.dmg` |
| DMG size and SHA-256 | 537264752 bytes; `b708c542511811391f92e228377600fe8e4de12c6f99c1c072ced5c2b08d54eb` |
| Packaging status | DMG checksum valid; mounted app passed code-signature validation. Notarization was not configured. |
| Packaged UAR | Version `1.0.0`, source `48bc45b59d02d4febf4ed36e352af367fef73049`, archive SHA-256 `ea2f328b518f786cebaa494e40939a2a3612d5155a0f364b461767982ef4b376`; no binary-path override. |
| Runtime status | Sidecar running and administration operational. Preferred port 1906 was occupied; effective port 1907 before and after restart. |
| Functional gate | `uarD01LocalDelivery.test.ts` passed in 30.4 seconds against the packaged app. Two workspaces had separate starter bindings and instances; resident and on-demand profiles remained recoverable. A scoped observer paused, resumed, accumulated two backlog entries, and persisted across UAR restart and app relaunch. Cross-workspace isolation was observed. |

The build mounted and validated the DMG; the functional gate launched the matching packaged app from `dist/mac-arm64`, not the app inside the mounted DMG. The final gate was rerun only after observed failures were fixed: missing Cedar payload, UAR administration revision mismatch, missing archive provenance, incorrect nested-route root paths, and missing managed service-instance identity. No unit suite or partial verification build was run. The planned 08:52–09:52 UTC hourly window overran by approximately 58 minutes because these fresh-install failures required packaging rebuilds.

The operator was asked whether to publish the four non-Linux platforms now or wait. D01.4 and public release/site work remain pending that decision. This receipt does not claim C08, C14 or C18 acceptance.

## D01.4 publication selection — 2026-09-28

The operator subsequently selected a two-hour delivery cadence with full Mac and Windows publication through the website after every second successful delivery. This selects **wait** for D01.4. The already-built D01.3 artifact predates the initialized cadence run and is not counted as one of its deliveries. No new four-platform release, installer URL, or website update is claimed here. Publication remains due under the cadence policy after its second successful delivery; the previous published links remain in place until then. The canonical decision is `d01-publication-cadence-20260928`.
