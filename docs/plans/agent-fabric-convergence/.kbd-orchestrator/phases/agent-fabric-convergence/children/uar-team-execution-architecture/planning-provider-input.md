# Provider/Boss input to the bounded C09.3 plan

Planning input, 2026-09-29 America/Chicago. Read-only source inspection; only this document written. No implementation, dependency changes, probes, tests, builds, formatting or commits. The existing three-file UAR candidate patch remains intact and unverified. This input consumes the child's [analysis.md](analysis.md), rather than approving its wider B–D slices.

Baseline: UAR `006eeaf1f90e0a640b0f8fd568419badac5f4320` plus the preserved 29-insertion/7-deletion candidate; Boss `c00d9b68695fb452d1f09bd4b154582ecaad0035`. Latest failed operation and detailed evidence classification remain in [assessment-provider-boss.md](assessment-provider-boss.md). Consulted Boss providers/desktop role instructions; execution ownership remains UAR, credentials remain protected, listing remains distinct from inference.

## Intended slice and two joins that must be planned explicitly

Deliver slice A: an operator chooses a supported exact model route and persisted settings in Boss, installs/rebinds explicitly, runs a manually admitted member through the existing UAR kernel, and sees output or actionable localized refusal with truthful usage. Preserve the existing C09.3 operation's selected-artifact, scope, budget, cancel/revoke and restart requirements. Do not include cooperating-pair tools, shared team instructions, workflows, distributed takeover or new execution infrastructure in this provider repair.

The analysis names the correct existing seam, but attaching it is not yet a complete implementation:

1. **Qualified identity versus wire alias.** `DestinationRequestPreparation` indexes `provider_id/model_id`. The leaf requires a qualified driver model and, for its OpenAI-compatible profile, currently requires `wire_model == qualified_model`. Existing explicit-base-URL provider resolution deliberately gives the driver a bare served alias. For a hashed team provider this would either reject profile attachment or send the wrong model value if fixed by string substitution. Preserve separate exact route identity and wire alias, and bind both to the selected endpoint. See [preparation validation/index:294](/Users/gqadonis/Projects/prometheus/worktrees/agent-fabric-c09-uar/src/llm/orchestrator.rs:294), [leaf constraints:207](/Users/gqadonis/Projects/prometheus/worktrees/agent-fabric-c09-uar/src/llm/liter_driver.rs:207), and [bare alias routing:510](/Users/gqadonis/Projects/prometheus/worktrees/agent-fabric-c09-uar/src/llm/registry.rs:510).
2. **Settings compatibility versus guaranteed fit.** Destination preparation requires a `RequestBudgetContract`. Its exact helper explicitly describes a synthetic fixture, and the serialized counter marks cl100k JSON as exact or approximate by selected contract. Neither establishes Kimi gateway framing/tokenization. Do not clone `synthetic_exact` or infer a context/output limit from the pricing target. The leaf already supports profile field validation without a budget contract, but its destination-preparation join currently requires one. The plan must choose a settings-only profile path with explicit no-fit-guarantee provenance, or require a genuinely supported counting/limits contract and refuse the unresolved route. Aggregate reservations/accounting remain required in either case. This is an approval decision, not permission to silently relax an existing guaranteed-fit requirement. See [budget contract/helper:94](/Users/gqadonis/Projects/prometheus/worktrees/agent-fabric-c09-uar/src/uar/runtime/context/budget.rs:94), [count quality:20](/Users/gqadonis/Projects/prometheus/worktrees/agent-fabric-c09-uar/src/uar/runtime/context/token_service.rs:20), [leaf validation:327](/Users/gqadonis/Projects/prometheus/worktrees/agent-fabric-c09-uar/src/llm/liter_driver.rs:327), and [profile without budget:484](/Users/gqadonis/Projects/prometheus/worktrees/agent-fabric-c09-uar/src/llm/liter_driver.rs:484).

## Contracts to freeze first

