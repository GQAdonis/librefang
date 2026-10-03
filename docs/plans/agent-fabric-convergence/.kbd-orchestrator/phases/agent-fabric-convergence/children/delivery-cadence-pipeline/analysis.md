# Analysis: bounded Delivery Cadence pipeline

2026-09-30 · Agent Fabric Convergence · Analysis proposal for operator feedback. No production implementation or policy activation.

## Recommendation

Extend the existing Node .mjs engine and its shared full/mini payload. Retain one active delivery and one KBD owner; permit one durably authorized future scope in isolated worktrees while the frozen delivery builds. Track native platform builds and serialized publication separately. Do not adopt a workflow service, start a daemon, or create multiple active KBD phase owners.

This removes a demonstrated admission/locking bottleneck. It does not prove a speedup: the assessment found only 36% timing coverage for the latest delivery and multiple genuine product/operation repairs. Compare at least three comparable recorded deliveries after implementation; no percentage gain is promised.

Sources: [assessment](assessment.md), [source audit](research/source-audit.md), [operation design](research/operation-design.md), [primary-source landscape](research/landscape.md), and [library evaluation](research/library-evaluation.md). The assessment's nine-source research is reused rather than repeated.

## 1. Ownership and bounded concurrency

| Responsibility | Owns | Must not do |
|---|---|---|
| KBD/implementation lead | Approved scope, active phase/child, completion references, one future scope | Give an informal assignment authority to cross an unapproved phase or declare canonical completion |
| Implementation roles | Independent runtime/UI/localization/packaging changes within that scope | Edit frozen source or share writable build output with its running operation |
| Local build/operation owner | Candidate-bound build, launch and new-feature operation | Hold the metadata lock while compiling or count launch alone as feature success |
| Platform-build owner | Candidate/platform attempts and external workflow identities | Treat dispatch as completion or rebuild a moving branch |
| Publication owner | One public release at a time, artifact/metadata/site receipts | Clear unrelated debt or regress advertised platform links |

Initial proposed limits: one active delivery, one future implementation scope (up to the existing three implementers), one local heavy build writer, one full release in flight, one pending full-release candidate. These are conservative bounds for approval, not empirically optimal constants. Existing native CI jobs may run on separate runners; no machine-wide resource scheduler is added.

Backpressure stops admission of additional scopes, not recording of real completion or receipts. Work already authorized may finish; any extra obligation is recorded even if capacity is exhausted. Recovery or required repair gets the contested resource first. Independent editing can continue; dependent promotion waits. Human review, hard budgets, explicit stops and architecture approval remain authoritative.

## 2. Work-ahead and the two-hour clock

Admit future work only after the current production scope is complete and its candidate frozen. Store approval reference, canonical parent/change/task IDs, owner, outcome, file/repository ownership, actual base commits, worktree/output paths and dependency classification. Unknown dependency is not independence. The lead supplies worktrees; Cadence records their ownership and checks declared resource collisions rather than becoming a worktree manager.

There is no second active iteration. Future work has admittedAt, firstWorkAt, activity intervals, state and prerequisite references. Promotion requires the predecessor local delivery to succeed, required hooks/review to be resolved, canonical scope eligibility, and reconciliation of any repaired base. Promotion starts the next iteration with its original firstWorkAt and copies references to its activity history without counting work twice. Report promotion delay separately; never reset the clock to hide it.

A failed local build/operation blocks dependent promotion and publication of that candidate. It does not grant permission to continue modifying failed prerequisites elsewhere. Stop assignments touching its repair surface; give repair priority while disjoint work proceeds within the admitted scope. If a child is needed, the sole KBD owner enters it through existing gates; work-ahead never opens a competing child. Child time stays with its owning delivery. A between-delivery child is recorded as phase work, not attached to an invented iteration.

Preserve the 120-minute target. Propose a configurable 30-minute build reserve and a visible scope-admission cutoff at minute 90; these would take effect only through the approved implementation profile. At minute 120 show overrun and stop adding scope; at minute 150 require a recorded repair/re-scope decision referencing existing authority. No timer certifies incomplete work or adds a test gate. Hard budgets still take precedence.

## 3. State, freeze and long operations

Use an additive state v3. Retain historical iterations, receipts, command identities and hooks. New records are candidate, workAhead, job, publicationObligation and releaseAttempt; their identities stay distinct from canonical task/change/phase IDs.

A candidate identifies its delivery, content manifest and digest, logical repository IDs with commits/submodule/runtime-asset fingerprints, build recipe/configuration/platform identity, actual execution checkouts, output roots and required operation procedure. Clean committed release inputs are preferred. Existing dirty input snapshots require explicit preserved byte-level provenance; HEAD equality is insufficient. Paths locate execution but do not alone define content equivalence. Preserve path-bound v2 evidence without silently reinterpreting it.

