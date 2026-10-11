# Native Codex/Claude evidence applicability through 2.2.30

Source-only inspection at the completed 2.2.30 boundary. Compared exact Git objects in The Boss repository: public 2.2.25 **35eff8c8c40555a4a464ee03b7305bcc4949666b** → final 2.2.30 **aef2ec2cda68605efab9dddf33b46e726e752c2d**. Current worktree HEAD was not used as artifact identity. No builds, application operations, inference, credential inspection, external writes or ledger transitions were performed.

## Disposition

**Retain the existing native Codex/Claude inference and lifecycle passes for their precise unchanged contracts.** The source comparison now reaches 2.2.30 rather than stopping at 2.2.28. This is applicability evidence, not a claim that those operations were rerun in 2.2.30 or that its installers were accepted.

The original Mac ARM64 receipts demonstrate actual responses through `openai-codex::gpt-6.1-sol` and `claude-code::claude-fable-5`. The lifecycle receipt separately demonstrates retained-history follow-up, semantic text streaming before cancellation, accepted typed cancellation, persisted paused state and successful post-cancellation follow-up on each route. They retain their original installer/source identities and dates.

## Relevant unchanged objects

Each identifier below is equal at **both** exact commits; this comparison establishes contract identity rather than ancestry alone.

| Production path | Equal Git tree/blob |
|---|---|
| `src/main/ai/runtime/pi` | `e0cb5c067504a64fbfc7ce8b2aac2c969d180b43` |
| `src/main/ai/runtime/claudeCode` | `d12ee2041a46cad2fe0c2d591cdc3411627154d3` |
| `src/main/ai/runtime/registerDrivers.ts` | `e2c97735b9375c17ab4120dfb76cd187f0223865` |
| `src/main/ai/agentSession` | `f4b6351f704379833179cc70bd12956e4e04d316` |
| `src/main/ai/streamManager` | `1dfb5b9d48af101e2ece7e2f4be71830fc02217d` |
| `src/main/ai/provider` | `28d359625b45ff8a8052bd367456479ca1cf330c` |
| `src/main/services/oauth` | `749d7f21c6443f6886a98fadbca35fdd62dbd811` |
| `src/main/data/services/AgentSessionService.ts` | `8121a10c6d2b037ed60a3b6b7c6c83387de6e362` |
| `src/main/data/services/AgentSessionMessageService.ts` | `f63a7d12f7a0fb352f916a0057680b227c434c41` |
| `src/main/data/api/handlers/agentSessions.ts` | `e1fc69d225dbc2969b9dc62bf2c7836b7983c724` |
| `src/main/data/api/handlers/agentSessionMessages.ts` | `eee8e85d61684ee04e3bc034b377c686abf88815` |
| `src/main/ai/toolApproval` | `4f43eb045ba485d524896dda56b2b8404c574304` |
| `src/main/ai/tools/adapters/claudeCode` | `b86973d9cf44b5243373a239b797482ad87b9135` |
| `src/main/core/lifecycle` | `62436da54e73984bc8c98196fd98674a863be5f1` |
| `src/renderer/hooks/agent` | `e35b658960fe92f16c517fc0b3753ddece31db04` |
| `src/renderer/services/aiTransport` | `4f69b101fb0d62e83d6a67923869cc6c1ef6edd6` |
| `src/preload` | `b6ab7200a445cf4b6f8b307c89160bfe9282e9e9` |
| `pnpm-lock.yaml` | `18e2801da99837400797d4cb2c7ec51a1d71d9e1` |

Also identical: runtime registry/types, workspace preparation, agent API gateway, ProviderService/ModelService, shared agent/session/message schemas and `scripts/package-prometheus.js`. Thus provider selection, native stream dispatch, session admission, message persistence, approval/cancellation routing and the existing shared shutdown lifecycle have no source delta.

