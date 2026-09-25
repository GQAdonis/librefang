# Agent Fabric Convergence — BossFang/librefang Planning Note

Status: planning handoff; no product behavior or public contract is changed by this document.

Initiative: `agent-fabric-convergence`

Source baseline inspected: `5110694352df231c5662bec972332c7c0f5cac53`

Date: 2026-09-25

## Finding

BossFang/librefang already has a broad multi-agent product surface: reusable
agent manifests and types, spawned agents, Hands, schedules and triggers,
inter-agent tools, workflows and DAG steps, checkpoints, budgets, RBAC,
approvals, channels, A2A, and a distinct kernel/runtime boundary. The convergence
work is therefore an integration and ownership problem, not a reason to build a
second orchestration stack inside this repository.

The uncomfortable fact is that librefang and UAR can both execute agent loops,
tools, workflows, approvals, and A2A requests. A superficial adapter could run
the same logical task twice, prompt twice, replay a side effect, or interpret a
permissive librefang manifest default as a UAR grant. The full-harness route must
select exactly one executor per delegated run and retain exactly one workflow
owner per workflow object.

## Current responsibility

BossFang/librefang currently owns:

- application and channel workflow objects, routing, schedules, triggers,
  Hands, operator controls, and their durable run state;
- reusable `AgentManifest` and agent-type templates, deployed agent instances,
  registry identity, workspaces, sessions, and lifecycle;
- the native librefang kernel, runtime loop, model drivers, MCP/tool dispatch,
  approval/RBAC path, metering, memory integration, and audit trail;
- channel ingress/egress and mappings for Slack, Teams, email, chat systems, and
  other adapters;
- the choice between native librefang execution and a future explicitly bound
  UAR full-run delegation route.

The repository already has two UAR integration pieces. `librefang-uar-spec`
parses the 15-section UAR document and translates between its `AgentArtifact`
and `AgentManifest`; its reverse translation is explicitly best-effort. The
feature-gated `UarDriver` supervises an endpoint and sends completion/streaming
traffic through UAR's chat-compatible surface. That driver makes UAR an LLM
provider inside the native librefang loop. It is not complete-run delegation and
must not be presented as the future orchestration contract.

The crate boundary is useful: `librefang-kernel` owns orchestration and calls
`librefang-runtime` for execution through `KernelHandle`, so a UAR driver can be
introduced at the kernel/runtime seam without teaching channel adapters or CLI
commands a second execution model.

Evidence:

- [`README.md`](../README.md) describes Hands and assigns orchestration,
  workflows, metering, RBAC, scheduling, and budgets to `librefang-kernel`, with
  the agent loop and tool execution in `librefang-runtime`.
- [`librefang-kernel/README.md`](../crates/librefang-kernel/README.md) defines the
  kernel as the orchestrator of lifecycle, permissions, inter-agent
  communication, and message handling.
- [`librefang-runtime/README.md`](../crates/librefang-runtime/README.md) keeps the
  execution loop below the kernel and uses `KernelHandle` to avoid a circular
  dependency.
- [`agent-created-workflows.md`](architecture/agent-created-workflows.md) records
  agent-created workflow definitions, DAG dependencies, durable run state,
  budgets, recursion limits, agent-type resolution, required skills, and run
  ownership.
- [`agent-manifest-field-parity.md`](architecture/agent-manifest-field-parity.md)
  records the existing 60-field manifest and its mutation/persistence rules.
- [`capability.rs`](../crates/librefang-types/src/capability.rs) implements child
  capability-inheritance validation.
- [`librefang-uar-spec`](../crates/librefang-uar-spec/src/lib.rs) contains the
  existing parser/types/translator, and
  [`uar.rs`](../crates/librefang-llm-drivers/src/drivers/uar.rs) contains the
  existing chat-compatible UAR model driver.

## Participation in the future UAR story

BossFang should act as application orchestrator, channel/workflow owner, host,
and UAR client. UAR should act as the selected executor for a delegated full run.
The target call path is:

```text
channel, scheduler, Hand, API, or workflow step
  -> BossFang workflow/task admission and durable owner
  -> explicit native-or-UAR execution binding
  -> UAR run admission under the authenticated BossFang host bridge
  -> UAR thread/team execution and governed tool requests
  -> BossFang exact approval/tool bridge when host tools are selected
  -> correlated result, artifact, usage, and terminal state
  -> originating BossFang task/workflow/channel
```

