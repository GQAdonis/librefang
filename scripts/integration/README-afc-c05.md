# C05 managed-sidecar production gate

Build `bossfang` from this C05 checkout and `universal-agent-runtime`, `uar-sidecar`, and `stub-llm` from the C05 UAR checkout. Run the gate once, after implementation is complete:

```text
node scripts/integration/afc-c05-gate.mjs \
  --boss-bin /absolute/path/to/bossfang \
  --uar-bin /absolute/path/to/universal-agent-runtime \
  --sidecar-bin /absolute/path/to/uar-sidecar \
  --stub-bin /absolute/path/to/stub-llm \
  --uar-root /absolute/path/to/uar-c05-checkout \
  --root /absolute/path/for-gate-artifacts
```

`--root` is optional; the script creates a fresh private child directory beneath it or in the system temporary directory. It stores isolated SurrealKV data, process logs, and `receipt.json` there, prints `C05_GATE_RECEIPT=...` on success, and stops its child processes. It never connects to an existing BossFang/UAR instance.

The gate adapts the checked-in C03 package in its private fixture directory to enable `terminal_exec`, recomputes exact definition and package digests, and installs the package, grant, and binding as the same principal BossFang later asserts to its managed sidecar. It checks the real supervised sidecar binding; a dropped Boss-to-UAR admission response and same-key reconciliation; one approved UAR-owned tool effect that appends exactly one line despite replay; lookup and events; wrong-approval refusal; cancellation acknowledgement and terminal state; detach without cancellation; typed steer refusal; exact definition identity and diagnostics; root A2A lookup; changed-request conflict; and unauthenticated refusal. The gate-only sidecar proxy in `afc-c05-sidecar-proxy.mjs` transports the private launch token over stdin and drops one accepted admission response. It does not execute tools or change product code.

The harness has no dependency on the repository's Cargo target layout. Pass the four exact binary paths built for this gate. Process logs may contain sensitive local test details; keep the artifact directory private.
