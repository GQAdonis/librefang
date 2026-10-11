// Root-operated download evidence only; never builds, publishes or installs.
// Usage: node <this-file> --platform <darwin-x64|win32-x64|win32-arm64>
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash, randomUUID } from 'node:crypto'
import { execFileSync } from 'node:child_process'

const repository = 'Prometheus-AGS/the-boss'
const version = '2.2.30'
const profile = 'uar-enabled'
const source = 'aef2ec2cda68605efab9dddf33b46e726e752c2d'
const nativeSource = '308aea46ff26e7f61340281bb51f67ebe5351569'
const producer = '8119fd7c83248cdf0d0cde4496cb33c569761a71'
const inputDirectory = path.dirname(fileURLToPath(import.meta.url))
const cadence = path.resolve(inputDirectory, '..')
const initiative = path.resolve(cadence, '../..')
const arguments_ = process.argv.slice(2)
const supported = ['darwin-x64', 'win32-x64', 'win32-arm64']
if (arguments_.length !== 2 || arguments_[0] !== '--platform' || !supported.includes(arguments_[1])) {
  throw new Error('Usage: node verify-customer-platform-download-2.2.30-20261010.mjs --platform <darwin-x64|win32-x64|win32-arm64>')
}
const selected = arguments_[1]
const [platform, arch] = selected.split('-')
const tag = `v${version}`
const base = `https://github.com/${repository}/releases/download/${tag}`
const recordName = `release-platform-${tag}-${profile}-${selected}-${source}.json`
const recordUrl = `${base}/${recordName}`
const installerName = `The-Boss-${version}-${platform === 'win32' ? 'win' : 'mac'}-${arch}${platform === 'win32' ? '-setup.exe' : '.dmg'}`
const installerUrl = `${base}/${installerName}`
const continuationPath = path.join(cadence, 'artifacts', 'customer-platform-continuation-2.2.30-20261010', 'state.json')
const safePath = path.join(initiative, 'receipts', `customer-public-${selected}-2.2.30-20261010.json`)
const operationId = randomUUID()
const output = path.join(cadence, 'artifacts', `customer-public-${selected}-2.2.30-${operationId}`)
const privateReceiptPath = path.join(output, 'verification.json')
const lockPath = path.join(cadence, 'artifacts', `customer-public-${selected}-2.2.30.operation.lock`)
const assert = (condition, message) => { if (!condition) throw new Error(message) }
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex')
const api = endpoint => JSON.parse(execFileSync('gh', ['api', endpoint],
  { encoding: 'utf8', shell: false, timeout: 120_000, stdio: ['ignore', 'pipe', 'pipe'] }))
