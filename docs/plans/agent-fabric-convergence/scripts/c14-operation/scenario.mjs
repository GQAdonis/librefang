import fs from 'node:fs'
import { createHash } from 'node:crypto'
import { setup, ipc } from './setup.mjs'
import { approveFixtureRequests, fixturePeerTexts } from './approvals.mjs'
import { captureAttemptEvents } from './diagnostics.mjs'
import { chooseCodingTeam, click, fill, openCodingSetup, openWork, reopen, selectOption, selectWorkspace } from './controls.mjs'
import { digest, requireFact, repositoryResult, Unavailable, waitFor, write } from './io.mjs'

const route = (name) => 'prometheus.uar.teams.' + name
const hashValue = (value) => digest(JSON.stringify(value))
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const safeCode = (error, signal) => signal.aborted ? 'C14_OPERATION_CANCELLED_OR_TIMED_OUT'
  : /^C14_[A-Z0-9_]+$/.test(error.code ?? '') ? error.code : 'C14_APPLICATION_OPERATION_UNAVAILABLE'

function modelProvenance(attempts, alias) {
  requireFact(attempts.every((attempt) => attempt.effectiveModels?.length && attempt.effectiveModels.every((model) =>
    model.support === 'validated' && model.supportEvidenceRef && model.wireModelAlias === alias &&
    model.profile?.id && Number.isInteger(model.profile.revision) && Number.isInteger(model.settingsRevision) &&
    model.pricingIdentity?.catalogRevision)), 'C14_REAL_MODEL_PROVENANCE_UNAVAILABLE')
  return attempts.map((attempt) => ({ id: attempt.id, runId: attempt.runId, taskId: attempt.taskId,
    memberId: attempt.memberId, status: attempt.status, executionOutcome: attempt.executionOutcome,
    executionFence: attempt.executionFence, outputSha256: hashValue(attempt.output),
    contextArtifactIds: attempt.contextArtifactIds, usage: attempt.usage, accountingState: attempt.accountingState,
    effectDisposition: attempt.effectDisposition, models: attempt.effectiveModels }))
}

async function visibleInstance(evaluate, signal, instance, summary) {
  await waitFor(signal, () => evaluate(`(() => {
    const root=document.querySelector('[data-ui~="teams-work"]');
    const members=document.querySelector('[data-ui~="teams-members"]');
    const rows=[...document.querySelectorAll('[data-ui~="teams-attempt"]')];
    return document.querySelector('[data-ui~="teams-run"]')?.getAttribute('data-team-id')===${JSON.stringify(instance.id)} &&
      root?.getAttribute('data-workspace-id')===${JSON.stringify(instance.workspaceId)} &&
      members?.innerText.includes('worker') && members.innerText.includes('reviewer') &&
      ${JSON.stringify(summary.attempts.map((item) => item.id))}.every(id=>rows.some(row=>row.getAttribute('data-attempt-id')===id));
  })()`), 'C14_WORK_REAL_MEMBERS_OR_ATTEMPTS_NOT_VISIBLE')
}

