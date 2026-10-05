import { click, fill } from './controls.mjs'
import { ipc } from './setup.mjs'
import { digest, requireFact, waitFor } from './io.mjs'
import { action, choose, dashboard, diagnostic, managedConfig, openSettings, sameUar, saveDraft, selector, status, uarState } from './bossfang-controls.mjs'

/** Uses actual configured model identity; admission and completion remain native receipts. */
export async function completeDiagnostic(evaluate, signal, {workspaceId, instanceId, modelId}) {
  const previous = await evaluate(`(()=>{const node=[...document.querySelectorAll(${JSON.stringify(selector('diagnostic-report'))})].find(node=>node.getClientRects().length);return node?.getAttribute('data-diagnostic-id')||null})()`)
  await click(evaluate, signal, selector('diagnostic-start'), 'C14_BOSSFANG_BOUNDARY_DIAGNOSTIC_START_UNAVAILABLE')
  const admitted = await waitFor(signal, async () => {
    const next = await diagnostic(evaluate, signal)
    return next.id !== previous && next
  }, 'C14_BOSSFANG_BOUNDARY_DIAGNOSTIC_NOT_ADMITTED')
  const completed = await waitFor(signal, async () => {
    const next = await diagnostic(evaluate, signal, admitted.id)
    return next.status !== 'running' && next
  }, 'C14_BOSSFANG_BOUNDARY_DIAGNOSTIC_NOT_TERMINAL', 240000)
  requireFact(completed.status === 'succeeded' && completed.taskId && completed.workspaceId === workspaceId &&
    completed.instanceId === instanceId && completed.model === modelId && completed.events.length > 0 &&
    completed.stages.length === 5 && completed.stages.every(stage => stage.status === 'succeeded'),
  'C14_BOSSFANG_BOUNDARY_REAL_DELEGATION_FAILED')
  return completed
}

/** Restarts only the application-owned, selected managed UAR after prior runs settle. */
export async function restartAndFollow(evaluate, signal, {workspaceId, modelId}, retainedDiagnostic) {
  const beforeUar = await uarState(evaluate)
  const beforeBoss = await status(evaluate)
  requireFact(beforeUar.selectedInstanceId === 'managed-local' && beforeUar.state === 'running' &&
    beforeBoss.connection === 'connected' && beforeBoss.effective?.uarInstanceId === 'managed-local',
  'C14_BOSSFANG_MANAGED_RESTART_SELECTION_REQUIRED')
  const operation = await ipc(evaluate, 'prometheus.integration.start', {action: 'uar-restart'})
  const settled = await waitFor(signal, async () => {
    const page = await ipc(evaluate, 'prometheus.integration.operation_events', {id: operation.id, after: 0, limit: 1})
    return !['queued','running'].includes(page.operation.status) && page.operation
  }, 'C14_BOSSFANG_UAR_RESTART_NOT_TERMINAL', 180000)
  requireFact(settled.status === 'succeeded', 'C14_BOSSFANG_UAR_RESTART_FAILED')
  const afterUar = await uarState(evaluate)
  requireFact(afterUar.state === 'running' && afterUar.processId !== beforeUar.processId &&
    afterUar.startedAt !== beforeUar.startedAt && afterUar.selectedInstanceId === beforeUar.selectedInstanceId,
  'C14_BOSSFANG_ACTUAL_UAR_PROCESS_RESTART_NOT_OBSERVED')
  // No connect/restart action is sent to BossFang: its production refresh must follow generation.
  const followed = await waitFor(signal, async () => {
    const next = await status(evaluate)
    return next.connection === 'connected' && next.effective?.uarGeneration > beforeBoss.effective.uarGeneration &&
      next.effective.uarInstanceId === 'managed-local' && next.effective.origin === beforeBoss.effective.origin &&
      Date.parse(next.effective.grantExpiresAt) > Date.parse(beforeBoss.effective.grantExpiresAt) && next
  }, 'C14_BOSSFANG_AUTOMATIC_UAR_GENERATION_FOLLOW_NOT_OBSERVED', 90000, 1000)
  const retained = await diagnostic(evaluate, signal, retainedDiagnostic.id)
  requireFact(digest(JSON.stringify(retained)) === digest(JSON.stringify(retainedDiagnostic)),
    'C14_BOSSFANG_RESTART_CHANGED_ADMITTED_DIAGNOSTIC')
  const inventory=await ipc(evaluate,'prometheus.uar.instances.read',{})
  const managed=inventory.instances.find(item=>item.id==='managed-local')
  requireFact(managed?.observed?.id,'C14_BOSSFANG_RESTARTED_RUNTIME_IDENTITY_UNAVAILABLE')
  const completed = await completeDiagnostic(evaluate, signal, {workspaceId, modelId, instanceId: managed.observed.id})
  return {uar: afterUar, diagnostic: completed, observation: {operationId: operation.id,
    beforeProcessId: beforeUar.processId, afterProcessId: afterUar.processId,
    beforeGeneration: beforeBoss.effective.uarGeneration, afterGeneration: followed.effective.uarGeneration,
    bossfangOriginUnchanged: true, automaticFollow: true, retainedDiagnosticUnchanged: true,
    newTaskId: completed.taskId, newRunDelegationSucceeded: true}}
}