Keep four values separate: UAR configured provider/model route; served gateway alias; canonical pricing identity; exact endpoint/profile/settings revision. Profile selection is a trusted UAR resolution, not a renderer-authored allowlist or arbitrary `extra_body` JSON. Unknown endpoint support remains unknown; `/models` and `supports_reasoning` alone do not certify accepted reasoning fields.

Proposed minimum persisted setting semantics:

- Default/omitted reasoning resolves to **off** for this team profile. It adds no model-family `thinking` parameter merely because history has multiple messages.
- An explicit reasoning request is required. If the exact endpoint profile cannot enforce it, setup/admission refuses before provider dispatch with a stable code and a safe explanation. It is never silently dropped or converted into a successful empty answer.
- A supported explicit request uses the existing `ReasoningEffort` vocabulary only where the profile maps it. Do not invent a universal effort enum or label unknown support as false model capability.
- Model context/output metadata is optional, with source/revision provenance. An operator-entered limit is identifiable as an operator assertion, not catalog certification. Preserve the conservative unknown-capacity path and its visible limitation.
- A private binding/effective receipt captures the resolved request-profile/settings revision. A later setting change requires an explicit revisioned setup/rebind; past attempts retain their captured identities.

Suggested typed exchange, with final names owned by the UAR contract writer: a profile reference `{id, revision}`; resolved endpoint kind, served alias, settings revision and effective reasoning mode; support disposition plus diagnostic codes; context/output metadata with provenance; and counting/fit disposition. Public views expose only safe metadata, never credential values. UAR's profile registry validates supplied references against the selected exact route; Boss cannot declare a profile eligible by constructing fields.

## Bounded implementation tasks and single-writer ownership

### P1 — Freeze route/profile/settings and diagnostic DTOs

**Owner:** UAR provider/compiler contract writer. **Depends on:** operator decision on the two joins above.

Define the minimal backward-readable private provider-model settings and effective receipt fields. Default existing omitted settings to the narrow off mode without rewriting historical documents. Resolve requested controls to supported/required-unsupported diagnostics. Freeze stable codes for route/profile mismatch, unsupported reasoning, unavailable limits/counting where required, and provider failure categories. Retain actual execution outcome separately from accounting uncertainty. Own `src/llm/registry.rs`, the relevant collaboration domain/schema/runtime-semantics files and `src/uar/api/providers.rs`; enumerate exact schema paths before dispatch. `ProviderView.models` already carries `ModelConfig`, providing an existing persistence/API seam. See [ModelConfig:76](/Users/gqadonis/Projects/prometheus/worktrees/agent-fabric-c09-uar/src/llm/registry.rs:76) and [ProviderView:578](/Users/gqadonis/Projects/prometheus/worktrees/agent-fabric-c09-uar/src/uar/api/providers.rs:578).

Completion artifact: frozen DTO/example for default off, supported explicit request and refused explicit request, with exact route/profile/settings identities and no raw request-body editing surface.

### P2 — Resolve and capture the exact profile on the existing member path

**Owner:** UAR runtime/provider writer; disjoint ownership from P1 after contract freeze. **Depends on:** P1.

Resolve from the exact installed member binding and selected provider configuration at admission/run capture. Build the existing `TemplateDestination`, `DestinationRequestPreparation(s)` and leaf endpoint profile from one authoritative resolution. Repair the qualified-route/wire-alias join without changing the served alias. Capture profile/settings revisions in the effective execution/attempt evidence. Attach preparation to the existing manager and profile to the actual captured leaf; do not only add metadata to a receipt. Ordinary, retry/resume and any allowed fallback must preserve the exact destination contract or refuse an unprofiled destination. Scope failover to the agreed A behavior rather than adding a new failover feature.

