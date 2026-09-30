# Operating contract: parallel production, one local delivery boundary

**Scope:** `agent-fabric-convergence` and child `release-cadence-optimization` only. The [delivery contract](delivery-contract.md) defines what counts as a functioning local Boss and as publication. This document coordinates agents; it does not report an app build, live invocation, release, or installed acceptance.

## Lanes and authority

| Lane | Owns | May proceed while the heavy writer works? |
| --- | --- | --- |
| UAR runtime and storage | Rust team/task execution, persistence, governance, source contracts | Source edits in its isolated worktree; no shared-target compilation |
| Boss application | UI/navigation, typed IPC, preferences/schema, every locale, end-to-end host wiring | Source edits in its separate worktree |
| Native payload and release | Exact UAR payload, Mac local package, native target jobs, release metadata/site | Preparation and independent remote jobs; one writer at a time in any shared local Rust/Electron build output |
| Delivery observer and ledger | Read-only status, Karpathy/KBD evidence pointers, elapsed/blocker/rework report | Yes; may write only its bounded advisory note |

The KBD lead assigns exact file/worktree ownership before parallel edits, reconciles the canonical task ledger and records the boundary. A role cannot take another lane's files without a handoff. One heavy local Rust/Electron packaging writer has the shared build/target directory at a time. Other agents may keep writing source in isolated worktrees, but may not launch competing compilation or turn partial work into a gate. Reviewer/verifier roles stay dormant until the whole production increment is wired.

The observer is `delivery-optimizer` in `.agent-team/bossfang-stewards/team.json`. It reads existing evidence and reports elapsed local-delivery time, waits, rework, blockers and an evidence-based priority suggestion. Its report cannot authorize scope changes, tests, release, acceptance, agent dispatch or KBD completion. Unknown agent effort stays `null`; an hour without a functioning app is reported as an overrun. The KBD lead alone may queue a Compass incremental graph update and affected-symbol query after the heavy writer releases the build directory, roughly once per active-work hour when source changed. The observer records `due` or `deferred`, never runs Compass or creates a scheduler.

## Local delivery and publication clocks

Each production increment first completes UAR/core, Boss UI, IPC, persistence, locales and governance as a real user journey. After that complete code boundary, run one real integration gate: build with the exact `pnpm build:mac:arm64`, then open the packaged Apple Silicon app using its packaged UAR helper and exercise the completed user journey. A failed completed-boundary gate/build is repaired and only that failed gate/build rerun. Record clean Boss/UAR revisions, artifact hashes, effective UAR port, actual UI result, restart/isolation behavior where applicable and evidence level.

Record three distinct elapsed clocks: `localDeliveryElapsed = localReadyAt - startedAt`, including build and waiting; `publicationElapsed = publicationFinishedAt - publicationStartedAt`, including queues and deployments; and `endToEndElapsed` from start through selected publication completion, or through local readiness while publication is deferred. Do not sum overlapping waits twice or use commit timestamps as active agent effort. The one-local-delivery-per-hour target is a measurement, not an acceptance shortcut.

After **each functioning local delivery**, ask exactly: **“Publish this version for all macOS and Windows targets now, or wait until the next delivery?”** Silence leaves publication pending. A publish-now answer starts four UAR-enabled native targets: darwin-arm64, darwin-x64, win32-x64 and win32-arm64; **no Linux**. Full publication includes GitHub installers with exact checksums/source/signing metadata, committed/pushed The Boss release manifest and `RELEASES.md`, committed/pushed `Know-Me-Tools/boss-landing-spot` generated release data, deployment of the connected Lovable site, and verified live download pointers. Prior working platform links remain until each replacement is valid. Installed acceptance is recorded separately.

## Canonical progress recorder

The mini `scripts/record-progress.mjs` is the Windows-portable boundary recorder. Mini auto hooks are not wired, so the **KBD lead**, after a supported canonical task/change/phase completion transition, invokes it explicitly from the convergence root with the real qualified hook identity, for example:

```text
KBD_HOOK_NAME=afc-release-cadence-optimization:1.3 node /Users/gqadonis/Projects/prometheus/prometheus-skills-mini/scripts/record-progress.mjs --project-root /Users/gqadonis/Projects/prometheus/worktrees/agent-fabric-c06/librefang/docs/plans/agent-fabric-convergence --from-hook --boundary task
```

Use the actual change/task ID and elapsed metadata from the completed boundary; the command above is an invocation pattern, **not a receipt or a command run by this task**. Preserve the returned `recorded`, `queued`, `degraded` or `duplicate` result and link it from the delivery receipt. Never infer completion from an observer note or invent elapsed hours.

## Team source and export receipt

This task repaired only the SurrealDB schema engineer and BossFang feature steward's test-first instructions, removed their `test-driven-development` skill routing, and added the read-only optimizer. The active harness remains Claude, with existing role models and other prompts preserved; `.agent-team/project-routing.json` still selects Claude and now lists the observer definition. The scoped phase-gate note in root `AGENTS.md` and `CLAUDE.md` resolves otherwise conflicting test-first/per-route examples for this initiative only.

There was no persisted agent-team state in `.agent-team/bossfang-stewards/` before this change. The existing agent-team-creator CLI validated the revised manifest, initialized an **ephemeral proposal state at revision 0**, and exported Codex and Claude definitions into isolated temporary proposal directories. Only the two repaired roles and new observer definitions were selectively copied into `.codex/agents/` and `.claude/agents/`; no plugin marketplace or project installer ran. The exporter reports source-verified serialization, **live harness discovery and execution unverified**. This is not a deployed remote team or UAR runtime update.

| Source/export | SHA-256 after edit |
| --- | --- |
| `.agent-team/bossfang-stewards/team.json` | `b03f35c3b981be1fdc07d45b7a03d06bdf2747de7eeeb159d77cfbc6d64ca58a` |
| `.agent-team/project-routing.json` | `a789e255a7ff7c31195194067173c4114e97aa7c97b015134e540a718c32cb52` |
| `.codex/agents/delivery-optimizer.toml` | `c1c04f7619564df5c49ffdc1c58502639d8034583a7f136635ccc1e19cb07649` |
| `.claude/agents/delivery-optimizer.md` | `9a8a6538af8d734ad0f69e284e1a788ee964983e98fe6284c2360421712e93b4` |

Source CLI: `/Users/gqadonis/.codex/plugins/cache/prometheus-skill-pack/prometheus-process-skills/1.6.0/agent-team-creator/scripts/cli.mjs`; commands: `validate --input team-request.json`, `init --input team-request.json`, and `export --input {codex,claude}-request.json`, each on the isolated proposal. All four returned exit 0. No product test, cargo check, app build, review gate or native live probe ran. The complete phase-end integration evidence remains a later parent obligation.
