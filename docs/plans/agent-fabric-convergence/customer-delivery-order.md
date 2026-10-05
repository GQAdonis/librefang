# Customer delivery order — approved 2026-10-05

This is plan revision 8 of the existing Agent Fabric Convergence initiative. It changes delivery ordering, not completed implementation history. The machine-readable [coverage map](customer-delivery-map.json) owns the selected delivery scopes, prerequisites and deferred dispositions.

## Accounting and scope

At canonical revision 500 there are 33 completed main tasks, one cancelled task and 26 unfinished tasks (60 total). The older 34/60 figure counted cancellation as terminal. Completed children have 32/32 tasks. The new shared-runtime requirement is explicitly registered as C14.4 (OpenSpec 1.4): 61 total main tasks, with 27 unfinished. C04/C05/C08 completion is preserved; their previous profile evidence does not prove the new packaged shared-instance profile. This planning delivery completes no product task.

## Ordered usable deliveries

### 1. teams-in-work

Select and operate a coding team in Work with a workspace, natural-language task, member output, artifacts, approvals, cancellation and persisted recovery.

- Coverage: C14.1, C14.2, C16.1, C16.2. C14.1/C14.2 team UI and coding portions of C16.1/C16.2; partial evidence never completes broader criteria.
- Requires: C03, C04, C05, C07, C09, C10.1.
- Operate at the completed boundary: In the packaged normal profile, make a bounded repository change with worker/reviewer handoff, visible artifacts and authoritative approval; cancel and reopen a persisted run.

### 2. reusable-mixed-teams

Create, maintain, save and deploy versioned coding and product/design teams, followed by other practical templates, with shared instructions and scoped skills/tools/knowledge/model bindings.

- Coverage: C15.1, C15.3, C16.1, C16.2, C16.3, C14.1. Desktop UAR authoring and applicable full/mini adapters only; broad C15.2 harness qualification and connector-dependent templates remain outstanding.
- Requires: C03, C09; prior delivery teams-in-work.
- Operate at the completed boundary: Configure and deploy a team, operate it from Work, revise the definition, and observe existing runs retain their pinned definition.

### 3. shared-bossfang-uar

BossFang delegates to the UAR instance supervised by The Boss without installing or spawning a second UAR.

- Coverage: C14.4. New explicitly approved integrated-desktop profile; no reopening of completed C04/C05/C08.
- Requires: C04, C05, C08, C09; prior delivery reusable-mixed-teams.
- Operate at the completed boundary: Start BossFang from The Boss, delegate a governed run to the same UAR identity, then observe approvals, cancellation and endpoint rebind after restart without duplicate sidecar/effect.

### 4. bossfang-miniapp

Open the actual BossFang dashboard from Apps and settings using isolated authenticated navigation.

- Coverage: C14.3. Actual packaged dashboard and sidecar; no replacement dashboard.
- Requires: C14.4; prior delivery shared-bossfang-uar.
- Operate at the completed boundary: Open the packaged MiniApp, change BossFang configuration, reopen it and operate a workflow delegated to the same UAR instance used in Work.

### 5. feedback-to-github

Feedback becomes a reviewed, explicitly approved GitHub issue through direct Boss and BossFang intake.

- Coverage: C10.2, C10.3, C16.2. GitHub subset of C10.2; Notion/Slack/Jira remain pending. An issue never automatically authorizes implementation.
- Requires: C05, C07, C08, C09, C10.1; prior delivery bossfang-miniapp.
- Operate at the completed boundary: Classify and deduplicate feedback, review the draft, approve one GitHub issue and recover from an uncertain response without duplicate effects.

## Shared runtime ownership

The Boss owns desktop process supervision, connection selection and product UI. BossFang owns its workflow/schedule/trigger state. UAR owns delegated runs, teams, member admission and execution checkpoints. Each delegated execution has one loop and one effect owner. Preserve BossFang's standalone/native executor and existing Codex/Claude workflows; neither is silently converted to UAR team-member execution.

The integrated profile uses one Boss-owned UAR sidecar, discovered by instance identity and resolved endpoint rather than a fixed port. BossFang cannot spawn a replacement, stop a borrowed runtime, copy the desktop launch token as a delegation shortcut or silently select another executor. Reconcile capability admission and authenticated host boundaries first. Link UAR catalog IDs rather than duplicate definitions; correlate histories, approvals and usage without double prompts/reservations/settlement. Reuse configured inference and storage services with separate credentials/scopes/namespaces where required. Shared infrastructure is not shared unrestricted memory.

