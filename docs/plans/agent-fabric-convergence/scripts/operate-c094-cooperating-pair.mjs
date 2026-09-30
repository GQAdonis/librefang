import fs from 'node:fs'
import path from 'node:path'
import { createHash, randomUUID } from 'node:crypto'
import { fileURLToPath, pathToFileURL } from 'node:url'

const initiative = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

export async function operate(values = process.argv.slice(2)) {
  const options = {}
  for (let index = 0; index < values.length; index++) {
    if (!['--boss', '--app', '--launcher'].includes(values[index]) || !values[index + 1]) {
      throw new Error('Supported arguments: --boss <repository> [--app <built.app>] [--launcher <boss-launch.mjs>]')
    }
    options[values[index].slice(2)] = values[++index]
  }
  const root = path.join(initiative, '.prometheus', 'cadence')
  const cadence = JSON.parse(fs.readFileSync(path.join(root, 'state.json'), 'utf8'))
  const iteration = cadence.iterations.at(-1)
  const boss = path.resolve(options.boss ?? cadence.profile.binding.bossRepository)
  const launchCheckpoint = iteration.profile.checkpoints.find((item) => item.id === 'mac-functional-launch')
  const launcher = path.resolve(options.launcher ?? launchCheckpoint.args[0])
  const receiptFile = path.join(root, 'artifacts', 'c094-team-runtime-operation.json')
  if (fs.existsSync(receiptFile)) {
    if (process.env.BOSS_C094_RECONCILE_RECEIPT !== '1')
      throw new Error('The immutable C09.4 operation receipt already exists')
    const receipt = JSON.parse(fs.readFileSync(receiptFile))
    const observed = JSON.parse(receipt.observedBehavior ?? '{}')
    const evidenceBytes = fs.readFileSync(observed.evidencePath)
    const evidence = JSON.parse(evidenceBytes)
    const sourceRefs = iteration.sourceRefs
    const digest = (bytes) => createHash('sha256').update(bytes).digest('hex')
    if (
      receipt.status !== 'success' || receipt.functionalAcceptance !== 'scenario-confirmed' ||
      observed.complete !== true || evidence.complete !== true ||
      digest(evidenceBytes) !== observed.evidenceSha256 ||
      JSON.stringify(evidence.sourceRefs) !== JSON.stringify(sourceRefs) ||
      evidence.caseReceipts?.length !== 14 ||
      !evidence.caseReceipts.every((item) => {
        const bytes = fs.readFileSync(item.path)
        const caseReceipt = JSON.parse(bytes)
        return digest(bytes) === item.sha256 && caseReceipt.receipt?.case === item.case &&
          JSON.stringify(caseReceipt.sourceRefs) === JSON.stringify(sourceRefs)
      })
    ) throw new Error('The completed C09.4 receipt does not match its immutable case evidence and frozen sources')
    return { status: 'success', functionalAcceptance: 'scenario-confirmed', complete: true, reconciled: true, receiptFile }
  }
  const stagingReceipt = path.join(path.dirname(receiptFile), `c094-team-runtime-${randomUUID()}.json`)
  const previous = {
    stage: process.env.UAR_TEAM_EXECUTION_PROFILE_STAGE,
    capacity: process.env.UAR_TEAM_EXECUTION_MAX_ACTIVE,
    boss: process.env.BOSS_C094_REPOSITORY
  }
  process.env.UAR_TEAM_EXECUTION_PROFILE_STAGE = 'operation'
  process.env.UAR_TEAM_EXECUTION_MAX_ACTIVE = '1'
  process.env.BOSS_C094_REPOSITORY = boss
  try {
    const { launchBoss } = await import(pathToFileURL(launcher).href)
    const result = await launchBoss({
      repository: boss,
      app: options.app ?? path.join(boss, 'dist', 'mac-arm64', 'The Boss.app'),
      scenario: path.join(initiative, 'scripts', 'capture-c094-operation.mjs'),
      'require-scenario': true,
      'timeout-ms': 1_800_000,
      receipt: stagingReceipt
    })
    const observed = result.observedBehavior ? JSON.parse(result.observedBehavior) : null
    if (result.status === 'success' && result.functionalAcceptance === 'scenario-confirmed' && observed?.complete === true) {
      fs.copyFileSync(stagingReceipt, receiptFile, fs.constants.COPYFILE_EXCL)
    }
    return { status: result.status, functionalAcceptance: result.functionalAcceptance, complete: observed?.complete === true, receiptFile: fs.existsSync(receiptFile) ? receiptFile : stagingReceipt }
  } finally {
    for (const [key, value] of [
      ['UAR_TEAM_EXECUTION_PROFILE_STAGE', previous.stage],
      ['UAR_TEAM_EXECUTION_MAX_ACTIVE', previous.capacity],
      ['BOSS_C094_REPOSITORY', previous.boss]
    ]) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  }
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  try {
    const result = await operate()
    process.stdout.write(`${JSON.stringify(result)}\n`)
    process.exitCode = result.status === 'success' ? 0 : 1
  } catch {
    process.stderr.write('C09.4 packaged cooperation did not complete; inspect its immutable receipt and isolated application logs.\n')
    process.exitCode = 1
  }
}
