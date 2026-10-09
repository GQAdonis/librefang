import fs from 'node:fs'
import path from 'node:path'
import { createHash, randomUUID } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'
import { launchBoss } from '/Users/gqadonis/.codex/skills/delivery-cadence/scripts/boss-launch.mjs'
import { gatewayEnvironment } from '/Users/gqadonis/Projects/prometheus/worktrees/afc-c16-team-guidance/scripts/reusable-team-operation/io.mjs'

const [scenarioPath, operationId, configurationPath, candidateInstallationReceipt] = process.argv.slice(2)
const root = process.cwd()
const repository = '/Users/gqadonis/Projects/prometheus/worktrees/afc-c16-team-guidance'
if (!candidateInstallationReceipt) throw new Error('Explicit repaired-candidate installation receipt required')
const installationPath = path.resolve(candidateInstallationReceipt)
const installation = JSON.parse(fs.readFileSync(installationPath, 'utf8'))
if (installation.version === '2.2.25') throw new Error('Repaired candidate cannot reuse historical public 2.2.25 provenance')
const sha = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex')
const resources = path.join(installation.app, 'Contents/Resources')
const native = path.join(resources, 'app.asar.unpacked/resources/binaries/darwin-arm64/uar-sidecar')
if (installation.status !== 'passed' || sha(path.join(resources, 'app.asar')) !== installation.appAsarSha256 ||
    sha(native) !== installation.sidecarSha256) throw new Error('Public installed package differs from its installation receipt')
if (!scenarioPath || !/^[a-z0-9-]+$/.test(operationId ?? '')) throw new Error('Explicit scenario and operation ID required')
Object.assign(process.env, JSON.parse(fs.readFileSync(path.join(root, '.prometheus/cadence/inputs/c15-operation-environment-20261006.json'), 'utf8')))
const directory = path.join(root, '.prometheus/cadence/artifacts', 'customer-corrected-mac-' + installation.version, operationId + '-' + randomUUID())
fs.mkdirSync(directory, { recursive: true })
const workspaceDirectory = path.join(directory, 'workspace')
fs.mkdirSync(workspaceDirectory)
const marker = 'CUSTOMER-' + randomUUID()
const readme = '# Isolated customer operation\n\nDelivery marker: ' + marker + '\n\nUser need: an accessible review workflow.\n'
fs.writeFileSync(path.join(workspaceDirectory, 'README.md'), readme, { flag: 'wx' })
execFileSync('git', ['init', '--quiet', workspaceDirectory], { stdio: 'ignore' })
const sourceRefs = { boss: installation.source, uar: JSON.parse(fs.readFileSync(path.join(path.dirname(native), 'payload-manifest.json'), 'utf8')).source,
  appAsarSha256: installation.appAsarSha256, sidecarSha256: installation.sidecarSha256,
  installerSha256: installation.sha256, installedVersion: installation.version,
  operationDriverRevision: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repository, encoding: 'utf8' }).trim(),
  selectedScenarioSha256: sha(scenarioPath), installationReceiptSha256: sha(installationPath) }
const selectedOperation = await import(pathToFileURL(path.resolve(scenarioPath)).href)
const preparationStartedAt = new Date().toISOString()
const prepared = selectedOperation.preparePublicOperation ? await selectedOperation.preparePublicOperation({ directory, installation }) : {}
const preparationFinishedAt = new Date().toISOString()
const configuration = { ...(prepared.configuration ?? {}), ...(configurationPath ? JSON.parse(fs.readFileSync(configurationPath, 'utf8')) : {}),
  sourceRefs, repository, gateway: gatewayEnvironment(), workspaceDirectory, marker,
  workspaceSha256: sha(path.join(workspaceDirectory, 'README.md')), evidence: path.join(directory, 'evidence.json') }
const wrapper = path.join(directory, 'scenario.mjs')
fs.writeFileSync(wrapper, `import * as operation from ${JSON.stringify(pathToFileURL(path.resolve(scenarioPath)).href)}\nexport default context => (operation.scenario ?? operation.default)(context, ${JSON.stringify(configuration)})\n`, { flag: 'wx', mode: 0o600 })
const startedAt = new Date().toISOString()
const priorEnvironment = Object.fromEntries(Object.keys(prepared.environment ?? {}).map(key => [key, process.env[key]]))
Object.assign(process.env, prepared.environment ?? {})
let launch
try {
  launch = await launchBoss({ repository, app: installation.app, scenario: wrapper,
    'require-scenario': true, 'timeout-ms': 1200000, receipt: path.join(directory, 'launch.json') })
} finally {
  for (const [key, value] of Object.entries(priorEnvironment)) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
}
const observed = fs.existsSync(configuration.evidence) ? JSON.parse(fs.readFileSync(configuration.evidence, 'utf8')) : null
const receipt = { schemaVersion: 1, kind: 'corrected-installed-customer-operation', operationId,
  startedAt, finishedAt: new Date().toISOString(), preparationStartedAt, preparationFinishedAt, sourceRefs, installationReceipt: installationPath,
  launchReceipt: launch.receiptFile, evidence: observed ? configuration.evidence : null,
  evidenceSha256: observed ? sha(configuration.evidence) : null,
  status: launch.status === 'success' && observed?.complete === true ? 'passed' : 'failed',
  functionalAcceptance: launch.functionalAcceptance, failureCode: observed?.failureCode,
  failureStage: observed?.failureStage, failure: observed?.failure, checks: observed?.checks ?? [],
  acceptance: 'operator-acceptance-pending', newCadenceDelivery: false }
const receiptPath = path.join(directory, 'operation.json')
fs.writeFileSync(receiptPath, JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx', mode: 0o600 })
console.log(JSON.stringify({ status: receipt.status, receiptPath, failureCode: receipt.failureCode,
  failureStage: receipt.failureStage, checks: receipt.checks }))
process.exitCode = receipt.status === 'passed' ? 0 : 1
