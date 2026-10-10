# Design

## Context

See proposal.md for motivation and repository scope, and the assessment/source-evidence.json for pinned current observations. Historical gaps are not assumed to persist. This is an initiative-level specification. The local OpenSpec root authorizes planning edits only. Before product implementation, create or link repository-scoped changes in each affected worktree with exact file ownership, existing-spec reconciliation, and this change ID. Do not apply sibling code edits from this planning root.

Repositories: the-boss, librefang, universal-agent-runtime. Scope: Existing Boss connection/run/approval views and site-view host; BossFang console API. Full-backlog dependency envelope (historical change-wide scheduling; use the scoped dependencies below): C04, C05, C07, C09, C10. External checkpoints: D-UAR-P1 (definitions in dependencies.md).

## Goals / Non-Goals

**Goals:** Deliver C14 through existing product authorities and observable acceptance.

**Non-Goals:** Preserve P1 product history and lifecycle architecture; do not duplicate specialized BossFang administration. No implementation or service changes occur in this planning package.

## Decisions

- library: cand-002 — **adopt** Accepted P1 UAR driver and host bridge. Adopt only an agreed immutable checkpoint; do not duplicate current integration. Evidence: source-evidence.json and D-UAR-P1; prior research/source evidence reused, no new registry verification Risks: Current runtime conformance and dependency compatibility require the assigned acceptance gate.
- library: cand-006 — **reference** A2A/MCP/AG-UI/CloudEvents boundary conventions. Revalidate selected versions before adoption; protocols do not establish authority/durability. Evidence: Primary references indexed by R1–R6; prior research/source evidence reused, no new registry verification Risks: Current runtime conformance and dependency compatibility require the assigned acceptance gate.
- Keep product conversation history in The Boss and execution context/checkpoints in the owning runtime. A delegated run has one executor; orchestration does not duplicate that loop.
- Prefer additive provider capability before consumer enforcement; reject required unsupported semantics rather than dropping them. Alternative: an all-at-once multi-repository cutover; rejected because Git branches provide no atomic multi-repository release.
- Use the sequential dependency order until exact file claims and resource isolation permit concurrency. Alternative: simultaneous writers on matching branches; rejected because matching names neither resolve semantic conflicts nor isolate shared resources.

## Risks / Trade-offs

- Active integration can supersede gaps → consume immutable agreed checkpoints before assigning product files.
- Delivery groups below exceed a single-session assignment → decompose into repository-scoped, single-session tasks after C01; retain IDs and acceptance links. They are not directly dispatchable execution tasks.
- Shared ports, databases, build caches and tool installations escape Git isolation → use isolated data roots and explicit resource ownership; one local Rust build writer.

## Migration Plan

Reconcile current source and existing product specs; record accepted dependency and file-ownership checkpoints. Deliver provider changes with backward-compatible consumers where possible, then pin consumer adoption. Run this change's acceptance and relevant operational-mode rows. Record schema compatibility and rollback limitations before promotion; do not reverse already-issued external effects through a code rollback.

## Verification

Two clients decide one challenge consistently; console account isolation/navigation and no generic privileged bridge are verified; unsupported controls and private data stay hidden.

Use repository-required checks and observable real-boundary scenarios; source inspection and planned checkboxes are not execution evidence. Recommendation coverage: REC-009, REC-023.

## D01 early consumer boundary

The separate `afc-d01-local-mac-durable-agent-delivery` change may expose the already accepted C06 instance lifecycle and C07 local observer backlog/recovery in the existing Boss UAR settings **before** this full C14 change is ready. It must use the same trusted host adapter, typed IPC, persistence and locales, keep two workspaces isolated, and display only supported operations. This is a bounded C14.1 contribution, not completion of C14.1: the definition/instance/activation/run/team/workflow distinction, task graph, budgets, binding posture and broader subscription failures remain in this change. This historical D01 receipt leaves C14.2 approval/challenge and C14.3 console acceptance outstanding; their scheduling now follows the customer-priority revision below. The D01 app gate is a local consumer receipt, not full C14 verification.

## C14.3 BossFang MiniApp boundary

The operator selected embedding the existing BossFang/LibreFang dashboard, served by its local sidecar at `/dashboard/`. The Boss owns launch, process supervision, endpoint discovery and MiniApp containment; BossFang owns the dashboard's configuration UI and authenticated session. An Apps shortcut and settings links resolve the current endpoint before opening one MiniApp, so a changed port cannot leave a stale tile. The managed service binds only to loopback. An external service is labeled external and is never started or stopped by The Boss. A missing or unhealthy endpoint produces an actionable connection state rather than an empty MiniApp.

