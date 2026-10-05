# Draft implementation contracts: Delivery Cadence pipeline

2026-09-30 · companion to plan.md · proposed interfaces, not currently available commands.

## CLI requests

Use the existing `node <skill>/scripts/cadence.mjs` entrypoint. New mutation requests accept `--input <json-file>` and `--command-id <stable-id>`; retain existing forms compatibly. Absolute native paths are supplied as argument-array values, never shell strings. Read commands must not acquire a lock held for an entire operation.

| Proposed command | Request and result |
|---|---|
| `candidate freeze` | Active iteration ID, complete scope revision, source/build/feature-operation manifests and checkout isolation declaration → immutable candidate ID and digest. |
| `work-ahead admit` | Candidate predecessor, approved canonical scope IDs, owner/file assignments, outcome/operation readiness, base commits, execution roots and dependency classification → one admitted scope. |
| `work-ahead status` | Show ownership, first work time, dependencies, resource conflicts and promotion blockers. |
| `work-ahead promote` | Authorized scope ID, predecessor local success, review/hooks/child resolution and repaired-base reconciliation → next iteration with original firstWorkAt. |
| `job status` / `job reconcile` | Attempt ID and observed process/remote evidence → current state or appended result, never blind redispatch. |
| `checkpoint adopt` | Candidate, checkpoint contract and immutable external receipt → evidence subject to the same gate as a natively executed checkpoint. |
| `publication attempt` | Obligation/candidate/platforms plus registered consumer adapter and authorized targets → persist dispatch intent before invoking the adapter. |
| `publication reconcile` | Obligation/attempt identity plus immutable platform, metadata or site receipts → resolve only covered effects. Explicit authorized replacement is a separate request kind. |
| `tick` | Optional evaluation time supplied by trusted owner, default current UTC → stable opportunity dispositions and due obligations; no service or recurring process. |
| Existing `start`, `ready`, `checkpoint`, `finish`, `resume`, `child`, `status`, `report`, `configure`, `migrate` | Add the contracts below without bypassing existing completion, approval, hook or child authorities. |

The lead freezes final command names and module ownership in task 1 before implementation; documented migration/compatibility aliases remain explicit. Unknown fields and stale references return actionable errors traced to these observed lifecycle boundaries.

## Common identity and request contract

Every mutation records schemaVersion, runId, commandId, commandType, normalized requestDigest and expected relevant entity revision. Repeating the same ID/digest returns its recorded result; a changed payload conflicts. Existing historical command IDs remain recognized. Each new long attempt has attemptId, operationToken and entity/source identities; command identity does not replace resource ownership.

Schemas use explicit discriminated state values; timestamps are UTC and absent observations remain null/unknown with reason. No credential values or full transcripts enter events or reports. Authority references point to existing approvals; presence of a string does not create approval.

## State v3 entities

