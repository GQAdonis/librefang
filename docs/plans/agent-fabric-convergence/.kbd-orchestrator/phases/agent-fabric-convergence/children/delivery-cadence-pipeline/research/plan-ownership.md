# Delivery Cadence pipeline: executable ownership proposal

2026-09-30. Planning only. Read the completed `analysis.md`, existing source inventory, both pack distribution entrypoints, and The Boss's `boss-core` routing/role manifest. No production edits, builds, tests, installation, or release dispatch occurred.

## Baselines and workspace selection

| Source | Observed HEAD | State relevant to this change |
| --- | --- | --- |
| Full linked source `/Users/gqadonis/Projects/prometheus/worktrees/afc-c03-full-pack` | `1ddcc8b21b05f26aa89aa5e19776c86e5b854c96` | Branch `codex/afc-c03-team-authoring`; cadence 1.1.2; owned skill/adapter/installer paths clean |
| Original full `/Users/gqadonis/Projects/prometheus/prometheus-skill-pack` | `80ac9d38296063063e5b7f77ffab3050eed4a826` | Cadence 1.1.0; locally changed `scripts/boss-launch.mjs`; do not overwrite |
| Original mini `/Users/gqadonis/Projects/prometheus/prometheus-skills-mini` | `068c2484ddfa29f74449991f46324861911dc7a1` | Cadence 1.1.0; locally changed `scripts/boss-launch.mjs`; do not overwrite |
| Clean retained mini `/Users/gqadonis/Projects/prometheus/worktrees/mini-cadence-recovery` | `b0d4985d59af44f108af4a88ed097c150ec16933` | Branch `codex/cadence-every-harness`; cadence 1.1.1; clean working tree |

Recommended execution setup: select/create dedicated linked full and mini worktrees after checking their current remote ancestry and incorporating applicable later changes. Use the linked full 1.1.2 payload as the audited feature baseline, not an instruction to reset newer source to that commit. Record exact starting commits. Reconcile mini's earlier ownership digest against the final full payload before copy. Preserve dirty original trees. This planning artifact does not select new branch names or mutate worktrees.

The parent phase owns KBD/OpenSpec documents in the separate convergence initiative. Full/mini commits cannot be treated as an atomic multi-repository commit; record both immutable revisions in the handoff.

## Existing team, explicit assignment

The actual manifest is `/Users/gqadonis/Projects/prometheus/worktrees/the-boss-d01-build/.agent-team/boss-core/team.json`; routing selects `boss-core` and native Codex definitions. It supplies `boss-lead`, `boss-runtime`, `boss-data`, `boss-desktop`, `boss-product`, and `boss-verifier` among other roles. There is **no role literally named release** in that manifest.

Their normal `owns` paths are Boss source directories. The user's explicit cross-project skill-pack request permits a scoped lead assignment to full/mini paths; it does not silently extend every role's permanent manifest ownership or authorize Boss source edits. Use the selected role responsibilities below without changing the team manifest solely for this child.

Maximum implementation concurrency: three specialists plus the lead. Start fewer until contracts are fixed. The lead is the sole integration writer, not a fourth competing specialist on shared files. Review/verifier roles remain dormant until the completed implementation boundary; planning artifact review remains distinct from production verification.

Let `S` denote the full source `skills/process/delivery-cadence/`, `F` the selected full repository, and `M` the selected mini repository.

