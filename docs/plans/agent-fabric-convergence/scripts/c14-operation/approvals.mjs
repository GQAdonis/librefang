import fs from 'node:fs'
import path from 'node:path'
import { click } from './controls.mjs'
import { digest, requireFact, waitFor } from './io.mjs'
import { ipc } from './setup.mjs'

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

async function peerEffectAllowed(evaluate, request, args, attempt, summary, scope) {
  const selector = { workspaceId: scope.instance.workspaceId, teamInstanceId: scope.instance.id }
  const context = await ipc(evaluate, 'prometheus.uar.teams.context', { ...selector, attemptId: attempt.id })
  const root = summary.attempts.find((item) => scope.roles[item.memberId] === 'coordinator' && !item.continuationOfWaitId)
  const authority = context.authority
  requireFact(root?.rootId && root.approvalScopeId && attempt.rootId === root.rootId &&
    attempt.approvalScopeId === root.approvalScopeId && context.rootId === root.rootId &&
    context.approvalScopeId === root.approvalScopeId && authority.ownerId === scope.instance.ownerId &&
    authority.workspaceId === selector.workspaceId && authority.teamId === selector.teamInstanceId &&
    authority.attemptId === attempt.id && authority.runId === attempt.runId && authority.memberId === attempt.memberId &&
    authority.taskId === attempt.taskId && context.coordinatorMemberId === root.memberId &&
    context.self.memberId === attempt.memberId &&
    context.self.role === scope.roles[attempt.memberId] && authority.binding.id === scope.instance.binding.id &&
    authority.binding.revision === scope.instance.binding.revision, 'C14_PEER_APPROVAL_AUTHORITY_UNAVAILABLE')
  const team = (await scope.snapshot()).instances.find((item) => item.id === selector.teamInstanceId)
  requireFact(scope.instance.definition.id === 'urn:boss:coding:team' &&
    team?.ownerId === authority.ownerId && team.workspaceId === authority.workspaceId &&
    team.definition.digest === scope.instance.definition.digest, 'C14_PEER_APPROVAL_TEAM_UNAVAILABLE')
  const senderRole = scope.roles[attempt.memberId]
  const recipientId = request.tool === 'team_delegate' ? args.recipientMemberId : args.recipient?.memberId
  const recipient = team.members.find((item) => item.id === recipientId &&
    !['revoked', 'stopped', 'cancelled'].includes(item.status))
  const rosterPeer = context.roster.find((item) => item.memberId === recipientId)
  const authorizedEdge = senderRole === 'coordinator' && ['worker', 'reviewer'].includes(recipient?.role) ||
    ['worker', 'reviewer'].includes(senderRole) && recipient?.role === 'coordinator'
  if (!recipient || rosterPeer?.role !== recipient.role || !authorizedEdge) return false
  const page = await scope.artifacts()
  const rootedAttempts = summary.attempts.filter((item) => item.rootId === root.rootId &&
    item.approvalScopeId === root.approvalScopeId)
  const workerAttempts = rootedAttempts.filter((item) => scope.roles[item.memberId] === 'worker' &&
    (item.status === 'succeeded' || item.executionOutcome === 'succeeded'))
  const workerArtifacts = page.artifacts.filter((item) => workerAttempts.some((worker) =>
    worker.id === item.attemptId && worker.taskId === item.taskId && worker.memberId === item.memberId))
  if (request.tool === 'team_delegate') {
    if (!fields(args, ['commandId', 'recipientMemberId', 'expectedTeamRevision', 'task', 'payload', 'reservation']) ||
        !id(args.commandId) || senderRole !== 'coordinator' || !['worker', 'reviewer'].includes(recipient.role) ||
        args.expectedTeamRevision !== team.revision || !reservation(args.reservation) || !payload(args.payload) ||
        !fields(args.task, ['taskId', 'role', 'input', 'outputContract', 'dependsOn']) || !id(args.task.taskId) ||
        args.task.role !== recipient.role || args.task.input !== scope.texts[recipient.role] ||
        args.payload.text !== scope.texts[recipient.role] || !fields(args.task.outputContract, ['type']) ||
        args.task.outputContract.type !== 'string' || !ids(args.task.dependsOn) ||
        team.tasks.some((task) => task.id === args.task.taskId || task.role === recipient.role)) return false
    if (recipient.role === 'worker') return args.task.dependsOn.length === 0 && args.payload.artifactIds.length === 0
    return workerAttempts.length > 0 && args.payload.artifactIds.length > 0 &&
      args.payload.artifactIds.every((artifactId) => workerArtifacts.some((item) => item.id === artifactId)) &&
      args.task.dependsOn.length === 1 && workerAttempts.some((item) => item.taskId === args.task.dependsOn[0])
  }
  if (!fields(args, ['commandId', 'recipient', 'payload']) || !id(args.commandId) ||
      !fields(args.recipient, ['memberId'], ['taskId']) || !payload(args.payload) ||
      args.payload.text !== (senderRole === 'coordinator' ? scope.texts[recipient.role] : scope.texts.message) ||
      args.recipient.taskId !== undefined && !team.tasks.some((task) => task.id === args.recipient.taskId &&
        task.role === recipient.role && task.assigneeMemberId === recipientId)) return false
  const attributable = page.artifacts.filter((item) => rootedAttempts.some((source) => source.id === item.attemptId &&
    source.taskId === item.taskId && source.memberId === item.memberId &&
    (source.memberId === attempt.memberId || context.targetOutcomes.some((outcome) => outcome.attemptId === source.id &&
      outcome.artifactIds.includes(item.id)))))
  return args.payload.artifactIds.every((artifactId) => attributable.some((item) => item.id === artifactId))
}

