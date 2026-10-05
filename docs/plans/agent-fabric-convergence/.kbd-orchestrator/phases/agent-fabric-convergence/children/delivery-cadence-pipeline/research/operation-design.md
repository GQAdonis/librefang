# Delivery Cadence pipeline: operation design

Date: 2026-09-30. Analysis-stage proposal; no production changes, builds, or test execution. This note extends [source-audit.md](source-audit.md). It does not approve an implementation or bypass KBD architecture approval.

## Decision

Retain one active local delivery and one canonical KBD owner. Add **one bounded work-ahead scope** while its frozen checkpoint runs, and separately track immutable publication candidates. Keep process execution in the invoking harness/CLI process; introduce no service, daemon, background scheduler, or automatic agent dispatcher.

The metadata lock protects only read/validate/append transactions. A durable job claim protects a long operation; a resource reservation prevents conflicting build/output writers. These are different responsibilities.

## State and authority

Use a version 3 state contract with additive records. Preserve historical iterations and receipts unchanged.

| Record | Essential identity and state | Authority |
| --- | --- | --- |
| Active iteration | Existing iteration ID, scope, continuous clock, KBD phase, children and frozen profile | Existing KBD lead; canonical completion remains outside Cadence |
| Frozen local candidate | Candidate ID, iteration ID, source contract hash, actual checkout paths, command contract, output roots, creation time | Freeze captures completed production scope, not delivery success |
| Work-ahead scope | Scope ID, explicit approval/authorization reference, owners, named outcome, task IDs, isolated repositories/output roots, base refs, dependency classification, activity timestamps | Lead assigns work within approved architecture; no second KBD leaf |
| Long-operation job | Job ID, candidate/event ID, kind, attempt ID, command ID, owner token, host, runner identity, process identity if known, resource keys, state, timestamps, receipt location | One live executor claims an attempt; result adoption reloads current state |
| Publication obligation | Stable obligation ID, due delivery ordinal, frozen selected candidate, outstanding platform/metadata/site receipt set | Publication owner resolves that obligation only |
| Hook delivery | Existing event/handler/registration revision identity, effect state and result receipt | Existing explicit hook registration and effect authorization |

Candidate source content and execution location must be separate fields. The current source identity includes an absolute repository path. Preserve it for old receipts; new records can identify repository origin/local identity plus exact revision/fingerprint and separately name checkout paths. Do not silently treat two paths with the same HEAD as equivalent when one has dirty changes or different submodules/assets.

For the first bounded implementation, the lead supplies isolated worktrees; the engine records and checks ownership instead of building a general worktree manager. A frozen checkout remains unchanged until its operation ends. A second checkout sharing its build output is not isolated. If an immutable tree cannot be identified, work-ahead may touch only other explicitly independent repositories.

## Local delivery and work-ahead transitions

```text
implementing -> ready/frozen -> checkpoint pending/running -> local gate passed -> finish
                                    | failure/unknown
                                    v
                              corrective work -> new candidate/attempt

ready/frozen + approved independent scope
  -> one work-ahead scope admitted
  -> implementing in isolated owned paths
  -> staged (not a successful delivery)
  -> promote only after previous delivery succeeds and ownership is reconciled
```

Rules:

1. Work-ahead is admitted only after current production scope is complete and its candidate frozen. Record what the next user-visible result will be, which repositories/files are owned, which prerequisite contracts it consumes, and why edits are independent of the current operation.
2. One work-ahead scope may contain existing parallel role assignments, subject to the existing team cap. It is not a second unlimited queue. Its resource and activity records remain visible while current build/run jobs execute.
3. A dependency marked unknown is not independent. Do not modify the frozen checkout, its release inputs, shared output directories, or a contract still awaiting approval. An architectural child follows the existing KBD gates under the sole active owner; work-ahead cannot open a competing child.
4. The timer does not certify work. Promotion creates the next iteration using the work-ahead's original first-work timestamp and activity history, so preparation time is not erased. Distinguish admission, first work, promotion, and delivery timestamps. Count overlapping run wall time once; retain per-scope effort separately.
5. Promotion does not count completion or increment publication frequency. The promoted iteration must still finish its entire UI/contracts/strings/persistence/package scope and pass its own frozen build, launch, and feature operation.
6. If the current gate fails, stop dependent promotion and work touching its repair surface. Independent owned edits can continue, but repair has priority for the constrained build resource. Reconcile any changed prerequisite source before promotion. Do not discard work-ahead, reset its clock, or relabel corrective work as successful new delivery.
7. Operator stops, hard budgets, architecture approval waits and mandatory human review remain binding. Work-ahead cannot be used to evade them. No automatic scope widening.

