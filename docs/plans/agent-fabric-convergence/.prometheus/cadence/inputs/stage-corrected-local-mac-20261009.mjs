import fs from 'node:fs'
import path from 'node:path'
import { createHash, randomUUID } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
const { verifyPackagedUarPayload } = createRequire(import.meta.url)('/Users/gqadonis/Projects/prometheus/worktrees/afc-c16-team-guidance/scripts/uar-payload-integrity.cjs')

const [imageArgument, bossSource, nativeRecordArgument] = process.argv.slice(2)
if (!imageArgument || !/^[a-f0-9]{40}$/.test(bossSource ?? '') || !nativeRecordArgument) {
  throw new Error('Provide actual built DMG, frozen Boss source and packaged native record')
}
const image = path.resolve(imageArgument)
const nativeRecord = JSON.parse(fs.readFileSync(nativeRecordArgument, 'utf8'))
const directory = path.join(process.cwd(), '.prometheus/cadence/artifacts', 'customer-local-mac-2.2.26-' + randomUUID())
fs.mkdirSync(directory, { recursive: true })
const receipt = { schemaVersion: 1, kind: 'local-mac-installer-installation', version: '2.2.26',
  source: bossSource, startedAt: new Date().toISOString(), installerPath: image,
  status: 'pending', functionalOperation: 'not-performed', installedAcceptance: 'pending',
  publication: 'not-public-artifact', nativeRecordPath: path.resolve(nativeRecordArgument) }
async function digest(filename) {
  const hash = createHash('sha256')
  for await (const chunk of fs.createReadStream(filename)) hash.update(chunk)
  return hash.digest('hex')
}
const mount = path.join(directory, 'mounted')
let mounted = false
try {
  receipt.size = fs.statSync(image).size
  receipt.sha256 = await digest(image)
  receipt.nativeRecordSha256 = await digest(nativeRecordArgument)
  fs.mkdirSync(mount)
  execFileSync('hdiutil', ['attach', '-readonly', '-nobrowse', '-mountpoint', mount, image], { stdio: 'ignore' })
  mounted = true
  const app = path.join(directory, 'installed/The Boss.app')
  fs.mkdirSync(path.dirname(app), { recursive: true })
  execFileSync('ditto', [path.join(mount, 'The Boss.app'), app], { stdio: 'ignore' })
  const actualVersion = execFileSync('/usr/libexec/PlistBuddy', ['-c', 'Print :CFBundleShortVersionString',
    path.join(app, 'Contents/Info.plist')], { encoding: 'utf8' }).trim()
  if (actualVersion !== receipt.version) throw new Error('Copied local package version differs from corrective version')
  const resources = path.join(app, 'Contents/Resources')
  const nativeDirectory = path.join(resources, 'app.asar.unpacked/resources/binaries/darwin-arm64')
  const manifest = JSON.parse(fs.readFileSync(path.join(nativeDirectory, 'payload-manifest.json'), 'utf8'))
  if (manifest.source !== nativeRecord.source || manifest.platform !== 'darwin-arm64' ||
      manifest.archiveSha256 !== nativeRecord.sha256) throw new Error('Installed native provenance differs from built payload')
  const native = path.join(nativeDirectory, 'uar-sidecar')
  const expected = manifest.files.find(file => file.path === 'uar-sidecar')
  receipt.app = app
  receipt.appAsarSha256 = await digest(path.join(resources, 'app.asar'))
  receipt.sidecarSha256 = await digest(native)
  if (!expected) throw new Error('Native executable is absent from payload inventory')
  verifyPackagedUarPayload(resources, 'darwin-arm64', { localUar: true, allowPlatformSigning: true })
  receipt.nativeIntegrity = { method: 'production-signature-aware-payload-validator',
    originalPayloadSha256: expected.sha256, installedSignedSha256: receipt.sidecarSha256 } 
  receipt.uarSource = manifest.source
  for (const [name, executable, args] of [
    ['signature', 'codesign', ['--verify', '--deep', '--strict', app]],
    ['gatekeeper', 'spctl', ['--assess', '--type', 'execute', app]]
  ]) {
    try {
      execFileSync(executable, args, { stdio: 'ignore' })
      receipt[name] = 'passed'
    } catch (error) {
      receipt[name] = 'not-accepted-local-build'
      receipt[name + 'ExitCode'] = error.status ?? null
    }
  }
  receipt.installation = 'copied-from-actual-local-DMG-into-disposable-directory'
  receipt.status = 'passed'
} catch (error) {
  receipt.status = 'failed'
  receipt.failure = error.message
} finally {
  if (mounted) execFileSync('hdiutil', ['detach', mount], { stdio: 'ignore' })
  receipt.finishedAt = new Date().toISOString()
  const receiptPath = path.join(directory, 'installation.json')
  fs.writeFileSync(receiptPath, JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx', mode: 0o600 })
  console.log(JSON.stringify({ status: receipt.status, receiptPath, app: receipt.app,
    version: receipt.version, signature: receipt.signature, gatekeeper: receipt.gatekeeper }))
  process.exitCode = receipt.status === 'passed' ? 0 : 1
}
