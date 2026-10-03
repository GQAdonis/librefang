# C08.2 and C08.3 integration evidence

The completed native operation is recorded in [the redacted C08 receipt](../../../.prometheus/cadence/artifacts/c08-completed-integration-gate-1ca0c6a46e.json), SHA-256 `bad49eb712ee6356d7f11a47facfea63d0e74b4cb19677700b47cc2cab6d24d4`. The protected raw receipt remains at `/private/tmp/c08-operation-1ca0c6a46e-1791027000008/routing-receipt.json`, SHA-256 `2db92853686861e363759ee34c06684989e7939243e3a5f4176025d213246316`.

The one operation observed 122/122 steps, all six required routing scenarios, packaged Boss UI subscription read and delivery details, pause (revision 2) and resume (revision 3) with the cursor preserved, owner cleanup, and driver exit zero. It used BossFang `71a7e8c67b578a20d86e1c931356556ceb498b97`, UAR `53b063622b4ed8ce1f2ec30f9788c4d9d05cbfa5`, The Boss `7bf92d7620359d93091b7ec990f1380ac2265c65`, and operation source `1ca0c6a46eed0f15c5047237763c9b1d60e033b5`.

This satisfies C08.2 disclosure, retained occurrence, observer isolation and cursor behavior, and C08.3 replay, scoped reply, deduplication, bounded reaction, detach and unsupported owner-cancel behavior. It is a disposable Mac ARM64 integration gate; Windows installed acceptance and publication are separate.
