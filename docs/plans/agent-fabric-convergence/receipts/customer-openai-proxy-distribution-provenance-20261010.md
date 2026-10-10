# OpenAI proxy correction: external operation and distribution scope

This is read-only source/provenance analysis. The current customer operation deliberately selects an **external liter-llm gateway**, backed on this machine by the separately installed OpenAI proxy. A successful operation through that route must not be described as bundled subscription readiness for a fresh The Boss installation.

The session's lead reports that corrected proxy source `d269910e45811c8450c7d80004405b6ea3cd9665` was installed and operated with a real streaming response. GitHub commit metadata confirms that exact commit exists and its parent is `ad32f5dc1f676dc1b40b01de8a4f043a6ee6928d`. This receipt does not independently repeat or certify that inference operation; retain its original operational evidence separately.

## Actual distribution boundaries

| Source / deployment | Observed contract | Consequence |
| --- | --- | --- |
| The Boss frozen current candidate | Lead's identified Boss commit `5b317b64c65928492f913fc41946d55ee099b472`, UAR `1522f17944aec1e1a7db5eab3b647e732fc1a07f`, mini `838371d3b597e785b1fe264377b3f55b9ca6333f`, full `bb8950b254825079ab382119a8c425d645a081ae`. `build/integration-sources.json` and `build/integration-artifacts.json` have no `openai-proxy` source or tool entry. | The corrected proxy is not a pinned native application payload. A successful external subscription gateway does not establish a fresh customer's managed subscription gateway. |
| Boss `scripts/package-prometheus.js` | Copies mini's skill/scripts/lib/shared/config/dependency closure; separately copies selected full-pack reviewed-verifier modules. It does not copy full `tools/openai-proxy` or execute full `scripts/install-binaries.sh`. | Bumping the application full-pack verifier pin alone cannot install the proxy or its service. |
| Full pack frozen `bb8950b254825079ab382119a8c425d645a081ae` | `.gitmodules` maps `tools/openai-proxy` to `GQAdonis/openai-proxy`; the committed gitlink is `7833663d3b46f7467f2017f2cce392c09ec1b7ac`. `scripts/install-binaries.sh` lines 203–252 optionally compiles that initialized submodule and installs the resulting binary to `~/.local/bin/openai-proxy` when Cargo is available. | Native full-pack source installs still consume the old proxy pin. The optional installer can be skipped or fail non-fatally; it is not proof of a running service or application bundle. |
| Mini frozen `838371d3b597e785b1fe264377b3f55b9ca6333f` | No proxy gitlink or executable installer. `lib/review/model-resolution.mjs` and `scripts/adversarial-review/preflight-models.mjs` recognize an existing compatible endpoint at port 8181; `docker/compose.yaml` supplies liter-llm. | Mini can consume an existing configured gateway; it does not distribute the corrected OpenAI proxy. No new mini daemon is proposed here. |
| Current full native stack | External proxy correction is installed independently, according to the lead's operational receipt. liter-llm's configured subscription-model connection targets that instance. | Record external endpoint/provider/source provenance explicitly; preserve user service ownership and credentials. Do not credit it as the frozen package's dependency closure. |

Ordinary Codex and Claude chat routes are different contracts: their prior packaged native session operations remain source-bound passing evidence. Their existence does not prove that the external proxy is distributed, nor that those chat executors are supported team-member bindings.

## Full-pack state and narrow follow-up

The inspected full worktree `cadence-nested-source-full` is clean at `bb8950b254825079ab382119a8c425d645a081ae`, branch `codex/cadence-preserve-native-user`. Its locally cached comparison with `origin/main` is one commit ahead and one behind; that local tracking ref is stale evidence, not current remote merge status.

A read-only GitHub comparison shows current remote full-pack main `b78d788a7fcd30cf953d84f9e92c8a7ee2549059` is two commits ahead of bb8950b and zero behind: the frozen source is an ancestor. Remote main's `tools/openai-proxy` gitlink remains `7833663d3b46f7467f2017f2cce392c09ec1b7ac`. The separate local primary full-pack checkout points its HEAD gitlink to ad32f5dc; that is not the remote main pin and should not be silently substituted or overwritten.

Safest bounded follow-up after approval: fetch current full-pack origin, work from freshly fetched origin/main on a separate narrowly owned branch, initialize/fetch only `tools/openai-proxy`, select verified `d269910e45811c8450c7d80004405b6ea3cd9665`, and commit only that gitlink plus a concise provenance note. Preserve local primary and old Cadence worktree changes/history. Do not force-push the merged Cadence branch or absorb unrelated primary-checkout work. The new source will be available to the existing optional native installer; build and operational readback remain separate from this documentation.

The current application/full source remains frozen at bb8950b. Do not retroactively alter its installed candidate identity or assign a future full-pack pin to an already built installer. Consume a future committed full-pack revision only at an explicit subsequent package boundary, with the actual dependency closure identified.

No production pin mutation, packaging expansion, service restart, inference request, application launch, build, test, or qualification/Cadence counter change was performed by this investigation. Its only authored artifact is this safe receipt.

## Inspected sources

- Boss: `build/integration-sources.json`, `build/integration-artifacts.json`, `scripts/package-prometheus.js`.
- Frozen full: `.gitmodules`, git tree at bb8950b, `scripts/install-binaries.sh`.
- Frozen mini: `.gitmodules`, `lib/review/model-resolution.mjs`, `scripts/adversarial-review/preflight-models.mjs`, `docker/compose.yaml`.
- Read-only GitHub metadata: `GQAdonis/openai-proxy` commit d269910 and `Prometheus-AGS/prometheus-skill-system` bb8950b-to-main comparison / main submodule record.