This is a policy adjustment from the current blanket “repair before any new scope”: the proposed contract permits **independent edits**, but never dependent promotion, delivery certification, or publication of failed candidate bytes.

## Short transactions and long jobs

Use the following execution pattern for checkpoint processes, publication receipts with network work, hooks and optional learning-recorder calls:

1. Acquire metadata lock, reload canonical persisted state, validate command signature and expected contract/state, claim job and required resources with unique owner token, append event, release lock.
2. Execute the already-frozen action outside the metadata lock. Preserve argument arrays and `shell:false`. Keep logs and small result/intent files under the job's owned directory. The live CLI remains responsible for its process; the harness can wait for it while other agents work.
3. Reacquire lock for a short process-start record when PID/process identity becomes available. Never retain a stale state object across an unlocked operation for later wholesale writeback.
4. On exit, write the immutable result receipt, then acquire lock, reload state, validate the original claim token/attempt/contract, append the result, update only that job and resource records, release lock. A result for a superseded source candidate is retained historically but cannot satisfy the new candidate.
5. Hook result updates follow the same reload-and-append discipline. Hook effects keep their existing event/handler/revision identity and idempotency semantics; shortening the lock must not create two effect executors.

The metadata lock is intentionally global and brief. A build reservation is scoped to the actual machine plus normalized shared build/output path or another explicitly named resource. Publication has a single metadata/site writer reservation. Per-platform builds may run independently only with separate resources and an explicit resource-capacity decision from the lead.

No timeout/heartbeat expiry alone transfers ownership. A slow job is still running. Unknown ownership blocks only the affected resource and dependent transition, while other independent work can proceed.

## Job lifecycle, cancellation, and recovery

```text
claimed -> starting -> running -> succeeded | failed | cancelled
    \          \          \
     \----------\----------> unknown -> reconciled result | stopped/retryable
```

`cancel-requested` is an intent alongside nonterminal state, not proof of termination. Cancellation is complete only after the owned process tree exits or an explicit recovery record establishes that it stopped. Publication cancellation cannot undo an upload or deployed website; those effects remain partial/unknown until reconciled.

- **Live owner:** before spawning, record launch intent; after spawning, record process identity. The invoking process honors a small job-specific cancellation request file through a bounded timer during its own lifetime. This is not a persistent daemon. Alternatively the harness can signal the known live owner, which already propagates cancellation to its child tree.
- **macOS/Linux:** reuse detached process-group handling; terminate the owned group gracefully and then force termination when necessary. Preserve the process-group identity in the attempt receipt.
- **Windows:** reuse argument-array `taskkill.exe /PID <pid> /T`, escalating `/F` for the owned tree. Do not use shell interpolation or target a process merely by executable name. If the owner has died and PID identity cannot be safely established, do not kill or dispatch a replacement automatically.
- **Restart:** a repeated command returns its recorded completed result or current job status. It must not immediately mark a live checkpoint failed or start it again. Read the durable result receipt first; then inspect recorded host/process ownership. A missing receipt plus a still-live owner means attach/status, not replay.
- **Interrupted launch gap:** if an attempt was claimed/starting but no trustworthy process record/result exists, mark unknown. Establish that the old process/resource is stopped before retry. Do not infer “never started” from missing PID metadata; process creation and persistence are not atomic.
- **Remote owner:** local process APIs cannot establish whether a different host's job is dead. Require that runner's result/stop receipt or operator reconciliation. Do not reclaim by elapsed time.
- **External effects:** a hook/publication action interrupted after its remote effect but before a receipt remains unknown. Retry only under the existing explicitly configured receiver idempotency contract or after reconciliation; never promise exactly-once email/publication.

The current `process.mjs` already performs owned Unix-group and Windows-tree cancellation. The bounded change should preserve this implementation and add durable lifecycle ownership around it, not introduce a new platform process framework. Native Windows behavior still needs actual boundary operation; a macOS source inspection cannot establish it.

## Exact-source receipt adoption

Introduce a supported checkpoint receipt-adoption action so an already completed direct build/run does not need repeating merely to gain a Cadence wrapper receipt.

Required receipt fields:

