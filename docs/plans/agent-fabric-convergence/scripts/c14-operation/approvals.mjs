import fs from 'node:fs'
import path from 'node:path'
import { click } from './controls.mjs'
import { digest, requireFact, waitFor } from './io.mjs'
import { ipc } from './setup.mjs'
import { approvalDiagnostic, captureAttemptEvents, constraints } from './diagnostics.mjs'

export function fixturePeerTexts(marker) {
  return {
    worker: `In the selected isolated workspace, read README.md and replace only pending-${marker} with ${marker}. Preserve every other byte and file. Report the exact marker. Do not commit, push, publish, install dependencies, run tests, or write outside this workspace.`,
    reviewer: `Independently read README.md in the selected isolated workspace and review the worker artifacts. Verify that only pending-${marker} was replaced with ${marker}, preserving every other byte and file. Report the exact marker and actual findings. Do not write files, commit, push, publish, install dependencies, run tests, or perform external effects.`,
    message: `Bounded README.md fixture handoff for marker ${marker}; attached artifacts are attributed task data.`
  }
}

const record = (value) => value && typeof value === 'object' && !Array.isArray(value)
const fields = (value, required, optional = []) => record(value) && required.every((key) => Object.hasOwn(value, key)) &&
  Object.keys(value).every((key) => required.includes(key) || optional.includes(key))
const id = (value) => typeof value === 'string' && value.length > 0 && value.length <= 128
const ids = (value) => Array.isArray(value) && value.length <= 16 && value.every(id) && new Set(value).size === value.length
const payload = (value) => fields(value, ['text', 'artifactIds']) && typeof value.text === 'string' &&
  value.text.length <= 8192 && ids(value.artifactIds)
const reservation = (value) => fields(value, ['tokens', 'costMicrounits', 'elapsedSeconds']) &&
  Number.isInteger(value.tokens) && value.tokens >= 1 && value.tokens <= 8192 &&
  Number.isInteger(value.costMicrounits) && value.costMicrounits >= 0 && value.costMicrounits <= 1000000 &&
  Number.isInteger(value.elapsedSeconds) && value.elapsedSeconds >= 1 && value.elapsedSeconds <= 300

const canonical = (value) => Array.isArray(value) ? value.map(canonical) : record(value)
  ? Object.fromEntries(Object.entries(value).sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0)
    .map(([key, entry]) => [key, canonical(entry)])) : value
const canonicalDigest = (value) => digest(JSON.stringify(canonical(value)))
const sha256 = (value) => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value)

function fixtureEditAllowed(edit, current, expected, diagnostic) {
  if (!constraints(diagnostic, [['FILESYSTEM_EDIT_DIGESTS_VALID', record(edit) &&
    sha256(edit.oldStringSha256) && sha256(edit.newStringSha256) &&
    Number.isSafeInteger(edit.oldStringLength) && edit.oldStringLength > 0 && edit.oldStringLength <= current.length &&
    Number.isSafeInteger(edit.newStringLength) && edit.newStringLength >= 0 && edit.newStringLength <= expected.length &&
    typeof edit.replaceAll === 'boolean']])) return false
  for (let offset = 0; offset <= current.length - edit.oldStringLength; offset++) {
    const oldText = current.slice(offset, offset + edit.oldStringLength)
    if (digest(oldText) !== edit.oldStringSha256) continue
    const first = current.indexOf(oldText)
    const newText = expected.slice(first, first + edit.newStringLength)
    if (digest(newText) !== edit.newStringSha256) continue
    const result = edit.replaceAll ? current.split(oldText).join(newText)
      : current.slice(0, first) + newText + current.slice(first + oldText.length)
    return constraints(diagnostic, [['FILESYSTEM_EDIT_OLD_TEXT_PRESENT', true],
      ['FILESYSTEM_EDIT_EXACT_MATCH_UNIQUE', edit.replaceAll || first === current.lastIndexOf(oldText)],
      ['FILESYSTEM_EDIT_EXACT_RESULT', result === expected]])
  }
  return constraints(diagnostic, [['FILESYSTEM_EDIT_EXACT_RESULT', false]])
}

