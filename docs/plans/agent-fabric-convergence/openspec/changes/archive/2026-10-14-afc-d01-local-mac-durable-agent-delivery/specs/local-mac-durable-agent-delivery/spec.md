# Spec Delta: local Mac durable-agent delivery

## ADDED Requirements

### Requirement: Exact local Mac command produces working UAR-enabled Boss

The complete D01 core and Boss UI SHALL be packaged by `pnpm build:mac:arm64` from a clean, source-bound Boss/UAR pair. The application SHALL launch its own packaged helper and expose durable instance and local observer operations in two isolated workspaces. A developer path override or DMG integrity alone SHALL NOT satisfy delivery.

#### Scenario: Packaged helper is absent

- **WHEN** the built application opens but cannot launch the helper from its own resources
- **THEN** D01 local delivery remains failed even if the DMG hash and an external sidecar query succeed.

### Requirement: Local payload cannot enter public release inputs

The local arm64 helper input SHALL record exact source/architecture/checksums and be rejected by public CI. Canonical release inputs SHALL retain their cross-platform same-UAR-source requirement. Dirty code SHALL NOT be represented only by a HEAD commit.

#### Scenario: CI receives a local overlay

- **WHEN** a public release job is given a local-only payload record
- **THEN** preflight refuses it before any artifact is advertised.

### Requirement: Publication choice preserves four-platform truth

After local success the operator SHALL choose publish now or wait for Apple Silicon and Intel macOS plus x64 and ARM64 Windows, with no Linux. No response leaves publication pending. A now choice SHALL not be reported complete until all four UAR-enabled installers, GitHub metadata, committed release records, deployed site and live byte evidence exist.

#### Scenario: One architecture is not ready

- **WHEN** publish-now is chosen but its UAR-enabled native artifact is missing
- **THEN** that platform remains blocked, the prior working link stays advertised, and a non-UAR artifact is not substituted.

### Requirement: Original portfolio coverage remains open until independently satisfied

D01 SHALL map its work to C04/C06/C07/C14/C18 without changing their original task identities or certifying C08 channel routing, all of C14 administration, or C18 federation. Evidence SHALL distinguish source, compilation, integration, local function, publication and installed acceptance.

#### Scenario: D01 local app works

- **WHEN** the new durable-agent UI works from the packaged local app
- **THEN** D01 may record local delivery while C14/C18 unfulfilled obligations remain open and platform publication retains its actual decision/status.
