# Feature-operation readiness clarification

2026-09-30 — operator-reported gap from a separate Obsidian 07a delivery.

## Observed report and evidence boundary

The operator supplied a report stating that 07a's integration suite uses a recording fake node, while no real shared-node operation script was included. This phase has not inspected that project's source or operated Kubo. Its defect report is an input, not a verified description of the repository.

## Requirement for the Cadence plan

At scope admission/start, declare the delivered capability and a feature-operation contract: production entrypoint; procedure; execution target (real dependency or substitute); prerequisites; resource ownership/isolation; side effects and authority; expected observable result; and evidence limits. Either the procedure exists or a selected, authorized implementation task creates it before ready/freeze.

At ready/checkpoint, a missing procedure cannot be silently replaced by a suite. Evidence using a substitute cannot satisfy a declared real-service compatibility outcome. Conversely, Cadence must not add a real-service integration requirement to an explicitly limited, approved delivery. Require an explicit scope decision rather than generating a new task automatically.

For the quoted 07a choice, a scoped real-node operation is recommended if real Kubo publish/pull is the promised outcome. Prefer isolated naming keys and demo roots. Updating an existing shared name, adding remote pins or other external effects requires the relevant authority. Stub tamper/replay evidence remains separately labeled. Writing that project script belongs to its owning project, not this skill child.

This clarification prevents late missing-procedure discovery; it does not produce a Kubo script, grant shared-node write authority or establish real-node compatibility.

## Repository inspection supersedes the initial uncertainty

The project was subsequently inspected read-only at the operator’s request. See [verified local findings](research/obsidian-07a-gap.md) and the timestamped hash inventory. The gap is in planning/split propagation before iteration 7 starts: six deliveries complete, no active iteration, no publication debt, 07a pending 0/32. No real-node operation was run.
