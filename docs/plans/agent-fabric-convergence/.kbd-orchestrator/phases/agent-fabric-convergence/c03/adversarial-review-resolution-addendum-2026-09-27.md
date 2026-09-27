# C03 adversarial-review resolution addendum

Date: 2026-09-27

Change: `afc-c03-lossless-definitions-and-collaboration-document-profile`

Verdict: **PASS — all five prior findings are resolved**

## Bounded evidence

This follow-up reviewed only the five findings from `adversarial-review-2026-09-27.md` and the specifically requested authoring details. It inspected UAR checkpoint `6f59672f31e9ad971d198a2d7fb5fe6875b8dfb6`, mini product-byte commit `ad95a27b1e30388769a60f893a717a54da65f05b`, full-pack product-byte commit `7baaa8141ffd8ca2a22b56eff542617d1763cd8b`, and the subsequent evidence commits UAR `b36d4c0857c86f069bac83bb24f18c92d34102e6`, mini `dcc7a99f4aa0d0888a16aecb4bf8422e4f4385ae`, and full pack `53254a309c34e772a210f61d2fb8cecda91f1f83`. No tests, builds, or gates were run during this review.

Each evidence commit contains its repository's final-gate receipt. The three committed copies are byte-identical at SHA-256 `7fe86e8a1ead830416b0d85c13876d31fe5fbaa97fc8d27d75ccd470bf16a415` and bind the exact executable and product-byte commits above. The operator reports that `kbd-apply verify` returned PASS in all three repositories after these evidence commits. The receipt remains Darwin evidence and does not expand the accepted Windows claim.

## Prior-finding dispositions

### C03-AR-01 — resolved

UAR now resolves required model capabilities against the configured provider registry, refuses unsupported requirements, binds the accepted context strategy into run policy, selects the canonical `uar.prompt/plain-v1` dialect, and checks that dialect against the model actually used for the run. The receipt records distinct runtime enforcement reasons and effective values for `modelRequirements`, `promptDialect`, and `contextStrategy`. This resolves the prior self-report/runtime mismatch.

### C03-AR-02 — resolved

Mini and full-pack maintenance now require a strictly greater package version, accept explicit definition edits, preserve raw bytes for unchanged definitions, and propagate new references only when the referenced definition changes. The receipt demonstrates a root-team-only revision, lists the other definitions as unchanged, and records refusal of a downgrade version.

### C03-AR-03 — resolved

The durable workspace schema now persists a monotonic revision and question state. Mutations require `expectedRevision`, stale mutation is refused without changing the workspace, and successful question/document/revision mutations advance the revision. Workspace paths are derived as `.agent-team/<team-id>/authoring`; the caller does not supply an arbitrary workspace root. The receipt shows question recovery across reopen, before/after revisions, stale-write refusal, and distinct team-scoped paths.

### C03-AR-04 — resolved

The mini and full packaged product bytes remain anchored at the exact product-byte commits above. UAR evidence commit `b36d4c0857c86f069bac83bb24f18c92d34102e6`, mini evidence commit `dcc7a99f4aa0d0888a16aecb4bf8422e4f4385ae`, and full-pack evidence commit `53254a309c34e772a210f61d2fb8cecda91f1f83` now commit the acceptance receipt and related completion evidence. Direct commit inspection found the same receipt digest in all three evidence commits. This resolves the original dirty-payload and uncommitted-acceptance-record ambiguity without changing the receipt's product-byte bindings.

### C03-AR-05 — resolved

The committed mini and full checkpoint metadata and the final receipt now identify `6f59672f31e9ad971d198a2d7fb5fe6875b8dfb6` as the final executable UAR checkpoint. The superseded checkpoint mismatch is removed.

## Boundary recheck

The reviewed evidence still makes no creator-team execution or durable-team claim: `creatorTeamPackageExecuted` is false and the successful run is identified as a separate single-Agent fixture. No new portable authority leak was observed in the blocker-resolution surface. The Windows receipt remains limited to installed presence, launch, and effective port 1906, with no Windows C03 conformance claim.

## Completion disposition

C03 receives PASS in this bounded addendum. All five prior findings are resolved, the acceptance receipt is durably published in all three owning repositories, and the accepted authority, execution-claim, and Windows evidence boundaries remain intact.
