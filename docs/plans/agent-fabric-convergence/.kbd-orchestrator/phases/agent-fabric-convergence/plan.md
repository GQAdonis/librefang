# Plan: Agent Fabric Convergence

Date: 2026-09-24. Scope: implement the report recommendations through coordinated, dependency-gated delivery. The opening counts and “this turn” below record the **original planning baseline**, not current execution status. OpenSpec backend: YES. Original portfolio: C01–C18. As of the 2026-09-28 cadence revision, add one separately tracked **D01 delivery change** without renumbering those 18 changes or treating a delivery wrapper as a new recommendation cluster. Canonical KBD progress and signed receipts, not these historic opening counts, report current completion.

OpenSpec artifact completeness is not permission to apply this cross-repository roadmap directly. The initiative root permits planning edits only. Product work requires repository-scoped child changes with single-session tasks and explicit file ownership. The 54 parent groups remain pending until their children pass; C01 is the first coordination step.

## Approved customer delivery revision — 2026-10-05

The controlling [customer order](../../../customer-delivery-order.md) and [coverage map](../../../customer-delivery-map.json) supersede the original scheduling and release policy. Next canonical work: C14.1 Teams in Work. C10.2 is held as canonical Blocked for priority ordering: the runtime does not permit InProgress → Pending. This is not an external technical blocker. Priority: teams in Work → reusable mixed-team configuration → C14.4 shared BossFang/UAR → C14.3 MiniApp → GitHub feedback. Teams do not depend on BossFang.

Original task/recommendation identities remain. Baseline: 33 complete + 1 cancelled + 26 unfinished = 60; the earlier 34/60 was terminal, not all completed. New approved C14.4 adds one unfinished task (61 total). Completed children remain 32/32. Canonical generated projections are the completion authority; below checkbox mirrors are refreshed from revision500.

Keep 120-minute autonomous cadence: finish complete production/UI/locales/persistence/payload, freeze inputs, build pnpm build:mac:arm64, launch and operate the new capability. No intermediate test suites. Publish all four Mac/Windows targets plus GitHub metadata and website every second successful delivery; no Linux. Installed acceptance and historical publication debt stay separate and explicit. One build writer/publisher with bounded isolated work-ahead. New operation evidence must be candidate-specific; do not reuse an earlier onboarding receipt.

## Task model assignments

[Model dispatch](../../../model-dispatch.md) and its JSON contain the canonical task-keyed assignments and native/gateway worker alternatives. All retained task assignments remain. C14.4 is architecture (preferred gpt-6-astra); C14.1/C14.2/C14.3 use their existing implementation routing. Resolve capabilities at dispatch; no agent or provider model is switched by editing this plan.

## Scoped dependency selection

C14 Teams consumes C03/C04/C05/C07/C09 and C10.1; remove whole-C10 gating for that scope. C15 desktop authoring consumes C03/C09/D-MINI/D-UAR-P1, not unused Forge/KnowMe host qualification. C16 coding consumes the existing catalog/team kernel and Work surface, with only required C15 bindings. GitHub feedback consumes its connector and approval/workflow substrate, not Notion/Slack/Jira. C14.4 follows usable teams/configuration and precedes C14.3. Exact dependency and deferred criteria are in the coverage map.

## Historical and retained requirement inventory

The sections below retain original scope and historical acceptance; historical commands/priority statements in completed D01 and earlier amendments do not select current work or override revision8 cadence. The revised dependency edges and delivery map above control scoped admission; full task completion still requires all non-superseded criteria.

## Ordered change specifications

### D01 — Local Mac durable-agent delivery (new delivery wrapper; C01–C18 unchanged)

The first customer-visible delivery after accepted C06/C07 local UAR integration is a functioning Apple Silicon The Boss app. **Canonical change ID:** `afc-d01-local-mac-durable-agent-delivery`; its [OpenSpec proposal](../../../openspec/changes/afc-d01-local-mac-durable-agent-delivery/proposal.md), design, tasks and spec define the exact product boundary. Register this as a pending parent change **before** resuming C08's pending task; do not treat this paragraph or `exactNextWork` as the selector. D01 is a release wrapper, not a replacement for original C14/C18 work.

