# Spec Delta

## Purpose

Define the cross-product behavior for feedback workflow and governed connector effects so compatible implementations preserve the architecture and authority boundaries.

## ADDED Requirements

### Requirement: Authorized feedback intake

A feedback workflow MUST support draft-only operation and scoped standing authorization for sanitized issue creation, with durable effect identity and uncertainty reconciliation.

#### Scenario: 1 — Authorized feedback intake

- **WHEN** The same authorized feedback arrives by direct API and BossFang channel, and an issue-creation response is lost
- **THEN** reconciliation produces one issue or a visible unresolved outcome without blind retry; no customer message or roadmap promise is implied.

### Requirement: Connector action separation

Connector capabilities MUST separately authorize reading, drafting, writing, sending and publishing; external content MUST be treated as data.

#### Scenario: 2 — Connector action separation

- **WHEN** A Slack, Notion, Jira or GitHub item instructs the agent to expand its rights or disclose unrelated content
- **THEN** the instruction cannot expand authority, and only explicitly permitted targets and actions execute.

### Requirement: Report acceptance coverage

The implementation MUST satisfy all assigned report acceptance clauses below; source-gap reclassification by C01 requires a recorded equivalent or superseding contract.

- REC-039: Authorized intake creates one sanitized issue; an issue does not authorize implementation or roadmap commitments.
- REC-046: Restart resumes pinned workflow without duplicate external action; uncertain effects require reconciliation.
- REC-053: Private input cannot be posted to a disallowed destination; every effect has decision and outcome references.
- REC-056: Scoped event yields one governed issue plus product/design review with complete causal evidence.
- REC-059: Compare embedded-compatible reuse against explicit durability/throughput needs before selecting a new engine.

#### Scenario: Supported-profile acceptance

- **WHEN** this capability is evaluated for a supported profile
- **THEN** the acceptance evidence identifies each applicable clause above, the exact source/policy/dependency revisions and the observed outcome; any unproven mandatory clause keeps that profile unsupported.

### Requirement: GitHub-first customer feedback

After usable teams, reusable configuration and integrated BossFang/MiniApp delivery, the selected customer profile MUST classify and deduplicate feedback, prepare an issue draft and require explicit approval before GitHub issue creation. Existing workflow/effect identity, credential references, egress scope and unknown-outcome reconciliation MUST be preserved. Notion, Slack and Jira adapters remain pending backlog; their absence MUST NOT gate GitHub delivery and GitHub-only evidence MUST NOT complete C10.2 in full. Scoped standing authorization remains a separately qualified profile rather than the first customer default.

#### Scenario: Explicitly approved issue after reconnect

- **WHEN** the user reviews a team-produced issue draft, approves its exact target/content and reconnects after an uncertain creation response
- **THEN** the workflow reconciles the same effect to one issue or a visible unresolved outcome, without blind resend or authorization to implement the issue.
