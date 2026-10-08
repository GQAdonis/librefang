# C15.3 — reviewed skills and preserved handoff evidence

Recorded 2026-10-08 at the completed Delivery 11 boundary. This records the
desktop skill/host scope selected by the approved customer-priority revision;
it does not certify eight external harnesses or the later KnowMe/Forge hosts.

## Sources and application

- Built application: The Boss `8f8effe327f0db6a845d5efc7bbf23f6c8fa04f8`, version 2.2.18.
- UAR: `b0070b42e7d39d06dca83094cd7868920760cbed`.
- Full source: `a414e81e4310ed9140ef29f4e5a1ee1eaa54fbbd`.
- Mini: `3a8a78c8a993401a67983c97bf9baac1835c1175`, preserving C15 source and latest main `7012649`.
- External operation driver: `bc8e67c2ca31cf6ec83e09747b91f1572a54f6f0`.
  The sole change after the build is excluded `scripts/` content: wait for
  enabled model controls and compare saved revisions, excluding new unsaved
  template UUIDs. It changes no packaged production input.

`pnpm build:mac:arm64` succeeded from 17:01:48 to 17:11:00 UTC. Packaged
launch succeeded from 17:11:33 to 17:11:40 UTC. The DMG integrity/mount and
Developer ID signature checks passed; local notarization is not claimed.
Immutable provenance is `.prometheus/cadence/artifacts/c15-frozen-build-8f8effe327-20261008.json`.
DMG SHA-256: `9c55678da482cc38b6074f442f584f91671074ebad3e430706c09be6d281d902`.
Application archive SHA-256: `6addc03eae812a8c93729821d1b526423a33cbf90befc1fceb54bb056f6f3c96`.

## Operated functionality

Actual packaged operation succeeded from 17:28:08 to 17:31:32 UTC.
Evidence: `.prometheus/cadence/artifacts/c15-0ccadb2a-f135-46ca-9f5b-83a1730d89cd/evidence.json`;
launch/operation receipts and the separately adopted Cadence receipt are in
the same directory. It operated:

- A disposable full generation verified with the established signature and
  signed target-receipt verifier, including refusal of altered signatures.
- Required reviewed mini and full-only skills selected through the visible
  coding-team editor and deployed as one exact private binding.
- Changed and missing non-entrypoint closure bytes refused by actual catalog
  and deployment IPC; restoration retained the prior binding.
- A required tool outside the selected member host scope refused by saved-team
  authoring; persisted revisions and installed bindings remained unchanged.
- Real worker/reviewer inference through the configured gateway, returning the
  disposable repository marker through the existing human filesystem-read
  approval. No source workspace was modified.

The current operation exercises read approval. Previously accepted write,
denial and cancellation authority remains evidenced by
`.prometheus/cadence/artifacts/c14-bossfang-workflow-1817740f-9311-4ddf-be92-2b0ac4c95151/evidence.json`;
it was not rerun or reclassified as new evidence. The optional private-binding
forged-claim preflight was **not exercised** because the maintained launcher
does not supply its trusted native request callback. Its coverage flag remains
false; this receipt does not convert that absence into a pass.

Prior handoff provenance remains accepted from Delivery 10:
`.prometheus/cadence/artifacts/c15-handoff-1d8df9c7-4109-4cb7-ba66-f1edb2c4b2e7/evidence.json`.
That operation preserves source/dirty-state evidence, task/revision references,
Karpathy and scoped-memory references, and stale-input refusal. It was not rerun.

## Delivery and learning limits

No unit, mock-only, per-edit suite or standalone verification build was run.
Only the completed installer build, packaged launch and actual failed feature
operation were operated; the passing build/launch were reused after driver-only
corrections. Frozen-source reconciliation binds their unchanged bytes to the
later successful operation. Earlier failed attempts and the original delivery
clock remain intact. The iteration overran its two-hour target.

The observed delay included a real copied-payload lockfile omission and two
operation-driver defects. Record these separately from product defects: waiting
for an enabled selector and comparing durable records avoids an unnecessary
application rebuild. No velocity improvement is inferred from this one sample.

All four complete native UAR archives are published with checksums in
`.prometheus/cadence/artifacts/c15-uar-complete-payloads-b0070b42-20261008.json`.
The Boss installer publication, site updates and native Windows installed
acceptance are separate outcomes and remain pending at this receipt.
C15.1 model-policy evidence and C15.2 broad harness qualification remain open.
