# Bossfang BAUAR testing handoff — 2026-10-10

The selected Bossfang harness passed against the acceptance candidate before publication.
The overall release-acceptance phase remains incomplete; this document records completed evidence and the remaining work for another session.
The operator requested publication and main integration now and stopped additional testing, dependency work, and metadata work.

## Published source scope

The existing branch includes commit `1d518936cb15b79d30bdd315510ff925613a0f4d`, a scoped intake of 72 Bossfang source/scenario paths onto the prior release baseline.
Its changes cover authenticated delegated job admission, durable job/attempt identity, original-run observation and presentation, exact approval/cancellation, native versus selected harness routing, task-board reconciliation, and real API/kernel fixtures.
Existing inherited implementation history is preserved; this handoff does not imply that all inherited changes were newly tested in this session.

The final fixture correction updates `scripts/integration/bauar-harness-gate.mjs`, `bauar-harness-peer.mjs`, `bauar-harness-runtime.mjs`, and adds `bauar-harness-supervisor.mjs`.
It uses the packaged sidecar's persistent stdin handshake and actual READY port, supplies immutable application-configured run credentials and MCP grants, separates model credentials from launch/service credentials, and preserves bounded failure checkpoints.
The receiver's production authentication and grant enforcement were not weakened.

## Main integration resolution

The publication merge retains the newer origin/main ordinary workflow delegation and terminal replay draining alongside selected durable job routing.
Three observation/preflight conflicts were resolved by keeping both selected response handling and workflow event handling, returning all terminal replay events while rejecting an incomplete EOF frame, and applying the newer delegated-host-context capability and projection fields in the selected preflight constructor.
These merge adaptations have not been compiled or runtime tested because the operator stopped further checks; the next session must verify the merged source before treating it as a certified candidate.

## Actual completed evidence

The harness-only integration executed on local unsigned macOS arm64 on 2026-10-10, with actual process exit 0 and confirmed cleanup: the owned process group was absent and no unknown descendants remained.
It observed **18 cases**, **36 real controlled model calls**, and **6 fixture side effects**, one for each authorized effect label.
Model requests classified as 29 task inputs, 5 auxiliary memory extractions, and 2 continuations; none were unclassified.
These are observations from the completed source-bound run, not a claim of universal exactly-once delivery.

The main gate completed these 13 named cases:

- `registered-owner-and-explicit-unsupported`
- `normal-exact-approval-and-reconciliation`
- `streaming-and-outcome-commit-crash`
- `exact-denial-no-effect`
- `three-surface-cancellation-exact-caller-revision`
- `lost-admission-and-decision-response-no-reenactment`
- `observation-reconnect-original-run`
- `provider-admission-before-host-capture-crash`
- `durable-intent-crash-before-a2a`
- `actual-pending-and-stale-sweep-preserves-selected-intent`
- `enabled-wake-native-and-selected-cas-winners`
- `provider-epoch-restart-remains-unknown`
- `native-legacy-and-ephemeral-kernel-contract`

The real kernel fixture completed these 5 cases:

- `native-normal`
- `native-stream`
- `native-ephemeral-entrypoints`
- `legacy-uar-model-provider`
- `selected-ephemeral-refuses-before-reservation`

The six effect labels were `BAUAR_NORMAL`, `BAUAR_STREAM`, `BAUAR_PARTIAL_TERMINAL`, `BAUAR_LOST`, `BAUAR_RECONNECT`, and `BAUAR_SELECTED_RACE`, each observed once.
Exact wrong/stale/missing approval decisions, denial, cancellation, admission retries, lost responses, and reconnection were exercised by real source-bound assertions.
The successful assertions checked original task/run/epoch correlation and cursor continuity; this document does not invent or expose private run IDs.

Public receipt identities retained in the phase workspace:

| Evidence | SHA256 |
|---|---|
| `harness-only-integration-02.json` | `d12de202ea81b04ef4a2227e7cfb6b0e9b3ee8156c6e5653ab4f6f4e182a9e7d` |
| `integration-e58a9cf8-f6db-40b2-aff2-e4e65af25b16.json` | `58bdcf0b828f24eeb32eb7b19f47f6659d6daa434f6eefb3a599127e3519ce74` |
| `harness-adjudication-02.json` | `b39f89606e792d23fd4bfa470e3554f17f865bad217d270e3e51d0dfd3c8a4ef` |

The separate supporting UAR regression batch also passed 5 real targets, 31 tests and 15 named negative cases.
That batch belongs to the UAR repository and is not a Bossfang broad-suite or packaged-runtime certification.
No new test, build, formatting check, or fresh adversarial review was run for this publication or any subsequent merge from origin/main.

## Execution and authentication boundaries

The selected harness exercises **Bossfang → private application-equivalent supervisor → packaged uar-sidecar**.
The supervisor exchanges its configured opaque frontend credential for a fresh per-launch bearer plus verified host-session assertion, preserves the actual workspace header, and supplies only configured immutable run resources.
UAR remains authoritative for admissions, model turns, approvals, tool effects, stream events, and terminal receipts.

This evidence does not certify native direct Bossfang-to-sidecar principal transport, standalone JWT validation, remote tenant isolation, or external credential custody.
Native/legacy model-provider and ephemeral entrypoints were separately exercised by the real kernel fixture; they do not prove selected full-harness remote authentication.

After provider restart or a lost runtime epoch, the selected attempt remains unsupported/unknown or requires reconciliation.
Do not automatically readmit or replay the attempt.
Inspect the original job/attempt, provider receipt and effect evidence, reconcile explicitly, and require an operator decision where the outcome cannot be established.
Incomplete retained terminal history is likewise not executable recovery evidence.

## Continue testing in the next session

1. Restore the complete phase receipts and acceptance candidate separately from source control; private profiles, raw logs, generated binaries and secret-bearing artifacts are deliberately excluded from this commit.
2. Re-establish exact current source/package/host/runtime identities before reusing any receipt.
   Merging newer origin/main work changes the candidate and is not covered automatically by the pre-publication source-bound PASS.
3. Complete The Boss desktop D01–D04 acceptance in the operator's interactive Keychain environment.
   The previous desktop launch remained blocked in native Keychain initialization, and a later pre-runtime retry reported a missing configured Playwright CLI; neither is a desktop PASS.
   Diagnose or restore the locked test installation without bypassing Keychain or changing the production authentication boundary.
4. Run the remaining phase acceptance and paired negative controls at the completed delivery boundary, reusing only receipts whose component bindings still match.
5. Complete artifact QA, scoped formatting, fresh independent adversarial review, verification/archive/reconciliation and explicit Execute closure.
   Broader platform/release certification, signing, installation, Windows execution and production remote deployment remain separate unverified work.
6. Stop after Execute for operator review; Reflect has not been entered.

To run the Bossfang harness when the next session has explicitly approved the complete delivery boundary, use the already built matching API/kernel fixture executables and packaged sidecar:

```text
node scripts/integration/bauar-harness-gate.mjs <api-host-test-bin> <kernel-test-bin> <packaged-uar-sidecar> <matching-uar-source>
```

Use Node 24, finite private fixture roots, the documented exact binary identities, and the coordinator's existing process ownership/cleanup policy.
The gate does not build, install dependencies, or certify a skip as success.
