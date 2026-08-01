# Refinement log: C-URT-001

## Iteration 1 — source repair

- Replaced release-and-rebind port discovery with one retained listener.
- Added a one-shot readiness handshake and deterministic startup tests.
- Added the OpenSpec sidecar startup protocol delta.

## Iteration 2 — review convergence

- Removed an ambiguous trait-dependent error wrapper and preserved readiness-send context.
- Staged protocol artifacts so the review packet could verify them.
- Corrected the contract to distinguish mandatory primary readiness from optional companion availability.
- Adversarial round 4 passed with zero findings.

## Publication gate

- UAR PR #5 merged the runtime repair as `67a9939a0cbbf6607291022fb36df5776f5294af`.
- GHCR workflow 30659172511 completed successfully in 1h3m13s and passed its executable-sidecar probe.
- Independent manifest inspection found `linux/amd64`; the exact tag pulled at digest `sha256:92ee5559e5c0cd105ef28694cca9ee09b01f512d2ed603361e8ce162345e4e76` and its sidecar executable probe passed.
- BossFang now pins the exact runtime-repair SHA; formatting, branding, and diff checks pass after the pin.
- UAR PR #6 archived the completed OpenSpec delta and promoted the validated `sidecar-startup-protocol` specification.
