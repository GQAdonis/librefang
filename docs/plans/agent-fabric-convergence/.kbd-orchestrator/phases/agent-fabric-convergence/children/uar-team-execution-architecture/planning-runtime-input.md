# Runtime and data input to Plan

Planning consultation only, 2026-09-29 America/Chicago. Roles: boss-runtime and boss-data, with UAR source inspection. This document proposes implementation; it does not certify operation or approve architecture. No source changes, builds, tests, service operations or commits were performed.

## Source baseline and corrections

UAR checkout: `/Users/gqadonis/Projects/prometheus/worktrees/agent-fabric-c09-uar`, HEAD `006eeaf1f90e0a640b0f8fd568419badac5f4320`. Existing modified provider files are `src/llm/orchestrator.rs`, `src/llm/prompt_dialect.rs`, `src/llm/provider_error.rs`; `dist/` is untracked. Boss checkout: `/Users/gqadonis/Projects/prometheus/worktrees/the-boss-d01-build`, HEAD `c00d9b68695fb452d1f09bd4b154582ecaad0035`.

Read the assigned role definitions, team README/routing/tool policy, UAR AGENTS.md, UAR pins, analysis.md and relevant source. Rust workspace/router skills were read; `rust-best-practices` and `rust-async-patterns` were not found in the inspected skill directories. Team handoff and Electron skill instructions were read, but their mutation/runtime workflows do not apply to this explicitly planning-only consultation. No Compass graph query or external dependency claim is required for the source-only plan; no graph/runtime verification is claimed.

Observed source facts:

- `src/uar/compiler/collaboration/storage.rs` stores the whole catalog in one generation-CAS aggregate, for memory, Surreal and Postgres implementations. Surreal uses `uar_collaboration_state:catalog`; its migration is schemaless. This is a useful existing atomic boundary, not proof of backend qualification.
- `src/uar/domain/collaboration.rs::CollaborationCatalogState` has attempt, command receipt, artifact, task and inbox maps, but no executing-process owner record.
- `src/uar/compiler/collaboration/team_execution/admission.rs` creates a queued attempt, reservation and command receipt in one CAS. It currently counts **queued** attempts toward `concurrentTurns` and changes the task to running immediately.
- `src/uar/runtime/team_execution/controller.rs::dispatch` uses process-local jobs/member mutexes, claims queued → running by catalog CAS, then waits for the member mutex inside its spawned job. `recover` only checks that process's live jobs before changing catalog state.
- `src/uar/compiler/collaboration/team_execution/recovery.rs` makes running/cancellation-requested attempts uncertain; it re-drives queued attempts. It cannot distinguish another live process's work from interrupted work.
- `src/server.rs:782` currently advertises team execution for remote Surreal URL schemes in addition to durable-instance support. Remote execution is enabled in source; exclusive ownership is not enforced by this check.
- `src/uar/runtime/thread/control.rs::wait_agents` waits within the caller's current turn. It does not create a durable team wait or release catalog active-turn accounting.
- `src/uar/runtime/turn/request.rs::CollaborationRunBinding` is already a `ClaimRevalidator`; team authority is rechecked through `revalidate_member_binding` and the catalog fence. Extend this existing effect boundary.
- Correction to analysis.md's readiness claim: current `settlement.rs::settle_team_attempt` already records a task as succeeded and readies its dependents when execution is succeeded but usage is unknown. The attempt becomes uncertain and its reservation remains charged. A later recovery path can block tasks for uncertain attempts without distinguishing known execution from unknown accounting. Plan should preserve the successful-output behavior and fix the inconsistent recovery classification; it should not claim that behavior is wholly new.
- Boss `UarSidecarService.ts` has an in-process mutex/startPromise and owned-child lifecycle. Those do not exclude a second independently launched UAR against the same remote catalog. Boss attempt parsing has a closed status enum in `UarTeamExecutionAdapter.ts`, so new states require coordinated contract/UI changes.

## A: smallest enforceable exclusive-execution profile

Use a **non-expiring, generation-fenced catalog execution claim**, not a renewable lease or failover scheduler. Initially choose the entire dedicated catalog as the ownership scope. This is narrower and easier to qualify than independently executing workspaces in the same catalog; owner/workspace authorization still governs every task and message.

