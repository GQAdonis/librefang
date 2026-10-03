# Assessment learning — 2026-09-30

This is an observation record, not task/change/phase completion credit.

## Delta
The requested publication-admission fix is necessary but insufficient: a long-held global lock and one active iteration also prevent durable work-ahead during local builds. Full/mini/installed copies are divergent. The current report cannot attribute most of iteration 5.

## Root causes supported by source
The engine combines state mutation, long subprocess execution and latest-delivery publication accounting in one serialized lifecycle. Successful external builds lack an adoption seam; a recorded build was repeated for Cadence evidence alone. Product repairs and operation-driver repairs also contributed; cadence is not the sole cause.

## Corrective direction for analysis
Use immutable candidate-bound evidence, short locked transactions around owned long operations, bounded independent assignments, explicit publication obligations and safe receipt adoption. Reconcile source versions before distributing to both packs. Keep unknown timing unknown; separate implementation progress from build and publication lead time.

## Falsifiers and next observation
If independent implementation is already occurring throughout build waits, measure how much the state-lock repair actually helps rather than crediting the entire wait as saved. If pipeline overlap raises repair rework, resource contention or publication age enough to offset local lead-time gains, lower admitted work in progress. Compare at least three comparable fully recorded deliveries after implementation.

## Boundaries
No skill implementation, application build, production test suite, publication, or acceptance performed by this assessment. KBD stage completion, when earned, is distinct from phase completion.

## Analyze learning — 2026-09-30

The pending-publication guard is not the only serial dependency: the existing publisher requires the release branch application version to remain compatible. Isolating source permits continued development, but promotion needs an explicit contract. A queue library would not resolve this. Candidate-bound receipts can eliminate administrative rebuilds; the observed timing record still cannot establish a general speedup. This is a stage observation, not a task/change/phase completion credit.

## Observed planning loss at another consumer

Obsidian 07a demonstrates why admission policy alone is insufficient: an approved change split dropped the operation assignment while keeping one-change/one-delivery semantics. The lead correctly surfaced the mismatch before starting increment 7. Cadence should preserve that escalation and catch the missing mapping earlier, not silently create a new task or count fixture-backed evidence as real-service operation. See obsidian-07a-gap.md and its snapshot digest record.