| Owner | Exact existing files assigned | Proposed new files, not currently present | Responsibility and dependency |
| --- | --- | --- | --- |
| **Lead / boss-lead** | `S/scripts/cadence.mjs`, `S/scripts/lib/engine.mjs`, `S/scripts/lib/lifecycle.mjs`, `S/schemas/state.schema.json`, `S/schemas/profile.schema.json`, `S/schemas/event.schema.json` | `S/references/pipeline-contract.md` | Freeze command/state interfaces first; owns v3 migration and old-writer refusal; integrate specialists into thin command dispatch. Sole owner of shared schemas and runtime entrypoint. |
| **A / boss-runtime** | `S/scripts/lib/storage.mjs`, `S/scripts/lib/checkpoints.mjs`, `S/scripts/lib/process.mjs`, `S/scripts/lib/hooks.mjs`, `S/scripts/lib/hook-runner.mjs` | `S/scripts/lib/jobs.mjs`, `S/scripts/lib/resources.mjs`, `S/scripts/lib/checkpoint-receipts.mjs` | Short state transactions, long-operation claims, shared physical resource reservations, owned cancellation/recovery and external checkpoint adoption. Depends on lead's stable record/interface contract. Keep new modules only where responsibility warrants partitioning. |
| **B / boss-data** | `S/scripts/lib/profile.mjs`, `S/scripts/lib/delivery-contract.mjs`, `S/scripts/lib/report.mjs`, `S/scripts/lib/activity.mjs` | `S/scripts/lib/work-ahead.mjs`, `S/scripts/lib/publication.mjs`, `S/scripts/lib/opportunities.mjs` | Work-ahead eligibility/promotion accounting, candidate-specific obligations, count/UTC opportunity evaluation, meaningful release dispositions and timing/debt reports. Does not edit shared engine or schemas; hands schema requirements to lead. Depends on lead contract and A's job interfaces, not finished execution code. |
| **C / boss-desktop**, explicit packaging/adapter assignment | `S/SKILL.md`, `S/references/profile.md`, `S/references/adapters.md`, `S/references/boss-profile.md`, `S/references/child-recovery.md`, `S/references/measurement.md`, `S/references/hooks.md`; `F/shared/scripts/cadence-kbd-adapter.mjs`, `F/shared/scripts/cadence-karpathy-adapter.mjs`, `F/shared/lib/cadence-adapters/{kbd,karpathy,io}.mjs`; matching `M/scripts/` and `M/lib/cadence-adapters/` files | No new installer required; new example request/receipt files only if final contract needs them | Update harness/child/report integration and instructions. Reuse portable distribution. May draft docs in parallel; synchronization/generated outputs wait for lead's frozen completed source. |

Keep `S/scripts/lib/children.mjs` under lead ownership if a change is necessary. Preserve its canonical KBD authority and child stack; do not split it across runtime/data workers. Existing `hook-registry.mjs`, hook templates, `publication-receipt.mjs`, `boss-launch.mjs` and `assets/boss-provider-setup.mjs` remain unchanged unless a concrete approved interface requirement demonstrates the need; lead assigns one owner before touching them. Do not refactor neighboring modules to create more parallel work.

The existing engine is 327 lines at the audited baseline. Do not grow it past the mini 500-line limit; delegate responsibility to the proposed focused modules rather than splitting mechanically by line count. All executable additions remain Node `.mjs`, no shell/Python scripts or symlink dependency.

## Distribution surfaces: existing, conditional, generated

These paths already exist. They are not proposed new installers:

| Location | Purpose | Planned handling |
| --- | --- | --- |
| `S/scripts/sync-mini.mjs` | Ownership-digest-preserving identical shared payload copy | C runs only after completed shared source is frozen; modify only if a demonstrated closure need exists |
| `M/.prometheus/delivery-cadence-source.json` | Full source revision, payload digest, per-file ownership hashes | Generated by full-to-mini copier; never hand-create success hashes |
| `F/scripts/distribute-delivery-cadence.mjs` | Existing global copy installer for Codex, Claude, Kimi, MiniMax, Zed/shared agents, OpenCode plus adapter dependencies | Reuse unchanged unless actual new closure is not discoverable; preserve unmanaged/edited copies |
| `F/docs/delivery-cadence-distribution.md` | Installation ownership/recovery and harness availability distinction | C updates if version/contract guidance changes |
| `F/scripts/generate-skill-system-distribution.js` | Full plugin generation | Existing `copyCadenceRuntimeFiles` follows relative imports from installer and adapter roots; new imported modules are normally included without generator changes |
| `M/scripts/generate-skill-system-distribution.mjs` | Mini generator entrypoint | Reuse |
| `M/lib/distribution/package-builder.mjs` | Mini runnable adapter closure and package materialization | Existing closure follows adapter/recorder imports; adjust only for an observed missing dependency |
| `F/skill-system.json`, `M/skill-system.json` | Inventory and distribution contract | Existing recursive full inventory/mini child inventory discover current skill; change only required version/metadata fields through established release policy |
| `F/dist/plugins/{claude,codex}/prometheus-skill-pack/` | Generated full payload | C generates after source freeze; stage only outputs attributable to this change |
| `M/dist/plugins/{claude,codex}/prometheus-skills-mini/` | Generated mini payload | Same rule |
| `F/skills/process/{kbd-goal,kbd-loop}/SKILL.md`, `M/skills/{kbd-goal,kbd-loop}/SKILL.md` | Existing cadence-aware goal/loop entrypoints | C checks for conflicting global build/publication-wait wording; edit only actual conflicts |

