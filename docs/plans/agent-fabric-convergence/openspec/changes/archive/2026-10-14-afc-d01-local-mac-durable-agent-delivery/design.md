# Design: D01 complete local Boss delivery

## Boundary and source facts

The [cadence contract](../../../.kbd-orchestrator/phases/agent-fabric-convergence/children/release-cadence-optimization/delivery-contract.md) defines local and public evidence separately. The existing Boss command disables UAR; canonical sidecar import requires win32-x64 and darwin-arm64 immutable records from one UAR source SHA. A local Apple Silicon build must not wait for Windows, but a public release must not import a local-only overlay. Existing individual-agent UAR settings, trusted host adapter and typed IPC are the consumer path. UAR C06/C07 receipts prove only their named local integration, not this app package.

## Decisions

1. **One clean source pair.** Freeze separately committed Boss and UAR revisions and record exact payload/helper/app SHA-256. A dirty worktree cannot be represented only by its HEAD. The local-only Mac payload record is architecture-bound and never a canonical release manifest.
2. **One exact local command.** `pnpm build:mac:arm64` must package and enable the selected UAR. A runtime binary override, loose local executable, or DMG integrity alone cannot attest the package. The helper must be inside physical resources outside ASAR and launch from there.
3. **Full vertical slice.** Existing `/settings/uar` adds operational instance and local-observer controls, progress/status/errors, typed main-process access, persisted settings and translations. Two workspaces keep instances, authority and observer state distinct. C02 current restrictive authorization remains at protected effects.
4. **Whole-phase gate.** Implement payload and UI paths first. Then exercise the real packaged app once across its complete journey: launch, source/version/effective port, two workspaces, activate/passivate, backlog/recovery, restart and persisted state. Fix observed gate failures and rerun only the failed gate. This gate does not certify C08 cross-host/channel behavior.
5. **Publication choice and platform truth.** After every functioning local delivery ask now/wait for darwin-arm64, darwin-x64, win32-x64 and win32-arm64, no Linux. Current UAR-enabled profile evidence only covers Apple Silicon and Windows x64. A now choice carries missing Intel/ARM native implementation as a blocker until four valid UAR installers exist; a wait choice leaves publication pending.
6. **Full public handoff.** GitHub Releases is the artifact authority. Each platform row records Boss/UAR source, version, architecture, size, SHA-256, signing and download URL. A single publisher merges rows, commits/pushes `RELEASES.md` and release manifest, syncs/commits/pushes `Know-Me-Tools/boss-landing-spot`, deploys the connected Lovable site, and checks live URLs/downloaded bytes. Keep prior working platform links until replacements are valid; reject older jobs that regress metadata.

## Compatibility and rollback

The existing P1 installed app and user data are not overwritten during local preparation. CI refuses local payload records and retains canonical same-UAR-source requirements. Unsupported team, channel and federation controls remain disabled. A failed native platform or website update leaves its previous public link, records exact blocked status and resumes from a new exact artifact; it does not re-label a non-UAR build. C14 and C18 original acceptance remain intact.

## Verification boundary

D01's single local gate is not run until all D01 production code is complete. Source, compiled, integrated, local-functioning, published and installed-accepted statuses are recorded separately. The local hourly target uses elapsed start-to-working-app time including waits/build; publication and end-to-end clocks are separate. No unit, mock-only or per-edit gate is D01 completion evidence.
