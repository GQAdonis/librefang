import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { randomBytes, randomUUID } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { createServer } from 'node:net'
import { click } from '../../../scripts/c14-operation/controls.mjs'
import { ipc } from '../../../scripts/c14-operation/setup.mjs'
import { requireFact, waitFor } from '../../../scripts/c14-operation/io.mjs'
import { action, managedConfig, openSettings, sameUar, selector, status, uarState } from '../../../scripts/c14-operation/bossfang-controls.mjs'
import { alternateUar } from '../../../scripts/c14-operation/bossfang-boundaries.mjs'
import { openWork } from '/Users/gqadonis/Projects/prometheus/worktrees/afc-c16-team-guidance/scripts/reusable-team-operation/scenario.mjs'

const save = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { mode: 0o600 })
const code = error => /^[A-Za-z0-9_.:-]{1,160}$/.test(error?.code ?? '') ? error.code : 'CUSTOMER_BOSSFANG_OPERATION_FAILED'

function applicationPid(context, configuration) {
  if (Number.isInteger(configuration.applicationProcessId) && configuration.applicationProcessId > 0)
    return configuration.applicationProcessId
  const target = context.targets?.find(item => item.type === 'page' && item.webSocketDebuggerUrl)
  requireFact(target, 'CUSTOMER_OWNED_APPLICATION_TARGET_REQUIRED')
  const port = Number(new URL(target.webSocketDebuggerUrl).port)
  const rows = execFileSync('/bin/ps', ['-axo', 'pid=,command='], { encoding: 'utf8' }).split('\n')
  const matches = []
  for (const line of rows) {
    const row = line.trim().match(/^(\d+)\s+(.*)$/)
    if (!row || !/\/Contents\/MacOS\/The Boss(?:\s|$)/.test(row[2])) continue
    const profile = row[2].match(/--user-data-dir=([^\s]+)/)?.[1]
    if (!profile || !path.basename(profile).startsWith('cadence-boss-') ||
      !fs.realpathSync(profile).startsWith(fs.realpathSync(os.tmpdir()) + path.sep) ||
      fs.statSync(profile).uid !== process.getuid()) continue
    const activePort = path.join(profile, 'DevToolsActivePort')
    if (fs.existsSync(activePort) && Number(fs.readFileSync(activePort, 'utf8').split(/\r?\n/)[0]) === port)
      matches.push(Number(row[1]))
  }
  requireFact(matches.length === 1, 'CUSTOMER_EXACT_OWNED_APPLICATION_PID_UNCONFIRMED')
  return matches[0]
}

async function freePort() {
  const listener = createServer()
  await new Promise((resolve, reject) => { listener.once('error', reject); listener.listen(0, '127.0.0.1', resolve) })
  const port = listener.address().port
  await new Promise((resolve, reject) => listener.close(error => error ? reject(error) : resolve()))
  return port
}

// Inspect only descendants of the explicit owned application PID. No argv/logs escape.
function nativeProcesses(applicationPid) {
  const rows = execFileSync('/bin/ps', ['-axo', 'pid=,ppid=,comm='], { encoding: 'utf8' }).split('\n')
    .map(line => line.trim().match(/^(\d+)\s+(\d+)\s+(.+)$/)).filter(Boolean)
    .map(row => ({ pid: Number(row[1]), parentPid: Number(row[2]), command: row[3] }))
  const descendants = new Set([applicationPid])
  let changed = true
  while (changed) {
    changed = false
    for (const row of rows) if (descendants.has(row.parentPid) && !descendants.has(row.pid)) {
      descendants.add(row.pid); changed = true
    }
  }
  return rows.filter(row => descendants.has(row.pid) && path.basename(row.command) === 'bossfang')
    .map(({ pid, parentPid }) => ({ pid, parentPid }))
}

async function applyAndRestart(context, config, evidence, applicationPid) {
  const before = nativeProcesses(applicationPid)
  await managedConfig(context.evaluate, context.signal, config)
  await click(context.evaluate, context.signal, selector('restart'), 'CUSTOMER_BOSSFANG_RESTART_CONTROL_UNAVAILABLE')
  const applied = await waitFor(context.signal, async () => {
    const next = await status(context.evaluate)
    const owned = nativeProcesses(applicationPid)
    return next.status === 'running' && next.ownership === 'managed' &&
      next.requested.port === config.port && next.effective?.port === config.port &&
      !next.restartRequired && owned.length === 1 && !before.some(row => row.pid === owned[0].pid) && { next, owned }
  }, 'CUSTOMER_BOSSFANG_ACTUAL_RESTART_NOT_OBSERVED', 150_000)
  evidence.restarts.push({ previousOwnedPids: before.map(row => row.pid), newOwnedPid: applied.owned[0].pid,
    requestedPort: applied.next.requested.port, effectivePort: applied.next.effective.port,
    ownership: applied.next.ownership, restartRequired: applied.next.restartRequired })
  return applied.next
}