/** No instance or credential is created. Only an already configured authenticated inventory row qualifies. */
async function restoreManaged(evaluate, signal, config, modelId) {
  await managedConfig(evaluate, signal, config)
  await action(evaluate, signal, 'connect', next => next.connection === 'connected')
  const restored=await status(evaluate)
  if(restored.requested.diagnosticModelId!==modelId){await choose(evaluate, signal, 'model', modelId);await saveDraft(evaluate, signal)}
}

export async function alternateUar(evaluate, signal, configuration, config, modelId, baselineUar) {
  const inventory = await ipc(evaluate, 'prometheus.uar.instances.read', {})
  const requested = configuration.bossfang?.alternateInstanceId
  const candidate = inventory.instances.find(item => item.id !== 'managed-local' && item.enabled &&
    (!requested || item.id === requested) && item.runtimeCredentialConfigured && item.adminCredentialConfigured)
  if (!candidate) return {pending: 'C14_BOSSFANG_NO_ACTUAL_AUTHENTICATED_ALTERNATE_UAR_FIXTURE'}
  const tested = await ipc(evaluate, 'prometheus.uar.instances.test', {instanceId: candidate.id})
  const alternate = tested.instances.find(item => item.id === candidate.id)
  requireFact(alternate?.compatibility === 'operational' && alternate.checks.authenticated && alternate.observed?.id,
    'C14_BOSSFANG_CONFIGURED_ALTERNATE_AUTHENTICATION_FAILED')
  try {
    await managedConfig(evaluate, signal, {...config, instanceId: alternate.id})
    const connected = await action(evaluate, signal, 'connect', next => next.connection === 'connected')
    requireFact(connected.effective?.uarInstanceId === alternate.id, 'C14_BOSSFANG_ALTERNATE_UAR_IDENTITY_MISMATCH')
    const models = await ipc(evaluate, 'bossfang.models')
    const selected = configuration.bossfang?.alternateModelId ?? modelId
    if (!models.some(model => model.id === selected)) return {pending: 'C14_BOSSFANG_ALTERNATE_SELECTED_MODEL_FIXTURE_UNAVAILABLE'}
    await choose(evaluate, signal, 'model', selected)
    await saveDraft(evaluate, signal)
    const completed = await completeDiagnostic(evaluate, signal, {workspaceId: config.workspaceId,
      instanceId: alternate.observed.id, modelId: selected})
    const after = await ipc(evaluate, 'prometheus.uar.instances.read', {})
    requireFact(after.selectedInstanceId === inventory.selectedInstanceId, 'C14_BOSSFANG_ALTERNATE_CHANGED_WORK_UAR_SELECTION')
    sameUar(baselineUar, await uarState(evaluate))
    return {diagnostic: completed, observation: {configuredInstanceId: alternate.id, admittedInstanceId: completed.instanceId,
      workspaceId: completed.workspaceId, modelId: selected, taskId: completed.taskId,
      authenticatedProbe: true, realDelegationSucceeded: true, workSelectionUnchanged: true}}
  } finally {
    await restoreManaged(evaluate, signal, config, modelId)
  }
}

async function externalSnapshot(evaluate, signal) {
  return waitFor(signal, () => evaluate(`(async()=>{
    const guest=[...document.querySelectorAll('webview[data-mini-app-id="bossfang-dashboard"]')].find(node=>node.getClientRects().length);
    if(!guest)return false;
    return guest.executeJavaScript(${JSON.stringify(`(async()=>{const response=await fetch('/api/status',{redirect:'error',headers:{Authorization:'Bearer '+(sessionStorage.getItem('bossfang-api-key')||'')}});if(!response.ok)return false;const value=await response.json();return Number.isFinite(value.uptime_seconds)?{authenticatedStatus:response.status,uptimeSeconds:value.uptime_seconds}:false})()`)});
  })()`), 'C14_BOSSFANG_EXTERNAL_AUTHENTICATED_UPTIME_UNAVAILABLE')
}

