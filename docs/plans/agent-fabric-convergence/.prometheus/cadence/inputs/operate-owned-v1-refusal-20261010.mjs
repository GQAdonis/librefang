import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createHash, randomBytes } from 'node:crypto'
import { execFileSync, spawn } from 'node:child_process'
import { setTimeout as delay } from 'node:timers/promises'
import { pathToFileURL } from 'node:url'

const initiative = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../..')
const repository = '/Users/gqadonis/Projects/prometheus/worktrees/afc-c16-team-guidance'
const sandboxExec = '/usr/bin/sandbox-exec'
const source = '308aea46ff26e7f61340281bb51f67ebe5351569'
const instanceId = 'uar-admission-v1-20261010'
const credentialNames = ['BOSS_ADMISSION_V1_RUNTIME_TOKEN', 'BOSS_ADMISSION_V1_ADMIN_KEY']
const fact = (value, code) => { if (!value) throw Object.assign(new Error(code), { code }) }
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'))
const digest = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex')
const save = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { mode: 0o600 })
const safeCode = error => /^[A-Z][A-Z0-9_]{0,159}$/.test(error?.code ?? '') ? error.code : 'OWNED_V1_OPERATION_UNCONFIRMED'

// Numeric process identities only: never inspect argv or inherited environment.
function ownedMembers(child, seen) {
  const rows = execFileSync('/bin/ps', ['-axo', 'pid=,ppid=,pgid='], { encoding: 'utf8' }).trim().split('\n')
    .map(line => line.trim().split(/\s+/).map(Number)).filter(row => row.length === 3 && row.every(Number.isInteger))
  const members = rows.filter(([pid, , pgid]) => pgid === child.pid && pid !== process.pid)
  if (child.exitCode === null && child.signalCode === null)
    fact(members.some(([pid]) => pid === child.pid), 'OWNED_V1_PROCESS_GROUP_IDENTITY_UNCONFIRMED')
  // This detached group was created by this spawn. Every member must descend
  // from its tracked root, or have been observed in that exact tree earlier.
  const tree = new Set([child.pid, ...seen])
  let changed = true
  while (changed) {
    changed = false
    for (const [pid, parent] of members) if (tree.has(parent) && !tree.has(pid)) { tree.add(pid); changed = true }
  }
  fact(members.every(([pid]) => tree.has(pid)), 'OWNED_V1_DESCENDANT_OWNERSHIP_UNCONFIRMED')
  for (const [pid] of members) seen.add(pid)
  return members.map(([pid]) => pid)
}
async function stopOwned(child, seen) {
  if (!child?.pid) return { stdinClosed: false, treeStopped: true, processStarted: false }
  // EOF is the existing sidecar owner's graceful shutdown contract.
  child.stdin.end()
  let members = ownedMembers(child, seen)
  const waitUntil = async deadline => {
    while (members.length && Date.now() < deadline) {
      await delay(100)
      members = ownedMembers(child, seen)
    }
  }
  await waitUntil(Date.now() + 5000)
  const signalled = []
  if (members.length) {
    for (const pid of members.reverse()) try { process.kill(pid, 'SIGTERM'); signalled.push({ pid, signal: 'SIGTERM' }) }
    catch (error) { if (error.code !== 'ESRCH') throw error }
    await waitUntil(Date.now() + 5000)
  }
  // No SIGKILL or broad process-name/port cleanup. Unconfirmed cleanup fails.
  return { processStarted: true, pid: child.pid, stdinClosed: true, treeStopped: members.length === 0,
    signalled, remainingOwnedPids: members, exitCode: child.exitCode, signalCode: child.signalCode }
}

