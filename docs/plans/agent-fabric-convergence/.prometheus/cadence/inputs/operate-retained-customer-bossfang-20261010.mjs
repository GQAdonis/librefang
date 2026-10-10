import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { spawn, execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { pathToFileURL } from 'node:url'
import { setTimeout as delay } from 'node:timers/promises'
import { minimalEnvironment } from '/Users/gqadonis/.codex/skills/delivery-cadence/scripts/lib/process.mjs'
import { attach } from '/Users/gqadonis/Projects/prometheus/worktrees/afc-c16-team-guidance/scripts/github-feedback-operation/client.mjs'
import { candidatePackage, requireCandidateConfiguration, sha256, requireFact } from './corrected-candidate-contract-20261009.mjs'
import scenario from './customer-bossfang-settings-lifecycle-20261009.mjs'

const initiative = '/Users/gqadonis/Projects/prometheus/worktrees/agent-fabric-c06/librefang/docs/plans/agent-fabric-convergence'
const repository = '/Users/gqadonis/Projects/prometheus/worktrees/afc-c16-team-guidance'
const save = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { mode: 0o600 })
const safeCode = error => /^[A-Za-z0-9_.:-]{1,160}$/.test(error?.code ?? '') ? error.code : 'CUSTOMER_BOSSFANG_LIFECYCLE_UNAVAILABLE'

function groupPresent(pid) {
  try { process.kill(-pid, 0); return true } catch (error) {
    if (error.code === 'ESRCH') return false
    throw error
  }
}

// Only the spawned detached group is targeted; no process argv are inspected or printed.
async function ownedShutdown(child) {
  if (!child?.pid) return { groupCreated: false, groupStopped: true, gracefulQuitConfirmed: false, forceUsed: false }
  const receipt = { pid: child.pid, processGroup: child.pid, groupCreated: true,
    startedAt: new Date().toISOString(), gracefulQuitConfirmed: false, forceUsed: false, signals: [] }
  const untilStopped = async ms => {
    const deadline = Date.now() + ms
    while (groupPresent(child.pid) && Date.now() < deadline) await delay(100)
    return !groupPresent(child.pid)
  }
  if (groupPresent(child.pid)) {
    // SIGTERM is a termination request, not evidence of a product-level graceful quit.
    try { child.kill('SIGTERM'); receipt.signals.push({ target: 'owned-main', signal: 'SIGTERM' }) }
    catch (error) { if (error.code !== 'ESRCH') throw error }
    if (!await untilStopped(15_000)) {
      process.kill(-child.pid, 'SIGTERM')
      receipt.signals.push({ target: 'owned-group', signal: 'SIGTERM' })
      if (!await untilStopped(5_000)) {
        process.kill(-child.pid, 'SIGKILL')
        receipt.signals.push({ target: 'owned-group', signal: 'SIGKILL' })
        receipt.forceUsed = true
        await untilStopped(3_000)
      }
    }
  }
  receipt.groupStopped = !groupPresent(child.pid)
  receipt.mode = receipt.forceUsed ? 'forced-sigkill' : 'sigterm-without-forced-escalation'
  receipt.childExitCode = child.exitCode; receipt.childSignalCode = child.signalCode
  receipt.finishedAt = new Date().toISOString()
  if (!receipt.groupStopped) receipt.remainingOwnedGroupMembers = execFileSync('/bin/ps',
    ['-axo', 'pid=,ppid=,pgid=,state='], { encoding: 'utf8' }).split('\n')
    .map(line => line.trim().match(/^(\d+)\s+(\d+)\s+(\d+)\s+(\S+)$/))
    .filter(row => row && Number(row[3]) === child.pid)
    .map(row => ({ pid: Number(row[1]), parentPid: Number(row[2]), processGroup: Number(row[3]), state: row[4] }))
  return receipt
}

async function ready(signal, child, predicate, failureCode) {
  const deadline = Date.now() + 60_000
  while (Date.now() < deadline) {
    signal.throwIfAborted()
    requireFact(child.exitCode === null && child.signalCode === null, 'CUSTOMER_OWNED_APP_EXITED')
    if (await predicate()) return
    await delay(250, undefined, { signal })
  }
  requireFact(false, failureCode)
}