Own `src/uar/compiler/collaboration/team_execution/resolution.rs`, the bounded runtime model-capture seam, `src/llm/orchestrator.rs`, `src/llm/liter_driver.rs` and `src/llm/mod.rs`; manager changes require explicit single-writer assignment. Manager and orchestrator already expose injection points, but source search found no ordinary production constructor wiring those setters. See [manager setter:1510](/Users/gqadonis/Projects/prometheus/worktrees/agent-fabric-c09-uar/src/uar/runtime/manager.rs:1510), [manager propagation:5288](/Users/gqadonis/Projects/prometheus/worktrees/agent-fabric-c09-uar/src/uar/runtime/manager.rs:5288), [prepare_attempt:738](/Users/gqadonis/Projects/prometheus/worktrees/agent-fabric-c09-uar/src/llm/orchestrator.rs:738), and [leaf setter:114](/Users/gqadonis/Projects/prometheus/worktrees/agent-fabric-c09-uar/src/llm/liter_driver.rs:114).

### P3 — Integrate the preserved candidate and safe terminal diagnostics

**Owner:** same UAR runtime/provider writer as P2 to avoid candidate-file contention. **Depends on:** P1/P2.

Preserve/adapt the candidate's default-trigger removal and stable provider category mapping into the agreed profile path. Ensure both immediate stream-establishment failure and mid-stream provider failure produce a nonempty stable code. Keep a bounded protected diagnostic or scoped run reference alongside the code; do not project raw credentials/headers/request bodies. Team settlement must not discard that agreed diagnostic or accept an empty reason. Never clear reservations on failed requests without authoritative usage. Own candidate files plus `src/uar/runtime/team_execution/execution.rs`, settlement and domain fields only as required by the frozen DTO. The present failure join is [code-only result:42](/Users/gqadonis/Projects/prometheus/worktrees/agent-fabric-c09-uar/src/uar/runtime/team_execution/execution.rs:42); Boss currently preserves the supplied code.

### P4 — Persist and round-trip Boss model settings through existing typed administration

**Owner:** Boss desktop/provider writer. **Depends on:** P1 frozen DTO, with P2 resolver behavior available before completion.

Extend `UarModelSourceAdapter.ts`, `uarTeamModelSetup.ts`, shared model/provider and team types, fixed IPC schemas/handler only where necessary. Project profile/settings/support metadata safely; transmit only typed profile reference and requested mode. Keep protected gateway credentials in main/UAR. Carry exact target-derived metadata only when available. Preserve canonical `pricing_identity` and new settings on generic provider read/edit/save: current read projection and mutation omit pricing identity, so a settings-edit round trip must not accidentally strip it. Do not broaden this into provider cleanup. See [read projection:162](/Users/gqadonis/Projects/prometheus/worktrees/the-boss-d01-build/src/main/ai/runtime/uar/UarModelSourceAdapter.ts:162), [mutation:221](/Users/gqadonis/Projects/prometheus/worktrees/the-boss-d01-build/src/main/ai/runtime/uar/UarModelSourceAdapter.ts:221), and [typed model input:825](/Users/gqadonis/Projects/prometheus/worktrees/the-boss-d01-build/src/shared/types/prometheusIntegration.ts:825).

Extend explicit starter setup/rebind to capture settings/profile revision. Its existing binding key hashes only provider/model, and an active matching binding returns unchanged; define a deliberate settings-change identity/revision path so changing a UI setting cannot appear saved while retaining the old effective setting. Preserve package/scopes and historical receipts. Own `UarStarterAdministrationAdapter.ts` and `uarStarterDocuments.ts` for this join. See [key:184](/Users/gqadonis/Projects/prometheus/worktrees/the-boss-d01-build/src/main/ai/runtime/uar/UarStarterAdministrationAdapter.ts:184) and [active return:240](/Users/gqadonis/Projects/prometheus/worktrees/the-boss-d01-build/src/main/ai/runtime/uar/UarStarterAdministrationAdapter.ts:240).

### P5 — Complete settings, effective-state display and localized failures together

**Owner:** Boss renderer/i18n writer, explicitly separate from P4 if concurrent. **Depends on:** P1/P4 typed interfaces.