function durableJson(file, value, flags = 'wx') {
  const fd = fs.openSync(file, flags, 0o600)
  try { fs.writeFileSync(fd, JSON.stringify(value, null, 2) + '\n'); fs.fsyncSync(fd) }
  finally { fs.closeSync(fd) }
}
function atomicPrivateReceipt(value) {
  const temporary = `${privateReceiptPath}.${randomUUID()}.tmp`
  durableJson(temporary, value)
  fs.renameSync(temporary, privateReceiptPath)
  const fd = fs.openSync(output, 'r')
  try { fs.fsyncSync(fd) } finally { fs.closeSync(fd) }
}
function publicAsset(release, name, url) {
  const matches = release.assets.filter(asset => asset.name === name)
  assert(matches.length === 1, `Expected exactly one immutable GitHub asset: ${name}`)
  const asset = matches[0]
  assert(asset.state === 'uploaded' && asset.browser_download_url === url && Number.isSafeInteger(asset.size) &&
    asset.size > 0 && /^sha256:[a-f0-9]{64}$/.test(asset.digest || ''), `Asset metadata incomplete or conflicting: ${name}`)
  return { id: asset.id, name: asset.name, size: asset.size, digest: asset.digest, url: asset.browser_download_url }
}
function peCertificateTable(prefix, bytes) {
  assert(prefix.length >= 64 && prefix.readUInt16LE(0) === 0x5a4d, 'Downloaded setup lacks DOS executable header')
  const peOffset = prefix.readUInt32LE(0x3c)
  assert(peOffset + 24 <= prefix.length && prefix.readUInt32LE(peOffset) === 0x00004550,
    'Setup PE header outside captured prefix or has invalid signature')
  const optional = peOffset + 24
  assert(optional + 2 <= prefix.length, 'Setup optional header outside captured prefix')
  const magic = prefix.readUInt16LE(optional)
  assert(magic === 0x10b || magic === 0x20b, 'Setup has unsupported PE optional header')
  const directories = optional + (magic === 0x10b ? 96 : 112)
  const countOffset = optional + (magic === 0x10b ? 92 : 108)
  const certificate = directories + 4 * 8
  assert(certificate + 8 <= prefix.length && prefix.readUInt32LE(countOffset) >= 5,
    'Setup certificate directory cannot be read from captured prefix')
  const certificateTableOffset = prefix.readUInt32LE(certificate)
  const certificateTableSize = prefix.readUInt32LE(certificate + 4)
  assert(!certificateTableOffset || certificateTableOffset + certificateTableSize <= bytes,
    'Setup certificate table points outside downloaded bytes')
  return { peMachine: prefix.readUInt16LE(peOffset + 4), optionalHeaderMagic: magic,
    certificateTableOffset, certificateTableSize,
    scope: 'NSIS bootstrap metadata only; does not establish packaged application architecture' }
}
const receipt = { schemaVersion: 1, kind: 'public-installer-byte-verification', operationId,
  startedAt: new Date().toISOString(), status: 'in-progress', repository, version, profile, source,
  platform, arch, selectedPlatform: selected, releaseUrl: `https://github.com/${repository}/releases/tag/${tag}`,
  installedAcceptance: 'not-exercised', nativeLaunch: 'not-exercised',
  verifier: { runtime: 'Node.js', version: process.version, script: path.relative(initiative, fileURLToPath(import.meta.url)),
    sha256: sha256(fs.readFileSync(fileURLToPath(import.meta.url))) },
  provenance: { continuationPath, nativeSource, producer }, downloads: [] }
