import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { createServer } from 'node:net'
import { randomBytes, randomUUID } from 'node:crypto'
import { setTimeout as delay } from 'node:timers/promises'
import { candidatePackage, requireCandidateConfiguration, requireFact } from './corrected-candidate-contract-2.2.28-20261010.mjs'
import { ipc, setup } from '../../../scripts/c14-operation/setup.mjs'
import { waitFor } from '../../../scripts/c14-operation/io.mjs'
import { action, choose, managedConfig, openSettings, sameUar, saveDraft, status, uarState } from '../../../scripts/c14-operation/bossfang-controls.mjs'
import { completeDiagnostic } from '../../../scripts/c14-operation/bossfang-boundaries.mjs'
import { openWork } from '/Users/gqadonis/Projects/prometheus/worktrees/afc-c16-team-guidance/scripts/reusable-team-operation/scenario.mjs'

export function preparePublicOperation({ installation }) {
  const candidate = candidatePackage(installation)
  return { configuration: {
    expectedBossSource: installation.source,
    isolatedProfile: true,
    secondaryExecutable: path.join(candidate.nativeRoot, 'uar-sidecar'),
    secondaryModelsDirectory: path.join(candidate.nativeRoot, 'uar-models'),
    secondaryPoliciesDirectory: path.join(candidate.nativeRoot, 'policies')
  } }
}

const save = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { mode: 0o600 })
const isAlive = child => child?.pid && child.exitCode === null && child.signalCode === null

async function freePort() {
  const listener = createServer()
  await new Promise((resolve, reject) => { listener.once('error', reject); listener.listen(0, '127.0.0.1', resolve) })
  const port = listener.address().port
  await new Promise((resolve, reject) => listener.close(error => error ? reject(error) : resolve()))
  return port
}

async function ownedShutdown(child) {
  if (!child) return { ownedProcessStarted: false }
  const processId = child.pid
  child.stdin.end()
  let deadline = Date.now() + 10000
  while (isAlive(child) && Date.now() < deadline) await delay(100)
  let termination = 'stdin-eof'
  if (isAlive(child)) {
    termination = 'owned-sigterm'
    child.kill('SIGTERM')
    deadline = Date.now() + 3000
    while (isAlive(child) && Date.now() < deadline) await delay(100)
  }
  if (isAlive(child)) {
    termination = 'owned-sigkill'
    child.kill('SIGKILL')
    deadline = Date.now() + 3000
    while (isAlive(child) && Date.now() < deadline) await delay(100)
  }
  return { ownedProcessStarted: true, processId, termination, exitCode: child.exitCode,
    signalCode: child.signalCode, stopped: !isAlive(child) }
}