/** Inspect the actual trust-boundary request before approving the exact bounded fixture effect. */
export async function approveFixtureRequests(evaluate, signal, configuration, summary, roles, receipts, scope) {
  const requests = await evaluate(`(() => [...document.querySelectorAll('[data-ui~="teams-approvals"] li[data-approval-id]')]
    .map(node=>({id:node.getAttribute('data-approval-id'),attemptId:node.getAttribute('data-attempt-id'),
      runId:node.getAttribute('data-run-id'),tool:node.getAttribute('data-tool-name'),
      argumentsJson:node.querySelector('pre')?.textContent})))()`)
  for (const request of requests) {
    if (receipts.some((item) => item.id === request.id && item.attemptId === request.attemptId)) continue
    const attempt = summary.attempts.find((item) => item.id === request.attemptId && item.runId === request.runId)
    requireFact(attempt && attempt.status === 'running' && attempt.ownerId === scope.instance.ownerId &&
      attempt.workspaceId === scope.instance.workspaceId && attempt.teamId === scope.instance.id &&
      scope.instance.members.some((member) => member.id === attempt.memberId), 'C14_APPROVAL_ATTEMPT_SCOPE_UNAVAILABLE')
    let args
    try { args = JSON.parse(request.argumentsJson) } catch { requireFact(false, 'C14_APPROVAL_TYPED_ARGUMENTS_UNAVAILABLE') }
    requireFact(args && typeof args === 'object' && !Array.isArray(args), 'C14_APPROVAL_TYPED_ARGUMENTS_UNAVAILABLE')
    const pending = (await ipc(evaluate, 'prometheus.uar.teams.approvals', {
      workspaceId: scope.instance.workspaceId, teamInstanceId: scope.instance.id
    })).approvals.find((item) => item.approvalId === request.id && item.attemptId === attempt.id && item.runId === attempt.runId)
    requireFact(pending && pending.toolName === request.tool && pending.argumentsJson === request.argumentsJson &&
      pending.eventId && Number.isInteger(pending.cursor) && pending.cursor >= 0, 'C14_APPROVAL_TYPED_RECEIPT_UNAVAILABLE')
    const peer = ['team_delegate', 'team_send'].includes(request.tool)
    requireFact(peer ? pending.admissionOwner === 'uar-runtime' : pending.admissionOwner === 'paired-host' &&
      ['worker', 'reviewer'].includes(roles[attempt.memberId]), 'C14_APPROVAL_TOOL_OWNER_UNAVAILABLE')
    const file = path.join(configuration.workspaceDirectory, 'README.md')
    let allowed = peer && await peerEffectAllowed(evaluate, request, args, attempt, summary, { ...scope, roles })
    const atFile = typeof args.file_path === 'string' && path.resolve(configuration.workspaceDirectory, args.file_path) === file &&
      fs.realpathSync(file) === file
    if (request.tool === 'filesystem__read') allowed = atFile
    if (['filesystem__ls', 'filesystem__glob', 'filesystem__grep'].includes(request.tool)) {
      const target = args.path === undefined ? configuration.workspaceDirectory :
        typeof args.path === 'string' ? path.resolve(configuration.workspaceDirectory, args.path) : null
      allowed = target === configuration.workspaceDirectory || request.tool === 'filesystem__grep' && target === file
    }
    if (roles[attempt.memberId] === 'worker' && atFile) {
      if (request.tool === 'filesystem__write') allowed = args.content === configuration.repository.after
      if (request.tool === 'filesystem__edit' && typeof args.old_string === 'string' && args.old_string &&
          typeof args.new_string === 'string') {
        const current = fs.readFileSync(file, 'utf8')
        const result = args.replace_all ? current.split(args.old_string).join(args.new_string)
          : current.replace(args.old_string, () => args.new_string)
        allowed = current.includes(args.old_string) && result === configuration.repository.after
      }
    }
    requireFact(allowed, 'C14_APPROVAL_OUTSIDE_AUTHORIZED_FIXTURE_EFFECT')
    const selector = `[data-ui~="teams-approvals"] li[data-approval-id="${request.id}"][data-attempt-id="${attempt.id}"]`
    await click(evaluate, signal, selector + ' [data-ui~="teams-approve"]', 'C14_WORK_EXACT_APPROVAL_CONTROL_UNAVAILABLE')
    await waitFor(signal, () => evaluate(`!document.querySelector(${JSON.stringify(selector)})`),
      'C14_WORK_APPROVAL_DECISION_NOT_ACKNOWLEDGED')
    receipts.push({ id: request.id, attemptId: attempt.id, runId: attempt.runId, tool: request.tool,
      eventId: pending.eventId, cursor: pending.cursor, admissionOwner: pending.admissionOwner,
      ...(peer ? { rootId: attempt.rootId, approvalScopeId: attempt.approvalScopeId,
        workspaceId: attempt.workspaceId, teamId: attempt.teamId, memberId: attempt.memberId } : {}),
      requestSha256: digest(request.argumentsJson), decisionSurface: 'Work exact approval control' })
  }
}
