// Root-operated, read-only release reconciliation after the final site publication.
// Usage: node <this-file>. Reuses actual public-byte and all-four live-site receipts.
// No application/native operation, installer downloads, publishing or ledger writes.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash, randomUUID } from 'node:crypto'
import { execFileSync } from 'node:child_process'

if (process.argv.length !== 2) throw new Error('Usage: node verify-customer-release-metadata-2.2.30-20261010.mjs')
const repository = 'Prometheus-AGS/the-boss'
const version = '2.2.30'
const profile = 'uar-enabled'
const source = 'aef2ec2cda68605efab9dddf33b46e726e752c2d'
const platforms = ['darwin-arm64', 'darwin-x64', 'win32-x64', 'win32-arm64']
const directory = path.dirname(fileURLToPath(import.meta.url))
const initiative = path.resolve(directory, '../../..')
const receipts = path.join(initiative, 'receipts')
const operationId = randomUUID()
const startedAt = new Date().toISOString()
const stem = `customer-release-metadata-2.2.30-${startedAt.replaceAll(/[:.]/g, '-')}-${operationId.slice(0, 8)}`
const privateDirectory = path.join(directory, '..', 'artifacts', stem)
const safePath = path.join(receipts, `${stem}.json`)
const assert = (condition, message) => { if (!condition) throw new Error(message) }
const hash = bytes => createHash('sha256').update(bytes).digest('hex')
const api = endpoint => JSON.parse(execFileSync('gh', ['api', endpoint],
  { encoding: 'utf8', shell: false, timeout: 120_000, maxBuffer: 4 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'] }))
function readReceipt(name) {
  const file = path.join(receipts, name)
  const bytes = fs.readFileSync(file)
  return { data: JSON.parse(bytes.toString('utf8')),
    reference: { path: path.relative(initiative, file), sha256: hash(bytes) } }
}
function publicEvidence(key) {
  const mac = key === 'darwin-arm64'
  const { data, reference } = readReceipt(mac
    ? 'customer-public-mac-installation-2.2.30-20261010.json'
    : `customer-public-${key}-2.2.30-20261010.json`)
  assert(data.status === 'passed' && data.version === version, `Missing successful current ${key} public-byte receipt`)
  if (mac) {
    assert(data.platform === key && data.sources?.boss === source && data.checks?.signature === 'passed' &&
      data.checks.gatekeeper === 'passed' && data.checks.notarization === 'passed',
    'Apple Silicon public installation/source/signing evidence differs from current candidate')
    return { ...data.installer, signing: 'Developer ID (notarized)', source, reference,
      signingEvidence: 'Existing public package signature/Gatekeeper/stapler checks' }
  }
  const download = data.downloads?.findLast(item => item.sha256 === data.artifact?.sha256)
  assert(data.source === source && data.selectedPlatform === key && data.profile === profile &&
    download?.bytes === data.artifact?.size && data.packagingEvidence?.jobConclusion === 'success',
  `Current ${key} full-byte/native packaging provenance does not match`)
  return { ...data.artifact, source, reference, runId: data.runId,
    signingEvidence: key.startsWith('win32-')
      ? 'Retained fully hashed NSIS setup certificate-table evidence; bootstrap does not identify application payload architecture'
      : 'Retained immutable manifest and successful native Intel packaging evidence; no direct local signature examination or Intel launch' }
}
function contentAt(file, commit) {
  const entry = api(`repos/${repository}/contents/${file}?ref=${commit}`)
  assert(entry.type === 'file' && entry.encoding === 'base64', `Pinned ${file} unavailable`)
  const bytes = Buffer.from(entry.content, 'base64')
  return { bytes, reference: { repository, commit, path: file, blob: entry.sha,
    bytes: bytes.length, sha256: hash(bytes) } }
}
function liveSiteEvidence(expected) {
  const names = fs.readdirSync(receipts).filter(name => name.startsWith('customer-release-all-four-2.2.30-live-website-') && name.endsWith('.json'))
  const candidates = names.map(name => readReceipt(name)).filter(({ data }) =>
    data.status === 'passed' && data.scope === 'all-four' && data.latestVersion === version && data.installers?.length === 4)
    .sort((left, right) => Date.parse(right.data.finishedAt) - Date.parse(left.data.finishedAt))
  assert(candidates.length > 0, 'No retained successful all-four 2.2.30 live-site receipt; run that operation after publication first')
  const candidate = candidates.find(({ data }) => expected.every(item => data.installers.some(value =>
    value.platform === item.key && value.version === version && value.url === item.url &&
    value.sha256 === item.sha256 && value.size === item.size && value.signing === item.signing)))
  assert(candidate, 'Retained all-four live-site evidence differs from the final public installer set')
  return { ...candidate.reference, landingSource: candidate.data.landingSource,
    deployedBundle: candidate.data.deployedBundle, verifiedAt: candidate.data.finishedAt,
    applicability: 'Exact final four installer URLs/checksums/sizes/signing; deployment not repeated by this helper' }
}
function durable(file, value) {
  const fd = fs.openSync(file, 'wx', 0o600)
  try { fs.writeFileSync(fd, JSON.stringify(value, null, 2) + '\n'); fs.fsyncSync(fd) }
  finally { fs.closeSync(fd) }
  const parent = fs.openSync(path.dirname(file), 'r')
  try { fs.fsyncSync(parent) } finally { fs.closeSync(parent) }
}
const receipt = { schemaVersion: 1, kind: 'customer-final-release-metadata-reconciliation',
  operationId, startedAt, status: 'in-progress', repository, version, profile, installerSource: source,
  installers: [], installedAcceptance: 'pending-final-candidate-operator-acceptance',
  nativeOperation: 'not-exercised-by-this-helper', installerDownloads: 'not-repeated',
  newCadenceDelivery: false, cadenceCountersMutated: false, qualificationLedgerMutated: false,
  verifier: { runtime: 'Node.js', version: process.version,
    script: path.relative(initiative, fileURLToPath(import.meta.url)), sha256: hash(fs.readFileSync(fileURLToPath(import.meta.url))) } }
try {
  const ref = api(`repos/${repository}/git/ref/heads/main`)
  assert(ref.object?.type === 'commit' && /^[a-f0-9]{40}$/.test(ref.object.sha), 'Current Boss main is not one exact commit')
  receipt.metadataCommit = ref.object.sha
  const manifestFile = contentAt('release-manifest.json', receipt.metadataCommit)
  const releasesFile = contentAt('RELEASES.md', receipt.metadataCommit)
  receipt.checkedInFiles = [manifestFile.reference, releasesFile.reference]
  const manifest = JSON.parse(manifestFile.bytes.toString('utf8'))
  assert(manifest.version === version && manifest.profile === profile && manifest.features?.uar === true &&
    manifest.source === source && manifest.supportedPlatforms?.length === 4 &&
    [...manifest.supportedPlatforms].sort().join(',') === [...platforms].sort().join(',') &&
    Array.isArray(manifest.pendingPlatforms) && manifest.pendingPlatforms.length === 0 && manifest.artifacts?.length === 4,
  'Checked-in release manifest is not the complete frozen four-platform UAR-enabled 2.2.30 candidate')
  assert(Number.isFinite(Date.parse(manifest.publishedAt)), 'Manifest publication timestamp is not recorded')
  receipt.metadataPublishedAt = manifest.publishedAt
  const actualKeys = manifest.artifacts.map(item => `${item.platform}-${item.arch}`)
  assert(new Set(actualKeys).size === 4 && actualKeys.every(key => platforms.includes(key)),
    'Manifest has duplicate or unsupported platform entries')
  const release = api(`repos/${repository}/releases/tags/v${version}`)
  assert(!release.draft && release.tag_name === `v${version}`, 'Expected GitHub release is not public')
  receipt.githubRelease = { id: release.id, url: release.html_url, tag: release.tag_name }
  for (const key of platforms) {
    const actual = manifest.artifacts.find(item => `${item.platform}-${item.arch}` === key)
    const expected = publicEvidence(key)
    const [platform, arch] = key.split('-')
    const name = `The-Boss-${version}-${platform === 'win32' ? 'win' : 'mac'}-${arch}${platform === 'win32' ? '-setup.exe' : '.dmg'}`
    const url = `https://github.com/${repository}/releases/download/v${version}/${name}`
    const signing = platform === 'win32' ? 'unsigned' : 'Developer ID (notarized)'
    assert(actual.name === name && actual.url === url && actual.url === expected.url && actual.size === expected.size &&
      actual.sha256 === expected.sha256 && /^[a-f0-9]{64}$/.test(actual.sha256 || '') &&
      actual.source === source && actual.profile === profile && actual.signing === signing && expected.signing === signing,
    `Checked-in manifest differs from exact ${key} public-byte provenance`)
    const assets = release.assets.filter(asset => asset.name === name)
    assert(assets.length === 1 && assets[0].state === 'uploaded' && assets[0].size === expected.size &&
      assets[0].digest === `sha256:${expected.sha256}` && assets[0].browser_download_url === url,
    `Current public GitHub asset metadata differs from retained ${key} byte receipt`)
    receipt.installers.push({ key, name, platform, arch, source, profile, size: actual.size,
      url, sha256: actual.sha256, signing, publicAssetId: assets[0].id,
      byteVerificationReceipt: expected.reference, signingEvidence: expected.signingEvidence,
      installedAcceptance: 'pending-final-candidate-operator-acceptance' })
  }
  const text = releasesFile.bytes.toString('utf8')
  assert(text.includes('<!-- releases:newest-first -->'), 'Checked-in RELEASES.md lacks the actual generated insertion marker')
  const headings = [...text.matchAll(/^## v([^\s]+) — ([^\n]+)$/gm)]
  const matching = headings.filter(match => match[1] === version)
  assert(matching.length === 1 && headings[0]?.[1] === version, 'Current release must appear exactly once as the newest RELEASES.md entry')
  const start = matching[0].index
  const next = text.indexOf('\n## ', start + matching[0][0].length)
  const section = text.slice(start, next < 0 ? text.length : next)
  assert(matching[0][2] === manifest.publishedAt && section.includes(`\nProfile: ${profile}\n`) &&
    section.includes('| Installer | Size | Download | SHA-256 | Signing | Source |'),
  'RELEASES.md version/profile/publication timestamp/table differs from the manifest')
  const rows = section.split('\n').filter(line => line.startsWith('| `The-Boss-'))
  assert(rows.length === 4, 'Newest RELEASES.md entry must contain exactly four installer rows')
  for (const item of receipt.installers) {
    const row = `| \`${item.name}\` | ${(item.size / 1048576).toFixed(1)} MB | [Download](${item.url}) | \`${item.sha256}\` | ${item.signing} | [\`${source.slice(0, 9)}\`](https://github.com/${repository}/commit/${source}) |`
    assert(rows.filter(value => value === row).length === 1, `RELEASES.md row differs from exact ${item.key} metadata`)
  }
  receipt.releaseEntry = { version, sha256: hash(Buffer.from(section)), rows: rows.length,
    sizeFormat: 'Existing generator: bytes / 1048576, one decimal, MB label' }
  receipt.liveWebsiteReceipt = liveSiteEvidence(receipt.installers)
  receipt.status = 'passed'
  receipt.finishedAt = new Date().toISOString()
  receipt.verification = 'Pinned checked-in manifest and newest RELEASES.md rows agree with all four retained full-byte receipts, current GitHub assets and the retained final all-four live-site receipt'
  receipt.limitations = 'Metadata and applicability reconciliation only. Does not repeat full downloads, deploy the website, establish native Intel/Windows ARM64 operation or supply final Mac/Windows installed acceptance.'
} catch (error) {
  receipt.status = 'failed'
  receipt.finishedAt = new Date().toISOString()
  receipt.error = error instanceof Error && !error.message.includes('Command failed:')
    ? error.message : 'GitHub metadata query failed; raw command output and credentials excluded'
  process.exitCode = 1
}
fs.mkdirSync(privateDirectory, { recursive: true, mode: 0o700 })
fs.mkdirSync(receipts, { recursive: true })
durable(path.join(privateDirectory, 'verification.json'), receipt)
durable(safePath, receipt)
console.log(JSON.stringify({ status: receipt.status, version, metadataCommit: receipt.metadataCommit,
  installers: receipt.installers.length, receiptPath: safePath, reason: receipt.error,
  installedAcceptance: receipt.installedAcceptance }))