Proposed new typed record in the existing catalog aggregate: contract version, catalog identity, designated service-instance ID, fresh process-incarnation ID, monotonically increasing ownership epoch, state (`held`, `draining`, `released`), acquisition/release audit receipts. The process incarnation is freshly generated at boot and never reused from a persisted service ID. These are proposed fields, not existing APIs. Store identity only, never database credentials or a secret bearer token.

1. Server constructs the catalog, then atomically acquires an unheld execution claim before exposing executable team capability or permitting admission, dispatch or recovery. Competing processes race the existing catalog CAS; exactly one succeeds. A losing process can expose scoped read-only diagnostics, but every execution/recovery path refuses with a stable ownership-conflict reason. Do not infer authority from PID, port, hostname, database connectivity or the configured instance ID alone.
2. Capture the claim epoch/incarnation on each admitted attempt. Validate it in admission, dispatch, existing effect-claim revalidation, wait/resume transitions and execution-owned catalog mutations. Perform generation checks and ownership checks against the same loaded state that is committed. Ordinary catalog administration remains separately authenticated and cannot replace ownership through a model call.
3. Clean shutdown first marks draining to refuse new work, then cancels/joins exact owned roots and workers using the existing cleanup path. Only confirmed cleanup permits an audited released transition. Cleanup failure or unreachable storage leaves the claim held. A process restart does not silently inherit a previous incarnation's authority.
4. A crash leaves a held claim. Recovery is an explicit privileged operation requiring expected ownership epoch, reason, authenticated operator identity and an evidence reference establishing that the old process and its effect-producing children have stopped or are externally fenced. Commit a new incarnation/epoch and reconciliation receipt by CAS. Then recover queued intents under the new owner; classify old running work as uncertain without replay. Do not declare timeout, missing heartbeat or network partition proof of death.
5. Safe queued transfer preserves attempt/run/command identity, appends ownership-transfer evidence, and changes only dispatch authority after the old process is excluded. Dispatched attempts retain their original epoch; original terminal receipts may be ingested through a scoped reconciliation operation, not through stale normal settlement. Preserve immutable execution evidence.
6. Existing stopped catalogs can acquire ownership without rewriting historical attempts. Historical queued work needs explicit adoption under recovery; historical running work stays uncertain. Missing epoch never silently means the current owner. Add a versioned execution capability so an old Boss client cannot treat ownership conflict or new lifecycle state as supported execution.

The real trust boundary is admission of model/tool effects by an independently launched process sharing durable state. Protect that boundary; no generic distributed platform is required. No new daemon, database, port, broker, heartbeat loop or lease expiry is proposed.

**Uncomfortable limit:** a new record cannot fence an old binary that does not check it, nor can it retract an already issued remote effect. Initial remote qualification therefore requires a dedicated catalog, controlled deployment versions/credentials and confirmed exclusion of the previous executor before ownership replacement. Never advertise automatic failover or multi-host execution. If the deployment cannot establish old-process exclusion, recovery remains blocked and remote execution is unsupported. A database record alone is not physical fencing.

## B: durable coordinator yield and continuation

Keep attempts as immutable executions of individual turns. A resumed coordinator uses a **new, uniquely linked continuation attempt** on the same TeamTask; it does not repeat the original attempt, reset its run ID or impersonate an old approval root. This is a deliberate contract decision: one task can have several sequential turns; each has its own usage and immutable identity.

Proposed `TeamWait` record in the same catalog aggregate: wait ID, owner/workspace/team/task/member IDs, yielding attempt ID, ownership/task/member epochs, ordered target task IDs, all-targets-terminal predicate, immutable bounded continuation input/digest, state, continuation attempt ID and command receipt. Initial B supports completion-triggered waits and explicit cancellation; no timed scheduled wakeups. Waiting on a failed/cancelled target wakes the coordinator with that outcome; it does not mark the target successful. Reject a target dependency that includes the waiting task, including transitive paths, because the requested one-slot path would otherwise deadlock. Cross-team waits remain outside B.

### Atomic and runtime sequence