export async function operate(args = process.argv.slice(2)) {
  const options = {}
  for (let index = 0; index < args.length; index++) {
    const name = args[index]
    fact(['--config', '--output', '--launcher'].includes(name) && args[index + 1] &&
      !args[index + 1].startsWith('--') && options[name.slice(2)] === undefined, 'OWNED_V1_ARGUMENTS')
    options[name.slice(2)] = path.resolve(args[++index])
  }
  fact(Object.keys(options).length === 3, 'OWNED_V1_EXPLICIT_CANDIDATE_AND_LAUNCHER_REQUIRED')
  fact(process.platform === 'darwin' && process.arch === 'arm64', 'OWNED_V1_MAC_ARM64_REQUIRED')
  fact(fs.existsSync(sandboxExec), 'OWNED_V1_OS_SANDBOX_UNAVAILABLE')
  const preparationPath = path.join(initiative, 'receipts/native-release-inputs-20261010.json')
  const copyPath = path.join(initiative, 'receipts/retained-v1-payload-copy-20261010.json')
  const preparation = read(preparationPath).olderInstancePreparation, retained = read(copyPath)
  fact(preparation?.source === source && preparation.instanceId === instanceId && retained.source === source &&
    retained.processStarted === false, 'OWNED_V1_RETAINED_SOURCE_PREPARATION_REQUIRED')
  const record = read(retained.record)
  fact(record.source === source && record.platform === 'darwin-arm64' && record.features.includes('server-full') &&
    retained.sha256 === record.sha256 && digest(retained.archive) === record.sha256 &&
    record.sha256 === preparation.archiveSha256, 'OWNED_V1_RETAINED_ARCHIVE_IDENTITY_MISMATCH')
  const candidateBytes = fs.readFileSync(options.config), candidate = JSON.parse(candidateBytes)
  fact(candidate.schemaVersion === 1 && candidate.version === '2.2.31' && candidate.candidate &&
    ['boss', 'bossfang', 'uar'].every(key => /^[a-f0-9]{40}$/.test(candidate.candidate[key] ?? '')) &&
    ['appAsarSha256', 'uarSha256', 'bossfangSha256'].every(key => /^[a-f0-9]{64}$/.test(candidate.candidate[key] ?? '')),
    'OWNED_V1_ACTUAL_FINAL_CANDIDATE_REQUIRED')
  fact(!candidate.oldInstance, 'OWNED_V1_OWNER_SUPPLIES_FRESH_INSTANCE_ONLY')
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'uar-v1-contained-20261010-')))
  for (const name of ['payload', 'state', 'tmp', 'uploads', 'skills', 'static', 'home', 'workspace'])
    fs.mkdirSync(path.join(root, name), { mode: 0o700 })
  const receiptFile = path.join(root, 'owner-operation.json')
  const receipt = { schemaVersion: 1, kind: 'owned-sandboxed-v1-instance-and-packaged-refusal-operation',
    status: 'blocked', complete: false, startedAt: new Date().toISOString(), root,
    source, archiveSha256: record.sha256, binarySha256: preparation.binarySha256Actual,
    retainedCopyReceipt: { path: copyPath, sha256: digest(copyPath) },
    preparationReceipt: { path: preparationPath, sha256: digest(preparationPath) },
    finalCandidateConfigurationSha256: createHash('sha256').update(candidateBytes).digest('hex'),
    ownerScriptSha256: digest(new URL(import.meta.url)), credentialsRecorded: false,
    credentialReferences: preparation.desktopWrapper, modelInferenceAuthorized: false, externalGitHubWrites: false,
    limitations: ['Sandboxed v1 startup is an actual gate; no broad filesystem/network fallback.',
      'The old source attempts shared /data/ingest; its denied watcher/startup behavior must be observed.',
      'The OS boundary covers this old process and descendants, not the separately owned candidate desktop launcher.'] }
  const controller = new AbortController(), abort = () => controller.abort()
  const priorEnvironment = new Map(credentialNames.map(name => [name, process.env[name]]))
  let child, stage = 'retained-complete-payload-extraction'
  const seen = new Set()
  process.once('SIGINT', abort); process.once('SIGTERM', abort)
  let timeout
  try {
    const archive = path.join(root, 'retained-v1.tar.gz')
    fs.copyFileSync(retained.archive, archive)
    const entries = execFileSync('/usr/bin/tar', ['-tzf', archive], { encoding: 'utf8' }).trim().split('\n')
    fact(entries.every(entry => entry.startsWith('uar-sidecar-darwin-arm64/') && !entry.split('/').includes('..')),
      'OWNED_V1_ARCHIVE_SCOPE_MISMATCH')
    execFileSync('/usr/bin/tar', ['-xzf', archive, '-C', path.join(root, 'payload'), '--strip-components', '1'], { stdio: 'ignore' })
    const payload = path.join(root, 'payload'), binary = path.join(payload, 'uar-sidecar')
    const manifestPath = path.join(payload, 'payload-manifest.json'), manifest = read(manifestPath)
    fact(manifest.source === source && digest(binary) === preparation.binarySha256Actual &&
      digest(binary) === preparation.binarySha256FromPayloadManifest, 'OWNED_V1_EXTRACTED_SOURCE_IDENTITY_MISMATCH')
    const isolated = value => typeof value === 'string' ? value.replaceAll('<disposableRoot>', root)
      : Array.isArray(value) ? value.map(isolated) : value && typeof value === 'object'
        ? Object.fromEntries(Object.entries(value).map(([key, nested]) => [key, isolated(nested)])) : value
    const configPath = path.join(root, 'config.json')
    save(configPath, isolated(preparation.config))
    const deniedPaths = new Set(['/data/ingest', '/System/Volumes/Data/data/ingest'])
    for (const denied of [...deniedPaths]) if (fs.existsSync(denied)) deniedPaths.add(fs.realpathSync(denied))
    const sandboxProfile = '(version 1)\n(allow default)\n(deny file-write*)\n' +
      '(allow file-write* (subpath (param "ROOT")))\n' +
      '(deny file-read* file-write* ' + [...deniedPaths].map(value => `(subpath ${JSON.stringify(value)})`).join(' ') + ')\n' +
      '(deny network-outbound)\n'
    const sandboxPath = path.join(root, 'owner.sb')
    fs.writeFileSync(sandboxPath, sandboxProfile, { flag: 'wx', mode: 0o600 })
    receipt.sandbox = { executable: sandboxExec, profilePath: sandboxPath, profileSha256: digest(sandboxPath),
      fileWritesAllowedOnlyUnder: root, sharedIngestReadWriteDenied: [...deniedPaths], outboundNetworkingDenied: true,
      inheritedWritableFileDescriptors: false, actualStartupConfirmed: false }
    const launchToken = randomBytes(32).toString('hex'), adminKey = randomBytes(32).toString('hex')
    const environment = { PATH: '/usr/bin:/bin:/usr/sbin:/sbin', HOME: path.join(root, 'home'), TMPDIR: path.join(root, 'tmp'),
      DYLD_LIBRARY_PATH: payload, UAR_SERVICE_INSTANCE__OWNERSHIP: 'external', UAR_SECURITY__JWT_REQUIRED: 'false',
      UAR_SECURITY__SETTINGS_ADMIN_KEY: adminKey, UAR_MODELS_DIR: path.join(payload, 'uar-models'),
      UAR_BUILTIN_SKILLS_DIR: path.join(root, 'skills'), UAR_SKILLS_WASM_BUILTIN_DIR: path.join(root, 'skills'),
      UAR_SKILLS_USER_DIR: path.join(root, 'skills'), UAR_STATIC_DIR: path.join(root, 'static') }
    stage = 'actual-os-sandbox-v1-startup'
    child = spawn(sandboxExec, ['-f', sandboxPath, '-D', 'ROOT=' + root, binary,
      '--port', String(preparation.preferredPort), '--config', configPath],
    { cwd: path.join(root, 'state'), env: environment, detached: true, shell: false, stdio: ['pipe', 'pipe', 'pipe'] })
    child.stdin.on('error', () => {})
    let spawnFailed = false, port, pending = '', oversizedReadyLine = false
    let stdoutBytes = 0, stderrBytes = 0, sandboxFailureSeen = false
    child.on('error', () => { spawnFailed = true })
    child.stdout.setEncoding('utf8')
    child.stdout.on('data', chunk => {
      stdoutBytes += Buffer.byteLength(chunk)
      pending += chunk
      if (pending.length > 65536) { oversizedReadyLine = true; pending = ''; return }
      let boundary
      while ((boundary = pending.indexOf('\n')) >= 0) {
        const line = pending.slice(0, boundary).trim(); pending = pending.slice(boundary + 1)
        const ready = /^READY:(\d{1,5})$/.exec(line)
        if (ready) port = Number(ready[1])
      }
    })
    child.stderr.setEncoding('utf8')
    child.stderr.on('data', chunk => {
      stderrBytes += Buffer.byteLength(chunk)
      if (/sandbox.*(?:failed|denied|error)|sandbox_init/i.test(chunk)) sandboxFailureSeen = true
    })
    await new Promise((resolve, reject) => {
      child.once('spawn', resolve)
      child.once('error', () => reject(Object.assign(new Error('OWNED_V1_SANDBOX_SPAWN_FAILED'), { code: 'OWNED_V1_SANDBOX_SPAWN_FAILED' })))
    })
    seen.add(child.pid)
    await new Promise((resolve, reject) => child.stdin.write(launchToken + '\n', error =>
      error ? reject(Object.assign(new Error('OWNED_V1_STDIN_AUTHORITY_UNAVAILABLE'), { code: 'OWNED_V1_STDIN_AUTHORITY_UNAVAILABLE' })) : resolve()))
    const deadline = Date.now() + 120000
    while (!port && Date.now() < deadline) {
      controller.signal.throwIfAborted()
      fact(!spawnFailed && child.exitCode === null && child.signalCode === null,
        sandboxFailureSeen ? 'OWNED_V1_OS_SANDBOX_STARTUP_REFUSED' : 'OWNED_V1_CONTAINED_STARTUP_EXITED')
      fact(!oversizedReadyLine, 'OWNED_V1_READY_PROTOCOL_LINE_UNAVAILABLE')
      ownedMembers(child, seen)
      await delay(200, undefined, { signal: controller.signal })
    }
    fact(Number.isInteger(port) && port > 0 && port <= 65535, 'OWNED_V1_CONTAINED_READY_NOT_OBSERVED')
    const endpoint = `http://127.0.0.1:${port}`
    const response = await fetch(endpoint + '/api/uar/capabilities', {
      headers: { authorization: 'Bearer ' + launchToken },
      signal: AbortSignal.any([controller.signal, AbortSignal.timeout(5000)]) })
    fact(response.ok, 'OWNED_V1_AUTHENTICATED_CAPABILITIES_UNAVAILABLE')
    const capabilities = await response.json()
    fact(capabilities.instance?.id === instanceId && capabilities.ownership === 'external' &&
      capabilities.instance.workspace_location === 'local' && capabilities.instance.profile === 'uar.service-instance/1' &&
      capabilities.capabilities.includes('full_harness_delegation_v1') && !capabilities.capabilities.includes('tool_admission_v2'),
      'OWNED_V1_ACTUAL_CAPABILITY_IDENTITY_MISMATCH')
    for (const advertised of Object.values(capabilities.endpoints).filter(Boolean)) {
      const url = new URL(advertised)
      fact(url.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) &&
        Number(url.port) === port && !url.username && !url.password && !url.search && !url.hash,
        'OWNED_V1_ADVERTISED_ENDPOINT_SCOPE_MISMATCH')
    }
    receipt.sandbox.actualStartupConfirmed = true
    receipt.launch = { status: 'ready', pid: child.pid, effectiveReadyPort: port, endpoint,
      executable: binary, binarySha256: digest(binary), payloadManifestSha256: digest(manifestPath),
      configSha256: digest(configPath), environmentNames: Object.keys(environment),
      stdoutBytes, stderrBytes, rawDiagnosticsRecorded: false, source,
      version: capabilities.uar_version, instanceId, ownership: capabilities.ownership, capabilities: capabilities.capabilities,
      endpoints: capabilities.endpoints }
    save(receiptFile, receipt)
    const finalConfigPath = path.join(root, 'older-instance-candidate.json')
    save(finalConfigPath, { ...candidate, oldInstance: { source, binaryPath: binary,
      binarySha256: receipt.launch.binarySha256, payloadManifestPath: manifestPath,
      runtimeCredentialEnv: credentialNames[0], adminCredentialEnv: credentialNames[1],
      instance: { ...preparation.desktopWrapper.instance, workspaceRoots: [path.join(root, 'workspace')],
        endpoints: capabilities.endpoints } } })
    process.env[credentialNames[0]] = launchToken
    process.env[credentialNames[1]] = adminKey
    stage = 'actual-packaged-older-instance-refusal-adapter'
    timeout = setTimeout(abort, 1200000)
    const { operate: runAdapter } = await import(pathToFileURL(path.join(repository, 'scripts/operations/operate-integrated-admission-v2.mjs')).href)
    fact(!controller.signal.aborted, 'OWNED_V1_OPERATION_CANCELLED')
    receipt.adapter = await runAdapter(['--boss', repository, '--launcher', options.launcher,
      '--output', options.output, '--config', finalConfigPath, '--mode', 'older-instance'])
    receipt.status = receipt.adapter.status
    receipt.complete = receipt.adapter.status === 'success'
  } catch (error) {
    receipt.failure = { stage, code: controller.signal.aborted ? 'OWNED_V1_OPERATION_CANCELLED' : safeCode(error),
      ...(child ? { exitCode: child.exitCode, signalCode: child.signalCode } : {}) }
    receipt.status = 'blocked'
  } finally {
    clearTimeout(timeout)
    for (const [name, value] of priorEnvironment) {
      if (value === undefined) delete process.env[name]
      else process.env[name] = value
    }
    try { receipt.cleanup = await stopOwned(child, seen) }
    catch (error) { receipt.cleanup = { treeStopped: false, code: safeCode(error), pid: child?.pid } }
    if (!receipt.cleanup.treeStopped) { receipt.status = 'blocked'; receipt.complete = false }
    process.removeListener('SIGINT', abort); process.removeListener('SIGTERM', abort)
    receipt.finishedAt = new Date().toISOString()
    save(receiptFile, receipt)
  }
  return { status: receipt.status, complete: receipt.complete, receiptFile,
    adapterReceiptFile: receipt.adapter?.receiptFile, failure: receipt.failure, cleanup: receipt.cleanup }
}
if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  try {
    const result = await operate()
    process.stdout.write(JSON.stringify(result) + '\n')
    process.exitCode = result.complete ? 0 : 1
  } catch (error) {
    process.stderr.write(JSON.stringify({ status: 'blocked', failureCode: safeCode(error) }) + '\n')
    process.exitCode = 1
  }
}
