# Decision Log — sidecar supervision design spike

## 2026-07-31 — Retain the UAR process boundary

- Decision: Keep the full UAR behind a local/remote HTTP process boundary. BossFang owns a child process for local/desktop/single-container deployments; Kubernetes owns a native sidecar or service lifecycle.
- Rationale: fault and dependency isolation outweigh loopback HTTP overhead; the current UAR library surface does not expose the full runtime as a structured cancellable service.
- Falsifier: a supported narrow UAR service API, safe dependency unification, fault-injection evidence for the shared domain, and workload benchmarks showing material HTTP harm.
- Provenance: assessment, official Tokio/Rust/Kubernetes documentation, and direct inspection of UAR source.

## 2026-07-31 — Carry ready uptime in retry outcomes

- Decision: Replace `reached_ready: bool` with `ready_uptime: Option<Duration>` in `SupervisionOutcome::Retryable`.
- Rationale: the adapter owns the ready transition; this corrects the stable-uptime meaning and lets policy tests supply exact data without clocks or processes.
- Rejected alternatives: injected Clock trait, `mock_instant`, `chronobreak`, and Tokio paused time.
- Falsifier: discovery of another policy that must independently acquire a shared monotonic clock.
