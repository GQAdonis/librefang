# Proposal: D01 local Mac durable-agent delivery

## Why

C06 durable instances and C07 local observers have accepted local UAR integration receipts, but no current The Boss installer exposes those capabilities as a complete user journey. The exact `pnpm build:mac:arm64` command presently disables UAR. D01 is a separately selectable **delivery wrapper** around retained C04/C06/C07/C14/C18 obligations; it does not replace or complete any C01–C18 portfolio change by itself.

## What changes

- Pair clean, exact Boss and UAR commits with a local-only checksummed Apple Silicon UAR payload; make the exact Mac command build a UAR-enabled app while public CI refuses the local overlay and retains canonical same-UAR-revision payload rules.
- In The Boss's existing UAR settings, expose useful durable instance lifecycle and local observer backlog/recovery operations through its trusted adapter, typed IPC, persisted preferences and every existing locale.
- Finish all production wiring, then run one real integration/packaged-launch gate and the exact local Mac build. Demonstrate the new UI journey in two isolated workspaces with the app's own packaged helper and no runtime binary override.
- After that functioning delivery, ask the operator to publish all Mac and Windows targets now or wait. A now choice requires four UAR-enabled native installers, GitHub release metadata, `RELEASES.md`, the landing repository and live website; missing Intel/ARM payloads remain explicit work.

## Scope and ownership

Product implementations occur in repository-scoped The Boss and UAR changes with exact file claims and accepted dependency pins. The initiative change is a coordination/acceptance contract. No source in this planning root launches services, compiles installers or publishes a website. D01 depends on accepted C02/C03/C04/C06/C07 and D-UAR-P1/D-MEMORY; it does **not** depend on C08. C08 source/gate remains open with its owner, and C09 can proceed independently under its original prerequisites. D01 may reuse a bounded piece of C14.1, but C14.1 and C14 as a whole remain pending until their full original acceptance is met.

## Acceptance

A newly built local Mac ARM64 application launches its packaged UAR and performs the durable-agent/observer user journey from The Boss after restart in two isolated workspaces. The delivery receipt binds source, binary and app hashes, version, gate result, local-ready clock and the operator's now/wait publication choice. A published four-platform release additionally needs exact GitHub artifact rows and live website download-byte evidence. Neither local delivery nor a deferred publication decision is a C18 federation/profile certification.