async function peerEffectAllowed(evaluate, request, args, attempt, summary, scope, diagnostic) {
  const selector = { workspaceId: scope.instance.workspaceId, teamInstanceId: scope.instance.id }
  const context = await ipc(evaluate, 'prometheus.uar.teams.context', { ...selector, attemptId: attempt.id })
  const coordinator = summary.attempts.find((item) => scope.roles[item.memberId] === 'coordinator' && !item.continuationOfWaitId)
  const authority = context.authority
  requireFact(constraints(diagnostic, [
    ['PEER_ROOT_ID_PRESENT', id(attempt.rootId)], ['PEER_APPROVAL_SCOPE_PRESENT', id(attempt.approvalScopeId)],
    ['PEER_ATTEMPT_ROOT_MATCH', attempt.rootId === context.rootId],
    ['PEER_ATTEMPT_APPROVAL_SCOPE_MATCH', attempt.approvalScopeId === attempt.rootId],
    ['PEER_CONTEXT_ROOT_MATCH', context.rootId === attempt.rootId],
    ['PEER_CONTEXT_APPROVAL_SCOPE_MATCH', context.approvalScopeId === attempt.approvalScopeId],
    ['PEER_OWNER_MATCH', authority.ownerId === scope.instance.ownerId],
    ['PEER_WORKSPACE_MATCH', authority.workspaceId === selector.workspaceId],
    ['PEER_TEAM_MATCH', authority.teamId === selector.teamInstanceId],
    ['PEER_ATTEMPT_MATCH', authority.attemptId === attempt.id], ['PEER_RUN_MATCH', authority.runId === attempt.runId],
    ['PEER_MEMBER_MATCH', authority.memberId === attempt.memberId], ['PEER_TASK_MATCH', authority.taskId === attempt.taskId],
    ['PEER_COORDINATOR_MATCH', context.coordinatorMemberId === coordinator?.memberId],
    ['PEER_SELF_MEMBER_MATCH', context.self.memberId === attempt.memberId],
    ['PEER_SELF_ROLE_MATCH', context.self.role === scope.roles[attempt.memberId]],
    ['PEER_BINDING_MATCH', authority.binding.id === scope.instance.binding.id],
    ['PEER_BINDING_REVISION_MATCH', authority.binding.revision === scope.instance.binding.revision]
  ]), 'C14_PEER_APPROVAL_AUTHORITY_UNAVAILABLE')
  const team = (await scope.snapshot()).instances.find((item) => item.id === selector.teamInstanceId)
  requireFact(constraints(diagnostic, [
    ['PEER_CODING_PRESET_MATCH', scope.instance.definition.id === 'urn:boss:coding:team'],
    ['PEER_CURRENT_OWNER_MATCH', team?.ownerId === authority.ownerId],
    ['PEER_CURRENT_WORKSPACE_MATCH', team?.workspaceId === authority.workspaceId],
    ['PEER_DEFINITION_DIGEST_MATCH', team?.definition.digest === scope.instance.definition.digest]
  ]), 'C14_PEER_APPROVAL_TEAM_UNAVAILABLE')
  const senderRole = scope.roles[attempt.memberId]
  const recipientId = request.tool === 'team_delegate' ? args.recipientMemberId : args.recipient?.memberId
  diagnostic.peerResolver = { schema: 'native-team-tool-canonical-arguments',
    resolver: 'exact-member-id-and-authorized-context-roster',
    members: team.members.slice(0, 50).map((item) => ({ id: item.id, status: item.status, role: item.role })),
    roster: context.roster.slice(0, 50).map((item) => ({ memberId: item.memberId, role: item.role })) }
  const recipient = team.members.find((item) => item.id === recipientId &&
    !['revoked', 'stopped', 'cancelled'].includes(item.status))
  const rosterPeer = context.roster.find((item) => item.memberId === recipientId)
  const authorizedEdge = senderRole === 'coordinator' && ['worker', 'reviewer'].includes(recipient?.role) ||
    ['worker', 'reviewer'].includes(senderRole) && recipient?.role === 'coordinator'
  if (!constraints(diagnostic, [['PEER_RECIPIENT_ACTIVE', recipient],
    ['PEER_RECIPIENT_ROSTER_ROLE_MATCH', recipient && rosterPeer?.role === recipient.role],
    ['PEER_AUTHORIZED_EDGE', authorizedEdge]])) return false
  const page = await scope.artifacts()
  const attributedAttempts = summary.attempts.filter((item) => item.ownerId === authority.ownerId &&
    item.workspaceId === authority.workspaceId && item.teamId === authority.teamId &&
    (item.id === attempt.id || context.targetOutcomes.some((outcome) => outcome.attemptId === item.id &&
      outcome.taskId === item.taskId && outcome.memberId === item.memberId &&
      outcome.executionOutcome === item.executionOutcome && outcome.effectDisposition === 'confirmed' &&
      item.effectDisposition === 'confirmed')))
  const workerAttempts = attributedAttempts.filter((item) => scope.roles[item.memberId] === 'worker' &&
    item.effectDisposition === 'confirmed' &&
    (item.status === 'succeeded' || item.executionOutcome === 'succeeded'))
  const workerArtifacts = page.artifacts.filter((item) => workerAttempts.some((worker) =>
    worker.id === item.attemptId && worker.taskId === item.taskId && worker.memberId === item.memberId))
  if (request.tool === 'team_delegate') {
    if (!constraints(diagnostic, [
      ['DELEGATE_FIELDS_EXACT', fields(args, ['commandId', 'recipientMemberId', 'expectedTeamRevision', 'task', 'payload', 'reservation'])],
      ['DELEGATE_COMMAND_ID_VALID', id(args.commandId)], ['DELEGATE_SENDER_COORDINATOR', senderRole === 'coordinator'],
      ['DELEGATE_RECIPIENT_ROLE_ALLOWED', ['worker', 'reviewer'].includes(recipient.role)],
      ['DELEGATE_TEAM_REVISION_MATCH', args.expectedTeamRevision === team.revision],
      ['DELEGATE_RESERVATION_BOUNDED', reservation(args.reservation)], ['DELEGATE_PAYLOAD_SCHEMA', payload(args.payload)],
      ['DELEGATE_TASK_FIELDS_EXACT', fields(args.task, ['taskId', 'role', 'input', 'outputContract', 'dependsOn'])],
      ['DELEGATE_TASK_ID_VALID', id(args.task?.taskId)], ['DELEGATE_TASK_ROLE_MATCH', args.task?.role === recipient.role],
      ['DELEGATE_INPUT_FIXTURE_EXACT', args.task?.input === scope.texts[recipient.role]],
      ['DELEGATE_PAYLOAD_FIXTURE_EXACT', args.payload?.text === scope.texts[recipient.role]],
      ['DELEGATE_OUTPUT_CONTRACT_FIELDS_EXACT', fields(args.task?.outputContract, ['type'])],
      ['DELEGATE_OUTPUT_CONTRACT_STRING', args.task?.outputContract?.type === 'string'],
      ['DELEGATE_DEPENDENCIES_SCHEMA', ids(args.task?.dependsOn)],
      ['DELEGATE_TASK_AND_ROLE_NOT_ALREADY_CREATED', !team.tasks.some((task) => task.id === args.task?.taskId || task.role === recipient.role)]
    ])) return false
    if (recipient.role === 'worker') return constraints(diagnostic, [
      ['WORKER_NO_DEPENDENCIES', args.task.dependsOn.length === 0], ['WORKER_NO_ARTIFACTS', args.payload.artifactIds.length === 0]])
    return constraints(diagnostic, [['REVIEWER_WORKER_SUCCEEDED', workerAttempts.length > 0],
      ['REVIEWER_ARTIFACTS_PRESENT', args.payload.artifactIds.length > 0],
      ['REVIEWER_ARTIFACTS_FROM_WORKER', args.payload.artifactIds.every((artifactId) => workerArtifacts.some((item) => item.id === artifactId))],
      ['REVIEWER_ONE_DEPENDENCY', args.task.dependsOn.length === 1],
      ['REVIEWER_DEPENDENCY_WORKER_TASK', workerAttempts.some((item) => item.taskId === args.task.dependsOn[0])]])
  }
  if (!constraints(diagnostic, [['SEND_FIELDS_EXACT', fields(args, ['commandId', 'recipient', 'payload'])],
    ['SEND_COMMAND_ID_VALID', id(args.commandId)], ['SEND_RECIPIENT_SCHEMA', fields(args.recipient, ['memberId'], ['taskId'])],
    ['SEND_PAYLOAD_SCHEMA', payload(args.payload)],
    ['SEND_PAYLOAD_FIXTURE_EXACT', args.payload?.text === (senderRole === 'coordinator' ? scope.texts[recipient.role] : scope.texts.message)],
    ['SEND_RECIPIENT_TASK_MATCH', args.recipient?.taskId === undefined || team.tasks.some((task) => task.id === args.recipient.taskId &&
      task.role === recipient.role && task.assigneeMemberId === recipientId)]])) return false
  const attributable = page.artifacts.filter((item) => attributedAttempts.some((source) => source.id === item.attemptId &&
    source.taskId === item.taskId && source.memberId === item.memberId &&
    (source.memberId === attempt.memberId || context.targetOutcomes.some((outcome) => outcome.attemptId === source.id &&
      outcome.artifactIds.includes(item.id)))))
  return constraints(diagnostic, [['SEND_ARTIFACTS_ATTRIBUTABLE',
    args.payload.artifactIds.every((artifactId) => attributable.some((item) => item.id === artifactId))]])
}

