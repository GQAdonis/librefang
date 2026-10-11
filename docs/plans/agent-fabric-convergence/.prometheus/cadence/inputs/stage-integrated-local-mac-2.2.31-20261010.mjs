import fs from 'node:fs'
import path from 'node:path'
import { createHash, randomUUID } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const repository = '/Users/gqadonis/Projects/prometheus/worktrees/afc-c16-team-guidance'
const validatorPath = path.join(repository, 'scripts/uar-payload-integrity.cjs')
const { verifyPackagedUarPayload } = createRequire(import.meta.url)(validatorPath)
const fact = (value, code) => { if (!value) throw Object.assign(new Error(code), { code }) }
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'))
const revision = value => typeof value === 'string' ? value : value?.revision
async function digest(file) {
  const hash = createHash('sha256')
  for await (const chunk of fs.createReadStream(file)) hash.update(chunk)
  return hash.digest('hex')
}

async function stage(args = process.argv.slice(2)) {
  const options = {}
  for (let index = 0; index < args.length; index++) {
    const name = args[index]
    fact(['--dmg', '--config', '--native-record', '--output'].includes(name) && args[index + 1] &&
      !args[index + 1].startsWith('--') && options[name.slice(2)] === undefined, 'INTEGRATED_INSTALL_ARGUMENTS')
    options[name.slice(2)] = path.resolve(args[++index])
  }
  fact(Object.keys(options).length === 4, 'INTEGRATED_INSTALL_EXPLICIT_INPUTS_REQUIRED')
  fact(process.platform === 'darwin' && process.arch === 'arm64', 'INTEGRATED_INSTALL_MAC_ARM64_REQUIRED')
  const config = read(options.config)
  fact(config.schemaVersion === 1 && ['2.2.31', '2.2.32'].includes(config.version) && config.candidateId &&
    config.builtSource?.candidateId === config.candidateId &&
    /^[a-f0-9]{40}$/.test(config.builtSource.boss ?? '') &&
    /^[a-f0-9]{64}$/.test(config.builtSource.contentManifestDigest ?? '') &&
    ['boss', 'uar', 'bossfang'].every(key => /^[a-f0-9]{40}$/.test(config.candidate?.[key] ?? '')) &&
    ['appAsarSha256', 'uarSha256', 'bossfangSha256'].every(key =>
      /^[a-f0-9]{64}$/.test(config.candidate?.[key] ?? '')), 'INTEGRATED_INSTALL_FINAL_CONFIG_REQUIRED')
  const nativeRecord = read(options['native-record'])
  fact(revision(nativeRecord.source) === config.candidate.uar && /^[a-f0-9]{64}$/.test(nativeRecord.sha256 ?? ''),
    'INTEGRATED_INSTALL_NATIVE_RECORD_SOURCE_MISMATCH')
  fs.mkdirSync(options.output, { recursive: true })
  const directory = path.join(fs.realpathSync(options.output), 'integrated-local-mac-' + config.version + '-' + randomUUID())
  fs.mkdirSync(directory, { mode: 0o700 })
  const receiptPath = path.join(directory, 'installation.json')
  const receipt = { schemaVersion: 1, kind: 'integrated-local-mac-installer-installation',
    version: config.version, platform: 'darwin-arm64', source: config.builtSource.boss,
    candidateId: config.candidateId, contentManifestDigest: config.builtSource.contentManifestDigest,
    builtSource: config.builtSource, operatedSource: config.operatedSource,
    requiresFrozenBuildReconciliation: config.requiresFrozenBuildReconciliation,
    sourceRefs: { boss: config.builtSource.boss, uar: config.candidate.uar, bossfang: config.candidate.bossfang },
    startedAt: new Date().toISOString(), installerPath: options.dmg,
    configurationPath: options.config, nativeRecordPath: options['native-record'],
    status: 'pending', signature: 'not-performed', gatekeeper: 'not-performed', notarization: 'not-claimed',
    functionalOperation: 'not-performed', installedAcceptance: 'pending', publication: 'not-public-artifact' }
  const mount = path.join(directory, 'mounted')
  let mounted = false
  try {
    receipt.size = fs.statSync(options.dmg).size
    receipt.sha256 = await digest(options.dmg)
    receipt.configurationSha256 = await digest(options.config)
    receipt.nativeRecordSha256 = await digest(options['native-record'])
    receipt.validatorSha256 = await digest(validatorPath)
    receipt.stagingDriverSha256 = await digest(fileURLToPath(import.meta.url))
    fs.mkdirSync(mount, { mode: 0o700 })
    execFileSync('hdiutil', ['attach', '-readonly', '-nobrowse', '-mountpoint', mount, options.dmg], { stdio: 'ignore' })
    mounted = true
    const app = path.join(directory, 'installed/The Boss.app')
    fs.mkdirSync(path.dirname(app), { mode: 0o700 })
    execFileSync('ditto', [path.join(mount, 'The Boss.app'), app], { stdio: 'ignore' })
    receipt.app = app
    const version = execFileSync('/usr/libexec/PlistBuddy', ['-c', 'Print :CFBundleShortVersionString',
      path.join(app, 'Contents/Info.plist')], { encoding: 'utf8' }).trim()
    fact(version === config.version, 'INTEGRATED_INSTALL_COPIED_VERSION_MISMATCH')
    const resources = path.join(app, 'Contents/Resources')
    const nativeDirectory = path.join(resources, 'app.asar.unpacked/resources/binaries/darwin-arm64')
    const manifest = read(path.join(nativeDirectory, 'payload-manifest.json'))
    fact(manifest.source === config.candidate.uar && manifest.platform === 'darwin-arm64' &&
      manifest.archiveSha256 === nativeRecord.sha256, 'INTEGRATED_INSTALL_PAYLOAD_PROVENANCE_MISMATCH')
    const expected = manifest.files.find(file => file.path === 'uar-sidecar')
    fact(expected, 'INTEGRATED_INSTALL_NATIVE_INVENTORY_MISSING')
    receipt.appAsarSha256 = await digest(path.join(resources, 'app.asar'))
    receipt.sidecarSha256 = await digest(path.join(nativeDirectory, 'uar-sidecar'))
    receipt.bossfangSha256 = await digest(path.join(nativeDirectory, 'bossfang'))
    fact(receipt.appAsarSha256 === config.candidate.appAsarSha256 &&
      receipt.sidecarSha256 === config.candidate.uarSha256 &&
      receipt.bossfangSha256 === config.candidate.bossfangSha256, 'INTEGRATED_INSTALL_COPIED_BYTES_MISMATCH')
    verifyPackagedUarPayload(resources, 'darwin-arm64', { localUar: true, allowPlatformSigning: true })
    receipt.nativeIntegrity = { method: 'production-signature-aware-payload-validator',
      originalPayloadSha256: expected.sha256, installedSignedSha256: receipt.sidecarSha256,
      archiveSha256: manifest.archiveSha256, status: 'passed', runtimeProbe: 'not-performed' }
    receipt.uarSource = manifest.source
    for (const [name, executable, args] of [
      ['signature', 'codesign', ['--verify', '--deep', '--strict', app]],
      ['gatekeeper', 'spctl', ['--assess', '--type', 'execute', app]]
    ]) {
      try {
        execFileSync(executable, args, { stdio: 'ignore' })
        receipt[name] = 'passed'
      } catch (error) {
        receipt[name] = name === 'signature' ? 'failed' : 'not-accepted-local-build'
        receipt[name + 'ExitCode'] = error.status ?? null
      }
    }
    fact(receipt.signature === 'passed', 'INTEGRATED_INSTALL_SIGNATURE_FAILED')
    receipt.installation = 'copied-from-actual-local-DMG-into-disposable-directory'
    receipt.status = 'passed'
  } catch (error) {
    receipt.status = 'failed'
    receipt.failureCode = /^INTEGRATED_INSTALL_[A-Z0-9_]+$/.test(error.code ?? '')
      ? error.code : 'INTEGRATED_INSTALL_COPY_OR_VALIDATION_FAILED'
  } finally {
    if (mounted) {
      try {
        execFileSync('hdiutil', ['detach', mount], { stdio: 'ignore' })
        receipt.mountedImageDetached = true
      } catch {
        receipt.status = 'failed'
        receipt.mountCleanupPending = true
        receipt.mountPath = mount
        receipt.failureCode ??= 'INTEGRATED_INSTALL_OWNED_MOUNT_DETACH_FAILED'
      }
    }
    receipt.finishedAt = new Date().toISOString()
    fs.writeFileSync(receiptPath, JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx', mode: 0o600 })
  }
  return { status: receipt.status, receiptPath, app: receipt.app, version: receipt.version,
    signature: receipt.signature, gatekeeper: receipt.gatekeeper, failureCode: receipt.failureCode }
}

try {
  const result = await stage()
  process.stdout.write(JSON.stringify(result) + '\n')
  process.exitCode = result.status === 'passed' ? 0 : 1
} catch (error) {
  process.stderr.write(JSON.stringify({ status: 'failed', failureCode: /^INTEGRATED_INSTALL_[A-Z0-9_]+$/.test(error.code ?? '')
    ? error.code : 'INTEGRATED_INSTALL_INPUT_UNAVAILABLE' }) + '\n')
  process.exitCode = 1
}