The current source has no BossFang executable in The Boss payload. C14.4 therefore owns the prerequisite pinned Mac ARM64 and Windows x64 binaries, functional dashboard assets, package integrity and managed supervision so its packaged shared-UAR delegation can run before MiniApp embedding. C14.3 consumes that payload and its exact receipts; this fulfills its original packaging/lifecycle coverage without duplicating implementation or deleting acceptance. The BossFang build can skip dashboard compilation and embed an empty asset directory; release packaging must reject that output, and the packaged `/dashboard/` must render usable configuration pages on both customer platforms. An external-daemon shortcut may ship earlier as a useful bounded increment, but cannot satisfy managed packaging. Preserve the planned per-instance/account partition, allowlisted loopback origin, blocked untrusted redirects, no ambient privileged bridge, native dashboard login, credential-free URL and browser fallback. Do not invent an automatic token handoff: first use BossFang's own login, and adopt handoff only if its existing API supports a short-lived, instance-bound exchange without exposing secrets to the renderer. The final gate opens the actual packaged dashboard and operates a configuration action; a tile that only navigates to a port is not acceptance.

The historical two-delivery C14.3 decomposition is now allocated explicitly across tasks: C14.4 first makes the pinned sidecar, functional dashboard assets and supervision installable on Apple Silicon and Windows x64, exposes health/ownership state, and operates shared-UAR delegation through the packaged normal profile. C14.3 then consumes the same payload and adds the Apps tile, settings links and isolated MiniApp session/navigation host, operating actual configuration and delegated-workflow actions. C14.4 receipts map to C14.3's retained packaging/lifecycle requirements; C14.3 remains incomplete until its original full customer-platform and console acceptance is met. No build or operation is repeated solely to credit the same evidence twice.

## Approved customer-priority revision — 2026-10-05

Select C14.1 next. Teams in Work (C14.1/C14.2 with coding portions of C16.1/C16.2) ships first; reusable mixed-team configuration follows. Their prerequisites are accepted C03/C04/C05/C07/C09 contracts, C10.1 only where workflow presentation consumes it, and the relevant existing skill bindings. They do not depend on completing C10 connectors, all of C15, C14.4, or the BossFang MiniApp. Next deliver new C14.4 shared-instance integration, then C14.3 MiniApp; C14.3 depends on C14.4 and the usable-team deliveries. Preserve every original administration, approval and console requirement.

Delivery evidence maps to the original task IDs; partial delivery is not whole-task completion. The parent phase plan and delivery coverage map select bounded repository-owned work. Complete production wiring, UI, strings, persistence and packaged inputs before the build-and-operate boundary; no per-edit verification loop.

## C14.4 shared desktop runtime design

C14.4 owns the prerequisite native BossFang executable, nonempty functional dashboard assets, integrity manifest and main-process supervision packaging on customer Mac ARM64 and Windows x64. Its shared-runtime operation must use those installed inputs, so these dependencies cannot be left to later C14.3. C14.3 reuses the resulting payload and recorded evidence for its original packaging coverage.

The Boss owns its UAR process and supplies BossFang a resolved instance binding through the existing trusted main-process/admission boundary. Reconcile C04/C05/C08 capabilities against the packaged sidecar before adapting their bindings; past completion does not prove this integrated desktop profile. Never equate endpoint reachability or possession of the host launch token with delegation authority. Keep process ownership explicit across Boss-managed, BossFang-managed and external instances. Port changes trigger authenticated rebinding to the intended instance, not a second process or silent native-executor fallback. Preserve standalone BossFang/native workloads.

BossFang owns orchestration; UAR owns each delegated execution and its member scheduler. Correlate stable catalog/workflow/run/task/decision/effect identities rather than copying catalog state, replaying effects or maintaining duplicate agent loops. Preserve singular approval and budget reservation/settlement authorities, effective liter-llm/UAR model bindings and credentials, scoped memory namespaces, and separate product-history/orchestration/runtime records. The UI links to the owning configuration surface and reports unavailable or incompatible bindings. This is newly explicit C14.4 work, not an implicit reopening of completed C04/C05/C08.

The completed-boundary operation uses the packaged normal profile: a BossFang workflow delegates to the same UAR used by Work; show member output, one authoritative approval/effect and cancellation, restart/rebind behavior and visible connection failure without fallback. C14.3 then operates this journey through its real embedded dashboard as well as its original configuration, session and navigation scenarios. Both scopes retain customer Mac ARM64/Windows x64 evidence and applicable release/acceptance status separately.


## Operator-approved BossFang accessibility repair — plan revision 9, 2026-10-05