export default async function scenario({ evaluate, signal, targets }, configuration) {
  const evidence = { schemaVersion: 1, kind: 'work-teams-packaged-operation', creationTaskRef: 'C14.1',
    complete: false, status: 'blocked', startedAt: new Date().toISOString(), sourceRefs: configuration.sourceRefs,
    normalProfile: true, experimentalOptIn: false, gatewayCredentialValueRecorded: false,
    teamMutationSurface: 'Work DOM controls', prerequisiteSurface: 'ordinary application configuration and workspace APIs',
    restartScope: 'Boss renderer reload and persisted Work selection; application process restart not claimed', checks: [], approvals: [] }
  let stage = 'packaged-renderer'
  try {
    requireFact(targets.some((target) => target.type === 'page' &&
      target.url.includes('/windows/main/index.html') && !/^https?:/i.test(target.url)), 'C14_EXACT_PACKAGED_MAIN_TARGET_UNAVAILABLE')
    stage = 'ordinary-prerequisites'
    await openWork(evaluate, signal)
    const selected = await setup(evaluate, configuration)
    evidence.workspaceId = selected.workspaceId
    evidence.credentialReference = selected.credentialReference
    evidence.selectedModel = selected.model
    await selectWorkspace(evaluate, signal, selected.workspaceId)
    const snapshot = () => ipc(evaluate, route('snapshot'), { workspaceId: selected.workspaceId })
    stage = 'normal-profile-qualification'
    const initial = await snapshot()
    evidence.executionProfileStage = initial.executionProfileStage ?? 'unknown'
    evidence.executionProfile = initial.executionProfile ?? null
    requireFact(initial.executionProfileStage === 'qualified', 'C14_NORMAL_PACKAGED_PROFILE_UNQUALIFIED')
    requireFact(initial.capabilities.execution && initial.capabilities.cooperation, 'C14_NORMAL_TEAM_EXECUTION_UNAVAILABLE')
    requireFact(initial.capabilities.coding, 'C14_NORMAL_REPOSITORY_CODING_UNAVAILABLE')
    evidence.checks.push('ordinary-packaged-profile-qualified')

    stage = 'coding-preset-through-work'
    await openCodingSetup(evaluate, signal)
    await selectOption(evaluate, signal, '[data-ui~="teams-model"]',
      `document.querySelector('[role="option"][data-model-source="gateway"][data-provider-id="' + ${JSON.stringify(selected.model.providerId)} + '"][data-model-id="' + ${JSON.stringify(selected.model.modelId)} + '"]')`,
      'C14_WORK_SELECTED_MODEL_UNAVAILABLE')
    await click(evaluate, signal, '[data-ui~="teams-coding-preset"]', 'C14_WORK_CODING_PRESET_UNAVAILABLE')
    const preset = await waitFor(signal, async () => {
      const value = await snapshot()
      const definition = value.definitions.find((item) => ['coordinator', 'worker', 'reviewer']
        .every((role) => item.members.some((member) => member.role === role)))
      return definition && value.bindings.some((binding) => binding.activationSupported &&
        same(binding.package, definition.package)) ? definition : false
    }, 'C14_REAL_CODING_PRESET_NOT_DEPLOYED', 60000, 3000)
    const binding = (await snapshot()).bindings.find((item) => item.activationSupported && same(item.package, preset.package))
    await chooseCodingTeam(evaluate, signal, preset, binding)
    evidence.definition = { id: preset.id, version: preset.version, digest: preset.digest }
    evidence.package = preset.package
    evidence.checks.push('work-selected-model-and-ordinary-coding-preset-deployment')

    stage = 'bounded-natural-language-change'
    const peerTexts = fixturePeerTexts(configuration.marker)
    const prompt = `In this selected isolated repository, change only README.md: replace the exact text pending-${configuration.marker} with ${configuration.marker}. Preserve every other byte and file. Have the worker perform the edit using repository tools, then have the reviewer independently read the file and review the exact change. Both must report the exact delivery marker. Do not commit, push, publish, install dependencies, run tests, or write outside this workspace. For this operation fixture's exact approval inspection, use team_delegate with task.input and payload.text equal to the following exact role string without paraphrasing: ${JSON.stringify({ worker: peerTexts.worker, reviewer: peerTexts.reviewer })}. Use outputContract {"type":"string"}. Delegate worker first with no dependsOn or artifactIds; after worker success, delegate reviewer with dependsOn containing only the worker task ID and payload.artifactIds containing actual worker artifacts. Reserve at most 8192 tokens, 1000000 costMicrounits and 300 elapsedSeconds per delegation. Use team_wait for each handoff. If team_send is needed, coordinator sends the exact recipient role string above; worker or reviewer sends exactly ${JSON.stringify(peerTexts.message)} to coordinator, with only actual attributable artifactIds. Do not send unrelated messages or broadcasts.`
    const existingIds = new Set((await snapshot()).instances.map((item) => item.id))
    await fill(evaluate, signal, '[data-ui~="teams-prompt"]', prompt, 'C14_WORK_NATURAL_LANGUAGE_INPUT_UNAVAILABLE')
    await click(evaluate, signal, '[data-ui~="teams-start"]', 'C14_WORK_START_UNAVAILABLE')
    const instance = await waitFor(signal, async () => (await snapshot()).instances.find((item) =>
      !existingIds.has(item.id) && item.definition.digest === preset.digest), 'C14_WORK_DURABLE_TEAM_CREATION_UNAVAILABLE', 60000, 3000)
    const selector = { workspaceId: selected.workspaceId, teamInstanceId: instance.id }
    const execution = () => ipc(evaluate, route('execution'), selector)
    const artifacts = () => ipc(evaluate, route('artifacts'), selector)
    const roles = Object.fromEntries(instance.members.map((member) => [member.id, member.role]))
    requireFact(instance.members.some((member) => member.role === 'worker') &&
      instance.members.some((member) => member.role === 'reviewer'), 'C14_REAL_WORKER_REVIEWER_MEMBERS_UNAVAILABLE')
    evidence.teamId = instance.id
    evidence.workspaceId = selected.workspaceId
    evidence.binding = instance.binding
    evidence.promptSha256 = digest(prompt)

    stage = 'real-worker-and-reviewer-execution'
    const completed = await waitFor(signal, async () => {
      const value = await execution()
      await captureAttemptEvents(evaluate, value, { instance, texts: peerTexts }, evidence)
      const unsuccessful = value.attempts.filter((item) =>
        ['failed', 'cancelled', 'uncertain'].includes(item.status) && item.executionOutcome !== 'succeeded')
      if (unsuccessful.length) {
        evidence.failedAttempts = unsuccessful.map((item) => ({ id: item.id, memberId: item.memberId,
          status: item.status, stateReason: /^[A-Za-z][A-Za-z0-9_]{0,255}$/.test(item.stateReason ?? '')
            ? item.stateReason : null }))
        throw new Unavailable('C14_REAL_CODING_ATTEMPT_DID_NOT_SUCCEED')
      }
      await approveFixtureRequests(evaluate, signal, configuration, value, roles, evidence.approvals,
        { instance, texts: peerTexts, snapshot, artifacts, evidence })
      const involved = value.attempts.filter((item) => ['worker', 'reviewer'].includes(roles[item.memberId]))
      const finished = involved.filter((item) => item.status === 'succeeded' || item.executionOutcome === 'succeeded')
      const current = (await snapshot()).instances.find((item) => item.id === instance.id)
      const coordinatorFinished = current?.tasks.some((task) => task.role === 'coordinator' && task.status === 'succeeded')
      const active = value.attempts.some((item) => ['queued', 'running', 'cancellation_requested'].includes(item.status))
      const missingRoles = ['worker', 'reviewer'].filter((role) => !finished.some((item) => roles[item.memberId] === role))
      const pendingWait = (value.waits ?? []).some((wait) => ['yield_requested', 'waiting', 'blocked'].includes(wait.state))
      const futureContinuation = [...(value.waits ?? []), ...(value.continuations ?? [])].some((receipt) =>
        receipt.continuationAttemptId && !value.attempts.some((attempt) => attempt.id === receipt.continuationAttemptId))
      if (coordinatorFinished && !active && !pendingWait && !futureContinuation && missingRoles.length) {
        evidence.handoffFailure = { reasonCode: 'coordinator_completed_without_required_handoff', missingRoles,
          coordinatorAttemptIds: value.attempts.filter((item) => roles[item.memberId] === 'coordinator' &&
            (item.status === 'succeeded' || item.executionOutcome === 'succeeded')).map((item) => item.id) }
        throw new Unavailable('C14_COORDINATOR_COMPLETED_WITHOUT_REQUIRED_HANDOFF')
      }
      return coordinatorFinished && !active && !missingRoles.length ? value : false
    }, 'C14_REAL_CODING_OR_REQUIRED_OPERATOR_APPROVAL_UNAVAILABLE', 900000, 3000)
    const finishedAttempts = completed.attempts.filter((item) => ['worker', 'reviewer'].includes(roles[item.memberId]) &&
      (item.status === 'succeeded' || item.executionOutcome === 'succeeded'))
    const page = await artifacts()
    const correlated = page.artifacts.filter((item) => finishedAttempts.some((attempt) => attempt.id === item.attemptId &&
      attempt.taskId === item.taskId && attempt.memberId === item.memberId))
    requireFact(finishedAttempts.every((attempt) => correlated.some((item) => item.attemptId === attempt.id &&
      JSON.stringify(item.content).includes(configuration.marker))), 'C14_FRESH_WORKER_REVIEWER_ARTIFACTS_UNAVAILABLE')
    requireFact(finishedAttempts.some((attempt) => roles[attempt.memberId] === 'reviewer' &&
      attempt.contextArtifactIds.some((id) => correlated.some((item) => item.id === id && roles[item.memberId] === 'worker'))),
      'C14_REAL_WORKER_TO_REVIEWER_HANDOFF_UNAVAILABLE')
    evidence.attempts = modelProvenance(finishedAttempts, configuration.gateway.alias)
    evidence.artifacts = correlated.map((item) => ({ id: item.id, attemptId: item.attemptId, taskId: item.taskId,
      memberId: item.memberId, contentSha256: hashValue(item.content) }))
    evidence.accounting = { reserved: completed.reserved, committed: completed.committed,
      uncertainAttempts: completed.uncertainAttempts, usageUnknown: completed.attempts.filter((item) => item.usage == null).map((item) => item.id) }
    evidence.repository = repositoryResult(configuration.workspaceDirectory, configuration.repository.after)
    evidence.repository.beforeSha256 = configuration.repository.beforeSha256
    await visibleInstance(evaluate, signal, instance, completed)
    await waitFor(signal, () => evaluate(`(() => {
      const rows=[...document.querySelectorAll('[data-ui~="teams-artifacts"] li[data-artifact-id]')];
      return Boolean(document.querySelector('[data-ui~="teams-approvals"]')) &&
        ${JSON.stringify(evidence.artifacts)}.every(item=>rows.some(row=>row.getAttribute('data-artifact-id')===item.id &&
          row.getAttribute('data-attempt-id')===item.attemptId && row.innerText.includes(${JSON.stringify(configuration.marker)})));
    })()`), 'C14_WORK_ARTIFACTS_OR_APPROVAL_STATE_NOT_VISIBLE')
    evidence.checks.push('nl-task-real-worker-and-reviewer-model-attempts', 'real-repository-edit-with-exact-bounded-diff',
      'worker-artifact-handoff-to-reviewer', 'work-members-attempts-artifacts-and-authoritative-approval-state')

    stage = 'durable-work-reopening'
    const identity = { definition: instance.definition, binding: instance.binding, package: instance.package }
    evidence.reopening = await reopen(evaluate, signal, selected, instance.id)
    const restored = (await snapshot()).instances.find((item) => item.id === instance.id)
    requireFact(restored && same(identity, { definition: restored.definition, binding: restored.binding, package: restored.package }),
      'C14_REOPEN_CHANGED_DURABLE_IDENTITY')
    const reopened = await execution()
    await captureAttemptEvents(evaluate, reopened, { instance, texts: peerTexts }, evidence)
    requireFact(same(reopened.attempts.map((item) => item.id), completed.attempts.map((item) => item.id)),
      'C14_REOPEN_REPEATED_MODEL_WORK')
    const restoredArtifacts = await artifacts()
    requireFact(evidence.artifacts.every((item) => restoredArtifacts.artifacts.some((value) =>
      value.id === item.id && hashValue(value.content) === item.contentSha256)), 'C14_REOPEN_CHANGED_ARTIFACT')
    await visibleInstance(evaluate, signal, restored, reopened)
    evidence.checks.push('renderer-reload-and-work-reopen-preserve-identity-attempts-artifacts')

    stage = 'cancellation-through-work'
    await chooseCodingTeam(evaluate, signal, preset, binding)
    const priorIds = new Set((await snapshot()).instances.map((item) => item.id))
    await fill(evaluate, signal, '[data-ui~="teams-prompt"]',
      `Read only README.md and independently review the delivery marker ${configuration.marker}. Do not write any files or perform external effects.`,
      'C14_WORK_CANCEL_TASK_INPUT_UNAVAILABLE')
    await click(evaluate, signal, '[data-ui~="teams-start"]', 'C14_WORK_CANCEL_RUN_START_UNAVAILABLE')
    const cancelInstance = await waitFor(signal, async () => (await snapshot()).instances.find((item) => !priorIds.has(item.id)),
      'C14_WORK_CANCEL_INSTANCE_UNAVAILABLE', 60000, 3000)
    const cancelSelector = { workspaceId: selected.workspaceId, teamInstanceId: cancelInstance.id }
    const cancelRead = () => ipc(evaluate, route('execution'), cancelSelector)
    const active = await waitFor(signal, async () => {
      const value = await cancelRead()
      await captureAttemptEvents(evaluate, value, { instance: cancelInstance, texts: peerTexts }, evidence)
      return value.attempts.find((item) => ['queued', 'running', 'yielded'].includes(item.status))
    }, 'C14_ACTIVE_CANCELLABLE_ATTEMPT_NOT_OBSERVED', 60000, 3000)
    await fill(evaluate, signal, '[data-ui~="teams-control-reason"]', 'Operator-requested bounded C14 cancellation',
      'C14_WORK_CANCEL_REASON_UNAVAILABLE')
    await click(evaluate, signal, `[data-ui~="teams-attempt"][data-attempt-id="${active.id}"] [data-ui~="teams-cancel"]`,
      'C14_WORK_CANCEL_CONTROL_UNAVAILABLE')
    const cancelled = await waitFor(signal, async () => {
      const value = await cancelRead()
      await captureAttemptEvents(evaluate, value, { instance: cancelInstance, texts: peerTexts }, evidence)
      const attempt = value.attempts.find((item) => item.id === active.id)
      if (attempt?.status === 'uncertain') throw new Unavailable('C14_CANCELLATION_OUTCOME_UNCERTAIN')
      if (attempt?.status === 'succeeded') throw new Unavailable('C14_CANCELLATION_RACED_COMPLETION')
      return attempt?.status === 'cancelled' ? { value, attempt } : false
    }, 'C14_CANCELLATION_TERMINAL_STATE_UNAVAILABLE', 120000, 3000)
    evidence.cancellation = { teamId: cancelInstance.id, attemptId: active.id, runId: active.runId,
      status: cancelled.attempt.status, usage: cancelled.attempt.usage, accountingState: cancelled.attempt.accountingState,
      effectDisposition: cancelled.attempt.effectDisposition }
    evidence.cancellation.reopening = await reopen(evaluate, signal, selected, cancelInstance.id)
    const reopenedCancellation = await cancelRead()
    await captureAttemptEvents(evaluate, reopenedCancellation, { instance: cancelInstance, texts: peerTexts }, evidence)
    requireFact(reopenedCancellation.attempts.some((item) => item.id === active.id && item.status === 'cancelled'),
      'C14_REOPEN_LOST_CANCELLATION_STATE')
    repositoryResult(configuration.workspaceDirectory, configuration.repository.after)
    evidence.checks.push('work-ui-cancel-and-reopen-preserve-authoritative-cancelled-attempt')
    evidence.complete = true
    evidence.status = 'success'
  } catch (error) {
    evidence.failureStage = stage
    evidence.failureCode = safeCode(error, signal)
    evidence.visibleFailure = await evaluate(`(() => {
      const text=[...document.querySelectorAll('[role="alert"]')].filter(node=>node.getClientRects().length).map(node=>node.innerText).join(' ');
      return {codes:[...new Set(text.match(/\\b(?:UAR_|TEAM_)[A-Z0-9_]+\\b/g)??[])],httpStatuses:text.match(/HTTP [0-9]{3}/g)??[],pricingUnavailable:text.includes('pricing is unavailable')};
    })()`)
  } finally {
    evidence.finishedAt = new Date().toISOString()
    write(configuration.evidence, evidence)
  }
  return { passed: evidence.complete, observedBehavior: JSON.stringify({ creationTaskRef: 'C14.1',
    complete: evidence.complete, failureCode: evidence.failureCode, evidencePath: configuration.evidence,
    evidenceSha256: createHash('sha256').update(fs.readFileSync(configuration.evidence)).digest('hex'), checks: evidence.checks }) }
}