Freeze the actual build checkout, not merely a fingerprint. Future edits use separate worktrees and separate writable target/dist paths. If source isolation cannot be established, overlap is limited to other demonstrably independent repositories. Candidate inputs include packaged skills, provider catalogs and runtime binaries; bookkeeping exclusions must be explicit and application-unrelated.

Every long operation follows claim → execute → reconcile:

1. Lock briefly; reload persisted state; validate command signature/authority; claim an attempt and resource ownership; append; unlock.
2. Run the frozen command outside that lock, using argument arrays and shell:false. A live harness/CLI owns the process; no detached permanent service.
3. Persist process identity and immutable result evidence under its job directory. Lock briefly again; reload current state; match candidate, attempt and ownership token; append result and release confirmed resources. Never write back the stale state object captured before execution.

Separate a metadata mutex from durable resource reservations. Resource keys include host plus canonicalized output/target or publication target. Reservations for a shared physical output must live in a shared host/user registry keyed by canonical resource identity, not only inside an individual run directory; claims use atomic creation and ownership tokens. Different run roots do not imply different build resources. This is a filesystem reservation mechanism, not a daemon. Unknown ownership cannot be stolen by elapsed time. Cancellation is intent until the owned process tree is confirmed stopped. Preserve current Unix process-group and Windows taskkill-tree handling. Reused PID, missing launch acknowledgement or remote-owner uncertainty requires reconciliation; no automatic destructive PID guessing. An interrupted spawn can be unknown even when no PID record exists.

Hooks retain event/handler/registration-revision identities. Claim an effect before executing outside the lock; reconcile its result after reloading. Known success is not resent; unknown non-idempotent effects require reconciliation. Optional learning-recorder calls also leave the metadata lock and cannot become a new global blocker. No exactly-once email claim.

## 4. Adopt successful external receipts

Add an explicit checkpoint adoption route. Require candidate/attempt/receipt IDs, frozen source and command contracts, actual ordered timestamps and exit status, platform/architecture, log/result provenance, and rehashed artifact bytes. An equivalent command requires a previously approved equivalence declaration. Launch and feature-operation evidence must identify the same candidate/artifact and actual new-function procedure.

Adoption appends evidence; it does not invent a new process run or rewrite the original. Same receipt ID/digest is idempotent; changed bytes under the same ID are a conflict. Missing provenance stays unknown. A DMG filename or success statement alone cannot qualify. This closes the observed repeat-build-for-wrapper-receipt gap without weakening the gate.

## 5. Meaningful opportunities and publication debt

Choose three supported trigger policies in the shared skill: successful-delivery count, elapsed UTC interval, and either trigger; manual remains available. Defer arbitrary cron expressions, local-time/DST calendars and a new scheduler. This project stays on every two successful deliveries. Optional interval mode has an explicit UTC anchor and positive interval; elapsed opportunities have stable ordinal IDs.

Opportunity evaluation runs at normal Cadence transitions/resume and through an explicit tick command invoked by the owning session or existing CI. If nobody invokes it, no background release happens. Status shows the next opportunity and missed/overdue opportunities. Reconcile missed intervals as a bounded summarized range, not a burst of redundant builds. No unrequested automation is created.

Each opportunity returns an inspectable disposition:

- **eligible:** completed named capability or user-impacting correction, changed release inputs since the relevant public baseline, applicable local build/launch/feature evidence, and an operator-readable change note;
- **skipped-no-change:** nothing meaningful and eligible, no new delivery credit; existing obligations remain;
- **held-not-ready:** meaningful scope exists but is incomplete or failed; never release it;
- **owed/queued/running/partial/failed/unknown/complete:** actual publication obligation and outstanding evidence.

Meaningfulness is an evidenced declaration under the approved scope, not inferred from task counts, diff size, commit prefixes or an LLM score. Packaged skill fixes can qualify. A repeated build, receipt edit or empty version bump alone cannot count as a new successful delivery.

Count-based obligations bind to their due delivery ordinal and frozen policy. Advance the next due threshold when creating the obligation, not when a publication later completes. Receipt A resolves only A, never the latest successful count or another obligation. Configuration changes do not erase debt or move already-owed deadlines. Required hooks remain visible separately and cannot rewrite build outcomes.

Initial policy is no automatic supersession/coalescing. An unstarted candidate can be explicitly replaced only through operator-authorized reconciliation that records included scope, source ancestry/compatibility, covered obligations and unchanged original due dates. Running jobs are never silently retargeted. This trades some extra full builds for a bounded, auditable first implementation; automatic latest-ready coalescing is deferred.

## 6. Native builds and website publication

Reuse the existing Boss workflow, native manifests and distribution. Each required platform has candidate-bound attempts with external repository/workflow/run/job identifiers, immutable input records, execution state and artifact receipts. Persist dispatch intent and stable correlation before invoking CI. If acknowledgement is lost, query that identity and reconcile; never dispatch a duplicate merely because the CLI timed out. A native build failure retries only that platform after its observed repair; passing artifacts are reused only where source, recipe, dependencies and signing requirements match.

