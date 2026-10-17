## ADDED Requirements

### Requirement: documented qualified UAR runtime
BossFang SHALL document one qualified UAR runtime image by digest, with the capability contract BossFang requires and any deployment prerequisites of the next pending UAR release.

#### Scenario: operator selects a UAR instance
- **WHEN** an operator reads `docs/bossfang-uar-connections.md`
- **THEN** it names the qualified image digest, its source commit and the required capabilities

#### Scenario: live contract probe
- **WHEN** the operator runs the documented probe against the qualified image
- **THEN** the capabilities and compatibility responses deserialize with BossFang's UAR driver types, or a mismatch is recorded as a new change