- **Candidate:** candidateId, iterationId, scopeRevision, outcome, createdAt, contentManifestDigest, repositories `{logicalId, commit, submodules, preservedDirtyInputDigest?}`, runtime/packaged assets, build recipes/config digests, platform requirements, physical execution roots, featureOperation and immutable source-reference receipts. Identity excludes incidental checkout location but execution ownership records it. Dirty inputs require preserved bytes, not just status output.
- **FeatureOperation:** id, promisedCapability, procedure, checkpointId, entrypoint `{command,args,cwd}` or approved creationTaskRef before freeze; target/dependency description with `real|substitute|local` classification, permitted evidence level and limitations, prerequisites, isolated resources, externalEffects and authorityRefs. At ready/freeze the source driver or direct argument-array command sequence must be implemented and its creation task resolved. Declare build-produced entrypoints separately and resolve those after build, before feature operation; do not require generated outputs before compilation. A custom script is optional. Capability promise and allowed evidence survive scope splits; changing either is a recorded authorized scope revision.
- **WorkAhead:** id, predecessorCandidateId, authorityRefs, canonicalScopeRefs, owner/ownedPaths, outcome, featureOperation, baseSourceRefs, checkout/output roots, dependencyClass, admittedAt, firstWorkAt, activityRefs, blockers, repairedBaseRef and state `admitted|working|blocked|eligible|promoted|cancelled`. One unpromoted scope; no second KBD owner or active iteration.
- **Job:** id, candidateId, kind, checkpoint/adapter contract digest, attempt number, ownershipToken, resourceKeys, frozen command or remote request, state `claimed|launching|running|cancelRequested|succeeded|failed|cancelled|unknown`, process/remote identity, claimed/started/ended observations and immutable result refs. An unknown launch can have no PID.
- **PublicationObligation:** id, due ordinal/opportunity, original dueAt, frozen policy revision, candidateId, required platforms/effects, covered scopes, associated attempts and disposition. Original due/coverage survives explicit replacement; completing another obligation cannot clear it.
- **ReleaseAttempt:** id, obligationId, candidateId, releaseVersion, platform, source/recipe/asset identity, adapter/correlation ID, dispatch intent, external repository/workflow/run/job IDs, immutable receipts, retry/unknown state. Different candidate or source is a new attempt; no running retarget.
- **PublicationReceipt:** id/digest, obligation/attempt/candidate, platform or metadata/site effect, actual version/artifact checksum/size/URL/signing/source data, expected advertised predecessor, metadata commit/site deployment and observed timestamps. Required evidence varies by effect; a dispatch receipt cannot fulfill an artifact or website requirement.

Keep previous iteration work receipts immutable. Derived statuses report applicable receipts plus reasons for invalidation; they do not delete attempts. v2 path-bound fingerprints retain their historical meaning rather than being silently upgraded to portable content equality.

## Long operation and resource contract

1. Under the existing short run mutex, reload state, check command/entity revisions and authority, allocate attempt/token and persist claim.
2. Claim physical resources through the shared host/user filesystem registry at `path.join(os.homedir(), ".prometheus", "cadence", "resources-v1")`, or an explicit common override configured identically by cooperating runs. Canonicalize an existing ancestor with realpath, append missing output components, and preserve platform/filesystem case semantics rather than lowercasing every path. Key claims by that physical target/output identity. This contract coordinates only cooperating runs sharing the same host/user registry; it is not cross-user or remote fencing. Persist claimant run/attempt/token and process-owner evidence. All cooperating runs use the same registry; local ownership does not fence unrelated remote publishers.
3. Invoke frozen args using shell:false outside the run mutex. The invoking execution session owns the job. Persist launch and terminal evidence in a durable attempt directory before state reconciliation.
4. Reacquire mutex, reload, match source/attempt/token, append result and release only resources proved no longer in use. Never save the old pre-operation snapshot over newer state.

Acquiring multiple resources follows one deterministic key order; failed acquisition releases only newly acquired claims before recording blocked status. Claim/run crash gaps reconcile against journal and registry. No elapsed lease or reused PID alone proves the previous writer stopped. Cancellation requests use current owned Unix group/Windows tree mechanisms; retain unknown if termination cannot be proved. Never reclaim another task’s directory or terminate a guessed process.

Hooks use existing eventId+handlerId+registrationRevision identities and preserve unknown external outcomes. Required hook failures block applicable promotion; warnings do not rewrite build results. Learning recorder work runs outside the mutex and is optional. There is no exactly-once external-effect promise.

## Receipt adoption and meaningful delivery

Adoption supplies receiptId/digest, candidate/input manifest, original command/equivalence authority, timestamps, exit status, platform/architecture, logs, output artifact paths/URLs with rechecked hashes, producer identity and new-function operation evidence. Ordered timestamps support timing only when trustworthy. Same receipt identity/digest is idempotent; altered bytes or mismatched sources conflict.

