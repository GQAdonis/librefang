## 1. Product contracts

- [x] 1.1 Reconcile initiative C05 with C03 definition identity and C04 service-instance placement.
- [x] 1.2 Define the stable admission, projection, recovery, control and security contracts.

## 2. Full-run client and authority

- [x] 2.1 Add isolated UAR full-harness v1 wire types and authenticated client operations.
- [x] 2.2 Add the app-owned `UarRunControl` authority and preserve the existing model-provider route unchanged.
- [x] 2.3 Persist stable correlation, exact definition identity, binding, native IDs, cursor, epoch and retention in `A2aTaskStore`.

## 3. Product surfaces

- [x] 3.1 Expose admit, lookup, observe, approve, cancel and detach plus typed steer capability/refusal.
- [x] 3.2 Redirect root A2A task lookup/cancel to the kernel-owned store without changing native dispatch.
- [x] 3.3 Confirm no production path replays delegated UAR tool calls or creates another execution loop.

## 4. Complete-boundary evidence

- [ ] 4.1 Run the single C05 integration gate and record exact source/UAR revisions and observable outcomes.