The operator explicitly approved completing C14.4 and C14.3 now inside current Cadence iteration 8, while retaining the unfinished C14.1/C14.2 Teams delivery and its clock/history. This urgent repair overrides the prior ordering hold on BossFang; Teams remain part of the combined final functional operation and no prior task completion is reopened or fabricated.

BossFang must not bundle, install, spawn, restart, stop or supervise UAR. Replace its child supervisor with an authenticated selected-instance connection manager. The Boss alone supervises its packaged UAR and separately owns managed BossFang. Default BossFang loopback port 4545, automatic increments and explicit conflict errors, requested/effective port, save/restart, external ownership and native-executor compatibility are required. Existing runs retain admitted identities; new selection applies to new runs only.

The Boss issues native in-memory UAR grants through host-authenticated POST /api/uar/delegation-grants and revokes through DELETE /api/uar/delegation-grants/{id}. Credentials expire in 900 seconds and bind verified principal, explicit workspaces and operation scopes (discovery, model_read, model_completion, full_harness_delegation). Completion scope permits only the existing actual completion route; full-run diagnostic uses real native admission and execution, not a health-only certification. Runtime restart, generation/binding change invalidate authorization. Never forward the host launch token or trust caller principal headers for delegated credentials. External identities use configured authentication.

Apps automatically shows the actual orange BossFang mascot and embeds its actual /dashboard/ via the isolated MiniApp. Always-visible Settings /settings/bossfang provides managed/external configuration, protected credentials, lifecycle, logs, independent UAR instance selection default managed-local, applied/pending states and a streamed redacted diagnostic report. Typed IPC, preference sources/generation, settings search and every locale belong to the same increment.

User-invoked diagnostics separately report listening, authenticated, compatible, and delegation operational; include bounded real model use in disposable workspace, correlated completion and cancellation. Missing models/credentials have actionable configuration links. Four target pinned executables include embedded functional dashboard manifests: Mac ARM64/x64 and Windows x64/ARM64. Preserve no Linux installer publication.

Repository implementation ownership: UAR scoped change bossfang-scoped-delegation-grants; BossFang scoped selected-instance connection change; The Boss scoped accessibility/settings change. Root coordinates native payload manifests, importer and release pipeline. Three independent implementation writers; one build writer and one publisher. No intermediate checks or tests; complete all production wiring then pnpm build:mac:arm64, packaged Teams plus BossFang operation and failure/recovery scenarios. Native Windows installed acceptance remains separately pending.

## Revision 10 — six-hour convergence recovery, 2026-10-05

The parent Revision 10 addendum and `customer-delivery-map.json` recovery mapping control current scoped scheduling; earlier ordering is retained history. Revision 9's unfinished Teams plus urgent BossFang accessibility remain combined in increment 1. Recovery-child Execute installs instructions only; parent C14.1 resumes after separately requested Reflect and parent restoration. Keep original task IDs, unchecked criteria and partial source work; no product completion is credited by this amendment.

R1 (`boss-runtime`) repairs truthful approval inspection through private prepared facts/digests, admitted run/tool-call/approval correlation and the operation consumer; it preserves pending identity/hash/cursor/ownership and exposes no raw arguments, credentials or full content. R2 (`boss-desktop`, authorized BossFang integration writer) refreshes observation through the original admitted instance's run lookup and drains unread output without waiting after terminal empty replay. Preserve instance/principal/workspace/cursor/run binding; neither `agui.done` alone nor increased timeouts qualifies success. R3 (`boss-lead`, necessary renderer changes only) freezes corrected sources/pins/payloads and delivers the packaged combined operation. Exact file claims and retained-criteria mapping are in the parent Revision 10 table.

C14.1/C14.2 Work repair and C14.4/C14.3 same-UAR Apps/settings/dashboard repair run together before authoring. All original administration fields, lifecycle verbs, two-client authoritative decisions, isolated navigation/browser fallback, ownership, grants and native customer-platform acceptance remain required. Previously fixed partition/session ownership is not reopened. The Boss remains UAR supervisor; stopping BossFang leaves UAR running. Separate Teams/BossFang results cover only their mapped criteria.

Three whole-increment targets are 120 minutes each: success 7 full publication → success 8 local-only → success 9 full publication, preserving the inspected six-success/nextCount-7 anchor and every-two schedule. Each delivery requires a new local `pnpm build:mac:arm64` package and actual feature operation; full publication requires Mac ARM64/x64 + Windows x64/ARM64, GitHub metadata and https://the-boss.know-me.tools; no Linux. Failed attempts/overruns, child time, legacy publication debt and independent installed acceptance survive. Complete production work before the single boundary; one build writer/publisher, at most three implementers, bounded isolated work-ahead. Six hours targets three useful increments, not completion of every original requirement.
