# Assessment: agent-fabric-convergence

Date: 2026-09-24. Scope: cross-repository planning and source reconciliation. Build health and runtime conformance: **UNKNOWN — no product builds or tests were run**. Source evidence is not installed acceptance.

## Baseline and method

All 11 repositories were fetched from their configured `origin`, then branched from the resolved default-branch commit into separate worktrees. `repository-manifest.json` records the exact commits. Existing uncommitted files were not copied. Their original checkouts were not switched, reset or cleaned.

The five reports R1–R5 and the separate proposed standard R6 were written against older, often dirty working checkouts. They remain design inputs; findings must be rebound to the fetched commits. Targeted production-source inspection was performed for the highest-risk integration, policy, definition and dependency surfaces. This is an initiative assessment, not a complete fresh audit of every module. C01 below requires exact per-recommendation source disposition before implementation of the affected slice.

## Current findings

| Area | Status | Observed evidence and planning consequence |
|---|---|---|
| Isolated initiative workspace | DONE | Eleven worktrees on the requested branch; independent KBD project identity under this directory. Git isolation does not isolate runtime resources. |
| BossFang provider integration | PARTIAL | At `82809ab6719f`, `crates/librefang-llm-drivers/src/drivers/uar.rs` now uses a supervised HTTP endpoint and the OpenAI-compatible model surface. R1's direct Rust-wrapper description is superseded. Full-run delegation is still a separate requirement; model-call bridging does not transfer loop authority. |
| The Boss UAR integration | PARTIAL | At `2b57fa0164a5`, `src/main/ai/runtime/registerDrivers.ts` imports and registers `UarRuntimeDriver`; `src/main/ai/runtime/uar/UarSidecarService.ts` and binary-manager entries exist. The report's absent-driver finding is superseded. Installed readiness is not inferred from source. |
| UAR run/actor/subagent foundation | PARTIAL | Existing run/thread/actor/compiler surfaces remain the starting point at `c29af47be343`. Sidecar launch-security, principal and retention integration test sources exist. No results were collected here. A bounded search did not locate first-class `TeamDefinition`/`TeamInstance`; this is not a universal absence claim. |
| Governed startup | PARTIAL | Current `src/server.rs` still falls back to `GovernanceEngine::with_default_permit()` on policy-load error, while warning when Cedar is not compiled. The managed host's other governance checks must be assessed separately. Governed profile behavior requires route-complete verification, not a generic claim that all UAR is fail-open. |
| Direct tool boundary | PARTIAL | Current `src/uar/api/discovery.rs::execute_tool` calls `state.mcp.call_namespaced_tool` directly. Middleware is a separate layer; inventory both before deciding which enforcement is missing. Do not describe this source fact as an unauthenticated exploit. |
| Definition integrity | PARTIAL | Current `src/uar/compiler/to_artifact.rs` maps skills to `SkillPolicy.prefer` IDs; required/version/config preservation and effective policy installation remain explicit acceptance requirements. |
| Gate delegation | PARTIAL | At `0edb945f1d73`, token exchange still rejects supplied `actor_token`; arbitrary multi-hop delegation cannot be assumed. The original checkout also contains in-flight security edits. |
| Fabric and Forge convergence | PARTIAL | Production-readiness branches contain 12 and 4 commits respectively beyond their fetched default branches. Report findings about read lanes, cancellation, sync, RLS and durability need comparison with that work before assigning new fixes. |
| KnowMe composition | PARTIAL | Both app and system repositories exist and have distinct architectures. The system has embedded-UAR integration work; the app pins a separate Rust storage stack. Do not silently choose one product as the replacement for the other. |
| Dependency compatibility | PARTIAL | Current UAR, BossFang and surreal-memory source pins include SurrealDB 3.2.4. KnowMe app pins 3.0.5; KnowMe system `versions.toml` declares 3.2.1; Fabric declares 3.1.5. Source declarations require lockfile/feature verification. Process separation can permit different versions; in-process sharing cannot assume compatibility. No dependency upgrades are made here. |
| Skills | PARTIAL | Agent-team skill work is merged into the fetched mini/full sources and The Boss PR #3 is included in the fetched main history. Reuse the four skills, configuration and adapter contracts. New business-role coverage and runtime enforcement require separate evidence. |
| Observers, workflows, twins | PARTIAL | Reports establish useful primitives and explicit gaps. Their complete durable, scoped and governed cross-product behavior has not been demonstrated against these baselines. A resident process, transport subscription or persona definition is not sufficient evidence. |

