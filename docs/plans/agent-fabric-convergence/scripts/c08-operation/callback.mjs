import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { lookup } from 'node:dns/promises';
import { BlockList, isIP } from 'node:net';
import { join } from 'node:path';
import { once } from 'node:events';
import { Blocked, digestFile, hash, immutable, secret } from './io.mjs';

const privateAddresses = new BlockList();
for (const [address, prefix] of [['0.0.0.0', 8], ['10.0.0.0', 8], ['127.0.0.0', 8],
  ['100.64.0.0', 10], ['169.254.0.0', 16], ['172.16.0.0', 12], ['192.168.0.0', 16],
  ['192.0.0.0', 24], ['224.0.0.0', 4], ['240.0.0.0', 4]]) privateAddresses.addSubnet(address, prefix, 'ipv4');
for (const [address, prefix] of [['::', 128], ['::1', 128], ['fc00::', 7], ['fe80::', 10],
  ['ff00::', 8], ['fec0::', 10], ['::ffff:0:0', 96], ['64:ff9b::', 96], ['2002::', 16]]) {
  privateAddresses.addSubnet(address, prefix, 'ipv6');
}
async function publicOrigin(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) {
    throw new Blocked('public_https_callback_required');
  }
  const host = url.hostname.replace(/^\[|\]$/g, '');
  const addresses = isIP(host) ? [{ address: host }] : await lookup(host, { all: true });
  if (!addresses.length || addresses.some(({ address }) => privateAddresses.check(address, isIP(address) === 4 ? 'ipv4' : 'ipv6'))) {
    throw new Blocked('private_callback_refused');
  }
  return url.origin;
}

export async function receiver(config, directory, runId) {
  if (!config?.secretEnv) throw new Blocked('callback_secret_environment_required');
  const signingKey = secret(config.secretEnv);
  const path = `/c08/${randomUUID()}`;
  const posts = [];
  const seen = new Map();
  const pending = new Map();
  let tunnel;
  const server = createServer(async (request, response) => {
    const reply = (status, value) => { response.writeHead(status, { 'content-type': 'application/json' }); response.end(JSON.stringify(value)); };
    if (request.method !== 'POST' || request.url !== path) return reply(404, { error: 'not_found' });
    const chunks = [];
    let bytes = 0;
    try {
      for await (const chunk of request) {
        bytes += chunk.length;
        if (bytes > 4 * 1024 * 1024) return reply(413, { error: 'body_limit' });
        chunks.push(chunk);
      }
      const body = Buffer.concat(chunks);
      const expected = Buffer.from(`sha256=${createHmac('sha256', signingKey).update(body).digest('hex')}`);
      const provided = Buffer.from(request.headers['x-webhook-signature'] ?? '');
      if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) return reply(403, { error: 'forbidden' });
      const payload = JSON.parse(body);
      if (!payload.action_id || !Number.isSafeInteger(payload.chunk_index) || payload.chunk_index < 0
          || typeof payload.message !== 'string' || !payload.room_id || !payload.account_id) {
        return reply(400, { error: 'action_bound_callback_required' });
      }
      const key = `${payload.action_id}:${payload.chunk_index}`;
      const digest = hash(body);
      // Timestamp changes on retries; immutability is the posted text and target.
      const contentHash = hash(JSON.stringify([payload.message, payload.account_id, payload.room_id, payload.thread_id]));
      const write = async () => {
        const existing = seen.get(key);
        if (existing) {
          if (existing.contentHash !== contentHash) throw new Blocked('callback_idempotency_conflict');
          existing.attempts += 1;
          return existing;
        }
        const row = { action_id: payload.action_id, chunk_index: payload.chunk_index,
          native_message_id: `c08-receiver-${hash(`${runId}:${key}`)}`,
          accountSha256: hash(payload.account_id), roomSha256: hash(payload.room_id),
          threadSha256: hash(JSON.stringify(payload.thread_id)), contentHash,
          requestSha256: digest, attempts: 1, observedAt: new Date().toISOString() };
        // A native receipt is returned only after this actual signed post has
        // durably committed. No sender/handler is simulated by the receiver.
        await immutable(join(directory, `${hash(key)}.json`), row);
        seen.set(key, row); posts.push(row);
        return row;
      };
      const previous = pending.get(key) ?? Promise.resolve();
      const operation = previous.then(write);
      pending.set(key, operation.catch(() => {}));
      const row = await operation;
      reply(200, { action_id: row.action_id, message_id: row.native_message_id });
    } catch (error) { reply(error.code === 'callback_idempotency_conflict' ? 409 : 400, { error: 'callback_rejected' }); }
  });
  server.listen(config.port ?? 0, config.host ?? '127.0.0.1');
  await once(server, 'listening');
  const port = server.address().port;
  try {
    let origin;
    if (config.tunnelCommand) {
      const command = config.tunnelCommand;
      tunnel = spawn(command, ['tunnel', '--url', `http://127.0.0.1:${port}`, '--no-autoupdate'], {
        stdio: ['ignore', 'pipe', 'pipe'],
        env: Object.fromEntries(Object.entries(process.env).filter(([name]) => !name.startsWith('C08_'))), shell: false,
      });
      origin = await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Blocked('public_tunnel_unavailable')), 45000);
        const capture = chunk => {
          const match = String(chunk).match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
          if (match) { clearTimeout(timer); resolve(match[0]); }
        };
        tunnel.stdout.on('data', capture); tunnel.stderr.on('data', capture);
        tunnel.once('error', () => { clearTimeout(timer); reject(new Blocked('tunnel_command_unavailable')); });
        tunnel.once('exit', () => { clearTimeout(timer); reject(new Blocked('public_tunnel_exited')); });
      });
    } else {
      if (!config.publicOrigin) throw new Blocked('public_callback_relay_required');
      origin = config.publicOrigin;
    }
    origin = await publicOrigin(origin);
    return { url: `${origin}${path}`, posts, port,
      tunnelSha256: config.tunnelCommand ? await digestFile(config.tunnelCommand) : null,
      async close() {
        tunnel?.kill('SIGTERM');
        server.closeAllConnections();
        await new Promise(resolve => server.close(resolve));
      } };
  } catch (error) {
    tunnel?.kill('SIGTERM'); server.close(); throw error;
  }
}
