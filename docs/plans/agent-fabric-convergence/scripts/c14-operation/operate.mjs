import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { digest, gatewayEnvironment, prepareRepository, requireFact, write } from './io.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const optionNames = ['--boss', '--launcher', '--output', '--retry-bossfang-from']

export async function operate(args = process.argv.slice(2)) {
  const options = {}
  for (let i = 0; i < args.length; i++) {
    requireFact(optionNames.includes(args[i]) && args[i + 1] && !args[i + 1].startsWith('--'), 'C14_ARGUMENTS')
    options[args[i].slice(2)] = path.resolve(args[++i])
  }
  requireFact(options.boss && options.launcher && options.output, 'C14_ARGUMENTS')
  fs.mkdirSync(options.output, { recursive: true })
  options.output = fs.realpathSync(options.output)
  const runId = randomUUID()
  const output = path.join(options.output, 'c14-' + runId)
  fs.mkdirSync(output)
  const operation = { schemaVersion: 1, kind: 'completed-feature-operation', creationTaskRef: 'C14.1',
    runId, status: 'blocked', startedAt: new Date().toISOString(), evidenceLevel: 'real-packaged-work-ui',
    normalProfile: true, experimentalOptIn: false, externalEffects: 'isolated local repository only; no remote publication' }
  try {
    requireFact(process.platform === 'darwin', 'C14_PACKAGED_PLATFORM_LAUNCHER_UNAVAILABLE')
    requireFact(['UAR_TEAM_EXECUTION_PROFILE_STAGE', 'UAR_WORKFLOW_EXECUTION_PROFILE_STAGE', 'BOSS_C094_PUBLIC_QUALIFICATION']
      .every((name) => process.env[name] === undefined), 'C14_EXPERIMENTAL_PROFILE_ENVIRONMENT_PRESENT')
    const gateway = gatewayEnvironment()
    const app = path.join(options.boss, 'dist', process.arch === 'arm64' ? 'mac-arm64' : 'mac', 'The Boss.app')
    const resources = path.join(app, 'Contents/Resources')
    const payload = path.join(resources, 'app.asar.unpacked/resources/binaries', 'darwin-' + process.arch)
    requireFact(fs.existsSync(path.join(resources, 'app.asar')) && fs.existsSync(path.join(payload, 'uar-sidecar')),
      'C14_COMPLETE_PACKAGED_APPLICATION_REQUIRED')
    const pinFile = path.join(options.boss, 'build/local-uar-source.json')
    const markerFile = path.join(payload, '.uar-local-payload.json')
    requireFact(fs.existsSync(pinFile) && fs.existsSync(markerFile), 'C14_PACKAGED_SOURCE_PROVENANCE_REQUIRED')
    const pin = JSON.parse(fs.readFileSync(pinFile, 'utf8'))
    requireFact(JSON.parse(fs.readFileSync(markerFile, 'utf8')).source === pin.revision, 'C14_PACKAGED_SOURCE_PIN_MISMATCH')
    const git = (...values) => execFileSync('git', values, { cwd: options.boss, encoding: 'utf8' }).trim()
    const sourceRefs = { boss: git('rev-parse', 'HEAD'), uar: pin.revision,
      bossDiffSha256: digest(execFileSync('git', ['diff', 'HEAD'], { cwd: options.boss })),
      sourcePinSha256: digest(fs.readFileSync(pinFile)), launcherSha256: digest(fs.readFileSync(options.launcher)),
      appAsarSha256: digest(fs.readFileSync(path.join(resources, 'app.asar'))),
      sidecarSha256: digest(fs.readFileSync(path.join(payload, 'uar-sidecar'))),
      scenarioFiles: Object.fromEntries(fs.readdirSync(here).filter((name) => name.endsWith('.mjs')).sort()
        .map((name) => [name, digest(fs.readFileSync(path.join(here, name)))])) }
    let priorTeams
    if (options['retry-bossfang-from']) {
      const priorFile = fs.realpathSync(options['retry-bossfang-from'])
      const prior = JSON.parse(fs.readFileSync(priorFile, 'utf8'))
      const priorCombinedFile = path.join(path.dirname(priorFile), 'combined-evidence.json')
      const priorCombined = JSON.parse(fs.readFileSync(priorCombinedFile, 'utf8'))
      requireFact(prior.kind === 'work-teams-packaged-operation' && prior.status === 'success' &&
        prior.complete === true && priorCombined.teams?.passed === true &&
        priorCombined.sourceRefs?.appAsarSha256 === prior.sourceRefs?.appAsarSha256 &&
        priorCombined.teams.evidenceSha256 === digest(fs.readFileSync(priorFile)) &&
        prior.sourceRefs?.uar === sourceRefs.uar &&
        ['scenario.mjs', 'setup.mjs', 'controls.mjs', 'approvals.mjs', 'diagnostics.mjs', 'io.mjs']
          .every((name) => prior.sourceRefs?.scenarioFiles?.[name] === sourceRefs.scenarioFiles[name]),
      'C14_PRIOR_TEAMS_EVIDENCE_NOT_REUSABLE')
      const changed = execFileSync('git', ['diff', '--name-only', prior.sourceRefs.boss, sourceRefs.boss],
        { cwd: options.boss, encoding: 'utf8' }).trim().split('\n').filter(Boolean)
      requireFact(changed.every((name) => ['build/integration-sources.json',
        'src/main/services/bossFang/BossFangService.ts'].includes(name)),
      'C14_TEAMS_EXECUTABLE_INPUT_CHANGED_REPEAT_REQUIRED')
      priorTeams = { evidence: priorFile, evidenceSha256: digest(fs.readFileSync(priorFile)),
        sourceRefs: prior.sourceRefs, finishedAt: prior.finishedAt,
        scope: 'previous-packaged-application; not same-session or current-package Teams acceptance' }
    }
    const marker = 'C14-' + runId
    const workspaceDirectory = path.join(output, 'workspace')
    const repository = prepareRepository(workspaceDirectory, marker)
    execFileSync('git', ['init', '--quiet', workspaceDirectory], { stdio: 'ignore' })
    const evidence = path.join(output, 'evidence.json')
    const configuration = { creationTaskRef: 'C14.1', sourceRefs, gateway, evidence,
      ...(priorTeams ? { priorTeams } : {}),
      workspaceDirectory, workspaceLabel: marker, marker, repository }
    const scenario = path.join(output, 'packaged-scenario.mjs')
    const scenarioModule = priorTeams ? 'bossfang-only-scenario.mjs' : 'combined-scenario.mjs'
    fs.writeFileSync(scenario, `import scenario from ${JSON.stringify(pathToFileURL(path.join(here, scenarioModule)).href)}\n` +
      `export default context => scenario(context, ${JSON.stringify(configuration)})\n`, { flag: 'wx', mode: 0o600 })
    const { launchBoss } = await import(pathToFileURL(options.launcher).href)
    requireFact(typeof launchBoss === 'function', 'C14_LAUNCHER_CONTRACT_UNAVAILABLE')
    const launch = await launchBoss({ repository: options.boss, app, scenario, 'require-scenario': true,
      'timeout-ms': 2400000, receipt: path.join(output, 'launch.json') })
    const observed = fs.existsSync(evidence) ? JSON.parse(fs.readFileSync(evidence, 'utf8')) : null
    const combinedFile = path.join(output, 'combined-evidence.json')
    const combined = fs.existsSync(combinedFile) ? JSON.parse(fs.readFileSync(combinedFile, 'utf8')) : null
    Object.assign(operation, { sourceRefs, launchReceipt: launch.receiptFile,
      functionalAcceptance: launch.functionalAcceptance, checks: observed?.checks ?? [],
      ...(observed ? { evidence, evidenceSha256: digest(fs.readFileSync(evidence)) } : {}),
      ...(combined ? { combinedEvidence: combinedFile, combinedEvidenceSha256: digest(fs.readFileSync(combinedFile)) } : {}) })
    if (launch.status === 'success' && launch.functionalAcceptance === 'scenario-confirmed' &&
      (priorTeams ? combined?.bossfang?.passed === true : combined?.complete)) {
      operation.status = 'success'
      if (priorTeams) operation.acceptanceScope = 'BossFang failed-only retry; prior Teams receipt is historical'
    } else operation.failureCode = observed?.failureCode ?? 'C14_PACKAGED_LAUNCH_OR_SCENARIO_UNAVAILABLE'
  } catch (error) {
    operation.failureCode = /^C14_[A-Z0-9_]+$/.test(error.code ?? '') ? error.code : 'C14_PREREQUISITE_OR_LAUNCH_UNAVAILABLE'
  }
  operation.finishedAt = new Date().toISOString()
  const receiptFile = path.join(output, 'operation.json')
  write(receiptFile, operation)
  return { ...operation, receiptFile }
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  try {
    const result = await operate()
    process.stdout.write(JSON.stringify({ status: result.status, creationTaskRef: result.creationTaskRef,
      receiptFile: result.receiptFile, failureCode: result.failureCode, functionalAcceptance: result.functionalAcceptance }) + '\n')
    process.exitCode = result.status === 'success' ? 0 : 1
  } catch {
    process.stderr.write('C14 operation arguments were unavailable; no credentials or raw diagnostics are printed.\n')
    process.exitCode = 1
  }
}