## Active work and conflicts

The active Codex task **UAR Working Agent** is a protected external dependency. Its P1 plan owns sidecar security/runtime/session adapters, The Boss driver and lifecycle, host tool approvals, UI and native release packaging. It also has an integration-administration child. The convergence phase cannot claim those tasks or alter that task's canonical state.

The current P1 host contract gives The Boss canonical product conversation history and UAR execution ownership. R1 uses broader language about harness-owned history. Resolve the vocabulary: distinguish product conversation history, executor context/checkpoints, workflow records and projections. Do not introduce a second conflicting canonical transcript or overwrite the P1 contract.

The mini-pack's local `main` and `origin/main` are divergent (19 local-only and 9 remote-only commits at inventory time). The shared branch must not discard that local shipping work or treat the fetched mini baseline as an accepted future release candidate. Other divergences are in the manifest. A reconciliation gate is required before pin advancement.

## Goal progress

- Workspace isolation: MET for Git checkouts; no runtime isolation claims.
- Report reconciliation: PARTIAL, with concrete superseded findings and current blockers identified.
- Cross-project implementation plan: pending analysis/spec/plan stages.
- All recommendations implemented: NOT MET; implementation was not requested in this turn.
- External SaaS effects, digital-twin authority and publication: NOT enabled by planning.

## Constraints and unknowns

Preserve BossFang branding, storage and UAR additions; its CLI is outside this initiative's initial implementation scope. Respect per-repository version policy rather than copying stale pins from this task's original instructions. Keep KBD state, model routing, skill packages and runtime authority distinct. Knowledge logs may explain decisions but never issue grants or replace execution receipts.

Unmeasured: installed platform behavior, throughput, actor residency payoff, end-to-end revocation, remote fencing, connector idempotency, peer key recovery and product-level test coverage. No percentages are invented. Negative claims from older reports remain historical until their exact paths are rechecked or a current integration scenario demonstrates them.

## Proposed standard R6: reconciliation

R6 is a design proposal, not a sixth research report or an implemented profile. Its `urn:prometheus:uar:collaboration:draft-1` identifier remains provisional.

| R6 requirement | Source status / gap | Planned disposition |
|---|---|---|
| §§1–3 section-based authoring, IR and skill integrity | Existing parser/IR/artifact conversion; current preferred-ID mapping does not establish required/version/config retention | C03 repair and round-trip through effective runtime, preserving legacy headings |
| §2 five document kinds | Agent artifacts exist; bounded source search did not locate TeamDefinition/TeamInstance. Workflow/binding/representation records require exact mapping | C03 formal schemas; C04/C09/C10/C17 implement records through existing stores |
| §4 teams, task leases, peer budgets and independent review | Child threads/actors are reusable; team-scoped durable claim/fencing remains unverified | C09 extend host, never force peers into a forged parent root |
| §5 workflows, waits and uncertain effects | Existing graph path is a reuse candidate; complete restart/effect contract not established here | C10 measured build-versus-adopt decision and production recovery evidence |
| §6 binding receipts and negotiated profiles | New P1 sidecar/driver exists; ecosystem-wide profile binding not established | C04 adopt P1 contract and extend with explicit unsupported semantics |
| §7 governance | Current policy-load fallback and direct dispatch require route inventory; authored policy references are not grants | C02 verify each boundary before any expanded authority |
| §8 representation | Role prompts and personal consent are distinct; issuer/delegation/offboarding contract remains proposed | C17 grants and negative human-approval tests |
| §9 scoped subscriptions | Existing run events and channel plumbing are not proof of durable authorized delivery | C07 local inbox plus C08 source/recipient bridge |
| §10 examples | Illustrative companion records, not valid current parser inputs | C03 publish explicit migration fixtures, do not install examples |
| §11 conformance and loss reporting | No current ecosystem conformance results collected | C03/C15 loss diagnostics; C18 supported-profile evidence |
| §12 adoption | Governance and conversion precede empowered teams; feedback is first bounded business slice | C02→C03→C09/C10, with direct/BossFang acceptance |

