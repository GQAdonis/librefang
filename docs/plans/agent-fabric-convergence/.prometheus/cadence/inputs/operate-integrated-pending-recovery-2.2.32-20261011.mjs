import fs from 'node:fs'
import path from 'node:path'
import { createHash, randomUUID } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { candidatePackage, sha256, requireFact } from './integrated-representation-candidate-contract-20261010.mjs'

const repository = '/Users/gqadonis/Projects/prometheus/worktrees/afc-c16-team-guidance'
const inputs = path.dirname(fileURLToPath(import.meta.url))
const digest = value => createHash('sha256').update(value).digest('hex')
const save = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { mode: 0o600 })
const failureCode = error => /^[A-Za-z0-9_.:-]{1,160}$/.test(error?.message ?? '')
  ? error.message : 'PENDING_RECOVERY_INTEGRATED_OPERATION_UNCONFIRMED'

/** Operator-free interruption of one fresh pending read; no approval or turn replay. */
export async function operate(args = process.argv.slice(2)) {
  const options = {}
  for (let index = 0; index < args.length; index++) {
    const name = args[index]
    requireFact(['--installation-receipt', '--config', '--output', '--launcher'].includes(name) &&
      args[index + 1] && !args[index + 1].startsWith('--') && options[name.slice(2)] === undefined,
      'PENDING_RECOVERY_INTEGRATED_ARGUMENTS')
    options[name.slice(2)] = path.resolve(args[++index])
  }
  requireFact(Object.keys(options).length === 4, 'PENDING_RECOVERY_INTEGRATED_EXPLICIT_INPUTS_REQUIRED')
  const configBytes = fs.readFileSync(options.config)
  const input = JSON.parse(configBytes)
  requireFact(input.schemaVersion === 1 && input.candidate?.version === '2.2.32' && !input.resumeState,
    'PENDING_RECOVERY_INTEGRATED_FRESH_CANDIDATE_REQUIRED')
  const installation = JSON.parse(fs.readFileSync(options['installation-receipt'], 'utf8'))
  const packaged = candidatePackage(installation, input.candidate)
  const gateway = { credentialEnv: input.gateway?.credentialEnv ?? 'LITER_LLM_MASTER_KEY',
    endpoint: input.gateway?.endpoint ?? 'http://localhost:4000', alias: 'gpt-6.1-sol', providerId: 'openai', modelId: 'gpt-6.1-sol' }
  requireFact(gateway.credentialEnv === 'LITER_LLM_MASTER_KEY' && gateway.endpoint === 'http://localhost:4000' &&
    process.env[gateway.credentialEnv]?.trim(), 'PENDING_RECOVERY_INTEGRATED_EXISTING_GATEWAY_REQUIRED')
  requireFact(fs.realpathSync(options.launcher) === fs.realpathSync(path.join(inputs, 'boss-launch-main-window-20261010.mjs')),
    'PENDING_RECOVERY_INTEGRATED_OWNED_LAUNCHER_REQUIRED')
  fs.mkdirSync(options.output, { recursive: true })
  const directory = path.join(fs.realpathSync(options.output), 'integrated-pending-recovery-2.2.32-' + randomUUID())
  fs.mkdirSync(directory, { mode: 0o700 })
  const workspaceDirectory = path.join(directory, 'workspace')
  fs.mkdirSync(workspaceDirectory, { mode: 0o700 })
  const marker = 'INTEGRATED_PENDING_RECOVERY_' + randomUUID()
  const readme = '# Disposable synthetic pending recovery\n\n' + marker + '\n'
  fs.writeFileSync(path.join(workspaceDirectory, 'README.md'), readme, { flag: 'wx', mode: 0o600 })
  execFileSync('git', ['init', '--quiet', workspaceDirectory], { stdio: 'ignore' })
  const scenarioPath = path.join(inputs, 'customer-pending-approval-recovery-integrated-2.2.32-20261011.mjs')
  const preparationPath = path.join(inputs, 'customer-executive-representation-integrated-20261010.mjs')
  const priorScenarioPath = path.join(inputs, 'customer-pending-approval-recovery-2.2.30-20261010.mjs')
  const evidencePath = path.join(directory, 'evidence.json')
  const observationPath = path.join(directory, 'pending-observation.json')
  const sourceRefs = { boss: installation.source, uar: packaged.native.source, mini: packaged.skills.revision,
    full: packaged.skills.sourceIntent['skill-pack'].revision, installedVersion: installation.version,
    appAsarSha256: installation.appAsarSha256, sidecarSha256: installation.sidecarSha256,
    installerSha256: installation.sha256, installationReceiptSha256: sha256(options['installation-receipt']),
    configurationSha256: digest(configBytes), selectedScenarioSha256: sha256(scenarioPath),
    preparationScenarioSha256: sha256(preparationPath), priorRecoveryScenarioSha256: sha256(priorScenarioPath),
    operationDriverRevision: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repository, encoding: 'utf8' }).trim(),
    operationDriverSha256: sha256(new URL(import.meta.url)),
    candidateContractSha256: sha256(path.join(inputs, 'integrated-representation-candidate-contract-20261010.mjs')),
    launcherSha256: sha256(options.launcher) }
  const configuration = { candidate: input.candidate, expectedBossSource: input.candidate.boss, sourceRefs,
    repository, gateway, workspaceDirectory, marker, workspaceSha256: digest(readme), evidence: evidencePath,
    holdForOperator: false }
  const wrapper = path.join(directory, 'scenario.mjs')
  fs.writeFileSync(wrapper, `import fs from 'node:fs'\nimport run from ${JSON.stringify(pathToFileURL(scenarioPath).href)}\n` +
    `export default context=>run({...context,onObservation:async observation=>{\n` +
    `fs.writeFileSync(${JSON.stringify(observationPath)},JSON.stringify(observation,null,2)+'\\n',{mode:0o600});\n` +
    `process.stdout.write(JSON.stringify({stage:'pending-before-owned-runtime-restart',observationPath:${JSON.stringify(observationPath)}})+'\\n');\n` +
    `}},${JSON.stringify(configuration)})\n`, { flag: 'wx', mode: 0o600 })
  process.stdout.write(JSON.stringify({ stage: 'prepared-owned-pending-recovery', directory, evidencePath, observationPath }) + '\n')
  const { launchBoss } = await import(pathToFileURL(options.launcher).href)
  requireFact(typeof launchBoss === 'function', 'PENDING_RECOVERY_INTEGRATED_MAINTAINED_LAUNCHER_REQUIRED')
  const startedAt = new Date().toISOString()
  const launch = await launchBoss({ repository, app: installation.app, scenario: wrapper,
    'require-scenario': true, 'timeout-ms': 600000, receipt: path.join(directory, 'launch.json') })
  const observed = fs.existsSync(evidencePath) ? JSON.parse(fs.readFileSync(evidencePath, 'utf8')) : null
  const complete = launch.status === 'success' && launch.functionalAcceptance === 'scenario-confirmed' &&
    observed?.complete === true && observed.passed === true && !observed.cleanupPending && !observed.nativeSettingsCleanupPending
  const operation = { schemaVersion: 1, kind: 'integrated-installed-pending-approval-runtime-recovery',
    status: complete ? 'passed' : observed?.status === 'pending-qualification' ? 'pending-qualification' : 'failed',
    complete, startedAt, finishedAt: new Date().toISOString(), sourceRefs,
    installationReceipt: options['installation-receipt'], launchReceipt: launch.receiptFile,
    evidence: observed ? evidencePath : null, evidenceSha256: observed ? sha256(evidencePath) : null,
    checks: observed?.checks ?? [], before: observed?.before, restart: observed?.restart, after: observed?.after,
    interruptionOutcome: observed?.interruptionOutcome, afterRestartHistory: observed?.afterRestartHistory,
    failureCode: observed?.failureCode, failureStage: observed?.failureStage,
    cleanupPending: observed?.cleanupPending === true, nativeSettingsCleanupPending: observed?.nativeSettingsCleanupPending === true,
    decisionSubmitted: false, retrySubmitted: false, replaySubmitted: false, humanRepresentationQualified: false,
    acceptance: 'operator-acceptance-pending', newCadenceDelivery: false,
    limitations: observed?.qualificationLimitations ?? [] }
  const receiptFile = path.join(directory, 'operation.json')
  save(receiptFile, operation)
  return { ...operation, receiptFile }
}
if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  try {
    const result = await operate()
    process.stdout.write(JSON.stringify({ status: result.status, receiptFile: result.receiptFile,
      failureCode: result.failureCode, failureStage: result.failureStage }) + '\n')
    process.exitCode = result.complete ? 0 : 1
  } catch (error) {
    process.stderr.write(JSON.stringify({ status: 'blocked', failureCode: failureCode(error) }) + '\n')
    process.exitCode = 1
  }
}