The binding is per definition/deployment revision and per run. It is not inferred
from an OpenAI-compatible model URL. The native route remains supported. A UAR
route delegates the complete agent run—including model loop, context, child
threads, tool intent, cancellation, and UAR lifecycle—to UAR; BossFang does not
run a shadow loop or replay UAR tool calls.

BossFang retains its application workflow identity, channel routing, source
message identity, and external reply scope. UAR returns its native run/thread,
task, artifact, approval, usage, and effect identities. The adapter persists the
mapping and reports whether retention is durable or ephemeral. A2A lookup and
cancellation must resolve the same logical execution rather than a second task
store with independent truth.

For future business and executive teams, librefang contributes channel adapters,
Hands, schedules, operator workflows, agent types, and existing task/workflow
authoring. UAR contributes governed team/thread execution and the shared
definition profile. A marketing, product, design, or C-level role definition
still carries no authority; actions through Slack, Notion, Jira, GitHub, finance,
or other connectors require current identity, policy, credentials, scope, and
approval at the actual effect boundary.

## Definition translation boundary

The future collaboration document profile separates these concepts:

- `AgentDefinition`: portable behavior and required semantics;
- `TeamDefinition`: member roles and task/communication contracts;
- `WorkflowDefinition`: graph, inputs/outputs, waits, approvals, and effects;
- `DeploymentBinding`: runtime instance, model, credentials, workspaces, MCP,
  installed skills, and effective policy revisions;
- private `RepresentationGrant`: consent and scoped authority to represent a
  human, never exported in a public package.

`AgentManifest`, agent types, and `HAND.toml` remain supported source formats.
The existing `librefang-uar-spec` parser and best-effort translator are the seam
to evolve rather than replace. Its adapters must issue field-addressed
diagnostics and preserve required semantics through compile, storage, binding,
and execution. Unknown mandatory or required-unsupported fields block
delegation. Defaults are material: for example, the existing manifest documents
that an empty `capabilities.tools` declaration historically means unrestricted.
A UAR adapter must never translate that absence/empty value into a capability
grant. It must require an explicit, host-resolved effective binding.

Installed credentials, approval records, Cedar grants, private representation
grants, and local workspace paths are deployment state and do not enter portable
definitions.

## Dependency on the accepted UAR P1 contracts

Future adapter work consumes checkpoint `D-UAR-P1`; it does not modify or bypass
the active UAR-in-The-Boss release phase. The required contracts are:

- BossFang owns profile/workspace/conversation identity, canonical history,
  provider secrets, catalog restrictions, and human decisions; UAR owns an
  admitted UAR execution loop.
- One app-owned sidecar is supervised through the existing service lifecycle.
  Launch authentication is separate from the host-asserted conversation
  principal, and every operation is principal-bound.
- Run admission freezes provider/model/credential, workspace/roots, catalog,
  policy/reasoning, history, version, and capability data. Child/resume paths do
  not re-resolve a more permissive host environment.
- The private admission path uses exact invocation, root/executing run,
  owner/workspace, runtime/host epoch, catalog/server/tool, policy revision, and
  validated argument bindings. The renderer sends only opaque identity plus
  allow/deny.
- Host and UAR decisions compose restrictively. BossFang deny cannot be
  overridden; ask requires an identified human; auto still records and claims
  one exact invocation before dispatch.
- Persisted claim intent precedes the host effect. Duplicate decisions return
  current state, while response loss after claim becomes outcome-unknown and is
  not retried as a new effect.
- Renderer detach, UAR stream reconnect, sidecar restart, and host restart are
  distinct. Pending approval may reattach only to its existing live identity;
  restart invalidates old admission authority and leaves a visible interrupted
  or unknown outcome.
- Safe action projections reach UI/logs; complete arguments, credentials,
  digests, and replayable authority remain main-process/private.

The future full-run adapter may extend versioned capability negotiation and
binding identity. It must not weaken or silently fall back around these P1
requirements.

## Codex CLI Rust patterns worth adapting

The Rust reference under `/Users/gqadonis/Projects/references/codex` provides
several patterns that fit librefang's existing kernel/runtime split:

| Codex pattern | BossFang/librefang adaptation |
| --- | --- |
| Root-scoped multi-agent control separate from the global thread manager | Put UAR delegation control behind a kernel handle/service, scoped to the originating workflow/task; do not place orchestration state in channels or the CLI. |
| Canonical hierarchical task paths and persisted open/closed spawn edges | Map librefang workflow/agent identities to UAR paths while retaining both native IDs and one durable relation record. |
| `send_message` queues without starting a turn; `followup_task` queues and triggers | Make trigger semantics explicit in existing inter-agent and workflow dispatch; transport delivery alone must not imply execution. |
| Explicit spawn/list/wait/interrupt tools and structured activity events | Present a small stable control API over native or UAR backends and normalize lifecycle without hiding backend-native IDs. |
| `none`/`all`/last-N history forks that filter tool/reasoning/usage state | Translate librefang `session_mode` and parent-context choices into typed UAR context selection; never copy tool traces or permission state as dialogue. |
| Shared rollout budget, concurrency limiter, and reservation guards | Attribute delegated usage to the originating BossFang owner while UAR enforces its own root budget; deduplicate canonical usage rather than charging both views. |
| Cold identity restore without reopening every runtime, plus bounded worker residency | Reattach persisted mappings and load UAR status lazily; do not silently respawn a missing UAR service or rerun work. |
| Bounded root authorization evidence and typed developer-context fragments | Pass typed, bounded context and P1 authority identities; prompts and role text remain non-authoritative. |

Codex's implementation should not be copied wholesale. UAR has richer
owner/policy/artifact lineage and Cedar governance, while BossFang has durable
application workflows, Hands, channel mappings, and a host approval boundary that
Codex does not own.

## Ownership rules for teams and workflows

- A BossFang workflow remains a BossFang object even when one or more steps use
  UAR. Its waits, joins, channel reply, scheduling, and terminal workflow state
  stay in BossFang.
- A UAR team/task board created through the UAR team API remains a UAR object.
  BossFang may observe and control it through its adapter but does not mirror it
  into an independently mutable workflow.
- A future workflow import chooses one owner and records source/provenance; it is
  not simultaneously live in both engines.
- Every delegated run records workflow/task/run/attempt/effect IDs. Exactly-once
  logical identity is not a claim of exactly-once external effects.
- Cancellation stops new dispatch and propagates to the selected executor.
  Detaching a channel or UI stream does not cancel the workflow or UAR run.

## Non-goals

- Editing `librefang-cli` to implement orchestration logic or creating a
  second daemon, listener, provider registry, agent loop, approval registry, or
  workflow store.
- Replacing the native librefang runtime, current manifests, agent types, Hands,
  workflows, channels, or A2A route in the first convergence slice.
- Treating UAR as another OpenAI-compatible model provider when the requirement
  is complete run delegation.
- Having BossFang and UAR both execute a delegated tool, retry an uncertain
  effect, or independently decide the same approval.
- Translating permissive manifest defaults into UAR grants or allowing an agent
  definition/role to mint Cedar authority.
- Moving all BossFang workflow state into UAR, or all UAR team state into
  BossFang.
- Claiming live-session migration, automatic fallback spawning, arbitrary
  multi-hop delegation, or cross-host takeover before the initiative's later
  placement/federation gates pass.
- Packaging credentials or private human representation grants with a Hand,
  manifest, team, or workflow definition.

## Next repository-scoped KBD child

After `D-UAR-P1` is accepted and the UAR governed-action boundary is stable,
create `librefang-collaboration-definition-adapter` for this repository's C03
work. It should own only the shared type/adapter modules selected in its plan;
it must not edit CLI commands or start full-run delegation.

Its exit criteria are:

1. inventory every `AgentManifest`, existing `librefang-uar-spec` artifact,
   agent-type, Hand, workflow, skill, tool, workspace, session, ownership,
   approval, and capability field that maps to a collaboration document or
   deployment binding;
2. publish a field-level mapping with `exact`, `derived`, `defaulted`,
   `unsupported-optional`, and `unsupported-required` outcomes;
3. round-trip representative legacy manifests, agent types, Hands, and
   workflows without losing required semantics;
4. keep credentials, grants, approvals, and local paths in deployment state;
5. reject required-unsupported exports and prove permissive legacy defaults do
   not become UAR authority;
6. pin schema and adapter revisions for the later full-run consumer.

The next child after that is `librefang-uar-full-run-delegation` (initiative C05),
dependent on C02, C03, C04, and `D-UAR-P1`. It introduces the full-harness route,
durable ID mapping, admission/steer/observe/approve/cancel/detach operations, and
unknown-outcome reconciliation while preserving the native route and one
BossFang workflow owner.
