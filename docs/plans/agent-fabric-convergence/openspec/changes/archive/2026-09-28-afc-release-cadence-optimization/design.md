# Design

## Context

See proposal.md and the reviewed child plan at ../../../.kbd-orchestrator/phases/agent-fabric-convergence/children/release-cadence-optimization/plan.md. This initiative is an independent KBD root inside an owned BossFang worktree; product source and installed evidence are separate. Current local Mac script disables UAR; two UAR target profiles are absent. Those product repairs belong to D1 and its platform track after this child.

## Goals / Non-Goals

Goals: apply the authored roadmap and actual role policy so parent dispatch changes immediately after the child closes; retain all original coverage. Non-goals: implement runtime or UI features, run native builds, publish artifacts, replace schedulers, or rewrite compliant skill packs.

## Decisions

1. One process change, four tasks. Delivery contract1.1 first; roadmap1.2 and team/operating policy1.3 can run concurrently; one completed-process consistency gate1.4. No per-task test gates.
2. Product-manager edits authored parent plan/work-packages/dependencies/recommendation mappings. Root records an immutable typed plan revision without activating the parent. Generated waypoint/task projections are never edited. Signed canonical-to-OpenSpec ordinal mapping controls mirror repairs.
3. Agent-team owner changes the coordination checkout's bossfang-stewards source, only the two conflicting prompts and bounded delivery observer, then exports affected native roles. Preserve existing Claude routing and modelPolicy; Codex exports are additive. Do not edit other active worktrees. Full/mini creator sources already comply and remain unchanged.
4. Local-first D1 source freezes pair separate Boss and UAR commits. The parent repair enables the exact Mac command and validates a local-only source/checksum-bound arm64 payload; public CI rejects that input. Existing immutable public payload requirements stay intact. A runtime path override is not packaged proof.
5. One local heavy writer; native remote jobs use pinned snapshots. One release metadata/site publisher cannot overwrite a newer platform with an older result. Every local delivery triggers the explicit now/wait question; no Linux, no implicit approval.
6. KBD lead executes the graph queue; optimizer only advises at bounded checkpoints. Explicit existing Karpathy recorder invocation carries a linked small delivery receipt, not a new telemetry service. Use local-ready, publication and end-to-end clocks; retain null for unobservable agent durations.

## Risks / Trade-offs

- Cold Rust/package build may exceed one hour → report actual overrun, never remove governance or rename incomplete work as a release.
- A plan-only fix could recurse indefinitely → child Execute actually applies roadmap and role sources; parent D1 dispatch follows Reflect without another mandatory research cycle.
- Existing local changes/model choices may be lost by export → record baseline, change source through existing lifecycle, merge only owned exports and preserve other routing.
- Karpathy pk transport may time out → keep durable local receipt, report degraded ingestion, no tight retry loop.
- Native review canonical identities unavailable → record weaker fresh-context guarantee and exact findings; do not claim verified cross-model identity.

## Migration Plan

On Execute approval, widen advisory child scope to exact authored parent/team files described in the reviewed plan. Preserve baseline commit and unrelated edits. Apply1.1 then1.2/1.3; record typed revision and only proven mirror updates. At1.4 inspect complete artifacts and exports once and commit scoped files with source receipts. Stop for Execute feedback. Authorized Reflect verifies/archives this OpenSpec change, records lessons, returns the saved parent waypoint and stops as required. Roll back authored changes with a follow-up commit and typed correcting decision/revision; do not rewind immutable events or delete historical evidence.

## Candidate evidence carried from Analyze

### library: cand-001 — Existing Electron builder and UAR-enabled Mac package path

Disposition: adapt. Make the exact required command produce enabled local UAR payloads, reuse native packaging and one completed-phase gate.

- Tier 1: build:mac:arm64 forces UAR=0; enabled alternate exists; electron-builder pin26.15.6. Source: /Users/gqadonis/Projects/prometheus/the-boss/package.json
- Tier 2: extraResources installs native files outside app.asar; executable sidecars should use physical resource paths. Source: https://github.com/electron-userland/electron-builder/blob/master/website/docs/contents.md

### library: cand-002 — Existing UAR sidecar packaging plus local Mac payload record

Disposition: adapt. Freeze committed source and validate source/architecture/archive and file hashes in an explicit local-only input; preserve immutable public manifest contracts.

- Tier 1: Existing script emits tar and file checksums with HEAD provenance. Source: /Users/gqadonis/.claude/worktrees/afc-c08-uar/scripts/package-boss-sidecar.mjs
- Tier 1: Canonical importer requires Windows x64 and Mac ARM64 payloads from same revision. Source: /Users/gqadonis/Projects/prometheus/the-boss/scripts/import-uar-sidecar-payloads.cjs

### library: cand-003 — Frozen multi-platform release jobs and serialized publication

Disposition: adapt. Reuse release machinery; add missing UAR targets through approved implementation, publish only on a recorded boundary choice, no Linux.

- Tier 1: Non-UAR profile supports four architectures; UAR-enabled currently only win32-x64 and darwin-arm64. Source: /Users/gqadonis/Projects/prometheus/the-boss/scripts/release-profile.cjs
- Tier 1: Source/version/profile consistency is enforced for reuse. Source: /Users/gqadonis/Projects/prometheus/the-boss/scripts/release-preflight.cjs

### library: cand-004 — Existing agent team lifecycle and bounded optimization observer

Disposition: adapt. Separate runtime, Boss UI, packaging and documentation ownership; one heavy local build writer; observer can advise from logs, never authorize tests or replan.

- Tier 1: Existing team-update/task ownership and expected revision operations exist; native harness executes work. Source: /Users/gqadonis/.codex/plugins/cache/prometheus-skill-pack/prometheus-process-skills/1.6.0/agent-team-creator/SKILL.md

### library: cand-005 — KBD/OpenSpec with existing Karpathy progress recorder

Disposition: adopt. Link a small per-delivery metric artifact through existing events; preserve canonical task ownership and C-package meanings.

- Tier 1: Existing recorder provides durable local log/receipt with bounded remote pk delivery. Source: /Users/gqadonis/Projects/prometheus/prometheus-skills-mini/scripts/record-progress.mjs
- Tier 1: Previous local receipt succeeded but shared pk ingest timed out; historical agent durations unknown. Source: .kbd-orchestrator/phases/agent-fabric-convergence/children/release-cadence-optimization/karpathy-learning-log.md

### library: cand-006 — Worktree-local incremental Compass refresh

Disposition: adapt. Refresh changed active worktrees hourly, serialize with heavy packaging, record actual delay and affected-symbol query; no repeat full scans of clean roots.

- Tier 1: Cold UAR update134.98s; ~0.88GB graph, incomplete coverage; real controller query succeeded. Source: .kbd-orchestrator/phases/agent-fabric-convergence/children/release-cadence-optimization/source-evidence.json