Codex's native pi route resolves per-call credentials through the unchanged `OAuthRuntimeService`/`provider/runtimeTransport.ts`, then uses the pi Responses-family stream and provider shaping. Claude uses the unchanged Claude SDK request/options, stream adapter, process manager and session-state/warm-query code. The sampled native routes are not the changed ordinary-UAR admission/resume path. The standalone proxy tool-argument repair is not substituted as proof for these native routes.

## Dependency and changed-path boundary

- `package.json` changes only release version 2.2.25→2.2.30; dependency/devDependency records and the entire lockfile match. Relevant pins remain Claude agent SDK **0.3.284**, pi coding-agent **0.80.3**, pi-ai **0.80.6**, AI SDK **6.0.185**, Electron **44.2.0**, better-sqlite3 **12.11.1**, Drizzle ORM **0.44.5**. Packaging configuration changes release notes only. This establishes declared/resolved source dependency parity, not a fresh endpoint/account availability check.
- Actual changed runtime paths are UAR administration/durable-turn/run projections, `UarRuntimeConnection.ts`, `UarSidecarService.ts` and approval-lifecycle/authoring additions. The shared UAR barrel adds durable-turn/read/decision exports; `ipc/handlers/prometheus.ts` adds those UAR-specific operations. Existing native driver/session contracts above are unchanged.
- Payload sources do change: UAR `60b5922e3e11dd73bfd8a47e5bc28f3c16332889`→`308aea46ff26e7f61340281bb51f67ebe5351569`; mini `3a7c0d245cb8a412b62e287872e23c694d20348b`→`838371d3b597e785b1fe264377b3f55b9ca6333f`; full `fd1e2c2de05f67dcb773d4710d5457588d2fe39b`→`bb8950b254825079ab382119a8c425d645a081ae`. Packaged Cadence process handling also changes. Therefore new skills/prompt composition, UAR execution, cross-harness adapters and team-member execution are **not** inherited from these plain native inference passes.
- liter-llm remains `a6047386cc9fae4258b4a8577f6a016022095586`, BossFang `0899e4993ebfede3f91366b22cfe9310b2e58f69`; Compass, filesystem, pk, Prometheus and surreal-memory pins are unchanged. Native passing receipts explicitly do not replace the selected providers with a paid API or gateway.

## Exact retained receipts and limits

- [customer-public-mac-2.2.25-codex-inference-20261009-operation.json](customer-public-mac-2.2.25-codex-inference-20261009-operation.json): SHA-256 `57b87ed6fb86e1bf9caaa6c34595df8c4804860ac2741753070f3dadb3978f96`.
- [customer-public-mac-2.2.25-claude-inference-20261009-operation.json](customer-public-mac-2.2.25-claude-inference-20261009-operation.json): SHA-256 `66f816c79efca70bab804af23d7a7ebb7ea3881676738030b8897cde5248104c`.
- [customer-public-mac-2.2.25-native-inference-lifecycle-20261009.json](customer-public-mac-2.2.25-native-inference-lifecycle-20261009.json): SHA-256 `c6cadb9a03687a16a5b540b799c1270469d0516e5a9ca1d21d24d5f995ea80de`.
- [customer-public-graceful-quit-2.2.30-20261010.json](customer-public-graceful-quit-2.2.30-20261010.json): SHA-256 `af99bc46efc003e2105351c965a496a583850f9d1ce5b270e1f6e64ee83f6d91`.

Keep the **2.2.30 production Quit receipt separate**: it observes clean main exit, actual owned UAR/BossFang process termination and preserved external native process identities on the exact public installer. Invocation used the owned main-process debugger; it does not assert a visual menu click or an active Codex/Claude child at shutdown. Older native lifecycle drivers used forced cleanup and never certified graceful Quit.

No refresh/login repetition is required merely to change the evidence date. The operator's fresh sign-in is not itself an inference receipt; current token validity, model entitlement and endpoint availability remain time-sensitive. No credential content was inspected. These retained passes establish neither renderer Stop-button clicks, all models/providers, native Windows execution, UAR team-member executor support, changed packaged skills nor final-candidate operator acceptance. No task or whole portfolio qualification credit is added by this document.
