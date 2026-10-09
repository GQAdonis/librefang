import fs from 'node:fs'
import path from 'node:path'
import { spawn, execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'

const repository = '/Users/gqadonis/Projects/prometheus/worktrees/afc-c16-team-guidance'
const nativeSource = path.join(repository, 'build/integration-source/uar')
const source = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repository, encoding: 'utf8' }).trim()
const nativeRevision = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: nativeSource, encoding: 'utf8' }).trim()
const record = JSON.parse(fs.readFileSync(path.join(nativeSource, 'dist/boss-sidecar/uar-sidecar-darwin-arm64.json'), 'utf8'))
if (nativeRevision !== record.source || nativeRevision !== '1522f17944aec1e1a7db5eab3b647e732fc1a07f') {
  throw new Error('Corrective native archive does not match completed source')
}
const directory = path.join(process.cwd(), '.prometheus/cadence/artifacts', 'customer-build-2.2.26-' + randomUUID())
fs.mkdirSync(directory, { recursive: true })
const output = fs.createWriteStream(path.join(directory, 'build.log'), { flags: 'wx', mode: 0o600 })
const receipt = { schemaVersion: 1, kind: 'actual-corrective-mac-installer-build',
  startedAt: new Date().toISOString(), source, uarSource: record.source,
  nativeArchiveSha256: record.sha256, workingDirectory: repository,
  executable: 'pnpm', args: ['build:mac:arm64'], version: '2.2.26',
  reason: 'Complete observed grant, native-tool startup and team-policy repairs with desktop controls',
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
