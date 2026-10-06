import { digest } from './io.mjs'
import { ipc } from './setup.mjs'

const tools = ['team_roster', 'team_delegate', 'team_send', 'team_wait',
  'filesystem__read', 'filesystem__write', 'filesystem__edit', 'filesystem__ls', 'filesystem__glob', 'filesystem__grep']
const type = (value) => value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value
const hash = (value) => value === undefined ? null : digest(JSON.stringify(value))
const identifier = (value) => typeof value === 'string' && /^[A-Za-z0-9_.:-]{1,128}$/.test(value) ? value : null
const objectKeys = (value) => type(value) === 'object'
  ? Object.keys(value).filter((key) => identifier(key)).slice(0, 64) : null

function peerArgumentShape(args) {
  return { keys: objectKeys(args), recipientMemberIdType: type(args?.recipientMemberId),
    recipientMemberId: identifier(args?.recipientMemberId), taskKeys: objectKeys(args?.task),
    taskRoleType: type(args?.task?.role), taskRole: identifier(args?.task?.role),
    payloadKeys: objectKeys(args?.payload), reservationKeys: objectKeys(args?.reservation),
    recipientKeys: objectKeys(args?.recipient), recipientMemberType: type(args?.recipient?.memberId),
    recipientMemberIdFromRecipient: identifier(args?.recipient?.memberId) }
}

/** Project types and fixture equality only; never retain model-supplied text or unknown fields. */
export function argumentFacts(tool, args, texts, attemptId) {
  const facts = { argumentType: type(args), argumentsSha256: hash(args) }
  if (tool === 'team_roster') {
    const present = args !== null && typeof args === 'object' && Object.hasOwn(args, 'cursor')
    const cursor = args?.cursor
    facts.cursorKind = type(args) !== 'object' ? 'malformed' : !present ? 'absent' : cursor === null ? 'null' : cursor === '' ? 'empty-string'
      : typeof cursor === 'string' ? 'string' : 'malformed'
    facts.cursorType = present ? type(cursor) : 'absent'
    facts.cursorSha256 = present ? hash(cursor) : null
    if (typeof cursor === 'string') {
      const parts = cursor.split(':')
      facts.cursorFormat = parts.length === 3 && /^\d+$/.test(parts[1]) && /^\d+$/.test(parts[2])
        ? 'attempt-revision-offset' : 'malformed'
      facts.cursorAttemptMatches = parts[0] === attemptId
    }
  }
  if (['team_delegate', 'team_send'].includes(tool)) {
    facts.argumentShape = peerArgumentShape(args)
    facts.actionDisplayShape = { keys: objectKeys(args), operationType: type(args?.operation),
      operationMatchesTool: args?.operation === tool, argumentsType: type(args?.arguments),
      arguments: peerArgumentShape(args?.arguments) }
    const actual = args?.operation === tool && type(args?.arguments) === 'object' ? args.arguments : args
    facts.validatedArgumentsSha256 = hash(actual)
    facts.taskInputType = type(actual?.task?.input)
    facts.taskInputSha256 = hash(actual?.task?.input)
    facts.payloadTextType = type(actual?.payload?.text)
    facts.payloadTextSha256 = hash(actual?.payload?.text)
    facts.fixtureInputEquals = Object.fromEntries(['worker', 'reviewer'].map((role) => [role, actual?.task?.input === texts[role]]))
    facts.fixturePayloadEquals = Object.fromEntries(['worker', 'reviewer', 'message'].map((role) => [role, actual?.payload?.text === texts[role]]))
    facts.outputContractType = type(actual?.task?.outputContract)
    facts.outputContractSha256 = hash(actual?.task?.outputContract)
    facts.dependsOnType = type(actual?.task?.dependsOn)
    facts.artifactIdsType = type(actual?.payload?.artifactIds)
    facts.expectedTeamRevisionType = type(actual?.expectedTeamRevision)
  }
  return facts
}

export function constraints(diagnostic, pairs) {
  let accepted = true
  for (const [code, value] of pairs) {
    diagnostic.checks[code] = Boolean(value)
    if (!value) {
      diagnostic.failedConstraint ??= code
      accepted = false
    }
  }
  return accepted
}

export function approvalDiagnostic(evidence, request, texts) {
  const diagnostic = { approvalId: identifier(request.id), attemptId: identifier(request.attemptId),
    runId: identifier(request.runId), tool: tools.includes(request.tool) ? request.tool : 'other',
    requestSha256: typeof request.argumentsJson === 'string' ? digest(request.argumentsJson) : null,
    checks: {}, decision: 'not-approved' }
  let args
  try { args = JSON.parse(request.argumentsJson) } catch { diagnostic.argumentsMalformed = true }
  diagnostic.arguments = argumentFacts(request.tool, args, texts, request.attemptId)
  evidence.approvalDiagnostics ??= []
  if (evidence.approvalDiagnostics.length < 128) evidence.approvalDiagnostics.push(diagnostic)
  else evidence.omittedApprovalDiagnosticCount = (evidence.omittedApprovalDiagnosticCount ?? 0) + 1
  return diagnostic
}

