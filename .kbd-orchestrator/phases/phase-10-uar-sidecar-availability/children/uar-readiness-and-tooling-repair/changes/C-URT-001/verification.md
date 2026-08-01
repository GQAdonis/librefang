# Verification — C-URT-001

- [ ] UAR OpenSpec validation passes.
- [ ] UAR formatting and focused server-full sidecar compile/tests pass.
- [ ] A negative startup test proves no READY line precedes initialization success.
- [ ] Listener ownership test proves a competing bind cannot claim the announced port.
- [ ] Sync-branch integration is visible on the GQAdonis remote.
- [ ] `Publish Image (GHCR)` succeeds for the integrated SHA.
- [ ] Public manifest resolves and the image contains executable `uar-sidecar`.
- [ ] BossFang `Dockerfile` pins the exact repaired SHA.
- [ ] BossFang branding audit and diff check pass after the pin.
