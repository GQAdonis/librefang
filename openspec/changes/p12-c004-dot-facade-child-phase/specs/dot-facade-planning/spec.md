## ADDED Requirements

### Requirement: dot facade baseline on the synced tree
The KnowMe/dot facade child phase SHALL start from a baseline re-verified on post-sync `main` that drafts a mapping of every #156 acceptance row to a proposed change and test suite.

#### Scenario: acceptance coverage drafted
- **WHEN** the child `baseline.md` is written
- **THEN** each of A01–A20 maps to at least one proposed change and one named test suite

#### Scenario: ownership inventory
- **WHEN** the child `baseline.md` is written
- **THEN** it lists every path that can create an unowned workflow or task on post-sync `main`
