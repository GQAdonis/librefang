// Root-operated, bounded release continuation. No Cadence/KBD state is mutated.
// Usage: node <this-file> --continue [--max-minutes 90] [--recover-lock]
// Read-only: --status. After checking the exact remote dispatch inputs, root may
// reconcile an unknown acknowledgement with --reconcile-run PLATFORM:STAGE:RUN.
// STAGE is package or installer. --retry-publisher PLATFORM explicitly resumes
// the existing strict publisher, which checks immutable assets before reuse.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'
import { execFileSync } from 'node:child_process'

const repository = 'Prometheus-AGS/the-boss'
const producer = '8119fd7c83248cdf0d0cde4496cb33c569761a71'
const source = '308aea46ff26e7f61340281bb51f67ebe5351569'
const installerSource = 'aef2ec2cda68605efab9dddf33b46e726e752c2d'
const producerRef = 'codex/customer-coordinator-delegation-identity'
const installerRef = 'boss-customer-build-2.2.30-aef2ec2c'
const nativeRuns = { 'win32-x64': 38022082007, 'win32-arm64': 38022084018, 'darwin-x64': 38022665581 }
const workflows = { native: 'integration-payload.yml', package: 'package-uar-existing-native.yml', installer: 'the-boss-release.yml' }
const inputDirectory = path.dirname(fileURLToPath(import.meta.url))
const cadence = path.resolve(inputDirectory, '..')
const directory = path.join(cadence, 'artifacts', 'customer-platform-continuation-2.2.30-20261010')
const journalPath = path.join(directory, 'events.jsonl')
const snapshotPath = path.join(directory, 'state.json')
const lockPath = path.join(directory, 'operation.lock')
const publisher = path.join(inputDirectory, 'publish-customer-uar-308aea46-warm-native-20261010.mjs')
const contract = { version: '2.2.30', profile: 'uar-enabled', repository, producer, source,
  producerRef, installerRef, installerSource, nativeRuns }
