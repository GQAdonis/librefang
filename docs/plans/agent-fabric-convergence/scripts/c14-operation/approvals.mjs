import fs from 'node:fs'
import path from 'node:path'
import { click } from './controls.mjs'
import { digest, requireFact, waitFor } from './io.mjs'

/** Inspect the actual trust-boundary request before approving the exact bounded fixture effect. */
export async function approveFixtureRequests(evaluate, signal, configuration, summary, roles, receipts) {
  const requests = await evaluate(`(() => [...document.querySelectorAll('[data-ui~="teams-approvals"] li[data-approval-id]')]
    .map(node=>({id:node.getAttribute('data-approval-id'),attemptId:node.getAttribute('data-attempt-id'),
      runId:node.getAttribute('data-run-id'),tool:node.getAttribute('data-tool-name'),
      argumentsJson:node.querySelector('pre')?.textContent})))()`)
  for (const request of requests) {
    if (receipts.some((item) => item.id === request.id && item.attemptId === request.attemptId)) continue
    const attempt = summary.attempts.find((item) => item.id === request.attemptId && item.runId === request.runId)
    requireFact(attempt && ['worker', 'reviewer'].includes(roles[attempt.memberId]), 'C14_APPROVAL_ATTEMPT_SCOPE_UNAVAILABLE')
    let args
    try { args = JSON.parse(request.argumentsJson) } catch { requireFact(false, 'C14_APPROVAL_TYPED_ARGUMENTS_UNAVAILABLE') }
    requireFact(args && typeof args === 'object' && !Array.isArray(args), 'C14_APPROVAL_TYPED_ARGUMENTS_UNAVAILABLE')
    const file = path.join(configuration.workspaceDirectory, 'README.md')
    let allowed = false
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
      requestSha256: digest(request.argumentsJson), decisionSurface: 'Work exact approval control' })
  }
}
