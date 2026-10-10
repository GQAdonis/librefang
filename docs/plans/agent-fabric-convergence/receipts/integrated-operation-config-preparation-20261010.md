# Integrated operation config preparation

Prepared only; no package hashing, launch, inference, operation, test or review was run. Parent invokes the following writer only after the selected actual Mac ARM64 build exits successfully:

```text
node /Users/gqadonis/Projects/prometheus/worktrees/agent-fabric-c06/librefang/docs/plans/agent-fabric-convergence/receipts/write-integrated-operation-config-20261010.mjs
```

Observed active candidate at preparation: `02c4dd1a-3344-4b97-9f49-08f7a84bb2ab`, content digest `db0d10a5965863a42d3d98dbfcd3eeffab174bde494396333216d986627fc1da`; frozen Boss `d9bbf5a044b3c39800a212959836677ca3173eea`, UAR `25c542c77f41abcec605dd8ae372b04f68a1801e`, BossFang `4971458c70543b592cc534986737a9d045164547`. The writer reads the then-current active candidate, keeps its application revision as `builtSource.boss`, and records the actual operation checkout as `operatedSource.boss` and the existing adapter's required `candidate.boss` checkout check. A later commit is allowed only when its exact diff paths are under external `scripts/`; it sets `requiresFrozenBuildReconciliation`. It does not mutate Cadence or claim exclusion/application equivalence. Actual output paths come from the existing ready-input entrypoint/buildProducedPaths.

After checking actual app/checkout version 2.2.31 and packaged UAR source, it hashes the actual ASAR, signed bundled UAR and BossFang bytes and writes `.prometheus/cadence/artifacts/integrated-2.2.31-operation-config-20261010.json`. It also writes `receipts/integrated-operation-config-binding-20261010.json` with input/config byte provenance. Both use exclusive creation, preserving any prior binding. No stale 2.2.30 app is hashed as 2.2.31. Config carries existing liter root `http://localhost:4000`, `gpt-6.1-sol/openai`, credential reference `LITER_LLM_MASTER_KEY`, actual model-context declaration and retained composite workflow receipt. No credential value is read or embedded.

Observed readiness blocker reported to parent: `scripts/bossfang-workflow-delegation-operation/provenance.mjs` compares BossFang artifact `source` directly to the source string, but the current manifest stores `{repository,revision}`. The unchanged helper would refuse this actual manifest before launching. Parent owns the external script repair and packaged operation; this writer normalizes the source record only for config preparation and does not bypass the operation helper. It creates no runtime pass claim.

Minimal proposed G patch, after the current build finishes (not applied by this worker):

```diff
   const bossfang = artifacts.tools.find(tool=>tool.name==='bossfang')?.packages[platform]
+  const bossfangSource = typeof bossfang?.source === 'string' ? bossfang.source : bossfang?.source?.revision
   requireFact(/^[0-9a-f]{40}$/.test(options['bossfang-source']) &&
-    pins.sources.bossfang.revision === options['bossfang-source'] && bossfang?.source === options['bossfang-source'],
+    pins.sources.bossfang.revision === options['bossfang-source'] && bossfangSource === options['bossfang-source'],
   'C14W_NEW_NATIVE_SOURCE_RECORD_REQUIRED')
```

Coupled `signed-provenance.mjs` reads `record.sha256`/`record.size` and actual signature/Mach-O identities only; it does not compare or consume `record.source`. No normalization there is required. The returned `bossfangPayload.source` may retain the original structured record; the operation's top-level `sourceRefs.bossfang` already uses the explicit full revision. Leave payload bytes and all signing checks intact.

The [pipeline contract](/Users/gqadonis/Projects/prometheus/worktrees/cadence-nested-source-full/skills/process/delivery-cadence/references/pipeline-contract.md) permits this exact external-driver-only case after a successful frozen build: parent uses `candidate reconcile-frozen` with original candidate, authority/reason, complete actual operation evidence, frozen-build provenance, exact driver path/proof commit, original build/launch checkpoint IDs and actual DMG/ASAR. The builder must exclude `scripts/`, operation-time diff must match, and application bytes must remain unchanged. Later adopted feature receipt names the reconciliation's `operatedSource`/`operationEvidenceSha256` while its `sourceRefs` identify the original frozen app. No rebuild of unchanged package is inferred or performed here; reconciliation must actually satisfy that contract.

Latest operator release scope is Mac ARM64 and Windows x64; Intel Mac and Windows ARM64 remain explicitly deferred. Older four-platform policy/evidence is historical and does not silently enlarge this release. Root owns actual build completion, signing/install provenance, maintained launcher, UI/feature invocation and candidate/operator acceptance.