## Connector integration assessment

BossFang has channel adapters and MCP extension configuration; UAR exposes MCP tool discovery/calling and the managed runtime tool path. These are reusable mechanisms, not evidence of uniform business-action policy. The source inventory in `source-evidence.json` records concrete paths at the new baselines. Notion, Slack, Jira and GitHub require an action-by-action mapping: read, draft, publish/update/delete, target account/project/channel, payload classification, credential binding and result reconciliation. C10 owns this boundary; C08 owns channel event provenance; C16 supplies task-specific role procedures. No connector was installed, authenticated, contacted or mutated for this assessment. Provider-native idempotency, search consistency, quotas and connector compliance remain unverified and must be assessed before enabling their corresponding effect.

## Complete recommendation disposition index

Every report recommendation cluster is accounted for below. A not-fully-rechecked item is a recorded evidence gap, not a confirmed missing feature or license to reimplement existing code. These dispositions are the assessment outcome; C01 refreshes them before each affected implementation.

| ID | Report section | Recommendation | Current-source verdict | Follow-up |
|---|---|---|---|---|
| REC-001 | R1 §3; R2 §4 | Separate provider bridging, native execution and full harness delegation | not fully rechecked | C05: Historical R1 §3; R2 §4; exact acceptance and current-source recheck assigned to C05 under C01 |
| REC-002 | R1 §3.2; R5 §4 | One executor, workflow owner and lifecycle supervisor per owned object | not fully rechecked | C04: Historical R1 §3.2; R5 §4; exact acceptance and current-source recheck assigned to C04 under C01 |
| REC-003 | R1 §3.3; R2 §7 | Instance inventory, endpoints, placement and capability negotiation | not fully rechecked | C04: Historical R1 §3.3; R2 §7; exact acceptance and current-source recheck assigned to C04 under C01 |
| REC-004 | R1 §3.4 | Separate new placement, reattachment and explicit migration | not fully rechecked | C04: Historical R1 §3.4; exact acceptance and current-source recheck assigned to C04 under C01 |
| REC-005 | R1 §5.1–5.3 | Admission, steer, cancellation, detach, replay and uncertain outcomes | not fully rechecked | C05: Historical R1 §5.1–5.3; exact acceptance and current-source recheck assigned to C05 under C01 |
| REC-006 | R1 §5.2; R3 §7 | Attached/background/workflow-child lifetime and checkpoint contracts | not fully rechecked | C06: Historical R1 §5.2; R3 §7; exact acceptance and current-source recheck assigned to C06 under C01 |
| REC-007 | R1 §5.4; R2 §5 | Separate product history, runtime checkpoints, workflow records and knowledge | not fully rechecked | C01: Historical R1 §5.4; R2 §5; exact acceptance and current-source recheck assigned to C01 under C01 |
| REC-008 | R1 §5.4 | Usage identity and aggregate budget accounting without double counting | not fully rechecked | C09: Historical R1 §5.4; exact acceptance and current-source recheck assigned to C09 under C01 |
| REC-009 | R1 §6; R2 §8 | Native UAR UI with isolated BossFang service-console view | not fully rechecked | C14: Historical R1 §6; R2 §8; exact acceptance and current-source recheck assigned to C14 under C01 |
| REC-010 | R1 §7; R2 §6 | Authenticate each boundary and attenuate delegated authority | not fully rechecked | C02: Historical R1 §7; R2 §6; exact acceptance and current-source recheck assigned to C02 under C01 |
| REC-011 | R1 §1.8; R2 §10 | Inventory real pins, schemas and API versions | not fully rechecked | C01: Historical R1 §1.8; R2 §10; exact acceptance and current-source recheck assigned to C01 under C01 |
| REC-012 | R1 §1.2; R1 §1.4 | Implement initial sidecar/driver wiring | superseded in part | C01: source-evidence.json: UAR driver and HTTP provider adapter |
| REC-013 | R1 §1.7 | Resolve A2A task authority and durability differences | not fully rechecked | C05: Historical R1 §1.7; exact acceptance and current-source recheck assigned to C05 under C01 |
| REC-014 | R2 §5 | Personal CRDT replication distinct from authoritative business data | not fully rechecked | C12: Historical R2 §5; exact acceptance and current-source recheck assigned to C12 under C01 |
| REC-015 | R2 §5 | Server-authoritative read shapes with authorized tombstones/resnapshot | not fully rechecked | C11: Historical R2 §5; exact acceptance and current-source recheck assigned to C11 under C01 |
| REC-016 | R2 §5 | Durable offline command outbox and transactional publication | not fully rechecked | C11: Historical R2 §5; exact acceptance and current-source recheck assigned to C11 under C01 |
| REC-017 | R2 §6 | Peer pairing, key lifecycle, selective consent and offline revocation policy | not fully rechecked | C12: Historical R2 §6; exact acceptance and current-source recheck assigned to C12 under C01 |
| REC-018 | R2 §6 | Verified subject/actor, issuer/audience and tenant mapping | confirmed partial gap | C02: source-evidence.json; narrow source conclusion only |
| REC-019 | R2 §6 approval; R5 §8 | One correlated operation with independently enforced approval challenges | not fully rechecked | C02: Historical R2 §6 approval; R5 §8; exact acceptance and current-source recheck assigned to C02 under C01 |
| REC-020 | R2 §7 | Personal offline, home, cloud, enterprise and independent deployment profiles | not fully rechecked | C13: Historical R2 §7; exact acceptance and current-source recheck assigned to C13 under C01 |
| REC-021 | R2 §3 KnowMe | Resolve existing KnowMe local loop versus embedded UAR route | not fully rechecked | C13: Historical R2 §3 KnowMe; exact acceptance and current-source recheck assigned to C13 under C01 |
| REC-022 | R2 §8 | Portable plugin host/WIT, signed manifest coverage and local grants | not fully rechecked | C15: Historical R2 §8; exact acceptance and current-source recheck assigned to C15 under C01 |
| REC-023 | R2 §8 | Separate UI authoring, binding, delivery and action execution authority | not fully rechecked | C14: Historical R2 §8; exact acceptance and current-source recheck assigned to C14 under C01 |
| REC-024 | R2 §3 Fabric; R2 §7 | Fabric transport control must not masquerade as execution control | not fully rechecked | C08: Historical R2 §3 Fabric; R2 §7; exact acceptance and current-source recheck assigned to C08 under C01 |
| REC-025 | R2 §3 Forge | Route-specific RLS/Keto/Cedar coverage and database transactions | not fully rechecked | C11: Historical R2 §3 Forge; exact acceptance and current-source recheck assigned to C11 under C01 |
| REC-026 | R3 §§1–3 | Separate definition, logical instance, activation, run and placement | not fully rechecked | C06: Historical R3 §§1–3; exact acceptance and current-source recheck assigned to C06 under C01 |
| REC-027 | R3 §§3–4 | Request execution default; on-demand and pinned-resident profiles | not fully rechecked | C06: Historical R3 §§3–4; exact acceptance and current-source recheck assigned to C06 under C01 |
| REC-028 | R3 §5 | Logical addresses, authenticated transport and fenced ownership | not fully rechecked | C06: Historical R3 §5; exact acceptance and current-source recheck assigned to C06 under C01 |
| REC-029 | R3 §6 | Durable inbox, admission acknowledgement and uncertain-effect ledger | not fully rechecked | C07: Historical R3 §6; exact acceptance and current-source recheck assigned to C07 under C01 |
| REC-030 | R3 §6.1–6.4 | Scoped local monitors of particular agents and conversations | not fully rechecked | C07: Historical R3 §6.1–6.4; exact acceptance and current-source recheck assigned to C07 under C01 |
| REC-031 | R3 §6.5 | BossFang channel normalization and agent-requested subscriptions | not fully rechecked | C08: Historical R3 §6.5; exact acceptance and current-source recheck assigned to C08 under C01 |
| REC-032 | R3 §6.6 | Handler selection separate from observer fanout and reply rights | not fully rechecked | C08: Historical R3 §6.6; exact acceptance and current-source recheck assigned to C08 under C01 |
| REC-033 | R3 §6.6–6.7 | Replay safety, provider-echo deduplication and causal-loop bounds | not fully rechecked | C08: Historical R3 §6.6–6.7; exact acceptance and current-source recheck assigned to C08 under C01 |
| REC-034 | R3 §6.7 | Watermark, retention gaps, pause semantics and subscription diagnostics | not fully rechecked | C07: Historical R3 §6.7; exact acceptance and current-source recheck assigned to C07 under C01 |
| REC-035 | R3 §7 | Lifecycle controls, timers/reminders, serialized turns and restart budgets | not fully rechecked | C06: Historical R3 §7; exact acceptance and current-source recheck assigned to C06 under C01 |
| REC-036 | R3 §8 | One scheduler per action and mobile suspension semantics | not fully rechecked | C13: Historical R3 §8; exact acceptance and current-source recheck assigned to C13 under C01 |
| REC-037 | R4 Parts I–II | KBD typed authority, bounded loops and independent evaluation | not fully rechecked | C15: Historical R4 Parts I–II; exact acceptance and current-source recheck assigned to C15 under C01 |
| REC-038 | R4 Part III; Addendum A | Six specialist roles with task-selected skills and distinct write scopes | not fully rechecked | C16: Historical R4 Part III; Addendum A; exact acceptance and current-source recheck assigned to C16 under C01 |
| REC-039 | R4 Addendum B | Feedback analyst and issue curator with standing intake authorization | not fully rechecked | C10: Prior research recommendation; current conformance requires C01 evidence. |
| REC-040 | R4 Addendum C | Reviewed, pinned skill identity, license and dependency lock | not fully rechecked | C15: Historical R4 Addendum C; exact acceptance and current-source recheck assigned to C15 under C01 |
| REC-041 | R4 Part IV–V | Eight harnesses, truthful capabilities and revision-bound handoff | not fully rechecked | C15: Historical R4 Part IV–V; exact acceptance and current-source recheck assigned to C15 under C01 |
| REC-042 | R4 §2.4; R5 §10 | Separate worktrees, single writers and compatible commit manifest | confirmed setup | C01: repository-manifest.json |
| REC-043 | R5 §§1–4 | Reuse existing UAR thread/actor/compiler instead of new model loop | not fully rechecked | C09: Historical R5 §§1–4; exact acceptance and current-source recheck assigned to C09 under C01 |
| REC-044 | R5 §5 | Team membership, atomic task claims, peer mailboxes and budgets | not fully rechecked | C09: Historical R5 §5; exact acceptance and current-source recheck assigned to C09 under C01 |
| REC-045 | R5 §5 | Explicit selected context, artifact namespaces and memory provenance | not fully rechecked | C09: Historical R5 §5; exact acceptance and current-source recheck assigned to C09 under C01 |
| REC-046 | R5 §5; §10 | Durable workflows, branch/join, waits, compensation and effects | not fully rechecked | C10: Historical R5 §5; §10; exact acceptance and current-source recheck assigned to C10 under C01 |
| REC-047 | R5 §6 | Coding, product, marketing and full design teams | not fully rechecked | C16: Historical R5 §6; exact acceptance and current-source recheck assigned to C16 under C01 |
| REC-048 | R5 §7 | Executive role assistants separate from person-specific twins | not fully rechecked | C17: Historical R5 §7; exact acceptance and current-source recheck assigned to C17 under C01 |
| REC-049 | R5 §7; R6 §8 | Consent, representation and organizational action grants | not fully rechecked | C17: Prior research recommendation; current conformance requires C01 evidence. |
| REC-050 | R5 §8 | Fail-closed governed profiles and schema-validated policy context | not fully rechecked | C02: Historical R5 §8; exact acceptance and current-source recheck assigned to C02 under C01 |
| REC-051 | R5 §8 | Restrictive composition of Cedar boundaries and policy binding receipt | not fully rechecked | C02: Historical R5 §8; exact acceptance and current-source recheck assigned to C02 under C01 |
| REC-052 | R5 §8 | Recheck authority after waits, payload changes and lease expiry | not fully rechecked | C02: Historical R5 §8; exact acceptance and current-source recheck assigned to C02 under C01 |
| REC-053 | R5 §8 | Host credential broker, egress labels and durable action audit | not fully rechecked | C10: Historical R5 §8; exact acceptance and current-source recheck assigned to C10 under C01 |
| REC-054 | R5 §9; R6 §§1–3 | Five document kinds extend section-based UAR-AGENT-MD | not fully rechecked | C03: Historical R5 §9; R6 §§1–3; exact acceptance and current-source recheck assigned to C03 under C01 |
| REC-055 | R5 §9; R6 §11 | Import/export loss reports, immutable dependencies and migrations | not fully rechecked | C03: Historical R5 §9; R6 §11; exact acceptance and current-source recheck assigned to C03 under C01 |
| REC-056 | R5 §10; R6 §12 | First thin product-feedback team through direct and BossFang routes | not fully rechecked | C10: Historical R5 §10; R6 §12; exact acceptance and current-source recheck assigned to C10 under C01 |
| REC-057 | R5 §10 | Measure quality, human correction, cost, recovery and admin burden | not fully rechecked | C18: Historical R5 §10; exact acceptance and current-source recheck assigned to C18 under C01 |
| REC-058 | R5 §8; §10; R6 §6 | Federation with independent resource-side checks and lower-trust placement | not fully rechecked | C18: Historical R5 §8; §10; R6 §6; exact acceptance and current-source recheck assigned to C18 under C01 |
| REC-059 | R1 §8; R5 §10 | Evaluate external workflow engine only if measured requirements justify it | not fully rechecked | C10: Historical R1 §8; R5 §10; exact acceptance and current-source recheck assigned to C10 under C01 |
| REC-060 | R3 §10 | Cross-host takeover and pinned residency require workload evidence | not fully rechecked | C18: Historical R3 §10; exact acceptance and current-source recheck assigned to C18 under C01 |
| REC-061 | R2 §7; R5 §10 | Tested release matrix and explicit upgrade/rollback compatibility | not fully rechecked | C18: Historical R2 §7; R5 §10; exact acceptance and current-source recheck assigned to C18 under C01 |

