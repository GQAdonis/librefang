import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { createHash, randomUUID } from 'node:crypto'
import { execFileSync, spawn } from 'node:child_process'
import { setTimeout as delay } from 'node:timers/promises'
import { pathToFileURL } from 'node:url'
import { minimalEnvironment } from '/Users/gqadonis/.codex/skills/delivery-cadence/scripts/lib/process.mjs'
import { attach } from '/Users/gqadonis/Projects/prometheus/worktrees/afc-c16-team-guidance/scripts/github-feedback-operation/client.mjs'
import { operate } from './operate-retained-uar-lifecycle-2.2.28-20261010.mjs'

const initiative = '/Users/gqadonis/Projects/prometheus/worktrees/agent-fabric-c06/librefang/docs/plans/agent-fabric-convergence'
const repository = '/Users/gqadonis/Projects/prometheus/worktrees/afc-c16-team-guidance'
const expectedBoss = '6de6477cdddb0886387dcb752913c43bf3ec3de2'
const expectedUar = '66b36bb54feb24bb1bd660c5f1e6a50bdf7d4ad4'
const retainedProfile = '/var/folders/ln/0wnpd96j26z2qhvx9m6hwt2r0000gn/T/cadence-boss-29WEuI'
const fact = (value, code) => { if (!value) throw Object.assign(new Error(code), { code }) }
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'))
const save = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { mode: 0o600 })
const safe = error => /^[A-Za-z0-9_.:-]{1,160}$/.test(error?.code ?? '') ? error.code : 'CUSTOMER_UAR_LAUNCH_UNAVAILABLE'
async function digest(file) {
  const hash = createHash('sha256')
  for await (const chunk of fs.createReadStream(file)) hash.update(chunk)
  return hash.digest('hex')
}

async function stopOwnedGroup(child) {
  if (!child?.pid) return { ownedGroupCreated: false, groupStopped: true }
  const alive = () => { try { process.kill(-child.pid, 0); return true } catch (error) {
    if (error.code === 'ESRCH') return false
    throw error
  } }
  if (alive()) process.kill(-child.pid, 'SIGTERM')
  const deadline = Date.now() + 3000
  while (alive() && Date.now() < deadline) await delay(100)
  if (alive()) process.kill(-child.pid, 'SIGKILL')
  const finalDeadline = Date.now() + 3000
  while (alive() && Date.now() < finalDeadline) await delay(100)
  return { ownedGroupCreated: true, groupStopped: !alive(), pid: child.pid,
    childExitCode: child.exitCode, childSignalCode: child.signalCode,
    method: 'owned-detached-process-group-only', gracefulApplicationShutdownQualified: false }
}

