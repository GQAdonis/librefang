import fs from 'node:fs'
import path from 'node:path'
import { randomBytes, randomUUID } from 'node:crypto'
import { execFileSync, spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { setTimeout as delay } from 'node:timers/promises'

import { candidatePackage, expectedPins, requireFact, sha256 } from './corrected-candidate-contract-2.2.30-20261010.mjs'
import { minimalEnvironment } from '/Users/gqadonis/Projects/prometheus/worktrees/cadence-nested-source-full/skills/process/delivery-cadence/scripts/lib/process.mjs'
import { gatewayEnvironment } from '/Users/gqadonis/Projects/prometheus/worktrees/afc-c16-team-guidance/scripts/reusable-team-operation/io.mjs'
import { setup } from '/Users/gqadonis/Projects/prometheus/worktrees/afc-c16-team-guidance/scripts/approval-lifecycle-operation/setup.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')
const repository = '/Users/gqadonis/Projects/prometheus/worktrees/afc-c16-team-guidance'
const [requestedInstallation] = process.argv.slice(2)
const installationPath = requestedInstallation ? path.resolve(requestedInstallation)
  : path.join(root, '.prometheus/cadence/artifacts/customer-local-mac-2.2.30-60caa4d1-664d-4b61-877d-46e172ba2a2a/installation.json')
const environmentPath = path.join(root, '.prometheus/cadence/inputs/c15-operation-environment-20261006.json')
const code = error => /^[A-Z][A-Z0-9_]{0,127}$/.test(error?.code ?? '') ? error.code : 'CUSTOMER_QUIT_OPERATION_UNAVAILABLE'
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx', mode: 0o600 })

function processes() {
  const output = execFileSync('ps', ['-ww', '-axo', 'pid=,ppid=,pgid=,stat=,lstart=,comm='], { encoding: 'utf8', timeout: 10000 })
  return output.split('\n').flatMap(line => {
    const match = line.match(/^\s*(\d+)\s+(\d+)\s+(\d+)\s+(\S+)\s+(\S+\s+\S+\s+\d+\s+\d+:\d+:\d+\s+\d+)\s+(.+)$/)
    return match ? [{ pid: Number(match[1]), parentPid: Number(match[2]), groupId: Number(match[3]),
      state: match[4], startedAt: match[5].replace(/\s+/g, ' '), executable: match[6].trim() }] : []
  })
}

function descendant(table, pid, parent) {
  const byPid = new Map(table.map(row => [row.pid, row]))
  const seen = new Set()
  while (pid > 1 && !seen.has(pid)) {
    if (pid === parent) return true
    seen.add(pid)
    pid = byPid.get(pid)?.parentPid ?? 0
  }
  return false
}

const nativeKind = row => /\/(?:uar-sidecar|bossfang|librefang)$/.test(row.executable)
  ? (/\/uar-sidecar$/.test(row.executable) ? 'uar' : 'bossfang') : null
const identity = row => ({ pid: row.pid, parentPid: row.parentPid, groupId: row.groupId,
  startedAt: row.startedAt, executable: row.executable, kind: nativeKind(row) })
const sameProcess = (left, right) => right && left.pid === right.pid && left.startedAt === right.startedAt && left.executable === right.executable

async function wait(read, timeout, failure, signal) {
  const until = Date.now() + timeout
  while (Date.now() < until) {
    signal?.throwIfAborted()
    const value = await read()
    if (value) return value
    await delay(200, undefined, signal ? { signal } : {})
  }
  requireFact(false, failure)
}