- Repositories/owners: The Boss packaging owner for the exact Mac script/local-only checksummed UAR overlay and CI refusal; selected clean UAR binary producer for the native helper; Boss UI/IPC/settings/locale owner for durable-agent and local-observer controls; native release owner and single metadata/site publisher for a publish-now decision. Record exact file claims and separate Boss/UAR commits before dispatch.
- Depends on accepted C02, C03, C04, C06, C07 and D-UAR-P1/D-MEMORY. **C08 is not a D01 or C09 dependency.** Preserve C08's own compiler repair and composed gate with its current owner. Original C14/C18 dependencies remain for full completion; D01 uses only the bounded C14.1 surface and release traceability identified in its spec.
- D01.1: From clean committed Boss/UAR source, make exact `pnpm build:mac:arm64` UAR-enabled with a local-only arm64 payload record bound to source/architecture/checksums and installed outside ASAR. Public CI rejects the overlay and keeps its canonical same-UAR-SHA win32-x64/darwin-arm64 inputs. No runtime path override counts as package proof.
- D01.2: Expose real C06 instance lifecycle and C07 local observer backlog/recovery in the existing Boss UAR settings, through typed IPC/trusted adapter, persisted configuration and all locales. Demonstrate two isolated workspaces and current governed authority. Do not mark C14.1 complete from this bounded subset.
- D01.3: After the whole production slice is written, run **one** real path integration gate and exact local Mac build. Open the new app with helper override cleared; record bundled UAR source/version/port, UI operation, restart persistence, hashes and elapsed time. A build that opens without working UAR remains failed. Ask the now-or-wait all-four-platform question immediately after success.
- D01.4: Record the operator choice. Wait keeps publication pending and prior links intact. Publish-now requires missing Mac Intel/Windows ARM64 UAR payload/profile work and all four native installers plus the complete GitHub/`RELEASES.md`/landing/Lovable/live-byte chain above. A non-UAR substitute or partial target set cannot be called the requested full publication.

**Acceptance:** One usable local Mac app with a source-bound packaged helper and real durable-agent UI, plus a truthful publication decision. Publication and installed platform acceptance are independently evidenced. D01 may close after a recorded wait only with publication explicitly pending; C14/C18 and any open C08 requirements remain open.

**Next customer priority:** C09's complete bounded team with Boss UI, IPC, persisted task/member state, locales and C02 authority is the next meaningful D2 journey. C09's original dependencies remain C02/C03/C04/C06. C08 can continue with a separate owner and remains required before C10's BossFang/channel path. The parent must select C09 through supported KBD change selection after D01 if C08 is still pending; prose priority does not change canonical ordering. No separate catalog-only release is scheduled by default.

### C01 — Baseline reconciliation and shared contracts

Rebind every REC item to current source or accepted dependency, with exact commits and explicit owner.

- Repositories: librefang, universal-agent-runtime, the-boss, flint-gate, flint-realtime-fabric, flint-forge, surreal-memory-server, know-me-app, know-me-system, prometheus-skill-pack, prometheus-skills-mini.
- Write scope: Planning directory; read-only product source and existing phase records.
- Depends on: none. External checkpoints: D-UAR-P1, D-MINI, D-GATE, D-MEMORY, D-FRF, D-FORGE, D-GATE, D-KNOWME, D-MEMORY.
- Suggested executor: Codex; use an independent reviewer at acceptance. Size M; complexity Medium; model class medium. Actual model/price/capability must be discovered at dispatch and recorded.
- Recommendation coverage: REC-007, REC-011, REC-012, REC-042.

- [x] C01.1: Refresh source and lockfile/feature evidence; classify every historical gap as retained, superseded, externally owned or unresolved. Deliver baseline-ledger.json for all 11 repositories named in repository-manifest.json, recording baseline/current revision, owner, disposition, blocking dependency and acceptance reference.
- [x] C01.2: Record accepted P1 conversation/execution/approval contract and per-module ownership; leave overlapping implementation blocked until checkpoint agreement.
- [x] C01.3: Publish versioned identity/state/action vocabulary, dependency compatibility matrix and ordered adoption/rollback checkpoints.

**Acceptance:** Every REC has a source disposition, owner and acceptance reference; all 11 baselines resolve; no unresolved ownership is labeled execution-ready.

**Compatibility and limits:** No product code; later changes may start only after their relevant dependency checkpoint is satisfied.

### C02 — Governed action and approval boundary

Reuse: library: cand-003 (adapt: Cedar and host approvals).

Protected actions use verified identity, typed context and current policy before any effect.

- Repositories: universal-agent-runtime, flint-gate.
- Write scope: UAR governance composition, direct/managed/embedded effect admission, policy installation and approval adapters; Gate token/approval boundary.
- Depends on: C01. External checkpoints: D-UAR-P1, D-GATE.
- Suggested executor: Codex; use an independent reviewer at acceptance. Size L; complexity High; model class frontier. Actual model/price/capability must be discovered at dispatch and recorded.
- Recommendation coverage: REC-010, REC-018, REC-019, REC-050, REC-051, REC-052.

- [x] C02.1: Inventory and converge real effect entry points; make governed-profile missing/invalid policy and required facts deny with visible posture.
- [x] C02.2: Bind active policy/grant revisions and exact action/resource/payload; preserve restrictive boundary composition, budget reservation and current lease checks.
- [x] C02.3: Integrate durable issuer-scoped approval identity, post-wait revocation/payload recheck and subject/actor/audience validation; retain explicit constrained local mode.

**Acceptance:** Exercise real direct/managed/embedded/proxied routes with forged identity, policy errors, revoked approval and changed payload; denied effects do not occur.

**Compatibility and limits:** Do not change current P1 launch/history contracts without D-UAR-P1 agreement; no arbitrary multi-hop delegation claim.

### C03 — Lossless definitions and collaboration document profile

Reuse: library: cand-001 (adapt: Existing UAR execution/thread/actor/compiler).

