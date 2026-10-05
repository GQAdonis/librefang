# C14.1 Teams in Work packaged operation

Creation task: `C14.1`.
Invoke only at the complete delivery boundary, after production UI, locales, runtime host context, coding preset, ordinary-profile qualification and the local Mac application build are complete.
Creating this procedure supplies no runtime or acceptance evidence.

```text
node docs/plans/agent-fabric-convergence/scripts/c14-operation/operate.mjs --boss /absolute/path/to/boss-checkout --launcher /absolute/path/to/delivery-cadence/scripts/boss-launch.mjs --output /absolute/path/to/operation-evidence
```

The maintained launcher is `/Users/gqadonis/Projects/prometheus/prometheus-skill-pack/skills/process/delivery-cadence/scripts/boss-launch.mjs`.
The runner uses only Node.js built-ins and argument-array Git invocation to initialise the isolated fixture repository; it never commits.
The current supplied launcher supports macOS packaged applications only.
On another native platform the portable entrypoint writes an explicit unavailable receipt; it cannot manufacture an equivalent native application operation.
The launcher requires Node.js with its global `WebSocket` implementation.

## Real gateway prerequisites

Provide the selected gateway's real configuration through these environment references:

| Variable | Required value |
| --- | --- |
| `BOSS_C14_GATEWAY_CREDENTIAL_ENV` | Name of an existing environment variable containing the selected gateway credential; the reference name is recorded, the value is never recorded. |
| `BOSS_C14_GATEWAY_ENDPOINT` | The selected gateway's real endpoint, with no embedded credential or query secret. |
| `BOSS_C14_GATEWAY_ALIAS` | The actual served alias selected for this coding run. |
| `BOSS_C14_GATEWAY_PROVIDER_ID` | Its actual configured source provider identity, used by existing gateway pricing/model provenance. |
| `BOSS_C14_GATEWAY_MODEL_ID` | Its actual configured source model identity. |
| `BOSS_C14_GATEWAY_PROVIDER_BASE_URL` | Optional actual source endpoint when the configured provider requires it; no embedded credential. |

No provider, alias, price, credential, inference, gateway or runtime is mocked or guessed.
The scenario uses ordinary supported application configuration/data APIs to configure that external gateway in the fresh isolated profile and register its isolated workspace.
Those are prerequisites, not evidence of Work operation.
The process passes no execution-profile override, creates no custom runtime host and launches the ordinary selected packaged sidecar through application supervision.
An inherited `UAR_TEAM_EXECUTION_PROFILE_STAGE`, `UAR_WORKFLOW_EXECUTION_PROFILE_STAGE` or `BOSS_C094_PUBLIC_QUALIFICATION` variable blocks this procedure; unset explicit operation/qualification overrides before invoking it.

## Work operation and evidence

The actual Work DOM controls select the workspace, exact configured model, coding preset, immutable team definition and scoped binding, then submit a natural-language change to `README.md` in the fresh repository.
The coordinator must delegate to distinct real worker/reviewer members with real model attempts, and the reviewer must consume the worker's attributed artifact.
The procedure approves requests only through their exact Work approval control after inspecting the actual request's tool, attempt/run scope and arguments.
Readonly filesystem requests stay inside the synthetic workspace, and writes are permitted only from the worker to `README.md` when the requested effect produces exactly the authorised marker replacement.
Another tool, path or effect produces an explicit unavailable receipt rather than a broad approval.

Acceptance requires the real file bytes to match the exact desired edit; worker/reviewer effective-model receipts and artifacts to correlate with the visible Work rows; and ordinary runtime qualification to be `qualified` with executable coding/cooperation capabilities.
The first run must finish before its durable identity, attempts and artifact digests are compared after a renderer reload and Work reopening.
A second read-only run exercises the actual Work reason/cancel control and must preserve authoritative `cancelled` state on reopening.
An uncertain cancellation or a race with completion remains explicitly unaccepted.
Reopening here proves a renderer reload and persisted selection, not an application-process or runtime-process restart.

Each invocation creates a fresh exclusive `c14-<uuid>` directory containing `operation.json`, `launch.json`, `evidence.json`, a trusted scenario wrapper and the synthetic repository.
Receipts contain actual source/bundle/sidecar/launcher/scenario hashes, identity and artifact/output digests, checked behaviors and observed accounting; unknown usage stays unknown.
Raw model outputs, prompts, approval arguments, gateway credential values and raw errors are omitted from receipts.
The generated scenario wrapper contains only environment-reference configuration and synthetic fixture contents; it is written with owner-only permissions where supported.
The launcher preserves its isolated app data for inspection and stops only the application instance it started.
Its fresh profile does not modify installed application data.

The procedure returns success only when both the launcher confirms the scenario and the full named behavior is observed.
Otherwise it writes a bounded `C14_*` failure code and a blocked outcome: missing package/source pin, unsupported native launcher, missing gateway credential/configuration, unavailable normal qualification/coding/tools, refused scope, failed inference, absent actual repository change, missing provenance, unresolved approval, failed reopening or incomplete cancellation are not feature acceptance.
