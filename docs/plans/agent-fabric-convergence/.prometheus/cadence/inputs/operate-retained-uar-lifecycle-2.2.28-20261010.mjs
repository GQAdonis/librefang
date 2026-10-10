import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { createHash, randomUUID } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'
import { attach } from '/Users/gqadonis/Projects/prometheus/worktrees/afc-c16-team-guidance/scripts/github-feedback-operation/client.mjs'
import scenario from './customer-uar-inference-lifecycle-2.2.28-20261010.mjs'

const initiative = '/Users/gqadonis/Projects/prometheus/worktrees/agent-fabric-c06/librefang/docs/plans/agent-fabric-convergence'
const repository = '/Users/gqadonis/Projects/prometheus/worktrees/afc-c16-team-guidance'
const fact = (value, code) => { if (!value) throw Object.assign(new Error(code), { code }) }
const sha = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex')
const safe = error => /^[A-Za-z0-9_.:-]{1,160}$/.test(error?.code ?? '') ? error.code : 'CUSTOMER_UAR_LIFECYCLE_UNAVAILABLE'
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'))
const save = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { mode: 0o600 })

// Attach only; the root owns launch, shutdown, UI admission and the actual build.
export async function operate(installationPath, launchPath, configurationPath) {
  const configuration = read(configurationPath)
  const installation = read(installationPath)
  const launch = read(launchPath)
  fact(process.platform === 'darwin' && process.arch === 'arm64', 'CUSTOMER_UAR_MAC_ARM64_REQUIRED')
  fact(installation.status === 'passed' && installation.version === '2.2.28' &&
    /^[a-f0-9]{40}$/.test(configuration.expectedBossSource ?? '') &&
    installation.source === configuration.expectedBossSource &&
    /^[a-f0-9]{40}$/.test(configuration.expectedUarSource ?? ''), 'CUSTOMER_UAR_EXACT_INSTALLATION_REQUIRED')
  const resources = path.join(installation.app, 'Contents/Resources')
  const nativeRoot = path.join(resources, 'app.asar.unpacked/resources/binaries/darwin-arm64')
  const native = read(path.join(nativeRoot, 'payload-manifest.json'))
  fact(sha(path.join(resources, 'app.asar')) === installation.appAsarSha256 &&
    sha(path.join(nativeRoot, 'uar-sidecar')) === installation.sidecarSha256 &&
    native.source === configuration.expectedUarSource, 'CUSTOMER_UAR_INSTALLED_SOURCE_OR_BYTES_CHANGED')
  const profile = fs.realpathSync(launch.isolatedUserData)
  const temporaryRoot = fs.realpathSync(os.tmpdir())
  fact(profile.startsWith(temporaryRoot + path.sep) && path.basename(profile).startsWith('cadence-boss-') &&
    configuration.isolatedProfile === true && profile === fs.realpathSync(configuration.retainedProfile),
    'CUSTOMER_UAR_OWNED_DISPOSABLE_PROFILE_REQUIRED')
  fact(launch.status === 'success' && launch.keptOpen === true && Number.isInteger(launch.pid),
    'CUSTOMER_UAR_ROOT_OWNED_LIVE_LAUNCH_REQUIRED')
  const command = execFileSync('/bin/ps', ['-p', String(launch.pid), '-o', 'command='], { encoding: 'utf8' })
  fact(command.includes(path.join(installation.app, 'Contents/MacOS/The Boss')) &&
    command.includes(`--user-data-dir=${profile}`), 'CUSTOMER_UAR_LAUNCH_PROFILE_OR_EXECUTABLE_CHANGED')
  fact(['UAR_TEAM_EXECUTION_PROFILE_STAGE', 'UAR_WORKFLOW_EXECUTION_PROFILE_STAGE', 'BOSS_C094_PUBLIC_QUALIFICATION']
    .every(name => process.env[name] === undefined), 'CUSTOMER_UAR_NORMAL_EXECUTION_PROFILE_REQUIRED')
  const directory = path.join(initiative, '.prometheus/cadence/artifacts/customer-corrected-mac-2.2.28',
    'ordinary-uar-lifecycle-' + randomUUID())
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 })
  const evidencePath = path.join(directory, 'evidence.json')
  const receiptPath = path.join(directory, 'operation.json')
  const sourceRefs = { boss: installation.source, uar: native.source, installedVersion: installation.version,
    installerSha256: installation.sha256, appAsarSha256: installation.appAsarSha256,
    sidecarSha256: installation.sidecarSha256, installationReceiptSha256: sha(installationPath),
    scenarioSha256: sha(new URL('./customer-uar-inference-lifecycle-2.2.28-20261010.mjs', import.meta.url)),
    operationDriverSha256: sha(new URL(import.meta.url)),
    operationDriverRevision: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repository, encoding: 'utf8' }).trim() }
  const operation = { schemaVersion: 1, kind: 'retained-normal-work-uar-lifecycle', status: 'pending',
    startedAt: new Date().toISOString(), sourceRefs, pid: launch.pid, isolatedProfile: profile,
    launchReceiptSha256: sha(launchPath), configurationSha256: sha(configurationPath),
    functionalAcceptance: 'pending', operatorAcceptance: 'pending', newCadenceDelivery: false,
    qualificationLedgerMutated: false, launched: false, applicationShutdownAttempted: false,
    credentialValuesRecorded: false, providerConfigurationMutated: false, repeatedCodexClaude: false }
  const controller = new AbortController()
  const abort = () => controller.abort()
  process.once('SIGINT', abort); process.once('SIGTERM', abort)
  const timer = setTimeout(abort, 600_000)
  let connection
  try {
    save(receiptPath, operation)
    connection = await attach(launch, controller.signal)
    const evidence = await scenario({ evaluate: connection.evaluate, targets: connection.targets, signal: controller.signal },
      { ...configuration, isolatedProfile: true, sourceRefs, evidence: evidencePath })
    operation.status = evidence.passed ? 'passed' : 'failed'
    operation.functionalAcceptance = operation.status
    operation.results = evidence.results
    if (evidence.passed) operation.observedBehavior = evidence.observedBehavior
    else { operation.failureCode = evidence.failureCode; operation.failureStage = evidence.failureStage }
  } catch (error) {
    operation.status = controller.signal.aborted ? 'cancelled' : 'failed'
    operation.failureCode = safe(error)
  } finally {
    connection?.close(); clearTimeout(timer)
    process.removeListener('SIGINT', abort); process.removeListener('SIGTERM', abort)
    operation.finishedAt = new Date().toISOString()
    if (fs.existsSync(evidencePath)) { operation.evidence = evidencePath; operation.evidenceSha256 = sha(evidencePath) }
    save(receiptPath, operation)
  }
  return { status: operation.status, receiptPath, failureCode: operation.failureCode,
    functionalAcceptance: operation.functionalAcceptance }
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  const args = process.argv.slice(2)
  if (args.length !== 7 || args[0] !== '--execute' || args[1] !== '--installation' ||
    args[3] !== '--launch' || args[5] !== '--configuration') {
    process.stderr.write('Prepared attach-only operation: --execute --installation <verified-2.2.28.json> --launch <root-owned-live-launch.json> --configuration <retained-uar.json>.\n')
    process.exitCode = 2
  } else {
    try { const result = await operate(args[2], args[4], args[6]); console.log(JSON.stringify(result)); process.exitCode = result.status === 'passed' ? 0 : 1 }
    catch (error) { process.stderr.write(JSON.stringify({ status: 'failed', preflight: true, failureCode: safe(error) }) + '\n'); process.exitCode = 1 }
  }
}
