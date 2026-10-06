# BossFang connects to independently owned UAR instances

## Observed requirement
The operator requires BossFang to stop bundling, installing, spawning, restarting, or terminating UAR. The Boss remains supervisor of its default UAR; other local and HTTPS instances can be selected explicitly. Existing full-run transport rejects external instances and sends a caller asserted principal, incompatible with delegated grant/JWT identity.

## Scope
Replace native process supervision with connection state, preserve legacy config and data with migration diagnostics, expose Owner connect/disconnect/reconnect APIs and native dashboard actions, remove Docker/bundled UAR provisioning, and admit authenticated selected loopback/HTTPS instances without relaxing existing identity, binding, workspace, epoch, approval or effect fences. Credentials stay private in memory and existing host references. Full-run requests never assert x-uar-principal.

## Boundary
No dependency upgrade, new scheduler, store, admin delegation, or UAR process ownership. Parent owns native/package builds and real operation; no implementation-time tests or compiler runs.
