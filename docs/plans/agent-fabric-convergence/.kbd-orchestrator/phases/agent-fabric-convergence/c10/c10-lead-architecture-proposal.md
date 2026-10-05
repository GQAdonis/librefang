# C10 lead architecture proposal

Status: proposed architecture for operator review, not implementation admission, engine selection, runtime evidence or canonical task completion. Prepared independently of The Boss installer under KBD decision `shared-uar-design-independent-of-boss-packaging`.

Evidence: [current source map](c10-existing-kernel-substrate-proposal.md) at UAR `c906c24fb8114f1a3b55dc83a12feec542ae8b8d`. That map distinguishes inspected contracts from unmeasured performance. This proposal supplies design judgment; it does not turn those observations into conformance claims.

## Recommendation

Use UAR's existing durable team execution as the proposed substrate for the first bounded workflow release. Add a versioned workflow plan, durable step-to-task/attempt/artifact links, and an operator decision record. Progress through the existing catalog CAS, admission, settlement and recovery paths. There is one execution authority and one model loop.

The first consumable increment is feedback classification, a structured issue draft and an operator decision in The Boss. No connector write follows merely because the draft was accepted. Subsequent C10 increments add governed connector intents and reconciliation; the original full C10 scope and recommendation coverage remain required. This is delivery decomposition, not removal of issue creation or other connectors.

Compare external engines against the same ownership, offline, recovery and effect contracts, but do not introduce one to solve an unobserved capacity problem. The approved C10 comparison/selection checkpoint remains required. A proposed change to its measurement procedure must be approved: evaluate existing source and prior production evidence now, then measure the completed bounded workflow at its delivery boundary. Do not create a partial-code benchmark gate.

## Fixed boundaries versus proposed defaults

Existing approved boundaries are not new questions: UAR owns its execution; The Boss controls it through the trusted administration boundary; portable definitions contain no credentials or private grants; issue creation does not authorize implementation; unresolved effects do not authorize blind retry; installer publication is not architecture authority.

Proposed defaults for review:

- Bind the workflow to an explicitly selected team and its immutable installed bindings. Resolve classify/draft roles and models at activation; persist those identities. Do not silently use whichever provider is globally current after restart.
- Compile a closed mapping vocabulary and pin the interpreter version and source digests. Feedback is data. Workflow instructions come from the trusted compiled definition; task input does not confer instruction authority.
- Restrict classify/draft execution to the declared context and tool set. `effect: none` must be enforced by runtime policy, including dynamic tool/skill expansion, rather than by prompt wording.
- Link each step to its original admitted attempt and validated immutable artifact. A replay returns the recorded result; it does not start another model turn.
- Permit advancement after authoritative success and committed output while preserving unresolved accounting reservations. Subsequent admission still obeys the aggregate budget; advancement never settles unknown usage.
- Persist operator waits without an automatic expiry. Accept/reject/cancel bind an exact artifact ID, canonical digest and expected revision, with current operator authority. A model cannot resolve this wait.
- Acceptance records the decision only. Rejection ends this bounded run. Revision starts a separately identified activation linked to the prior decision and charged against the declared activation/budget limits.
- Cancellation first records intent and prevents dependent admission. It becomes terminal only when the original producer/effect state permits that conclusion; a live or uncertain attempt remains visibly unresolved.
- Support only qualified persistent storage profiles for restart guarantees. In-memory operation must not advertise durable workflow recovery. Shared remote SurrealDB uses the existing explicit deployment durability contract.

## Proposed observable targets

These are reviewable acceptance targets, not measured claims or automatic configuration changes: retain the existing four active team-execution permits; demonstrate two isolated workflow teams; recover a persisted operator wait within 30 seconds of a ready runtime; and complete local workflow status/decision commands within two seconds under that bounded workload. Measure actual results only after the complete increment is built and operated. Broader capacity targets and external-engine load comparison remain explicit later design work if required by the selected deployment.

## Remaining approval and implementation work

Approve or modify the substrate/comparison procedure, interpreter vocabulary, defaults and bounded targets before C10 implementation. Then establish repository-scoped task/file ownership and typed contracts for the compiler, catalog persistence, runtime transitions, administration API, Boss IPC/UI, locale strings and packaged assets. Reuse existing kernel services; do not create a separate workflow database, scheduler daemon or model executor.

C08 qualification still runs independently. No C10 code, service, build, test, engine dependency, approved specification or canonical progress record changed while producing this proposal.
