import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { click } from './controls.mjs'
import { alternateUar, externalBossFang, restartAndFollow } from './bossfang-boundaries.mjs'
import { ipc } from './setup.mjs'
import { digest, requireFact, waitFor, write } from './io.mjs'
import {
  action, choose, dashboard, diagnostic, managedConfig, occupy, openSettings,
  sameUar, saveDraft, selector, status, uarState
} from './bossfang-controls.mjs'

const terminal = value => value.status !== 'running'
const running = value => value.status === 'running'
const visible = token => `[...document.querySelectorAll(${JSON.stringify(selector(token))})].find(node=>node.getClientRects().length)`

/**
 * Compose after Teams in the SAME launch/context. selection is the actual Teams
 * {workspaceId, selectedModel:{providerId,modelId}} receipt, not a new workspace.
 * Caller may set configuration.bossfang.evidence and waitForRenewal=false; a
 * skipped renewal remains pending. No credential/environment secret is read here.
 */
export default async function operateBossFang({evaluate, signal, targets}, configuration, selection) {
  const evidencePath = configuration.bossfang?.evidence ?? path.join(path.dirname(configuration.evidence), 'bossfang-operation.json')
  const modules = ['bossfang-scenario.mjs', 'bossfang-operation.mjs', 'bossfang-controls.mjs', 'bossfang-boundaries.mjs'].map(name => {
    const source = fileURLToPath(new URL(name, import.meta.url))
    return {name, sha256: digest(fs.readFileSync(source))}
  })
  const evidence = {
    schemaVersion: 1, kind: 'bossfang-packaged-operation', creationTaskRefs: ['C14.4', 'C14.3'],
    startedAt: new Date().toISOString(), completedAt: null, complete: false, status: 'blocked',
    sourceRefs: configuration.sourceRefs, operationModules: modules,
    context: {targetCount: targets.length}, workspaceId: selection?.workspaceId,
    checks: {}, pending: {}, diagnostics: [], failureCode: null
  }
  const passed = (name, observation) => { evidence.checks[name] = {status: 'passed', ...observation} }
  const pending = (name, code) => { evidence.pending[name] = {status: 'pending', code} }
  let releasePort
  let activeCheck = 'packagedContext'
  try {
    requireFact(targets.some(item => item.type === 'page' && item.url.includes('/windows/main/index.html') &&
      !item.url.startsWith('http')), 'C14_BOSSFANG_PACKAGED_MAIN_TARGET_REQUIRED')
    requireFact(selection?.workspaceId && selection.selectedModel?.providerId && selection.selectedModel?.modelId,
      'C14_BOSSFANG_ACTUAL_TEAMS_SELECTION_REQUIRED')
    passed(activeCheck, {samePackagedLaunch: true})
    const workspaceId = selection.workspaceId
    const modelId = selection.selectedModel.providerId + '/' + selection.selectedModel.modelId
    const config = {port: 4545, portPolicy: 'automatic', instanceId: 'managed-local', workspaceId}
    let baselineUar = await uarState(evaluate)
    requireFact(baselineUar.state === 'running' && baselineUar.processId, 'C14_BOSSFANG_TEAMS_UAR_NOT_RUNNING')

    activeCheck = 'appsMascot'
    await ipc(evaluate, 'navigation.open_route_in_main', {path: '/app/launchpad'})
    const mascot = await waitFor(signal, () => evaluate(`(()=>{
      const node=${visible('app')};const img=node?.querySelector('img');
      if(!img?.naturalWidth)return false;
      const canvas=document.createElement('canvas');canvas.width=32;canvas.height=32;
      const context=canvas.getContext('2d');context.drawImage(img,0,0,32,32);
      const pixels=context.getImageData(0,0,32,32).data;let orange=0;
      for(let i=0;i<pixels.length;i+=4)if(pixels[i]>170&&pixels[i+1]>35&&pixels[i+1]<170&&pixels[i+2]<130&&pixels[i+3]>128)orange++;
      return {imageLoaded:true,width:img.naturalWidth,height:img.naturalHeight,orangePixels:orange};
    })()`), 'C14_BOSSFANG_APPS_MASCOT_UNAVAILABLE')
    requireFact(mascot.orangePixels > 0, 'C14_BOSSFANG_ORANGE_MASCOT_NOT_OBSERVED')
    passed(activeCheck, mascot)

    activeCheck = 'dedicatedSettings'
    await openSettings(evaluate, signal)
    const initial = await status(evaluate)
    requireFact(initial.configured, 'C14_BOSSFANG_PROTECTED_DASHBOARD_CREDENTIAL_SETUP_REQUIRED')
    passed(activeCheck, {route: '/settings/bossfang', protectedCredentialsConfigured: true})
    if (initial.status === 'running') await action(evaluate, signal, 'stop', value => value.status === 'stopped')
    const managed = await managedConfig(evaluate, signal, config)
    requireFact(managed.configured, 'C14_BOSSFANG_PROTECTED_MANAGED_CREDENTIAL_SETUP_REQUIRED')

    activeCheck = 'fixedPortConflict'
    try { releasePort = await occupy(4545) } catch (error) {
      requireFact(error?.code === 'EADDRINUSE', 'C14_BOSSFANG_REAL_PORT_OCCUPANCY_UNAVAILABLE')
    }
    await managedConfig(evaluate, signal, {...config, portPolicy: 'fixed'})
    const conflict = await action(evaluate, signal, 'start', value => value.status === 'error' && value.hasError)
    requireFact(!conflict.effective, 'C14_BOSSFANG_FIXED_PORT_CONFLICT_FALSE_SUCCESS')
    const visibleConflict = await evaluate(`Boolean([...document.querySelectorAll('[role="alert"]')].find(node=>node.getClientRects().length&&node.innerText.includes('4545')))`)
    requireFact(visibleConflict, 'C14_BOSSFANG_FIXED_PORT_FEEDBACK_NOT_VISIBLE')
    passed(activeCheck, {requestedPort: 4545, status: conflict.status, visibleFeedback: true})

    activeCheck = 'automaticPortConflict'
    await managedConfig(evaluate, signal, config)
    const automatic = await action(evaluate, signal, 'start', running)
    requireFact(automatic.effective?.port > 4545 && automatic.requested.port === 4545,
      'C14_BOSSFANG_AUTOMATIC_PORT_FALLBACK_NOT_OBSERVED')
    passed(activeCheck, {requestedPort: 4545, effectivePort: automatic.effective.port})
    await action(evaluate, signal, 'stop', value => value.status === 'stopped')
    if (releasePort) {await releasePort(); releasePort = undefined}

    activeCheck = 'managedDefaultAndOwnership'
    const started = await action(evaluate, signal, 'start', running)
    requireFact(started.effective?.port === 4545, 'C14_BOSSFANG_DEFAULT_PORT_NOT_AVAILABLE')
    sameUar(baselineUar, await uarState(evaluate))
    passed(activeCheck, {port: 4545, uarProcess: baselineUar.processId, uarUnchanged: true})

    activeCheck = 'appsDashboardAuthentication'
    await ipc(evaluate, 'navigation.open_route_in_main', {path: '/app/launchpad'})
    await click(evaluate, signal, selector('app'), 'C14_BOSSFANG_APPS_ENTRY_UNAVAILABLE')
    const guest = await dashboard(evaluate, signal, started.effective.origin)
    requireFact(guest.partition === 'persist:bossfang-dashboard' && !guest.hostIpcExposed,
      'C14_BOSSFANG_GUEST_ISOLATION_NOT_OBSERVED')
    const unauthenticated = await fetch(started.effective.origin + '/api/status', {
      redirect: 'error', signal: AbortSignal.any([signal, AbortSignal.timeout(10000)])
    })
    requireFact([401,403].includes(unauthenticated.status), 'C14_BOSSFANG_DASHBOARD_AUTHENTICATION_NOT_ENFORCED')
    passed(activeCheck, {...guest, unauthenticatedStatus: unauthenticated.status})

    activeCheck = 'scopedSameUarConnection'
    await openSettings(evaluate, signal)
    const connected = await action(evaluate, signal, 'connect', value => value.connection === 'connected')
    requireFact(connected.effective?.uarInstanceId === 'managed-local' && connected.effective.grantExpiresAt,
      'C14_BOSSFANG_SCOPED_MANAGED_GRANT_NOT_OBSERVED')
    const lifetime = Date.parse(connected.effective.grantExpiresAt) - Date.now()
    requireFact(lifetime > 0 && lifetime <= 900000, 'C14_BOSSFANG_GRANT_EXPIRY_CONTRACT_NOT_OBSERVED')
    sameUar(baselineUar, await uarState(evaluate))
    const models = await ipc(evaluate, 'bossfang.models')
    requireFact(models.some(item => item.id === modelId), 'C14_BOSSFANG_SELECTED_REAL_MODEL_UNAVAILABLE')
    await choose(evaluate, signal, 'model', modelId)
    await saveDraft(evaluate, signal)
    passed(activeCheck, {instanceId: 'managed-local', workspaceId, modelId,
      generation: connected.effective.uarGeneration, expiresAt: connected.effective.grantExpiresAt})

    activeCheck = 'nativeFullHarnessDiagnostic'
    await click(evaluate, signal, selector('diagnostic-start'), 'C14_BOSSFANG_DIAGNOSTIC_START_UNAVAILABLE')
    const admitted = await diagnostic(evaluate, signal)
    const completed = await waitFor(signal, async () => {
      const next = await diagnostic(evaluate, signal, admitted.id)
      return terminal(next) && next
    }, 'C14_BOSSFANG_REAL_FULL_RUN_DID_NOT_COMPLETE', 240000)
    evidence.diagnostics.push(completed)
    requireFact(completed.status === 'succeeded' && completed.taskId && completed.events.length > 0 &&
      ['listening','authenticated','compatible','delegationOperational'].every(name => completed.checks?.[name] === 'succeeded') &&
      completed.workspaceId === workspaceId && completed.model === modelId &&
      completed.stages.length === 5 && completed.stages.every(item => item.status === 'succeeded'),
      'C14_BOSSFANG_REAL_FULL_RUN_NOT_SUCCESSFUL')
    passed(activeCheck, {id: completed.id, taskId: completed.taskId, stages: completed.stages,
      eventCount: completed.events.length, usage: completed.usage, checks: completed.checks})

    activeCheck = 'nativeFullHarnessCancellation'
    await click(evaluate, signal, selector('diagnostic-start'), 'C14_BOSSFANG_CANCEL_RUN_START_UNAVAILABLE')
    const cancellable = await waitFor(signal, async () => {
      const next = await diagnostic(evaluate, signal)
      return next.id !== completed.id && next.taskId && next.status === 'running' && next
    }, 'C14_BOSSFANG_ADMITTED_CANCELLABLE_RUN_NOT_OBSERVED')
    activeCheck = 'originalRunTransportRetention'
    const disconnected = await action(evaluate, signal, 'disconnect', value => value.connection === 'disconnected')
    requireFact(disconnected.effective?.uarInstanceId === null &&
      cancellable.workspaceId === workspaceId && cancellable.instanceId === completed.instanceId,
      'C14_BOSSFANG_ORIGINAL_RUN_ATTRIBUTION_NOT_OBSERVED')
    const originalAfterDisconnect = await diagnostic(evaluate, signal, cancellable.id)
    if (terminal(originalAfterDisconnect)) {
      pending(activeCheck, 'C14_BOSSFANG_ORIGINAL_SELECTION_RETENTION_NOT_DEMONSTRATED')
      requireFact(false, 'C14_BOSSFANG_ORIGINAL_RUN_COMPLETED_BEFORE_CANCEL')
    }
    await click(evaluate, signal, selector('diagnostic-cancel'), 'C14_BOSSFANG_CANCEL_CONTROL_UNAVAILABLE')
    const cancelled = await waitFor(signal, async () => {
      const next = await diagnostic(evaluate, signal, cancellable.id)
      return terminal(next) && next
    }, 'C14_BOSSFANG_NATIVE_CANCEL_NOT_TERMINAL', 120000)
    evidence.diagnostics.push(cancelled)
    requireFact(cancelled.status === 'cancelled' && cancelled.taskId === cancellable.taskId &&
      cancelled.workspaceId === cancellable.workspaceId && cancelled.instanceId === cancellable.instanceId &&
      cancelled.cancellation?.requested && cancelled.cancellation.acknowledged &&
      cancelled.cancellation.terminal && !cancelled.cancellation.cleanupUncertain,
      'C14_BOSSFANG_NATIVE_CANCEL_NOT_ACKNOWLEDGED')
    const cancellationReceipt = {id: cancelled.id, taskId: cancelled.taskId, status: cancelled.status,
      workspaceId: cancelled.workspaceId, instanceId: cancelled.instanceId, cancellation: cancelled.cancellation}
    passed('nativeFullHarnessCancellation', cancellationReceipt)
    passed(activeCheck, {...cancellationReceipt, selectedDisconnected: true, originalAttributionPreserved: true})
    sameUar(baselineUar, await uarState(evaluate))
    await action(evaluate, signal, 'connect', value => value.connection === 'connected')
    pending('originalRunGrantRenewal', 'C14_BOSSFANG_LONG_LIVED_ORIGINAL_RUN_FIXTURE_UNAVAILABLE')

    activeCheck = 'endpointChangeAndRestart'
    const nextPort = automatic.effective.port
    const pendingConfig = await managedConfig(evaluate, signal, {...config, port: nextPort})
    requireFact(pendingConfig.restartRequired && pendingConfig.effective.port === 4545,
      'C14_BOSSFANG_REQUESTED_EFFECTIVE_SEPARATION_NOT_OBSERVED')
    const restarted = await action(evaluate, signal, 'restart', value => running(value) && value.effective?.port === nextPort)
    sameUar(baselineUar, await uarState(evaluate))
    requireFact(restarted.connection === 'disconnected', 'C14_BOSSFANG_RESTART_RETAINED_STALE_CONNECTION')
    await action(evaluate, signal, 'connect', value => value.connection === 'connected')
    passed(activeCheck, {beforePort: 4545, afterPort: nextPort, uarUnchanged: true, explicitReconnect: true})

    activeCheck = 'uarRestartAndGenerationFollow'
    const followed = await restartAndFollow(evaluate, signal, {workspaceId, modelId}, completed)
    baselineUar = followed.uar
    evidence.diagnostics.push(followed.diagnostic)
    passed(activeCheck, followed.observation)

    activeCheck = 'grantRenewal'
    const renewalBefore = await status(evaluate)
    if (configuration.bossfang?.waitForRenewal !== false) {
      const renewed = await waitFor(signal, async () => {
        const next = await status(evaluate)
        return next.connection === 'connected' && next.effective?.uarGeneration === renewalBefore.effective.uarGeneration &&
          Date.parse(next.effective.grantExpiresAt) > Date.parse(renewalBefore.effective.grantExpiresAt) && next
      }, 'C14_BOSSFANG_PRODUCTION_GRANT_RENEWAL_NOT_OBSERVED', 950000, 1000)
      passed(activeCheck, {generation: renewed.effective.uarGeneration,
        previousExpiresAt: renewalBefore.effective.grantExpiresAt, renewedExpiresAt: renewed.effective.grantExpiresAt})
    } else pending(activeCheck, 'C14_BOSSFANG_RENEWAL_WAIT_NOT_OPERATED')
    pending('expiredGrantRefusal', 'C14_BOSSFANG_PRIVATE_EXPIRED_GRANT_FIXTURE_UNAVAILABLE')
    evidence.pending.expiredGrantRefusal.reason = 'Public supported controls never expose the private grant and production renews it before expiry; no expired-token request was made. Renewal or generation replacement is not refusal evidence.'

    activeCheck = 'alternateConfiguredUar'
    const alternate = await alternateUar(evaluate, signal, configuration, {...config, port: nextPort}, modelId, baselineUar)
    if(alternate.pending)pending(activeCheck, alternate.pending)
    else {evidence.diagnostics.push(alternate.diagnostic);passed(activeCheck, alternate.observation)}

    activeCheck = 'externalBossFangPreservation'
    const external = await externalBossFang(evaluate, signal, configuration, {...config, port: nextPort}, modelId, baselineUar)
    if(external.pending)pending(activeCheck, external.pending)
    else passed(activeCheck, external.observation)

    activeCheck = 'stopPreservesUar'
    await action(evaluate, signal, 'stop', value => value.status === 'stopped' && value.connection === 'disconnected')
    sameUar(baselineUar, await uarState(evaluate))
    passed(activeCheck, {bossfangStopped: true, uarProcess: baselineUar.processId, uarUnchanged: true})

    activeCheck = 'settingsReopen'
    await managedConfig(evaluate, signal, {...config, modelId})
    await ipc(evaluate, 'navigation.open_route_in_main', {path: '/app/launchpad'})
    await openSettings(evaluate, signal)
    const reopened = await status(evaluate)
    requireFact(reopened.requested.port === 4545 && reopened.requested.workspaceId === workspaceId &&
      reopened.requested.uarInstanceId === 'managed-local' && reopened.requested.diagnosticModelId === modelId,
      'C14_BOSSFANG_REOPENED_CONFIGURATION_NOT_RETAINED')
    await action(evaluate, signal, 'start', running)
    await action(evaluate, signal, 'connect', value => value.connection === 'connected')
    passed(activeCheck, {route: '/settings/bossfang', selectedWorkspaceRetained: true, selectedModelRetained: true})
    evidence.complete = true
    evidence.status = Object.keys(evidence.pending).length ? 'completed_with_pending_coverage' : 'completed'
  } catch (error) {
    const code = error?.code ?? error?.message
    evidence.failureCode = typeof code === 'string' && /^C14_[A-Z0-9_]+$/.test(code) ? code : 'C14_BOSSFANG_OPERATION_FAILED'
    evidence.checks[activeCheck] = {status: 'failed', code: evidence.failureCode}
  } finally {
    if (releasePort) try {await releasePort()} catch {evidence.pending.portCleanup = {status: 'pending', code: 'C14_BOSSFANG_PORT_CLEANUP_FAILED'}}
    evidence.completedAt = new Date().toISOString()
    write(evidencePath, evidence)
  }
  return {passed: evidence.complete, evidencePath, evidenceSha256: digest(fs.readFileSync(evidencePath)),
    checks: evidence.checks, pending: evidence.pending, failureCode: evidence.failureCode}
}
