# Ordinary UAR cancellation and restart operation preparation

Prepared against The Boss `6de6477cdddb0886387dcb752913c43bf3ec3de2` and UAR `66b36bb54feb24bb1bd660c5f1e6a50bdf7d4ad4`. No application, build, test, restart or inference was executed by this preparation.

The existing customer operation now restarts only the selected `managed-local` instance after its disposable retained session has persisted semantic-stream cancellation. It uses the normal typed `prometheus.integration.start` action `uar-restart`, waits for its operation to succeed through `prometheus.integration.operation_events`, then waits for a newer operational administration snapshot. Only operation identity, terminal status/error code and before/after generation are recorded. The retained external gateway remains `http://localhost:4000`; no credentials, provider bindings or Work selection are changed.

Source contract: `src/shared/ipc/schemas/prometheus.ts:351` declares start; `src/shared/types/integrationOperation.ts:18` permits uar-restart. `PrometheusIntegrationService.ts:925` rejects restart with busy UAR sessions, and `UarSidecarService.ts:316` rejects external lifecycle ownership and restarts the owned process. `UarAdministrationAdapter.ts:363` resolves the selected operational endpoint and supplies its generation.

Source-only limitation: cancellation retains an in-memory source run initially, but restart empties ordinary ActiveRunMap. UAR `manager.rs:948`, `1033` and `1814`, plus `routes.rs:1363`, establish this lifetime. The corrected Boss successful-turn predicate preserves resume for paused/uncertain prior placements; whether the required paused-after-restart follow-up works must therefore be decided by the actual completed-package operation. This note is not a new observed failure or qualification receipt. No blind404 retry or uncertain tool effect replay is proposed or performed.

Historical 2.2.27 failure receipts and guards remain unchanged. Root owns the sole packaged UI slot, operation execution and any defect-driven repair decision.