Authored required semantics survive compile, storage, binding and actual execution.

- Repositories: universal-agent-runtime, librefang, prometheus-skill-pack, prometheus-skills-mini.
- Write scope: UAR compiler/IR/artifact persistence; BossFang translator; existing skill document adapters.
- Depends on: C01, C02. External checkpoints: D-MINI.
- Suggested executor: Codex; use an independent reviewer at acceptance. Size L; complexity High; model class frontier. Actual model/price/capability must be discovered at dispatch and recorded.
- Recommendation coverage: REC-054, REC-055.

- [x] C03.1: Specify exact versioned section headings and machine schemas for AgentDefinition, TeamDefinition, WorkflowDefinition, DeploymentBinding and private RepresentationGrant.
- [x] C03.2: Preserve skill version/required/config and v2 fields; implement field-level conversion diagnostics and effective runtime binding checks.
- [x] C03.3: Add legacy migration/import/export fixtures and immutable dependency resolution; keep installed grants and secrets out of packages.

**Acceptance:** Round-trip legacy and new definitions through persisted runtime, prove required skills/policies effective, reject unknown mandatory fields and required-unsupported exports.

**Compatibility and limits:** Existing format remains supported; draft examples are not executable until schema/adapter implementation passes.

### C04 — Replaceable service instances and placement

Reuse: library: cand-002 (adopt: Accepted P1 UAR driver and host bridge).

Choose local, managed, external or remote instances with explicit identity and ownership.

- Repositories: universal-agent-runtime, the-boss, librefang.
- Write scope: Existing runtime driver/service registry, connection inventory and service capability endpoints.
- Depends on: C01, C02, C03. External checkpoints: D-UAR-P1.
- Suggested executor: Codex; use an independent reviewer at acceptance. Size L; complexity High; model class frontier. Actual model/price/capability must be discovered at dispatch and recorded.
- Recommendation coverage: REC-002, REC-003, REC-004.

- [x] C04.1: Extend accepted P1 binding with stable instance identity, API/profile capabilities, workspace location, endpoint and credential references.
- [x] C04.2: Integrate managed versus externally owned lifecycle, new-session placement and reattachment; never silently spawn a fallback.
- [x] C04.3: Expose effective binding and compatibility diagnostics with one supervisor and separate model/runtime/console endpoints.

**Acceptance:** Select two UAR instances, refuse unsupported required capability and wrong identity, close a nonowner client without stopping service, distinguish new run from migration.

**Compatibility and limits:** No live-session migration implied; credentials stay in host stores.

### C05 — BossFang full-run delegation

Reuse: library: cand-002 (adopt: Accepted P1 UAR driver and host bridge).

A BossFang task can delegate one complete run while retaining its own workflow.

- Repositories: librefang, universal-agent-runtime.
- Write scope: BossFang runtime/task delegation, channel workflow references and UAR public run adapter; no librefang-cli edits.
- Depends on: C02, C03, C04. External checkpoints: D-UAR-P1.
- Suggested executor: Codex; use an independent reviewer at acceptance. Size L; complexity High; model class frontier. Actual model/price/capability must be discovered at dispatch and recorded.
- Recommendation coverage: REC-001, REC-005, REC-013.

- [x] C05.1: Add a full-harness route distinct from the existing HTTP model provider; preserve native execution and translated definition diagnostics.
- [x] C05.2: Map admission, steer, observe, approve, cancel, detach and native task IDs with durable or truthfully ephemeral retention metadata.
- [x] C05.3: Reconcile unknown admission/effect outcomes and unify externally visible A2A task lookup authority without a second loop or tool replay.

**Acceptance:** Trace direct versus delegated execution; lose responses and reconnect; one executor and one side effect remain, cancellation reaches UAR, unsupported recovery is explicit.

**Compatibility and limits:** Retain existing native route; stage consumer capability requirements after provider support.

### C06 — Durable addressable instances and bounded turns

Reuse: library: cand-001 (adapt: Existing UAR execution/thread/actor/compiler).

Stateful instances survive activation changes without becoming immortal model loops.

- Repositories: universal-agent-runtime, surreal-memory-server.
- Write scope: UAR existing actor/thread host, instance store and activation ownership; memory API only if an evidenced gap requires it.
- Depends on: C02, C03, C04. External checkpoints: D-UAR-P1, D-MEMORY.
- Suggested executor: Codex; use an independent reviewer at acceptance. Size L; complexity High; model class frontier. Actual model/price/capability must be discovered at dispatch and recorded.
- Recommendation coverage: REC-006, REC-026, REC-027, REC-028, REC-035.

- [x] C06.1: Implement owner-scoped instance/deployment records and request/on-demand/resident profiles over existing thread execution; fresh context per turn.
- [x] C06.2: Persist activation state and ownership epochs with bounded inbox/retention; serialize mutating turns and keep cancel/status outside the turn queue.
- [x] C06.3: Implement activate/passivate/drain/disable/restart policies, repeat-safe hooks, durable reminders and bounded restart budgets.

