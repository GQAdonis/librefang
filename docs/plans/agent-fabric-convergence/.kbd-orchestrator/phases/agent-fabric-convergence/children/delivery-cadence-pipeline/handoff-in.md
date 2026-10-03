# Delivery Cadence pipeline — parent handoff

Parent: agent-fabric-convergence. Created at the operator's request on 2026-09-30.

## Observed problem and evidence to assess

The operator reports repeated stalls on the same work and asks for a bounded skill update. The preceding delivery record reports iteration 5 taking approximately 7 hours 34 minutes against a 120-minute target. Assessment must distinguish implementation, repair, packaging, and waiting before attributing that overrun to Cadence. Current Cadence state records five successful deliveries, publication due, and no active iteration. The current admission policy prevents unrelated development while publication remains due; determine the smallest safe correction from source.

## Proposed bounded outcome

Separate local delivery admission from the publication of an immutable delivery snapshot. Permit independently owned development while healthy publication runs, with one publisher for shared release metadata and website state. Keep publication debt visible, tied to the appropriate delivery, and bounded; do not erase it or infer completion from dispatch. Define the precise failure/backlog conditions that block admission in the approved plan.

Keep two-hour iterations, a local pnpm build:mac:arm64 plus actual operation of the delivered function at every completed boundary, and full Mac/Windows publication through the website every second successful delivery. Installed acceptance remains separately tracked. Set scope admission and overrun decisions explicitly; reserve build time without treating a timer as permission to verify unfinished work. Proposed 90-minute implementation/30-minute build allocation is a planning hypothesis, not a newly applied policy.

## Lifecycle and authority

Follow assess → analyze → plan → execute → reflect, stopping for operator feedback after each stage. This command establishes the child only. KBD remains authoritative for lifecycle and approvals. Do not change runtime policy before plan approval. No fabricated Cadence iteration or failure receipt may bypass current admission. This child begins between deliveries, while existing publication obligations remain outstanding; reconcile that case explicitly during assessment.

## Implementation boundaries after approval

Shared skill engine, profiles, schemas, documentation and portable Node argument-array adapters in the full and mini packs. Preserve hook delivery identities, recovery, child clocks, source provenance, historical receipts, publication obligations and supported existing runs. Distribute identical checksummed shared payloads; keep pack-specific adapters separate. Determine exact source checkouts and remote baseline before editing.

No UAR or The Boss feature development, dependency upgrades, new scheduler/daemon, Linux installer expansion, redefinition of successful delivery, blanket source exclusions, or broad skill rewrite. No intermediate unit suites, per-edit verification or repeated passing gates. Complete the bounded update, then operate the complete CLI workflow once and repair only observed failures.

## Parent context to preserve

- Cadence state: .prometheus/cadence/state.json; events: .prometheus/cadence/events.jsonl.
- Profile: .prometheus/cadence-profile.json.
- Latest C09.4 evidence: openspec/changes/afc-c09-bounded-teams-and-shared-task-board/.
- Existing release 2.2.9 source snapshot: Boss 102d7df70dbf5b2975b0fd1290b66f0e4b25c0b2; UAR afeb528b794961483862436edac6b7063065d66e.
- Previously dispatched installer workflow: https://github.com/Prometheus-AGS/the-boss/actions/runs/36759018243 . Its live result must be recovered, not assumed.
- Full skill source used by the current run: /Users/gqadonis/Projects/prometheus/worktrees/afc-c03-full-pack/skills/process/delivery-cadence.
- Mini source: /Users/gqadonis/Projects/prometheus/prometheus-skills-mini.
- Parent generated next-task selection C08.2 does not override the requested child or the operator's Discord deferral.

## Return criteria

Approved minimal design implemented in both packs; completed-boundary operation demonstrates independent admission during publication, correct immutable release ownership, serialized publisher, retained debt and failures, child/restart recovery, and accurate overrun reporting. No velocity improvement claim before comparable measurements. Reflect, record remaining limitations and publication/acceptance status, then restore the parent through supported KBD commands.

## Product-manager scope contribution

The bossfang-stewards product-manager role supplied the bounded scope without editing files or running builds. Assessment must first establish whether the existing engine can support this repair; a new queue or schema is not assumed necessary. Include protection against an older publication regressing newer website links or clearing a newer delivery obligation. This contribution is scope preparation, not adversarial approval or completed assessment.
