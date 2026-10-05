import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { setTimeout as delay } from 'node:timers/promises'

export const digest = (bytes) => createHash('sha256').update(bytes).digest('hex')
export const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx', mode: 0o600 })
export class Unavailable extends Error {
  constructor(code) { super(code); this.code = code }
}
export function requireFact(condition, code) {
  if (!condition) throw new Unavailable(code)
}
export async function waitFor(signal, read, code, timeoutMs = 30000, intervalMs = 250) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    signal.throwIfAborted()
    const value = await read()
    if (value) return value
    await delay(intervalMs, undefined, { signal })
  }
  throw new Unavailable(code)
}

export function gatewayEnvironment(env = process.env) {
  const credentialEnv = env.BOSS_C14_GATEWAY_CREDENTIAL_ENV
  requireFact(/^[A-Za-z_][A-Za-z0-9_]*$/.test(credentialEnv ?? ''), 'C14_GATEWAY_CREDENTIAL_REFERENCE_REQUIRED')
  requireFact(Boolean(env[credentialEnv]?.trim()), 'C14_GATEWAY_CREDENTIAL_UNAVAILABLE')
  const fields = {
    endpoint: env.BOSS_C14_GATEWAY_ENDPOINT,
    alias: env.BOSS_C14_GATEWAY_ALIAS,
    providerId: env.BOSS_C14_GATEWAY_PROVIDER_ID,
    modelId: env.BOSS_C14_GATEWAY_MODEL_ID
  }
  requireFact(Object.values(fields).every((value) => typeof value === 'string' && value.trim()), 'C14_SELECTED_GATEWAY_IDENTITY_REQUIRED')
  let endpoint
  try { endpoint = new URL(fields.endpoint) } catch { throw new Unavailable('C14_GATEWAY_ENDPOINT_REQUIRED') }
  requireFact(['http:', 'https:'].includes(endpoint.protocol) && !endpoint.username && !endpoint.password && !endpoint.search && !endpoint.hash,
    'C14_GATEWAY_ENDPOINT_CREDENTIALS_FORBIDDEN')
  if (env.BOSS_C14_GATEWAY_PROVIDER_BASE_URL) {
    let provider
    try { provider = new URL(env.BOSS_C14_GATEWAY_PROVIDER_BASE_URL) } catch { throw new Unavailable('C14_PROVIDER_BASE_URL_INVALID') }
    requireFact(['http:', 'https:'].includes(provider.protocol) && !provider.username && !provider.password && !provider.search && !provider.hash,
      'C14_PROVIDER_ENDPOINT_CREDENTIALS_FORBIDDEN')
  }
  return { ...fields, credentialEnv, ...(env.BOSS_C14_GATEWAY_PROVIDER_BASE_URL
    ? { providerBaseUrl: env.BOSS_C14_GATEWAY_PROVIDER_BASE_URL } : {}) }
}

export function prepareRepository(directory, marker) {
  fs.mkdirSync(directory, { recursive: false })
  const before = `# C14 isolated coding workspace\n\nDelivery marker: pending-${marker}\n`
  const after = before.replace('pending-' + marker, marker)
  fs.writeFileSync(path.join(directory, 'README.md'), before, { flag: 'wx' })
  return { beforeSha256: digest(before), afterSha256: digest(after), after }
}

export function repositoryResult(directory, expected) {
  const paths = []
  function visit(root, prefix = '') {
    for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
      if (!prefix && entry.name === '.git') continue
      const relative = prefix + entry.name
      if (entry.isDirectory()) visit(path.join(root, entry.name), relative + '/')
      else paths.push(relative)
    }
  }
  visit(directory)
  requireFact(paths.length === 1 && paths[0] === 'README.md', 'C14_CHANGE_EXCEEDED_ISOLATED_SCOPE')
  const bytes = fs.readFileSync(path.join(directory, 'README.md'))
  requireFact(bytes.toString('utf8') === expected, 'C14_REPOSITORY_CHANGE_NOT_OBSERVED')
  return { paths, sha256: digest(bytes) }
}
