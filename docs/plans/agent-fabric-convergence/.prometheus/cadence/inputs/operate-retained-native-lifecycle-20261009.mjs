import fs from 'node:fs'
import path from 'node:path'
import { createHash, randomUUID } from 'node:crypto'
import { execFileSync, spawn } from 'node:child_process'
import { pathToFileURL } from 'node:url'
import { setTimeout as delay } from 'node:timers/promises'
import { minimalEnvironment } from '/Users/gqadonis/.codex/skills/delivery-cadence/scripts/lib/process.mjs'
import { attach } from '/Users/gqadonis/Projects/prometheus/worktrees/afc-c16-team-guidance/scripts/github-feedback-operation/client.mjs'
import scenario from './customer-native-inference-lifecycle-20261009.mjs'

const initiative = '/Users/gqadonis/Projects/prometheus/worktrees/agent-fabric-c06/librefang/docs/plans/agent-fabric-convergence'
const repository = '/Users/gqadonis/Projects/prometheus/worktrees/afc-c16-team-guidance'
const isolatedProfile = '/var/folders/ln/0wnpd96j26z2qhvx9m6hwt2r0000gn/T/cadence-boss-29WEuI'
const installationPath = path.join(initiative, '.prometheus/cadence/artifacts/customer-public-mac-2.2.25/installation.json')
const expectedBoss = '35eff8c8c40555a4a464ee03b7305bcc4949666b'
const expectedUar = '60b5922e3e11dd73bfd8a47e5bc28f3c16332889'
const priorUarEvidence = path.join(initiative, '.prometheus/cadence/artifacts/customer-public-mac-2.2.25',
  'work-inference-9a197eed-660e-44b6-aebe-5d409ab79570/evidence.json')
const fact = (condition, code) => { if (!condition) throw Object.assign(new Error(code), { code }) }
const safeCode = error => /^[A-Za-z0-9_.:-]{1,160}$/.test(error?.code ?? '') ? error.code : 'CUSTOMER_OPERATION_UNAVAILABLE'
const sha = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex')
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { mode: 0o600 })

function assertClosedProfile() {
  // Capture process metadata only in Node; never print unrelated argv.
  const lines = execFileSync('/bin/ps', ['-axo', 'pid=,command='], { encoding: 'utf8' }).split('\n')
  const active = lines.some(line => {
    const match = line.trim().match(/^(\d+)\s+(.*)$/)
    return match && Number(match[1]) !== process.pid &&
      /Contents\/MacOS\//.test(match[2]) && match[2].includes(`--user-data-dir=${isolatedProfile}`)
  })
  fact(!active, 'CUSTOMER_RETAINED_PROFILE_MUST_BE_CLOSED')
}


async function ownedShutdown(child) {
  if (!child?.pid) return { ownedGroupCreated: false, groupStopped: true }
  const members = () => execFileSync('/bin/ps', ['-axo', 'pid=,ppid=,pgid=,state='], { encoding: 'utf8' })
    .split('\n').map(line => line.trim().match(/^(\d+)\s+(\d+)\s+(\d+)\s+([A-Za-z+<>N-]+)$/))
    .filter(row => row && Number(row[3]) === child.pid)
    .map(row => ({ pid: Number(row[1]), parentPid: Number(row[2]), processGroup: Number(row[3]), state: row[4] }))
  const alive = () => { try { process.kill(-child.pid, 0); return true } catch (error) {
    if (error.code === 'ESRCH') return false
    throw error
  } }
  if (alive()) process.kill(-child.pid, 'SIGTERM')
  const deadline = Date.now() + 3000
  while (alive() && Date.now() < deadline) await delay(100)
  if (alive()) process.kill(-child.pid, 'SIGKILL')
  const killDeadline = Date.now() + 3000
  while (alive() && Date.now() < killDeadline) await delay(100)
  const groupStopped = !alive()
  const receipt = { ownedGroupCreated: true, groupStopped, pid: child.pid,
    probe: 'kill-negative-owned-pid-zero', childExitCode: child.exitCode, childSignalCode: child.signalCode }
  if (!groupStopped) {
    // Group existence includes zombies; retain state without granting shutdown
    // credit or exposing command lines. Previous unconfirmed receipt stands.
    try { receipt.remainingOwnedGroupMembers = members() }
    catch (error) { receipt.groupMemberSnapshotFailureCode = safeCode(error) }
  }
  return receipt
}

