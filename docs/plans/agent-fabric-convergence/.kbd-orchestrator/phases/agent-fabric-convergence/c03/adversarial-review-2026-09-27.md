# C03 bounded adversarial review

Date: 2026-09-27

Change: `afc-c03-lossless-definitions-and-collaboration-document-profile`

Verdict: **BLOCK — C03 completion is not supported by the reviewed implementation and evidence**

## Scope and evidence boundary

This review covered the C03 UAR branch through `f0dac3eeca0c5310f866173e8bac60b0b1219b7d`, mini branch through `ba3bbc862305b9e5abd9946af69d371db5dcb6c4`, full-pack branch through `f73e53216a87630e9c4aef5e8a0ea6238708a309`, the three byte-identical final-gate receipts, and the Windows installed-operator receipt. The final-gate receipt SHA-256 was independently inspected as `319ea6264860ab34fcf68c8dbd8d43ae943293b4313ffdc00dd1d2d2a409809c` at all three paths. No tests or builds were run during this review.

The project-routed `adversarial-review` skill was absent from the available skill catalog, so this pass applied the project constitution and the accepted C03 contracts directly. The review did not edit product code, OpenSpec tasks, generated KBD waypoint/progress state, or product worktrees.

## Findings and dispositions

### C03-AR-01 — P1 — Required v2 semantics are reported as enforced without runtime enforcement

UAR `src/uar/compiler/collaboration/bindings.rs` treats `modelRequirements` as supported whenever any model binding is present and unconditionally treats `promptDialect` and `contextStrategy` as supported. It emits `exact` with reason `runtime.enforced` and the message that each field is bound to an enforcing runtime component.

The bound-run adapter in `src/uar/runtime/turn/request.rs` applies provider/model identifiers, fallback identifiers, resolved skill IDs, and skill configuration. Repository-wide source inspection found no runtime consumer of the effective `promptDialect` or `contextStrategy` values. Model resolution matches only a preferred alias and does not compare the selected provider/model capabilities with the requested `modelRequirements` capabilities. The final receipt reproduces all three fields as `exact` and records a successful run, but that run proves provider selection and inference, not enforcement of these required semantics.

Disposition: **blocking**. Either connect each field to a real enforcing runtime component and make the final gate observe its effect/refusal, or classify the field `required-unsupported`/`optional-unsupported` according to its authored requirement. The existing receipt cannot support C03's lossless-effective-binding claim.

### C03-AR-02 — P1 — Next-version maintenance rewrites unchanged definitions and permits downgrade versions

Mini/full `runtime/src/uar-package/workspace.mts::reviseWorkspace` rejects only equality with the base version. It does not require greater semantic-version precedence, so a lower unused version is accepted. It also assigns the new package version to every AgentDefinition, TeamDefinition, and WorkflowDefinition and rewrites all matching references, whether or not a definition changed.

The final receipt exposes the consequence: after changing only the root team's purpose, its `diff.changed` array contains all seven definitions. Unchanged agents, the nested team, and both workflows changed only because their versions/digests and dependent references were rewritten. This contradicts the accepted requirement that unchanged definitions retain existing exact references and changed definitions receive explicit new versions.

Disposition: **blocking**. Require a strictly greater package version, preserve unchanged definition identity/version/digest tuples, and revise only explicitly changed definitions plus references whose dependency tuple actually changed. Repeat the completed-path gate with assertions that unchanged definitions remain byte-identical and a lower version is refused.

### C03-AR-03 — P1 — The authoring workspace has no mutation revision or expected-revision comparison

The accepted design requires a revision for every workspace mutation and expected-revision comparison before writes. The shipped `uar-workspace.schema.json` and `UarWorkspaceIndex` do not contain a revision. `uar-workspace-update` and revision creation accept no `expectedRevision`; a transient lock serializes local writers but cannot detect a stale editor after the lock is released.

Disposition: **blocking**. Persist a monotonic workspace revision, require the caller's expected revision for mutating operations, and record before/after revision in the recovery receipt. Add a stale-update refusal to the one final gate.

### C03-AR-04 — P1 — The validated product bytes and acceptance receipts are not anchored to the reviewed product commits

At review time the UAR, mini, and full-pack worktrees contained uncommitted final receipt/task changes. Mini and full pack additionally contained uncommitted generated `scripts/*.mjs`, generated distribution payloads, and new generated modules/schema trees. The passed gate exercised those dirty packaged payloads. The canonical receipt records payload-tree digests but does not record the mini and full repository commit identities or a dirty-tree provenance record.

Consequently, checking out mini `ba3bbc862305b9e5abd9946af69d371db5dcb6c4` or full pack `f73e53216a87630e9c4aef5e8a0ea6238708a309` does not yield the exact packaged bytes that passed. The receipt is byte-identical across its three current working-tree copies, but none of those copies is yet part of the reviewed product commits.

Disposition: **blocking for completion/release provenance**. Commit the generated payloads, task dispositions, and receipts in their owning product branches without regenerating them; bind the receipt to the resulting mini/full commit IDs or add an immutable commit-to-payload digest receipt. A later review may verify those commits without rerunning the already-passed gate if the committed bytes match the recorded tree and receipt digests exactly.

### C03-AR-05 — P2 — Frozen-checkpoint metadata still names a superseded UAR checkpoint

The mini `final-gate-manifest.json` and committed full-pack task text name `fba2b34a6449c501b0ad9de29936eb63f5726843` as the expected frozen executable checkpoint. The runner, actual final receipt, and uncommitted task corrections use `7a02a249396fd77f297cdb3f9672c4ca35341a63`. The latter contains the release-build type fix and is the executable checkpoint actually exercised.

Disposition: **required provenance correction**. Update committed planning/delegation metadata to `7a02a249396fd77f297cdb3f9672c4ca35341a63` and retain `fba2b34...` only as historical ancestry where useful. Do not describe `fba2b34...` as the tested frozen head.

## Accepted boundaries

- No authority leakage was observed in the reviewed portable package/export evidence. The creator and UAR both reject private document kinds, reserved private-authority fields, and recognized credential material; the live receipt keeps RepresentationGrant and binding records in private state and exports a sanitized non-executable template.
- No false team-execution claim was observed. The final receipt explicitly records `creatorTeamPackageExecuted: false`, `durableTeamInstance: unsupported`, and identifies the successful run as a separate single-Agent fixture. Mini/full guidance also says package installation does not activate or execute a team.
- The Windows operator receipt is correctly bounded to installed presence, launch, and effective port 1906. It explicitly leaves broader workflows unobserved and sets `c03Complete: false`; it is not Windows C03 conformance evidence.
- The three final-gate receipt files were byte-identical at review time. This proves receipt-copy parity only; it does not cure the commit anchoring issue in C03-AR-04.

## Completion disposition

C03 must remain incomplete until C03-AR-01 through C03-AR-04 are resolved and C03-AR-05 is corrected. The already-observed gate pass remains valid evidence for the exact dirty payload bytes and runtime executable it names, but its successful inference and self-reported diagnostics do not prove the missing enforcement, immutable-maintenance, or workspace-CAS requirements.
