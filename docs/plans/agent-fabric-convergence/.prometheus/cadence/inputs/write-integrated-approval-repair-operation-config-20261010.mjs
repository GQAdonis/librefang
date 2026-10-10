// Root-operated after final actual Mac packaging succeeds.
// Usage: node <this-file> --request <new post-build binding-request.json>
// Writes NEW config/binding files only. Never launches, qualifies or mutates Cadence.
import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const args = process.argv.slice(2)
if (args.length !== 2 || args[0] !== '--request')
  throw new Error('Usage: node write-integrated-approval-repair-operation-config-20261010.mjs --request <new binding-request.json>')
const initiative = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'))
const fact = (value, message) => { if (!value) throw new Error(message) }
const fullRevision = value => /^[a-f0-9]{40}$/.test(value ?? '')
const revision = value => typeof value === 'string' ? value : value?.revision
async function hash(file) {
  const digest = createHash('sha256')
  for await (const chunk of fs.createReadStream(file)) digest.update(chunk)
  return digest.digest('hex')
}
function git(boss, args) {
  return execFileSync('git', args, { cwd: boss, encoding: 'utf8', shell: false,
    stdio: ['ignore', 'pipe', 'pipe'] }).trim()
}
function ownedNew(file, root) {
  fact(path.isAbsolute(file) && path.relative(root, file) !== '' &&
    !path.relative(root, file).startsWith('..') && !path.isAbsolute(path.relative(root, file)),
    'New output must belong to its explicit initiative output root')
  fact(!fs.existsSync(file), 'New configuration/binding path already exists; preserve it and choose a new attempt')
}
function durable(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  const fd = fs.openSync(file, 'wx', 0o600)
  try { fs.writeFileSync(fd, JSON.stringify(value, null, 2) + '\n'); fs.fsyncSync(fd) }
  finally { fs.closeSync(fd) }
  const directory = fs.openSync(path.dirname(file), 'r')
  try { fs.fsyncSync(directory) } finally { fs.closeSync(directory) }
}
const requestPath = path.resolve(args[1])
const input = read(requestPath)
fact(input.schemaVersion === 1 && input.buildCompleted === true &&
  typeof input.boss === 'string' && path.isAbsolute(input.boss) &&
  fullRevision(input.builtBossSource) && fullRevision(input.operatedBossSource),
'Explicit final built/operated source and completed actual packaging required')
const boss = fs.realpathSync(input.boss)
const operatedBoss = git(boss, ['rev-parse', 'HEAD'])
fact(operatedBoss === input.operatedBossSource,
  'Current HEAD differs from explicitly requested operation checkout; freeze/reconcile before binding')
const statePath = path.join(initiative, '.prometheus/cadence/state.json')
const state = read(statePath)
const iteration = state.iterations.find(row => row.id === state.activeIterationId)
const candidate = state.candidates.find(row => row.id === iteration?.candidateId)
fact(candidate?.id && candidate.iterationId === iteration.id,
  'Existing canonical active frozen candidate required; writer never creates a candidate')
const frozenSource = repository => candidate.sourceRefs.find(row => row.repository === repository)?.revision
fact(frozenSource(boss) === input.builtBossSource,
  'Active frozen candidate does not name actual built source; use supported Cadence reconciliation first')
const driverDiffPaths = git(boss, ['diff', '--name-only', input.builtBossSource, operatedBoss])
  .split('\n').filter(Boolean)
fact(driverDiffPaths.every(file => file.startsWith('scripts/')),
  'Later checkout changed packaged production inputs; rebuild complete corrected source')
if (operatedBoss !== input.builtBossSource)
  fact(input.allowScriptsOnlyDriverChanges === true && typeof input.reconciliationAuthority === 'string' &&
    input.reconciliationAuthority.length > 0,
  'Explicit scripts-only operation repair authority required; later receipt adoption still requires supported reconcile-frozen')

