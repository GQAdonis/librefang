# C08 composed production gate — runbook and blank receipt

**Prepared, not executed.** Run this once after C08.1–C08.3 production wiring is complete. This document is an execution checklist and evidence template, not a passing receipt. Do not substitute unit tests, a static source trace, or the C07 local-observer gate. If a required scenario fails, fix the finding and rerun only this composed gate. Keep the cross-host profile unsupported until it passes.

## Frozen inputs before the run

Record exact Git SHAs for BossFang, Gate, Fabric, and UAR, the SurrealDB server/image digest and client pins, Iggy image/revision, policy and grant revision, adapter/sidecar revision, workspace/binding revision, and binaries actually started. The source candidates at preparation are BossFang `b75886ad3bf52f1d9cd6b71279b09cc83f0b6656`, Gate `b153970518b0f3ce6c83f41e7b9ac59f6187c0b2`, Fabric `8966d6b1fef002a663d98f762955b2d273f8c07d`, and UAR `b18397a3b23eb97a9e0da2618bc1747f99e7cc04`. They are **not accepted checkpoints**; replace them with the final source heads before execution. BossFang, UAR, and Fabric source manifests pin the SurrealDB 3.3.0 client; the server used by this gate must be recorded separately.

Use a private Gate admin address, one shared remote SurrealDB 3.3.0 database for both BossFang hosts, durable UAR channel-observer storage, and the Fabric Iggy broker. Keep test workspaces, sidecar instances, ports, and persistent stores isolated from customer data. Do not print bearer tokens, grant secrets, database passwords, message content, or raw provider payload into this receipt. Use distinct verified credentials for Gate grant administration (`afc.channel.grants.write`) and effect execution (`afc.channel.effects.execute`); the UAR sidecar receives only the latter through BossFang's `LIBREFANG_UAR_CHANNEL_GATE_EFFECT_TOKEN` handoff.

| Component | Actual startup/configuration source to use | Required readiness evidence |
|---|---|---|
| Gate | `flint-gate` binary from `crates/flint-gate`; `config.example.yaml`/private config, Postgres-backed authority migration `0007_channel_effect_authority.sql`, private admin listener (default `:4457`). `POST /authority/channels/{grants,evaluate,release}` and `GET /authority/channels/capabilities` are in `crates/flint-gate-core/src/admin/mod.rs`. | Process and Postgres healthy; versioned authority capability returned with authenticated caller. A port listening alone does not prove authority operational. |
| Fabric | `frf-gateway` from `crates/frf-gateway`; its `Config::from_env` requires `IGGY_CONNECTION_STRING`, `GATEWAY_JWKS_URL`, `JWT_AUDIENCE`, and either Keto configuration or `AUTHZ_BACKEND=verified-identity`. HTTP bind defaults to `:8080`; gRPC to `:9090`. `frf.routed-observer/1` is defined in `crates/frf-domain/src/routed_observer.rs`. | Gateway, broker, identity verification, versioned publish and replay operational. A transport offset is not a subscriber cursor. |
| UAR | BossFang supervises `uar-sidecar`; `src/bin/uar-sidecar.rs` requires its launch token on stdin, binds loopback from port 1906 upward, and emits `READY:{port}`. Its independent `/api/uar/channel-observers/v1/capabilities` and subscription/delivery APIs are registered in `src/server.rs`; the C07 `/observers/v1` profile is separate. | Effective sidecar port, authenticated `uar.channel-source/1` capability, shared durable store and two independent subscription IDs/cursors. Do not start the sidecar manually without its supervised token contract. |
| BossFang | `bossfang start --foreground` from the `librefang-cli` binary, with a distinct home/config/API port per host and one shared remote `[storage.backend]`. Gate URL, effect token, and service identity come from `crates/librefang-api/src/channel_authority.rs`. `GET /api/channels/route-capability` describes the local profile. | Both hosts have distinct process identity, same route store, operational local route capability, and actual Discord guild metadata/native IDs. Discord DMs, other adapters, batches, incomplete native identity, and SQLite are legacy/unsupported for this profile. |

Build these binaries serially where they share a Rust target directory; do not launch another writer against the same target. Record build exit and artifact identity as part of this **final** gate, not as an earlier standalone verification loop. Use the real Discord guild adapter and a disposable guild/room. Configure a separate explicit operator grant for reassignment; a mention alone cannot displace retained affinity.

## One composed scenario

1. Admit a native Discord guild message whose two equal-priority bindings select different handlers. Capture the single immutable occurrence, `RouteOutcome::Conflict`, and absence of handler action. Grant and perform a revision-checked explicit reassignment through `POST /api/channels/route-reassign`; admit the next native message and record the chosen handler/revision. A plain mention of another handler while affinity exists must be refused.
2. Create two authorized UAR channel-source subscriptions and one denied subscriber, all scoped to the exact provider/account/workspace/room/thread/source. Admit one source. Confirm independent delivery IDs, cursors and acknowledgments for the two authorized subscribers, no content or delivery for the denied third, and exactly one selected execution-loop owner. Record separate Gate source-disclosure, recipient-delivery and handler-execution effect receipts.
3. Hold one queued delivery, revoke its grant, then release the queue. Capture the current Gate denial/withheld result. Restart BossFang, Fabric and UAR at the documented boundaries, replay the transport record, and capture retained route affinity and each subscriber's independently persisted cursor. A Fabric group offset must not be used as an observer cursor.
4. Issue one authorized reply in the exact source scope, replay the source and inject the provider echo. Record stable action ID and one outbound post; uncertain outcome must remain uncertain until reconciled, never be blindly resent. Attempt a different room/account/workspace/thread and require a separate current grant or a refusal.
5. Attempt a rooted A→B→A reaction and fanout/depth exhaustion. Capture the root, parent action, visited route set, cumulative fanout/depth and terminal suppression. The current channel-side Discord reply path is root-only until trusted parent propagation is implemented; do **not** claim generalized nested channel reaction support merely because storage bounds actions or Fabric carries causal fields. If this mandatory chain cannot be exercised through the real production path, record failure/unsupported rather than pass.
6. Stop a Fabric observation stream while a UAR or BossFang run continues, then request runtime cancellation through the actual owner. Capture distinct `detach`, `cancelled`, or `unsupported` outcomes and the run's true final state.

## Fill only after execution

| Field | Actual value / artifact link |
|---|---|
| UTC start/end; operator; host IDs and platform | PENDING |
| BossFang / Gate / Fabric / UAR exact source SHAs | PENDING |
| Binary hashes; SurrealDB/Iggy versions and image digests | PENDING |
| Policy digest/revision; grant issuer and **nonsecret** grant IDs/revisions | PENDING |
| Discord adapter/source and binding revisions; scope with sensitive fields redacted | PENDING |
| Two-handler conflict and reassignment receipt | PENDING |
| Two authorized cursors and denied third | PENDING |
| Revocation-before-release and restart/replay receipts | PENDING |
| Reply/action echo, scope refusal, A→B→A, depth/fanout receipts | PENDING |
| Detach versus owner cancellation result | PENDING |
| Failure/remediation and exact rerun receipt, if any | PENDING |
| Final verdict (`PASS`/`FAIL`/`UNSUPPORTED`); accepted provider checkpoints, if proven | PENDING |

A passing local gate does not certify installed Windows x64 or Apple Silicon operation. Those remain separate release/acceptance claims.
