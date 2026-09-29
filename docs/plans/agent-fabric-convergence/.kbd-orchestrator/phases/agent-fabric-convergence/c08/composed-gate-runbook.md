# C08 service-boundary gate — prepared, not executed

The operator has deprioritized live Discord acceptance. Continue BossFang, Gate, Fabric, UAR and shared SurrealDB work without waiting for a disposable guild or bot credential. `scripts/integration/afc-c08-gate.mjs` prepares an honest service-boundary inspection. **No C08 gate has run, and no channel-source or cross-host acceptance is claimed.**

## Plan reconciliation

The [product design](../../../../../../../openspec/changes/afc-c08-channel-routing/design.md) describes one final gate containing provider ingress, conflict, observer fanout, grant revocation, restart/replay, reply echo, A→B→A, and detach/cancel. The source implements a qualified Discord-guild route but exposes no API that creates a normalized channel occurrence through the production channel bridge. Direct SurrealDB row insertion would bypass route admission, Gate, Fabric and UAR; it cannot establish an integration pass. No disposable Discord credential is available, and the operator does not want this dependency to hold up subsequent work.

Before calling the KBD phase complete, revise its accepted plan to separate **service-boundary integration** from **channel-source acceptance**. The former records exact binaries and source revisions, operational BossFang ×2, Gate, Fabric, UAR and SurrealDB 3.3.0, authenticated capabilities and durable observer state where an already-admitted source exists. The latter retains actual channel ingress, same-root causal reaction, grant timing, restart recovery, echo and runtime control as `UNSUPPORTED`/`UNVERIFIED` until observed. Live Discord network interoperability is outside the present customer priority and must not be presented as passed. `/api/channels/route-capability` currently advertises `cross_host_observers: false`; leave that unchanged.

Candidate source revisions are BossFang `bcdb61764` (plus any later exact head), Gate `b153970518b0f3ce6c83f41e7b9ac59f6187c0b2`, Fabric `8966d6b1fef002a663d98f762955b2d273f8c07d`, and UAR `b18397a3b23eb97a9e0da2618bc1747f99e7cc04`. These are **not accepted provider checkpoints**. Record final commits and binary hashes at execution.

## Read-only collector at the completed phase boundary

The collector calls BossFang `/api/channels/route-capability` on both hosts, Gate `/authority/channels/capabilities`, Fabric `/readyz`, UAR `/api/uar/channel-observers/v1/capabilities` and UAR subscriptions. It reads seven C08 durable tables through SurrealDB 3.x `POST /sql` ([official HTTP contract](https://surrealdb.com/docs/surrealdb/reference-guide/http-protocol)) and hashes supplied binary bytes. It sends no provider message, mutates no grant, restarts no process and writes no storage row. Those effects require their real owners.

Create a private config outside the repository. Credential **values** belong only in environment variables, not this file or a command line:

```json
{
  "services": {
    "bossA": {"url":"http://127.0.0.1:18789","tokenEnv":"C08_BOSS_A_TOKEN"},
    "bossB": {"url":"http://127.0.0.1:18790","tokenEnv":"C08_BOSS_B_TOKEN"},
    "gate": {"url":"http://127.0.0.1:4457","tokenEnv":"C08_GATE_EFFECT_TOKEN"},
    "fabric": {"url":"http://127.0.0.1:8080"},
    "uar": {"url":"http://127.0.0.1:1906","tokenEnv":"C08_UAR_HOST_TOKEN","workspace":"gate-workspace"}
  },
  "surreal": {"url":"http://127.0.0.1:8000","namespace":"gate-ns","database":"gate-db","userEnv":"C08_SURREAL_USER","passwordEnv":"C08_SURREAL_PASSWORD"},
  "binaries": {
    "bossA": {"path":"/absolute/path/bossfang","sourceRevision":"exact-source-sha"},
    "bossB": {"path":"/absolute/path/bossfang","sourceRevision":"exact-source-sha"},
    "gate": {"path":"/absolute/path/flint-gate","sourceRevision":"exact-source-sha"},
    "fabric": {"path":"/absolute/path/frf-gateway","sourceRevision":"exact-source-sha"},
    "uar": {"path":"/absolute/path/uar-sidecar","sourceRevision":"exact-source-sha"}
  },
  "evidence": {}
}
```

`surreal.tokenEnv` may replace user/password variables for bearer authentication. Optional `evidence` IDs correlate **already-admitted** sources and actions with live storage; the script never accepts them as outcomes. It emits only fingerprints and state. The verdict remains `unsupported` if the service probes succeed but mandatory channel outcomes are unproven; a contradictory live record returns `failed`.

```text
node scripts/integration/afc-c08-gate.mjs --config /private/c08.json --out /private/c08-receipt.json
```

Keep the private receipt and service logs out of the repository if they contain user scope IDs or content. A listening port, HTTP capability response, Fabric offset, synthetic SQL row or manually entered Boolean cannot certify cross-host channel operation.

## Acceptance gaps retained

- Source now resolves a native reply reference against a **same-scope completed outbound action** and derives parent lineage from BossFang storage rather than trusting sidecar parent metadata (`bcdb61764`). This source path has not been executed in the composed gate.
- A real A→B→A requires Gate-authorized revision-CAS reassignment A→B and B→A. Its causal sequence is A forward → A reply → B forward → B reply → attempted A forward under one root. A plain mention of B, an A→A echo or direct row insertion does not count. Five action rows alone cannot attest the corresponding authorization/effect boundary.
- Gate revocation-before-release, all three restart epochs, cross-scope refusal, injected provider echo, and Fabric detach versus owner cancellation have no complete combined receipt API in current source. The collector keeps them blocked even when nearby storage rows exist.
- UAR observer copies are independent deliveries, not permission to execute or post. Fabric offsets are transport positions, not subscriber cursors or execution ownership.

The source and service-boundary result can inform the next phase now. Do not mark the original C08 channel-source gate, provider acceptance, or installed Windows/Mac acceptance complete from this collector.
