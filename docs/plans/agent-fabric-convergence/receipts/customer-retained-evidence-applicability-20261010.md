# Retained customer evidence: source applicability

Recorded 2026-10-10. Documentation-only inspection of committed source differences and existing immutable operation receipts; no application launch, inference, build, suite, external write, or ledger transition was performed for this report.

**Prior passing operations remain facts. Source compatibility can preserve their requirement coverage; it does not establish launch, packaging, installed acceptance, or changed-path operation for a newer candidate.** Portfolio qualification remains unchanged. Historical code completion and corrective work are recorded by the owning ledger, not inferred here.

## Exact source boundaries

| Boundary | Boss source | UAR source | Distribution meaning |
|---|---|---|---|
| Public 2.2.25 operations | `35eff8c8c40555a4a464ee03b7305bcc4949666b` | `60b5922e3e11dd73bfd8a47e5bc28f3c16332889` | Actual retained installed Mac application. |
| Corrected local 2.2.26 coding operation | `5b317b64c65928492f913fc41946d55ee099b472` | `1522f17944aec1e1a7db5eab3b647e732fc1a07f` | Local candidate; separate exact BossFang settings receipt uses Boss `e27bafa2135cd4244aff9dc1567facc538d6a1dd`. |
| Newly frozen local 2.2.27 source | `efc36dba3e482c30d4ce97874fed2f9573a38f1b` | `f55e6cf1dd0f2864b4426a614a2e8bc4dea42400` | Source freeze, not an operated or accepted installer in this report. |

The 2.2.27 freeze now contains coordinator instructions (`3e813a48`), the allowlisted diagnostic parser (`fbfda5cf`), and native failure diagnostics (`2bdc4784`/`f55e6cf1`); these are no longer merely proposed patches. Its local UAR source selects `f55e6cf1`. Its **public platform overrides still select Mac ARM64 `1522f179` and the other three platforms `60b5922e`** at this exact commit. Separately downloaded/published 1522 Windows payloads do not silently change these source pins or prove installed operation.

Dependency changes from the public baseline are mini `3a7c0d24` → `838371d3` and full `fd1e2c2d` → `bb8950b2`. Compass, Rust filesystem, Prometheus, pk, surreal-memory, liter-llm (`a6047386`, 2.1.1), and BossFang (`0899e499`) remain pinned to the same revisions across the inspected Boss boundaries. `scripts/package-prometheus.js` and the dependency lockfile do not introduce provider SDK upgrades in these changes.

## Contract-by-contract decision

| Prior operation | Retained evidence and reason | Changed or still missing coverage |
|---|---|---|
| Native Codex and Claude inference | Preserve actual initial responses and saved-history follow-up, semantic streaming, typed-IPC cancellation, persisted paused state, and post-cancel recovery. `PiRuntimeDriver.ts` and `ClaudeCodeRuntimeDriver.ts` are byte-identical across the inspected Boss boundaries; the native routes bypass the changed UAR instance/team path. The minimal operation environment now retains `USER`, fixing the observed native keychain identity problem. No API-key billing or gateway was substituted. | New candidate packaging/launch and installed acceptance remain separate. Sign-in refresh alone does **not** invalidate these passes. These receipts do not demonstrate UAR team-member executor support or clicking the renderer Stop button. |
| BossFang dashboard, delegation, approvals, cancellation | Preserve the public authenticated dashboard, correlated delegated workflow, explicit approval/denial, cancellation, and UAR process ownership results. The actual `src/main/services/bossFang/` and `src/main/ipc/handlers/bossFang.ts` contracts and pinned BossFang binary are unchanged. The later 2.2.26 receipt adds requested/effective port persistence, restart/reopen, and preservation of UAR PID. | Startup now honors stored native-tool preferences, and team turns honor stored resilience policy. Any delegated scenario depending on those changed selections needs its affected operation. An authenticated external-instance switch remains pending; health alone cannot certify it. Neither receipt establishes graceful UI quit or acceptance of 2.2.27. |
| Feedback-to-GitHub recovery | Preserve the existing draft, rendered dispatch outcome, same issue #63/effect identity, and read-only restart/upgrade reconciliation. Feedback administration source and dispatch identity contract are unchanged; the representation/diagnostic additions do not replace this path. | Reopen the existing receipt if affected candidate persistence changes later. Do not create another issue or replay the POST. New candidate acceptance is separate. |
| Reusable mixed-team catalog and runs | Preserve versioned model/skill bindings, immutable deployed package, three-member attempts/artifacts, visible output, revision isolation and reopen results as baseline coverage. `UarTeamAuthoringAdapter.ts` is unchanged. No replacement scheduler or catalog migration was introduced. | Team admission now resolves persisted resilience policy at each admitted turn; native tools resolve stored preferences at startup. Fresh coordinator package instructions now require new delegation command/task identities and preserve only retry/reference identities. Operate these affected tool-enabled and nested-delegation paths; the earlier mixed-team pass does not prove this newly generated prompt. Existing immutable bindings remain unchanged. |
| Packaged creator/handoff | Preserve actual mini creator/handoff ownership, task-readonly status, source drift/missing-source handling, legacy packets and revision refusal. Mini authoring/handoff trees are unchanged; the mini delta is Cadence history documentation plus `USER` preservation. Authored full creator/handoff source trees also remain unchanged. | Full generated Codex/Claude team export payloads changed. The selected packaged full verifier's `scripts/install-plugin-generation.js` changed activation/recovery/bootstrap behavior and `skill-system.json` changed its version/native dependency metadata. Therefore neither broad full-pack installation nor changed generated export/activation coverage is inherited wholesale. The previously failed reviewed-skill execution remains failed until an actual affected operation passes. |
| Durable represented turns and diagnostics | No previous passing representation operation is promoted. The observed failed receipts remain evidence of the defect. Owner-scoped submission, scoped grants and native startup repair are actual production changes. | Operate represented durable submission and the affected governance/recovery path. Static diagnostics now retain an allowlisted failure stage/code and UUID correlation; their visibility needs the affected failure operation. Uncertain outcomes remain uncertain, rather than being relabelled success. |

