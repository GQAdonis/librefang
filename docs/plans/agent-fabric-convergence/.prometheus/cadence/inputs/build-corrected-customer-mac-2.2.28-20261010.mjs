import fs from 'node:fs'
import path from 'node:path'
import { spawn, execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'

const repository = '/Users/gqadonis/Projects/prometheus/worktrees/afc-c16-team-guidance'
const nativeSource = path.join(repository, 'build/integration-source/uar')
const source = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repository, encoding: 'utf8' }).trim()
if (source !== '6de6477cdddb0886387dcb752913c43bf3ec3de2' || JSON.parse(fs.readFileSync(path.join(repository, 'package.json'), 'utf8')).version !== '2.2.28') {
  throw new Error('Corrective Boss checkout does not match frozen 2.2.28 source')
}
const nativeRevision = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: nativeSource, encoding: 'utf8' }).trim()
const record = JSON.parse(fs.readFileSync(path.join(nativeSource, 'dist/boss-sidecar/uar-sidecar-darwin-arm64.json'), 'utf8'))
if (nativeRevision !== record.source || nativeRevision !== '66b36bb54feb24bb1bd660c5f1e6a50bdf7d4ad4') {
  throw new Error('Corrective native archive does not match completed source')
}
const directory = path.join(process.cwd(), '.prometheus/cadence/artifacts', 'customer-build-2.2.28-' + randomUUID())
fs.mkdirSync(directory, { recursive: true })
const output = fs.createWriteStream(path.join(directory, 'build.log'), { flags: 'wx', mode: 0o600 })
const receipt = { schemaVersion: 1, kind: 'actual-corrective-mac-installer-build',
  startedAt: new Date().toISOString(), source, uarSource: record.source,
  nativeArchiveSha256: record.sha256, workingDirectory: repository,
  executable: 'pnpm', args: ['build:mac:arm64'], version: '2.2.28',
  reason: 'Repair observed stale completed-run follow-up admission, scoped model discovery, and gateway context-capacity defects; historical builds and receipts preserved',
  status: 'running', newCadenceDelivery: false }
const receiptPath = path.join(directory, 'build.json')
fs.writeFileSync(receiptPath, JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx', mode: 0o600 })
console.log(JSON.stringify({ startedAt: receipt.startedAt, source, receiptPath }))
const child = spawn('pnpm', ['build:mac:arm64'], { cwd: repository, shell: false,
  env: { ...process.env, THE_BOSS_LOCAL_UAR_SOURCE_DIR: nativeSource }, stdio: ['ignore', 'pipe', 'pipe'] })
child.stdout.on('data', chunk => { output.write(chunk); process.stdout.write(chunk) })
child.stderr.on('data', chunk => { output.write(chunk); process.stderr.write(chunk) })
child.on('error', error => { receipt.failure = error.code ?? 'BUILD_PROCESS_ERROR' })
const [exitCode, terminationSignal] = await new Promise(resolve => child.once('close', (...values) => resolve(values)))
await new Promise(resolve => output.end(resolve))
receipt.finishedAt = new Date().toISOString()
receipt.elapsedMs = Date.parse(receipt.finishedAt) - Date.parse(receipt.startedAt)
receipt.exitCode = exitCode
receipt.terminationSignal = terminationSignal
receipt.sourceAfter = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repository, encoding: 'utf8' }).trim()
receipt.status = exitCode === 0 && receipt.sourceAfter === source ? 'passed' : 'failed'
receipt.launch = 'not-performed'
receipt.featureOperation = 'not-performed'
fs.writeFileSync(receiptPath, JSON.stringify(receipt, null, 2) + '\n', { mode: 0o600 })
console.log(JSON.stringify({ status: receipt.status, exitCode, receiptPath }))
process.exitCode = receipt.status === 'passed' ? 0 : 1
