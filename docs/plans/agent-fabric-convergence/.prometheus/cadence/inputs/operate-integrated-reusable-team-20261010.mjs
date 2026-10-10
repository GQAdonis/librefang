import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ownFile = fileURLToPath(import.meta.url)
const initiative = path.resolve(path.dirname(ownFile), '../../..')
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'))
const digest = bytes => createHash('sha256').update(bytes).digest('hex')
const fileDigest = file => digest(fs.readFileSync(file))
const fact = (value, code) => { if (!value) throw Object.assign(new Error(code), { code }) }

// The maintained launcher calls this export in its owned packaged profile.
export async function scenario(context, configuration) {
  const common = await import(pathToFileURL(path.join(configuration.repository,
    'scripts/operations/admission-v2-common.mjs')).href)
  const owned = await common.profile(context.evaluate, configuration)
  const selected = await import(pathToFileURL(path.join(configuration.repository,
    'scripts/reusable-team-operation/scenario.mjs')).href)
  const result = await selected.scenario(context, configuration)
  const evidence = read(configuration.evidence)
  Object.assign(evidence, {
    releaseVersion: configuration.version,
    candidateId: configuration.integratedCandidate.candidateId,
    contentManifestDigest: configuration.integratedCandidate.contentManifestDigest,
    builtSource: configuration.integratedCandidate.builtSource,
    operatedSource: configuration.integratedCandidate.operatedSource,
    requiresFrozenBuildReconciliation: configuration.integratedCandidate.requiresFrozenBuildReconciliation,
    installedProfileVersion: owned.version,
    acceptanceScope: 'Affected reusable-team author/deploy/normal Work core only; overall customer and Windows installed acceptance remain separate.'
  })
  fs.writeFileSync(configuration.evidence, JSON.stringify(evidence, null, 2) + '\n', { mode: 0o600 })
  return { ...result, observedBehavior: JSON.stringify({ complete: evidence.complete,
    checks: evidence.checks, failureCode: evidence.failureCode, evidencePath: configuration.evidence,
    evidenceSha256: fileDigest(configuration.evidence) }) }
}