**Acceptance:** Two users instantiate one definition without leakage; crash/passivate/reactivate preserves admitted work; stale owner cannot commit; cancel remains responsive during a blocked tool.

**Compatibility and limits:** Single-host ownership first; cross-host automatic takeover stays disabled until C18 fencing evidence.

### C07 — Local scoped observers with durable delivery

An authorized observer watches selected agents/conversations and recovers missed work.

- Repositories: universal-agent-runtime.
- Write scope: UAR committed-event publication, subscription store/inbox and monitor admission API.
- Depends on: C02, C03, C06. External checkpoints: D-UAR-P1.
- Suggested executor: Codex; use an independent reviewer at acceptance. Size L; complexity High; model class frontier. Actual model/price/capability must be discovered at dispatch and recorded.
- Recommendation coverage: REC-029, REC-030, REC-034.

- [x] C07.1: Define stable semantic occurrence/provenance identities and source commit/outbox publication; separate ephemeral token streams.
- [x] C07.2: Persist subscription revision, source/conversation intersection, projection grant, watermark, cursor, inbox admission and per-observer acknowledgement.
- [x] C07.3: Activate independent bounded monitor turns with current authority; expose pause/backlog/retention/dead-letter state and replay-as-observe default.

**Acceptance:** Two monitors receive independent copies; producer/conversation filters prevent leakage; crash at publish/admit/ack boundaries recovers without silent loss; revocation blocks queued content.

**Compatibility and limits:** No forged shared parent root and no UI-SSE lifetime coupling; optional Fabric adapter follows C08.

### C08 — BossFang and Fabric observer routing

Reuse: library: cand-004 (adapt: Fabric and Forge production-readiness work).

Channel messages reach their declared handler and authorized observer copies across hosts.

- Repositories: librefang, universal-agent-runtime, flint-realtime-fabric, flint-gate.
- Write scope: BossFang source adapters/routing, Fabric envelope/consumer adapter and UAR recipient bridge.
- Depends on: C05, C07. External checkpoints: D-FRF, D-GATE.
- Suggested executor: Codex; use an independent reviewer at acceptance. Size L; complexity High; model class frontier. Actual model/price/capability must be discovered at dispatch and recorded.
- Recommendation coverage: REC-024, REC-031, REC-032, REC-033.

- [x] C08.1: Normalize provider/account/workspace/room/thread/sender plus chosen recipient into durable mappings; specify addressing and handler precedence with conflict behavior.
- [x] C08.2: Authorize source disclosure and recipient delivery/execution; retain source occurrence across forwarding and separate per-observer cursors from worker queue groups.
- [x] C08.3: Preserve route affinity on restart, enforce reply scopes, echo/action deduplication and causal-depth/fanout budgets; make executor control distinct from stream detach.

**Acceptance:** Restart each host while forwarding, match two handlers, replay and echo posts, revoke a queued subscription and test A-B-A reactions; no wrong recipient, duplicate action or hidden gap.

**Compatibility and limits:** Adapt accepted D-FRF control semantics before changing APIs; transport never becomes the agent executor.

### C09 — Bounded teams and shared task board

Reuse: library: cand-001 (adapt: Existing UAR execution/thread/actor/compiler).

Reusable teams coordinate bounded tasks without sharing all authority or memory.

- Repositories: universal-agent-runtime, surreal-memory-server.
- Write scope: UAR team domain/store, existing thread admission and memory scopes.
- Depends on: C02, C03, C04, C06. External checkpoints: D-UAR-P1, D-MEMORY.
- Suggested executor: Codex; use an independent reviewer at acceptance. Size L; complexity High; model class frontier. Actual model/price/capability must be discovered at dispatch and recorded.
- Recommendation coverage: REC-008, REC-043, REC-044, REC-045.

- [x] C09.1: Persist team instance/member revisions and task input/output/dependency contracts; support supervisor-worker, bounded map/reduce and peer board.
- [x] C09.2: Implement atomic claim/reassign with fenced epochs, task-state transitions, narrowed child authority, team mailbox grants and independent reviewer assignment.
- [ ] C09.3: Enforce aggregate reservations, selected context/artifact namespaces, membership revocation and canonical usage deduplication.

**Acceptance:** Competing workers cannot own one revision; stale worker/removal cannot cause new protected effect; parent cancel and independent peer lifetime remain distinct; team cap holds under concurrency.

**Compatibility and limits:** No replacement thread engine, global shared transcript or union of member permissions.

### C10 — Feedback workflow and governed connector effects

A product-feedback team produces one authorized issue and reviewable product/design follow-up.

- Repositories: universal-agent-runtime, librefang, the-boss, prometheus-skill-pack, prometheus-skills-mini, flint-gate, surreal-memory-server.
- Write scope: UAR workflow/effect records and connector boundary; BossFang feedback ingress; existing studio approval/artifact views; consume C02 Gate policy and C09 memory-scope/effect evidence; modify Gate or memory adapters only for a demonstrated integration gap with its owner.
- Depends on: C05, C07, C08, C09. External checkpoints: D-UAR-P1, D-MINI, D-GATE, D-MEMORY.
- Suggested executor: Codex; use an independent reviewer at acceptance. Size L; complexity High; model class frontier. Actual model/price/capability must be discovered at dispatch and recorded.
- Recommendation coverage: REC-039, REC-046, REC-053, REC-056, REC-059.

