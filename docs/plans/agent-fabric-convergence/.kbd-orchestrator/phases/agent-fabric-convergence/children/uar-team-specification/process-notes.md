# Process notes

Assessment before-hook was not invoked before source collection. No configured hooks exist in this initiative, so no hook action was omitted; this timing deviation is recorded rather than backdated. Assessment and analysis source findings are reviewed once with the completed proposal as the operator requested. No per-stage review loop.

Analyze/spec/plan before-hooks were invoked while reconciling authored draft artifacts rather than before first drafting. These stages are now canonically recorded in order; no configured hook commands existed. This is process timing debt, not evidence of runtime verification. Raw external source snapshots remain local research material and are excluded from publication; publish source URLs/hashes and bounded original analysis instead.

Execution instruction reconciliation: the operator-approved plan calls for one bounded proposal review and one completed-document validation. The generic kbd-execute repeat-review requirement is superseded by that explicit boundary; existing independent review receipt retained. Documentation-only OpenSpec skip_specs is used in this independent initiative; no deployed capability delta or runtime generation is introduced.

## Final document gate and canonical synchronization

The complete artifact gate passed (see document-validation.json). Initial validator failures concerned generated A2A definition names and reference resolver aliases; no document changes were needed. Only that failed gate was rerun. No application tests or builds ran.

Inspection found that kbd-apply mark-done updates only the OpenSpec mirror, whereas end-task performs the canonical transition and after hooks. Reconciled tasks 1.1–1.4 with end-task; no generated projections were hand-edited.

Publication tooling note: UAR pre-commit ran its existing GitHub Actions policy validator and pnpm automatically refreshed the worktree lockfile. The policy check passed; its duplicate invocation was excluded on commit-message retry. The auto-generated lockfile change was reverted to the previously clean baseline. Commitlint required wrapped body lines. No dependency change was committed, no application test/build ran, and no workflow code was changed.
