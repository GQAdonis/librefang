# D-UAR-P1 contract checkpoint

Status: **contract frozen; installed acceptance pending**. This is the C01.2 working receipt. It records the accepted architecture and module ownership without claiming that the external shipping checkpoint has passed.

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

The shipping receipt for 2.2.3 is SHA-256 `bde0411907e5f92c400ccace8ddf6d53c764374c81811baaf7f3201e38ab813a`.

- Apple Silicon: the shipping owner records the local installed gate as accepted. Its accepted local DMG checksum differs from the notarized published DMG checksum, so both identities remain explicit.
- Windows x64: the published installer exists and its bytes are recorded, but installed acceptance remains `pending-operator`. Required observation: UAR starts from the installed application and settings report the effective port, including port-1906 conflict handling.

Consequently D-UAR-P1 is not accepted. C01.2 remains open, and overlapping UAR/The Boss implementation stays blocked. C01.3 and later changes cannot use merged PRs as a substitute for this checkpoint.

Machine-readable details, exact commits, hashes and permitted work while pending are in [p1-contract-checkpoint.json](p1-contract-checkpoint.json).
