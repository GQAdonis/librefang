# Agent Fabric governed-effect contract v1

**Contract:** `afc.governed-effect/1`  
**Version:** `1.1.0`  
**Status:** normative C02 implementation contract; repository conformance and D-GATE remain separately gated.  
**Machine form:** [governed-effect-contract-v1.json](governed-effect-contract-v1.json)  
**Source receipt:** [source-receipt-2026-09-27.md](source-receipt-2026-09-27.md)

This contract specializes the accepted C01 `afc.convergence-contract.v1` and `afc.identity-state-action.v1` contracts for one protected effect. It applies to UAR direct, managed, embedded and proxied execution routes. It does not transfer execution ownership to Flint Gate, The Boss, a transport or a connector.

## Normative invariants

1. UAR owns effect admission, dispatch lineage, result recording and uncertain-outcome reconciliation for UAR work.
2. Flint Gate or the P1 trusted host owns policy decisions, issuer-scoped approval identities and grant revisions. An authority decision never performs the effect.
3. A governed route fails closed, with visible posture, when policy, required facts, identity, a current grant, approval, lease or budget reservation is missing or invalid.
4. The admitted effect is the exact tuple of subject, actor, audience, action, resource, canonical payload digest, active policy revision, grant revision, approval decision, lease epoch and budget reservation. Its `authorityDigest` binds that tuple.
5. Approval is not portable authority. It is issuer-scoped, challenge-scoped, subject/actor/audience-scoped and bound to one `requestDigest` and `effectId`.
6. Authority is re-evaluated after every approval or other durable wait and immediately before admission. Changed payload, policy, grant, lease or budget facts require a new decision; stale approval cannot be rebound.
7. Admission is recorded before connector dispatch. A denied, revoked, expired or cancelled-before-dispatch effect cannot reach the connector.
8. A dispatched effect with an unknown result becomes `uncertain` and then `reconciling`. Cancellation or retry cannot rewrite it as not having happened. Retry requires connector evidence that the same idempotency identity is safe.
9. No authority-bearing object or receipt contains raw credentials, secrets or raw protected payloads.
10. `constrained-local` is an explicit profile, never an error fallback from governed mode.

## Required intent and authority fields

Every effect intent MUST contain the following fields. Opaque identifiers use the identity classes defined by C01; display names and paths are never identifiers.

| Group | Required fields | Meaning |
|---|---|---|
| Envelope | `contract`, `effectId`, `commandId`, `createdAt`, `route`, `governanceProfile` | Contract/version selection, durable effect and idempotency identities, source route and explicit profile. |
| Execution lineage | `workspaceId`, `runtimeInstanceId`, `deploymentBindingId`, `taskId`, `attemptId`, `runId`, `stepId`, `invocationId` | Exact UAR execution lineage. A non-applicable identifier is encoded as JSON `null`, never omitted or replaced by another identity class. |
| Identity | `principal.subjectPrincipalId`, `principal.actorPrincipalId`, `principal.audience`, `principal.authnContextId` | Subject on whose behalf the action occurs, authenticated actor, sorted authorized recipients and immutable authentication context. |
| Action | `action.namespace`, `action.name`, `action.version` | Stable typed action. Free-form tool labels are not authorization actions. |
| Resource | `resource.type`, `resource.id`, `resource.ownerScope`, `resource.workspaceId`, `resource.revision`, `resource.locationClass` | Exact target, owner/workspace boundary, mutable revision when applicable and placement class. |
| Payload | `payload.mediaType`, `payload.canonicalization`, `payload.sha256Digest`, `payload.disclosureLabels`, `payload.bodyRef` | Canonical content identity and protected reference. `bodyRef` resolves only inside the execution owner and is excluded from authority-provider logs. |
| Policy | `policy.policySetId`, `policy.activeRevision`, `policy.sha256Digest`, `policy.requiredFactSchema`, `policy.evaluatedAt` | Exact active policy and typed fact contract used for the decision. |
| Grant | `grant.grantId`, `grant.issuerPrincipalId`, `grant.subjectPrincipalId`, `grant.revision`, `grant.status`, `grant.notBefore`, `grant.expiresAt`, `grant.constraintDigest` | Current issuer-scoped delegated authority. `grant` may be JSON `null` only when the active policy explicitly permits the action without a grant. |
| Lease | `lease.leaseId`, `lease.taskId`, `lease.attemptId`, `lease.epoch`, `lease.holderAgentInstanceId`, `lease.expiresAt` | Current fenced executor ownership. |
| Budget | `budget.reservationId`, `budget.budgetId`, `budget.revision`, `budget.amount`, `budget.unit`, `budget.expiresAt` | Atomic reservation covering the effect. Zero-cost actions still use an explicit zero reservation when policy requires a budget fact. |
| Correlation | `correlation.parentEffectId`, `correlation.workflowId`, `correlation.conversationId`, `correlation.traceId` | Optional parent/product/workflow correlation. These values never confer authority. |

