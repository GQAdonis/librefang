# Handoff out — phase-10-uar-sidecar-availability > sidecar-supervision-design-spike

**Status:** DONE

## Deliverables

- `assessment.md` and `analysis.md` — execution-model and test-seam assessment.
- `deep-research.md`, `decision-log.md`, and `library-candidates.json` — primary-source evidence and option comparison.
- `plan.md`, `execution.md`, and `verification.md` — C-SPK-001 plan, implementation record, and verification evidence.
- `reflection.md` — final architecture conclusion and follow-up obligations.
- `changes/C-SPK-001/change.md` — implemented change specification.
- `review/` and `sycophancy/` — adversarial and agreement-bias review records.

## Goal completion

See `reflection.md`. Status: DONE. All three child goals are met and the legacy child ledger records 1/1 complete; child exit restored the parent waypoint and its 5/8 progress.

## Unresolved items

- The pinned upstream UAR sidecar drops its ephemeral listener and announces `READY` before configuration and the actual server bind; that TOCTOU/protocol defect must be fixed upstream.
- Canonical KBD migration was rolled back because typed mutations reached a daemon serving a different project and returned `404 unknown KBD project`; canonical initialization remains unresolved, while the existing legacy ledger is consistent.
- Repository-wide all-target clippy remains blocked by the unchanged `origin/main` kernel-handle test-stub mismatch. Changed-crate clippy and all other required gates pass.
- The exhaustive deep-research service remained at initializing/0%; the assessment therefore relies on recorded primary official sources and explicitly marks the degraded research job.

## Recommendations to the parent (phase-10-uar-sidecar-availability)

1. Retain the UAR HTTP/process boundary. Let BossFang own the child locally and let the kubelet or a remote service own it in Kubernetes.
2. Keep retry-policy invariants in deterministic in-memory tests; reserve subprocess tests for spawn, READY/health, EOF shutdown, and crash/reconnect contracts.
3. Track the retained-listener/truthful-READY correction upstream before treating the startup protocol as robust.
4. Repair or explicitly switch/register the KBD control-plane project before attempting canonical migration again.