/** Inspect the actual trust-boundary request before approving the exact bounded fixture effect. */
export async function approveFixtureRequests(evaluate, signal, configuration, summary, roles, receipts, scope) {
  const requests = await evaluate(`(() => [...document.querySelectorAll('[data-ui~="teams-approvals"] li[data-approval-id]')]
    .map(node=>({id:node.getAttribute('data-approval-id'),attemptId:node.getAttribute('data-attempt-id'),
      runId:node.getAttribute('data-run-id'),tool:node.getAttribute('data-tool-name'),
      argumentsJson:node.querySelector('pre')?.textContent})))()`)
  for (const request of requests) {
    if (receipts.some((item) => item.id === request.id && item.attemptId === request.attemptId)) continue
    const diagnostic = approvalDiagnostic(scope.evidence, request, scope.texts)
    try {
      const attempt = summary.attempts.find((item) => item.id === request.attemptId && item.runId === request.runId)
      requireFact(constraints(diagnostic, [['APPROVAL_ATTEMPT_RUN_MATCH', attempt],
        ['APPROVAL_ATTEMPT_RUNNING', attempt?.status === 'running'], ['APPROVAL_OWNER_MATCH', attempt?.ownerId === scope.instance.ownerId],
        ['APPROVAL_WORKSPACE_MATCH', attempt?.workspaceId === scope.instance.workspaceId],
        ['APPROVAL_TEAM_MATCH', attempt?.teamId === scope.instance.id],
        ['APPROVAL_MEMBER_PRESENT', scope.instance.members.some((member) => member.id === attempt?.memberId)]]),
        'C14_APPROVAL_ATTEMPT_SCOPE_UNAVAILABLE')
      let args
      try { args = JSON.parse(request.argumentsJson) } catch {
        constraints(diagnostic, [['APPROVAL_ARGUMENTS_JSON_VALID', false]])
        requireFact(false, 'C14_APPROVAL_TYPED_ARGUMENTS_UNAVAILABLE')
      }
      requireFact(constraints(diagnostic, [['APPROVAL_ARGUMENTS_OBJECT', args && typeof args === 'object' && !Array.isArray(args)]]),
        'C14_APPROVAL_TYPED_ARGUMENTS_UNAVAILABLE')
      const pending = (await ipc(evaluate, 'prometheus.uar.teams.approvals', {
        workspaceId: scope.instance.workspaceId, teamInstanceId: scope.instance.id
      })).approvals.find((item) => item.approvalId === request.id && item.attemptId === attempt.id && item.runId === attempt.runId)
      requireFact(constraints(diagnostic, [['APPROVAL_PENDING_EXACT_IDENTITY', pending],
        ['APPROVAL_PENDING_TOOL_MATCH', pending?.toolName === request.tool],
        ['APPROVAL_PENDING_ARGUMENTS_MATCH', pending?.argumentsJson === request.argumentsJson],
        ['APPROVAL_EVENT_ID_PRESENT', pending?.eventId],
        ['APPROVAL_CURSOR_VALID', Number.isInteger(pending?.cursor) && pending.cursor >= 0]]), 'C14_APPROVAL_TYPED_RECEIPT_UNAVAILABLE')
      const peer = ['team_delegate', 'team_send'].includes(request.tool)
      diagnostic.admissionOwner = ['uar-runtime', 'paired-host'].includes(pending.admissionOwner) ? pending.admissionOwner : null
      requireFact(constraints(diagnostic, [['APPROVAL_TOOL_OWNER_MATCH',
        peer ? pending.admissionOwner === 'uar-runtime' : pending.admissionOwner === 'paired-host' &&
        ['worker', 'reviewer'].includes(roles[attempt.memberId])]]), 'C14_APPROVAL_TOOL_OWNER_UNAVAILABLE')
      if (peer) {
        // Native pending approvals carry the trusted action display, not bare tool arguments.
        requireFact(constraints(diagnostic, [
          ['PEER_ACTION_DISPLAY_FIELDS_EXACT', fields(args, ['operation', 'arguments'])],
          ['PEER_ACTION_DISPLAY_OPERATION_MATCH', args.operation === request.tool],
          ['PEER_ACTION_DISPLAY_ARGUMENTS_OBJECT', record(args.arguments)]
        ]), 'C14_PEER_APPROVAL_ACTION_DISPLAY_UNAVAILABLE')
        args = args.arguments
      }
      const file = path.join(configuration.workspaceDirectory, 'README.md')
      let allowed = peer && await peerEffectAllowed(evaluate, request, args, attempt, summary, { ...scope, roles }, diagnostic)
      const effect = pending.preparedEffect
      if (!peer) {
        requireFact(constraints(diagnostic, [['PREPARED_EFFECT_PRESENT', record(effect) && effect.version === 1],
          ['PREPARED_EFFECT_ADMISSION_MATCH', effect?.admissionId === pending.admissionId && id(pending.admissionId)],
          ['PREPARED_EFFECT_INVOCATION_PRESENT', id(effect?.invocationId)],
          ['PREPARED_EFFECT_TOOL_CALL_MATCH', effect?.toolCallId === pending.toolCallId && id(pending.toolCallId)],
          ['PREPARED_EFFECT_CALL_INDEX_MATCH', effect?.callIndex === pending.callIndex && Number.isInteger(pending.callIndex)],
          ['PREPARED_EFFECT_ROOT_RUN_MATCH', effect?.rootRunId === pending.rootRunId && pending.rootRunId === attempt.runId],
          ['PREPARED_EFFECT_RUN_MATCH', effect?.runId === attempt.runId],
          ['PREPARED_EFFECT_OWNER_MATCH', effect?.ownerId === scope.instance.ownerId],
          ['PREPARED_EFFECT_WORKSPACE_MATCH', effect?.workspace === configuration.workspaceDirectory],
          ['PREPARED_EFFECT_TOOL_MATCH', effect?.toolName === request.tool],
          ['PREPARED_EFFECT_ARGUMENT_DIGEST_VALID', sha256(effect?.argumentsSha256)],
          ['PREPARED_EFFECT_DISPLAY_DIGEST_MATCH', effect?.actionDisplaySha256 === canonicalDigest(args)]]),
          'C14_APPROVAL_PREPARED_EFFECT_UNAVAILABLE')
        diagnostic.preparedEffect = { admissionId: effect.admissionId, invocationId: effect.invocationId,
          toolCallId: effect.toolCallId, callIndex: effect.callIndex, argumentsSha256: effect.argumentsSha256,
          actionDisplaySha256: effect.actionDisplaySha256 }
      }
      const atFile = !peer && effect.targetPath === file && fs.realpathSync(file) === file
      if (request.tool === 'filesystem__read') allowed = constraints(diagnostic, [['FILESYSTEM_READ_EXACT_FIXTURE', atFile]])
      if (['filesystem__ls', 'filesystem__glob', 'filesystem__grep'].includes(request.tool)) {
        allowed = constraints(diagnostic, [['FILESYSTEM_QUERY_EXACT_FIXTURE',
          effect.targetPath === configuration.workspaceDirectory || request.tool === 'filesystem__grep' && atFile]])
      }
      if (roles[attempt.memberId] === 'worker' && atFile) {
        if (request.tool === 'filesystem__write') allowed = constraints(diagnostic, [['FILESYSTEM_WRITE_EXACT_CONTENT',
          effect.write?.contentSha256 === digest(configuration.repository.after)]])
        if (request.tool === 'filesystem__edit') {
          const current = fs.readFileSync(file, 'utf8')
          allowed = fixtureEditAllowed(effect.edit, current, configuration.repository.after, diagnostic)
        }
      }
      if (!allowed && !diagnostic.failedConstraint) {
        if (['filesystem__write', 'filesystem__edit'].includes(request.tool)) constraints(diagnostic, [
          ['FILESYSTEM_WRITE_WORKER_ROLE', roles[attempt.memberId] === 'worker'], ['FILESYSTEM_WRITE_EXACT_FIXTURE', atFile],
          ['FILESYSTEM_EDIT_ARGUMENTS_VALID', request.tool !== 'filesystem__edit' || record(effect.edit)]])
        else constraints(diagnostic, [['TOOL_SUPPORTED_FOR_FIXTURE', false]])
      }
      requireFact(allowed, 'C14_APPROVAL_OUTSIDE_AUTHORIZED_FIXTURE_EFFECT')
      const selector = `[data-ui~="teams-approvals"] li[data-approval-id="${request.id}"][data-attempt-id="${attempt.id}"]`
      await click(evaluate, signal, selector + ' [data-ui~="teams-approve"]', 'C14_WORK_EXACT_APPROVAL_CONTROL_UNAVAILABLE')
      diagnostic.decision = 'requested-via-Work-control'
      await waitFor(signal, () => evaluate(`!document.querySelector(${JSON.stringify(selector)})`),
        'C14_WORK_APPROVAL_DECISION_NOT_ACKNOWLEDGED')
      receipts.push({ id: request.id, attemptId: attempt.id, runId: attempt.runId, tool: request.tool,
        eventId: pending.eventId, cursor: pending.cursor, admissionOwner: pending.admissionOwner,
        ...(peer ? { rootId: attempt.rootId, approvalScopeId: attempt.approvalScopeId,
          workspaceId: attempt.workspaceId, teamId: attempt.teamId, memberId: attempt.memberId }
          : { preparedEffect: diagnostic.preparedEffect }),
        requestSha256: digest(request.argumentsJson), decisionSurface: 'Work exact approval control' })
      diagnostic.decision = 'acknowledged-via-Work-control'
    } catch (error) {
      diagnostic.failureCode = /^C14_[A-Z0-9_]+$/.test(error.code ?? '') ? error.code : 'C14_APPROVAL_DIAGNOSTIC_UNAVAILABLE'
      diagnostic.failedConstraint ??= diagnostic.failureCode
      scope.evidence.rejectedApproval = diagnostic
      await captureAttemptEvents(evaluate, summary, scope, scope.evidence)
      throw error
    }
  }
}