// Root invokes this launcher only after releasing the single packaged-UI slot.
// Existing profile/provider rows remain untouched; no credential staging occurs.
export async function launchAndOperate(installationPath, configurationPath) {
  fact(process.platform === 'darwin' && process.arch === 'arm64', 'CUSTOMER_UAR_MAC_ARM64_REQUIRED')
  const installation = read(installationPath), configuration = read(configurationPath)
  fact(installation.status === 'passed' && installation.version === '2.2.28' &&
    installation.source === expectedBoss && configuration.expectedBossSource === expectedBoss &&
    installation.uarSource === expectedUar && configuration.expectedUarSource === expectedUar,
  'CUSTOMER_UAR_EXACT_RETAINED_INSTALLATION_REQUIRED')
  const profile = fs.realpathSync(configuration.retainedProfile)
  fact(configuration.isolatedProfile === true && profile === fs.realpathSync(retainedProfile) &&
    profile.startsWith(fs.realpathSync(os.tmpdir()) + path.sep) &&
    fs.statSync(profile).uid === process.getuid(), 'CUSTOMER_UAR_RETAINED_PROFILE_OWNER_REQUIRED')
  fact(['UAR_TEAM_EXECUTION_PROFILE_STAGE', 'UAR_WORKFLOW_EXECUTION_PROFILE_STAGE', 'BOSS_C094_PUBLIC_QUALIFICATION']
    .every(name => process.env[name] === undefined), 'CUSTOMER_UAR_NORMAL_EXECUTION_PROFILE_REQUIRED')
  const resources = path.join(installation.app, 'Contents/Resources')
  const nativeRoot = path.join(resources, 'app.asar.unpacked/resources/binaries/darwin-arm64')
  fact(await digest(path.join(resources, 'app.asar')) === installation.appAsarSha256 &&
    await digest(path.join(nativeRoot, 'uar-sidecar')) === installation.sidecarSha256 &&
    read(path.join(nativeRoot, 'payload-manifest.json')).source === expectedUar,
  'CUSTOMER_UAR_RETAINED_INSTALLED_BYTES_CHANGED')
  const active = execFileSync('/bin/ps', ['-axo', 'pid=,command='], { encoding: 'utf8' }).split('\n')
    .some(line => line.includes('Contents/MacOS/') && line.includes(`--user-data-dir=${profile}`))
  fact(!active, 'CUSTOMER_UAR_RETAINED_PROFILE_MUST_BE_CLOSED')
  const directory = path.join(initiative, '.prometheus/cadence/artifacts/customer-corrected-mac-2.2.28',
    'ordinary-uar-owned-launch-' + randomUUID())
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 })
  const launchPath = path.join(directory, 'launch.json'), receiptPath = path.join(directory, 'operation.json')
  const receipt = { schemaVersion: 1, kind: 'owned-retained-profile-uar-lifecycle-launch', status: 'pending',
    startedAt: new Date().toISOString(), sourceRefs: { boss: expectedBoss, uar: expectedUar,
      installedVersion: installation.version, installerSha256: installation.sha256,
      appAsarSha256: installation.appAsarSha256, sidecarSha256: installation.sidecarSha256,
      installationReceiptSha256: await digest(installationPath), launcherSha256: await digest(new URL(import.meta.url)) },
    newCadenceDelivery: false, qualificationLedgerMutated: false, credentialStaging: false,
    providerConfigurationMutated: false, functionalAcceptance: 'pending', installedAcceptance: 'pending' }
  const controller = new AbortController(), abort = () => controller.abort()
  process.once('SIGINT', abort); process.once('SIGTERM', abort)
  const timeout = setTimeout(abort, 900_000)
  let child, launch, connection
  try {
    save(receiptPath, receipt)
    const environment = minimalEnvironment(['USER'])
    receipt.hostUserIdentityPreserved = environment.USER === process.env.USER
    const activePort = path.join(profile, 'DevToolsActivePort')
    fs.rmSync(activePort, { force: true })
    child = spawn(path.join(installation.app, 'Contents/MacOS/The Boss'),
      ['--lang=en-US', '--remote-debugging-address=127.0.0.1', '--remote-debugging-port=0', `--user-data-dir=${profile}`],
      { cwd: repository, env: environment, detached: true, shell: false, stdio: 'ignore' })
    await new Promise((resolve, reject) => {
      child.once('spawn', resolve)
      child.once('error', () => reject(Object.assign(new Error('CUSTOMER_UAR_APP_SPAWN_FAILED'), { code: 'CUSTOMER_UAR_APP_SPAWN_FAILED' })))
    })
    launch = { status: 'starting', keptOpen: true, pid: child.pid, isolatedUserData: profile,
      app: installation.app, startedAt: new Date().toISOString(), sourceRefs: receipt.sourceRefs,
      functionalAcceptance: 'pending', credentialStaging: false }
    save(launchPath, launch)
    const portDeadline = Date.now() + 60_000
    while (!fs.existsSync(activePort) && Date.now() < portDeadline) {
      controller.signal.throwIfAborted()
      fact(child.exitCode === null && child.signalCode === null, 'CUSTOMER_UAR_APP_EXITED')
      await delay(250, undefined, { signal: controller.signal })
    }
    fact(fs.existsSync(activePort), 'CUSTOMER_UAR_PRIVATE_DEBUG_PORT_UNAVAILABLE')
    launch.status = 'success' // Attach/startup contract only; not feature acceptance.
    connection = await attach(launch, controller.signal)
    const rendererDeadline = Date.now() + 60_000
    let ready = false
    while (Date.now() < rendererDeadline) {
      controller.signal.throwIfAborted()
      ready = await connection.evaluate('Boolean(window.api?.ipcApi && window.api?.dataApi)')
      if (ready) break
      await delay(250, undefined, { signal: controller.signal })
    }
    fact(ready, 'CUSTOMER_UAR_PACKAGED_RENDERER_NOT_READY')
    launch.rendererReady = true; save(launchPath, launch)
    connection.close(); connection = undefined
    console.log(JSON.stringify({ stage: 'owned-live-launch-ready', launchPath, pid: child.pid }))
    receipt.lifecycle = await operate(installationPath, launchPath, configurationPath)
    receipt.status = receipt.lifecycle.status
    receipt.functionalAcceptance = receipt.lifecycle.functionalAcceptance
  } catch (error) {
    receipt.status = controller.signal.aborted ? 'cancelled' : 'failed'
    receipt.failureCode = safe(error)
  } finally {
    connection?.close()
    try { receipt.shutdown = await stopOwnedGroup(child) }
    catch (error) { receipt.shutdown = { ownedGroupCreated: Boolean(child?.pid), groupStopped: false, failureCode: safe(error) } }
    if (!receipt.shutdown.groupStopped) { receipt.status = 'failed'; receipt.failureCode = 'CUSTOMER_UAR_OWNED_GROUP_SHUTDOWN_UNCONFIRMED' }
    if (launch) { launch.keptOpen = false; launch.processStopped = receipt.shutdown.groupStopped; save(launchPath, launch) }
    clearTimeout(timeout); process.removeListener('SIGINT', abort); process.removeListener('SIGTERM', abort)
    receipt.finishedAt = new Date().toISOString(); receipt.launchReceipt = launch ? launchPath : null
    save(receiptPath, receipt)
  }
  return { status: receipt.status, receiptPath, lifecycleReceipt: receipt.lifecycle?.receiptPath,
    failureCode: receipt.failureCode, functionalAcceptance: receipt.functionalAcceptance }
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  const args = process.argv.slice(2)
  if (args.length !== 5 || args[0] !== '--execute' || args[1] !== '--installation' || args[3] !== '--configuration') {
    process.stderr.write('Prepared root-owned launch: --execute --installation <verified-2.2.28.json> --configuration <retained-uar.json>.\n')
    process.exitCode = 2
  } else {
    try { const result = await launchAndOperate(args[2], args[4]); console.log(JSON.stringify(result)); process.exitCode = result.status === 'passed' ? 0 : 1 }
    catch (error) { console.error(JSON.stringify({ status: 'failed', preflight: true, failureCode: safe(error) })); process.exitCode = 1 }
  }
}
