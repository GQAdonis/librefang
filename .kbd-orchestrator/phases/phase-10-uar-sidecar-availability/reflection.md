# Reflection — phase-10-uar-sidecar-availability

## What changed

BossFang can resolve, supervise, inspect, start, stop, restart, and test UAR through an
authenticated operator surface. `UarDriver` uses the supervised HTTP endpoint rather than
embedding UAR, and the shipped image pins an exact verified runtime SHA.

## What the timing failures taught us

The recurring failures were design evidence, not a request for longer sleeps. Two boundaries
were conflated: deterministic restart policy and nondeterministic OS process scheduling.
Separating them made the policy exhaustively testable in memory while retaining small process
tests for `READY`, EOF shutdown, and externally observable lifecycle behavior.

The upstream startup race had the same shape. Reserving a port, releasing it, and later binding
the real server made readiness a prediction. Retaining the listener and emitting `READY` only
after successful initialization makes readiness a fact.

## Architecture assessment

The sidecar boundary remains the solid design. It gives BossFang explicit lifecycle control and
failure isolation without importing UAR's provider runtime, process-global environment, and
dependency graph. Threads would not make OS scheduling controllable and would weaken the fault
boundary. The corrected protocol supplies the explicit control the parent actually needs.

## Durable rules

1. Never test retry/backoff policy by asserting wall-clock timing; inject decisions or test the
   state machine directly.
2. A readiness signal must describe already-established ownership, never future intent.
3. Process-global environment must be finalized before a multithread async runtime starts.
4. Pin deployable sidecars by immutable source identity and test the exact published artifact.
5. Close the loop through the product's authenticated production route, not only a component
   test or direct sidecar call.

The final adversarial review found no remaining issues. Unrelated baseline failures are recorded
in `verification.md` and intentionally remain outside this phase's surgical scope.
