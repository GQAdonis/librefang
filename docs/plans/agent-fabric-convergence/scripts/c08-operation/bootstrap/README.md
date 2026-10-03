# Disposable C08 service bootstrap

This prepares and runs the real production path after the combined source freeze and native builds. Preparation is file generation only. No product gate or service operation was run while writing these files.

Copy `input.example.json` into the private operation directory and replace executable/build-record paths with the actual newly built payloads. Each native build record must contain the exact `sourceRevision` and the executable's actual `binarySha256`; retain its target, features, toolchain and command alongside those fields. The launcher checks the current source checkout, record, and executable bytes before creating any container. Do not populate these records from a previous executable. UAR's authoritative producer uses `server-full` with default features disabled and nightly-2026-07-18; this is distinct from the Boss generic native recipe.

The shared external UAR executable is the existing `universal-agent-runtime` primary server, built from that same source/profile. `uar-sidecar` is appropriate for a supervised host launch-token connection; its outer guard accepts only the 64-hex launch bearer and strips `Authorization`, so it cannot host this realm-JWT owner contract. Do not substitute it in this bootstrap or disable its guard.

The sample paths name future native payloads; they are prerequisites, not claims that binaries exist. The optional `ui.process` is a Node launch specification with `provenance: "node-script"`, absolute Node `command`, launcher `scriptPath` equal to argv `args[0]`, the launcher checkout `sourceRepository`/`sourceRevision`, and `sourceMetadataFile`. The record separates Node `commandSha256`, launcher `scriptPath`/`scriptSha256`/`sourceRevision`, and packaged Boss `applicationExecutable`/`applicationSha256`/`applicationSourceRepository`/`applicationSourceRevision`; Node is never claimed to derive from Boss source. The launcher argv must include the actual `--repository`, packaged `--app`, `--scenario` and `--require-scenario`; the generator supplies `--receipt` using its private path. The measured application executable must equal `--app/Contents/MacOS/The Boss`. The sample includes this optional UI phase; remove `ui` only when intentionally running a service-only receipt, which does not constitute packaged-app acceptance. Optional environment values and credential refs stay explicit. Its app-owned scenario hook must point at `scripts/c08-operation/boss-ui-scenario.mjs`. The generator supplies private `C08_BOSS_UI_CONFIG` and receipt references and the actual expected UAR identity. The UI creates its own disposable workspace through the existing preload API; the plan provisions that returned scope through authenticated UAR APIs.

After filling input, prepare a fresh directory:

```text
node scripts/c08-operation/bootstrap/generate.mjs --input /private/tmp/c08-input.json --out /private/tmp/c08-disposable-operation
```

After the source/build boundary, run:

```text
node scripts/c08-operation/bootstrap/run.mjs --private /private/tmp/c08-disposable-operation --receipt /private/tmp/c08-disposable-operation/routing-receipt.json
```

The credential named by `model.credentialEnv` must already exist in the launcher environment. Its value is never displayed. The input records one explicitly selected provider/model and its provider-reported `contextWindow`, discovered through that provider's real catalog; the pinned local Liter serves only that model with an empty fallback list. A failed or unfunded provider is replaced only by preparing a new explicit input and evidence record, never by silent fallback. Generated credentials are private environment references or mode-600 configuration files under a newly created mode-700 directory.

The launcher creates only three uniquely named, labeled, disposable containers from existing local images, records actual immutable image IDs, publishes loopback ports, and stops only IDs returned by its own creation calls. It does not pull images or touch existing containers. SurrealDB v3.3.0 uses a private persistent `surrealkv` directory, Postgres 15.2 owns Gate migrations and authority receipts, and Iggy owns the actual broker data. The local Iggy image is tied to source `4018aa3612a246b848bf55f052d274f092f9bdbb`; its [root credential environment contract](https://github.com/apache/iggy/blob/4018aa3612a246b848bf55f052d274f092f9bdbb/server/src/lib.rs) supports generated `IGGY_ROOT_USERNAME`/`IGGY_ROOT_PASSWORD` values. An image revision mismatch blocks startup.

Loopback topology: Surreal 18000, Postgres 18459, Iggy TCP 18460, Liter 18457, Gate administration 4457/application 18458, Fabric 18880, UAR 1916, BossFang 18789/18790, webhook adapters 18453/18454, callback 18455 and ephemeral JWT/JWKS issuer 18456. Existing listeners are never terminated to free a port. A conflict blocks readiness and must be resolved by selecting isolated ports coherently in the private input/plan.

Gate verifies realm RS256 JWTs and persists Cedar policies/grants through its own administration API. UAR receives the effect-only Gate token; grant-writing authority is not forwarded. Fabric verifies JWT issuer/audience and UUID tenant identity using its production `verified-identity` backend. Both BossFang processes use the same remote operational namespace and an external UAR with `env://` endpoint-role credentials. UAR uses its separate shared remote namespace and trusted-host `UAR_REMOTE_SURREAL_DURABILITY_ATTESTED=1`; this flag attests the actual private persistent server, never agent content.
Channel grants and every downstream grant reference use the configured realm issuer, matching Gate's authenticated execution-owner issuer exactly.

Both stable handler names are created independently on both hosts through the actual agent API, because the mention resolver reads each host’s local SQLite-backed registry. Shared remote channel storage does not populate that registry.

Registration uses POST `/policies`, POST `/api/agents`, GET `/api/v1/collaboration/capabilities`, POST `/api/v1/collaboration/packages:install`, POST `/api/v1/collaboration/deployment-bindings`, and POST `/api/uar/agent-instances/v1` with `resident` activation. Observer subscriptions and channel handler turns use the existing production routing APIs. No runtime business rows are injected. Package, definition, and binding digests follow UAR's canonical JSON contract, sorting object keys recursively and excluding the top-level `contentDigest`.

The operation receipt describes actual outcomes. A Fabric publish that has already been claimed is `uncertain`; it is never relabeled pending or withheld. The queued-revocation plan selects an actual unclaimed pending receipt and revokes its exact current source grant before restart. Missing pending evidence blocks that scenario. Logical detach preserves cursors/queue and does not cancel execution. The cancellation endpoint's unsupported result is the expected truthful capability, not a successful cancel.

Keep the private directory for inspection until the operator is finished. It contains secrets and persisted disposable state; do not commit or share it. Raw service logs are never printed or copied to receipts. Bootstrap evidence records source/build hashes, immutable image identities, owned startup/cleanup, and the driver exit. That evidence is separate from packaged-app acceptance and publication.