async function connect(url, signal) {
  const parsed = new URL(url)
  requireFact(parsed.protocol === 'ws:' && ['127.0.0.1', 'localhost', '[::1]'].includes(parsed.hostname),
    'CUSTOMER_QUIT_DEBUGGER_NOT_LOOPBACK')
  const socket = new WebSocket(url)
  const pending = new Map()
  let next = 1
  const fail = () => {
    for (const request of pending.values()) { clearTimeout(request.timer); request.reject(Object.assign(new Error('Debugger unavailable'), { code: 'CUSTOMER_QUIT_DEBUGGER_UNAVAILABLE' })) }
    pending.clear()
  }
  const abort = () => { fail(); socket.close() }
  signal.addEventListener('abort', abort, { once: true })
  socket.addEventListener('message', event => {
    const result = JSON.parse(String(event.data))
    const request = pending.get(result.id)
    if (!request) return
    pending.delete(result.id)
    clearTimeout(request.timer)
    if (result.error || result.result?.exceptionDetails) request.reject(Object.assign(new Error('Evaluation unavailable'), { code: 'CUSTOMER_QUIT_DEBUGGER_EVALUATION_UNAVAILABLE' }))
    else request.resolve(result.result?.result?.value)
  })
  socket.addEventListener('close', () => { signal.removeEventListener('abort', abort); fail() })
  socket.addEventListener('error', fail)
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => { socket.close(); reject(Object.assign(new Error('Debugger timeout'), { code: 'CUSTOMER_QUIT_DEBUGGER_CONNECT_TIMEOUT' })) }, 10000)
    socket.addEventListener('open', () => { clearTimeout(timer); resolve() }, { once: true })
    socket.addEventListener('error', () => { clearTimeout(timer); reject(Object.assign(new Error('Debugger unavailable'), { code: 'CUSTOMER_QUIT_DEBUGGER_UNAVAILABLE' })) }, { once: true })
  })
  return {
    evaluate(expression) {
      signal.throwIfAborted()
      const id = next++
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => { pending.delete(id); reject(Object.assign(new Error('Evaluation timeout'), { code: 'CUSTOMER_QUIT_DEBUGGER_EVALUATION_TIMEOUT' })) }, 120000)
        pending.set(id, { resolve, reject, timer })
        socket.send(JSON.stringify({ id, method: 'Runtime.evaluate', params: { expression, awaitPromise: true, returnByValue: true } }))
      })
    },
    async close() {
      if (socket.readyState === WebSocket.CLOSED) return
      await new Promise(resolve => { socket.addEventListener('close', resolve, { once: true }); socket.close() })
    }
  }
}

async function ipc(evaluate, name, input) {
  const result = await evaluate(`window.api.ipcApi.request(${JSON.stringify(name)},${JSON.stringify(input)})`)
  requireFact(result?.ok, 'CUSTOMER_QUIT_TYPED_OPERATION_REFUSED')
  return result.data
}

