import { createHash, randomUUID } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import prepareRepresentation, { preparePublicOperation } from './customer-executive-representation-corrected-2.2.29-20261010.mjs'

export { preparePublicOperation }

const sha256 = value => createHash('sha256').update(value).digest('hex')
const requireFact = (value, code) => { if (!value) throw new Error(code) }
const delay = (ms, signal) => new Promise((resolve, reject) => {
  signal.throwIfAborted()
  const abort = () => { clearTimeout(timer); reject(signal.reason) }
  const timer = setTimeout(() => { signal.removeEventListener('abort', abort); resolve() }, ms)
  signal.addEventListener('abort', abort, { once: true })
})

/** Fresh synthetic pending challenge only. Never decides, retries or replays the represented turn. */
export default async function run({ evaluate, signal, onObservation }, configuration) {
  const result = { schemaVersion: 1, kind: 'customer-pending-approval-runtime-recovery',
    sourceRefs: configuration.sourceRefs, startedAt: new Date().toISOString(),
    complete: false, passed: false, status: 'failed', checks: [], newCadenceDelivery: false,
    decisionSubmitted: false, retrySubmitted: false, transparentContinuationAsserted: false }
  let state, stage = 'fresh-disposable-pending-fixture'
  const directory = path.dirname(configuration.evidence)
  const preparationEvidence = path.join(directory, 'pending-representation-preparation.json')
  const selector = () => ({ workspaceId: state.workspaceId, instanceId: state.instanceId })
  async function request(route, input, cleanup = false) {
    if (!cleanup) signal.throwIfAborted()
    return evaluate(`window.api.ipcApi.request(${JSON.stringify(route)},${JSON.stringify(input)})`)
  }
  function staticError(response) {
    const raw = String(response?.error?.message ?? '')
    const http = raw.match(/failed with HTTP (\d{3})(?: \(([A-Za-z0-9_.:-]+)\))?/)
    return { code: /^[A-Za-z0-9_.:-]{1,100}$/.test(response?.error?.code ?? '') ? response.error.code : null,
      httpStatus: http ? Number(http[1]) : null, nativeCode: http?.[2] ?? null,
      messageSha256: sha256(raw), rawMessageIncluded: false }
  }
  async function ipc(route, input, cleanup = false) {
    const response = await request(route, input, cleanup)
    if (!response?.ok) {
      result.failedRequest = { route, ...staticError(response) }
      throw new Error('PENDING_RECOVERY_TYPED_REQUEST_FAILED')
    }
    return response.data
  }
  async function instance() {
    const snapshot = await ipc('prometheus.uar.durable.read', { workspaceId: state.workspaceId })
    const selected = snapshot.instances.find(row => row.instanceId === state.instanceId)
    requireFact(selected, 'PENDING_RECOVERY_INSTANCE_MISSING')
    return selected
  }
  function commandProjection(row, command) {
    return { instanceId: row.instanceId, lifecycle: row.lifecycle, recovery: row.recovery,
      epoch: row.epoch, revision: row.revision, commandCount: row.commands.length,
      lastErrorCode: /^[A-Za-z0-9_.:-]{1,100}$/.test(row.lastErrorCode ?? '') ? row.lastErrorCode : null,
      activeRunId: row.activeRunId ?? null, activeCommandId: row.activeCommandId ?? null,
      activeAttemptId: row.activeAttemptId ?? null,
      commandId: command?.commandId ?? null, attemptId: command?.attemptId ?? null,
      runId: command?.rootRunId ?? null, commandStatus: command?.status ?? null }
  }
  try {
    requireFact(!configuration.resumeState, 'PENDING_RECOVERY_REQUIRES_FRESH_FIXTURE')
    const prepared = await prepareRepresentation({ evaluate, signal, onObservation: async observation => {
      await onObservation?.({ stage: observation.stage, status: observation.status,
        toolName: observation.toolName, decisionOwner: observation.decisionOwner,
        commandId: observation.commandId, runId: observation.runId })
    } }, { ...configuration, evidence: preparationEvidence, holdForOperator: false,
      approvalReceiptPath: path.join(directory, `unused-approval-${randomUUID()}.json`) })
    requireFact(prepared.status === 'pending-human-approval' && prepared.sameTurn?.runId,
      'PENDING_RECOVERY_REAL_CHALLENGE_NOT_REACHED')
    state = JSON.parse(fs.readFileSync(prepared.resumeState, 'utf8'))
    const prior = await instance()
    const priorCommand = prior.commands.find(row => row.commandId === state.command.commandId)
    const before = await ipc('prometheus.uar.durable.run', { ...selector(), runId: state.runId, after: 0 })
    const approval = before.approval
    requireFact(approval?.toolName === 'file_read' && (approval.decisionOwner ?? approval.admissionOwner) === 'uar-runtime' &&
      approval.issuerId === state.pendingApproval.issuerId && approval.challengeId === state.pendingApproval.challengeId &&
      before.effects.every(effect => effect.state !== 'succeeded') &&
      !before.history.some(row => row.issuerId === approval.issuerId && row.challengeId === approval.challengeId && row.decision?.approved),
    'PENDING_RECOVERY_CHALLENGE_ALREADY_SETTLED')
    result.before = { ...commandProjection(prior, priorCommand), approvalId: approval.approvalId,
      issuerId: approval.issuerId, challengeId: approval.challengeId, toolName: approval.toolName,
      admissionOwner: approval.admissionOwner, decisionOwner: approval.decisionOwner ?? approval.admissionOwner,
      argumentsSha256: sha256(approval.argumentsJson), successfulEffects: 0,
      effectStates: before.effects.map(effect => ({ toolName: effect.toolName, state: effect.state })) }
    result.checks.push({ name: 'exact-real-pending-challenge-without-approved-effect', passed: true })
    stage = 'restart-only-owned-managed-runtime'
    const selected = await ipc('prometheus.integration.snapshot', {})
    requireFact(selected.config.uar.selectedInstanceId === 'managed-local' &&
      selected.config.uar.instances.find(row => row.id === 'managed-local')?.ownership === 'managed',
    'PENDING_RECOVERY_MANAGED_INSTANCE_REQUIRED')
    const generationBefore = (await ipc('prometheus.uar.admin.snapshot', {})).generation
    const restart = await ipc('prometheus.integration.start', { action: 'uar-restart' })
    let operation, admin
    const deadline = Date.now() + 90000
    while (Date.now() < deadline) {
      const page = await ipc('prometheus.integration.operation_events', { id: restart.id, limit: 1 })
      operation = page.operation
      if (operation && !['queued', 'running'].includes(operation.status)) break
      await delay(500, signal)
    }
    requireFact(operation?.status === 'succeeded', 'PENDING_RECOVERY_RESTART_NOT_SUCCEEDED')
    while (Date.now() < deadline) {
      admin = await ipc('prometheus.uar.admin.snapshot', {})
      if (admin.uarVersion && admin.generation > generationBefore) break
      await delay(500, signal)
    }
    requireFact(admin?.uarVersion && admin.generation > generationBefore, 'PENDING_RECOVERY_NEW_GENERATION_NOT_OBSERVED')
    const retained = await ipc('prometheus.integration.snapshot', {})
    requireFact(retained.config.uar.selectedInstanceId === 'managed-local' &&
      retained.config.services.liter.ownership === selected.config.services.liter.ownership &&
      retained.config.services.liter.endpoint === selected.config.services.liter.endpoint,
    'PENDING_RECOVERY_INSTANCE_SELECTION_CHANGED')
    result.restart = { operationId: restart.id, status: operation.status, generationBefore,
      generationAfter: admin.generation, instanceId: 'managed-local' }
    result.checks.push({ name: 'owned-runtime-restarted-without-another-turn-or-decision', passed: true })
    stage = 'read-same-command-and-retained-approval'
    const after = await instance()
    const afterCommand = after.commands.find(row => row.commandId === state.command.commandId)
    result.after = commandProjection(after, afterCommand)
    // controller.load latches orphaned attempts as failed/effect_uncertain;
    // pump settlement can instead confirm cancellation before graceful shutdown.
    const inactive = !after.activeRunId && !after.activeCommandId && !after.activeAttemptId &&
      ['dormant', 'disabled', 'failed'].includes(after.lifecycle)
    const uncertain = afterCommand?.status === 'uncertain' && after.lifecycle === 'failed' && after.recovery === 'effect_uncertain'
    const cancelled = afterCommand?.status === 'cancelled' && after.recovery === 'ready'
    requireFact(afterCommand?.rootRunId === state.runId && after.commands.length === prior.commands.length &&
      inactive && (uncertain || cancelled), 'PENDING_RECOVERY_INTERRUPTION_NOT_PRESERVED')
    result.interruptionOutcome = uncertain ? 'uncertain-reconciliation-required' : 'confirmed-cancellation'
    result.checks.push({ name: 'same-command-retained-with-terminal-interruption-and-no-replay', passed: true,
      outcome: result.interruptionOutcome })
    const response = await request('prometheus.uar.durable.run', { ...selector(), runId: state.runId, after: 0 })
    if (!response?.ok) {
      result.afterRestartHistory = { available: false, approvalState: 'unknown', successfulEffects: 'unknown',
        route: 'prometheus.uar.durable.run', ...staticError(response) }
      result.qualificationLimitations = ['The existing typed durable.run reader requires process-local events; historical approval/effect readability is not established after restart.']
      result.executionComplete = true; result.status = 'pending-qualification'
    } else {
      const run = response.data
      const historical = run.history.find(row => row.issuerId === approval.issuerId && row.challengeId === approval.challengeId)
      result.afterRestartHistory = { available: true, pendingApprovalPresent: Boolean(run.approval),
        exactChallengePresent: Boolean(historical), approvalState: historical?.state ?? 'unknown',
        resolvable: historical?.resolvable ?? 'unknown', successfulEffects: run.effects.filter(effect => effect.state === 'succeeded').length }
      requireFact(historical && !historical.resolvable && !run.approval &&
        !run.effects.some(effect => effect.state === 'succeeded'), 'PENDING_RECOVERY_RETAINED_AUTHORITY_UNCONFIRMED')
      result.checks.push({ name: 'retained-history-readable-old-challenge-unresolvable-no-successful-effect', passed: true })
      result.executionComplete = true; result.complete = true; result.passed = true; result.status = 'passed'
    }
  } catch (cause) {
    result.failureStage = stage
    result.failureCode = /^[A-Za-z0-9_.:-]{1,160}$/.test(cause.message ?? '') ? cause.message : 'PENDING_RECOVERY_OPERATION_FAILED'
  } finally {
    if (state?.grant) {
      try {
        await ipc('prometheus.uar.representation.revoke', { workspaceId: state.workspaceId,
          grantId: state.grant.grantId, expectedRevision: state.grant.revision, reason: 'Synthetic pending-recovery operation cleanup' }, true)
        result.grantRevoked = true
        await ipc('prometheus.uar.durable.instance_action', { ...selector(), action: 'disable', commandId: randomUUID() }, true)
        result.instanceDisabled = true
      } catch { result.cleanupPending = true }
    }
    if (state?.priorNativeSettings) {
      try {
        const settings = await ipc('prometheus.uar.settings.read', { namespace: 'native-tools' }, true)
        await ipc('prometheus.uar.settings.update', { namespace: 'native-tools', changes: state.priorNativeSettings.map(row => ({
          ...row, expectedRevision: settings.settings.find(field => field.field === row.field).revision })) }, true)
        result.nativeSettingsRestoredForNextRestart = true
      } catch { result.nativeSettingsCleanupPending = true }
    }
    result.finishedAt = new Date().toISOString()
    result.preparationEvidence = { path: preparationEvidence,
      ...(fs.existsSync(preparationEvidence) ? { sha256: sha256(fs.readFileSync(preparationEvidence)) } : {}) }
    result.observedBehavior = JSON.stringify({ status: result.status, checks: result.checks,
      afterRestartHistory: result.afterRestartHistory, failureCode: result.failureCode })
    fs.writeFileSync(configuration.evidence, JSON.stringify(result, null, 2) + '\n', { mode: 0o600 })
  }
  return result
}
