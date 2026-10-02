import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

export class Blocked extends Error {
  constructor(code) { super(code); this.code = code; }
}
export const hash = value => createHash('sha256').update(String(value)).digest('hex');
export function secret(name) {
  if (!name || !process.env[name]) throw new Blocked(`missing_environment:${name ?? 'unspecified'}`);
  return process.env[name];
}
export async function digestFile(path) {
  const digest = createHash('sha256');
  for await (const chunk of createReadStream(path)) digest.update(chunk);
  return digest.digest('hex');
}
export async function immutable(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
}
export function endpoint(service, path = '') {
  if (!service?.url) throw new Blocked('service_url_required');
  const url = new URL(service.url);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new Blocked('plain_http_service_url_required');
  }
  return `${url.toString().replace(/\/$/, '')}${path}`;
}
export async function api(service, path, body, accepted = [200, 201, 202, 204], extra = {}) {
  const headers = { accept: 'application/json', ...extra.headers };
  if (service.tokenEnv) headers.authorization = `Bearer ${secret(service.tokenEnv)}`;
  if (service.workspace) headers['x-uar-workspace-id'] = service.workspace;
  if (body !== undefined) headers['content-type'] = 'application/json';
  let response;
  try {
    response = await fetch(endpoint(service, path), {
      method: extra.method ?? (body === undefined ? 'GET' : 'POST'), headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      redirect: 'error', signal: AbortSignal.timeout(extra.timeoutMs ?? 15000),
    });
  } catch { throw new Blocked('service_transport_unavailable'); }
  const raw = await response.text();
  let result;
  try { result = raw ? JSON.parse(raw) : null; }
  catch { result = { responseSha256: hash(raw) }; }
  if (!accepted.includes(response.status)) {
    const error = new Blocked(`http_status:${response.status}`);
    error.response = { status: response.status, result };
    throw error;
  }
  return { status: response.status, result, observedAt: new Date().toISOString() };
}

const tables = ['channel_source_occurrences', 'channel_route_affinity', 'channel_route_dispatch',
  'channel_observer_subscriptions', 'channel_observer_deliveries', 'channel_causal_actions', 'channel_provider_echoes'];
export async function snapshot(config) {
  const database = config.surreal;
  if (!database?.namespace || !database?.database) throw new Blocked('surreal_read_only_scope_required');
  const headers = { accept: 'application/json', 'content-type': 'text/plain',
    'surreal-ns': database.namespace, 'surreal-db': database.database };
  headers.authorization = database.tokenEnv ? `Bearer ${secret(database.tokenEnv)}`
    : `Basic ${Buffer.from(`${secret(database.userEnv)}:${secret(database.passwordEnv)}`).toString('base64')}`;
  // The statement is constructed solely from this fixed SELECT-only allowlist.
  // Use the isolated disposable database; projection content is never selected.
  const result = {};
  for (const table of tables) {
    let response;
    try {
      response = await fetch(endpoint(database, '/sql'), { method: 'POST', headers,
        body: `SELECT * OMIT projection, text, text_projection FROM ${table} LIMIT 1000;`,
        redirect: 'error', signal: AbortSignal.timeout(15000) });
    } catch { throw new Blocked('surreal_unavailable'); }
    if (!response.ok) throw new Blocked(`surreal_status:${response.status}`);
    const rows = await response.json();
    if (rows.length !== 1 || rows[0].status !== 'OK' || !Array.isArray(rows[0].result)) {
      throw new Blocked('surreal_read_failed');
    }
    if (rows[0].result.length >= 1000) throw new Blocked('isolated_database_row_bound_reached');
    result[table] = rows[0].result;
  }
  return result;
}

// Persist a deliberately narrow receipt projection. Scope identities and any
// unrecognized string are fingerprints, never source content, URLs or secrets.
const publicStrings = new Set(['schema', 'checkpointId', 'creationTaskRef', 'status', 'kind', 'code',
  'functionalAcceptance', 'operationCoverage', 'installedPlatformAcceptance',
  'mode', 'sourceBinding', 'nodeVersion', 'version', 'authorityDecisionBinding', 'nativeBoundary', 'limitation',
  'name', 'operation', 'classification', 'profile', 'state', 'reason', 'suppression_reason',
  'startedAt', 'finishedAt', 'observedAt', 'recorded_at', 'updated_at', 'sourceRevision',
  'sha256', 'requestSha256', 'responseSha256', 'native_message_id', 'action_id',
  'occurrence_id', 'root_occurrence_id', 'parent_action_id', 'scope_key', 'route_identity',
  'delivery_id', 'subscription_id', 'subscriber_cursor_id', 'id', 'nativeMessageId']);
const safeLiterals = /^[a-zA-Z0-9_.:/ -]{1,160}$/;
export function redact(value, key = '') {
  if (value === null || typeof value === 'boolean' || typeof value === 'number') return value;
  if (Array.isArray(value)) return value.map(item => redact(item, key));
  if (typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([name, item]) => {
    if (/secret|token|password|bearer|authorization|credential/i.test(name)) return [name, '[redacted]'];
    return [name, redact(item, name)];
  }));
  if (typeof value === 'string') {
    if (publicStrings.has(key) && safeLiterals.test(value)
        && !Object.values(process.env).some(item => item?.length > 12 && value.includes(item))) return value;
    return `sha256:${hash(value)}`;
  }
  return null;
}

export function source(snapshotValue, input) {
  const rows = snapshotValue.channel_source_occurrences.filter(row => row.native_message_id === input.message_id
    && row.scope.provider === 'webhook' && row.scope.account === input.account
    && row.scope.workspace === input.workspace_id && row.scope.room === input.room_id
    && row.scope.thread === input.thread_id && row.scope.sender === input.sender_id);
  if (rows.length > 1) throw new Blocked('ambiguous_native_source');
  return rows[0] ?? null;
}