Preserve the operator's earlier instruction to publish each resolved platform promptly. Choose incremental per-platform website updates while retaining the previous valid artifact for pending platforms and showing the actual per-platform version. Compare against atomic publication: atomic is simpler visually but would again hold customer-ready Windows x64/Apple Silicon behind slower platforms, contrary to that instruction. The full obligation still requires all four Mac/Windows artifacts, metadata commits and live website receipts; installed acceptance remains separate.

The existing workflow already serializes publication events, but its default pending-event behavior is not a durable queue. Reconcile outstanding immutable platform manifests/receipts independently of callback counts, and re-drive only missing publication effects with stable IDs. One full release owns the publication target until all its jobs/effects are terminal or explicitly reconciled. New ordinary release candidates use distinct release versions and immutable artifact identities. Same-version corrective replacement requires explicit predecessor/artifact reconciliation and drained prior attempts; it is not ordinary automatic promotion. Reject stale ordinary promotion against an expected per-platform publication predecessor; an explicit rollback is a different authorized action.

An additional observed integration constraint: the existing coordinator resets its runner checkout to RELEASE_BRANCH and requires that branch's package version to match the release. Protect version-changing promotion on that branch until its in-flight release completes; continue development, commits and PRs in independent worktrees. No need to stop editing while builds run. A future publisher decoupling from moving branch metadata would be a separate product-repository change, not smuggled into this skill repair.

A Cadence-local reservation cannot serialize unrelated external publishers by itself. The consumer adapter must identify its actual target-wide serialization mechanism and provide operation/result correlation. For Boss, reuse its existing CI group, verify the expected metadata base at promotion, and keep the platform/site operation outstanding until the remote effect is observed. If that consumer cannot enforce the required contract, report a blocked publication capability; do not claim a local lock solves remote races. No Boss production code is changed by this analysis or implicitly authorized for this child.

## 7. Full/mini distribution and migration

Use the audited linked full 1.1.2 payload as the starting candidate, then reconcile changes since that audit before implementation. Preserve dirty original full/mini files and later fixes; do not copy the older 1.1.0 payload over newer work. Full is the authoring source, mini receives identical checksummed shared files; adapters remain pack-specific. Use existing ownership-digest copying, recoverable backups and all supported harness distribution rather than new installers.

Migration is explicit under the old run lock after live old-version mutators stop. Back up event journal and snapshot, append a v3 event, retain previous events/receipts/IDs. Known unresolved publication becomes a legacy obligation with its original threshold and known sources; do not infer missing jobs or completed effects. Attach existing workflow IDs only through actual reconciliation. No completed parent iteration is reopened for this child.

Audited v1.1.2 writers refuse schemaVersion other than 2, so v3 makes those writers refuse mutations. Their read-only reports can be incomplete; new tooling must label unsupported readers. This does not guarantee arbitrary foreign writers are excluded. Update configured CLI/adapter paths and shared-payload inventories at cutover; preserve user-authored installations.

## 8. Reuse and build boundary

[Library candidates](library-candidates.json) is the schema-bound decision register. Reuse existing state persistence, process cancellation, hooks, copier and Boss workflow; reference queue/locking libraries for contracts, but avoid a dependency that only duplicates part of the existing engine or requires another service. The product-specific candidate, authority, obligation and provenance semantics still need implementation.

Plan should form one bounded shared-engine change with disjoint ownership for operation/state, scheduling/publication/reporting, and adapters/distribution/docs. One integrator owns final shared contracts. Keep reviewers/verifiers dormant until all production wiring is complete. At the single final boundary, operate the actual CLI through simultaneous frozen build and independent work, failure/recovery, receipt adoption, due/skipped opportunities, partial publication, old-candidate completion, migration and matching full/mini copies. Use actual native platforms where available; report unavailable Windows execution pending. No unit/per-edit/partial-function suites or application build is part of this analysis.

## Decision status and remaining limits

These are recommended architecture decisions for operator feedback, not executed configuration. Plan must concretize field schemas, command requests, consumer adapter conformance and exact file ownership. Default bound values and the proposed 90/120/150-minute signals require plan approval. Existing installed acceptance is never inferred from publication.

Research is bounded to the Analyze skill's tier budget. No new dependency install, production edit, application build, test suite, release dispatch or website update occurred. Artifact review and local state inspection are the only validation in this stage.

## Completed artifact review

One packet-only native GPT-5.6-sol review returned PASS with no findings across six recorded failure classes; see [findings](review/analyze/findings.json) and [limitations](review/analyze/dispositions.md). Exact producer identity was unavailable, so cross-model identity is unverified. Strict sycophancy screening raised only a low-severity length observation. The five-candidate JSON passed the existing formal schema using the installed validator; no dependency was installed. These are artifact checks, not runtime evidence.