## Change identity index for the handoff

These are proposed change IDs, not completed specifications or implementation.

- C01: Baseline reconciliation and shared contracts.
- C02: Governed action and approval boundary.
- C03: Lossless definitions and collaboration document profile.
- C04: Replaceable service instances and placement.
- C05: BossFang full-run delegation.
- C06: Durable addressable instances and bounded turns.
- C07: Local scoped observers with durable delivery.
- C08: BossFang and Fabric observer routing.
- C09: Bounded teams and shared task board.
- C10: Feedback workflow and governed connector effects.
- C11: Authoritative business data and offline commands.
- C12: Personal peer sovereignty and consent.
- C13: Embedded mobile and home/cloud execution profiles.
- C14: Studio administration and isolated service consoles.
- C15: Portable skills, plugin contracts and cross-harness handoff.
- C16: Specialist, marketing, product and design teams.
- C17: Executive assistants and consented human representation.
- C18: Federated compatibility and release evidence.

## Operational authority and remaining evidence

The complete proposed operating-mode/acceptance matrix is [operational-modes.md](../../../operational-modes.md). In every mode the selected executor owns its run; the configured launch owner alone supervises the process; the admitted workflow owner controls its distinct child tasks; product/domain/memory owners retain their stores; every resource owner enforces its own policy. Managed Boss mode additionally preserves P1 host-owned product conversation history. These are target contracts, not observed mode-wide conformance. C04/C05/C11/C12/C13/C18 carry the differing deployment and data boundaries.

Observer gap: existing UAR actor/thread events and BossFang channel source adapters are building blocks; durable source outbox, per-observer inbox/cursor, current source/conversation projection grants and crash-safe routing remain unverified at these commits. C07/C08 must prove them. Workflow gap: R5 identifies a graph engine rather than general durable team scheduling; current adoption/recovery/effect ownership is a C09/C10 recheck. Twin gap: R6 representation and office grants are proposed contracts, not evidence that persona prompts can issue authority; C17 must inventory issuer/consent/retention and prove revocation. No runtime gap is called resolved from a schema or test filename alone.