export async function operate({ routes = ['codex', 'claude'] } = {}) {
  const output = path.join(initiative, '.prometheus/cadence/artifacts/customer-public-mac-2.2.25', `work-inference-lifecycle-${randomUUID()}`)
  fs.mkdirSync(output, { mode: 0o700 })
  const receiptPath = path.join(output, 'operation.json')
  const evidencePath = path.join(output, 'evidence.json')
  const launchPath = path.join(output, 'launch.json')
  const operation = { schemaVersion: 1, kind: 'public-installed-customer-native-inference-lifecycle', status: 'failed',
    startedAt: new Date().toISOString(), stage: 'prerequisites', isolatedProfile,
    sourceRefs: null, credentialStaging: {}, launched: false, functionalAcceptance: 'pending',
    operatorAcceptance: 'pending', selectedRoutes: routes,
    newCadenceDelivery: false, qualificationLedgerMutated: false }
  const controller = new AbortController()
  const abort = () => controller.abort()
  process.once('SIGINT', abort)
  process.once('SIGTERM', abort)
  const timeout = setTimeout(abort, 900_000)
  let child
  let connection
  let launch
  try {
    fact(routes.length > 0 && new Set(routes).size === routes.length &&
      routes.every(route => ['codex', 'claude'].includes(route)), 'CUSTOMER_NATIVE_FAILED_ROUTE_SCOPE_REQUIRED')
    fact(process.platform === 'darwin' && process.arch === 'arm64', 'CUSTOMER_NATIVE_MAC_ARM64_REQUIRED')
    fact(['UAR_TEAM_EXECUTION_PROFILE_STAGE', 'UAR_WORKFLOW_EXECUTION_PROFILE_STAGE', 'BOSS_C094_PUBLIC_QUALIFICATION']
      .every(name => process.env[name] === undefined), 'CUSTOMER_NORMAL_PROFILE_REQUIRED')
    const installation = JSON.parse(fs.readFileSync(installationPath, 'utf8'))
    fact(installation.status === 'passed' && installation.version === '2.2.25' && installation.source === expectedBoss,
      'CUSTOMER_VERIFIED_PUBLIC_INSTALLATION_REQUIRED')
    const app = installation.app
    const resources = path.join(app, 'Contents/Resources')
    const nativeDirectory = path.join(resources, 'app.asar.unpacked/resources/binaries/darwin-arm64')
    const native = path.join(nativeDirectory, 'uar-sidecar')
    const manifest = JSON.parse(fs.readFileSync(path.join(nativeDirectory, 'payload-manifest.json'), 'utf8'))
    fact(sha(path.join(resources, 'app.asar')) === installation.appAsarSha256 &&
      sha(native) === installation.sidecarSha256 && manifest.source === expectedUar,
      'CUSTOMER_PUBLIC_INSTALLED_BYTES_CHANGED')
    operation.sourceRefs = { boss: expectedBoss, uar: expectedUar, installedVersion: installation.version,
      publicApp: app, installerSha256: installation.sha256, appAsarSha256: installation.appAsarSha256,
      sidecarSha256: installation.sidecarSha256, installationReceiptSha256: sha(installationPath),
      scenarioSha256: sha(new URL('./customer-native-inference-lifecycle-20261009.mjs', import.meta.url)),
      operationDriverSha256: sha(new URL('./operate-retained-native-lifecycle-20261009.mjs', import.meta.url)),
      operationDriverRevision: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repository, encoding: 'utf8' }).trim() }
    const previous = JSON.parse(fs.readFileSync(priorUarEvidence, 'utf8'))
    const priorUar = previous.results?.find(result => result.route === 'uar')
    fact(priorUar?.status === 'passed' && priorUar.committedRuntime === 'uar' &&
      priorUar.stream?.done && !priorUar.stream.error && priorUar.stream.chunks > 0 &&
      priorUar.persisted?.status === 'success' && priorUar.persisted.exactReply && priorUar.persisted.exactModel &&
      ['boss', 'uar', 'appAsarSha256', 'sidecarSha256'].every(key => previous.sourceRefs?.[key] === operation.sourceRefs[key]),
      'CUSTOMER_PRIOR_UAR_SOURCE_EVIDENCE_MISMATCH')
    operation.preservedPassingEvidence = { route: 'uar', evidence: priorUarEvidence,
      evidenceSha256: sha(priorUarEvidence), installedSourceAndBytesMatch: true, repeated: false }
    operation.stage = 'retained-native-profile'; write(receiptPath, operation)
    assertClosedProfile()
    operation.credentialStaging = { skipped: true, reason: 'existing-native-subscription-profile',
      credentialValueRecorded: false, wholeDatabaseCopied: false }
    operation.nativeModelPrerequisites = { retainedPassingSessionsRequired: true, credentialTransferRepeated: false }
    const workspaceDirectory = path.join(output, 'workspaces')
    fs.mkdirSync(workspaceDirectory, { mode: 0o700 })
    controller.signal.throwIfAborted()
    operation.stage = 'spawn-public-owned-app'; write(receiptPath, operation)
    const executable = path.join(app, 'Contents/MacOS/The Boss')
    const activePort = path.join(isolatedProfile, 'DevToolsActivePort')
    fs.rmSync(activePort, { force: true })
    // The native Claude CLI's macOS credential account lookup requires USER.
    // The read-only auth probe reproduced lost login when Cadence stripped it.
    const launchEnvironment = minimalEnvironment()
    if (process.env.USER !== undefined) launchEnvironment.USER = process.env.USER
    operation.launchEnvironment = {
      hostUserIdentityPresent: Boolean(process.env.USER),
      hostUserIdentityPreserved: launchEnvironment.USER === process.env.USER,
      credentialEnvironmentRecorded: false
    }
    child = spawn(executable, ['--lang=en-US', '--remote-debugging-address=127.0.0.1',
      '--remote-debugging-port=0', `--user-data-dir=${isolatedProfile}`], {
      cwd: repository, env: launchEnvironment, detached: true, shell: false, stdio: 'ignore'
    })
    let spawnFailed = false
    child.on('error', () => { spawnFailed = true })
    await new Promise((resolve, reject) => {
      child.once('spawn', resolve)
      child.once('error', () => reject(Object.assign(new Error('CUSTOMER_PUBLIC_APP_SPAWN_FAILED'), { code: 'CUSTOMER_PUBLIC_APP_SPAWN_FAILED' })))
    })
    operation.launched = true
    launch = { status: 'starting', keptOpen: true, pid: child.pid, isolatedUserData: isolatedProfile,
      app, startedAt: new Date().toISOString(), functionalAcceptance: 'pending', sourceRefs: operation.sourceRefs }
    write(launchPath, launch)
    operation.stage = 'private-debug-port'; write(receiptPath, operation)
    const portDeadline = Date.now() + 60_000
    while (!fs.existsSync(activePort) && Date.now() < portDeadline) {
      controller.signal.throwIfAborted()
      fact(!spawnFailed && child.exitCode === null && child.signalCode === null, 'CUSTOMER_PUBLIC_APP_EXITED')
      await delay(250, undefined, { signal: controller.signal })
    }
    fact(fs.existsSync(activePort), 'CUSTOMER_PRIVATE_DEBUG_PORT_UNAVAILABLE')
    launch.status = 'success' // Startup control contract for existing attach; no functional credit.
    connection = await attach(launch, controller.signal)
    operation.stage = 'renderer-ready'; write(receiptPath, operation)
    const rendererDeadline = Date.now() + 60_000
    let ready = false
    while (Date.now() < rendererDeadline) {
      controller.signal.throwIfAborted()
      ready = await connection.evaluate('Boolean(window.api?.ipcApi && window.api?.dataApi)')
      if (ready) break
      await delay(250, undefined, { signal: controller.signal })
    }
    fact(ready, 'CUSTOMER_PUBLIC_RENDERER_NOT_READY')
    launch.rendererReady = true; write(launchPath, launch)
    operation.stage = 'retained-session-followup-and-cancellation'; write(receiptPath, operation)
    const evidence = await scenario({ evaluate: connection.evaluate, signal: controller.signal }, {
      evidence: evidencePath, isolatedProfile: true, workspaceDirectory, sourceRefs: operation.sourceRefs,
      routes: operation.selectedRoutes, preservedPassingEvidence: operation.preservedPassingEvidence,
      priorInferenceEvidence: {
        codex: path.join(initiative, '.prometheus/cadence/artifacts/customer-public-mac-2.2.25/work-inference-6ae34cd5-903a-4f37-8df0-a3fc3c1b7a0a/evidence.json'),
        claude: path.join(initiative, '.prometheus/cadence/artifacts/customer-public-mac-2.2.25/work-inference-904216c6-4399-43b7-b8d9-e9d98acbf9e0/evidence.json')
      }
    })
    operation.status = evidence.passed ? 'passed' : 'failed'
    operation.functionalAcceptance = operation.status
    operation.results = evidence.results
    if (evidence.passed) operation.observedBehavior = evidence.observedBehavior
  } catch (error) {
    operation.failureCode = safeCode(error)
    if (controller.signal.aborted) operation.cancelled = true
    if (!fs.existsSync(evidencePath)) write(evidencePath, { schemaVersion: 1, passed: false, complete: false,
      status: 'failed', failureStage: operation.stage, failureCode: operation.failureCode, results: [],
      credentialValueRecorded: false, sourceRefs: operation.sourceRefs })
  } finally {
    connection?.close()
    try { operation.shutdown = await ownedShutdown(child) }
    catch { operation.shutdown = { ownedGroupCreated: Boolean(child?.pid), groupStopped: false } }
    if (!operation.shutdown.groupStopped) { operation.status = 'failed'; operation.failureCode = 'CUSTOMER_OWNED_GROUP_SHUTDOWN_UNCONFIRMED' }
    if (launch) { launch.keptOpen = false; launch.processStopped = operation.shutdown.groupStopped; write(launchPath, launch) }
    clearTimeout(timeout)
    process.removeListener('SIGINT', abort); process.removeListener('SIGTERM', abort)
    operation.finishedAt = new Date().toISOString()
    operation.evidence = evidencePath
    if (fs.existsSync(evidencePath)) operation.evidenceSha256 = sha(evidencePath)
    operation.launchReceipt = launch ? launchPath : null
    write(receiptPath, operation)
  }
  return { status: operation.status, receiptPath, failureCode: operation.failureCode,
    functionalAcceptance: operation.functionalAcceptance, results: operation.results?.map(result => ({ route: result.route, status: result.status })) }
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  const args = process.argv.slice(2)
  const scoped = args.length === 3 && args[0] === '--execute' && args[1] === '--routes' &&
    ['codex', 'claude', 'codex,claude'].includes(args[2])
  if (!(args.length === 1 && args[0] === '--execute') && !scoped) {
    process.stderr.write('Prepared retained-session lifecycle operation. Root must release the UI slot before invoking --execute [--routes codex|claude|codex,claude].\n')
    process.exitCode = 2
  } else {
    try { const result = await operate({ routes: scoped ? args[2].split(',') : ['codex', 'claude'] }); process.stdout.write(JSON.stringify(result) + '\n'); process.exitCode = result.status === 'passed' ? 0 : 1 }
    catch { process.stderr.write('Customer operation prerequisite unavailable; private inputs were not printed.\n'); process.exitCode = 1 }
  }
}