/** Process-local replay is read while the owned app is alive; only safe tool facts survive shutdown. */
export async function captureAttemptEvents(evaluate, summary, scope, evidence) {
  evidence.executionTraces ??= []
  for (const attempt of summary.attempts) {
    if (attempt.ownerId !== scope.instance.ownerId || attempt.workspaceId !== scope.instance.workspaceId ||
        attempt.teamId !== scope.instance.id) continue
    let trace = evidence.executionTraces.find((item) => item.attemptId === attempt.id)
    if (!trace) {
      if (evidence.executionTraces.length >= 16) {
        evidence.omittedAttemptTraceCount = (evidence.omittedAttemptTraceCount ?? 0) + 1
        continue
      }
      trace = { attemptId: attempt.id, runId: attempt.runId, memberId: attempt.memberId, cursor: 0, calls: [], gaps: [] }
      evidence.executionTraces.push(trace)
    }
    if (trace.complete && trace.runId === attempt.runId) continue
    try {
      const page = await ipc(evaluate, 'prometheus.uar.teams.events', { workspaceId: scope.instance.workspaceId,
        teamInstanceId: scope.instance.id, attemptId: attempt.id, after: trace.cursor })
      if (page.version !== 1 || page.runId !== attempt.runId || page.teamInstanceId !== scope.instance.id ||
          page.attemptId !== attempt.id || page.after !== trace.cursor || page.retention !== 'process-local-bounded' ||
          !Number.isSafeInteger(page.cursor) || page.cursor < 0 || !Array.isArray(page.events) ||
          ![null, 'retention-gap', 'cursor-ahead'].includes(page.gapReason) ||
          !(page.firstAvailableEventId === null || Number.isSafeInteger(page.firstAvailableEventId) && page.firstAvailableEventId > 0)) {
        trace.readFailureCode = 'C14_ATTEMPT_TRACE_SCOPE_UNAVAILABLE'
        continue
      }
      trace.retention = page.retention
      trace.firstAvailableEventId = page.firstAvailableEventId
      if (page.gapReason && trace.gaps.length < 16) trace.gaps.push({ after: page.after, cursor: page.cursor, reason: page.gapReason })
      for (const event of page.events) {
        const data = event.data
        if (['agui.done', 'agui.cancelled'].includes(event.eventName) && data?.request_id === attempt.runId &&
            Number.isSafeInteger(event.eventId) && event.eventId > 0) trace.terminalEventId = event.eventId
        if (!['agui.tool_call.complete', 'agui.tool_call.approval_required', 'agui.tool_result'].includes(event.eventName) ||
            data?.request_id !== attempt.runId || !tools.includes(data.name) || !identifier(data.id) ||
            !Number.isSafeInteger(event.eventId) || event.eventId <= 0) continue
        let call = trace.calls.find((item) => item.callId === data.id && item.tool === data.name)
        if (!call) {
          if (trace.calls.length >= 128) {
            trace.omittedCallEventCount = (trace.omittedCallEventCount ?? 0) + 1
            continue
          }
          call = { callId: data.id, tool: data.name }
          trace.calls.push(call)
        }
        if (event.eventName === 'agui.tool_result') {
          call.resultEventId = event.eventId
          call.resultSuccess = typeof data.success === 'boolean' ? data.success : null
          call.resultSha256 = hash(data.content)
          call.resultCodeTokens = typeof data.content === 'string'
            ? [...new Set(data.content.match(/\b(?:TEAM_|UAR_)[A-Z0-9_]+\b/g) ?? [])].slice(0,16) : []
        } else {
          call.argumentEventId = event.eventId
          if (event.eventName === 'agui.tool_call.approval_required') call.approvalId = identifier(data.approval_id)
          let args
          try { args = JSON.parse(data.arguments_json) } catch { call.argumentsMalformed = true }
          call.arguments = argumentFacts(data.name, args, scope.texts, attempt.id)
        }
      }
      trace.cursor = page.cursor
      // The snapshot includes the entire retained tail, including events after the terminal marker.
      if (['succeeded', 'failed', 'cancelled', 'yielded'].includes(attempt.status) &&
          attempt.effectDisposition === 'confirmed' && trace.terminalEventId &&
          page.gapReason === null && trace.gaps.length === 0 && !trace.omittedCallEventCount) trace.complete = true
    } catch {
      trace.readFailureCode = 'C14_PROTECTED_ATTEMPT_EVENTS_UNAVAILABLE'
    }
  }
}