const options = process.argv.slice(2)
let mode, maxMinutes = 90, recoverLock = false, reconcile, retryPublisher
for (let index = 0; index < options.length; index++) {
  const argument = options[index]
  if (argument === '--status' || argument === '--continue') {
    if (mode) throw new Error('Select exactly one mode')
    mode = argument.slice(2)
  } else if (argument === '--max-minutes') maxMinutes = Number(options[++index])
  else if (argument === '--recover-lock') recoverLock = true
  else if (argument === '--reconcile-run') reconcile = options[++index]
  else if (argument === '--retry-publisher') retryPublisher = options[++index]
  else throw new Error(`Unsupported option: ${argument}`)
}
if (!mode) {
  console.log('Use --status, or --continue [--max-minutes 1..90] [--recover-lock]. No action performed.')
  process.exit(0)
}
if (!Number.isFinite(maxMinutes) || maxMinutes < 1 || maxMinutes > 90) throw new Error('max-minutes must be 1..90')
if (mode === 'status' && (reconcile || retryPublisher || recoverLock)) throw new Error('Status is read-only')
const started = Date.now()
const deadline = started + maxMinutes * 60_000
let stopped = false, lockOwned = false, sequence = 0
process.on('SIGINT', () => { stopped = true })
process.on('SIGTERM', () => { stopped = true })
const assert = (condition, message) => { if (!condition) throw new Error(message) }
function alive(pid) {
  try { process.kill(pid, 0); return true } catch (error) {
    if (error.code === 'ESRCH') return false
    throw error
  }
}
function durable(file, bytes, flags = 'w') {
  const fd = fs.openSync(file, flags, 0o600)
  try { fs.writeFileSync(fd, bytes); fs.fsyncSync(fd) } finally { fs.closeSync(fd) }
}
function load() {
  if (!fs.existsSync(journalPath)) return { schemaVersion: 1, contract, createdAt: new Date().toISOString(),
    platforms: Object.fromEntries(Object.keys(nativeRuns).map(platform => [platform, { stage: 'native', actions: [], observations: {} }])) }
  const bytes = fs.readFileSync(journalPath, 'utf8')
  assert(bytes.endsWith('\n'), 'Incomplete journal tail: preserve it and ask root to reconcile; no effects resumed')
  let latest
  for (const line of bytes.trimEnd().split('\n')) {
    const event = JSON.parse(line)
    assert(event.sequence === ++sequence && event.state?.schemaVersion === 1, 'Invalid operation journal sequence/schema')
    latest = event.state
  }
  assert(JSON.stringify(latest.contract) === JSON.stringify(contract), 'Journal belongs to different frozen release inputs')
  return latest
}
let state = load()
function record(type, details = {}) {
  state.updatedAt = new Date().toISOString()
  const event = { sequence: ++sequence, recordedAt: state.updatedAt, type, ...details, state }
  durable(journalPath, JSON.stringify(event) + '\n', 'a')
  const temporary = `${snapshotPath}.${process.pid}.tmp`
  durable(temporary, JSON.stringify(state, null, 2) + '\n', 'wx')
  fs.renameSync(temporary, snapshotPath)
  const fd = fs.openSync(directory, 'r')
  try { fs.fsyncSync(fd) } finally { fs.closeSync(fd) }
}
function summary() {
  return { version: contract.version, journalPath, source, installerSource,
    platforms: Object.entries(state.platforms).map(([platform, item]) => ({ platform, stage: item.stage,
      nativeRun: nativeRuns[platform], packageRun: item.packageRun, installerRun: item.installerRun,
      installerRunUrl: item.installerRun ? `https://github.com/${repository}/actions/runs/${item.installerRun}` : undefined,
      recordUrl: item.recordUrl, blocked: item.blocked })),
    qualification: 'No installed-operation, metadata publication, website deployment or acceptance credit from dispatch' }
}
function gh(arguments_, timeout = 120_000) {
  const remaining = deadline - Date.now()
  assert(remaining > 0 && !stopped, 'Current operation budget ended before external action')
  return execFileSync('gh', arguments_, { encoding: 'utf8', shell: false,
    timeout: Math.min(timeout, remaining), stdio: ['ignore', 'pipe', 'pipe'] })
}
const api = endpoint => JSON.parse(gh(['api', endpoint]))
function readRun(id, kind) {
  const run = api(`repos/${repository}/actions/runs/${id}`)
  assert(String(run.id) === String(id) && run.path === `.github/workflows/${workflows[kind]}` &&
    run.head_sha === (kind === 'installer' ? installerSource : producer) && run.event === 'workflow_dispatch',
  `Run ${id} does not match frozen ${kind} workflow/source/event`)
  return run
}
function selectedJob(id, name, pending = false) {
  const jobs = api(`repos/${repository}/actions/runs/${id}/jobs?per_page=100`).jobs.filter(job => job.name === name)
  if (!jobs.length && pending) return undefined
  assert(jobs.length === 1, `Run ${id} must contain exactly one ${name} job`)
  return jobs[0]
}
function observe(platform, kind, run, job) {
  const item = state.platforms[platform]
  const active = job?.steps?.find(step => step.status === 'in_progress')?.name
  const value = { run: run.id, status: run.status, conclusion: run.conclusion,
    jobStatus: job?.status, jobConclusion: job?.conclusion, activeStep: active }
  if (JSON.stringify(item.observations[kind]) !== JSON.stringify(value)) {
    item.observations[kind] = value
    record('stage-observed', { platform, kind, observation: value })
    console.log(JSON.stringify({ platform, stage: kind, ...value }))
  }
}
function intent(platform, kind, inputs) {
  const action = { id: randomUUID(), kind, inputs, status: 'intent-recorded', intendedAt: new Date().toISOString() }
  state.platforms[platform].actions.push(action)
  record('effect-intent', { platform, actionId: action.id })
  return action
}
function dispatch(platform, kind, inputs) {
  const action = intent(platform, kind, inputs)
  const ref = kind === 'package' ? producerRef : installerRef
  const arguments_ = ['workflow', 'run', workflows[kind], '--repo', repository, '--ref', ref]
  for (const [key, value] of Object.entries(inputs)) arguments_.push('-f', `${key}=${value}`)
  try {
    const acknowledgement = gh(arguments_)
    const match = acknowledgement.match(/https:\/\/github\.com\/Prometheus-AGS\/the-boss\/actions\/runs\/(\d+)/)
    assert(match, 'Dispatch acknowledgement lacks a run URL; GitHub may have accepted the request')
    action.run = Number(match[1])
    action.status = 'acknowledged'
    action.acknowledgedAt = new Date().toISOString()
    state.platforms[platform][`${kind}Run`] = action.run
    state.platforms[platform].stage = kind
    record('effect-acknowledged', { platform, actionId: action.id, run: action.run })
    console.log(JSON.stringify({ platform, stage: `${kind}-dispatched`, run: action.run,
      url: `https://github.com/${repository}/actions/runs/${action.run}` }))
  } catch (error) {
    action.status = action.run ? 'acknowledged-needs-reconciliation' : 'unknown'
    record('effect-needs-reconciliation', { platform, actionId: action.id })
    throw new Error(`${kind} dispatch requires root reconciliation; never automatically redispatch (${action.id})`)
  }
}
function publisherReceipt(platform) {
  const file = path.join(cadence, 'artifacts', `customer-uar-308aea46-${platform}-published-20261010.json`)
  const receipt = JSON.parse(fs.readFileSync(file, 'utf8'))
  const item = state.platforms[platform]
  assert(receipt.source === source && receipt.platform === platform && receipt.packageRun === item.packageRun &&
    receipt.workflowHead === producer && receipt.publicAssets?.length === 2,
  'Strict publisher receipt does not match the frozen selected package')
  const expected = `https://github.com/Prometheus-AGS/universal-agent-runtime/releases/download/boss-sidecar-${platform}-v1.0.0-2.2.29-308aea46/uar-sidecar-${platform}.json`
  assert(receipt.recordUrl === expected && receipt.publicAssets.every(asset => asset.sha256 && asset.size > 0),
    'Strict publication receipt lacks immutable public asset evidence')
  return { file, receipt }
}
function publish(platform) {
  const item = state.platforms[platform]
  assert(deadline > Date.now() && !stopped, 'Current operation budget ended before publisher admission')
  assert(!Object.values(state.platforms).some(value => value.actions.some(action =>
    action.kind === 'publisher' && ['intent-recorded', 'unknown'].includes(action.status))),
  'An earlier publisher effect is unresolved; root must reconcile it before admitting another publisher')
  const action = intent(platform, 'publisher', { packageRun: item.packageRun, source, platform })
  const log = path.join(directory, `${platform}-publisher-${action.id}.log`)
  const fd = fs.openSync(log, 'wx', 0o600)
  try {
    execFileSync(process.execPath, [publisher, '--run', String(item.packageRun), '--platform', platform],
      { cwd: path.resolve(inputDirectory, '../../..'), shell: false,
        timeout: Math.min(15 * 60_000, deadline - Date.now()), stdio: ['ignore', fd, fd] })
    const { file, receipt } = publisherReceipt(platform)
    item.recordUrl = receipt.recordUrl
    item.publicationReceipt = file
    item.stage = 'published-native'
    action.status = 'succeeded'
    action.completedAt = new Date().toISOString()
    action.receipt = file
    record('publisher-completed', { platform, actionId: action.id, receipt: file })
    console.log(JSON.stringify({ platform, stage: item.stage, recordUrl: item.recordUrl, receipt: file }))
  } catch (error) {
    action.status = 'unknown'
    action.log = log
    record('publisher-needs-reconciliation', { platform, actionId: action.id })
    throw new Error(`Publisher did not return a validated receipt; root must reconcile ${log} before explicit retry`)
  } finally { fs.closeSync(fd) }
}
function block(platform, message) {
  state.platforms[platform].blocked = message
  record('platform-blocked', { platform, reason: message })
  console.log(JSON.stringify({ platform, stage: 'blocked', reason: message }))
}
async function advance(platform) {
  const item = state.platforms[platform]
  if (item.blocked || item.stage === 'installer-complete') return
  if (item.stage === 'native') {
    const run = readRun(nativeRuns[platform], 'native')
    const job = selectedJob(run.id, `Native tools (${platform})`, run.status !== 'completed')
    observe(platform, 'native', run, job)
    if (run.status !== 'completed' || !job || job.status !== 'completed') return
    assert(run.conclusion === 'success' && job.conclusion === 'success', 'Native run/job failed; no package dispatched')
    assert(job.steps.some(step => step.name === 'Run actions/cache/save@v6' && step.conclusion === 'success'),
      'Completed native run lacks successful exact cache-save evidence; no package dispatched')
    dispatch(platform, 'package', { native_run: String(run.id), source_revision: source, platforms: platform })
  } else if (item.stage === 'package') {
    const run = readRun(item.packageRun, 'package')
    const job = selectedJob(run.id, `Reuse UAR (${platform})`, run.status !== 'completed')
    observe(platform, 'package', run, job)
    if (run.status !== 'completed' || !job || job.status !== 'completed') return
    assert(run.conclusion === 'success' && job.conclusion === 'success', 'Package run/job failed; no publisher started')
    const action = item.actions.findLast(value => value.kind === 'package' && value.run === run.id)
    assert(action, 'Package outcome has no recorded dispatch identity')
    action.status = 'succeeded'
    action.completedAt = new Date().toISOString()
    item.stage = 'publisher-ready'
    record('package-completed', { platform, run: run.id })
  } else if (item.stage === 'publisher-ready') publish(platform)
  else if (item.stage === 'published-native') {
    publisherReceipt(platform)
    dispatch(platform, 'installer', { release_version: '2.2.30', release_profile: 'uar-enabled',
      platforms: platform, [`uar_${platform.replaceAll('-', '_')}_record_url`]: item.recordUrl })
  } else if (item.stage === 'installer') {
    const run = readRun(item.installerRun, 'installer')
    observe(platform, 'installer', run)
    if (run.status !== 'completed') return
    assert(run.conclusion === 'success', 'Installer run failed; retain run and ask root to repair, do not redispatch')
    const action = item.actions.findLast(value => value.kind === 'installer' && value.run === run.id)
    assert(action, 'Installer outcome has no recorded dispatch identity')
    action.status = 'succeeded'
    action.completedAt = new Date().toISOString()
    item.stage = 'installer-complete'
    record('installer-workflow-completed', { platform, run: run.id,
      qualification: 'Metadata/site publication and installed operation require separate root receipts' })
    console.log(JSON.stringify({ platform, stage: item.stage, run: run.id }))
  } else throw new Error(`Unsupported recorded stage: ${item.stage}`)
}
function reconcileRun(argument) {
  const [platform, kind, text, ...extra] = argument.split(':')
  assert(nativeRuns[platform] && ['package', 'installer'].includes(kind) && /^\d+$/.test(text) && !extra.length,
    'Use --reconcile-run PLATFORM:package|installer:RUN after root checks actual inputs')
  const item = state.platforms[platform]
  const action = item.actions.findLast(value => value.kind === kind)
  assert(action && ['intent-recorded', 'unknown', 'acknowledged-needs-reconciliation'].includes(action.status),
    'No unresolved recorded dispatch exists for reconciliation')
  const run = readRun(Number(text), kind)
  assert(!action.run || action.run === run.id, 'Cannot replace an acknowledged run')
  assert(Date.parse(run.created_at) >= Date.parse(action.intendedAt) - 5000, 'Run predates recorded intent')
  const name = kind === 'package' ? `Reuse UAR (${platform})` : `Installer (${platform})`
  selectedJob(run.id, name)
  action.status = 'root-reconciled'
  action.run = run.id
  action.reconciledAt = new Date().toISOString()
  action.authority = 'Explicit root command asserts actual workflow inputs match the retained intent'
  item[`${kind}Run`] = run.id
  item.stage = kind
  delete item.blocked
  record('dispatch-root-reconciled', { platform, actionId: action.id, run: run.id })
}
function retryPublication(platform) {
  const item = state.platforms[platform]
  const action = item?.actions.findLast(value => value.kind === 'publisher')
  assert(action?.status === 'unknown',
    'No uncertain publisher attempt exists for the selected platform')
  action.status = 'retry-authorized'
  action.retryAuthorizedAt = new Date().toISOString()
  item.stage = 'publisher-ready'
  delete item.blocked
  record('publisher-retry-authorized', { platform,
    authority: 'Explicit root retry; strict publisher reconciles existing immutable assets' })
}
if (mode === 'status') { console.log(JSON.stringify(summary(), null, 2)); process.exit(0) }
fs.mkdirSync(directory, { recursive: true, mode: 0o700 })
try {
  if (fs.existsSync(lockPath)) {
    const owner = JSON.parse(fs.readFileSync(lockPath, 'utf8'))
    assert(recoverLock && Number.isInteger(owner.pid) && !alive(owner.pid),
      `Operation lock retained (PID ${owner.pid}); concurrent writers prohibited. Explicit dead-owner recovery required.`)
    fs.renameSync(lockPath, `${lockPath}.recovered-${randomUUID()}`)
  }
  durable(lockPath, JSON.stringify({ pid: process.pid, acquiredAt: new Date().toISOString(), contract }) + '\n', 'wx')
  lockOwned = true
  // Reload only after ownership, so a simultaneous opener cannot use stale state.
  sequence = 0
  state = load()
  if (!sequence) record('operation-created')
  for (const [platform, item] of Object.entries(state.platforms)) {
    const pending = item.actions.findLast(action => ['intent-recorded', 'unknown', 'acknowledged-needs-reconciliation'].includes(action.status))
    if (pending && !item.blocked) block(platform, `Unfinished ${pending.kind} effect ${pending.id}; explicit root reconciliation required`)
  }
  const producerHead = api(`repos/${repository}/git/ref/heads/${producerRef}`).object.sha
  assert(producerHead === producer, 'Producer branch advanced; frozen package dispatch must be reconciled before proceeding')
  let tagged = api(`repos/${repository}/git/ref/tags/${installerRef}`).object
  while (tagged.type === 'tag') tagged = api(`repos/${repository}/git/tags/${tagged.sha}`).object
  assert(tagged.type === 'commit' && tagged.sha === installerSource, 'Immutable installer tag no longer matches frozen source')
  if (reconcile) reconcileRun(reconcile)
  if (retryPublisher) retryPublication(retryPublisher)
  record('session-started', { pid: process.pid, maxMinutes, originalClockPreserved: true })
  while (!stopped && Date.now() < deadline) {
    for (const platform of Object.keys(nativeRuns)) {
      if (stopped || Date.now() >= deadline) break
      try { await advance(platform) } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown operation error'
        // Do not project gh stderr, credentials, environment or publisher logs.
        block(platform, message.includes('Command failed:') ? 'External command failed; inspect retained action and reconcile with root' : message)
      }
    }
    if (Object.values(state.platforms).every(item => item.blocked || item.stage === 'installer-complete')) break
    const remaining = deadline - Date.now()
    if (remaining > 0 && !stopped) await new Promise(resolve => setTimeout(resolve, Math.min(60_000, remaining)))
  }
  record('session-ended', { reason: stopped ? 'interrupted' : Date.now() >= deadline ? 'bounded-budget-ended' : 'completed-or-root-reconciliation-required' })
  console.log(JSON.stringify(summary(), null, 2))
  if (Object.values(state.platforms).some(item => item.blocked)) process.exitCode = 2
} catch (error) {
  console.error(error instanceof Error && !error.message.includes('Command failed:') ? error.message : 'Release operation stopped; no automatic retry')
  process.exitCode = 1
} finally {
  if (lockOwned) fs.unlinkSync(lockPath)
}