- [x] C10.1: Evaluate existing workflow substrate against durable waits/joins/retry/compensation requirements; choose one owner and pin definitions through restart.
- [ ] C10.2: Normalize GitHub issue action plus Notion/Slack/Jira read/draft/write adapters, target scopes, credential refs, trusted egress labels, intent/receipt and unknown-outcome reconciliation.
- [ ] C10.3: Wire observe/classify/deduplicate/draft/standing-policy intake and product/design/reviewer outputs with durable approvals and explicit implementation admission.

**Acceptance:** Real configured test accounts or controlled production-compatible endpoints demonstrate one issue after timeout/restart, no sensitive egress, no replay posts, no issue-to-implementation auto-authorization.

**Compatibility and limits:** Connector-specific idempotency and regulated-data eligibility are prerequisite evidence; no financial action in first slice.

### C11 — Authoritative business data and offline commands

Reuse: library: cand-004 (adapt: Fabric and Forge production-readiness work).

Offline business edits reconcile to one domain transaction and authorized read projections.

- Repositories: flint-forge, flint-realtime-fabric, flint-gate, know-me-system, know-me-app.
- Write scope: Forge domain commands/RLS/realtime adapters; KnowMe durable intent/read-model lanes; Fabric delivery.
- Depends on: C01, C02, C04. External checkpoints: D-FORGE, D-FRF, D-GATE, D-KNOWME.
- Suggested executor: Codex; use an independent reviewer at acceptance. Size L; complexity High; model class frontier. Actual model/price/capability must be discovered at dispatch and recorded.
- Recommendation coverage: REC-015, REC-016, REC-025.

- [ ] C11.1: Adopt accepted production-readiness changes; document route-specific auth/RLS and cursor/tombstone semantics.
- [ ] C11.2: Persist pending command atomically with local state; preserve idempotency through Forge transaction and authoritative result lookup.
- [ ] C11.3: Publish committed outbox/CDC facts and rebuild scoped read models with deletion/revocation and explicit retention-gap resnapshot.

**Acceptance:** Crash before/after commit and publication; replay duplicate/out-of-order commands and deletes; prove tenant isolation and pending versus committed UI states through real storage/network boundaries.

**Compatibility and limits:** Keep Forge-only applications independent of agent runtimes; schema changes append migrations and preserve rollback constraints.

### C12 — Personal peer sovereignty and consent

Reuse: library: cand-004 (adapt: Fabric and Forge production-readiness work).

Authorized devices synchronize selected personal documents without requiring vendor cloud.

- Repositories: know-me-system, know-me-app, flint-realtime-fabric, universal-agent-runtime.
- Write scope: KnowMe personal-data consent/pairing; embeddable Fabric peer profile and grant verification.
- Depends on: C01, C02, C04. External checkpoints: D-KNOWME, D-FRF.
- Suggested executor: Codex; use an independent reviewer at acceptance. Size L; complexity High; model class frontier. Actual model/price/capability must be discovered at dispatch and recorded.
- Recommendation coverage: REC-014, REC-017.

- [ ] C12.1: Define eligible personal data classes, peer identity/membership, key rotation/recovery and explicit offline grant validity; keep organization/runtime authority outside CRDT writes.
- [ ] C12.2: Compose durable authenticated peer transport and CRDT storage from existing modules; project personal context through consented scopes.
- [ ] C12.3: Implement removal/revocation/tombstone behavior, reconnection and inspectable consent history without claiming deletion of previously disclosed plaintext.

**Acceptance:** Pair two devices, disconnect/edit/reconnect, rotate/recover keys, revoke a peer and exceed offline validity; authorized documents converge and disallowed authority/data do not propagate.

**Compatibility and limits:** No blanket storage pin upgrade; measure and negotiate embedded dependency footprint.

### C13 — Embedded mobile and home/cloud execution profiles

KnowMe chooses an honest local or remote execution path across suspension and outages.

- Repositories: know-me-system, know-me-app, universal-agent-runtime, librefang.
- Write scope: KnowMe Rust core runtime routes, mobile lifecycle adapter and selected home/cloud binding.
- Depends on: C04, C06. External checkpoints: D-KNOWME, D-UAR-P1.
- Suggested executor: Codex; use an independent reviewer at acceptance. Size L; complexity High; model class frontier. Actual model/price/capability must be discovered at dispatch and recorded.
- Recommendation coverage: REC-020, REC-021, REC-036.

- [ ] C13.1: Reconcile local model/tool loop with embedded UAR route; pin SDK/features and preserve each product layer contract.
- [ ] C13.2: Specify offline/local, home, personal-cloud and enterprise profiles with required/optional services, inference availability and approved context placement.
- [ ] C13.3: Wire suspend/resume, pending/offline authority and persistent remote job observation; consume C11/C12 when enabling their data profiles.