- Schema version, stable external receipt ID, candidate and checkpoint IDs, attempt identity and evidence producer/provenance.
- Exact frozen source contract and digest, including relevant pinned submodules/runtime assets; execution checkout separately identified.
- Frozen command/argument-array/cwd or a previously approved explicit equivalent command contract. A successful different command is not silently interchangeable.
- Ordered start/end timestamps, actual exit status, hostname/platform/architecture, and immutable log/result evidence reference with digest.
- Build artifact absolute paths and actual byte hashes/sizes; where artifacts moved, current paths may differ but byte identity and original location remain recorded.
- For launch and feature operation, the operation ID, matching artifact/source identity, observed result and required scenario evidence. Baseline launch cannot stand in for the new functionality.

Adoption reads the evidence, checks the candidate contract and artifact bytes, then appends a new **adopted** receipt under a short transaction. It does not execute the build again or alter the original receipt. Missing process/source/operation evidence remains unknown and does not satisfy success. Repeated adoption of the same receipt ID/digest is idempotent; a different digest under the same ID is rejected.

Record historical evidence exactly as it exists. If only a log and DMG filename survived, report that limitation rather than fabricate command/source binding to avoid a rebuild.

## Publication overlap contract

Freeze the selected release candidate when its obligation is claimed. Its result validates against that candidate and frozen publication requirements even if another local delivery completes meanwhile. Completing obligation A cannot clear obligation B or recalculate its schedule from the latest count.

One publication may execute while later useful development proceeds. Every-second-successful-delivery scheduling creates identifiable obligations from successful-delivery ordinals. A latest queued candidate may supersede an older **unstarted** candidate only if the plan explicitly permits coalescing and the log records which meaningful changes are included, the original due time, and retained maximum publication delay. Never silently replace a running candidate or postpone publication indefinitely. This optional coalescing policy needs an explicit plan decision; it is not implied by this analysis.

Do not publish a new empty release because a timer elapsed. Select completed, independently usable outcomes with meaningful release notes since the previous advertised candidate. Operational fixes and compatibility updates can qualify; raw task count and timestamp cannot. When nothing qualifies, record a no-meaningful-update disposition without inventing delivery success or deleting existing debt.

Installed acceptance remains separately visible according to the user's existing instruction. The next source increment cannot turn pending acceptance into passed acceptance.

## Migration and old-writer exclusion

1. First finish or reconcile every live old-version mutating process; acquire the existing run lock before migration. Back up both event history and snapshot. Do not migrate under a still-running checkpoint.
2. Append a v2→v3 migration event; preserve all prior receipts, command identities, hooks, timestamps and immutable work events. Historical missing job/candidate information is unknown.
3. Translate existing publication debt into a legacy obligation with its known latest successful delivery/source refs, not a fabricated running or completed release. Attach actual in-flight workflow IDs only through documented reconciliation evidence.
4. Require the new writer contract version before every mutation. Current v1.1.2 writers already reject `schemaVersion !== 2` outside migration (`engine.mjs:317`), and their migration function only accepts v1/v2 (`lifecycle.mjs:8–9`); a persisted v3 state therefore refuses old writes. Keep a clear error and upgrade/resume instruction in the new distribution. Do not claim all unknown future/foreign writers are enforceably excluded.
5. Because the existing reader reconstructs from event history, version3 must be present in the appended authoritative state, not only `state.json`. Old read-only reports may misinterpret new fields; report unsupported writer/reader versions rather than endorse their output.
6. Update configured CLI/adapter paths and full/mini payload inventories at the same cutover. Preserve unmanaged copies; report version mismatch instead of overwriting local changes.

## Implementation seams

| Existing module | Bounded responsibility |
| --- | --- |
| `engine.mjs` | State transitions, one active delivery/work-ahead scope, job claim/result commands, candidate publication obligations; keep CLI thin |
| `storage.mjs` | Short exclusive transactions and append persistence; all result updates reload current state |
| `checkpoints.mjs` plus a focused job/receipt module if needed | Frozen attempt preparation, process execution outside transaction, exact evidence adoption |
| `process.mjs` | Preserve portable subprocess/cancellation API; minimal cancel-intent coordination |
| `hooks.mjs`, `lifecycle.mjs` | Effect claim/result isolation, v3 migration, optional learning outside long lock |
| `delivery-contract.mjs`, `report.mjs`, schemas | Candidate-specific validation; overlapping work/debt/unknown-state reporting |
| `children.mjs` and KBD adapters | Keep one authority; attach child to owning delivery, never a competing work-ahead leaf |

Decision-ready recommendation: approve this bounded state evolution, require one work-ahead scope and one publication owner initially, and keep the existing two-hour/every-second-delivery policy unchanged. Defer generalized multi-delivery scheduling, automatic resource provisioning, arbitrary parallel phase ownership and distributed job execution.
