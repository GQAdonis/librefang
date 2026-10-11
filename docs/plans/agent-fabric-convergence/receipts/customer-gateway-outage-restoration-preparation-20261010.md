# Missing customer gateway-outage recovery operation

Status: prepared, not executed. No pass, qualification transition or delivery count is asserted.

Frozen candidate: The Boss 2.2.28, source `6de6477cdddb0886387dcb752913c43bf3ec3de2`; UAR `66b36bb54feb24bb1bd660c5f1e6a50bdf7d4ad4`. The existing 2.2.28 candidate contract checks native/skill pins and installed hashes; the common runner constructs exact source references from the actual installation receipt.

## Real consumption contract

- G `src/main/ai/runtime/uar/uarModelAssignments.ts:153` rereads `services.liter.endpoint` for a new ordinary assignment with source `gateway`. Its run credential uses that endpoint, existing saved gateway credential and selected alias.
- G `uarModelAssignments.ts:185` checks the selected endpoint's actual model inventory before dispatch. An unavailable endpoint must produce a real application failure rather than an invented provider result.
- Native-model assignments (source `uar`) and catalog-authoritative assignments do not consume this endpoint setting. The driver refuses a mismatched assignment and makes no outage qualification claim for those routes.
- Normal `prometheus.integration.configure` updates the `services` feature using its current revision; `secrets: {}` leaves credentials unchanged. All provider connections, aliases, process ownership and other services fields are preserved.

## Prepared scope

New driver: `.prometheus/cadence/inputs/customer-gateway-outage-restoration-2.2.28-20261010.mjs`. Root remains the sole packaged-app operator. The driver uses a fresh disposable profile, normal Work onboarding/setup, an existing compatibility model and an ordinary UAR agent assigned to the configured gateway alias. It requests plan mode with no MCPs and instructs no tools/effects.

1. Register one disposable workspace through the existing setup seam. Create one ordinary gateway-assigned agent/session and open that actual Work session.
2. Briefly bind an owned ephemeral IPv4 loopback listener, capture its allocated port and close it. Select that now-unused endpoint through normal revisioned settings. No gateway is stopped and no persistent service is created. A racing listener or unexpected success cannot count as a pass.
3. Submit a fresh no-tools turn; require the actual persisted error and a visible localized network diagnosis in that exact assistant message. Only static category, message digest and identifiers are recorded; arbitrary error text and credentials are withheld.
4. Restore the exact prior services object through normal settings and require exact saved-object equality. Cleanup also attempts restoration after failure/interruption; incomplete restoration leaves the operation failed with an explicit obligation.
5. Submit a new read-only follow-up from the failed message anchor. Require semantic text streaming, an exact new marker, successful persisted response and the same gateway model identity. It does not replay the failed prompt or any earlier effect.

Multilingual network labels are read from the frozen G renderer locale source. Visibility is checked under the exact failed message's `data-message-id`; no generic alert or health response substitutes for it.

## Invocation after installation

From this initiative directory, root may use the existing runner:

```text
node .prometheus/cadence/inputs/operate-corrected-customer-scenario-20261009.mjs .prometheus/cadence/inputs/customer-gateway-outage-restoration-2.2.28-20261010.mjs gateway-outage-restoration-2-2-28 .prometheus/cadence/inputs/corrected-customer-config-2.2.28-20261010.json <actual-2.2.28-installation-receipt>
```

The established runner supplies configured gateway credentials by environment reference and creates the disposable workspace. Missing installation, credentials, model catalog, visible failure, restoration or inference remains a failed/pending operation. No build, unit suite, UI launch or operation was run while preparing this driver.