**Acceptance:** Physical supported mobile device and desktop prove local useful work offline, correct suspension and remote continuity, no duplicate fallback and no private-memory upload without grant.

**Compatibility and limits:** C11/C12 are additional prerequisites for enterprise-sync/peer modes; basic standalone embedding does not depend on them. Acceptance is evaluated per profile: standalone embedding requires C04/C06; enterprise sync additionally requires C11; personal peer or home/cloud context requires C12; combined profiles require both C11 and C12. Private context upload is blocked until the corresponding grant boundary is proven.

### C14 — Studio administration and isolated service consoles

Reuse: library: cand-002 (adopt: Accepted P1 UAR driver and host bridge).

Operators can understand ownership, placement, grants and observer behavior from one studio.

- Repositories: the-boss, librefang, universal-agent-runtime.
- Write scope: Existing Boss connection/run/approval views and site-view host; BossFang console API.
- Scoped prerequisites: C03, C04, C05, C07, C09 and C10.1 for Teams; C14.4 then C14.3 after reusable teams. Original full-scope C10 workflow coverage remains without gating early Teams. External checkpoint: D-UAR-P1.
- Suggested executor: Codex; use an independent reviewer at acceptance. Size L; complexity High; model class frontier. Actual model/price/capability must be discovered at dispatch and recorded.
- Recommendation coverage: REC-009, REC-023.

- [ ] C14.1: Extend existing UAR UI with definition/instance/activation/run/team/workflow distinction, task graph, budgets, binding posture and subscription lag/failures.
- [ ] C14.2: Present correlated operation approvals with separate issuer challenges and authoritative decision state; expose cancel/detach/drain/stop as distinct supported verbs.
- [ ] C14.3: Launch BossFang domain console per instance/account with restricted origins, isolated partition and narrow auth handoff; retain browser fallback.

**Acceptance:** Two clients decide one challenge consistently; console account isolation/navigation and no generic privileged bridge are verified; unsupported controls and private data stay hidden.

**Compatibility and limits:** Preserve P1 product history and lifecycle architecture; do not duplicate specialized BossFang administration.

### C15 — Portable skills, plugin contracts and cross-harness handoff

library: cand-010 (adapt: existing Rust liter-llm and gateway discovery). UAR baseline c29af47be3439c69e1a3c124fdcf09ce4cbb5cba pins vendor/git/liter-llm at e627af981bcb06c7fc5da027731c182b044e25d1; src/llm/liter_driver.rs imports liter_llm. This is not LiteLLM. D-UAR-P1 and D-MINI must verify exact library version, maintenance/license, gateway/catalog compatibility and observed model capabilities before adoption; no upgrade is authorized by this reuse decision.

Reuse: library: cand-005 (adopt: Merged agent-team skills and Agent Skills format).

Teams can be configured and handed off with truthful native capabilities and bounded shared knowledge.

- Repositories: prometheus-skill-pack, prometheus-skills-mini, universal-agent-runtime, librefang, flint-forge, know-me-system, know-me-app.
- Write scope: Existing agent-team skill family/adapters; UAR/KnowMe/Kiln portable host interfaces and signed artifact admission.
- Depends on: C03, C09. External checkpoints: D-MINI, D-KNOWME, D-FORGE, D-UAR-P1.
- Suggested executor: Codex; use an independent reviewer at acceptance. Size L; complexity High; model class frontier. Actual model/price/capability must be discovered at dispatch and recorded.
- Recommendation coverage: REC-022, REC-037, REC-040, REC-041.

- [ ] C15.1: Reuse four merged skills; extend task-guided role selection and model strength/cost/capability routing through liter-llm with exact selected model recorded.
- [ ] C15.2: Validate all eight harness adapters against pinned CLI schemas; preserve native options/extensions and report unsupported agent/plugin/marketplace features; use Node.js/TypeScript 7 for authored shared hooks/scripts. Before authoring helpers, pin the exact Node.js and TypeScript 7 distribution and prove full/mini and harness adapter compatibility at D-MINI; if unavailable, record a blocker rather than substituting another language/version.
- [ ] C15.3: Bind reviewed skill locks and plugin manifest coverage to host grants; handoffs preserve task/revision, source hashes, dirty state, evidence, Karpathy logs and scoped shared-memory references.

**Acceptance:** Full/mini parity fixtures plus actual harness smoke workflows prove supported configuration round-trips and explicit refusal of required loss; tampered manifest or stale handoff cannot expand authority.

**Compatibility and limits:** Refresh primary CLI docs/Context7 before changing adapters. No claim of portable native sessions or Cedar enforcement inside arbitrary external harnesses.

### C16 — Specialist, marketing, product and design teams

Reuse: library: cand-005 (adopt: Merged agent-team skills and Agent Skills format).

A user can choose the smallest useful team and get accountable specialist outputs.

