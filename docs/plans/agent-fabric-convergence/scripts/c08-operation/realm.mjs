import { generateKeyPairSync, randomBytes, randomUUID, sign } from 'node:crypto';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { Blocked, hash } from './io.mjs';

// An ephemeral issuer supplies genuine signed credentials to the products'
// unchanged authenticators. It does not replace Gate, Cedar or UAR policy.
export async function realm(config) {
  if (!config) return { async close() {}, publicReceipt: null };
  if (!config.issuer || !config.port) throw new Blocked('realm_issuer_and_loopback_port_required');
  const generated = new Map();
  const set = (name, value) => {
    if (!/^C08_[A-Z0-9_]+$/.test(name) || process.env[name]) throw new Blocked('isolated_realm_environment_name_conflict');
    generated.set(name, value); process.env[name] = value;
  };
  const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const kid = `c08-${randomUUID()}`;
  const jwk = { ...publicKey.export({ format: 'jwk' }), kid, alg: 'RS256', use: 'sig' };
  const server = createServer((request, response) => {
    if (request.method !== 'GET' || request.url !== '/.well-known/jwks.json') {
      response.writeHead(404); response.end(); return;
    }
    response.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
    response.end(JSON.stringify({ keys: [jwk] }));
  });
  try {
    server.listen(config.port, '127.0.0.1'); await once(server, 'listening');
    for (const token of config.tokens ?? []) {
      if (!token.claims?.sub || !token.claims?.aud) throw new Blocked('realm_subject_and_audience_required');
      const now = Math.floor(Date.now() / 1000);
      const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
      const header = encode({ alg: 'RS256', typ: 'JWT', kid });
      const claims = encode({ ...token.claims, iss: config.issuer, iat: now, nbf: now - 5,
        exp: now + (config.ttlSeconds ?? 3600), jti: randomUUID() });
      const input = `${header}.${claims}`;
      set(token.tokenEnv, `${input}.${sign('RSA-SHA256', Buffer.from(input), privateKey).toString('base64url')}`);
    }
    if (config.webhookSecretEnv) set(config.webhookSecretEnv, randomBytes(32).toString('hex'));
    return { jwksUrl: `http://127.0.0.1:${config.port}/.well-known/jwks.json`,
      publicReceipt: { algorithm: 'RS256', publicKeySha256: hash(JSON.stringify(jwk)),
        issuerSha256: hash(config.issuer), generatedEnvironmentNames: [...generated.keys()] },
      async close() {
        for (const [name, value] of generated) if (process.env[name] === value) delete process.env[name];
        server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
      } };
  } catch (error) {
    for (const name of generated.keys()) delete process.env[name];
    server.close(); throw error;
  }
}
