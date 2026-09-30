## Context

See proposal.md. The controlling [plan](../../../../.kbd-orchestrator/phases/agent-fabric-convergence/children/uar-team-execution-architecture/plan.md) contains the baseline, D1–D5 approval decisions, source-grounded A/B file assignments and operation criteria. Its two consultation documents supply exact source paths. This change completes documentation only.

## Goals / Non-Goals

**Goals:** finalize an approved, versioned contract with truthful migration and parent handoff; keep the child from becoming a second delivery scheduler.

**Non-Goals:** source implementation, conformance certification, dependency changes or application builds in this child. Parent production receipts remain pending.

## Decisions

- Finalize execution-profile-contract.md and legacy-migration.md in the child; retain historical assessment/analysis and explicitly carry the settlement/recovery correction.
- Reuse existing UAR catalog CAS and actor/kernel (library: uar-existing-kernel); adapt pinned Codex identity and queue/activation separation (library: codex-control-patterns), not its root-local registry as a durable catalog.
- Adapt atomic intent/drain within the existing catalog (library: transactional-outbox-pattern); no broker/outbox store. Evidence: [AWS pattern](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html) and the runtime consultation's inspected catalog/admission source. Retain existing Tokio; defer Restate and Temporal to C10.
- A repairs exact endpoint profile and exclusive execution/recovery under existing C09.3. B adds governed team tools and durable yield under proposed C09.4. Neither task history nor publication counter is rewritten.
- Non-expiring ownership rejects automatic failover; settings-only profiles reject fabricated guaranteed-fit proof. These limits trade convenience for truthful authority and capacity semantics.
- Complete the documentation child and canonical return before the parent product build. Cadence child return requires approval and all return evidence but is not a successful delivery.
- Typed child tasks 1.1–1.3 mirror OpenSpec through supported KBD commands. Parent C09.4 is not registered by this Plan stage. Task 1.2 carries the operator-approved scope amendment into existing parent/product artifacts; actual code remains parent-owned.

## Risks / Trade-offs

- [Old binaries do not observe new claim epochs] → dedicated catalog, controlled credentials/versions and evidenced old-process exclusion; no automatic takeover.
- [B exceeds a two-hour slot] → expose overrun; never lower complete-delivery criteria or report partial wiring as usable.
- [Final review correction lacks a third independent pass] → two-round cap, retain findings/dispositions; explicit forbidden/revoked directed-edge operation is mandatory B acceptance.
- [Shared instruction text mistaken for authority] → hard host policy first, current authorization at effects and attributed peer/artifact data.
- [Legacy silent-ignore behavior changes] → field-by-field migration and explicit launch refusal; no automatic rewriting of user definitions.
- [Native review lacks proven canonical model distinction] → record producer unknown and native isolation; no clean cross-model PASS claim.

## Migration Plan

Documentation is additive and versioned. Preserve original evidence and candidate source bytes. Child execution writes the approved contract, migration matrix and handoff; reflection archives only after its evidence is complete. Parent A publishes migration guidance and uses additive/backward-readable state contracts, refusing unsupported old values explicitly. Product rollback must stop effects, retain catalog evidence/backups and never load new execution state in an incompatible old writer. Rollback details belong to the parent implementation's frozen schema, not an invented migration here.

