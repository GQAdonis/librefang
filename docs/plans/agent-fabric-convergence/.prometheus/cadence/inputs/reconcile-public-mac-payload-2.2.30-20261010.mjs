import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'

const root = process.cwd()
const directory = path.join(root, '.prometheus/cadence/artifacts/customer-public-mac-2.2.30')
const previousPath = path.join(directory, 'installation.json')
const output = path.join(directory, 'installation-public-reconciled.json')
const previous = JSON.parse(fs.readFileSync(previousPath, 'utf8'))
const nativeReceipt = JSON.parse(fs.readFileSync(path.join(root,
  '.prometheus/cadence/artifacts/customer-uar-308aea46-darwin-arm64-local-published-20261010.json'), 'utf8'))
const repository = '/Users/gqadonis/Projects/prometheus/worktrees/afc-c16-team-guidance'
const require = createRequire(import.meta.url)
const hash = bytes => createHash('sha256').update(bytes).digest('hex')
const digest = async file => {
  const checksum = createHash('sha256')
  for await (const chunk of fs.createReadStream(file)) checksum.update(chunk)
  return checksum.digest('hex')
}
const receipt = { ...previous, status: 'pending', startedAt: new Date().toISOString(),
  previousAttempt: { path: previousPath, sha256: hash(fs.readFileSync(previousPath)), status: previous.status },
  correction: 'Public installer validation uses its immutable published payload record, not a local-build marker.',
  newCadenceDelivery: false }
delete receipt.failure
delete receipt.finishedAt
try {
  if (previous.source !== 'aef2ec2cda68605efab9dddf33b46e726e752c2d' || previous.version !== '2.2.30' ||
      previous.uarSource !== nativeReceipt.source || previous.status !== 'failed' ||
      !previous.failure?.includes('.uar-local-payload.json') ||
      !['signature', 'gatekeeper', 'notarization'].every(key => previous[key] === 'passed'))
    throw new Error('Previous attempt does not match this bounded public-mode correction')
  if (await digest(previous.installerPath) !== previous.sha256 || fs.statSync(previous.installerPath).size !== previous.size)
    throw new Error('Retained public DMG bytes changed')
  const recordResponse = await fetch(nativeReceipt.recordUrl)
  if (!recordResponse.ok) throw new Error('Published native record unavailable')
  const recordBytes = Buffer.from(await recordResponse.arrayBuffer())
  const expectedRecord = nativeReceipt.publicAssets.find(item => item.name === 'uar-sidecar-darwin-arm64.json')
  if (hash(recordBytes) !== expectedRecord.sha256) throw new Error('Published native record bytes changed')
  const artifact = JSON.parse(recordBytes)
  if (artifact.source !== previous.uarSource || artifact.platform !== 'darwin-arm64' || artifact.version !== '1.0.0')
    throw new Error('Public native provenance differs from installer')
  const validatorPath = path.join(repository, 'scripts/uar-payload-integrity.cjs')
  const validatorBytes = execFileSync('git', ['show', previous.source + ':scripts/uar-payload-integrity.cjs'],
    { cwd: repository })
  // Execute the unchanged frozen production validator with the same immutable
  // artifact override consumed by the public packaging job. No source files change.
  const integration = { sources: { uar: { revision: previous.uarSource } },
    tools: [{ name: 'uar-sidecar', version: artifact.version, packages: { 'darwin-arm64': artifact } }] }
  const module = { exports: {} }
  const releaseRequire = id => id === path.join(repository, 'build/integration-artifacts.json') ? integration : require(id)
  const wrapper = vm.runInThisContext('(function(require,module,exports,__dirname){' + validatorBytes + '\n})',
    { filename: validatorPath })
  wrapper(releaseRequire, module, module.exports, path.dirname(validatorPath))
  const resources = path.join(previous.app, 'Contents/Resources')
  const native = module.exports.verifyPackagedUarPayload(resources, 'darwin-arm64', { allowPlatformSigning: true })
  receipt.appAsarSha256 = await digest(path.join(resources, 'app.asar'))
  receipt.sidecarSha256 = await digest(native.executable)
  receipt.nativeIntegrity = 'unchanged-frozen-production-public-payload-validator-with-immutable-release-override-passed'
  receipt.validatorSha256 = hash(validatorBytes)
  receipt.nativeRecordUrl = nativeReceipt.recordUrl
  receipt.nativeRecordSha256 = expectedRecord.sha256
  receipt.installation = 'copied-from-verified-public-DMG-into-isolated-directory'
  receipt.publication = 'actual-notarized-GitHub-public-installer'
  receipt.status = 'passed'
} catch (error) {
  receipt.status = 'failed'
  receipt.failure = error.message
} finally {
  receipt.finishedAt = new Date().toISOString()
  fs.writeFileSync(output, JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx', mode: 0o600 })
  console.log(JSON.stringify({ status: receipt.status, receiptPath: output, failure: receipt.failure }))
  process.exitCode = receipt.status === 'passed' ? 0 : 1
}
