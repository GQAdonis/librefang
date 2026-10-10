## ADDED Requirements

### Requirement: Historical publication adoption
The explicit historical adoption command SHALL validate immutable evidence and scope coverage, append separate obligation links, and preserve clocks, delivery counts, hooks and acceptance.

#### Scenario: Completed delivery boundary
Given two proven publication obligations and one existing release, when the same release is adopted for both, then both links are recorded without another delivery; repeated command identity returns the recorded result and incomplete evidence leaves debt pending.