let lockOwned = false
try {
  const continuation = JSON.parse(fs.readFileSync(continuationPath, 'utf8'))
  assert(continuation.schemaVersion === 1 && continuation.contract?.version === version &&
    continuation.contract.profile === profile && continuation.contract.installerSource === source &&
    continuation.contract.source === nativeSource && continuation.contract.producer === producer,
  'Continuation snapshot differs from the frozen release contract')
  const entry = continuation.platforms?.[selected]
  assert(Number.isSafeInteger(entry?.installerRun) && entry.installerRun > 0, 'No acknowledged installer run recorded for this platform')
  const intent = entry.actions?.findLast(action => action.kind === 'installer' && action.run === entry.installerRun)
  const urlKey = `uar_${selected.replaceAll('-', '_')}_record_url`
  assert(intent?.inputs?.release_version === version && intent.inputs.release_profile === profile &&
    intent.inputs.platforms === selected && intent.inputs[urlKey] === entry.recordUrl && entry.recordUrl,
  'Recorded installer intent does not match the selected platform/native publication')
  receipt.runId = String(entry.installerRun)
  receipt.runUrl = `https://github.com/${repository}/actions/runs/${entry.installerRun}`
  receipt.provenance.installerAction = intent.id
  receipt.provenance.uarRecordUrl = entry.recordUrl
  if (fs.existsSync(safePath)) {
    const previous = JSON.parse(fs.readFileSync(safePath, 'utf8'))
    assert(previous.status === 'passed' && previous.runId === receipt.runId && previous.source === source &&
      previous.selectedPlatform === selected && previous.artifact?.url === installerUrl,
    'Existing safe verification receipt conflicts; preserve and reconcile it instead of overwriting')
    console.log(JSON.stringify({ status: 'recorded-verification-reused', platform: selected,
      receiptPath: safePath, installedAcceptance: 'not-exercised' }))
    process.exit(0)
  }
  fs.mkdirSync(output, { recursive: true, mode: 0o700 })
  durableJson(lockPath, { pid: process.pid, operationId, platform: selected, startedAt: receipt.startedAt })
  lockOwned = true
  atomicPrivateReceipt(receipt)
  const run = api(`repos/${repository}/actions/runs/${entry.installerRun}`)
  assert(run.id === entry.installerRun && run.path === '.github/workflows/the-boss-release.yml' &&
    run.head_sha === source && run.event === 'workflow_dispatch' && run.status === 'completed' && run.conclusion === 'success',
  'Actual installer workflow has not succeeded at the frozen application source')
  const jobs = api(`repos/${repository}/actions/runs/${entry.installerRun}/jobs?per_page=100`).jobs
    .filter(job => job.name === `Installer (${selected})`)
  assert(jobs.length === 1 && jobs[0].status === 'completed' && jobs[0].conclusion === 'success',
    'Selected actual native installer job is not uniquely successful')
  const job = jobs[0]
  const stepPassed = name => job.steps.some(step => step.name === name && step.conclusion === 'success')
  for (const name of ['Build actual installers', 'Publish installer to GitHub Release', 'Queue serialized metadata and site publication'])
    assert(stepPassed(name), `Actual installer workflow lacks successful ${name}`)
  receipt.packagingEvidence = { runId: run.id, source: run.head_sha, conclusion: run.conclusion,
    jobId: job.id, jobName: job.name, jobConclusion: job.conclusion,
    finishedAt: job.completed_at, actualInstallerBuild: 'success', artifactPublication: 'success',
    metadataAndSitePublication: 'queued by successful packaging job; completion not inferred here' }
  const release = api(`repos/${repository}/releases/tags/${tag}`)
  assert(!release.draft && release.tag_name === tag, 'Selected release is not public at the expected version')
  receipt.releaseId = release.id
  const recordAsset = publicAsset(release, recordName, recordUrl)
  const installerAsset = publicAsset(release, installerName, installerUrl)
  receipt.githubAssets = [recordAsset, installerAsset]
  atomicPrivateReceipt(receipt)
  receipt.record = { url: recordUrl, name: recordName, startedAt: new Date().toISOString(), bytes: 0 }
  atomicPrivateReceipt(receipt)
  const recordResponse = await fetch(recordUrl, { signal: AbortSignal.timeout(120_000) })
  receipt.record.httpStatus = recordResponse.status
  receipt.record.contentLength = recordResponse.headers.get('content-length')
  assert(recordResponse.ok, `Public platform record returned HTTP ${recordResponse.status}`)
  const recordBytes = Buffer.from(await recordResponse.arrayBuffer())
  const recordDigest = sha256(recordBytes)
  receipt.record.bytes = recordBytes.length
  receipt.record.sha256 = recordDigest
  receipt.record.completedAt = new Date().toISOString()
  receipt.record.githubAssetId = recordAsset.id
  assert(recordBytes.length === recordAsset.size && `sha256:${recordDigest}` === recordAsset.digest,
    'Actual public platform-record bytes differ from GitHub asset metadata')
  const record = JSON.parse(recordBytes.toString('utf8'))
  assert(record.version === version && record.profile === profile && record.source === source &&
    record.platform === platform && record.arch === arch && record.features?.uar === true && record.artifacts?.length === 1,
  'Public platform record differs from frozen version/profile/source/architecture')
  const artifact = record.artifacts[0]
  assert(artifact.name === installerName && artifact.url === installerUrl && artifact.profile === profile &&
    artifact.size === installerAsset.size && /^[a-f0-9]{64}$/.test(artifact.sha256 || '') &&
    `sha256:${artifact.sha256}` === installerAsset.digest,
  'Public installer record differs from actual GitHub asset name/URL/size/digest')
  assert(artifact.signing === (platform === 'win32' ? 'unsigned' : 'Developer ID (notarized)'),
    'Signing differs from this bounded verifier contract; do not infer signing verification')
  receipt.artifact = artifact
  atomicPrivateReceipt(receipt)
  const download = { startedAt: new Date().toISOString(), bytes: 0 }
  receipt.downloads.push(download)
  atomicPrivateReceipt(receipt)
  const response = await fetch(installerUrl, { signal: AbortSignal.timeout(20 * 60_000) })
  download.status = response.status
  download.contentLength = response.headers.get('content-length') === null ? null : Number(response.headers.get('content-length'))
  assert(response.ok && response.body, `Public installer returned HTTP ${response.status}`)
  if (download.contentLength !== null) assert(download.contentLength === artifact.size, 'HTTP content length differs from installer record')
  const digest = createHash('sha256')
  let prefix = Buffer.alloc(0)
  for await (const chunk of response.body) {
    const bytes = Buffer.from(chunk)
    download.bytes += bytes.length
    digest.update(bytes)
    if (platform === 'win32' && prefix.length < 256 * 1024)
      prefix = Buffer.concat([prefix, bytes.subarray(0, 256 * 1024 - prefix.length)])
  }
  download.completedAt = new Date().toISOString()
  download.sha256 = digest.digest('hex')
  assert(download.bytes === artifact.size && download.sha256 === artifact.sha256 &&
    `sha256:${download.sha256}` === installerAsset.digest, 'Entire downloaded installer size/digest differs from immutable public record')
  if (platform === 'win32') {
    const table = peCertificateTable(prefix, download.bytes)
    assert(table.certificateTableOffset === 0 && table.certificateTableSize === 0,
      'Manifest says unsigned but downloaded setup has an Authenticode certificate table')
    receipt.signingEvidence = { reported: artifact.signing, peCertificateTable: table,
      observation: 'Authenticode certificate table absent in the fully hashed downloaded NSIS setup',
      authenticodeVerification: 'not applicable to unsigned setup' }
    receipt.architectureEvidence = 'Exact immutable platform record, successful selected native packaging job and canonical setup name; NSIS bootstrap machine does not establish payload architecture'
  } else {
    for (const name of ['Require macOS distribution credentials', 'Enable configured macOS signing', 'Enable App Store Connect notarization'])
      assert(stepPassed(name), `Intel packaging lacks successful ${name}`)
    receipt.signingEvidence = { reported: artifact.signing, runId: run.id, jobId: job.id,
      signingConfiguration: 'success', notarizationConfiguration: 'success', jobConclusion: job.conclusion,
      basis: 'Immutable public manifest plus actual successful native Intel packaging workflow; no direct local signature/notarization examination',
      downloadedImageMountedLocally: false, nativeIntelLaunch: 'not-exercised' }
    receipt.architectureEvidence = 'Exact immutable darwin-x64 platform record and successful Intel packaging job; no native Intel installed operation'
  }
  receipt.status = 'passed'
  receipt.completedAt = new Date().toISOString()
  receipt.verification = 'Entire public installer streamed once to SHA-256 and byte count; exact manifest and GitHub asset digest/size match'
  atomicPrivateReceipt(receipt)
  fs.mkdirSync(path.dirname(safePath), { recursive: true })
  durableJson(safePath, receipt)
  console.log(JSON.stringify({ status: receipt.status, platform: selected, version, runId: receipt.runId,
    bytes: download.bytes, sha256: download.sha256, signing: artifact.signing,
    receiptPath: safePath, privateReceiptPath, installedAcceptance: 'not-exercised' }))
} catch (error) {
  receipt.status = 'failed'
  receipt.completedAt = new Date().toISOString()
  if (receipt.record && !receipt.record.completedAt) receipt.record.completedAt = receipt.completedAt
  for (const download of receipt.downloads)
    if (!download.completedAt) download.completedAt = receipt.completedAt
  receipt.error = error instanceof Error && !error.message.includes('Command failed:')
    ? error.message : 'GitHub metadata query failed; no credentials or raw diagnostics projected'
  if (fs.existsSync(output)) atomicPrivateReceipt(receipt)
  console.error(JSON.stringify({ platform: selected, status: 'failed', reason: receipt.error,
    privateReceiptPath: fs.existsSync(output) ? privateReceiptPath : undefined }))
  process.exitCode = 1
} finally {
  if (lockOwned) fs.unlinkSync(lockPath)
}