Before authority resolution, the UAR intent may carry only an expected policy revision. The Gate wire request MUST NOT carry a client-authored policy object: Gate resolves and binds its own active Cedar set, revision and digest from the exact snapshot it evaluates. Grant input may be empty; the active Gate policy decides whether a grant is required and denies when required authority is absent. `requestDigest` is SHA-256 over canonical JSON containing every authority-bearing request field except `createdAt`, `payload.bodyRef` and the `correlation` group. It includes the canonical payload digest. `authorityDigest` is SHA-256 over `requestDigest`, the Gate-resolved policy decision, the grant revision or explicit no-grant disposition, the active approval decision or explicit no-approval disposition, the lease epoch and the budget reservation revision. Arrays are sorted before canonicalization; duplicate audience and disclosure labels are rejected.

## Gate wire profile

The private authority API uses the same protocol identifier, `afc.governed-effect/1`, but accepts a deliberately smaller provider request. `POST /authority/effects/evaluate` receives `effect_id`, `invocation_id`, typed action and resource, canonical SHA-256 payload identity, authenticated identity facts, zero or more grants, a finite active lease, a finite active budget reservation and runtime/host/catalog epochs. Unknown top-level fields are rejected; in particular, client-supplied `policy` is invalid. Gate authenticates the trusted P1 caller, records its configured issuer and fact source, resolves the active Cedar snapshot, and returns the policy binding in the decision.

The Boss builds this request at the trusted host boundary. It derives subject, actor, audience, tenant and workspace from the authenticated P1 session rather than trusting UAR-provided identity as authority. UAR remains authoritative for its task lease and budget reservation facts; The Boss forwards them only when the paired sidecar receipt binds the exact request and both facts have finite expirations. `POST /authority/effects/revalidate` receives the same request plus the issuer and challenge identity. The Boss presents and records decisions through `POST /authority/effects/{issuer}/{challenge_id}/decision` and returns an unchanged host admission receipt to UAR.

## Decision, challenge and approval semantics

### Policy decision

A policy authority returns one durable `PolicyDecision` with:

- `policyDecisionId`, `effectId`, `requestDigest`, `policySetId`, `policyRevision`, `policyDigest`;
- `subjectPrincipalId`, `actorPrincipalId`, sorted `audience`;
- exact `action`, `resourceDigest` and `payloadDigest`;
- `grantId`, `grantRevision` and `grantConstraintDigest`, or an explicit `noGrantRequired: true`;
- `result`: `allow`, `deny` or `challenge`;
- stable `reasonCodes`, `requiredChallengeKind`, `evaluatedAt` and `validUntil`.

Missing or invalid policy, required facts, identity or grant produces `deny`; it is never represented as an authority-provider outage followed by permissive execution. `challenge` means the policy cannot admit the effect without a qualifying approval. It is not an allow decision.

### Approval challenge

An `ApprovalChallenge` is created only from a `challenge` decision. It contains `approvalChallengeId`, `issuerPrincipalId`, `effectId`, `requestDigest`, the decision and policy revisions, subject/actor/audience, exact action/resource/payload digests, required approver constraints, `createdAt`, `expiresAt`, `status` and `challengeRevision`. Status is one of `pending`, `decided`, `expired`, `cancelled` or `superseded`.

A challenge is presentation state. Re-presenting it retains the same identity and revision. A changed authority-bearing field supersedes it and requires a new challenge identity.

### Approval decision

An `ApprovalDecision` contains `approvalDecisionId`, `approvalChallengeId`, `issuerPrincipalId`, `approverPrincipalId`, `effectId`, `requestDigest`, subject/actor/audience, exact action/resource/payload digests, policy and grant revisions, `decision` (`approve` or `deny`), `decisionRevision`, `decidedAt`, `validUntil`, `revocationRevision`, `revocationStatus` and stable `reasonCodes`.

