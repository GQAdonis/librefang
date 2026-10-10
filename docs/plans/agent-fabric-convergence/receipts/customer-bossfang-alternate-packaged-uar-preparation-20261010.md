# Alternate packaged UAR: operation preparation

Status: source-only preparation. No application, UAR process, HTTP request, build or operation was run by the preparing agent. This is not passing evidence.

The existing packaged `uar-sidecar` supports external ownership relative to another host (`src/bin/uar-sidecar.rs:178–181`). A disposable operation supervisor may therefore start an independent copy of the installed binary, with its own instance ID, storage, listener, stdin launch credential and administration key. Neither The Boss's managed launch token nor the second supervisor's launch token is handed to BossFang or registered in The Boss.

The second supervisor issues a 900-second grant using the existing host-authenticated `/api/uar/delegation-grants` API. Its exact disposable workspace and discovery/model-read/model-completion/full-harness operations are fixed at issuance. Native authenticated grant identity wins over caller principal headers. The Boss receives only this restricted grant through its protected external runtime-credential setting, with a separate administration-key reference.

## Exact source gap to reproduce

`BossFangService.ts:385` requests `/api/uar/providers` through the selected UAR's models role. `src/uar/security/delegation_grants.rs:243–246` permits model-read paths `/api/models`, `/v1/models` and `/api/providers`, but omits `/api/uar/providers`. The native outer sidecar guard rejects an otherwise valid grant for that path. Its source rejection status is **401**, not an assumed 403. The real operation records the actual static HTTP status if exposed by the typed application error.

An administration key does not bypass the outer scoped-grant guard. JWT credentials do not bypass it either. The missing operator remote endpoint is therefore not the underlying fixture blocker for this bounded local alternate-instance scenario.

This preparation does not alter the frozen candidate or extend grant permissions. A production repair must follow the actual failing operation and receive fresh native/candidate provenance.

## Driver and invocation

New driver:

`.prometheus/cadence/inputs/customer-bossfang-alternate-packaged-uar-20261010.mjs`

Invoke from this initiative directory with root as the sole packaged UI/process operator:

```text
node .prometheus/cadence/inputs/operate-corrected-customer-scenario-20261009.mjs .prometheus/cadence/inputs/customer-bossfang-alternate-packaged-uar-20261010.mjs bossfang-alternate-2-2-27 <existing-private-operation-config.json> <actual-2.2.27-installation-receipt.json>
```

The installed-candidate contract must match the actual installation hashes and the frozen Boss/UAR/full/mini pins. The existing private gateway environment supplies endpoint, alias and credential reference; no new paid API route or entitlement is introduced. The Node process must retain normal filesystem permission to create the disposable secondary DB and start the verified installed native binary. Packaged `uar-models` and Cedar policies are reused, not source-built replacements.

The driver establishes an ordinary disposable workspace and managed BossFang connection as prerequisites. It does not repeat passing dashboard, port-change, restart or retained-profile matrices. It registers the second instance through the revisioned instance API, leaves Work's managed selection unchanged, selects it only in BossFang settings, then invokes the actual `bossfang.models` route. A rejected inventory is a failed partial operation; it does not qualify external inference. If the real route succeeds on a corrected candidate, the existing UI controls and `completeDiagnostic` helper operate a no-effect native delegated inference and retain exact selected instance/workspace/task correlation.

## Cleanup and limitations

The driver restores the managed BossFang selection, checks the original UAR PID/start time and Work selection, removes its external inventory row where permitted, revokes its independently minted grant, then closes only its own secondary stdin. Bounded escalation is limited to that exact owned child. Private secondary configuration is removed; no launch credential, gateway secret, grant bearer, arbitrary error body or raw runtime log is saved in evidence.

External authorizations do not receive The Boss's paired filesystem/approval bridge (`registerDelegatedHostContexts` returns an empty list for external ownership). A successful no-effect inference does not certify that broader capability, external administrative mutation, distributed teams or remote hosts. Existing applicable cancellation evidence remains separate; this narrow driver does not manufacture new cancellation proof or repeat completed passing operations.
