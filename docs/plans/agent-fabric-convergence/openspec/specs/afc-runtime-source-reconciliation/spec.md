# afc-runtime-source-reconciliation Specification

## Purpose
TBD - created by archiving change afc-runtime-source-reconciliation. Update Purpose after archive.

## Requirements

### Requirement: Preserved source integration
All connected fork heads and dependency pointers SHALL be recorded and reconciled without discarding release repairs or unrelated local work.

#### Scenario: Completed delivery boundary
Given dirty primary checkouts and liter-llm repairs ahead of main, when integration sources are selected, then isolated release worktrees retain those repairs and published artifacts keep actual provenance.
