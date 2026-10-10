import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { execFileSync } from 'node:child_process'
import { pipeline } from 'node:stream/promises'
import { Readable } from 'node:stream'

const root = process.cwd()
const source = 'aef2ec2cda68605efab9dddf33b46e726e752c2d'
const nativeSource = '308aea46ff26e7f61340281bb51f67ebe5351569'
const directory = path.join(root, '.prometheus/cadence/artifacts/customer-public-mac-2.2.30')
const manifestName = `release-platform-v2.2.30-uar-enabled-darwin-arm64-${source}.json`
const base = 'https://github.com/Prometheus-AGS/the-boss/releases/download/v2.2.30/'
const { verifyPackagedUarPayload } = createRequire(import.meta.url)(
  '/Users/gqadonis/Projects/prometheus/worktrees/afc-c16-team-guidance/scripts/uar-payload-integrity.cjs')
fs.mkdirSync(directory, { recursive: true })
const receiptPath = path.join(directory, 'installation.json')
if (fs.existsSync(receiptPath)) throw new Error('Existing installation receipt preserved; reconcile it before another operation')
const receipt = { schemaVersion: 1, kind: 'public-mac-installer-installation', version: '2.2.30',
  source, uarSource: nativeSource, startedAt: new Date().toISOString(),
  status: 'pending', functionalOperation: 'not-performed', installedAcceptance: 'pending' }
async function digest(file) {
  const hash = createHash('sha256')
  for await (const chunk of fs.createReadStream(file)) hash.update(chunk)
  return hash.digest('hex')
}
const mount = path.join(directory, 'mounted')
let mounted = false
try {
  const response = await fetch(base + manifestName)
  if (!response.ok) throw new Error(`Public installer manifest HTTP ${response.status}`)
  const manifestBytes = Buffer.from(await response.arrayBuffer())
  const manifest = JSON.parse(manifestBytes)
  if (manifest.version !== receipt.version || manifest.source !== source || manifest.profile !== 'uar-enabled' ||
      manifest.platform !== 'darwin' || manifest.arch !== 'arm64' || manifest.features?.uar !== true ||
      manifest.artifacts?.length !== 1) throw new Error('Immutable public platform manifest differs from frozen candidate')
  const expected = manifest.artifacts[0]
  if (expected.name !== 'The-Boss-2.2.30-mac-arm64.dmg' || expected.url !== base + expected.name ||
      expected.signing !== 'Developer ID (notarized)') throw new Error('Public installer identity or signing differs')
  receipt.platformManifestUrl = base + manifestName
  receipt.platformManifestSha256 = createHash('sha256').update(manifestBytes).digest('hex')
  fs.writeFileSync(path.join(directory, manifestName), manifestBytes, { flag: 'wx', mode: 0o600 })
  const image = path.join(directory, expected.name)
  if (!fs.existsSync(image)) {
    const download = await fetch(expected.url)
    if (!download.ok) throw new Error(`Public installer HTTP ${download.status}`)
    await pipeline(Readable.fromWeb(download.body), fs.createWriteStream(image, { flags: 'wx', mode: 0o600 }))
  }
  receipt.installer = expected.url
  receipt.installerPath = image
  receipt.size = fs.statSync(image).size
  receipt.sha256 = await digest(image)
  if (receipt.size !== expected.size || receipt.sha256 !== expected.sha256) throw new Error('Public downloaded bytes differ from immutable manifest')
  fs.mkdirSync(mount)
  execFileSync('hdiutil', ['attach', '-readonly', '-nobrowse', '-mountpoint', mount, image], { stdio: 'ignore' })
  mounted = true
  const app = path.join(directory, 'installed/The Boss.app')
  fs.mkdirSync(path.dirname(app), { recursive: true })
  execFileSync('ditto', [path.join(mount, 'The Boss.app'), app], { stdio: 'ignore' })
  receipt.app = app
  const actualVersion = execFileSync('/usr/libexec/PlistBuddy', ['-c', 'Print :CFBundleShortVersionString',
    path.join(app, 'Contents/Info.plist')], { encoding: 'utf8' }).trim()
  if (actualVersion !== receipt.version) throw new Error('Installed application version differs')
  for (const [name, executable, args] of [
    ['signature', 'codesign', ['--verify', '--deep', '--strict', app]],
    ['gatekeeper', 'spctl', ['--assess', '--type', 'execute', app]],
    ['notarization', 'xcrun', ['stapler', 'validate', app]]
  ]) {
    execFileSync(executable, args, { stdio: 'ignore' })
    receipt[name] = 'passed'
  }
  const resources = path.join(app, 'Contents/Resources')
  const native = path.join(resources, 'app.asar.unpacked/resources/binaries/darwin-arm64')
  const payload = JSON.parse(fs.readFileSync(path.join(native, 'payload-manifest.json'), 'utf8'))
  if (payload.source !== nativeSource || payload.platform !== 'darwin-arm64') throw new Error('Installed native provenance differs')
  verifyPackagedUarPayload(resources, 'darwin-arm64', { localUar: true, allowPlatformSigning: true })
  receipt.appAsarSha256 = await digest(path.join(resources, 'app.asar'))
  receipt.sidecarSha256 = await digest(path.join(native, 'uar-sidecar'))
  receipt.nativeIntegrity = 'production-signature-aware-payload-validator-passed'
  receipt.installation = 'copied-from-verified-public-DMG-into-isolated-directory'
  receipt.status = 'passed'
} catch (error) {
  receipt.status = 'failed'
  receipt.failure = error.message
} finally {
  if (mounted) execFileSync('hdiutil', ['detach', mount], { stdio: 'ignore' })
  receipt.finishedAt = new Date().toISOString()
  fs.writeFileSync(receiptPath, JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx', mode: 0o600 })
  console.log(JSON.stringify({ status: receipt.status, receiptPath, app: receipt.app,
    signature: receipt.signature, gatekeeper: receipt.gatekeeper, notarization: receipt.notarization,
    failure: receipt.failure }))
  process.exitCode = receipt.status === 'passed' ? 0 : 1
}