An approval is usable only when:

- its issuer is the authority named by the challenge;
- the challenge and decision are current, unexpired and not revoked or superseded;
- subject, actor and every audience member match exactly;
- `effectId`, `requestDigest`, action, resource and payload digests match exactly;
- policy and grant revisions still match; and
- a fresh policy evaluation after the wait, with that exact approval decision supplied as a typed fact, returns `allow` for the same request.

An approval cannot expand policy or grant constraints, authorize a sibling effect, change audience, survive a payload change or substitute for a current lease or budget reservation.

## Effect state machine

| State | Meaning | Permitted next states |
|---|---|---|
| `proposed` | UAR durably recorded the intent and source route. | `evaluating`, `cancelled-before-dispatch` |
| `evaluating` | Current identity, policy, facts, grant, lease and budget are being resolved. | `denied`, `awaiting-approval`, `admitted`, `cancelled-before-dispatch` |
| `awaiting-approval` | A durable challenge exists; no dispatch is permitted. | `evaluating`, `denied`, `cancelled-before-dispatch` |
| `admitted` | UAR atomically recorded the valid `authorityDigest`, current lease and reserved budget. | `dispatching`, `cancelled-before-dispatch` |
| `dispatching` | Dispatch intent is durable and the connector call may have begun. | `succeeded`, `failed`, `uncertain` |
| `uncertain` | The connector may have performed the effect but no authoritative outcome is known. | `reconciling` |
| `reconciling` | UAR queries authoritative result state without replaying the effect. | `succeeded`, `failed` |
| `succeeded` | An authoritative effect receipt proves success. | none |
| `failed` | An authoritative receipt or reconciliation proves failure. | none |
| `denied` | Current authority rejected or could not validate the effect before dispatch. | none |
| `cancelled-before-dispatch` | Durable cancellation settled before connector dispatch. | none |

`dispatching` is the point after which cancellation is only a request to stop work. It does not establish that an external effect did not occur. Retry creates a new `AttemptId` but preserves the task and effect reconciliation lineage; reuse of the same connector idempotency key is allowed only when that connector contract proves it safe.

Every transition appends a redacted `GovernanceReceipt` containing `effectId`, `state`, `eventId`, `eventSequence`, `occurredAt`, `requestDigest`, `authorityDigest` when available, policy/grant/challenge/approval/lease/budget revisions, stable `reasonCodes`, `visiblePosture`, and an optional `effectReceiptId`. Receipts never contain raw payloads, credentials or policy secrets.

## Governance profiles

### `governed`

All required fields and current authority-provider checks apply. Provider failure, missing policy, invalid policy, missing required facts or stale revisions deny visibly. Direct, managed, embedded and proxied routes use the same contract; route selection cannot change authority semantics.

### `constrained-local`

This profile is selected explicitly by an operator or installed binding. It is not chosen automatically when Gate or another authority is unavailable.

- Subject and actor MUST be the same authenticated local principal; audience MUST contain only the local UAR runtime.
- Resource `locationClass` MUST be `workspace-local` and the resource MUST resolve inside one admitted workspace root.
- Network, remote-service, external-publication, credential-bearing, organization-wide, financial and multi-hop delegated effects are forbidden.
- The P1 trusted host supplies a pinned local policy revision and, when required, an issuer-scoped host approval. Missing or invalid local policy still denies.
- The same payload digest, lease, budget, post-wait recheck, receipt and uncertain-outcome rules apply.
- Receipts carry `governanceProfile: "constrained-local"` so no downstream consumer can report shared-Gate enforcement.

This profile does not satisfy D-GATE and cannot mint a grant accepted by a governed shared-service route.

## Repository ownership split

