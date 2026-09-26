# Analysis — choose a durable collaboration domain over the existing kernel

Status: PROPOSED for architecture approval; no dependency changes.

## Reuse landscape

| Candidate | Decision | Evidence and limitation |
|---|---|---|
| UAR thread/kernel/policy/catalog | ADAPT | Existing persisted lineage, bounded turns, narrowed authority and approved host bridge. Add team lifetime/inbox/tasks above it, repair descriptor conversion. |
| Codex Rust AgentControl | ADAPT pattern | At 986ff1cc7ced0081ec5014b700a376333d87f869, core/src/agent/control.rs scopes registry to a root tree; send_message queues, followup_task triggers. Reuse separation and capacity accounting, not its permissions as Cedar grants. |
| Claude Code team UX | ADAPT pattern | Shared tasks, peer communication and lead visibility are useful. Its official docs list resume and nesting limits; do not copy these limitations into a durable team promise. |
| OpenCode agent definitions | ADAPT pattern | Role configuration and delegation-specific permission controls are useful. Native option preservation does not establish cross-harness execution semantics. |
| Kimi agent files | ADAPT pattern | Declarative child references and resumable isolated context are useful. Documented prohibition on nested Agent tools differs from requested bounded subteams. |
| AG-UI events | ADOPT existing contract | Retain run/message/tool/subagent events; use negotiated CUSTOM events only for team/task extensions. No new top-level event enum fork. |
| A2UI | ADOPT UAR v0.9.1 profile | Keep approved catalog and typed action boundary. Add server-owned team/member surface ownership without silently adopting upstream v1.0 fields. |
| A2A | ADAPT versioned facade | Current upstream release v1.0.1, protocol header 1.0. New team endpoint uses that profile; legacy agent routes remain separately supported and truthfully labelled. |
| New workflow framework / broker | REJECT for local v1 | No demonstrated need to replace kernel or require another daemon. Existing persistence plus transactional inbox/task/outbox is the chosen seam. |
| Fabric, BossFang, Gate, Forge | DEFER broad integration | Preserve interfaces and ownership; first local Boss release does not wait for federation/business-platform completion. Existing required action checks still apply. |

Primary links: [Claude](https://code.claude.com/docs/en/agent-teams), [OpenCode](https://opencode.ai/docs/agents/), [Kimi](https://moonshotai.github.io/kimi-cli/en/customization/agents.html), [AG-UI](https://docs.ag-ui.com/concepts/events), [A2A release](https://github.com/a2aproject/A2A/releases/tag/v1.0.1). Local Codex source and UAR source receipts are in research/sources/local-source-receipts.json.

## Decisions and falsifiers

D01: One collaboration domain in UAR; bounded turn execution stays in the kernel. Falsifier: a required local story cannot be represented without a second loop. Investigate that exact gap before adding an engine.

D02: Durable identity is not captured run authority. Persist TeamInstance/AgentInstance/task/inbox; each activation creates a fresh admitted run. A resumed task with uncertain effects enters reconciliation. Falsifier: proposed recovery requires replaying an old approval or unverifiable effect.

D03: Host policy filters routing candidates before role/model ranking. A model may propose assignments; only scheduler admission claims work. No role label or coordinator text grants authority. Falsifier: an ineligible member can receive protected content or execute through any adapter.

D04: Authoring formats compile into a versioned canonical family; full/mini reuse that contract rather than define another runtime schema. Falsifier: mandatory semantics disappear on compile/register/read/bind.

D05: New team A2A 1.0 interface is version-separated from legacy UAR A2A types. Schema fixtures pin the v1.0.1 release. Falsifier: an ordinary conforming v1.0 client cannot discover/send/stream/read/cancel the same task.

D06: Local-first means one UAR authority, not one model provider. Members may use configured cloud models through existing provider bindings; no remote member executors in local v1.

D07: Pending shipping acceptance blocks runtime implementation readiness, not specification research. Falsifier: planning artifacts falsely mark D-UAR-P1 or old closeout complete.

## Dependency correction

The original C09/C14/C16 path pulls in broad BossFang/Fabric/business integration. For the operator-selected local profile, extract bounded local subsets and keep their original recommendation IDs. Full C05/C08/C11/C12/C17/C18 stay pending. This is an explicit profile decomposition, not marking whole parent groups complete.

C01 provides current-source/ownership records. C02-local provides the accepted UAR effect boundary; it does not require new Flint Gate deployment. C03-local supplies lossless definitions. C04-local reuses the accepted single UAR binding. C06-local supplies durable activations. C09-local supplies teams. C10-local is operator-approved issue creation through a supported existing connector. C14-local is Boss team UI. C15-local supplies both skill packs. The full cross-product C10 remains pending until its BossFang story passes.

## Trade-offs

Durability adds persisted inboxes, leases and recovery states; it avoids pretending process residency is continuity. Fair queueing improves bounded scalability but must not let coordinators waiting on children hold execution slots. First release uses fixed coordinator membership, with fresh-turn recovery; live leader election and cross-host takeover remain later work. Unknown external effects require reconciliation rather than optimistic retries. These limits must appear in product UI and conformance claims.
