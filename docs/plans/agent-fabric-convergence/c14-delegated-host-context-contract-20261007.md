# C14.4 delegated host context repair

Status: production implementation dispatched; no new build or operational claim. This repairs the observed scoped BossFang full-run tool-resource gap inside the existing approved shared-UAR and authoritative-effect requirements. No completed task is reopened and no original effect/denial/cancellation criterion is removed.

The existing host-issued scoped credential cannot attach MCP or tool-admission resources. UAR deliberately admits those only from the authenticated host. The repair extends that same trust boundary, not the workflow executor.

## Contract

The Boss registers one private context through host-authenticated POST /api/uar/full-harness/v1/delegated-host-contexts, tied to a live FullHarnessDelegation grant, verified principal, workspace, runtime epoch and exact catalog-resolved immutable deployment binding. Caller principal headers never supply identity. Private working directory, MCP transport and tool admission remain native memory; only safe context identity and scoped credential reach BossFang. DELETE revokes the context.

Native ordinary admission uses delegated_host_context_id. UAR rejects caller-supplied resource overrides, rechecks the actual resolved binding, and injects host resources through the existing run request after catalog resolution. Duplicate admission retains the original reservation; changing context does not recreate or migrate an admitted run. Grant expiry, revocation, runtime replacement or context release refuses subsequent protected effects, including at effect claim. No transparent authority renewal for old runs.

An authenticated native operator decision reaches the original UAR full-harness tool-approval route. UAR calls the private admission bridge with the exact original context/run/issuer/challenge/admission/tool-call identity. The Boss confirms the current pending record and records the existing canonical human decision before UAR resolves the same waiter. A health check or a forwarded boolean alone never establishes an approved effect. Private callback credentials never cross the native or renderer boundary.

The production authoring path resolves safe contexts without requiring users to remember opaque IDs. Missing capabilities/context/expired authority must remain visible; no native-tool enabling, executor fallback, new scheduler or UAR process ownership transfer is permitted.

## Ownership and delivery

- Runtime/API: isolated UAR checkout /Users/gqadonis/.claude/worktrees/uar-c14-delegation-host-context from a3c32d62e2a99881c8d8f2d1f4f0b5b734fd4699; security/grant/host-context/full-run modules, mechanical server state wiring and scoped OpenSpec.
- Desktop host: afc-c14-bossfang-workflow main-process bridge, selected instance binding, typed contracts and scoped authoring integration.
- Native consumer and operation: afc-c14-workflow-delegation ordinary target/wire/dashboard safe identity plumbing and afc-c14-bossfang-workflow maintained operation entrypoint.
- Lead: source/payload integration, one build writer, publication and canonical KBD/Cadence completion.

The source scope is explicit work-ahead inside C14.4; its original 2026-10-07T23:24:33.943Z first-work time is preserved. Adding the UAR source will use supported source/scope transitions at promotion, never hand-editing cadence state. The current frozen controls candidate and clock remain separate and unchanged.

Finish all production wiring before the actual native/application packaging boundary. Operate an ordinary embedded workflow with output, one exact approved filesystem effect, a denied effect and original pending-approval cancellation, preserving selected UAR and Work ownership. Preserve prior passed receipts at their exact source boundaries. Native Windows installed acceptance remains independent. No unit, mock, lint or partial verification/build loop is authorized.

## Reported implementation-hook deviation

The runtime worker reported its first documentation commit invoked repository hooks, triggering dependency installation, GitHub Actions policy validation and commit-message lint. No Cargo or product test/build ran. These unrequested checks are not delivery evidence. Root then required core.hooksPath=/dev/null for all subsequent scoped signed commits under the explicit operator boundary policy.