Update `UarTeamModelPicker.tsx` and Teams setup to display route/profile identity, effective default reasoning off and capability/limit unknowns. Provide an accessible explicit reasoning choice only with truthful support/refusal guidance; selection itself must not imply executable capability. Display requested versus effective settings and binding revision after setup. Extend `UarProvidersModelsPanel.tsx` only as necessary for saving the agreed persisted model settings; do not add raw provider parameter JSON. Its current model JSON editor cannot by itself be treated as a request-profile editor.

Update `UarTeamExecutionPanel.tsx` and the corresponding adapter DTO for stable localized category/action, safe detail/reference and separate execution/accounting states. Map agreed stable codes, not arbitrary provider prose to translation keys. Add every new label/refusal/help string to all 13 existing locale JSONs in the same delivery. Follow the existing setup pricing/binding-code mapping. Preserve output and actual marker contract. See [current code mapping:106](/Users/gqadonis/Projects/prometheus/worktrees/the-boss-d01-build/src/renderer/pages/settings/PrometheusSettings/UarTeamsPanel.tsx:106), [current reason rendering:262](/Users/gqadonis/Projects/prometheus/worktrees/the-boss-d01-build/src/renderer/pages/settings/PrometheusSettings/UarTeamExecutionPanel.tsx:262), and [provider model draft:51](/Users/gqadonis/Projects/prometheus/worktrees/the-boss-d01-build/src/renderer/pages/settings/PrometheusSettings/UarProvidersModelsPanel.tsx:51).

### P6 — Freeze the real-path scenario and exact bundled runtime before the gate

**Owner:** operation author and separate single-writer release owner. **Depends on:** production interfaces frozen; all P1–P5 complete before any build/operation.

Adapt `scripts/cadence/uar-team-execution-scenario.mjs` only for the new explicit default/profile/settings contract. Require chosen/effective route identity, persisted settings after reload/restart, actual succeeded outcome and exact marker, truthful unknown accounting, then the already-required context/isolation/budget/control/recovery rows. A requested unsupported reasoning row must show pre-dispatch refusal rather than silent dropping; exercise supported explicit reasoning only if A actually delivers a supported profile, without inventing another model target. Preserve safe diagnostic capture.

Release owner records frozen UAR commit, archive digest/size and local payload record, then updates only assigned Boss payload pins/manifests for that exact artifact. Use the existing payload pipeline; do not rewrite installers. `prepare-local-uar-payload.cjs` checks the local record through `local-uar-payload.cjs`; immutable imported records enforce source revision and SHA-256. Include the preserved candidate only once intentionally incorporated and frozen. See [payload entry](/Users/gqadonis/Projects/prometheus/worktrees/the-boss-d01-build/scripts/prepare-local-uar-payload.cjs:1) and [immutable source validation:135](/Users/gqadonis/Projects/prometheus/worktrees/the-boss-d01-build/scripts/import-uar-sidecar-payloads.cjs:135).

### P7 — One completed-delivery build and operation; repair only observed failures

**Owner:** designated release/build writer; independent evidence review after complete delivery.

After all production source, UI, IPC, locales, scenario and payload are complete, execute the required Mac ARM64 build and real packaged C09.3 operation. Record source revisions, payload/app digest, profile/settings identities, exact operation result, scope and accounting disposition. Fix observed failed boundaries and rerun only those. No per-task mock/unit/compiler gates constitute delivery. Keep prior failures immutable; C09.3 stays pending until its real operation passes. Remote backend qualification, Windows installed acceptance, public publication and B–D collaboration capability remain separate; do not imply those from the local gate.

## Plan freeze decisions

The parent must explicitly choose the settings-only versus guaranteed-fit profile contract, route/alias identity representation, exact default-off supported gateway schema and provenance, persisted settings/rebind semantics, safe diagnostic DTO, and initially supported deployment/backend scope. A known upstream model family or canonical price entry cannot answer these choices. All proposed field names above are planning suggestions until the contract writer freezes them. No fabricated time or throughput estimate is supplied.