export default async function scenario(context, configuration) {
  const { evaluate, signal } = context
  const evidence = { schemaVersion: 1, kind: 'customer-bossfang-authenticated-alternate-packaged-uar',
    startedAt: new Date().toISOString(), sourceRefs: requireCandidateConfiguration(configuration),
    complete: false, passed: false, checks: [], secretsRecorded: false, hostLaunchTokenShared: false,
    repeatedPortRestartDashboardOperations: false, externalDelegationQualified: false }
  const persist = () => save(configuration.evidence, evidence)
  const secondaryRoot = path.join(path.dirname(configuration.evidence), 'secondary-uar-' + randomUUID())
  let child, grant, original, primary, instanceId, registered = false, stage = 'prerequisites'
  let hostToken, adminKey, origin, workspaceId
  // This private supervisor alone owns its token. The Boss receives only the minted grant.
  const hostRequest = async (pathname, method = 'GET', body) => {
    const response = await fetch(new URL(pathname, origin), {
      method, redirect: 'error', signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]),
      headers: { authorization: 'Bearer ' + hostToken, 'x-uar-principal': 'customer-secondary-bossfang',
        'x-uar-admin-key': adminKey, ...(body ? { 'content-type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {})
    })
    requireFact(response.ok, 'CUSTOMER_SECONDARY_HOST_HTTP_' + response.status)
    return response.status === 204 ? null : response.json()
  }
  try {
    requireFact(configuration.isolatedProfile === true && process.platform === 'darwin',
      'CUSTOMER_DISPOSABLE_MAC_PROFILE_REQUIRED')
    requireFact(fs.existsSync(configuration.secondaryExecutable) &&
      fs.existsSync(configuration.secondaryModelsDirectory) && fs.existsSync(configuration.secondaryPoliciesDirectory),
      'CUSTOMER_PACKAGED_SECONDARY_ASSETS_REQUIRED')
    stage = 'normal-workspace-and-gateway-configuration'
    await openWork(evaluate, signal)
    const selected = await setup(evaluate, configuration)
    workspaceId = selected.workspaceId
    await ipc(evaluate, 'prometheus.uar.teams.setup_coding', {
      workspaceId, model: selected.model
    })
    const initialInventory = await ipc(evaluate, 'prometheus.uar.instances.read', {})
    await ipc(evaluate, 'prometheus.uar.instances.test', { instanceId: 'managed-local' })
    primary = await uarState(evaluate)
    requireFact(primary.state === 'running' && initialInventory.selectedInstanceId === 'managed-local',
      'CUSTOMER_PRIMARY_MANAGED_UAR_REQUIRED')
    evidence.primaryBefore = primary
    await openSettings(evaluate, signal)
    original = await status(evaluate)
    if (!original.configured) await ipc(evaluate, 'bossfang.configure_credentials', {
      username: 'customer-disposable-operator', password: randomBytes(32).toString('base64url')
    })
    // Establish ordinary managed connection only; no repeated baseline inference or port/restart matrix.
    original = { ...original, requested: { ...original.requested, workspaceId } }
    const restoredConfig = { port: original.requested.port, portPolicy: original.requested.portPolicy,
      instanceId: 'managed-local', workspaceId }
    await managedConfig(evaluate, signal, restoredConfig)
    if ((await status(evaluate)).status !== 'running')
      await action(evaluate, signal, 'restart', next => next.status === 'running')
    await action(evaluate, signal, 'connect', next => next.connection === 'connected')
    const primaryModels = await ipc(evaluate, 'bossfang.models')
    const primaryModel = primaryModels.find(model => model.modelId === configuration.gateway.alias)
    requireFact(primaryModel, 'CUSTOMER_PRIMARY_MODEL_REQUIRED')
    original.requested.diagnosticModelId = primaryModel.id

    stage = 'independently-owned-packaged-secondary-startup'
    fs.mkdirSync(secondaryRoot, { mode: 0o700 })
    fs.cpSync(configuration.secondaryPoliciesDirectory, path.join(secondaryRoot, 'policies'), { recursive: true })
    const configFile = path.join(secondaryRoot, 'sidecar.yaml')
    hostToken = randomBytes(32).toString('hex')
    adminKey = randomBytes(32).toString('hex')
    instanceId = 'customer-external-' + randomUUID()
    const providerId = 'customer-alternate-gateway'
    const credential = process.env[configuration.gateway.credentialEnv]
    requireFact(Boolean(credential), 'CUSTOMER_EXISTING_GATEWAY_CREDENTIAL_REQUIRED')
    // JSON is valid YAML; private config contains the existing gateway credential, never a launch token.
    fs.writeFileSync(configFile, JSON.stringify({ providers: [{ id: providerId,
      display_name: 'Disposable selected gateway', base_url: configuration.gateway.endpoint,
      api_key: credential, protocol: 'chat', default_model: configuration.gateway.alias, enabled: true,
      models: [{ id: configuration.gateway.alias, enabled: true, supports_tools: true,
        supports_streaming: true }] }] }) + '\n',
      { flag: 'wx', mode: 0o600 })
    const env = Object.fromEntries(['PATH', 'HOME', 'TMPDIR', 'LANG', 'LC_ALL'].filter(key => process.env[key])
      .map(key => [key, process.env[key]]))
    Object.assign(env, { UAR_SIDECAR: '1', UAR_SERVICE_INSTANCE__OWNERSHIP: 'external',
      UAR_SERVICE_INSTANCE__INSTANCE_ID: instanceId, UAR_PERSISTENCE__PROVIDER: 'surreal',
      UAR_PERSISTENCE__DATABASE_URL: 'surrealkv://' + path.join(secondaryRoot, 'runtime.db'),
      UAR_SECURITY__SETTINGS_MUTATION_AUTH_REQUIRED: 'true', UAR_SECURITY__SETTINGS_ADMIN_KEY: adminKey,
      CREDENTIAL_ENCRYPTION_KEY: randomBytes(32).toString('hex'), UAR_MODELS_DIR: configuration.secondaryModelsDirectory,
      UAR_NATIVE_TOOLS__FILE_TOOLS_ENABLED: 'false', UAR_NATIVE_TOOLS__WEB_FETCH_ENABLED: 'false',
      UAR_NATIVE_TOOLS__TERMINAL_EXEC_ENABLED: 'false' })
    let readyPort, startupFailure = false, stdoutTail = ''
    child = spawn(configuration.secondaryExecutable, ['--config', configFile, '--port', String(await freePort())],
      { cwd: secondaryRoot, env, shell: false, stdio: ['pipe', 'pipe', 'pipe'] })
    child.on('error', () => { startupFailure = true })
    child.stdout.on('data', chunk => {
      stdoutTail += chunk.toString()
      let newline
      while ((newline = stdoutTail.indexOf('\n')) >= 0) {
        const line = stdoutTail.slice(0, newline).trim(); stdoutTail = stdoutTail.slice(newline + 1)
        const match = /^READY:(\d+)$/.exec(line)
        if (match) readyPort = Number(match[1])
      }
      // Drain runtime output but do not save provider messages, auth values or arbitrary bodies.
      stdoutTail = stdoutTail.slice(-128)
    })
    child.stderr.on('data', () => {})
    child.stdin.write(hostToken + '\n')
    await waitFor(signal, () => {
      requireFact(!startupFailure && isAlive(child), 'CUSTOMER_SECONDARY_STARTUP_FAILED')
      return readyPort
    }, 'CUSTOMER_SECONDARY_READY_NOT_OBSERVED', 120000)
    origin = 'http://127.0.0.1:' + readyPort
    evidence.secondary = { processId: child.pid, effectivePort: readyPort, instanceId,
      packagedBinarySha256: configuration.sourceRefs.sidecarSha256, lifecycleOwner: 'disposable-operation-supervisor' }
    const capabilities = await hostRequest('/api/uar/capabilities')
    requireFact(capabilities.instance.id === instanceId && capabilities.ownership === 'external' &&
      capabilities.instance.workspace_location === 'local', 'CUSTOMER_SECONDARY_IDENTITY_MISMATCH')
    grant = await hostRequest('/api/uar/delegation-grants', 'POST', {
      workspace_ids: [workspaceId], operations: ['discovery', 'model_read', 'model_completion', 'full_harness_delegation']
    })
    requireFact(grant.principal === 'customer-secondary-bossfang' && grant.instance_id === instanceId &&
      grant.workspace_ids.length === 1 && grant.workspace_ids[0] === workspaceId && grant.expires_in === 900,
      'CUSTOMER_SECONDARY_EXACT_GRANT_REQUIRED')
    evidence.scopedGrant = { id: grant.id, principal: grant.principal, instanceId: grant.instance_id,
      workspaceIds: grant.workspace_ids, operations: grant.operations, expiresAt: grant.expires_at,
      expiresIn: grant.expires_in, runtimeEpoch: grant.runtime_epoch }
    stage = 'ordinary-protected-external-inventory-registration'
    const inventory = await ipc(evaluate, 'prometheus.uar.instances.read', {})
    await ipc(evaluate, 'prometheus.uar.instances.save', { expectedRevision: inventory.revision,
      instance: { id: instanceId, name: 'Disposable packaged external UAR', enabled: true, ownership: 'external',
        expectedRuntimeId: instanceId, profile: capabilities.instance.profile, minimumVersion: '', workspaceLocation: 'local',
        workspaceRoots: [configuration.workspaceDirectory], requiredCapabilities: ['full_harness_delegation_v1'],
        endpoints: capabilities.endpoints, runtimeCredentialRef: 'uar-instance://' + instanceId,
        adminCredentialRef: 'uar-instance://' + instanceId + '/admin' },
      runtimeCredential: { operation: 'set', value: grant.token }, adminCredential: { operation: 'set', value: adminKey } })
    registered = true
    const tested = await ipc(evaluate, 'prometheus.uar.instances.test', { instanceId })
    const external = tested.instances.find(item => item.id === instanceId)
    requireFact(external?.compatibility === 'operational' && external.checks.authenticated,
      'CUSTOMER_SECONDARY_AUTHENTICATED_DISCOVERY_FAILED')
    evidence.checks.push('external-scoped-credential-authenticated-discovery-and-identity')
    stage = 'bossfang-actual-external-selection'
    await managedConfig(evaluate, signal, { ...restoredConfig, instanceId })
    await action(evaluate, signal, 'connect', next => next.connection === 'connected' && next.effective?.uarInstanceId === instanceId)
    stage = 'bossfang-real-scoped-model-inventory'
    const modelsReply = await evaluate(`window.api.ipcApi.request('bossfang.models',undefined)`)
    if (!modelsReply?.ok) {
      // Retain only the exact static HTTP category from the real product failure, never arbitrary error text.
      const statusMatch = /UAR model inventory failed \(HTTP (\d{3})\)/.exec(JSON.stringify(modelsReply))
      evidence.modelInventory = { route: 'bossfang.models', nativePath: '/api/uar/providers',
        succeeded: false, httpStatus: statusMatch ? Number(statusMatch[1]) : null }
      requireFact(false, 'CUSTOMER_EXTERNAL_MODEL_INVENTORY_REJECTED')
    }
    evidence.modelInventory = { route: 'bossfang.models', nativePath: '/api/uar/providers', succeeded: true }
    const selectedModel = modelsReply.data.find(model => model.provider === providerId && model.modelId === configuration.gateway.alias)
    requireFact(selectedModel, 'CUSTOMER_SECONDARY_CONFIGURED_MODEL_NOT_VISIBLE')
    await choose(evaluate, signal, 'model', selectedModel.id)
    await saveDraft(evaluate, signal)
    stage = 'actual-external-no-effect-delegation'
    evidence.diagnostic = await completeDiagnostic(evaluate, signal, { workspaceId, instanceId, modelId: selectedModel.id })
    evidence.externalDelegationQualified = true
    evidence.checks.push('real-external-no-effect-inference-correlated-to-selected-instance-and-workspace')
    requireFact(isAlive(child), 'CUSTOMER_BOSSFANG_STOPPED_SECONDARY_UAR')
    sameUar(primary, await uarState(evaluate))
    requireFact((await ipc(evaluate, 'prometheus.uar.instances.read', {})).selectedInstanceId === initialInventory.selectedInstanceId,
      'CUSTOMER_EXTERNAL_SELECTION_CHANGED_WORK_RUNTIME')
    evidence.complete = true; evidence.passed = true
  } catch (error) {
    evidence.failureStage = stage
    evidence.failureCode = /^[A-Z0-9_]{1,160}$/.test(error?.code ?? '') ? error.code : 'CUSTOMER_EXTERNAL_OPERATION_FAILED'
  } finally {
    // Restore only this disposable application profile. Keep borrowed runtime alive until its owner closes stdin.
    if (original && primary) {
      try {
        await managedConfig(evaluate, signal, { port: original.requested.port, portPolicy: original.requested.portPolicy,
          instanceId: 'managed-local', workspaceId })
        await action(evaluate, signal, 'connect', next => next.connection === 'connected')
        if (original.requested.diagnosticModelId) {
          await choose(evaluate, signal, 'model', original.requested.diagnosticModelId)
          await saveDraft(evaluate, signal)
        }
        requireFact(!child || isAlive(child), 'CUSTOMER_BOSSFANG_TERMINATED_BORROWED_UAR')
        sameUar(primary, await uarState(evaluate))
        requireFact((await ipc(evaluate, 'prometheus.uar.instances.read', {})).selectedInstanceId === 'managed-local',
          'CUSTOMER_WORK_SELECTION_CHANGED')
        evidence.cleanup = { selectionRestored: true, primaryProcessUnchanged: true,
          secondaryAliveAfterBossFangSwitch: child ? isAlive(child) : null }
      } catch {
        evidence.cleanup = { selectionRestored: false, failureCode: 'CUSTOMER_EXTERNAL_SELECTION_RESTORE_FAILED' }
        evidence.complete = false; evidence.passed = false
      }
    }
    if (registered) {
      try {
        const inventory = await ipc(evaluate, 'prometheus.uar.instances.read', {})
        await ipc(evaluate, 'prometheus.uar.instances.delete', { expectedRevision: inventory.revision, instanceId })
        evidence.externalInventoryRemoved = true
      } catch { evidence.externalInventoryRemoved = false }
    }
    if (grant && isAlive(child) && !signal.aborted) {
      try { await hostRequest('/api/uar/delegation-grants/' + encodeURIComponent(grant.id), 'DELETE'); evidence.grantRevoked = true }
      catch { evidence.grantRevoked = false }
    }
    evidence.secondaryCleanup = await ownedShutdown(child)
    if (child && !evidence.secondaryCleanup.stopped) {
      evidence.complete = false; evidence.passed = false
      evidence.cleanupFailureCode = 'CUSTOMER_OWNED_SECONDARY_SHUTDOWN_UNCONFIRMED'
    }
    const privateConfig = path.join(secondaryRoot, 'sidecar.yaml')
    if (fs.existsSync(privateConfig)) fs.unlinkSync(privateConfig)
    hostToken = undefined; adminKey = undefined; grant = undefined
    evidence.finishedAt = new Date().toISOString(); persist()
  }
  return evidence
}
