# C08 provider quota and endpoint-role boundary — 2026-10-02

Status: public evidence checkpoint only. C08.2 and C08.3 remain incomplete. This document records sanitized facts from immutable evidence; it does not authorize a provider request, replay an uncertain effect, complete a task, publish a release, or approve a C10 workflow substrate.

## Observed candidate boundary

Candidate `db8386e6-17b3-494f-8378-b0c5a3768709` used BossFang `cdc1356bfdc17a39fe66921f89a17beddcc74609`, UAR `c906c24fb8114f1a3b55dc83a12feec542ae8b8d`, and operation helper `ea46dfe72c60dc43a9ee0eb5ae1c957e857a529b`.

- The actual macOS arm64 build passed from `2026-10-02T20:31:42.114Z` through `2026-10-02T20:38:52.002Z`; build receipt SHA-256 is `dd944d9f69ae3cab2145a1791eedfd92ffc937b931e66bf3997b978adb1e059d`.
- The packaged baseline launch passed from `2026-10-02T20:42:36.109Z` through `2026-10-02T20:42:41.143Z`; wrapper receipt SHA-256 is `b4ce1ba83f1121294ab16d43c1e83c9c849f2f528142f302c1e43e508e30fe3a`. It exercised onboarding and provider administration only, without a provider connection or inference.
- The actual feature operation ran from `2026-10-02T20:46:56.678Z` through `2026-10-02T20:48:14.842Z` and blocked at `selectedObserved` with `production_receipt_not_observed:dispatch_completed`. Operation receipt SHA-256 is `4257383f8862847e002430834552a8ff47fca2ef5cc75358b56d798b63aa80f1`.

Retained-state inspection observed a completed scoped-reply action, two completed observer-copy actions, two observer deliveries, one provider echo, and one native callback. The forward action and durable dispatch remained `uncertain`. The callback and provider echo carried the scoped error response; they do not prove successful inference or a completed dispatch. All six mandatory C08 scenarios remained incomplete.

## Exact failure correlation

The sanitized forensic record at `docs/plans/agent-fabric-convergence/.prometheus/cadence/artifacts/c08-selected-dispatch-provider-quota-forensics-db8386e6-287674dc.json`, SHA-256 `8523892c823969dafa875a8ce31550dc89f0cddc4895909b10d8c8b94a3c20c5`, correlates the selected route dispatch to the same journal message, action, and native message identity. The journal terminal was `failed` after one attempt because the upstream OpenAI provider returned HTTP 429 `insufficient_quota` for the configured `c08-liter` / `gpt-5.6-sol` path.

The upstream provider account is supplied through `OPENAI_API_KEY`. `C08_LITER_MASTER` is the working local Liter gateway-auth credential and is not the quota credential. The operator must replenish the account or provide a funded upstream key and explicitly confirm before any provider request or feature replay. Automatic replay of the uncertain dispatch is not authorized.

## Helper-only endpoint-role correction

The same operation independently exposed generated UAR role bases that used the bare runtime origin for capability discovery. UAR `c906c24fb8114f1a3b55dc83a12feec542ae8b8d` defines these roles:

| Role | Generated endpoint contract |
| --- | --- |
| Runtime | `<uar-origin>` |
| Administration | `<uar-origin>/api/uar` |
| Models | `<uar-origin>/v1` |

Authority revision `12b1ec983c28b8f82d2d8fb3b96d4a8075babbf8` is committed and pushed. It changes only `scripts/c08-operation/bootstrap/services.mjs`, with one insertion and one deletion. The frozen 15-file helper snapshot is `c08-operation-source-12b1ec983c`; manifest SHA-256 is `ed8de56b51fb45a7e8a403a5e50b52d71ea771eeb9e2e84919adf858eafb9afa`.

The sanitized provenance record is `docs/plans/agent-fabric-convergence/.prometheus/cadence/artifacts/c08-uar-endpoint-role-repair-plan-provenance-12b1ec983c.json`, SHA-256 `a0ed711ae5327ab1458bacfff4f2be87ed4af6faa5b018f3470be98232d3f8bc`. No product source, credential, or scenario wait changed, so the accepted `db8386e6` product build and baseline launch remain same-source evidence and no native or Mac rebuild is required. They remain bound to the historical helper used at build and operation time; no receipt is rebound to `12b1ec98`.

The fresh preparation index is `docs/plans/agent-fabric-convergence/.prometheus/cadence/artifacts/c08-uar-endpoint-role-repair-contract-preparation.json`, SHA-256 `411004e46c82120898cfe4ba43745751032335b8ef3f85d76d224765f3edc570`. Its ready request is explicitly `applied: false`, and its feature-operation receipt is absent. The new helper contract is prepared, not applied, launched, or operated.

## Independent gates

- **C08 acceptance:** No C08.2 or C08.3 task credit is earned. A fresh actual operation after operator quota correction must pass every mandatory evaluator.
- **Shared UAR design:** Preparation remains independently unblocked under canonical KBD decision revision 482. This runtime blocker does not pause that design work or approve a C10 engine; measured comparison and human architecture selection remain required.
- **Publication:** The current public The Boss release remains `2.2.10`, from source `61bc79e8ec039de31d524d2c8d2883dc7e47cce6`. Its external publication receipt is `docs/plans/agent-fabric-convergence/.prometheus/cadence/artifacts/release-2.2.10-external-publication-receipt.json`, SHA-256 `aed3233734afd66c738ed02d0773b340df5e264212b4d5be94ea211eb78d625d`. Local 2.2.11 candidate builds and launches are not publication evidence.
- **Operator boundary:** No provider request or replay proceeds until the operator supplies or confirms a quota-capable `OPENAI_API_KEY`.

No secrets, message bodies, raw logs, or private working files are copied into this checkpoint.
