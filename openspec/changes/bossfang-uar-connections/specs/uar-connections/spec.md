## ADDED Requirements

### Requirement: independently owned UAR connection
BossFang SHALL connect only to an explicitly selected UAR instance and SHALL NOT bundle, launch, install, restart, or terminate UAR.

#### Scenario: legacy managed configuration
- **WHEN** legacy enabled/command fields have no selected runtime endpoint
- **THEN** connection returns migration-required diagnostics and preserves saved data without launching UAR

### Requirement: authenticated transport and preserved fences
BossFang SHALL use scoped bearer authentication over loopback HTTP or HTTPS, never assert x-uar-principal, and SHALL preserve current full-run identity, workspace, receipt, CAS and epoch checks.

#### Scenario: default The Boss-managed instance
- **WHEN** the host provides an admitted selected instance and restricted credential
- **THEN** BossFang can connect and delegate while The Boss retains UAR lifecycle ownership