export async function operate(installationPath, configurationPath) {
  requireFact(process.platform === 'darwin' && process.arch === 'arm64', 'CUSTOMER_MAC_ARM64_REQUIRED')
  const installationFile = fs.realpathSync(path.resolve(installationPath))
  const installation = JSON.parse(fs.readFileSync(installationFile, 'utf8'))
  const { resources, native } = candidatePackage(installation)
  const selected = JSON.parse(fs.readFileSync(configurationPath, 'utf8'))
  const sourceRefs = { boss: installation.source, uar: native.source, installedVersion: installation.version,
    appAsarSha256: installation.appAsarSha256, sidecarSha256: installation.sidecarSha256,
    installerSha256: installation.sha256, installationReceiptSha256: sha256(installationFile),
    scenarioSha256: sha256(new URL('./customer-bossfang-settings-lifecycle-20261009.mjs', import.meta.url)),
    operationDriverSha256: sha256(new URL(import.meta.url)),
    operationDriverRevision: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repository, encoding: 'utf8' }).trim() }
  requireCandidateConfiguration({ ...selected, sourceRefs })
  const directory = path.join(initiative, '.prometheus/cadence/artifacts/customer-corrected-mac-' + installation.version,
    'bossfang-whole-app-reopen-' + randomUUID())
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 })
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cadence-boss-'))
  fs.chmodSync(profile, 0o700)
  const workspaceDirectory = path.join(directory, 'workspace')
  fs.mkdirSync(workspaceDirectory, { mode: 0o700 })
  fs.writeFileSync(path.join(workspaceDirectory, 'README.md'), '# Disposable BossFang lifecycle workspace\n', { flag: 'wx' })
  const receiptPath = path.join(directory, 'operation.json')
  const operation = { schemaVersion: 1, kind: 'corrected-installed-bossfang-whole-app-reopen',
    status: 'pending', startedAt: new Date().toISOString(), sourceRefs, installationReceipt: installationFile,
    isolatedProfile: profile, originalUserProfileTouched: false, credentialValuesRecorded: false,
    newCadenceDelivery: false, qualificationLedgerMutated: false, phases: [], shutdowns: [] }
  const controller = new AbortController()
  const abort = () => controller.abort('owned operation cancelled')
  process.once('SIGINT', abort); process.once('SIGTERM', abort)
  const budget = setTimeout(() => controller.abort('owned operation budget expired'), 1_200_000)
  let child, connection, priorEvidence, previousPid
  const persist = () => save(receiptPath, operation)
  try {
    requireFact(['UAR_TEAM_EXECUTION_PROFILE_STAGE', 'UAR_WORKFLOW_EXECUTION_PROFILE_STAGE', 'BOSS_C094_PUBLIC_QUALIFICATION']
      .every(name => process.env[name] === undefined), 'CUSTOMER_NORMAL_PROFILE_REQUIRED')
    for (const phase of ['configure', 'reopen']) {
      controller.signal.throwIfAborted()
      // Recheck actual installed bytes for each replacement launch.
      candidatePackage(installation)
      const activePort = path.join(profile, 'DevToolsActivePort')
      fs.rmSync(activePort, { force: true })
      child = spawn(path.join(installation.app, 'Contents/MacOS/The Boss'),
        ['--lang=en-US', '--remote-debugging-address=127.0.0.1', '--remote-debugging-port=0', `--user-data-dir=${profile}`],
        { cwd: repository, env: minimalEnvironment(['USER']), detached: true, shell: false, stdio: 'ignore' })
      await new Promise((resolve, reject) => { child.once('spawn', resolve); child.once('error', () =>
        reject(Object.assign(new Error('CUSTOMER_OWNED_APP_SPAWN_FAILED'), { code: 'CUSTOMER_OWNED_APP_SPAWN_FAILED' }))) })
      requireFact(!previousPid || previousPid !== child.pid, 'CUSTOMER_NEW_APPLICATION_PID_REQUIRED')
      const phaseRecord = { phase, pid: child.pid, priorPid: previousPid ?? null, isolatedUserData: profile,
        startedAt: new Date().toISOString(), status: 'pending', gracefulPreviousQuitClaimed: false }
      operation.phases.push(phaseRecord); operation.stage = phase + '-startup'; persist()
      await ready(controller.signal, child, () => fs.existsSync(activePort), 'CUSTOMER_PRIVATE_DEBUG_PORT_UNAVAILABLE')
      connection = await attach({ status: 'success', keptOpen: true, pid: child.pid, isolatedUserData: profile }, controller.signal)
      await ready(controller.signal, child, () => connection.evaluate('Boolean(window.api?.ipcApi && window.api?.dataApi)'),
        'CUSTOMER_RENDERER_NOT_READY')
      const evidencePath = path.join(directory, phase + '-evidence.json')
      operation.stage = phase + '-settings-operation'; persist()
      const evidence = await scenario({ evaluate: connection.evaluate, targets: connection.targets, signal: controller.signal },
        { phase, isolatedProfile: true, applicationProcessId: child.pid, workspaceDirectory,
          sourceRefs, evidence: evidencePath, ...(priorEvidence ? { priorEvidence } : {}) })
      phaseRecord.status = evidence.complete && evidence.passed ? 'passed' : 'failed'
      phaseRecord.evidence = evidencePath; phaseRecord.evidenceSha256 = sha256(evidencePath)
      phaseRecord.finishedAt = new Date().toISOString()
      requireFact(phaseRecord.status === 'passed', evidence.failureCode ?? 'CUSTOMER_BOSSFANG_PHASE_INCOMPLETE')
      connection.close(); connection = undefined
      operation.stage = phase + '-owned-app-shutdown'; persist()
      const shutdown = await ownedShutdown(child)
      operation.shutdowns.push({ phase, ...shutdown }); persist()
      requireFact(shutdown.groupStopped, 'CUSTOMER_OWNED_GROUP_SHUTDOWN_UNCONFIRMED')
      previousPid = child.pid; child = undefined; priorEvidence = evidencePath
    }
    operation.status = 'passed'; operation.functionalAcceptance = 'passed'
    operation.oldApplicationPid = operation.phases[0].pid; operation.newApplicationPid = operation.phases[1].pid
    operation.sameDisposableProfile = operation.phases.every(item => item.isolatedUserData === profile)
    operation.gracefulQuitQualification = 'not-demonstrated'
    operation.observedBehavior = 'BossFang port and selected UAR settings survived confirmed owned-app termination and new-PID reopening of the same disposable profile.'
  } catch (error) {
    operation.status = controller.signal.aborted ? 'cancelled' : 'failed'
    operation.failureCode = safeCode(error); operation.functionalAcceptance = 'pending'
  } finally {
    connection?.close()
    if (child) {
      try { operation.shutdowns.push({ phase: 'cleanup', ...await ownedShutdown(child) }) }
      catch (error) { operation.shutdowns.push({ phase: 'cleanup', pid: child.pid, groupStopped: false, failureCode: safeCode(error) }) }
    }
    if (operation.shutdowns.some(item => !item.groupStopped)) {
      operation.status = 'failed'; operation.failureCode = 'CUSTOMER_OWNED_GROUP_SHUTDOWN_UNCONFIRMED'
    }
    clearTimeout(budget); process.removeListener('SIGINT', abort); process.removeListener('SIGTERM', abort)
    operation.finishedAt = new Date().toISOString(); operation.operatorAcceptance = 'pending'; persist()
  }
  return { status: operation.status, receiptPath, failureCode: operation.failureCode,
    oldApplicationPid: operation.oldApplicationPid, newApplicationPid: operation.newApplicationPid }
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  const args = process.argv.slice(2)
  if (args.length !== 5 || args[0] !== '--execute' || args[1] !== '--installation' || args[3] !== '--configuration') {
    process.stderr.write('Prepared only. Root must release its UI slot, then use --execute --installation <actual-2.2.26-installation.json> --configuration <exact-source-config.json>.\n')
    process.exitCode = 2
  } else {
    try { const receipt = await operate(args[2], args[4]); console.log(JSON.stringify(receipt)); process.exitCode = receipt.status === 'passed' ? 0 : 1 }
    catch { process.stderr.write('Owned BossFang operation prerequisites unavailable; private inputs were not printed.\n'); process.exitCode = 1 }
  }
}
