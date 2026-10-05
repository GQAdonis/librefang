import { spawn } from 'node:child_process'
import { createHash, randomBytes } from 'node:crypto'
import fs from 'node:fs/promises'
import { createServer } from 'node:net'
import os from 'node:os'
import path from 'node:path'

export const sourceRevision = 'bafa21e8d469a41104c07c7281a4e3f97cb16009'

function requireFact(value, code) {
  if (!value) throw new Error(code)
}

async function availablePort(requested) {
  requireFact(Number.isInteger(requested) && requested >= 0 && requested <= 65535,
    'EXTERNAL_BOSSFANG_PORT_INVALID')
  const socket = createServer()
  return new Promise((resolve, reject) => {
    socket.once('error', () => reject(new Error('EXTERNAL_BOSSFANG_PORT_UNAVAILABLE')))
    socket.listen(requested, '127.0.0.1', () => {
      const port = socket.address().port
      socket.close(error => error ? reject(error) : resolve(port))
    })
  })
}

function childEnvironment() {
  const result = {}
  for (const name of ['PATH', 'HOME', 'USERPROFILE', 'SystemRoot', 'WINDIR', 'TMPDIR', 'TMP', 'TEMP', 'LANG', 'LC_ALL']) {
    if (process.env[name] !== undefined) result[name] = process.env[name]
  }
  return result
}

async function request(endpoint, route, options, signal) {
  const timeout = AbortSignal.timeout(3000)
  return fetch(endpoint + route, { ...options, redirect: 'error',
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout })
}

async function awaitListening(endpoint, state, signal) {
  const deadline = Date.now() + 60000
  while (Date.now() < deadline) {
    signal?.throwIfAborted()
    requireFact(!state.exited && !state.spawnError, 'EXTERNAL_BOSSFANG_PROCESS_EXITED_BEFORE_READINESS')
    try {
      const response = await request(endpoint, '/api/health', {}, signal)
      if (response.ok && (await response.json()).status === 'ok') return response.status
    } catch {
      signal?.throwIfAborted()
    }
    await new Promise(resolve => setTimeout(resolve, 250))
  }
  throw new Error('EXTERNAL_BOSSFANG_READINESS_UNCONFIRMED')
}

async function stopOwnedChild(child, state, settled) {
  if (state.exited || state.spawnError) return
  const exitedWithin = milliseconds => new Promise(resolve => {
    const timer = setTimeout(() => resolve(false), milliseconds)
    settled.then(() => { clearTimeout(timer); resolve(true) })
  })
  child.kill('SIGTERM')
  if (await exitedWithin(10000)) return
  // This is the same retained child handle, never a PID recovered from disk or an endpoint.
  child.kill('SIGKILL')
  requireFact(await exitedWithin(5000), 'EXTERNAL_BOSSFANG_OWN_PROCESS_CLEANUP_UNCONFIRMED')
}

