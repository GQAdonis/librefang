## MODIFIED Requirements

### Requirement: Functioning local delivery precedes release claims
The initiative SHALL require completed core and reachable Boss UI, applicable persistence, locale, governance and workspace behavior before its single shipping gate. Each Boss delivery SHALL include a functioning application produced by `pnpm build:mac:arm64`, using the selected packaged UAR rather than a developer runtime override, and actual operation of its newly delivered functionality. A missed configured delivery target, currently 120 minutes, MUST be reported as an overrun. Process-skill increments SHALL operate their own complete delivered functionality; an unrelated application build MUST NOT substitute for that evidence. Packaged-skill inclusion SHALL remain an obligation of the next affected Boss delivery. Local build, launch, feature operation, publication and installed-platform acceptance SHALL remain distinct states.

#### Scenario: Sources are complete but app does not launch
- **WHEN** the packaging command succeeds but the resulting application or its bundled UAR fails to operate
- **THEN** delivery remains failed, no usable-release claim is made, and only the failed completed-phase gate is rerun after repair

#### Scenario: A process skill is delivered
- **WHEN** the completed Cadence skill operates through its real CLI contract
- **THEN** that operation supports the skill delivery claim while its inclusion in the next Boss package and that package's application operation remain separately owed

### Requirement: Publication requires the boundary choice
Publication SHALL follow an explicit operator choice or an already authorized recurring policy. Without standing authorization, after every functioning local delivery the operator SHALL be asked whether to publish all macOS and Windows targets now or wait; no answer MUST leave publication pending. The current standing policy SHALL publish every second successful delivery without asking for duplicate approval, while preserving manual override and existing debt. All platforms means Apple Silicon and Intel macOS plus x64 and ARM64 Windows; Linux SHALL be excluded. Prior working platform links MUST remain until each replacement is ready. Pending installed acceptance MUST NOT by itself block authorized publication or independent development.

#### Scenario: Operator chooses to wait
- **WHEN** a functioning local build is delivered and the operator defers broader publication
- **THEN** the local artifact remains usable, publication is deferred, and otherwise approved independent work can continue

#### Scenario: One UAR platform is unavailable
- **WHEN** publication is selected but a requested target lacks its UAR-enabled artifact
- **THEN** that target remains explicitly blocked, its previous link is retained, and a non-UAR artifact is not advertised as fulfilling the request

#### Scenario: Recurring publication becomes due
- **WHEN** the second successful delivery under the standing policy is recorded
- **THEN** its publication obligation is created without duplicate permission and remains distinct from installed acceptance

### Requirement: Cadence clocks and feedback gates are distinct
Local-delivery elapsed SHALL end at functioning local readiness and include earlier waits/build/gate time. Authorized work-ahead SHALL retain its original firstWorkAt when promoted. Publication elapsed SHALL be recorded separately; total end-to-end elapsed SHALL preserve overlapping intervals without double-counting. The current local delivery target SHALL remain 120 minutes unless explicitly changed by the operator. Every child stage SHALL stop for operator feedback before its successor; standing publication authorization MUST NOT bypass those stage gates.

#### Scenario: Publication overlaps the next delivery
- **WHEN** a selected platform publication continues while another approved increment starts
- **THEN** receipts retain separate intervals and statuses; the prior local-delivery time is not extended and publication wait is not hidden

#### Scenario: Process implementation finishes
- **WHEN** all process tasks and their single artifact gate complete
- **THEN** Execute stops for feedback; Reflect, archive and parent restoration do not happen without their required authorization
