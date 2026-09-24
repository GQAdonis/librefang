# Operational mode acceptance matrix

These are target contracts, not claims of implemented support. `Cxx` refers to the delivery slice in the plan. Every accepted release records exact source, payload, API, schema, feature and policy-profile revisions. Lack of a component is supported only where that mode declares it optional.

| Mode | Required composition and authority | Decisive acceptance | Slices |
|---|---|---|---|
| Standalone UAR request execution | UAR trusted host; BossFang, Gate, Fabric and Forge optional | Two requests on one warm host share no unintended context/grants; managed and direct effects honor the selected profile | C02–C04 |
| Standalone UAR stateful agent | Durable logical identity, bounded turns, one active state owner | Passivation/restart retains identity and admitted work; cancel remains responsive; stale activation cannot write | C06 |
| Standalone BossFang | Native loop with independently selected model provider | Native route remains functional and accurately labels UAR provider use | C05 |
| The Boss + managed UAR | Studio owns the process; UAR owns execution; product history follows P1 | Real conversation/tool approval/restart works through accepted P1 integration; studio shutdown behavior is explicit | D-UAR-P1, C04 |
| The Boss + both managed sidecars | Sibling processes supervised by the studio | BossFang uses the declared UAR instance and does not start a duplicate; paths/stores are isolated | C04–C05, C14 |
| Headless BossFang + child UAR | BossFang is the configured supervisor; studio is optional | Studio disconnect cannot stop headless work; service drain differs from run cancel | C05–C06 |
| External-local instances | OS/container supervisor owns lifetime; apps attach | Closing/removing a connection does not kill an unowned process | C04, C14 |
| Local BossFang → remote UAR | UAR executes on its declared workspace host | Remote admission timeout reconciles the original run; no implicit local fallback or path aliasing | C05, C18 |
| Remote BossFang → local worker | Authenticated worker registration/outbound connectivity or controlled tunnel | Remote localhost is never interpreted as the user's host; offline worker state is visible | C18 |
| Independent cloud or colocated sidecars | Explicit deployment supervisor; one executor/task owner | Scaling/restart cannot produce duplicate ownership; managed and external profiles negotiate capabilities | C18 |
| UAR local observer | Local committed-event publication and per-observer durable inbox | Two monitors receive independent copies scoped to producer and conversation; replay does not create effects | C07 |
| BossFang channel → UAR handler/observer | BossFang authorizes ingress/disclosure; UAR authorizes recipient | Stable provider/account/thread/recipient affinity survives retry/restart; handler and observer roles remain distinct | C08 |
| KnowMe offline embedded | App-hosted UAR, local inference/tools and host persistence | Useful offline task completes with permitted data; suspension is truthful and network is not secretly required | C13 |
| KnowMe phone + home or personal cloud | User selects remote persistent executor and context grants | Phone suspension does not imply run loss or a second owner; exposed status reflects reachability | C12–C13, C18 |
| KnowMe paired peers without vendor cloud | Authorized personal documents and bounded offline grants | Pair/revoke/key recovery works; peer data converges without exposing organization grants or private history | C12 |
| KnowMe enterprise tenant | Forge authoritative commands, local read model and durable intent queue | Pending/accepted/committed/projected states stay distinct; duplicate command cannot repeat effect | C11 |
| Forge-only backend | Quarry APIs/domain transactions; optional Fabric delivery | Ordinary application data requires no agent runtime; route-specific policy behavior is proved | C11 |
| Alternative harness | Capability-bound external executor; native extensions retained | Unsupported required semantics reject placement; summary handoff is labeled a new session | C15, C18 |
| Multiple studios / federated organizations | Separate viewers and locally enforced authorities | One challenge resolves once per issuer; independent denials remain visible; remote identity is revalidated | C02, C14, C18 |

## Recovery rules across modes

- Viewer disconnect, process death, device suspension and host loss are different events with different contracts. Detached work survives viewer loss only; process survival needs a resident owner or explicit recovery.
- Event replay, snapshot restoration, native-session resume and workflow continuation are separate advertised capabilities. Retention gaps are visible and require resnapshot/reconciliation.
- Every retry distinguishes transport delivery from model generation, agent attempt and external side effect. Unknown outcomes are reconciled; cancellation cannot erase prior effects.
- Subscribe, deliver content, expand a payload and act are separate authorization checks. Queueing cannot preserve a revoked grant indefinitely.
- A declined or unreachable explicitly selected external instance is not permission to spawn the bundled one.
- Mobile local grants have a declared validity window. Sensitive remote effects require fresh authority; offline edits remain pending when that authority is unavailable.
- No universal exactly-once promise: a target without idempotency or reliable result lookup uses an explicit uncertain-outcome/manual-reconciliation path.