async function operate() {
  const directory = path.join(root, '.prometheus/cadence/artifacts/customer-corrected-mac-2.2.30', 'graceful-quit-' + randomUUID())
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 })
  const receiptPath = path.join(directory, 'operation.json')
  const eventsPath = path.join(directory, 'quit-events.jsonl')
  const privateLogPath = path.join(directory, 'private-app.log')
  const profile = path.join(directory, 'profile')
  const workspaceDirectory = path.join(directory, 'workspace')
  const receipt = { schemaVersion: 1, kind: 'corrected-installed-customer-graceful-quit', status: 'failed',
    startedAt: new Date().toISOString(), qualificationRoute: 'production-electron-app-quit-via-main-process-debugger',
    nativeVisualMenuClick: false, inference: 'not-requested', externalEffects: 'not-requested',
    installationReceipt: installationPath, disposableProfile: profile, privateLogPath,
    debuggerClosureIsExitEvidence: false, failureCleanup: [], checks: [] }
  const controller = new AbortController()
  const abort = () => controller.abort()
  process.once('SIGINT', abort)
  process.once('SIGTERM', abort)
  const timeout = setTimeout(abort, 300000)
  let child, renderer, main, mainExit, owned = [], baseline = [], stage = 'candidate-prerequisites'
  try {
    requireFact(process.platform === 'darwin' && process.arch === 'arm64', 'CUSTOMER_QUIT_PLATFORM_UNSUPPORTED')
    requireFact(process.argv.length <= 3, 'CUSTOMER_QUIT_DRIVER_ARGUMENTS_UNSUPPORTED')
    requireFact(['UAR_TEAM_EXECUTION_PROFILE_STAGE', 'UAR_WORKFLOW_EXECUTION_PROFILE_STAGE', 'BOSS_C094_PUBLIC_QUALIFICATION']
      .every(name => process.env[name] === undefined), 'CUSTOMER_QUIT_EXPERIMENTAL_PROFILE_PRESENT')
    const installation = JSON.parse(fs.readFileSync(installationPath, 'utf8'))
    const candidate = candidatePackage(installation)
    requireFact(installation.source === 'aef2ec2cda68605efab9dddf33b46e726e752c2d', 'CUSTOMER_QUIT_SOURCE_PIN_MISMATCH')
    requireFact(sha256(installation.installerPath) === installation.sha256, 'CUSTOMER_QUIT_INSTALLER_BYTES_MISMATCH')
    receipt.sourceRefs = { boss: installation.source, ...expectedPins, appAsarSha256: installation.appAsarSha256,
      sidecarSha256: installation.sidecarSha256, installerSha256: installation.sha256,
      installationReceiptSha256: sha256(installationPath), driverSha256: sha256(fileURLToPath(import.meta.url)),
      bossFangSha256: sha256(path.join(candidate.nativeRoot, 'bossfang')) }
    receipt.candidateScope = installation.publication ?? 'installation-receipt-scope'
    receipt.setupSources = ['scripts/approval-lifecycle-operation/setup.mjs', 'scripts/approval-lifecycle-operation/clients.mjs',
      'scripts/approval-lifecycle-operation/io.mjs', 'scripts/reusable-team-operation/io.mjs']
      .map(relative => ({ path: path.join(repository, relative), sha256: sha256(path.join(repository, relative)) }))
    const previous = new Map()
    const privateEnvironment = JSON.parse(fs.readFileSync(environmentPath, 'utf8'))
    let gateway
    try {
      for (const [name, value] of Object.entries(privateEnvironment)) { previous.set(name, process.env[name]); process.env[name] = value }
      gateway = gatewayEnvironment()
    } finally {
      for (const [name, value] of previous) { if (value === undefined) delete process.env[name]; else process.env[name] = value }
    }
    baseline = processes().filter(nativeKind).map(identity)
    receipt.externalBaseline = baseline
    fs.mkdirSync(profile, { mode: 0o700 })
    fs.mkdirSync(workspaceDirectory, { mode: 0o700 })
    fs.writeFileSync(path.join(workspaceDirectory, 'README.md'), '# Disposable graceful Quit operation\n', { flag: 'wx', mode: 0o600 })
    execFileSync('git', ['init', '--quiet', workspaceDirectory], { stdio: 'ignore' })
    fs.writeFileSync(eventsPath, '', { flag: 'wx', mode: 0o600 })
    const logFd = fs.openSync(privateLogPath, 'wx', 0o600)
    const executable = path.join(installation.app, 'Contents/MacOS/The Boss')
    stage = 'installed-app-launch'
    try {
      child = spawn(executable, ['--lang=en-US', '--inspect=127.0.0.1:0', '--remote-debugging-address=127.0.0.1',
        '--remote-debugging-port=0', '--user-data-dir=' + profile],
      { cwd: repository, env: minimalEnvironment(), detached: true, shell: false, stdio: ['ignore', logFd, logFd] })
    } finally { fs.closeSync(logFd) }
    child.once('error', () => controller.abort())
    child.once('exit', (exitCode, exitSignal) => { mainExit = { exitCode, signal: exitSignal, observedAt: new Date().toISOString() } })
    requireFact(child.pid, 'CUSTOMER_QUIT_APP_PID_UNAVAILABLE')
    receipt.appPid = child.pid
    receipt.appIdentity = identity(await wait(() => processes().find(row => row.pid === child.pid),
      5000, 'CUSTOMER_QUIT_APP_PROCESS_IDENTITY_UNAVAILABLE', controller.signal))
    const debuggerUrl = await wait(() => fs.readFileSync(privateLogPath, 'utf8').match(/Debugger listening on (ws:\/\/127\.0\.0\.1:\d+\/[^\s]+)/)?.[1],
      30000, 'CUSTOMER_QUIT_MAIN_INSPECTOR_UNAVAILABLE', controller.signal)
    const inspectorPort = Number(new URL(debuggerUrl).port)
    const owners = execFileSync('lsof', ['-nP', '-iTCP:' + inspectorPort, '-sTCP:LISTEN', '-Fp'], { encoding: 'utf8', timeout: 10000 })
      .split('\n').filter(line => /^p\d+$/.test(line)).map(line => Number(line.slice(1)))
    requireFact(owners.length === 1 && owners[0] === child.pid, 'CUSTOMER_QUIT_INSPECTOR_OWNER_MISMATCH')
    main = await connect(debuggerUrl, controller.signal)
    const runtime = await main.evaluate(`(() => { const electron=process.mainModule?.require?.('electron'); return {
      pid:process.pid,electron:process.versions.electron,node:process.versions.node,
      appVersion:electron?.app?.getVersion(),isPackaged:electron?.app?.isPackaged,quitAvailable:typeof electron?.app?.quit==='function'} })()`)
    requireFact(runtime.pid === child.pid && runtime.appVersion === expectedPins.version && runtime.isPackaged && runtime.quitAvailable,
      'CUSTOMER_QUIT_PACKAGED_RUNTIME_UNSUPPORTED')
    receipt.runtime = runtime
    receipt.inspector = { loopback: true, port: inspectorPort, ownerPid: owners[0], ownershipVerified: true }
    const portFile = path.join(profile, 'DevToolsActivePort')
    const rendererPort = await wait(() => fs.existsSync(portFile) && Number(fs.readFileSync(portFile, 'utf8').split(/\r?\n/)[0]),
      60000, 'CUSTOMER_QUIT_RENDERER_PORT_UNAVAILABLE', controller.signal)
    const target = await wait(async () => {
      const response = await fetch('http://127.0.0.1:' + rendererPort + '/json/list', { signal: controller.signal })
      requireFact(response.ok, 'CUSTOMER_QUIT_RENDERER_DISCOVERY_FAILED')
      return (await response.json()).find(item => item.type === 'page' && item.webSocketDebuggerUrl &&
        new URL(item.url).pathname.endsWith('/windows/main/index.html'))
    }, 60000, 'CUSTOMER_QUIT_MAIN_RENDERER_UNAVAILABLE', controller.signal)
    renderer = await connect(target.webSocketDebuggerUrl, controller.signal)
    const evaluate = expression => renderer.evaluate(expression)
    await wait(() => evaluate(`(() => {const skip=[...document.querySelectorAll('button')].find(node=>node.getClientRects().length&&node.innerText.trim()==='Set up later');
      if(skip)skip.click();return Boolean(window.api?.ipcApi&&document.querySelector('#app-sidebar'));})()`),
    60000, 'CUSTOMER_QUIT_PRODUCTION_RENDERER_UNAVAILABLE', controller.signal)
    stage = 'typed-owned-service-start'
    const savedCredential = process.env[gateway.credentialEnv]
    let selected
    try {
      process.env[gateway.credentialEnv] = privateEnvironment[gateway.credentialEnv] ?? savedCredential
      selected = await setup(evaluate, { workspaceDirectory, marker: 'CUSTOMER-QUIT-' + randomUUID(), gateway })
    } finally {
      if (savedCredential === undefined) delete process.env[gateway.credentialEnv]
      else process.env[gateway.credentialEnv] = savedCredential
    }
    const snapshot = await ipc(evaluate, 'prometheus.integration.snapshot', {})
    const inventory = await ipc(evaluate, 'prometheus.uar.instances.read', {})
    requireFact(snapshot.uar.state === 'running' && Number.isInteger(snapshot.uar.processId) &&
      inventory.instances.some(item => item.id === inventory.selectedInstanceId && item.ownership === 'managed'),
    'CUSTOMER_QUIT_MANAGED_UAR_REQUIRED')
    const uarTable = processes()
    const startedUar = uarTable.find(row => row.pid === snapshot.uar.processId)
    requireFact(startedUar && nativeKind(startedUar) === 'uar' && descendant(uarTable, startedUar.pid, child.pid),
      'CUSTOMER_QUIT_OWNED_UAR_IDENTITY_UNAVAILABLE')
    owned = [identity(startedUar)]
    await ipc(evaluate, 'bossfang.configure_credentials', { username: 'disposable-quit-operator', password: randomBytes(32).toString('hex') })
    const before = await ipc(evaluate, 'bossfang.status')
    requireFact(before.status === 'stopped' && before.ownership === 'managed', 'CUSTOMER_QUIT_ISOLATED_BOSSFANG_REQUIRED')
    await ipc(evaluate, 'bossfang.configure', { ...before.requested, ownership: 'managed', portPolicy: 'automatic',
      uarInstanceId: inventory.selectedInstanceId, workspaceId: selected.workspaceId })
    const started = await ipc(evaluate, 'bossfang.start')
    requireFact(started.success, 'CUSTOMER_QUIT_OWNED_BOSSFANG_START_FAILED')
    const status = await ipc(evaluate, 'bossfang.status')
    requireFact(status.status === 'running' && status.ownership === 'managed', 'CUSTOMER_QUIT_BOSSFANG_NOT_RUNNING')
    const table = processes()
    const uar = table.find(row => row.pid === snapshot.uar.processId)
    const bossFang = table.filter(row => nativeKind(row) === 'bossfang' && descendant(table, row.pid, child.pid))
    requireFact(uar && nativeKind(uar) === 'uar' && descendant(table, uar.pid, child.pid) && bossFang.length === 1 &&
      uar.executable === path.join(candidate.nativeRoot, 'uar-sidecar') && bossFang[0].executable === path.join(candidate.nativeRoot, 'bossfang'),
    'CUSTOMER_QUIT_OWNED_PROCESS_IDENTITY_MISMATCH')
    owned = [identity(uar), identity(bossFang[0])]
    receipt.ownedBeforeQuit = owned
    receipt.checks.push('installed-candidate-bytes-and-runtime', 'loopback-inspector-owned-by-exact-app', 'production-typed-owned-uar-and-bossfang-start')
    stage = 'production-app-quit'
    const armed = await main.evaluate(`(() => {
      const {app}=process.mainModule.require('electron');const fs=process.mainModule.require('node:fs');
      const file=${JSON.stringify(eventsPath)};
      const record=event=>fs.appendFileSync(file,JSON.stringify({event,at:new Date().toISOString(),pid:process.pid})+'\\n',{mode:0o600});
      app.once('before-quit',()=>record('before-quit'));app.once('will-quit',()=>record('will-quit'));
      setTimeout(()=>{record('app.quit-invoked');app.quit()},1500);
      return {scheduled:true,pid:process.pid};
    })()`)
    requireFact(armed.scheduled && armed.pid === child.pid, 'CUSTOMER_QUIT_NOT_SCHEDULED')
    await renderer.close(); renderer = undefined
    await main.close(); main = undefined
    receipt.debuggersDisconnectedBeforeQuit = fs.readFileSync(eventsPath, 'utf8').length === 0
    requireFact(receipt.debuggersDisconnectedBeforeQuit, 'CUSTOMER_QUIT_DEBUGGER_DISCONNECT_TOO_LATE')
    stage = 'lifecycle-exit-observation'
    await wait(() => {
      const after = processes()
      return mainExit && !after.some(row => row.pid === child.pid || owned.some(item => item.pid === row.pid))
    }, 45000, 'CUSTOMER_QUIT_OWNED_LIFECYCLE_EXIT_UNCONFIRMED', controller.signal)
    const events = fs.readFileSync(eventsPath, 'utf8').trim().split('\n').filter(Boolean).map(line => JSON.parse(line))
    receipt.events = events
    receipt.eventsPath = eventsPath
    requireFact(events.length === 3 && ['app.quit-invoked', 'before-quit', 'will-quit'].every((name, index) =>
      events[index].event === name && events[index].pid === child.pid), 'CUSTOMER_QUIT_EVENT_CHAIN_UNCONFIRMED')
    requireFact(mainExit.exitCode === 0 && mainExit.signal === null, 'CUSTOMER_QUIT_MAIN_EXIT_NOT_CLEAN')
    receipt.mainExit = mainExit
    receipt.ownedExits = owned.map(item => ({ ...item, absentAfterQuit: true, observedAt: new Date().toISOString() }))
    const after = processes()
    receipt.externalAfter = baseline.map(item => ({ ...item, unchanged: sameProcess(item, after.find(row => row.pid === item.pid)) === true }))
    requireFact(receipt.externalAfter.every(item => item.unchanged), 'CUSTOMER_QUIT_EXTERNAL_PROCESS_CHANGED')
    receipt.externalPreservation = baseline.length ? 'baseline-process-identities-preserved' : 'no-external-uar-or-bossfang-process-observed-at-baseline'
    receipt.shutdownEvidence = 'actual-before-quit-and-will-quit-events-main-exit-zero-without-signal-and-owned-child-process-disappearance'
    receipt.checks.push('production-app-quit-before-quit-will-quit-events', 'app-and-owned-native-processes-exited-without-driver-signals',
      baseline.length ? 'baseline-external-process-identities-unchanged' : 'no-external-native-processes-observed-at-baseline')
    receipt.status = 'passed'
  } catch (error) {
    receipt.failureCode = controller.signal.aborted ? 'CUSTOMER_QUIT_TIMEOUT_OR_OPERATOR_CANCELLATION' : code(error)
    receipt.failureStage = stage
    receipt.mainExit = mainExit ?? null
    if (fs.existsSync(eventsPath)) receipt.events = fs.readFileSync(eventsPath, 'utf8').trim().split('\n').filter(Boolean).map(line => JSON.parse(line))
  } finally {
    await renderer?.close()
    await main?.close()
    clearTimeout(timeout)
    process.removeListener('SIGINT', abort)
    process.removeListener('SIGTERM', abort)
    if (receipt.status !== 'passed' && child?.pid) {
      const table = processes()
      const appStillOwned = receipt.appIdentity && sameProcess(receipt.appIdentity, table.find(row => row.pid === child.pid))
      const groups = new Set([...(appStillOwned ? [child.pid] : []),
        ...table.filter(row => appStillOwned && nativeKind(row) && descendant(table, row.pid, child.pid)).map(row => row.groupId),
        ...owned.filter(item => sameProcess(item, table.find(row => row.pid === item.pid))).map(item => item.groupId)])
      for (const groupId of groups) {
        const members = table.filter(row => row.groupId === groupId)
        if (!members.length || members.some(row => baseline.some(item => item.pid === row.pid))) continue
        try { process.kill(-groupId, 'SIGTERM'); receipt.failureCleanup.push({ groupId, signal: 'SIGTERM', qualification: false }) }
        catch (error) { if (error.code !== 'ESRCH') receipt.failureCleanup.push({ groupId, failure: 'signal-not-delivered', qualification: false }) }
      }
      await delay(5000)
      const remaining = processes()
      receipt.failureCleanupRemaining = remaining.filter(row => row.pid === child.pid || owned.some(item => sameProcess(item, row))).map(identity)
    }
    receipt.finishedAt = new Date().toISOString()
    receipt.acceptance = 'operator-acceptance-pending'
    receipt.newCadenceDelivery = false
    write(receiptPath, receipt)
  }
  return { status: receipt.status, receiptPath, failureCode: receipt.failureCode, failureStage: receipt.failureStage }
}

try {
  const result = await operate()
  process.stdout.write(JSON.stringify(result) + '\n')
  process.exitCode = result.status === 'passed' ? 0 : 1
} catch {
  process.stdout.write(JSON.stringify({ status: 'failed', failureCode: 'CUSTOMER_QUIT_DRIVER_PREREQUISITES_UNAVAILABLE' }) + '\n')
  process.exitCode = 1
}
