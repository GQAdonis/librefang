# Spec Delta

## Purpose

Govern initiative work as complete usable local Boss deliveries with truthful evidence, bounded resource use and operator-controlled publication, without weakening runtime acceptance requirements.

## ADDED Requirements

### Requirement: Functioning local delivery precedes release claims
The initiative SHALL require completed core and reachable Boss UI, applicable persistence, locale, governance and workspace behavior before its single shipping gate. Each delivery SHALL include a functioning application produced by `pnpm build:mac:arm64`, using the selected packaged UAR rather than a developer runtime override. A missed hourly target MUST be reported as an overrun.

#### Scenario: Sources are complete but app does not launch
- **WHEN** the packaging command succeeds but the resulting application or its bundled UAR fails to operate
- **THEN** delivery remains failed, no usable-release claim is made, and only the failed completed-phase gate is rerun after repair

### Requirement: Publication requires the boundary choice
After every functioning local delivery the operator SHALL be asked whether to publish all macOS and Windows targets now or wait. No answer MUST leave publication pending. All platforms means Apple Silicon and Intel macOS plus x64 and ARM64 Windows; Linux SHALL be excluded. Prior working platform links MUST remain until each replacement is ready.

#### Scenario: Operator chooses to wait
- **WHEN** a functioning local build is delivered and the operator defers broader publication
- **THEN** the local artifact remains usable, publication is deferred, and otherwise approved independent work can continue

#### Scenario: One UAR platform is unavailable
- **WHEN** publication is selected but a requested target lacks its UAR-enabled artifact
- **THEN** that target remains explicitly blocked, its previous link is retained, and a non-UAR artifact is not advertised as fulfilling the request

### Requirement: Roadmap history and dependency coverage are preserved
The revised roadmap SHALL preserve C01–C18 identities, evidence and acceptance requirements while scheduling complete customer journeys with UI. It MUST retain C08 as open until its real gate passes, allow independent C09 prerequisites, and mirror only receipt-proven canonical completion into OpenSpec. Advancing part of C14 SHALL NOT complete all C14 scope.

#### Scenario: Mirror omits a completed task
- **WHEN** an exact canonical receipt proves completion and its mapped OpenSpec checkbox is pending
- **THEN** only that mirror is corrected without a new product completion, changed historical receipt or repeated integration test

### Requirement: Team dispatch follows the completed-phase boundary
Active role instructions SHALL forbid test-first, per-edit verification and partial phase gates for this work. They SHALL preserve existing models, harness routing and unrelated roles. The delivery optimizer SHALL observe logs and advise only; it MUST NOT authorize tests, scope, dispatch or acceptance.

#### Scenario: Runtime and UI workers finish at different times
- **WHEN** one implementation lane finishes while another is still completing the same shipping increment
- **THEN** the finished lane does not start verification and the single gate waits for all planned production wiring

### Requirement: Resource and learning evidence is explicit
Dispatch SHALL reserve one heavy local build writer and assign nonoverlapping source/output ownership. The KBD lead SHALL own hourly changed-root Compass updates and affected-symbol queries, queueing behind the heavy writer and recording actual delay. Boundary learning SHALL use the existing recorder; unknown agent effort MUST remain unavailable rather than zero.

#### Scenario: Graph refresh is due during packaging
- **WHEN** the hourly graph deadline arrives while the heavy build writer is active
- **THEN** the lead records a deferral and runs the queued update/query when the writer is released; the read-only observer does not execute it

### Requirement: Cadence clocks and feedback gates are distinct
Local-delivery elapsed SHALL end at functioning local readiness and include earlier waits/build/gate time. Publication elapsed SHALL be recorded separately; total end-to-end elapsed SHALL preserve overlapping intervals without double-counting. Every child stage SHALL stop for operator feedback before its successor.

#### Scenario: Publication overlaps the next delivery
- **WHEN** a selected platform publication continues while another approved increment starts
- **THEN** receipts retain separate intervals and statuses; the prior local-delivery time is not extended and publication wait is not hidden

#### Scenario: Process implementation finishes
- **WHEN** all process tasks and their single artifact gate complete
- **THEN** Execute stops for feedback; Reflect, archive and parent restoration do not happen without their required authorization
