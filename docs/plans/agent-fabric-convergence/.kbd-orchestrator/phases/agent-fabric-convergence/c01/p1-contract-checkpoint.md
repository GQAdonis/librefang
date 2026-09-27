# D-UAR-P1 contract checkpoint

Status: **accepted**. This is the completed C01.2 receipt. It records the frozen architecture and module ownership together with the separate installed customer-platform evidence that satisfies D-UAR-P1.

The authoritative P1 contract is `the-boss.uar.sidecar/1`, SHA-256 `4517ae27474b417d23ffb237a5809b2675e40a92cad278006a1a9785a59b0a14`. The merged collaboration specification is UAR merge `cbb511ac61eb6b2928d7a80c67324baeb913ca11`; the merged convergence closeout is librefang merge `425b30e04388ac7fd42f5223bebc546942c39bf2`. These documentation merges freeze design intent. They are not installed-runtime evidence.

## Authority and state ownership

| Surface | Owner | Boundary |
|---|---|---|
| Product conversation | The Boss main process | Canonical product history, profile/workspace/conversation identity and user-facing runtime selection. |
| Credentials and MCP | The Boss main process | Protected credential lookup, immutable per-run catalog, MCP connections, host restrictions and exact tool admission. |
| Execution | UAR | One governed execution loop, run/step/invocation identity, child lineage, cancellation, executor context and checkpoints. |
| Presentation stream | UAR produces; The Boss adapts | Ordered AG-UI events and replay/gap outcomes remain UAR execution facts; The Boss persists product-visible conversation state. |
| BossFang delegation | BossFang kernel/workflow | The provider adapter delegates a bounded call. It does not transfer UAR execution ownership or create a second transcript. |
| Fabric and memory | Their existing services | Fabric transports events; memory retrieves scoped context. Neither schedules tasks or owns the execution loop. |

The host can restrict UAR policy but cannot enlarge it. A child may narrow its verified run envelope but cannot replace the principal, provider binding, MCP capture, policy ceiling or correlation lineage. Approval binds the exact invocation and canonical input digest; uncertain external outcomes are recorded rather than replayed automatically.

## Release checkpoint

The final shipping receipt for 2.2.3 is SHA-256 `8b738f3a9d917c126415a9c693ab306cc9bd0b2a39ac10278f8e8edfc8fe183d`. The closeout is committed as mini `5f43a25dd027311a8bcbc690eed022031d45aafd` and published for review in [prometheus-skills-mini PR #9](https://github.com/Prometheus-AGS/prometheus-skills-mini/pull/9).

- Apple Silicon: the shipping owner records the local installed gate as accepted. Its accepted local DMG checksum differs from the notarized published DMG checksum, so both identities remain explicit.
- Windows x64: the operator confirmed that installation worked and packaged UAR was active on preferred and effective port 1906. The installed walkthrough did not occupy port 1906, so Windows fallback is not claimed.

Consequently D-UAR-P1 is accepted. C01.2 may complete and C01.3 may publish the shared vocabulary and compatibility/adoption matrix. Later changes remain governed by their full dependency sets, repository-scoped tasks and explicit owners; this checkpoint does not complete P2-P5 or admit every convergence change.

The shipping ledger's original `integration-administration` phase was accidentally marked complete at canonical revisions 932–933 when `kbd-next-phase.mjs` treated `--help` as a phase name. Plan revision 4 created the corrective `integration-administration-closeout` child. That child completed at canonical revision 961, returned to `uar-working-agent` at revision 962, archived the 37/37 OpenSpec change and passed independent C5 goal evaluation. The read-only help fix and its Windows checkout correction merged through mini PR #8 as `f38a98a6ed064f9e5b8b9837e8b91781af570d22`; the final accepted closeout is mini `5f43a25dd027311a8bcbc690eed022031d45aafd`.

The [post-merge receipt](checkpoint-merge-receipt-2026-09-27.md) records that the earlier convergence reconciliation merged through BossFang PR #130 as `04a8a278d62e3c833da3906c5d32e2b734e14d15`. Those documentation merges froze the contract; the later installed Windows and Apple Silicon receipts provide the distinct runtime acceptance.

## Nonoverlapping I1 delivery

The completed `uar-team-definitions-deployment` child adds collaboration-package and deployment-binding administration without changing P1 conversation, approval, sidecar, or execution ownership. UAR remains the only execution-loop owner. I1 deliberately refuses team activation until the durable local-team runtime is implemented.

The child closed at canonical revision 195 after one authenticated creator-to-UAR integration gate against SurrealDB 3.3.0. UAR PR #304, mini PR #7, full skill-system PR #104, Compass PR #9, surreal-memory-server PR #28, and The Boss PR #10 merged on 26 September 2026. Their exact heads and merge commits, the SurrealDB 3.3.0 SDK/image pins, and the final evidence path are recorded in the machine-readable checkpoint.

This delivery advances the definitions/catalog inputs to C03. It did not itself satisfy Windows installed acceptance; the separate 2.2.3 closeout now does. I1 still does not admit I2 execution changes outside the ordered convergence dependencies.

## Acceptance evidence boundary

- Windows acceptance receipt SHA-256: `6685957d7bf2f60132795e48e41c3bff36cddaee3563be2383a4958cd00b34ae`.
- C1 certification SHA-256: `e49df1d81dad301e02e3b378831ddc51727f961da76630d6841b92d037cdd689`; result `PASS WITH LIMITATIONS`, zero critical findings.
- C2 OpenSpec archive receipt SHA-256: `321d096e444b3f166e6d5e52a3cbb16a92f7fe810bec3c0596a684aab0ffc6b5`.
- C5 independent goal-check SHA-256: `8829945e613d5b80f710034e17f2c8c26b3202aac00994cd95acc2ceb03528ba`; result `PASS`.
- Reflection and parent handoff SHA-256: `554c8da125e65b8ee071677e2155ec419535179d20140058b4f4d7d3ab45feb1` and `f9af414ef17064a26eed8ebbd63d22fb57f574e6acbf16b2cf265c853ae171b1`.

Windows occupied-port fallback remains unobserved. Apple Silicon separately observed fallback from 1906 to 1907. Gate V lacks its complete reporter transcript, and artifact refinement skipped because no manifest or constraints existed. These are retained evidence limits, not claims of broader P2-P5 or team-runtime conformance.

Machine-readable details, exact commits, hashes and permitted work while pending are in [p1-contract-checkpoint.json](p1-contract-checkpoint.json).
