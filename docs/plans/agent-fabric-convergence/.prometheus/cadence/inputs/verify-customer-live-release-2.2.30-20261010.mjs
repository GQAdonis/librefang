// Root operates this after the existing Lovable project's publication.
// Usage: node <this-file> --scope <win32-x64|win32-arm64|darwin-x64|all-four>
// Read-only remote operation: no installer downloads, publication or ledger writes.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash, randomUUID } from 'node:crypto'
import { execFileSync } from 'node:child_process'

const arguments_ = process.argv.slice(2)
const scopes = ['win32-x64', 'win32-arm64', 'darwin-x64', 'all-four']
if (arguments_.length !== 2 || arguments_[0] !== '--scope' || !scopes.includes(arguments_[1]))
  throw new Error('Usage: node verify-customer-live-release-2.2.30-20261010.mjs --scope <win32-x64|win32-arm64|darwin-x64|all-four>')
const scope = arguments_[1]
const website = 'https://the-boss.know-me.tools/'
const landing = 'Know-Me-Tools/boss-landing-spot'
const source = 'aef2ec2cda68605efab9dddf33b46e726e752c2d'
const inputDirectory = path.dirname(fileURLToPath(import.meta.url))
const initiative = path.resolve(inputDirectory, '../../..')
const receipts = path.join(initiative, 'receipts')
const startedAt = new Date().toISOString()
const operationId = randomUUID()
const stem = `customer-release-${scope}-2.2.30-live-website-${startedAt.replaceAll(/[:.]/g, '-')}-${operationId.slice(0, 8)}`
const safePath = path.join(receipts, `${stem}.json`)
const privateDirectory = path.join(inputDirectory, '..', 'artifacts', stem)
const privatePath = path.join(privateDirectory, 'verification.json')
const keys = ['darwin-arm64', 'darwin-x64', 'win32-x64', 'win32-arm64']
const assert = (condition, message) => { if (!condition) throw new Error(message) }
const hash = bytes => createHash('sha256').update(bytes).digest('hex')
const api = endpoint => JSON.parse(execFileSync('gh', ['api', endpoint],
  { encoding: 'utf8', shell: false, timeout: 120_000, stdio: ['ignore', 'pipe', 'pipe'] }))