export default async function scenario(context, configuration) {
  const { evaluate, signal } = context
  const phase = configuration.phase ?? 'configure'
  const evidence = { schemaVersion: 1, kind: 'customer-bossfang-settings-lifecycle', phase,
    startedAt: new Date().toISOString(), sourceRefs: configuration.sourceRefs, complete: false, passed: false,
    checks: [], restarts: [], credentialValueRecorded: false, repeatedDashboardWorkflow: false,
    wholeApplicationRestartClaimed: false }
  const persist = () => save(configuration.evidence, evidence)
  let stage = 'prerequisites'
  try {
    requireFact(configuration.isolatedProfile === true, 'CUSTOMER_ISOLATED_PROFILE_REQUIRED')
    requireFact(process.platform === 'darwin', 'CUSTOMER_OWNED_MAC_APPLICATION_REQUIRED')
    configuration = { ...configuration, applicationProcessId: applicationPid(context, configuration) }
    requireFact(['configure', 'reopen', 'alternate'].includes(phase), 'CUSTOMER_BOSSFANG_EXPLICIT_OPERATION_SCOPE_REQUIRED')
    signal.throwIfAborted()
    stage = 'ordinary-onboarding'
    await openWork(evaluate, signal)
    let workspace
    if (phase === 'configure') {
      stage = 'isolated-workspace-registration'
      workspace = await evaluate(`window.api.dataApi.request(${JSON.stringify({ id: randomUUID(),
        method: 'POST', path: '/agent-workspaces', body: { path: configuration.workspaceDirectory } })})`)
      requireFact(!workspace?.error && workspace.data?.id, 'CUSTOMER_DISPOSABLE_WORKSPACE_REQUIRED')
    }
    stage = 'managed-runtime-readiness'
    const inventory = await ipc(evaluate, 'prometheus.uar.instances.read', {})
    await ipc(evaluate, 'prometheus.uar.instances.test', { instanceId: 'managed-local' })
    const baseline = await uarState(evaluate)
    requireFact(baseline.state === 'running' && baseline.selectedInstanceId === inventory.selectedInstanceId,
      'CUSTOMER_EXISTING_MANAGED_UAR_REQUIRED')
    evidence.initialRuntime = baseline
    evidence.applicationProcessId = configuration.applicationProcessId
    await openSettings(evaluate, signal)

    if (phase === 'reopen') {
      stage = 'whole-application-reopen'
      const prior = JSON.parse(fs.readFileSync(configuration.priorEvidence, 'utf8'))
      requireFact(prior.complete && prior.phase === 'configure' && prior.expectedPersistedConfig &&
        prior.applicationProcessId !== configuration.applicationProcessId, 'CUSTOMER_PRIOR_PORT_PERSISTENCE_RECEIPT_REQUIRED')
      const current = await status(evaluate)
      requireFact(Object.entries(prior.expectedPersistedConfig).every(([key, value]) => current.requested[key] === value),
        'CUSTOMER_BOSSFANG_SETTINGS_DID_NOT_SURVIVE_APP_RESTART')
      await click(evaluate, signal, selector('restart'), 'CUSTOMER_BOSSFANG_REOPEN_RESTART_UNAVAILABLE')
      const active = await waitFor(signal, async () => {
        const next = await status(evaluate)
        return next.status === 'running' && next.effective?.port === prior.expectedPersistedConfig.port &&
          nativeProcesses(configuration.applicationProcessId).length === 1 && next
      }, 'CUSTOMER_BOSSFANG_PERSISTED_PORT_NOT_OPERATIONAL', 150_000)
      evidence.persisted = { requested: prior.expectedPersistedConfig, effectivePort: active.effective.port }
      evidence.wholeApplicationRestartClaimed = true
      evidence.previousApplicationProcessId = prior.applicationProcessId
      evidence.checks.push('requested-port-and-instance-persisted-across-owned-app-replacement')
    } else if (phase === 'alternate') {
      stage = 'explicit-authenticated-external-instance'
      const requested = configuration.bossfang?.alternateInstanceId
      const external = inventory.instances.find(item => item.id === requested && item.id !== 'managed-local' &&
        item.enabled && item.ownership === 'external' && item.runtimeCredentialConfigured && item.adminCredentialConfigured)
      requireFact(external, 'CUSTOMER_AUTHENTICATED_EXTERNAL_UAR_FIXTURE_REQUIRED')
      const before = await status(evaluate)
      requireFact(before.requested.ownership === 'managed' && before.requested.workspaceId && before.requested.diagnosticModelId,
        'CUSTOMER_CONFIGURED_BOSSFANG_WORKSPACE_AND_MODEL_REQUIRED')
      const config = { port: before.requested.port, portPolicy: before.requested.portPolicy,
        instanceId: before.requested.uarInstanceId, workspaceId: before.requested.workspaceId,
        modelId: before.requested.diagnosticModelId }
      const result = await alternateUar(evaluate, signal, configuration, config, config.modelId, baseline)
      requireFact(!result.pending && result.observation?.realDelegationSucceeded, result.pending ?? 'CUSTOMER_EXTERNAL_UAR_DELEGATION_UNCONFIRMED')
      evidence.alternate = result
      evidence.checks.push('selected-external-uar-authenticated-real-delegation-work-selection-unchanged')
    } else {
      stage = 'isolated-configuration'
      const before = await status(evaluate)
      if (!before.configured) await ipc(evaluate, 'bossfang.configure_credentials', {
        username: 'customer-disposable-operator', password: randomBytes(32).toString('base64url')
      })
      const config = { port: await freePort(), portPolicy: 'fixed', instanceId: 'managed-local',
        workspaceId: workspace.data.id }
      stage = 'first-explicit-listener'
      await applyAndRestart(context, config, evidence, configuration.applicationProcessId)
      sameUar(baseline, await uarState(evaluate))
      persist()
      stage = 'changed-listener-save-and-restart'
      let changedPort
      do { changedPort = await freePort() } while (changedPort === config.port)
      config.port = changedPort
      await managedConfig(evaluate, signal, config)
      const pending = await status(evaluate)
      requireFact(pending.restartRequired && pending.requested.port !== pending.effective?.port,
        'CUSTOMER_BOSSFANG_PENDING_PORT_NOT_DISTINGUISHED')
      await applyAndRestart(context, config, evidence, configuration.applicationProcessId)
      sameUar(baseline, await uarState(evaluate))
      evidence.checks.push('requested-effective-port-pending-change-and-owned-process-replacement')
      stage = 'stop-preserves-borrowed-runtime'
      await action(evaluate, signal, 'stop', next => next.status === 'stopped')
      requireFact(nativeProcesses(configuration.applicationProcessId).length === 0,
        'CUSTOMER_BOSSFANG_OWNED_PROCESS_NOT_STOPPED')
      sameUar(baseline, await uarState(evaluate))
      await applyAndRestart(context, config, evidence, configuration.applicationProcessId)
      sameUar(baseline, await uarState(evaluate))
      evidence.checks.push('bossfang-stop-restart-preserves-existing-uar-process')
      stage = 'renderer-reopen'
      const oldOrigin = await evaluate('performance.timeOrigin')
      await evaluate('setTimeout(()=>location.reload(),50);true')
      await waitFor(signal, () => evaluate(`performance.timeOrigin!==${JSON.stringify(oldOrigin)} && Boolean(window.api?.ipcApi)`)
        .catch(() => false), 'CUSTOMER_BOSSFANG_RENDERER_RELOAD_UNCONFIRMED')
      await openSettings(evaluate, signal)
      const reopened = await status(evaluate)
      evidence.expectedPersistedConfig = { ownership: 'managed', port: config.port, portPolicy: 'fixed',
        uarInstanceId: 'managed-local', workspaceId: config.workspaceId }
      requireFact(Object.entries(evidence.expectedPersistedConfig).every(([key, value]) => reopened.requested[key] === value) &&
        reopened.effective?.port === config.port, 'CUSTOMER_BOSSFANG_RENDERER_REOPEN_LOST_SETTINGS')
      evidence.checks.push('renderer-reopen-retains-requested-and-effective-settings')
    }
    sameUar(baseline, await uarState(evaluate))
    const afterInventory = await ipc(evaluate, 'prometheus.uar.instances.read', {})
    requireFact(afterInventory.selectedInstanceId === inventory.selectedInstanceId, 'CUSTOMER_BOSSFANG_CHANGED_WORK_INSTANCE')
    evidence.finalRuntime = await uarState(evaluate)
    evidence.complete = true; evidence.passed = true
    evidence.observedBehavior = `Missing BossFang ${phase} operation completed through existing settings controls and typed routes; previous dashboard/workflow passes were not repeated.`
  } catch (error) { evidence.failureStage = stage; evidence.failureCode = code(error) }
  finally { evidence.finishedAt = new Date().toISOString(); persist() }
  return evidence
}
