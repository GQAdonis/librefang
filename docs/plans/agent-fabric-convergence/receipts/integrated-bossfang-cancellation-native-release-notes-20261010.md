# BossFang cancellation persistence payload

Source: `92bc005f3e7cc110715272b744830d2e3ccfe0d7`.

Mac Apple Silicon payload built and uploaded by The Boss workflow run `38091286809`. Windows x64 will be added independently when its native payload is ready. Mac Intel, Windows ARM64 and Linux are deferred.

The embedded dashboard and connection-only UAR ownership are retained. Migration 62 adds the authoritative `cancelled` workflow state while preserving persisted workflow data.

Each exact native JSON records executable size, SHA-256, target, source revision and embedded dashboard inventory. Build and publication evidence remains distinct from packaged application operation and installed acceptance.