- Repositories: prometheus-skill-pack, prometheus-skills-mini, universal-agent-runtime, the-boss.
- Write scope: Role/team templates, skill selection guidance and studio team creation.
- Scoped prerequisites: C03/C09 and the Work surface for coding; C15.1/C15.3 for reusable authoring; C10 only for feedback-specific templates. BossFang console and all-harness qualification do not gate coding teams. External checkpoint: D-MINI.
- Suggested executor: Codex; use an independent reviewer at acceptance. Size L; complexity High; model class frontier. Actual model/price/capability must be discovered at dispatch and recorded.
- Recommendation coverage: REC-038, REC-047.

- [ ] C16.1: Add UI/UX, mobile, security, product, documentation and code-review roles with scope, outputs, evidence and separate evaluator assignments.
- [ ] C16.2: Compose coding, product research, marketing/brand, logo/mobile/design and customer-feedback teams with task-selected reviewed skills and connector action limits.
- [ ] C16.3: Add novice guidance, single-agent alternative, role combination rules and estimated model/cost classes; document regulated-profile applicability without certification claims.

**Acceptance:** Representative coding/design/marketing/documentation tasks produce accepted artifacts and independent findings; each generated team proposal contains a role-selection rationale, allowed-write scopes, estimated model/cost class and a complete operator-review checklist.

**Compatibility and limits:** Do not auto-install every catalog skill or confer send/publish/roadmap authority from a role title.

### C17 — Executive assistants and consented human representation

Executive support distinguishes role assistance, simulation, disclosed representation and delegated action.

- Repositories: universal-agent-runtime, know-me-system, know-me-app, flint-gate, the-boss.
- Write scope: Private representation/office grants, context selection, trusted issuer workflow and audit UI.
- Depends on: C02, C09, C10, C12, C16. External checkpoints: D-KNOWME, D-GATE.
- Suggested executor: Codex; use an independent reviewer at acceptance. Size L; complexity High; model class frontier. Actual model/price/capability must be discovered at dispatch and recorded.
- Recommendation coverage: REC-048, REC-049.

- [ ] C17.1: Define CEO/CFO/CIO/Chief Intelligence/Security/Marketing/Product and configurable office roles separately from human profiles; identify trusted grant issuers.
- [ ] C17.2: Implement consent, organizational assignment, data-use/communication/action scopes, expiry/revocation, offboarding and disclosure with pinned evidence.
- [ ] C17.3: Evaluate person-specific behavior on approved held-out scenarios; enforce separation of duties and real-human approval requirements.

**Acceptance:** Revoked/offboarded twin cannot gain new access or effects; simulated approvals never satisfy human checks; personal consent alone cannot authorize organizational spending.

**Compatibility and limits:** High-impact autonomous finance remains gated on separate authorized policy and connector evidence; no role title implies permission.

### C18 — Federated compatibility and release evidence

Supported profiles have reproducible interoperability, recovery and quality evidence.

- Repositories: universal-agent-runtime, librefang, the-boss, know-me-system, know-me-app, flint-gate, flint-realtime-fabric, flint-forge, surreal-memory-server, prometheus-skill-pack, prometheus-skills-mini.
- Write scope: Cross-repository manifests, conformance runners, scoped federation adapters and release documentation.
- Depends on: C05, C06, C08, C09, C10, C11, C12, C13, C14, C15, C16, C17. External checkpoints: D-UAR-P1, D-FRF, D-FORGE, D-GATE, D-MINI, D-KNOWME, D-MEMORY.
- Suggested executor: Codex; use an independent reviewer at acceptance. Size L; complexity High; model class frontier. Actual model/price/capability must be discovered at dispatch and recorded.
- Recommendation coverage: REC-057, REC-058, REC-060, REC-061.

- [ ] C18.1: Implement only required remaining federation/trust adapters with independent resource-side enforcement and capability refusal; prove state/effect fencing before optional takeover.
- [ ] C18.2: Run operational-mode matrix on exact source/payload/policy combinations; test upgrade, rollback, outage, retention gaps, restart and revoked authority.
- [ ] C18.3: Benchmark task quality, human correction, cost/latency, duplicate/unknown effects and administration effort against controlled baselines; publish supported/unsupported matrix and release evidence after authorization.

**Acceptance:** Each advertised mode passes real boundary scenarios on named hosts/platforms; unsupported features remain disabled; immutable pins and rollback constraints are auditable.

**Compatibility and limits:** One local Rust build writer while sharing host; no single green unit suite substitutes for installed multi-product acceptance.

## Governance of the plan

No proposed schema identifier is ratified by this document. C01/C03 settle exact names and migration surfaces through review. Recurring observer actions can use standing scoped policy; ordinary issue intake need not ask a human every time. Financial, legal, external publication and person-specific representation require their applicable separate authority. Planning grants none of those powers.

All 61 recommendation clusters appear in recommendations.json with source sections and acceptance. Source uncertainty and external ownership are explicit gates, not reasons to delete recommendations. Any later rejected or superseded recommendation must retain its disposition and rationale.

## Checkpoint and continuation

Select C14.1 through canonical KBD for Teams in Work. Refresh touched source claims before product implementation. This revision updates planning only; it does not certify team operation, publish a release or complete the parent phase.

