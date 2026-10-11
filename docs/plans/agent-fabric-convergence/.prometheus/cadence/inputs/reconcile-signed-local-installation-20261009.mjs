import fs from 'node:fs'
import path from 'node:path'
import { createHash, randomUUID } from 'node:crypto'
import { createRequire } from 'node:module'
import { execFileSync } from 'node:child_process'

const { verifyPackagedUarPayload } = createRequire(import.meta.url)('/Users/gqadonis/Projects/prometheus/worktrees/afc-c16-team-guidance/scripts/uar-payload-integrity.cjs')
const priorPath = path.resolve(process.argv[2])
const prior = JSON.parse(fs.readFileSync(priorPath, 'utf8'))
if (prior.status !== 'failed' || prior.failure !== 'Copied native executable differs from packaged file manifest') {
  throw new Error('Only the observed signed-executable receipt failure is eligible')
}
async function digest(file) {
  const hash = createHash('sha256')
  for await (const chunk of fs.createReadStream(file)) hash.update(chunk)
  return hash.digest('hex')
}
const resources = path.join(prior.app, 'Contents/Resources')
const native = path.join(resources, 'app.asar.unpacked/resources/binaries/darwin-arm64/uar-sidecar')
if (await digest(prior.installerPath) !== prior.sha256 || await digest(path.join(resources, 'app.asar')) !== prior.appAsarSha256 ||
    await digest(native) !== prior.sidecarSha256 || await digest(prior.nativeRecordPath) !== prior.nativeRecordSha256) {
  throw new Error('Previously copied package or its immutable input changed')
}
const payload = verifyPackagedUarPayload(resources, 'darwin-arm64', { localUar: true, allowPlatformSigning: true })
const manifest = JSON.parse(fs.readFileSync(path.join(payload.payloadDir, 'payload-manifest.json'), 'utf8'))
const record = JSON.parse(fs.readFileSync(prior.nativeRecordPath, 'utf8'))
if (manifest.source !== record.source || manifest.archiveSha256 !== record.sha256) throw new Error('Native source identity changed')
execFileSync('codesign', ['--verify', '--deep', '--strict', prior.app], { stdio: 'ignore' })
let gatekeeper = 'passed'
try { execFileSync('spctl', ['--assess', '--type', 'execute', prior.app], { stdio: 'ignore' }) }
catch { gatekeeper = 'not-accepted-local-build' }
const { failure: _failure, ...retained } = prior
const receipt = { ...retained, status: 'passed', signature: 'passed', gatekeeper, uarSource: manifest.source,
  supersedesFailedPreparation: { path: priorPath, sha256: await digest(priorPath) },
  reconciliationStartedAt: new Date().toISOString(),
  nativeIntegrity: { method: 'production-signature-aware-payload-validator',
    originalPayloadSha256: manifest.files.find(file => file.path === 'uar-sidecar').sha256,
    installedSignedSha256: prior.sidecarSha256 },
  installation: 'copied-from-actual-local-DMG-into-disposable-directory',
  finishedAt: new Date().toISOString() }
const receiptPath = path.join(path.dirname(priorPath), 'installation-signed-' + randomUUID() + '.json')
fs.writeFileSync(receiptPath, JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx', mode: 0o600 })
console.log(JSON.stringify({ status: receipt.status, receiptPath, signature: receipt.signature, gatekeeper }))