const readyPath = path.resolve(input.readyInputPath)
const ready = read(readyPath)
fact(ready.runId === state.runId, 'New prepared ready input names another Cadence run')
const entry = ready.featureOperation.entrypoint
fact(entry.args.includes('--config') && entry.args.includes('--output'), 'New ordinary workflow entrypoint required')
const configPath = entry.args[entry.args.indexOf('--config') + 1]
const evidenceRoot = entry.args[entry.args.indexOf('--output') + 1]
fact(entry.args[entry.args.indexOf('--mode') + 1] === 'bossfang',
  'Writer binds only the selected ordinary BossFang workflow')
const bindingPath = path.resolve(input.bindingReceiptPath)
const artifactsRoot = path.join(initiative, '.prometheus/cadence/artifacts')
ownedNew(configPath, artifactsRoot)
ownedNew(evidenceRoot, artifactsRoot)
ownedNew(bindingPath, path.join(initiative, 'receipts'))
fact(entry.buildProducedPaths.includes(configPath) && ready.outputRoots.includes(configPath) &&
  ready.outputRoots.includes(evidenceRoot), 'Fresh configuration/evidence must be declared output roots')
fact(readyPath !== path.join(initiative, 'receipts/integrated-cadence-ready-input-20261010.json'),
  'Historical d9bb ready input may not be reused as fresh repair preparation')

const pinsPath = path.join(boss, 'build/integration-sources.json')
const artifactsPath = path.join(boss, 'build/integration-artifacts.json')
const localPinPath = path.join(boss, 'build/local-uar-source.json')
const pins = read(pinsPath), artifacts = read(artifactsPath), localPin = read(localPinPath)
const uar = pins.sources.uar.revision, bossfang = pins.sources.bossfang.revision
fact(fullRevision(uar) && fullRevision(bossfang) && localPin.revision === uar,
  'Current actual native source pins required')
const uarRef = candidate.sourceRefs.find(row =>
  row.repository.includes('uar-c10-native-stage'))?.revision
fact(uarRef === uar, 'Actual UAR pin differs from active frozen candidate')
for (const [name, expected] of [['uar-sidecar', uar], ['bossfang', bossfang]]) {
  const record = artifacts.tools.find(tool => tool.name === name)?.packages['darwin-arm64']
  fact(revision(record?.source) === expected, 'Actual selected native artifact source differs from source pin')
}
const buildReceiptPath = path.resolve(input.buildReceiptPath)
fact(/^[a-f0-9]{64}$/.test(input.buildReceiptSha256 ?? '') &&
  await hash(buildReceiptPath) === input.buildReceiptSha256,
'Actual completed build receipt and exact digest required; this writer does not certify packaging success')

const app = path.join(boss, 'dist/mac-arm64/The Boss.app')
const resources = path.join(app, 'Contents/Resources')
const payload = path.join(resources, 'app.asar.unpacked/resources/binaries/darwin-arm64')
const plist = path.join(app, 'Contents/Info.plist')
const version = execFileSync('/usr/libexec/PlistBuddy', ['-c', 'Print :CFBundleShortVersionString', plist],
  { encoding: 'utf8', shell: false }).trim()
fact(version === '2.2.31' && read(path.join(boss, 'package.json')).version === version,
  'Actual newly built 2.2.31 application required')
const markerPath = path.join(payload, '.uar-local-payload.json')
const payloadManifestPath = path.join(payload, 'payload-manifest.json')
fact(read(markerPath).source === uar && read(payloadManifestPath).source === uar,
  'Actual packaged UAR source does not match frozen native pin')
const files = {
  appAsarSha256: path.join(resources, 'app.asar'),
  uarSha256: path.join(payload, 'uar-sidecar'),
  bossfangSha256: path.join(payload, 'bossfang')
}
const actualHashes = {}
for (const [name, file] of Object.entries(files)) {
  fact(/^[a-f0-9]{64}$/.test(input.expectedHashes?.[name] ?? ''),
    'Root must provide explicit actual completed application/native hashes')
  actualHashes[name] = await hash(file)
  fact(actualHashes[name] === input.expectedHashes[name], 'Actual package bytes differ from explicit completed-build hashes')
}
const modelContextPath = ready.featureOperation.entrypoint.sourcePaths.find(file =>
  file.endsWith('c14-gpt-6.1-sol-context-declaration-20261008.json'))
