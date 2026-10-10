import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

// Parent invokes only after the actual selected Mac build exits successfully.
// This writes package-byte binding, never launches a package or qualifies it.
const initiative = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const boss = '/Users/gqadonis/Projects/prometheus/worktrees/afc-c16-team-guidance'
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'))
const digest = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex')
const fact = (value, message) => { if (!value) throw new Error(message) }
const revision = value => typeof value === 'string' ? value : value?.revision
const statePath = path.join(initiative, '.prometheus/cadence/state.json')
const state = read(statePath)
const iteration = state.iterations.find(row => row.id === state.activeIterationId)
const candidate = state.candidates.find(row => row.id === iteration?.candidateId)
fact(candidate?.id && candidate.iterationId === iteration.id, 'Actual active frozen candidate required')
const source = repository => candidate.sourceRefs.find(row => row.repository === repository)?.revision
const desktopRevision = source(boss)
const operatedRevision = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: boss, encoding: 'utf8' }).trim()
fact(/^[a-f0-9]{40}$/.test(desktopRevision ?? '') && /^[a-f0-9]{40}$/.test(operatedRevision),
  'Actual frozen and operated source revisions required')
const driverDiffPaths = execFileSync('git', ['diff', '--name-only', desktopRevision, operatedRevision],
  { cwd: boss, encoding: 'utf8' }).trim().split('\n').filter(Boolean)
fact(driverDiffPaths.every(file => file.startsWith('scripts/')),
  'Later checkout may change only external scripts under the supported frozen-build reconciliation')
const readyPath = path.join(initiative, 'receipts/integrated-cadence-ready-input-20261010.json')
const ready = read(readyPath)
fact(state.runId === ready.runId, 'Prepared entrypoint belongs to another run')
const args = ready.featureOperation.entrypoint.args
const configPath = args[args.indexOf('--config') + 1]
fact(args.includes('--config') && path.isAbsolute(configPath) &&
  ready.featureOperation.entrypoint.buildProducedPaths.includes(configPath), 'Actual declared config output required')
const pinsPath = path.join(boss, 'build/integration-sources.json')
const artifactsPath = path.join(boss, 'build/integration-artifacts.json')
const localPinPath = path.join(boss, 'build/local-uar-source.json')
const pins = read(pinsPath), artifacts = read(artifactsPath), localPin = read(localPinPath)
const uar = pins.sources.uar.revision, bossfang = pins.sources.bossfang.revision
fact(uar === source('/Users/gqadonis/Projects/prometheus/worktrees/uar-c10-native-stage-6b2ad902') &&
  uar === '25c542c77f41abcec605dd8ae372b04f68a1801e' && localPin.revision === uar &&
  /^[a-f0-9]{40}$/.test(bossfang ?? ''), 'Actual frozen native source pins required')
for (const [name, expected] of [['uar-sidecar', uar], ['bossfang', bossfang]]) {
  const record = artifacts.tools.find(tool => tool.name === name)?.packages['darwin-arm64']
  fact(revision(record?.source) === expected, 'Native artifact source record differs from selected source')
}
const app = path.join(boss, 'dist/mac-arm64/The Boss.app')
const version = execFileSync('/usr/libexec/PlistBuddy', ['-c', 'Print :CFBundleShortVersionString',
  path.join(app, 'Contents/Info.plist')], { encoding: 'utf8' }).trim()
fact(version === '2.2.31' && read(path.join(boss, 'package.json')).version === version,
  'Actual 2.2.31 app required; stale 2.2.30 is never hashed as the new candidate')
const resources = path.join(app, 'Contents/Resources')
const payload = path.join(resources, 'app.asar.unpacked/resources/binaries/darwin-arm64')
fact(read(path.join(payload, '.uar-local-payload.json')).source === uar &&
  read(path.join(payload, 'payload-manifest.json')).source === uar,
  'Actual packaged UAR source differs from frozen source')
const modelContextPath = path.join(initiative, '.prometheus/cadence/inputs/c14-gpt-6.1-sol-context-declaration-20261008.json')
const priorReceiptPath = path.join(initiative, '.prometheus/cadence/artifacts/bossfang-remaining-boundary-20261006-v10/composite-operation-evidence.json')
fact(read(modelContextPath).modelId === 'gpt-6.1-sol' &&
  read(priorReceiptPath).kind === 'c14-redacted-composite-failed-boundary-recovery',
  'Existing actual model declaration and original scoped receipt required')
const config = { schemaVersion: 1, version, candidateId: candidate.id,
  // Existing adapter's candidate.boss is its checkout identity check. Preserve
  // the built application's frozen source separately; never relabel its bytes.
  candidate: { boss: operatedRevision, uar, bossfang,
    appAsarSha256: digest(path.join(resources, 'app.asar')),
    uarSha256: digest(path.join(payload, 'uar-sidecar')),
    bossfangSha256: digest(path.join(payload, 'bossfang')) },
  builtSource: { boss: desktopRevision, candidateId: candidate.id, contentManifestDigest: candidate.contentManifestDigest },
  operatedSource: { boss: operatedRevision, driverDiffPaths },
  requiresFrozenBuildReconciliation: operatedRevision !== desktopRevision,
  gateway: { credentialEnv: 'LITER_LLM_MASTER_KEY', endpoint: 'http://localhost:4000',
    alias: 'gpt-6.1-sol', providerId: 'openai', modelId: 'gpt-6.1-sol' },
  modelContextPath, priorReceiptPath }
// A new config is inspectable. Preserve an existing binding rather than replace it.
fs.mkdirSync(path.dirname(configPath), { recursive: true })
fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', { flag: 'wx', mode: 0o600 })
const receiptPath = path.join(initiative, 'receipts/integrated-operation-config-binding-20261010.json')
const receipt = { schemaVersion: 1, kind: 'integrated-post-build-operation-configuration-binding',
  recordedAt: new Date().toISOString(), runId: state.runId, iterationId: iteration.id,
  candidateId: candidate.id, contentManifestDigest: candidate.contentManifestDigest,
  releaseVersion: version, configuration: { path: configPath, sha256: digest(configPath) },
  candidate: config.candidate, builtSource: config.builtSource, operatedSource: config.operatedSource,
  requiresFrozenBuildReconciliation: config.requiresFrozenBuildReconciliation, app,
  inputRefs: [readyPath, pinsPath, artifactsPath, localPinPath, modelContextPath, priorReceiptPath]
    .map(file => ({ path: file, sha256: digest(file) })),
  operationRun: false, authenticationProbeRun: false, inferenceRun: false,
  candidateAcceptance: 'pending',
  publicationScope: { required: ['darwin-arm64', 'win32-x64'], deferred: ['darwin-x64', 'win32-arm64'] },
  limitations: ['Parent invokes after successful actual build completion; this receipt alone does not prove build completion.',
    'candidate.boss names the operation checkout; builtSource.boss remains the immutable application source. A later scripts-only repair requires supported candidate reconcile-frozen before receipt adoption.',
    'Signed packaged byte hashes bind the operation; signing, installer acceptance and runtime behavior require their own actual receipts.',
    'No credential values were read or recorded; prior receipt remains historical evidence at its original source and package.'] }
fs.writeFileSync(receiptPath, JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx', mode: 0o600 })
process.stdout.write(JSON.stringify({ status: 'configuration-bound', candidateId: candidate.id, configPath, receiptPath }) + '\n')