function durable(file, value) {
  const fd = fs.openSync(file, 'wx', 0o600)
  try { fs.writeFileSync(fd, JSON.stringify(value, null, 2) + '\n'); fs.fsyncSync(fd) }
  finally { fs.closeSync(fd) }
  const directory = fs.openSync(path.dirname(file), 'r')
  try { fs.fsyncSync(directory) } finally { fs.closeSync(directory) }
}
function readEvidence(name) {
  const file = path.join(receipts, name)
  const bytes = fs.readFileSync(file)
  return { data: JSON.parse(bytes.toString('utf8')), reference: { path: path.relative(initiative, file), sha256: hash(bytes) } }
}
function installerEvidence(key, version) {
  if (version === '2.2.30' && key === 'darwin-arm64') {
    const { data, reference } = readEvidence('customer-public-mac-installation-2.2.30-20261010.json')
    assert(data.status === 'passed' && data.version === version && data.platform === key && data.sources?.boss === source &&
      data.checks?.signature === 'passed' && data.checks.gatekeeper === 'passed' && data.checks.notarization === 'passed',
    'Apple Silicon public installation/byte evidence does not match the new candidate')
    return { ...data.installer, signing: 'Developer ID (notarized)', source: data.sources.boss, reference,
      basis: 'Existing complete public-download and installed-package provenance receipt; final operator acceptance remains pending' }
  }
  if (version === '2.2.30') {
    const { data, reference } = readEvidence(`customer-public-${key}-2.2.30-20261010.json`)
    const download = data.downloads?.findLast(value => value.sha256 === data.artifact?.sha256)
    assert(data.status === 'passed' && data.version === version && data.profile === 'uar-enabled' &&
      data.source === source && data.selectedPlatform === key && download?.bytes === data.artifact?.size,
    `Existing ${key} byte verification does not match the new candidate`)
    return { ...data.artifact, source: data.source, reference,
      basis: 'Existing complete streamed public-byte verification; signing limitations preserved in referenced receipt' }
  }
  assert(version === '2.2.26', 'Pending platforms may retain only the identified previous complete 2.2.26 release')
  if (key === 'darwin-arm64') {
    const { data, reference } = readEvidence('customer-public-mac-arm64-2.2.26-20261010.json')
    assert(data.status === 'passed' && data.version === version && data.platform === key, 'Previous Apple Silicon byte evidence does not match')
    return { url: data.url, size: data.size, sha256: data.sha256, signing: data.signing,
      source: data.source, reference, basis: 'Previously retained complete public-byte receipt' }
  }
  if (key === 'darwin-x64') {
    const { data, reference } = readEvidence('customer-public-intel-2.2.26-20261010.json')
    assert(data.status === 'passed' && data.version === version && data.platform === 'darwin' && data.arch === 'x64' &&
      data.download?.bytes === data.artifact?.size && data.download?.sha256 === data.artifact?.sha256,
    'Previous Intel byte evidence does not match')
    return { ...data.artifact, source: data.source, reference, basis: 'Previously retained complete public-byte receipt' }
  }
  const { data, reference } = readEvidence('customer-public-windows-2.2.26-20261010.json')
  const entry = data.platforms?.[key]
  assert(data.version === version && entry?.version === version && entry.status === 'passed' &&
    entry.downloaded?.bytes === entry.artifact?.size && entry.downloaded.sha256 === entry.artifact.sha256,
  `Previous ${key} byte evidence does not match`)
  return { ...entry.artifact, source: entry.source, reference, basis: 'Previously retained complete public-byte receipt' }
}
function platformFor(item) {
  const match = item.file?.match(/^The-Boss-(2\.2\.(?:26|30))-(mac|win)-(arm64|x64)(\.dmg|-setup\.exe)$/)
  assert(match && match[1] === item.version &&
    ((match[2] === 'mac' && match[4] === '.dmg') || (match[2] === 'win' && match[4] === '-setup.exe')),
  'Landing installer filename/version is outside the approved customer release set')
  return `${match[2] === 'mac' ? 'darwin' : 'win32'}-${match[3]}`
}
const receipt = { schemaVersion: 1, kind: 'live-customer-release-website', operationId, scope,
  startedAt, status: 'in-progress', website, latestVersion: '2.2.30', landingRepository: landing,
  installers: [], publication: { method: 'Separate prior root publication through the existing Lovable project',
    projectId: 'c0ca344c-ebc5-4be2-9d02-46d3d9631118',
    evidence: 'Live served HTML/index JavaScript content and public installer HEAD responses only; this driver does not publish' },
  installedAcceptance: 'pending-final-candidate-operator-acceptance',
  newCadenceDelivery: false, qualificationLedgerMutated: false, cadenceCountersMutated: false,
  verifier: { runtime: 'Node.js', version: process.version,
    script: path.relative(initiative, fileURLToPath(import.meta.url)), sha256: hash(fs.readFileSync(fileURLToPath(import.meta.url))) } }