## Profile release gate

C13 implementation/profile acceptance is distinct from release eligibility. Every C13 advertised supported profile, including home/personal-cloud, requires C18 evidence for that exact mode. C18 consumes C13 implementation; this release gate is not a reverse implementation dependency and must not create a DAG cycle.

## Review disposition

Plan review PASS with one warning: UAR dependency prose and the actual gitlink differ. An explicit immutable git ls-tree receipt verifies e627af981bcb06c7fc5da027731c182b044e25d1 at baseline c29af47be3439c69e1a3c124fdcf09ce4cbb5cba; the prose table still says c5c6caac617eb931cd5009146a70831422ec236c (1.18.2). This is documentation drift, not two selected dependencies. C01 must record both and assign reconciliation; C15 still waits for the accepted D-UAR-P1 receipt. No dependency was upgraded.

## Approved team execution architecture amendment — 2026-09-30

The child `uar-team-execution-architecture` supplies the controlling [execution profile](children/uar-team-execution-architecture/execution-profile-contract.md), [migration](children/uar-team-execution-architecture/legacy-migration.md) and [repair handoff](children/uar-team-execution-architecture/parent-repair-handoff.md). Canonical C09.1/C09.2 completion history is preserved. Finish corrective C09.3 delivery A before additive C09.4 delivery B (governed cooperating pair). Both require complete UI/locales/payload and their named build-and-operate boundary. The child must reflect and return before parent execution; no runtime conformance or successful delivery is credited by this documentation. See the parent OpenSpec architecture-recovery-amendment.md for scope and deferred owners.

## C14.4 — Shared BossFang/UAR desktop profile (new approved requirement)

- [ ] C14.4: Integrate BossFang with The Boss-owned UAR sidecar using admitted shared-instance bindings, distinct supervision and execution authority, correlated approvals/budgets/history, stable catalog references and restart/port-change recovery without duplicate sidecar or silent executor fallback.

OpenSpec task 1.4; model architecture; comes after reusable teams and before C14.3 MiniApp. Existing standalone BossFang/native executor remains. The completed boundary must operate a delegated workflow using the exact same UAR identity as Work, with approvals/cancellation/restart behavior and no second UAR.

### Shared-runtime packaging prerequisite

C14.4 includes the pinned BossFang executable, functional dashboard assets, integrity records and main-process supervision needed to operate the packaged shared-runtime profile. C14.3 consumes that payload for Apps/settings embedding and isolated navigation; retain its original packaging acceptance by mapping exact C14.4 receipts.


## Operator-approved BossFang accessibility repair — plan revision 9, 2026-10-05

The operator explicitly approved completing C14.4 and C14.3 now inside current Cadence iteration 8, while retaining the unfinished C14.1/C14.2 Teams delivery and its clock/history. This urgent repair overrides the prior ordering hold on BossFang; Teams remain part of the combined final functional operation and no prior task completion is reopened or fabricated.

BossFang must not bundle, install, spawn, restart, stop or supervise UAR. Replace its child supervisor with an authenticated selected-instance connection manager. The Boss alone supervises its packaged UAR and separately owns managed BossFang. Default BossFang loopback port 4545, automatic increments and explicit conflict errors, requested/effective port, save/restart, external ownership and native-executor compatibility are required. Existing runs retain admitted identities; new selection applies to new runs only.

The Boss issues native in-memory UAR grants through host-authenticated POST /api/uar/delegation-grants and revokes through DELETE /api/uar/delegation-grants/{id}. Credentials expire in 900 seconds and bind verified principal, explicit workspaces and operation scopes (discovery, model_read, model_completion, full_harness_delegation). Completion scope permits only the existing actual completion route; full-run diagnostic uses real native admission and execution, not a health-only certification. Runtime restart, generation/binding change invalidate authorization. Never forward the host launch token or trust caller principal headers for delegated credentials. External identities use configured authentication.

Apps automatically shows the actual orange BossFang mascot and embeds its actual /dashboard/ via the isolated MiniApp. Always-visible Settings /settings/bossfang provides managed/external configuration, protected credentials, lifecycle, logs, independent UAR instance selection default managed-local, applied/pending states and a streamed redacted diagnostic report. Typed IPC, preference sources/generation, settings search and every locale belong to the same increment.

User-invoked diagnostics separately report listening, authenticated, compatible, and delegation operational; include bounded real model use in disposable workspace, correlated completion and cancellation. Missing models/credentials have actionable configuration links. Four target pinned executables include embedded functional dashboard manifests: Mac ARM64/x64 and Windows x64/ARM64. Preserve no Linux installer publication.

Repository implementation ownership: UAR scoped change bossfang-scoped-delegation-grants; BossFang scoped selected-instance connection change; The Boss scoped accessibility/settings change. Root coordinates native payload manifests, importer and release pipeline. Three independent implementation writers; one build writer and one publisher. No intermediate checks or tests; complete all production wiring then pnpm build:mac:arm64, packaged Teams plus BossFang operation and failure/recovery scenarios. Native Windows installed acceptance remains separately pending.