/** Uses a real externally owned dashboard; never launches it, fabricates credentials, or signals its process. */
export async function externalBossFang(evaluate, signal, configuration, config, modelId, baselineUar) {
  const fixture = configuration.bossfang?.external
  if (!fixture?.endpoint || !fixture.usernameEnv || !fixture.passwordEnv)
    return {pending: 'C14_BOSSFANG_NO_REAL_EXTERNAL_DASHBOARD_CREDENTIAL_FIXTURE'}
  const credentialReference = /^[A-Za-z_][A-Za-z0-9_]*$/
  requireFact(credentialReference.test(fixture.usernameEnv) && credentialReference.test(fixture.passwordEnv),
    'C14_BOSSFANG_EXTERNAL_CREDENTIAL_REFERENCE_INVALID')
  const username = process.env[fixture.usernameEnv], password = process.env[fixture.passwordEnv]
  if (!username?.trim() || !password) return {pending: 'C14_BOSSFANG_EXTERNAL_DASHBOARD_CREDENTIAL_UNAVAILABLE'}
  const endpoint = new URL(fixture.endpoint)
  requireFact(!endpoint.username && !endpoint.password && !endpoint.search && !endpoint.hash &&
    (endpoint.protocol === 'https:' || (endpoint.protocol === 'http:' && ['127.0.0.1','localhost','[::1]'].includes(endpoint.hostname))),
    'C14_BOSSFANG_EXTERNAL_ENDPOINT_INVALID')
  try {
    await openSettings(evaluate, signal)
    await choose(evaluate, signal, 'ownership', 'external')
    await fill(evaluate, signal, selector('external-endpoint'), endpoint.origin, 'C14_BOSSFANG_EXTERNAL_ENDPOINT_CONTROL_UNAVAILABLE')
    await saveDraft(evaluate, signal)
    await waitFor(signal, async () => (await status(evaluate)).requested.ownership === 'external', 'C14_BOSSFANG_EXTERNAL_CONFIGURATION_NOT_APPLIED')
    await ipc(evaluate, 'bossfang.configure_credentials', {username, password})
    const borrowed = await action(evaluate, signal, 'restart', next => next.status === 'running' && next.ownership === 'external')
    requireFact(borrowed.effective.origin === endpoint.origin, 'C14_BOSSFANG_EXTERNAL_EFFECTIVE_ORIGIN_MISMATCH')
    await click(evaluate, signal, selector('open'), 'C14_BOSSFANG_EXTERNAL_DASHBOARD_OPEN_UNAVAILABLE')
    await dashboard(evaluate, signal, endpoint.origin)
    const before = await externalSnapshot(evaluate, signal)
    await openSettings(evaluate, signal)
    await action(evaluate, signal, 'connect', next => next.connection === 'connected')
    const stopped = await ipc(evaluate, 'bossfang.stop')
    requireFact(stopped.success === false, 'C14_BOSSFANG_EXTERNAL_STOP_WAS_NOT_REFUSED')
    await openSettings(evaluate, signal)
    await action(evaluate, signal, 'disconnect', next => next.connection === 'disconnected')
    await click(evaluate, signal, selector('open'), 'C14_BOSSFANG_EXTERNAL_REOPEN_UNAVAILABLE')
    await dashboard(evaluate, signal, endpoint.origin)
    const after = await externalSnapshot(evaluate, signal)
    requireFact(after.uptimeSeconds >= before.uptimeSeconds, 'C14_BOSSFANG_EXTERNAL_PROCESS_RESTARTED')
    sameUar(baselineUar, await uarState(evaluate))
    return {observation: {authenticatedDashboard: true, stopRefused: true, disconnectPreservedExternal: true,
      beforeUptimeSeconds: before.uptimeSeconds, afterUptimeSeconds: after.uptimeSeconds,
      uarUnchanged: true, endpointSha256: digest(endpoint.origin)}}
  } finally {
    await managedConfig(evaluate, signal, config)
    await action(evaluate, signal, 'restart', next => next.status === 'running' && next.ownership === 'managed')
    await restoreManaged(evaluate, signal, config, modelId)
  }
}
