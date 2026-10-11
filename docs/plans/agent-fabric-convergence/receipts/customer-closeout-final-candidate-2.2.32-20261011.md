# Final customer candidate 2.2.32 — CLOSED core customer milestone

Initially recorded 2026-10-11T13:51:57.801Z; scope closeout recorded 2026-10-11T14:01:11.083Z. **Core customer milestone: CLOSED by explicit operator direction.** The operator authorized closing the accepted core, tracking representation qualification separately, preserving both acceptances and evidence, committing/pushing, and stopping approval cycles. The lead owns canonical transitions, final review and commits; this document reports the approved scope disposition, not a claim that this role performed those actions.

The closed core covers the accepted Mac ARM64 and Windows x64 public 2.2.32 candidate, retained launch/Teams Work/inference/BossFang/shared UAR/settings evidence, required-platform publication and historical Cadence reconciliation. **Synthetic executive representation is expressly excluded from this core milestone and has not passed.** Its original predicates remain in the [separate qualification follow-up](representation-qualification-followup-20261011.md). This operator scope revision supersedes the earlier pending-core closeout wording without changing the historical acceptance JSON or raw operation receipts.

The human answered **“Both 2.2.32 platforms accepted”** to the question naming the exact public Mac ARM64 DMG and Windows x64 setup and installed launch, Teams Work, inference, BossFang/shared UAR and persisted settings. Response reference: `request_user_input_async/call_38401ce9ac584989873348031f7159d1/0`. The [acceptance receipt](integrated-operator-acceptance-2.2.32-20261011.json) records **operator-reported installed operation and acceptance on both platforms**. Windows execution was not independently observed by this record role; retained independent Windows evidence covers installer bytes and publication. Human acceptance does not supply the missing synthetic authority operation.

## Exact public candidate identities