| Owner | C02 responsibility | Explicit non-ownership |
|---|---|---|
| Universal Agent Runtime | Create and persist effect intents; canonicalize authority-bearing request fields; hold tasks, attempts, leases and budget reservations; call the authority adapter; re-evaluate after waits; admit and dispatch effects; record results and reconcile uncertain outcomes across direct, managed, embedded and proxied routes. | Does not mint Gate policy, issuer grants or approvals; does not let a portable agent definition confer authority. |
| Flint Gate | Validate authenticated subject/actor/audience; evaluate the active Cedar policy and required facts; issue durable policy decisions, challenges and issuer-scoped approval decisions; maintain grant/approval revisions and revocation state; expose current decision state to UAR through D-GATE. | Does not schedule UAR tasks, reserve UAR budgets, own UAR leases, dispatch connectors or infer effect completion. |
| The Boss trusted host | Preserve the accepted P1 principal, workspace, credential and exact tool-admission boundary; present challenges and decisions; provide the explicit `constrained-local` authority when selected. | No second scheduler or execution ledger; host restriction may narrow but never enlarge UAR/Gate authority. No C02 product edit is implied by this contract. |
| Effect connector | Accept only an admitted request and its stable idempotency identity; return an authoritative success, failure or unknown outcome receipt; support result lookup where its contract provides one. | Does not authorize the action, reinterpret identity or retry an uncertain effect on its own. |
| Fabric and memory services | Transport authorized envelopes and retain scoped context under their existing contracts. | No policy authority, approval authority, execution scheduling or effect completion authority. |

The D-GATE provider contract remains an implementation dependency. Until UAR and Gate agree and demonstrate this interface, the shared `governed` Gate-backed profile is not conformant. The P1 trusted-host boundary and explicit `constrained-local` profile may operate without claiming D-GATE.

## Negative acceptance matrix

The final C02 gate exercises real direct, managed, embedded and proxied routes. “No dispatch” means the connector observes no call and UAR emits a terminal visible posture naming the stable reason code.

| Scenario | Required result | Dispatch/effect invariant |
|---|---|---|
| Forged or unauthenticated subject | `denied / identity.subject-invalid` | No dispatch. |
| Actor does not match authenticated context or delegated grant | `denied / identity.actor-invalid` | No dispatch. |
| Audience omitted, duplicated or outside grant | `denied / identity.audience-invalid` | No dispatch. |
| Governed profile has no active policy | `denied / policy.missing` | No dispatch; never fall back to constrained-local. |
| Policy cannot parse, validate or load | `denied / policy.invalid` | No dispatch; error posture is visible. |
| Required typed fact is absent or invalid | `denied / policy.fact-invalid` | No dispatch. |
| Policy result is deny | `denied / policy.denied` | No dispatch. |
| Grant is absent when required, expired, revoked or wrong issuer | `denied / grant.invalid` | No dispatch. |
| Policy or grant revision changes after approval wait | fresh evaluation and new challenge or `denied / authority.stale` | Old approval cannot admit or dispatch. |
| Payload, action or resource changes after challenge | old challenge becomes `superseded`; new challenge required | No dispatch under old approval. |
| Approval issuer, approver, subject, actor or audience mismatch | `denied / approval.scope-mismatch` | No dispatch. |
| Approval expired, revoked, replayed for sibling effect or wrong challenge | `denied / approval.invalid` | No dispatch. |
| Lease expired or epoch/holder changed | `denied / lease.stale` | No dispatch by stale attempt. |
| Budget reservation absent, expired, exceeded or wrong revision | `denied / budget.invalid` | No dispatch; no unreserved spend. |
| Cancellation settles before dispatch | `cancelled-before-dispatch` | No dispatch. |
| Cancellation races after dispatch begins | `dispatching`, then authoritative result or `uncertain` | Never report cancelled-before-dispatch. |
| Connector times out after accepting request | `uncertain` then `reconciling` | No automatic replay; preserve idempotency identity and query result state. |
| Proxied route strips or changes an authority field | `denied / request.digest-mismatch` | No downstream dispatch. |
| Gate is unavailable in governed profile | `denied / authority.unavailable` | No dispatch and no profile downgrade. |
| Gate is unavailable in explicitly selected constrained-local profile | local policy decides only allowed workspace-local action | No remote, credential-bearing or delegated effect. |

For each route, the acceptance receipt records the source revision, profile, exact negative scenario, terminal state, reason code, connector call count and redacted governance receipt sequence. A passing unit or mock-only test is not C02 acceptance evidence.

## Compatibility boundary

This contract preserves `the-boss.uar.sidecar/1`, product conversation ownership and P1 launch/history behavior. It establishes no arbitrary multi-hop delegation and does not complete D-GATE. Implementations may add transport-specific wrappers, but they MUST preserve every normative field, digest and state distinction or explicitly refuse the route.
