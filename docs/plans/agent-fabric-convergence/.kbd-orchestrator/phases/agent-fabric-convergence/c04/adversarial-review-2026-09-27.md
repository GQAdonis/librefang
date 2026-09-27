# C04 bounded adversarial review

## Verdict

PASS. No critical finding remains after the reattachment repair.

## Resolved critical path

- Managed identity, service profile, capability schema, and nullable console contracts match across UAR and The Boss.
- Create and both resume routes return an admitted effective service binding.
- Restored reattachment uses the source run and does not resend host history.
- Managed and external lifecycle paths stay separate and endpoint-bound.
- Runtime and administration credentials remain distinct protected main-process values.
- Librefang supplies launch-token authentication, stable instance identity, role-specific credentials, server-side compatibility admission, and returned-binding verification.

## Accepted warnings

1. Librefang derives an administration endpoint from the runtime endpoint when an explicit role is absent and sends expected endpoints only when its full endpoint set is configured. It still validates advertised identity, locality, ownership, capabilities, and the returned binding.
2. UAR's placement error adapter retains the refusal but flattens field and code detail into one message.

No build or test was run by the final reviewer. The independent completed-phase gate is recorded in `c04-acceptance-receipt-2026-09-27.json`.