| Platform | Application source | Installer bytes | SHA-256 | Signing |
|---|---|---:|---|---|
| [Mac ARM64 DMG](https://github.com/Prometheus-AGS/the-boss/releases/download/v2.2.32/The-Boss-2.2.32-mac-arm64.dmg) | `46d68291aec8dfa57a41f0453af22050fd34a035` | 717484482 | `453a66c892460d5e849ab262518d8b7f415bc30f7acdce5db021a40f76865920` | Developer ID; retained signature/Gatekeeper/notarization checks passed |
| [Windows x64 setup](https://github.com/Prometheus-AGS/the-boss/releases/download/v2.2.32/The-Boss-2.2.32-win-x64-setup.exe) | `5f3f33d4f2f19d9a399547a693ba1fa23344bbef` | 529818664 | `e2cf1933fd9c01f1854011585edb03e1a6cfb3882afad5d5667f3b2f3a50393a` | Unsigned |

The Mac and Windows application source heads are platform-specific. Shared recorded UAR source is `74194623b17e5db127534b0f0469f8557794d4bc`, BossFang `92bc005f3e7cc110715272b744830d2e3ccfe0d7`, mini `6c63c0acec67444e30f65461836e7a943316e242`, and full skill pack `547a9bc93de61246bbe38567796d5fa2d0f616f0`. The acceptance receipt retains the complete publication source-reference closure.

The public Mac payload hashes are ASAR `8832383025dc209fbbbc44534d0e0ace4b64f5089c93c9ec60b88ec1b42bcc19`, UAR sidecar `a83cf8af2069db2c03aae72f15311c4b2ca7472b0f96d584ff658fb260461bd9`, and BossFang `d95a6f8e5e64d0fd94502ef2717ce2e7ccade9d3e5121d2f9a99a957a2993396`. Earlier local 2.2.32 installation and lifecycle operations have different payload hashes and retain their original identities. No historical operation has been reassigned to public bytes.

## Retained completed evidence

- [Required-platform publication reconciliation](integrated-customer-publication-reconciled-2.2.32-20261011.json) records matching public release, metadata and [live website](https://the-boss.know-me.tools); metadata commit `f7f82e312fcdccb9701cefbaa3ade7cb821dd6d9`, landing commit `9bfd716fbc5cfa3a1cffba574593730054ae4e5a`. Its later completed record resolves the earlier two-platform receipt’s pending live-site status.
- [Public Mac shared-runtime startup](integrated-public-mac-shared-runtime-passed-2.2.32-20261011.json) records managed UAR v2 startup, authenticated shared BossFang connection and owned BossFang stop preserving UAR. That retained operation explicitly adds no independently observed inference or human acceptance; human acceptance is recorded separately above.
- [Coverage delta](customer-integrated-coverage-delta-2.2.32-20261011.json) and [coverage addendum](customer-integrated-coverage-addendum-2.2.32-20261011.json) preserve historical Teams, ordinary Work, reviewed-skill/handoff and native-provider applicability without relabelling old operation bytes. The addendum records the exact local candidate’s pending-approval restart/history and graceful Quit subsets.
- Feedback issue #63 keeps its original approved effect and GET-only recovery provenance. This record performs no new external write.

## Separate representation follow-up and closeout ownership

The [representation follow-up](representation-qualification-followup-20261011.md) retains the first operator-interrupted read and its read-only recovery evidence, and the separately approved replacement attempt’s `C17_REAL_READ_OR_DISCLOSURE_NOT_OBSERVED` outcome. Both are incomplete; approval/native resolution does not confer a representation pass. The replacement’s combined assertion does not establish which predicate failed or a product defect.

No further approval/read cycles or new operation gates are part of this core closeout. The lead handles the bounded final evidence review, applicable OpenSpec verification, satisfied-only archive, reflection, canonical scope disposition and commit/push under the operator’s authorization. This documentation role does not report those lead-owned steps as performed. The broader portfolio remains open for its original unfinished predicates, including full connector/intake, authoritative offline data, peer consent, mobile/home/cloud profiles, eight-harness compatibility, executive representation and federation/mode/comparative evidence.

## Preserved accounting and scope

Historical source remains **61/61 tasks, 20/20 changes**. Original portfolio remains **43/61 terminal = 42 qualified + one historical skipped duplicate**. The pre-closeout child snapshot is **7/9 tasks, 3/4 changes**; any supported canonical closeout transition is lead-owned and is not performed or credited by this document. Cadence remains **17 successful deliveries**, `publicationDue=false`, with its existing 120-minute clock, every-second-delivery frequency and immutable history preserved. This documentation adds **zero delivery or canonical task credit** and mutates no KBD, OpenSpec or Cadence state.

Only **Mac ARM64 and Windows x64** are required for this customer build/publication boundary. Mac Intel, Windows ARM64 and Linux remain deferred; historical wider releases retain their provenance.

## Record integrity and verification limit

The original acceptance/closeout pair was completed and checked as one documentation boundary. This operator-directed revision updates only this authored closeout and creates the separate representation follow-up. Retained receipt byte hashes provide provenance; they are not new product-operation verification. No product operation, test, build, service change, source edit, branch change or commit was performed by this role. No security hardening was added.

| Receipt | SHA-256 |
|---|---|
| Acceptance record | `aab3049250843e7d9cacf73e2fb1850fd7b08138b5ebc45bea823be38f9a8d30` |
| Publication reconciliation | `1dd527c6464d14ba9e8b66843487487bb7257f61aaa67c28cb965db005e1789a` |
| Public Mac shared-runtime startup | `a3d12614e84eadfcfa2ffc65479a8c79b19b61836dd1202f7a0656afe80309eb` |
| Public Mac installation | `984cb6c8924da4c92cfac695e0dea90d0c5913895824d2d23f0a7dbc795958e2` |
| Windows downloaded-byte verification | `b6b587dd98eae63b9c7298f70686e48acd6452e123aa6256e46f8cbe3838c648` |
| Coverage addendum | `6f1b7ae50d3ae65c759d9a8520ce0733524c6a6e0fe50b53396ea98a5239cda6` |
| Coverage delta | `1ac71c673adcf6dbdbb0d94eaed4c52f1443eb0187f1a0e359bd1e85037cce72` |

Core acceptance is closed on the operator’s installed-operation report for both exact platforms; independent native Windows execution remains unobserved by this role. Representation read/disclosure/refusal qualification and the interrupted original run’s final outcome remain unqualified in the separate follow-up. No missing representation predicate is marked passed or used to advance whole-portfolio qualification.

## Completed canonical closeout

The lead completed the child at 9/9 tasks and 4/4 changes through typed KBD and kbd-apply transitions. All four child OpenSpec changes were verified and archived, Execute and Reflect completed, and the parent waypoint restored. See [actual lifecycle receipt](core-closeout-lifecycle-20261011.json). Core-only acceptance is closed; representation and broader portfolio qualification remain open. Cadence retains 17 deliveries, its original start time and no publication debt.