C owns generated `SKILLS.md` and marketplace outputs only when the existing generator changes them for this skill. Do not rewrite unrelated plugin versions, submodule pins or source-tree lifecycle policy. Full `package.json`'s `check:distribution` also invokes test files: do not use it as an intermediate generation command. The generation entrypoints above build distributable artifacts; final runtime operation is a separate boundary.

Do not edit `/Users/gqadonis/Projects/prometheus/worktrees/the-boss-d01-build/resources/prometheus-skills-mini` in this child. A later product release may pin the resulting mini revision; this skill change must not silently alter the frozen Boss candidate, its workflows, current publication metadata or website.

## Dependency order and coordination

1. **Lead contracts and baseline selection:** exact v3 fields, command signatures, job/claim/resource IDs, frozen source equivalence, schedule/opportunity rules, work-ahead promotion and migration decisions. Check in the approved OpenSpec plan before production edits.
2. **Parallel production implementation:** A and B implement against those contracts in disjoint files; C updates pack adapters and docs. No partial tests/builds. Hand interface changes back to lead; do not edit another owner's file.
3. **Lead integration:** wire engine/CLI/schema/migration, preserve canonical KBD transitions and legacy histories, resolve all interface mismatches by source inspection. A/B finish any assigned observed integration corrections. No new daemon or product repository edits.
4. **Completed payload freeze:** C copies identical shared files to selected mini worktree, generates full/mini distributions and records exact source/artifact inventories. Shared code has one authoring source; never implement separate mini behavior.
5. **One completed integration boundary:** operate the actual CLI and installed copied payload with concurrent frozen build/work-ahead, process/hook recovery, exact receipt adoption, opportunity dispositions, old/new publication completion and migration scenarios. Use native Mac/Windows where available; unavailable native execution stays pending. Only failed observed scenarios repeat after fixes.
6. **Lead delivery/cutover:** commit/push coordinated full/mini changes as authorized, prepare PRs when required, distribute through the existing full installer with ownership protections, update the initiative's configured CLI/adapter binding to the accepted version and reconcile existing publication debt. No resetting 120-minute/every-second-delivery policy and no fabricated installed acceptance.

## Items the executable plan must settle

- Select actual execution worktrees/branch bases after current remote reconciliation; the original dirty roots are not safe integration targets. Clean retained mini 1.1.1 is a candidate, not proof it includes every later upstream skill fix.
- Freeze public command/request/result contracts before splitting workers. `engine.mjs` and schemas require one lead writer; otherwise nominally parallel workers will collide.
- Specify the host/user shared resource-registry location and canonical path identity consistently on Windows/macOS. Different cadence state roots must not grant duplicate ownership of one target directory.
- Define external workflow reconciliation as adapter-provided evidence. The shared skill cannot guarantee remote publisher serialization by merely holding a local lock. Existing Boss publisher constraints are handled through documented immutable candidate/branch promotion restrictions; if this needs product code changes, report that separately rather than expand this child.
- Ensure an available native Windows operator/runner for the final portable-operation evidence, or explicitly leave that acceptance pending. Do not manufacture Windows proof from source inspection.

None blocks writing the plan. They are required execution preconditions or explicit pending acceptance conditions, not reasons to perform speculative implementation during planning.