Successful delivery requires a completed named outcome, meaningful changed release inputs, applicable build, launch and actual feature-operation evidence. A baseline setup action does not demonstrate a new team board. A recording substitute can only support an explicitly limited claim, not actual Kubo/GitHub/inference or installed operation. Missing procedure at planning/start is diagnosed or mapped to an already approved creation task; it is not discovered as silently added implementation after the gate.

## Scheduling and publication contract

Policy is `manual|count|interval|either`. Count uses stable successful-delivery ordinals; interval has positive duration and UTC anchor. Existing project is count2/120min. Evaluation is invoked by commands/resume/tick; no invocation means no automated release. Each opportunity is eligible, skipped-no-change, held-not-ready or linked to an owed obligation. Missed intervals summarize their range without manufacturing releases or erasing debt.

Allocate next count threshold when the due obligation is created. Freeze original due policy and immutable candidate coverage. Permit one full release in flight and one pending candidate; capacity limits new admission, never truthful completion/obligation recording. Do not automatically coalesce. Explicit operator-authorized replacement is limited to unstarted pending attempts with recorded superseded IDs, complete scope coverage, ancestry/compatibility evidence and original due times.

Existing Boss adapter must report separately: immutable source dispatch, external correlation/recovery, platform artifact provenance, target-wide serialization, expected-predecessor promotion and site receipt support. Only supported capabilities are runnable. The known publisher branch-version coupling protects version-changing promotion while its release owns that branch; editing/commits/PRs may continue elsewhere. No candidate claims an exact-source CI build from a moving branch or file label. Missing enforcement yields blocked capability plus owning follow-up; it does not authorize Boss code changes.

Publish each ready platform while retaining other previous working links and actual per-platform versions. Full completion needs all four Mac/Windows targets and metadata/site receipts; installed acceptance is separately pending or accepted. Distinct ordinary releases use unique version/artifact identities. Same-version corrective replacement drains/reconciles previous attempts and requires explicit predecessor authority.

## KBD and migration contract

Adapters extend the existing dispatch/child seams with candidate/work-ahead/operation references. KBD alone admits canonical phase transitions and marks tasks complete. Parallel work assignments do not imply parallel active child phases. Cadence child return preserves parent clock/debt; unresolved children block completion. Standalone modes state their owning work references and absence of KBD lifecycle.

Update the release-cadence-governance specification through an explicit OpenSpec MODIFIED delta: configured120min rather than hourly target, accepted recurring publication policy every2 successful deliveries instead of mandatory repeated prompt, manual override remains, child-stage feedback remains, hourly Compass refresh remains separately resource-aware. Documentation-only process delivery uses its own real function; Boss delivery still requires its Mac application build.

Support existing v1 runs through the supported v1→v2 normalization followed by v3 migration; never discard v1 history. Migrate explicitly while old mutators are stopped, under existing lock, after backup. Append migration event, preserve prior events/receipts/command IDs, turn known legacy publication debt into an obligation with known provenance, leave missing jobs/times unknown. Upgrade configured CLI paths and owned installations together. Historical reads may report incomplete old fields; no fabricated work-ahead history, task credit or prior native acceptance.

## Reports and distribution

Report delivered capability, scope/carryover, child contributions, gross/reopened/net task/change/phase dimensions, work-ahead admission/promotion delay, overlapping activity intervals, timing coverage, repeated-build causes, resource wait, obligation age, platform/site/acceptance states and blocked adapter capabilities. Missing timing remains unknown. At least configured minimumSamples of comparable adequate-coverage deliveries precede optimization; fixed duration/publication cadence stays unchanged.

Full authoring payload and mini shared payload have identical checksums. Pack adapters/discovery registries may differ. Existing owned-copy distribution handles all audited supported harnesses, backup/conflict preservation and full-pack precedence. An unavailable native platform or undistributed conflict is reported explicitly and owned; file copies are not runtime evidence.