The ordinary gateway response is useful baseline evidence but cannot replace a tool-enabled team turn. Likewise the corrected 2.2.26 cancellation/workspace-isolation receipt covers its exact local source, not every newly authored 2.2.27 coordinator behavior.

## Immutable receipt references

These files retain the original source, artifact and operation provenance. SHA-256 values below identify the existing receipt bytes, not new candidate artifacts.

| Receipt under `receipts/` | SHA-256 |
|---|---|
| [Codex initial inference](customer-public-mac-2.2.25-codex-inference-20261009-operation.json) | `57b87ed6fb86e1bf9caaa6c34595df8c4804860ac2741753070f3dadb3978f96` |
| [Claude initial inference](customer-public-mac-2.2.25-claude-inference-20261009-operation.json) | `66f816c79efca70bab804af23d7a7ebb7ea3881676738030b8897cde5248104c` |
| [Native follow-up/cancellation/recovery](customer-public-mac-2.2.25-native-inference-lifecycle-20261009.json) | `c6cadb9a03687a16a5b540b799c1270469d0516e5a9ca1d21d24d5f995ea80de` |
| [BossFang public workflow](customer-public-mac-2.2.25-bossfang-20261009-operation.json) | `a8e17d82a47d00d9601438590b128968b7284c523d9401a6bfdbadebb68193bd` |
| [BossFang later settings/restart](customer-bossfang-settings-persistence-2.2.26-20261010.json) | `93cb6d5e626a1ed1a3d702b2b9c8186aef89d818983898ae3bd47d5421fade8a` |
| [Feedback recovery](customer-public-mac-2.2.25-feedback-recovery-20261009-operation.json) | `7a932c143c6f84b747a2fc49ad462109aeffb932b76cff076cf1409c959201b3` |
| [Mixed-team operation](customer-public-mac-2.2.25-reusable-team-20261009-operation.json) | `9fd640aa1b415615569f00481895b841acd5c9dd134821e0f698a3a977582c02` |
| [Creator/handoff](customer-public-mac-2.2.25-skills-handoff-20261009-operation.json) | `581d0098de4d274400fcef76d403f0f441d1050993189633f1bcf80e7a9075a0` |
| [Corrected coding cancellation/isolation](customer-coding-cancellation-isolation-2.2.26-20261010.json) | `4789bbd33d2c0f253f13c2816ed76838ecfbaf57a673378def126f2cb85b2348` |

Public 2.2.25 native operations name Mac DMG `deb59913074f3644daf1c2b2ab54db8f2e4c83be3f4d13f2ee5bf4c054a4d721`, ASAR `333d6396efd74fd3a9c0dabeaaa191d0b23ed53628a9e618338a055622bd2a1c`, and sidecar `31c2449c2c2d36a8335e406bf1dde67b28dc328e2560e3ce71f45985ef664716`. Native Codex used `openai-codex::gpt-6.1-sol`; native Claude used `claude-code::claude-fable-5`. The separate corrected openai-proxy is external full-stack provenance; it is not evidence of fresh bundled subscription-team readiness.

**Next boundary:** operate the changed team/representation/diagnostic and activation paths against the frozen final candidate, reuse the unaffected requirement evidence above, and separately obtain that candidate's packaged launch and required installed acceptance. Do not manufacture another delivery, portfolio completion, or passing operation from this source analysis.
