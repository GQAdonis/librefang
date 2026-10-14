# C09.3 Karpathy learning note — pending delivery boundary

This is a prepared learning note, not a recorded completion event. Event timestamp, elapsed hours, frozen revisions, checkpoint exit codes and final outcome remain pending. Attach the actual operation/build receipts before creating the durable progress event.

## Observed pricing boundary

The gateway serves an alias, while canonical cost accounting needs the explicit source provider/model identity. The inspected Boss setup now refuses an unresolved gateway target with `UAR_TEAM_MODEL_PRICING_UNAVAILABLE`; alias names alone do not prove the pricing source. The delivery lead reported the exact local mapping: alias `kimi-for-coding` targets provider/model `kimi-for-coding` / `kimi-for-coding`, with upstream `https://api.kimi.com/coding/v1`. The operation fixture therefore records that observed identity in the isolated profile against the selected gateway ID. Custom aliases require explicit source identity. It does not change the live gateway or transmit an upstream credential.

Proposed lesson: resolve and record the actual alias target before starting a bounded priced team operation. Keep an unknown source/price explicit instead of guessing rates or treating missing price as free. A completed actor response and settled canonical usage are separate facts: unknown accounting retains reservations and uncertainty even when execution succeeded. The real operation's accounting outcome remains pending.

## Parallel implementation and build ownership

The delivery was split into disjoint responsibilities: admission/settlement and frozen contracts; runtime bridge/model-pricing integration; Boss typed IPC/UI/translations; and scoped membership/context plus the real operation authoring. File ownership and direct contract messages avoided overlapping writers. This is evidence of coordination, not a measured speedup. Builds against a shared target remain single-writer work after all production surfaces freeze.

Proposed lesson: parallelize independent production ownership, freeze the interface shapes early, and communicate source-contract changes directly to the operation author. Keep the expensive build and packaged operation serialized at the complete delivery boundary.

## Zero intermediate tests

The scoped implementation/operation author ran no unit tests, mock suites, per-edit builds, compiler gates or feature operations. Rust formatting and source inspection were used during implementation. The complete delivery lead's final build and packaged-app evidence are still pending in this note. Do not generalize this author's observation into an unverified claim about commands run by every participant.

Proposed lesson: finish production code, contracts, UI, translations and packaging first, then operate only the newly delivered real path. On an observed final-boundary failure, repair that failure and rerun only its failed gate. Never promote authored scenarios or source inspection into runtime proof.

## Ledger anomaly

Cancelling the accidental duplicate registration preserved task history but KBD rolled its cancelled-only change to Complete. There is no supported targeted withdrawal transition from that terminal change. At projection revision 344, phase 9/20 minus the duplicate is approved net 8/19; whole run 12/23 minus that duplicate and three child process/specification entries is also 8/19. C09.3 remains pending. Preserve both raw and net counts and never credit the duplicate as implementation.

Before recording the final event, fill in: actual source-pricing result; any observed failures and repairs; final build/package/operation receipts; actual elapsed time; canonical completion receipt; and exact next work. Do not emit a complete event from this draft.

## 2026-09-30 — Boundary repair, not completion

An actual packaged first turn used 1458 of its 1536 reserved tokens. The second turn added an immutable selected artifact but reused that grant and failed during streaming; attribution to the budget is not yet proved. Repair now preserves typed host-grant failures and uses the existing remaining team grant for the larger selected-context operation. Aggregate ceilings and unknown-accounting retention are unchanged. Safe errors must remain diagnosable without retaining prompts, keys or raw provider bodies.

Operator-requested dependency refresh exposed a separate, reproduced compilation blocker: the newest fork removed UAR-required endpoint-redaction and transport controls. Restore the actual credential-boundary behavior rather than deleting the callers. This refresh and repair belong to the current continuous, overrun delivery; they are not another credited iteration. No unit suites or intermediate verification builds ran; actual delivery builds/failed operation receipts and mandatory commit hooks are retained. Build repetitions are rework, not velocity.

The first restored-fork release build also found one explicit typed ClientConfig builder literal missing the restored redaction field. The repair initializes that default and searches the other explicit constructors before another build. This was a production packaging compiler failure, not a test-suite run. Static constructor/API migration mapping should accompany future dependency refreshes so the actual installer build does not become a avoidable edit loop.

### Delivery procedure contract corrections
Packaged product inference and scoped context now succeed; explicit checkbox association fixed a reproduced UI omission. The subsequent operation exposed stale fixture assumptions: create uses deploymentBindingId, returned instances use binding.id; cancellation returns before settle/join and a fresh member CAS can conflict with that settle (collaboration_revision_conflict). The procedure now waits for actual terminal cleanup before a separate member command. Remote operation explicitly supplies canonical pricing and reserves available bounded budget, since the same starter context actually consumed 1405–1728 tokens and an arbitrary512-token grant cannot fit it. No aggregate cap or runtime CAS was weakened. Repeated installer builds due procedure-only source freezing are overhead, not extra delivered capability; optimize provenance separation in a separately scoped cadence improvement rather than silently exclude release inputs here.

Unoperated source-only follow-up assigned to B3: revoke active-state selection excludes cancellation_requested; inspect task-state cleanup when revocation overlaps that state. This is not a reproduced product failure or completed repair. Current completed-boundary procedure deliberately joins cancellation before issuing a separate membership command and preserves exact CAS semantics.

## Completed Gate A learning — 2026-09-30

Gate A passed at the source and receipts in c093-gate-a-receipt.json. Delivery 4 finalized at09:40:47.577Z after an honest continuous overrun; repeated native/app packaging and operation repairs are retained as rework, not extra delivered tasks. The completed operation observed real configured gateway inference, explicit selected artifacts, exact request/profile identity, preserved restart results, cancellation/revocation, and fenced catalog ownership on SurrealDB3.3.0. Cadence recorded its learning report locally; optional pk memory timed out and remains degraded. No unit, mock-only or per-edit test suites ran. C09.4 is now implementing; no cooperating-pair runtime claim is made.
