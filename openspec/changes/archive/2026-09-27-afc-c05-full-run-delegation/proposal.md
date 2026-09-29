## Why

Initiative C05 requires BossFang to delegate a complete run to the selected UAR service instance without turning the UAR model provider into a second execution path. The current `provider = "uar"` driver performs model completions only, and the root A2A route keeps a second process-local task map that cannot durably reconcile a lost remote admission response.

## What Changes

- Add a dedicated full-run client and kernel control seam for UAR's versioned full-harness API while leaving `provider = "uar"` unchanged.
- Mint a stable admission identity before the first network request, project native UAR task/run identity into the kernel-owned A2A task store, and reconcile an uncertain response through the same admission identity.
- Expose admission, lookup, observation, approval, cancellation and detachment. Expose steering as a typed capability/refusal rather than silently approximating it.
- Redirect the root A2A methods to the kernel-owned task store so externally visible tasks have one BossFang projection authority.
- Preserve one UAR executor and never replay UAR tool calls in BossFang.

## Capabilities

### New Capabilities

- `bossfang-full-run-delegation`: Retry-safe, identity-preserving control of one complete UAR-owned run.

### Modified Capabilities

- `uar-service-instance-placement`: Delegation consumes the selected, compatibility-admitted C04 service instance and its protected endpoint credentials.

## Impact

This repository-scoped change implements the BossFang/Librefang half of initiative `afc-c05-bossfang-full-run-delegation`, tasks C05.1-C05.3. It changes shared UAR control types, the UAR HTTP client, kernel control roles, the persistent A2A projection and UAR/A2A API routes. It does not change either native execution loop, model-provider behavior, native messaging dispatch or `librefang-cli`.
