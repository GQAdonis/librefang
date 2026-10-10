// Private application-equivalent supervisor for the packaged sidecar contract.
// It supplies configured host resources; UAR still owns every actual admission,
// model turn, approval, tool effect, stream event and execution receipt.
import assert from 'node:assert/strict';

export const hostPrincipal = 'bauar-private-service';
export const hostId = 'sidecar-launch-host';
export const grantScope = 'fixture:invoke';
export const coverage = Object.freeze({
  path: 'Bossfang -> private fixture supervisor -> packaged uar-sidecar',
  authentication: 'opaque frontend credential; per-launch bearer; verified host-session assertion',
  identity: 'fixed configured service principal and actual workspace header; no issuer or tenant claim',
  resources: 'immutable per-attempt run model credential and administrator-registered MCP grant',
  receiverEnforcement: 'unaltered sidecar guard, host-principal middleware, owner/workspace binding and run grant policy',
  restart: 'fresh launch token and actual READY port; stable frontend credential; unchanged per-attempt resources',
  notCovered: ['native direct Bossfang-to-sidecar principal transport', 'standalone JWT validation', 'remote multi-tenant authentication'],
});

export function superviseSidecar(child, launchToken) {
  assert.match(launchToken, /^[0-9a-f]{64}$/);
  child.fixtureReadyPort = undefined;
  child.fixtureStdinError = false;
  child.stdin.on('error', () => { child.fixtureStdinError = true; });
  // Keep the pipe open after the handshake; closing it is sidecar shutdown.
  child.stdin.write(`${launchToken}\n`);
  let line = '', discarded = false;
  child.stdout.on('data', chunk => {
    for (const character of chunk.toString()) {
      if (character === '\n') {
        const match = !discarded && /^READY:(\d{1,5})\r?$/.exec(line);
        if (match) {
          const port = Number(match[1]);
          if (port >= 1 && port <= 65535) child.fixtureReadyPort = port;
        }
        line = ''; discarded = false;
      } else if (!discarded) {
        if (line.length < 256) line += character;
        else { line = ''; discarded = true; }
      }
    }
    // Only the parsed port remains; never retain stdout or startup messages.
  });
}

function immutable(value) {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) immutable(child);
    Object.freeze(value);
  }
  return value;
}

export function fixtureSupervisor({ serviceToken, peerBase, mcpCredential, modelCredential }) {
  const expiresAtUnix = Math.floor(Date.now() / 1000) + 7200;
  const resources = immutable({
    run_credentials: [{ provider_id: 'openai', provider_kind: 'openai_compatible',
      base_url: `${peerBase}/v1`, api_key: modelCredential, default_model: 'gpt-5.4-mini' }],
    mcp_servers: [{ name: 'fixture', grant: { credential_revision: 'fixture-v1',
      scopes: [grantScope], expires_at_unix: expiresAtUnix,
      headers: { Authorization: mcpCredential } } }],
  });
  let launchToken;
  return {
    setLaunchToken: token => { launchToken = token; },
    headers(req, target) {
      // Only the configured application credential may acquire launch authority.
      if (req.headers.authorization !== `Bearer ${serviceToken}`) return null;
      const headers = { ...req.headers, host: new URL(target).host,
        authorization: `Bearer ${launchToken}`, 'x-uar-principal': hostPrincipal };
      // Preserve Origin for the actual sidecar guard to reject; never relax it.
      return headers;
    },
    async admission(req) {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      assert.ok(body && typeof body === 'object' && !Array.isArray(body));
      assert.ok(!Object.hasOwn(body, 'run_credentials') && !Object.hasOwn(body, 'mcp_servers'),
        'Selected admission must not override application-configured resources');
      return Buffer.from(JSON.stringify({ ...body, ...resources }));
    },
    evidence: () => ({ ...coverage, resourceGrant: { destinationId: 'bauar-private-effect',
      trustedHost: hostId, scopes: [grantScope], credentialRevision: 'fixture-v1', expiresAtUnix } }),
  };
}