/** Calling this helper starts one real externally owned BossFang; imports have no side effects. */
export async function prepareExternalBossFang({ binary, binarySha256, sourceCommit, port = 0, signal }) {
  requireFact(sourceCommit === sourceRevision, 'EXTERNAL_BOSSFANG_SOURCE_MISMATCH')
  const expectedSha256 = binarySha256
  requireFact(path.isAbsolute(binary) && /^[a-f0-9]{64}$/.test(expectedSha256),
    'EXTERNAL_BOSSFANG_EXACT_BINARY_REQUIRED')
  signal?.throwIfAborted()
  const actualSha256 = createHash('sha256').update(await fs.readFile(binary)).digest('hex')
  requireFact(actualSha256 === expectedSha256, 'EXTERNAL_BOSSFANG_BINARY_DIGEST_MISMATCH')
  const selectedPort = await availablePort(port)
  const endpoint = `http://127.0.0.1:${selectedPort}`
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'c14-external-bossfang-'))
  await fs.chmod(directory, 0o700)
  const credentials = { username: 'c14-' + randomBytes(8).toString('hex'), password: randomBytes(32).toString('hex') }
  const config = path.join(directory, 'config.toml')
  const data = path.join(directory, 'data')
  const contents = [
    `home_dir = ${JSON.stringify(directory)}`,
    `data_dir = ${JSON.stringify(data)}`,
    `api_listen = ${JSON.stringify(`127.0.0.1:${selectedPort}`)}`,
    `dashboard_user = ${JSON.stringify(credentials.username)}`,
    `dashboard_pass = ${JSON.stringify(credentials.password)}`,
    'require_auth_for_reads = true',
    '', '[storage]', 'namespace = "librefang"', 'database = "main"',
    '', '[storage.backend]', 'kind = "embedded"',
    `path = ${JSON.stringify(path.join(data, 'librefang.surreal'))}`, ''
  ].join('\n')
  let child
  let settled
  const state = { exited: false, spawnError: false }
  let prepared = false
  let cleanup
  const stop = () => cleanup ??= (async () => {
    signal?.removeEventListener('abort', abort)
    try {
      if (child) await stopOwnedChild(child, state, settled)
    } finally {
      if (!child || state.exited || state.spawnError) await fs.rm(directory, { recursive: true, force: true })
      credentials.username = ''
      credentials.password = ''
    }
  })()
  const abort = () => { void stop().catch(() => {}) }
  try {
    await fs.writeFile(config, contents, { mode: 0o600, flag: 'wx' })
    child = spawn(binary, ['--config', config, 'start', '--foreground', '--bind', `127.0.0.1:${selectedPort}`], {
      cwd: directory, env: { ...childEnvironment(), LIBREFANG_HOME: directory,
        LIBREFANG_DASHBOARD_EMBEDDED_ONLY: '1' }, stdio: 'ignore', windowsHide: true
    })
    settled = new Promise(resolve => {
      child.once('error', () => { state.spawnError = true; resolve() })
      child.once('exit', () => { state.exited = true; resolve() })
    })
    signal?.addEventListener('abort', abort, { once: true })
    signal?.throwIfAborted()
    const listeningStatus = await awaitListening(endpoint, state, signal)
    const login = await request(endpoint, '/api/auth/dashboard-login', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(credentials)
    }, signal)
    requireFact(login.status === 200, 'EXTERNAL_BOSSFANG_REAL_LOGIN_FAILED')
    const session = await login.json()
    requireFact(typeof session.token === 'string' && session.token.length > 0,
      'EXTERNAL_BOSSFANG_AUTHENTICATED_SESSION_UNAVAILABLE')
    const identity = await request(endpoint, '/api/authz/whoami', {
      headers: { Authorization: 'Bearer ' + session.token }
    }, signal)
    requireFact(identity.status === 200, 'EXTERNAL_BOSSFANG_REAL_IDENTITY_FAILED')
    const cookies = login.headers.getSetCookie().map(value => value.split(';')[0]).join('; ')
    const dashboard = await request(endpoint, '/dashboard/', {
      headers: { Authorization: 'Bearer ' + session.token, ...(cookies ? { Cookie: cookies } : {}) }
    }, signal)
    requireFact(dashboard.status === 200 && dashboard.headers.get('content-type')?.includes('text/html') &&
      (await dashboard.text()).includes('/dashboard/assets/'), 'EXTERNAL_BOSSFANG_REAL_DASHBOARD_UNAVAILABLE')
    // Private credentials are separate from reportable configuration and provenance.
    signal?.throwIfAborted()
    prepared = true
    return { configuration: { external: { endpoint } }, credentials, publicFixture: {
      sourceRevision, binarySha256: actualSha256, externallyOwned: true,
      listeningStatus, authenticatedStatus: identity.status, dashboardStatus: dashboard.status
    }, stop }
  } finally {
    if (!prepared) await stop()
  }
}