1. Delegation commits the worker task/envelope/queued attempt/reservation/command receipt together, through catalog CAS. Queued work consumes its budget reservation and pending-work bound, **not active-turn capacity**. It cannot execute merely because a message exists.
2. Dedicated team wait tool validates actor-derived sender, assigned coordinator task, target tasks and present authorization. It commits a `yield_requested` wait record and receipt while the coordinator remains active. Retry of the same command returns the same wait. The wait cannot be represented as a plain JSON tool response followed by another model iteration.
3. Add a typed internal yield control result at the existing tool/orchestrator boundary. Once the wait tool's durable receipt is confirmed, stop the current model/tool loop before any subsequent model request or later tool call in the batch. Persist dispositions for any unexecuted tool calls; do not silently execute them on resume. Pending or uncertain external effects prevent declaring a safe yield. Do not encode yield as an exception, success artifact, or a model instruction saying “stop now.”
4. Finish/join the exact actor root and its children. Record confirmed turn end and effect disposition, then atomically mark the attempt `yielded`, its task `waiting`, and the wait `waiting`. Preserve known usage or keep the original full reservation when usage is unknown. `yielded` means no further effects may originate from that attempt; it is neither task success nor task failure. Only now release the member lane and active permit and notify the existing dispatch controller. If cleanup is unconfirmed, keep the active/uncertain fence and do not launch the worker under a claimed free slot.
5. On worker settlement, the same catalog transition evaluates relevant waits. If every target has an eligible known terminal execution outcome and the coordinator's yield is confirmed, record the wake reason and try to admit exactly one continuation attempt under a uniqueness key derived from the wait ID. Atomically store that attempt/reservation/command receipt and the wait's continuation-attempt reference. Unknown execution/effects block wake; unknown price alone does not invent or release budget. If budget/current authority refuses continuation, persist a visible blocked reason rather than dropping the wake event.
6. A continuation already admitted is dispatched by the existing controller. It gets a fresh root/run/approval scope, current authorization and shared instructions plus selected durable result artifacts and the bounded continuation input. No restoration of an in-memory Rust future or old authority tree is required. Previous successful tools are evidence, not replay instructions.

### Required dispatch change

Move active concurrency admission to queued → running CAS. Obtain process-local active capacity/member lane before claiming, and revalidate catalog ownership, member/task fences and team ceiling at the claim. Catalog state remains authoritative; a local permit cannot grant authority. Queue order is a catalog sequence. One existing controller drain selects eligible work (round-robin teams, FIFO within team), and receives notifications after enqueue, yield, terminal settlement and recovery. The controller drains only its ownership scope; it is an extension of the current dispatcher, not another scheduler. Coalesce notifications and read catalog state rather than retaining correctness in an in-memory queue.

Per-member exclusion includes waiting tasks: unrelated work cannot create a second active coordinator turn while a wait owns its task. The linked continuation is the only normal successor to that wait. Task reassignment/revocation explicitly cancels or invalidates the wait and cannot transfer old approval authority. Active capacity and member-task ownership are distinct concepts.

### Crash and duplicate matrix

| Interrupted boundary | Recovery behavior |
| --- | --- |
| Command reply lost after enqueue | Same command receipt returns original worker attempt; queued intent may be re-driven. |
| Wait receipt committed, root not confirmed stopped | `yield_requested` remains non-runnable; after executor replacement classify unconfirmed old execution conservatively. No automatic replay or capacity release on receipt alone. |
| Root ended, final wait CAS not confirmed | Recover from canonical terminal/effect evidence for that exact run, then finish the yield once; absent sufficient evidence requires reconciliation. |
| Worker terminal before coordinator wait finalization | Wait-finalization CAS evaluates already-terminal targets, preventing a missed wake. |
| Worker terminal after wait finalization | Settlement evaluates the wait in the same aggregate transition. |
| Continuation commit succeeded but response/notification lost | Wait already references the one continuation attempt; recovery dispatches that queued attempt rather than creating another. |
| Continuation claimed running before crash | Uncertain; never re-drive that attempt as queued. |

No exactly-once external-effect promise follows. The guaranteed design target is one catalog admission per command/wait continuation and no blind replay of a dispatched attempt.

## Concrete implementation ownership and dependencies

All paths below are existing except explicitly marked proposed. UAR relative paths use the UAR checkout above; Boss paths use the Boss checkout above.

