import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'

const source = '308aea46ff26e7f61340281bb51f67ebe5351569'
const producer = '824fa5ed40999830196b6c5125faf2ebcf6a8ce4'
const packageRepository = 'Prometheus-AGS/the-boss'
const repository = 'Prometheus-AGS/universal-agent-runtime'
const cadence = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const platform = "darwin-arm64"
const name = "uar-sidecar-darwin-arm64"
const archiveName = name + ".tar.gz"
const recordName = name + ".json"
const tag = "boss-sidecar-darwin-arm64-v1.0.0-2.2.30-308aea46-local"
const output = path.join(cadence, "artifacts/customer-uar-308aea46-native-local-darwin-arm64")
const download = "/Users/gqadonis/Projects/prometheus/worktrees/afc-c16-team-guidance/build/integration-source/uar/dist/boss-sidecar"
const buildPath = path.join(cadence,"artifacts/customer-native-2.2.29-042437a2-191e-48ad-b502-5d2d8c8811ad/build.json")
const build = JSON.parse(fs.readFileSync(buildPath,"utf8"))
const hash = bytes => createHash('sha256').update(bytes).digest('hex')
const gh = args => execFileSync('gh', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
const api = endpoint => JSON.parse(gh(['api', endpoint]))
function optionalApi(endpoint) {
  try { return api(endpoint) } catch (error) {
    if (String(error.stderr).includes('(HTTP 404)')) return undefined
    throw error
  }
}
function assert(condition, message) {
  if (!condition) throw new Error(message)
}
assert(build.status === "passed" && build.source === source, "Local native build provenance differs from final source")
fs.mkdirSync(output,{recursive:true})
const archivePath = path.join(download,archiveName)
const recordPath = path.join(download,recordName)
assert(fs.existsSync(archivePath) && fs.existsSync(recordPath),"Completed local native archive missing")
const archiveBytes = fs.readFileSync(archivePath)
const recordBytes = fs.readFileSync(recordPath)
const record = JSON.parse(recordBytes.toString('utf8'))
assert(record.name === 'uar-sidecar' && record.source === source && record.version === '1.0.0' &&
  record.platform === platform && record.asset === archiveName && record.archive === 'tar.gz',
  'Actual package metadata differs from frozen source/version/platform/asset')
assert(hash(archiveBytes) === record.sha256, 'Actual archive checksum differs from package record')
assert(record.size === undefined || record.size === archiveBytes.length, 'Actual archive size differs from package record')
assert(Array.isArray(record.features) && record.features.includes('server-full'), 'Required server-full feature missing')
const executable = 'uar-sidecar' + (platform.startsWith('win32-') ? '.exe' : '')
const required = [executable, 'payload-manifest.json', 'uar-models/config.json',
  'policies/default.cedar', 'policies/skill-mutation.cedar', 'policies/tool-approval.cedar']
assert(Array.isArray(record.binaries) && required.every(file => record.binaries.includes(file)),
  'Package record lacks required executable/model/policy closure')
const inventory = execFileSync('tar', ['tzf', archivePath], { encoding: 'utf8' }).trim().split('\n')
assert(required.every(file => inventory.includes(`${name}/${file}`)), 'Archive lacks required payload closure')
if (platform.startsWith('win32-')) {
  assert(record.binaries.some(file => file.toLowerCase().endsWith('.dll') && inventory.includes(`${name}/${file}`)),
    'Windows archive lacks runtime DLL closure')
}
const payload = JSON.parse(execFileSync('tar', ['xOzf', archivePath, `${name}/payload-manifest.json`], { encoding: 'utf8' }))
assert(payload.source === source && payload.version === '1.0.0' && payload.platform === platform,
  'Embedded payload manifest differs from package record')
const notes = path.join(path.dirname(fileURLToPath(import.meta.url)), 'customer-uar-308aea46-native-local-release-notes-20261010.md')
let ref = optionalApi(`repos/${repository}/git/ref/tags/${tag}`)
if (ref) {
  let object = ref.object
  while (object.type === 'tag') object = api(`repos/${repository}/git/tags/${object.sha}`).object
  assert(object.type === 'commit' && object.sha === source, 'Existing release tag conflicts with exact source')
} else {
  gh(['api', '--method', 'POST', `repos/${repository}/git/refs`, '-f', `ref=refs/tags/${tag}`, '-f', `sha=${source}`])
}
let release = optionalApi(`repos/${repository}/releases/tags/${tag}`)
if (!release) {
  execFileSync('gh', ['release', 'create', tag, '--repo', repository, '--verify-tag', '--title',
    `UAR ${platform} v1.0.0 The Boss 2.2.30 local 308aea46`, '--notes-file', notes], { stdio: 'inherit' })
  release = api(`repos/${repository}/releases/tags/${tag}`)
}
assert(!release.draft && release.tag_name === tag, 'Existing release is not the expected public release')
const localAssets = [{ filename: archiveName, file: archivePath, bytes: archiveBytes },
  { filename: recordName, file: recordPath, bytes: recordBytes }]
const verification = []
for (const local of localAssets) {
  const digest = hash(local.bytes)
  let asset = release.assets.find(item => item.name === local.filename)
  if (!asset) {
    execFileSync('gh', ['release', 'upload', tag, '--repo', repository, local.file], { stdio: 'inherit' })
    release = api(`repos/${repository}/releases/tags/${tag}`)
    asset = release.assets.find(item => item.name === local.filename)
  }
  assert(asset && asset.state === 'uploaded' && asset.size === local.bytes.length && asset.digest === `sha256:${digest}`,
    `GitHub asset metadata conflicts with local bytes: ${local.filename}`)
  const expectedUrl = `https://github.com/${repository}/releases/download/${tag}/${local.filename}`
  assert(asset.browser_download_url === expectedUrl, 'GitHub asset URL differs from selected release')
  const response = await fetch(expectedUrl)
  assert(response.ok, `Public download failed: ${local.filename} HTTP ${response.status}`)
  const publicBytes = Buffer.from(await response.arrayBuffer())
  assert(publicBytes.equals(local.bytes) && hash(publicBytes) === digest, `Public bytes conflict: ${local.filename}`)
  const publicPath = path.join(output, `public-${local.filename}`)
  if (fs.existsSync(publicPath)) assert(fs.readFileSync(publicPath).equals(publicBytes), 'Existing public byte evidence conflicts')
  else fs.writeFileSync(publicPath, publicBytes, { flag: 'wx' })
  verification.push({ name: local.filename, assetId: asset.id, url: expectedUrl, size: publicBytes.length,
    sha256: digest, githubDigest: asset.digest, verifiedAt: new Date().toISOString(), path: publicPath })
}
const receiptPath = path.join(cadence, 'artifacts', `customer-uar-308aea46-${platform}-local-published-20261010.json`)
const receipt = {
  schemaVersion: 1, kind: 'published-complete-uar-native-payload', recordedAt: new Date().toISOString(),
  repository, source, version: '1.0.0', platform, buildProvenance: {kind:"actual-local-native-release-build",path:buildPath,sha256:hash(fs.readFileSync(buildPath)),startedAt:build.startedAt,finishedAt:build.finishedAt},
  tag, releaseUrl: release.html_url, recordPath,
  archiveUrl: verification[0].url, recordUrl: verification[1].url, size: archiveBytes.length,
  sha256: record.sha256, features: record.features, binaries: record.binaries, publicAssets: verification,
  verification: 'Actual package metadata, required archive closure, GitHub asset size/digest and equal public downloaded bytes',
  applicationInstallerDispatch: 'not-performed', operation: 'pending-packaged-application'
}
if (fs.existsSync(receiptPath)) {
  const previous = JSON.parse(fs.readFileSync(receiptPath, 'utf8'))
  assert(previous.source === source && previous.platform === platform && previous.buildProvenance?.sha256 === receipt.buildProvenance.sha256 && previous.sha256 === receipt.sha256 && previous.size === receipt.size &&
    previous.publicAssets?.every((asset, index) => asset.sha256 === verification[index]?.sha256 &&
      asset.url === verification[index]?.url), 'Existing publication receipt conflicts; preserved unchanged')
} else fs.writeFileSync(receiptPath, JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' })
console.log(JSON.stringify({ platform, tag, receiptPath, archiveUrl: receipt.archiveUrl, recordUrl: receipt.recordUrl }))
