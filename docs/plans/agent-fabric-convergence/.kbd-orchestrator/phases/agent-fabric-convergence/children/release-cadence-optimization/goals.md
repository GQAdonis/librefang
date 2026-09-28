# Goals — agent-fabric-convergence > release-cadence-optimization

- Target a useful independently releasable increment per hour of active agent runtime with The Boss UI delivered alongside core capability.
- Reserve production tests and builds for completed independently shipping phase boundaries.
- Use resource-aware concurrent agent ownership across Rust, TypeScript UI, documentation and release work.
- Use Karpathy evidence to propose a delivery optimization role and measure bottlenecks without inventing timings.
- Refresh and use Compass code graphs hourly during active work with bounded resource use.
- Follow assess analyze plan execute reflect and wait for operator feedback after each stage; preserve parent work and return point.

## Operator clarification after Assess — 2026-09-28

Every hourly delivery must end with a functioning local Apple Silicon application produced by the exact command `pnpm build:mac:arm64`, with the completed functionality reachable in The Boss. For UAR increments, the application must package and run the corresponding UAR source. A successful compile or DMG integrity check alone does not establish functioning.

After EACH local delivery ask whether to update all macOS and Windows targets now or wait until the next delivery. Linux is excluded. No answer is not publication approval. Track darwin-arm64, darwin-x64, win32-x64 and win32-arm64 separately; current UAR support gaps cannot be hidden by publishing a non-UAR build.

Cadence planning will count elapsed delivery time, including build and waits, with aggregate agent effort separately recorded when observable. This is a planning interpretation, not a measured hourly guarantee. Preserve stage feedback stops: Analyze was authorized at that checkpoint. The operator subsequently approved Plan with “Yes, plan.”; Execute still awaits feedback.