| Owner | Minimal paths / responsibility |
| --- | --- |
| uar-state + uar-runtime, one designated writer | `src/uar/domain/collaboration.rs`, `src/uar/domain/team_execution.rs`; proposed `src/uar/domain/team_wait.rs`; versioned ownership/wait/attempt receipt contracts and additive decoding of legacy records. |
| uar-state | `src/uar/compiler/collaboration/storage.rs`, `service.rs`, `team_execution/{admission,settlement,recovery,mod,scope}.rs`; proposed capability-local ownership/wait modules. CAS ownership acquisition, epoch checks, unique continuations, reservation and task projection. Preserve settled execution separate from accounting. |
| uar-runtime | `src/server.rs`, `src/uar/runtime/team_execution/{controller,execution,epoch}.rs`, `src/uar/runtime/turn/request.rs`; claim startup/shutdown, one controller drain, lane/permit release and recovery. |
| uar-runtime + uar-trust-tools | `src/llm/orchestrator.rs`, `src/uar/runtime/manager.rs`, `src/uar/runtime/thread/{actor_host,mod}.rs`, native-skills team tool module (proposed), relevant normalized-event/control types located by implementation owner. Typed yield propagation, durable terminal evidence and cleanup. The dirty orchestrator provider patch is another writer's surface: serialize or integrate by lead assignment. |
| uar-api + boss-runtime | `src/uar/api/collaboration/team_execution.rs`, capability/response contracts; Boss `src/main/ai/runtime/uar/{UarTeamExecutionAdapter,UarSidecarService}.ts`, `src/shared/types/uarTeams.ts`. Stable ownership conflict, yield/wait/resume states, revisioned recovery operation and known-execution/unknown-accounting projection. |
| boss-data | Review classification only: UAR owns task/wait/claim truth. No new Boss SQLite scheduler, mirrored task-state table or SQLite migration is required for this plan. Preserve existing SQLite data and only add persistent local administrative evidence if the final approved UX cannot derive it from UAR. |
| boss-UX/i18n | Existing team views and locale catalogs selected by the lead: show waiting target, blocked continuation reason, execution-owner conflict and uncertainty separately from successful output. Existing closed enums must evolve in the same delivery. |

A depends on frozen scope and privileged executor-replacement policy. B depends on A, exact request-profile correction, team tool authority/context contracts, pending-work limits, explicit active-capacity settings, typed kernel yield and current-source recovery classification. Implementing only wait records or only a semaphore cannot ship B. Existing OpenSpec durable-team-execution/admission change must carry these deltas; this consultation creates no competing change or phase.

## Completed-boundary operation criteria

Run only after all code, API/client contracts, UI/i18n and packaging in the relevant delivery are complete. These are planned local acceptance operations; none ran during consultation.

**A:** Against an isolated pinned remote Surreal catalog, start two current-build UAR executors and prove only one owns execution. The second must refuse admission, dispatch and recovery, not merely hide a UI button. Clean stop releases ownership after child cleanup. Abrupt loss retains the claim and blocks automatic takeover. Operator-authorized replacement with old-process exclusion transfers queued work once; running work remains uncertain. Exercise storage-loss refusal and stale-epoch effect/settlement rejection through production entry points. Repeat the same claim/recovery operation on the selected local profile before advertising it. Postgres and other backends remain unqualified until their own operated boundary passes.

**B:** From packaged Boss, a coordinator delegates to a worker with team/global active capacity set to one. Show coordinator yielded/waiting, worker runs and returns an artifact, coordinator resumes once and completes the user request. Capture catalog receipts, all run IDs, selected contexts, effective policy and usage reservations. Lost-reply and restart cut points must prove the matrix above through the actual API/kernel/persistence boundary. Repeat an already committed command and duplicate terminal notification; no extra worker or continuation attempt is created. Revocation or reassignment before wake blocks the continuation. A second workspace cannot read or wake the first workspace's wait. Unknown provider price retains budget while known output remains usable; unknown effects block unsafe wake/replay. A wait with a dependency cycle is refused visibly.

Finish the appropriate serialized local build, Boss Mac package build and actual packaged operation. Builds and source inspection do not replace those receipts. Preserve previously passed boundaries; rerun only a failed relevant gate after a fix. No claim of full collaboration-draft conformance, automatic failover, hosted scheduling, remote effect cancellation or Windows certification is made by these two slices.