const priorReceiptPath = input.priorReceiptPath ??
  path.join(initiative, '.prometheus/cadence/artifacts/bossfang-remaining-boundary-20261006-v10/composite-operation-evidence.json')
fact(modelContextPath && read(modelContextPath).modelId === 'gpt-6.1-sol' &&
  read(priorReceiptPath).kind === 'c14-redacted-composite-failed-boundary-recovery',
  'Existing real model declaration and scoped historical receipt required')
const config = {
  schemaVersion: 1, version, candidateId: candidate.id,
  candidate: { boss: operatedBoss, uar, bossfang, ...actualHashes },
  builtSource: { boss: input.builtBossSource, candidateId: candidate.id,
    contentManifestDigest: candidate.contentManifestDigest },
  operatedSource: { boss: operatedBoss, driverDiffPaths },
  requiresFrozenBuildReconciliation: operatedBoss !== input.builtBossSource,
  gateway: { credentialEnv: 'LITER_LLM_MASTER_KEY', endpoint: 'http://localhost:4000',
    alias: 'gpt-6.1-sol', providerId: 'openai', modelId: 'gpt-6.1-sol' },
  modelContextPath, priorReceiptPath
}
const inputRefs = []
for (const file of [requestPath, readyPath, statePath, pinsPath, artifactsPath, localPinPath,
  buildReceiptPath, modelContextPath, priorReceiptPath])
  inputRefs.push({ path: file, sha256: await hash(file) })
const generatedOutputProvenance = []
for (const file of [plist, markerPath, payloadManifestPath,
  path.join(boss, 'resources/convergence-supported-profile.json')])
  generatedOutputProvenance.push({ path: file, sha256: await hash(file),
    classification: 'Actual generated packaging output; hash is not a commit or operational acceptance' })
const receipt = {
  schemaVersion: 1, kind: 'integrated-post-repair-operation-configuration-binding',
  recordedAt: new Date().toISOString(), runId: state.runId, iterationId: iteration.id,
  candidateId: candidate.id, contentManifestDigest: candidate.contentManifestDigest,
  releaseVersion: version, configuration: { path: configPath }, evidenceRoot,
  candidate: config.candidate, builtSource: config.builtSource, operatedSource: config.operatedSource,
  requiresFrozenBuildReconciliation: config.requiresFrozenBuildReconciliation,
  reconciliationAuthority: input.reconciliationAuthority ?? null,
  app, inputRefs, generatedOutputProvenance, buildReceipt: {
    path: buildReceiptPath, sha256: input.buildReceiptSha256,
    assertion: 'Root supplied completed actual packaging receipt; writer only binds its retained bytes'
  },
  operationRun: false, inferenceRun: false, authenticationProbeRun: false,
  candidateAcceptance: 'pending', publicationScope: {
    required: ['darwin-arm64', 'win32-x64'], deferred: ['darwin-x64', 'win32-arm64'], linux: 'excluded'
  },
  limitations: [
    'No launch, signing verification, native binary execution, feature qualification or installed acceptance is performed.',
    'candidate.boss is the current driver checkout. builtSource.boss remains the actual frozen build source.',
    'Scripts-only checkout differences require existing supported reconcile-frozen before receipt adoption; writer never performs it.',
    'Generated resources are explicitly retained build outputs, never silently treated as clean committed source.',
    'Prior operation receipts remain historical applicability context, never certification of this repaired candidate.'
  ]
}
durable(configPath, config)
receipt.configuration.sha256 = await hash(configPath)
durable(bindingPath, receipt)
process.stdout.write(JSON.stringify({ status: 'configuration-bound', candidateId: candidate.id,
  builtSource: input.builtBossSource, operatedSource: operatedBoss, configPath, bindingPath,
  evidenceRoot, requiresFrozenBuildReconciliation: config.requiresFrozenBuildReconciliation,
  candidateAcceptance: 'pending' }) + '\n')
