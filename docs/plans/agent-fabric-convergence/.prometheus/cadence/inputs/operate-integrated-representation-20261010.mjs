import fs from 'node:fs'
import path from 'node:path'
import { createHash, randomUUID } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'
import { candidatePackage, sha256, requireFact } from './integrated-representation-candidate-contract-20261010.mjs'

const repository = '/Users/gqadonis/Projects/prometheus/worktrees/afc-c16-team-guidance'
const inputs = path.dirname(new URL(import.meta.url).pathname)
const digest = value => createHash('sha256').update(value).digest('hex')
const save = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { mode: 0o600 })
const failureCode = error => /^[A-Za-z0-9_.:-]{1,160}$/.test(error?.message ?? '')
  ? error.message : 'C17_INTEGRATED_OPERATION_UNCONFIRMED'

export async function operate(args = process.argv.slice(2)) {
  const options = {}
  for (let index = 0; index < args.length; index++) {
    const name = args[index]
    requireFact(['--installation-receipt', '--config', '--output', '--launcher'].includes(name) &&
      args[index + 1] && !args[index + 1].startsWith('--') && options[name.slice(2)] === undefined,
      'C17_INTEGRATED_ARGUMENTS')
    options[name.slice(2)] = path.resolve(args[++index])
  }
  requireFact(Object.keys(options).length === 4, 'C17_INTEGRATED_EXPLICIT_INPUTS_REQUIRED')
  const configBytes = fs.readFileSync(options.config)
  const input = JSON.parse(configBytes)
  requireFact(input.schemaVersion === 1 && input.holdForOperator === true && !input.resumeState,
    'C17_INTEGRATED_FRESH_HELD_CHALLENGE_REQUIRED')
  const installation = JSON.parse(fs.readFileSync(options['installation-receipt'], 'utf8'))
  const packaged = candidatePackage(installation, input.candidate)
  const historicalPath = path.join(inputs, '../../..', 'receipts/customer-public-representation-pending-2.2.30-20261010.json')
  const historical = JSON.parse(fs.readFileSync(historicalPath, 'utf8'))
  requireFact(historical.complete === false && historical.operatorDecisionSubmitted === false &&
    historical.approval.approvalId === '26dac146-27c0-4243-9674-4852e397309c' &&
    Date.parse(historical.approval.deadline) < Date.now(), 'C17_HISTORICAL_EXPIRED_CHALLENGE_NOT_PRESERVED')
  const gateway = { credentialEnv: input.gateway?.credentialEnv ?? 'LITER_LLM_MASTER_KEY',
    endpoint: input.gateway?.endpoint ?? 'http://localhost:4000', alias: 'gpt-6.1-sol', providerId: 'openai', modelId: 'gpt-6.1-sol' }
  requireFact(/^[A-Za-z_][A-Za-z0-9_]*$/.test(gateway.credentialEnv) && process.env[gateway.credentialEnv]?.trim(),
    'C17_INTEGRATED_EXISTING_GATEWAY_CREDENTIAL_REQUIRED')
  const gatewayUrl = new URL(gateway.endpoint)
  requireFact(['http:', 'https:'].includes(gatewayUrl.protocol) && !gatewayUrl.username && !gatewayUrl.password &&
    !gatewayUrl.search && !gatewayUrl.hash && !gatewayUrl.pathname.endsWith('/v1'),
    'C17_INTEGRATED_LITER_ROOT_ENDPOINT_REQUIRED')
  fs.mkdirSync(options.output, { recursive: true })
  const directory = path.join(fs.realpathSync(options.output), 'integrated-synthetic-representation-' + randomUUID())
  fs.mkdirSync(directory, { mode: 0o700 })
  const workspaceDirectory = path.join(directory, 'workspace')
  fs.mkdirSync(workspaceDirectory, { mode: 0o700 })
  const marker = 'INTEGRATED_REPRESENTATION_' + randomUUID()
  const readme = '# Disposable synthetic representation\n\n' + marker + '\n'
  fs.writeFileSync(path.join(workspaceDirectory, 'README.md'), readme, { flag: 'wx', mode: 0o600 })
  execFileSync('git', ['init', '--quiet', workspaceDirectory], { stdio: 'ignore' })
  const scenarioPath = path.join(inputs, 'customer-executive-representation-integrated-20261010.mjs')
  const evidencePath = path.join(directory, 'evidence.json')
  const observationPath = path.join(directory, 'approval-observation.json')
  const approvalReceiptPath = path.join(directory, 'representation-human-approval.json')
  const sourceRefs = { boss: installation.source, uar: packaged.native.source, mini: packaged.skills.revision,
    full: packaged.skills.sourceIntent['skill-pack'].revision, installedVersion: installation.version,
    appAsarSha256: installation.appAsarSha256, sidecarSha256: installation.sidecarSha256,
    installerSha256: installation.sha256, installationReceiptSha256: sha256(options['installation-receipt']),
    configurationSha256: digest(configBytes), selectedScenarioSha256: sha256(scenarioPath),
    operationDriverRevision: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repository, encoding: 'utf8' }).trim(),
    operationDriverSha256: sha256(new URL(import.meta.url)),
    candidateContractSha256: sha256(path.join(inputs, 'integrated-representation-candidate-contract-20261010.mjs')),
    historicalPendingReceiptSha256: sha256(historicalPath), launcherSha256: sha256(options.launcher) }
  const configuration = { candidate: input.candidate, expectedBossSource: input.candidate.boss, sourceRefs,
    repository, gateway, workspaceDirectory, marker, workspaceSha256: digest(readme), evidence: evidencePath,
    holdForOperator: true, operatorWaitMs: Math.min(600000, Math.max(1000, input.operatorWaitMs ?? 600000)),
    approvalReceiptPath }
  const wrapper = path.join(directory, 'scenario.mjs')
  fs.writeFileSync(wrapper, `import fs from 'node:fs'\nimport run from ${JSON.stringify(pathToFileURL(scenarioPath).href)}\n` +
    `export default context=>run({...context,onObservation:async observation=>{\n` +
    `const info=await context.evaluate("window.api.ipcApi.request('app.get_info',{})");\n` +
    `fs.writeFileSync(${JSON.stringify(observationPath)},JSON.stringify({...observation,owningProfilePath:info.data?.appDataPath},null,2)+'\\n',{mode:0o600});\n` +
    `process.stdout.write(JSON.stringify({status:'pending-human-approval',observationPath:${JSON.stringify(observationPath)}})+'\\n');\n` +
    `}},${JSON.stringify(configuration)})\n`, { flag: 'wx', mode: 0o600 })
  process.stdout.write(JSON.stringify({ stage: 'prepared-owned-operation', directory, evidencePath, observationPath, approvalReceiptPath }) + '\n')
  const { launchBoss } = await import(pathToFileURL(options.launcher).href)
  requireFact(typeof launchBoss === 'function', 'C17_INTEGRATED_MAINTAINED_LAUNCHER_REQUIRED')
  const startedAt = new Date().toISOString()
  const launch = await launchBoss({ repository, app: installation.app, scenario: wrapper,
    'require-scenario': true, 'timeout-ms': 1200000, receipt: path.join(directory, 'launch.json') })
  const observed = fs.existsSync(evidencePath) ? JSON.parse(fs.readFileSync(evidencePath, 'utf8')) : null
  const complete = launch.status === 'success' && launch.functionalAcceptance === 'scenario-confirmed' &&
    observed?.complete === true && !observed.cleanupPending && !observed.nativeSettingsCleanupPending
  const operation = { schemaVersion: 1, kind: 'integrated-installed-synthetic-representation-operation',
    status: complete ? 'passed' : observed?.status === 'pending-human-approval' ? 'pending-human-approval' : 'failed',
    complete, startedAt, finishedAt: new Date().toISOString(), sourceRefs,
    installationReceipt: options['installation-receipt'], launchReceipt: launch.receiptFile,
    evidence: observed ? evidencePath : null, evidenceSha256: observed ? sha256(evidencePath) : null,
    checks: observed?.checks ?? [], failureCode: observed?.failureCode, failureStage: observed?.failureStage,
    cleanupPending: observed?.cleanupPending === true, nativeSettingsCleanupPending: observed?.nativeSettingsCleanupPending === true,
    historicalChallenge: { receipt: historicalPath, sha256: sourceRefs.historicalPendingReceiptSha256,
      approvalId: historical.approval.approvalId, deadline: historical.approval.deadline,
      operatorDecisionSubmitted: false, resumed: false, replayed: false, representedReadQualified: false },
    actualOperatorDecisionRequired: true, approvalsCreatedByPreparation: false,
    acceptance: 'operator-acceptance-pending', newCadenceDelivery: false,
    limitations: ['Fresh exact native challenge only; receipt does not grant authority.',
      'Maintained launcher closes its own profile on failed/pending completion; late resumption is not supported by this runner.',
      'Synthetic read-only scope grants no real person or organizational authority; process restart persistence and Windows are separate gates.'] }
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