export async function operate(args = process.argv.slice(2)) {
  const options = {}
  for (let index = 0; index < args.length; index++) {
    const name = args[index]
    fact(['--boss', '--launcher', '--output', '--config'].includes(name) && args[index + 1] &&
      !args[index + 1].startsWith('--') && options[name.slice(2)] === undefined, 'C15_INTEGRATED_ARGUMENTS')
    options[name.slice(2)] = path.resolve(args[++index])
  }
  fact(['boss', 'launcher', 'output', 'config'].every(name => options[name]), 'C15_INTEGRATED_ARGUMENTS')
  fact(process.platform === 'darwin' && process.arch === 'arm64', 'C15_INTEGRATED_MAC_ARM64_REQUIRED')
  const configBytes = fs.readFileSync(options.config)
  const config = JSON.parse(configBytes)
  fact(config.schemaVersion === 1 && config.version === '2.2.31' && config.candidateId &&
    ['boss', 'uar', 'bossfang'].every(key => /^[a-f0-9]{40}$/.test(config.candidate?.[key] ?? '')) &&
    ['appAsarSha256', 'uarSha256', 'bossfangSha256'].every(key =>
      /^[a-f0-9]{64}$/.test(config.candidate?.[key] ?? '')), 'C15_INTEGRATED_FINAL_CONFIG_REQUIRED')
  const state = read(path.join(initiative, '.prometheus/cadence/state.json'))
  const iteration = state.iterations.find(row => row.id === state.activeIterationId)
  const frozen = state.candidates.find(row => row.id === iteration?.candidateId)
  fact(frozen?.id === config.candidateId && frozen.id === config.builtSource?.candidateId &&
    frozen.contentManifestDigest === config.builtSource?.contentManifestDigest &&
    frozen.sourceRefs.find(row => row.repository === options.boss)?.revision === config.builtSource.boss,
    'C15_INTEGRATED_CURRENT_FROZEN_CANDIDATE_REQUIRED')
  fact(execFileSync('git', ['rev-parse', 'HEAD'], { cwd: options.boss, encoding: 'utf8' }).trim() ===
    config.candidate.boss, 'C15_INTEGRATED_DRIVER_SOURCE_MISMATCH')
  const driver = await import(pathToFileURL(path.join(options.boss, 'scripts/operate-reusable-team.mjs')).href)
  const provenance = await import(pathToFileURL(path.join(options.boss,
    'scripts/bossfang-workflow-delegation-operation/provenance.mjs')).href)
  const actual = provenance.provenance({ ...options, 'bossfang-source': config.candidate.bossfang })
  fact(actual.sourceRefs.uar === config.candidate.uar &&
    ['appAsarSha256', 'uarSha256', 'bossfangSha256'].every(key =>
      actual.sourceRefs[key] === config.candidate[key]), 'C15_INTEGRATED_ACTUAL_PACKAGE_MISMATCH')
  fact(read(path.join(options.boss, 'package.json')).version === config.version,
    'C15_INTEGRATED_CHECKOUT_VERSION_MISMATCH')
  const skills = read(path.join(actual.app, 'Contents/Resources/app.asar.unpacked/resources',
    'prometheus-skills-mini/release-manifest.json'))
  const sourceRefs = { ...actual.sourceRefs, boss: config.builtSource.boss,
    mini: skills.revision, full: skills.sourceIntent?.['skill-pack']?.revision,
    configurationSha256: digest(configBytes), wrapperSha256: fileDigest(ownFile),
    packageProfileHelperSha256: fileDigest(path.join(options.boss, 'scripts/operations/admission-v2-common.mjs')),
    frozenCandidateSourceRefs: frozen.sourceRefs }
  const frozenBoss = frozen.sourceRefs.find(row => row.repository === options.boss)
  fact(/^[a-f0-9]{40}$/.test(sourceRefs.mini ?? '') && /^[a-f0-9]{40}$/.test(sourceRefs.full ?? '') &&
    skills.sourceIntent?.mini?.revision === sourceRefs.mini &&
    frozenBoss.submoduleRefs?.find(row => row.repository === path.join(options.boss,
      'resources/prometheus-skills-mini'))?.revision === sourceRefs.mini &&
    frozen.sourceRefs.find(row => row.repository ===
      '/Users/gqadonis/Projects/prometheus/worktrees/cadence-nested-source-full')?.revision === sourceRefs.full,
    'C15_INTEGRATED_SKILL_SOURCE_MISMATCH')
  const gateway = config.gateway
  fact(gateway?.credentialEnv === 'LITER_LLM_MASTER_KEY' && gateway.endpoint === 'http://localhost:4000' &&
    gateway.alias === 'gpt-6.1-sol' && gateway.modelId === 'gpt-6.1-sol' && gateway.providerId === 'openai',
    'C15_INTEGRATED_OBSERVED_GATEWAY_REQUIRED')
  const fields = { BOSS_C15_GATEWAY_CREDENTIAL_ENV: gateway.credentialEnv,
    BOSS_C15_GATEWAY_ENDPOINT: gateway.endpoint, BOSS_C15_GATEWAY_ALIAS: gateway.alias,
    BOSS_C15_GATEWAY_PROVIDER_ID: gateway.providerId, BOSS_C15_GATEWAY_MODEL_ID: gateway.modelId,
    BOSS_C15_GATEWAY_PROVIDER_BASE_URL: gateway.providerBaseUrl }
  const priorEnvironment = new Map(Object.keys(fields).map(name => [name, process.env[name]]))
  let result
  try {
    for (const [name, value] of Object.entries(fields)) {
      if (value === undefined) delete process.env[name]
      else process.env[name] = value
    }
    result = await driver.operate(['--boss', options.boss, '--launcher', options.launcher,
      '--output', options.output], new URL(import.meta.url), {
      prepareLauncher: async ({ configuration }) => ({ configuration: {
        repository: options.boss, version: config.version,
        sourceRefs: { ...configuration.sourceRefs, ...sourceRefs,
          scenarioFiles: { ...sourceRefs.scenarioFiles, ...configuration.sourceRefs.scenarioFiles } },
        integratedCandidate: { candidateId: frozen.id, contentManifestDigest: frozen.contentManifestDigest,
          builtSource: config.builtSource, operatedSource: config.operatedSource,
          requiresFrozenBuildReconciliation: config.requiresFrozenBuildReconciliation }
      } })
    })
  } finally {
    for (const [name, value] of priorEnvironment) {
      if (value === undefined) delete process.env[name]
      else process.env[name] = value
    }
  }
  const observed = result.evidence ? read(result.evidence) : null
  const receiptFile = path.join(path.dirname(result.receiptFile), 'integrated-team-operation.json')
  const receipt = { ...result, releaseVersion: config.version, candidateId: frozen.id,
    contentManifestDigest: frozen.contentManifestDigest, sourceRefs: observed?.sourceRefs ?? sourceRefs,
    builtSource: config.builtSource, operatedSource: config.operatedSource,
    requiresFrozenBuildReconciliation: config.requiresFrozenBuildReconciliation,
    originalOperationReceipt: result.receiptFile, originalOperationSha256: fileDigest(result.receiptFile),
    publicationScope: ['darwin-arm64', 'win32-x64'],
    acceptanceScope: 'Affected C15.1/C16 reusable-team core on actual Mac ARM64 package only; no full C15.1 or Windows installed pass.',
    credentialValueRecorded: false,
    ...(result.evidence ? { evidenceSha256: fileDigest(result.evidence) } : {}) }
  fs.writeFileSync(receiptFile, JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx', mode: 0o600 })
  return { status: receipt.status, receiptFile, failureCode: receipt.failureCode }
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  try {
    const result = await operate()
    process.stdout.write(JSON.stringify(result) + '\n')
    process.exitCode = result.status === 'success' ? 0 : 1
  } catch (error) {
    process.stderr.write(JSON.stringify({ status: 'blocked', code: /^C15_[A-Z0-9_]+$/.test(error.code ?? '')
      ? error.code : 'C15_INTEGRATED_PREREQUISITE_UNAVAILABLE' }) + '\n')
    process.exitCode = 1
  }
}