try {
  const branch = api(`repos/${landing}/git/ref/heads/main`)
  assert(branch.object?.type === 'commit' && /^[a-f0-9]{40}$/.test(branch.object.sha), 'Landing main does not resolve to one exact commit')
  receipt.landingSource = branch.object.sha
  const content = api(`repos/${landing}/contents/src/lib/release.json?ref=${receipt.landingSource}`)
  assert(content.type === 'file' && content.encoding === 'base64', 'Pinned landing release data is not an available file')
  const releaseBytes = Buffer.from(content.content, 'base64')
  const release = JSON.parse(releaseBytes.toString('utf8'))
  receipt.generatedRelease = { path: 'src/lib/release.json', commit: receipt.landingSource,
    blob: content.sha, sha256: hash(releaseBytes), bytes: releaseBytes.length }
  assert(release.version === '2.2.30' && release.installers?.length === 4, 'Landing source must contain the four supported customer platforms at latest version 2.2.30')
  const entries = release.installers.map(item => ({ item, key: platformFor(item) }))
  assert(new Set(entries.map(entry => entry.key)).size === 4 && entries.every(entry => keys.includes(entry.key)),
    'Landing source has duplicate or unsupported platforms')
  for (const { item, key } of entries) {
    const requiredNew = scope === 'all-four' || key === scope || key === 'darwin-arm64'
    assert(!requiredNew || item.version === '2.2.30', `${key} is required at 2.2.30 for this scope`)
    const evidence = installerEvidence(key, item.version)
    const expectedUrl = `https://github.com/Prometheus-AGS/the-boss/releases/download/v${item.version}/${item.file}`
    assert(item.url === expectedUrl && item.url === evidence.url && item.sha256 === evidence.sha256 &&
      /^[a-f0-9]{64}$/.test(item.sha256 || '') && Number.isSafeInteger(evidence.size) && evidence.size > 0 &&
      item.signing === evidence.signing && /^[a-f0-9]{40}$/.test(evidence.source || ''),
    `Landing ${key} URL/checksum/signing differs from actual public-byte evidence`)
    receipt.installers.push({ platform: key, label: item.label, version: item.version, name: item.file,
      url: item.url, size: evidence.size, sha256: item.sha256, signing: item.signing,
      installerSource: evidence.source, byteVerificationReceipt: evidence.reference, byteVerificationBasis: evidence.basis,
      installedAcceptance: 'pending-final-candidate-operator-acceptance' })
  }
  receipt.liveHtml = { url: website, startedAt: new Date().toISOString() }
  const htmlResponse = await fetch(website, { cache: 'no-store', signal: AbortSignal.timeout(120_000) })
  receipt.liveHtml.httpStatus = htmlResponse.status
  assert(htmlResponse.status === 200, `Live website HTML returned HTTP ${htmlResponse.status}`)
  const htmlBytes = Buffer.from(await htmlResponse.arrayBuffer())
  receipt.liveHtml.completedAt = new Date().toISOString()
  receipt.liveHtml.bytes = htmlBytes.length
  receipt.liveHtml.sha256 = hash(htmlBytes)
  const html = htmlBytes.toString('utf8')
  const scripts = [...html.matchAll(/<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>/gi)]
    .map(match => new URL(match[1], website))
    .filter(url => url.origin === new URL(website).origin && /^\/assets\/index-[^/]+\.js$/.test(url.pathname))
  assert(scripts.length === 1, 'Live HTML must expose one actual same-origin index JavaScript asset')
  receipt.deployedBundle = { url: scripts[0].href, startedAt: new Date().toISOString() }
  const bundleResponse = await fetch(scripts[0], { cache: 'no-store', signal: AbortSignal.timeout(120_000) })
  receipt.deployedBundle.httpStatus = bundleResponse.status
  assert(bundleResponse.status === 200, `Actual deployed index JavaScript returned HTTP ${bundleResponse.status}`)
  const bundleBytes = Buffer.from(await bundleResponse.arrayBuffer())
  receipt.deployedBundle.completedAt = new Date().toISOString()
  receipt.deployedBundle.bytes = bundleBytes.length
  receipt.deployedBundle.sha256 = hash(bundleBytes)
  const bundle = bundleBytes.toString('utf8')
  for (const item of receipt.installers) {
    assert(bundle.includes(item.url) && bundle.includes(item.sha256) && bundle.includes(item.version),
      `Live deployed index JavaScript lacks exact ${item.platform} URL/checksum/version from pinned landing data`)
    item.bundleContainsExactUrl = true
    item.bundleContainsExactChecksum = true
    item.bundleContainsExactVersion = true
    const head = { startedAt: new Date().toISOString() }
    item.publicHead = head
    const response = await fetch(item.url, { method: 'HEAD', signal: AbortSignal.timeout(120_000) })
    head.httpStatus = response.status
    head.contentLength = response.headers.get('content-length') === null ? null : Number(response.headers.get('content-length'))
    head.completedAt = new Date().toISOString()
    assert(head.httpStatus === 200 && head.contentLength === item.size,
      `Live ${item.platform} installer HEAD response differs from exact public-byte evidence`)
  }
  receipt.status = 'passed'
  receipt.finishedAt = new Date().toISOString()
  receipt.verification = 'All four exact installer URLs, checksums and versions from pinned landing-main data occur in the actual served index bundle; public HEAD status/size agree with retained complete-byte receipts'
  receipt.limitations = 'Static deployed release data and download availability only; no visual browser interaction, repeated full-installer download, native execution or installed acceptance. Other platforms may retain 2.2.26 unless scope is all-four.'
} catch (error) {
  receipt.status = 'failed'
  receipt.finishedAt = new Date().toISOString()
  receipt.error = error instanceof Error && !error.message.includes('Command failed:')
    ? error.message : 'GitHub source query failed; credentials and raw command output excluded'
  process.exitCode = 1
}
fs.mkdirSync(privateDirectory, { recursive: true, mode: 0o700 })
fs.mkdirSync(receipts, { recursive: true })
durable(privatePath, receipt)
durable(safePath, receipt)
console.log(JSON.stringify({ status: receipt.status, scope, landingSource: receipt.landingSource,
  deployedBundle: receipt.deployedBundle?.url, receiptPath: safePath,
  reason: receipt.error, installedAcceptance: receipt.installedAcceptance }))