The MiniApp embeds the existing /dashboard/ assets with account isolation, origin restrictions, credential-free URLs and browser fallback. Its complete operation includes an actual BossFang delegation to the same UAR used in Work. Required trust boundaries are sidecar authentication, tool-effect authorization, workspace isolation and MiniApp navigation; this is not a general hardening project.

## Selection and deferred work

C10.2 is deferred in the authored queue with its earlier activity preserved. Canonical KBD rejects InProgress → Pending, so its supported state is Blocked with an explicit priority-hold reason; resume InProgress when its GitHub delivery is selected. C14.1 is selected next, followed by the scoped order in the coverage map. C14.3/C14.4 are deliberately not next merely because they share C14. At each delivery handoff, select the mapped canonical task explicitly; never use historical exactNextWork text as authority. A partial coding/template/UI delivery records coverage but cannot complete its full parent task. Delivery IDs are not another layer of counted KBD tasks.

Defer Notion/Slack/Jira, C11, C12, C13, C17, C18.1 and broad C15.2 qualification. C18.2 desktop recovery and C18.3 desktop release evidence accompany each relevant delivery; their non-desktop matrices/benchmarks remain outstanding. Preserve all recommendation owners and original acceptance. No first team release waits for BossFang, connectors, federation, mobile, Forge or KnowMe work not used by that profile.

## Cadence and team ownership

Keep 120-minute autonomous iterations and the existing profile. Every complete product increment runs pnpm build:mac:arm64, launches the package and operates its new function. Complete code/UI/strings/persistence/payload before the single boundary; no intermediate suites or verification builds. Time expiry stops new scope, not a license to certify unfinished work. Preserve overruns and unknown timing.

Every second successful delivery publishes all four macOS/Windows architectures through GitHub Releases, release metadata and the website; no Linux. Publish ready platforms promptly. Installed acceptance is separate. Historical publication debt requires exact immutable evidence or a supported explicit replacement preserving provenance, never a dispatch-based success. One build writer, one publisher, one in-flight release, one pending candidate and one isolated work-ahead scope. Freeze generated inputs first; fix current failures before promotion. Children retain the parent clock, evidence and approvals.

boss-core owns product delivery: lead (contracts/KBD), runtime, desktop/UX, and skills/packaging with at most three disjoint implementers. BossFang changes hand off to bossfang-stewards. The current documentation revision uses the product-manager role and a lead-owned canonical writer. Existing model-dispatch classes/routes remain; C14.4 uses the architecture route because it crosses process, authentication and authority boundaries. No provider setting changes or native equivalence claims. Reviewers remain dormant until a completed delivery.

## Handoff and evidence

The next implementer resolves C14.1 through model-dispatch, claims product files through repository-scoped changes, and chooses the first independently usable Teams in Work slice. Each cadence start declares the actual feature procedure and candidate-specific receipt paths; onboarding alone is not the feature operation. The old C10 launch receipt cannot be reused. User approval covers this reordering, not fabricated operational acceptance.

One final planning check covers the DAG, canonical/OpenSpec mapping, deferred coverage, model routes, next selection and cadence preservation. No application build belongs to this documentation revision. The prior bounded review identified active-task displacement, C18 partitioning and missing explicit dependencies; all have explicit dispositions here. Shared-instance authentication remains an implementation prerequisite, not a claim already demonstrated.

## Canonical scheduling constraint

The installed runtime rejects both InProgress → Pending and re-registration/resequencing of an existing change. Preserve original canonical sequences. C10.2 uses a documented Blocked priority hold. Use kbd-apply begin-task to explicitly select each mapped scope at the next handoff; after C14.1/C14.2, select the mapped C15/C16 task before C14.4/C14.3. Do not drain a change or select blocked/deferred work merely because it sorts first. This is an approved execution instruction, not a claim that KBD gained an automatic dependency scheduler.

### Shared-runtime packaging prerequisite

C14.4 includes the pinned BossFang executable, functional dashboard assets, integrity records and main-process supervision needed to operate the packaged shared-runtime profile. C14.3 consumes that payload for Apps/settings embedding and isolated navigation; retain its original packaging acceptance by mapping exact C14.4 receipts.
