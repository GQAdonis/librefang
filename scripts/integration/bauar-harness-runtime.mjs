// Private supervised packaged provider/configuration and public catalog seeding.
import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import net from 'node:net';
import { fixtureSupervisor, grantScope, hostId, hostPrincipal, superviseSidecar } from './bauar-harness-supervisor.mjs';

export const workspace = 'workspace:c03';
export const instanceId = 'agent-instance:c03';
export const secret = () => randomBytes(32).toString('hex');
const sha = bytes => `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
  return value;
}
function digest(value) {
  const copy = structuredClone(value);
  delete copy.contentDigest;
  return sha(JSON.stringify(canonical(copy)));
}
export async function until(label, operation, timeout = 90000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const result = await operation();
    if (result) return result;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out: ${label}`);
}
export async function request(base, path, options) {
  try { return await requestUnchecked(base, path, options); }
  catch (error) {
    if (error?.name === 'TimeoutError' || error?.name === 'AbortError') {
      const routes = [
        [/^\/api\/uar\/jobs\/[^/]+\/admission$/, 'selected_admission'],
        [/^\/api\/uar\/delegations\/[^/]+\/events(?:\?|$)/, 'selected_events'],
        [/^\/api\/uar\/delegations\/[^/]+\/approve$/, 'selected_approval'],
        [/^\/api\/uar\/delegations\/[^/]+\/cancel$/, 'selected_cancel'],
        [/^\/api\/uar\/delegations\/[^/]+$/, 'selected_lookup'],
        [/^\/api\/uar\/full-harness\/v1\/tasks\/[^/]+\/stream(?:\?|$)/, 'provider_stream'],
        [/^\/api\/uar\/full-harness\/v1\/tasks\/[^/]+$/, 'provider_receipt'],
        [/^\/a2a\/tasks\//, 'a2a_rest'], [/^\/a2a$/, 'a2a_rpc'],
        [/^\/api\/tasks(?:\/|$)/, 'task_board'], [/^\/api\/agents$/, 'agent_creation'],
      ];
      console.error(JSON.stringify({ harnessRequestTimeout: {
        operation: routes.find(([pattern]) => pattern.test(path))?.[1] ?? 'unclassified',
        method: ['GET', 'POST', 'DELETE', 'PUT'].includes(options?.method ?? 'GET') ? (options?.method ?? 'GET') : null,
        rpcMethod: path === '/a2a' && ['tasks/get', 'tasks/cancel'].includes(options?.body?.method) ? options.body.method : null,
      } }));
    }
    throw error;
  }
}
async function requestUnchecked(base, path, { token, principal, method = 'GET', body, workspaceId, timeout = 60000 } = {}) {
  const response = await fetch(`${base}${path}`, { method,
    headers: { ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(principal ? { 'x-uar-principal': principal } : {}),
      ...(workspaceId ? { 'x-uar-workspace-id': workspaceId } : {}),
      ...(body === undefined ? {} : { 'content-type': 'application/json' }) },
    body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(timeout) });
  const text = await response.text();
  if (!text) return { status: response.status, bodyFormat: 'empty', body: null };
  const mediaType = response.headers.get('content-type')?.split(';')[0].trim().toLowerCase();
  const jsonMediaType = mediaType === 'application/json' || mediaType?.endsWith('+json');
  // Axum's missing-field rejection is text/plain; retain its refusal status,
  // never the deserialization text, request fields, or credential-bearing body.
  if (!response.ok && !jsonMediaType) {
    return { status: response.status, bodyFormat: 'non_json', body: null };
  }
  try {
    return { status: response.status, bodyFormat: 'json', body: JSON.parse(text) };
  } catch {
    throw new Error(`Invalid JSON response: HTTP ${response.status}`);
  }
}
export async function expected(base, path, options, statuses = [200]) {
  const result = await request(base, path, options);
  let diagnostic = '';
  if (!statuses.includes(result.status) && /^\/api\/uar\/jobs\/[^/]+\/admission$/.test(path)) {
    // Only fixed 503 codes from job_mapping::admit may leave the private response.
    const allowed = ['stored_job_unavailable', 'job_dispatch_storage_unknown',
      'selected_attempt_storage_unknown', 'selected_attempt_outcome_unknown',
      'uar_service_binding_unavailable', 'selected_dispatch_unavailable_or_unknown'];
    const error = result.body?.error;
    const code = error?.code;
    diagnostic = ` ${JSON.stringify({ category: 'selected_admission',
      code: allowed.includes(code) ? code : null, bodyIsNull: result.body === null,
      errorIsObject: error !== null && typeof error === 'object' && !Array.isArray(error),
      codeIsString: typeof code === 'string' })}`;
  }
  assert.ok(statuses.includes(result.status), `${options?.method ?? 'GET'} ${path}: HTTP ${result.status}${diagnostic}`);
  return result.body;
}
async function freePort() {
  const listener = net.createServer();
  await new Promise(resolve => listener.listen(0, '127.0.0.1', resolve));
  const port = listener.address().port;
  await new Promise(resolve => listener.close(resolve));
  return port;
}
export function privateEnv(root, extra = {}) {
  // Never inherit operator credentials or installed provider discovery paths.
  return { HOME: root, XDG_CONFIG_HOME: join(root, 'config'), XDG_DATA_HOME: join(root, 'data'),
    TMPDIR: root, PATH: dirname(process.execPath), RUST_LOG: 'off', ...extra };
}
export function launch(binary, args, root, env, { classifyStderr = false, sidecarToken } = {}) {
  const child = spawn(binary, args, { cwd: root, env: privateEnv(root, env),
    stdio: [sidecarToken ? 'pipe' : 'ignore', sidecarToken ? 'pipe' : 'ignore', classifyStderr ? 'pipe' : 'ignore'] });
  child.fixtureError = undefined;
  child.on('error', error => { child.fixtureError = error; });
  if (sidecarToken) superviseSidecar(child, sidecarToken);
  if (classifyStderr) {
    child.fixtureStderr = { stackOverflow: false, rustPanic: false, allocationFailure: false };
    child.stderr.on('data', chunk => {
      const text = chunk.toString();
      child.fixtureStderr.stackOverflow ||= text.includes('has overflowed its stack') || text.includes('fatal runtime error: stack overflow');
      child.fixtureStderr.rustPanic ||= text.includes('panicked at');
      child.fixtureStderr.allocationFailure ||= /memory allocation of \d+ bytes failed/.test(text);
      // Persist only classifications; no stderr suffix or raw text is retained.
    });
  }
  return child;
}
export function childStatus(child) {
  return { exitCode: Number.isInteger(child?.exitCode) ? child.exitCode : null,
    signal: ['SIGABRT', 'SIGSEGV', 'SIGILL', 'SIGBUS', 'SIGKILL', 'SIGTERM'].includes(child?.signalCode) ? child.signalCode : null,
    running: Boolean(child && child.exitCode === null && child.signalCode === null),
    spawnError: Boolean(child?.fixtureError),
    stdinError: child?.fixtureStdinError === true,
    readyObserved: Number.isInteger(child?.fixtureReadyPort),
    stderrClassified: Boolean(child?.fixtureStderr),
    stackOverflow: child?.fixtureStderr?.stackOverflow === true,
    rustPanic: child?.fixtureStderr?.rustPanic === true,
    allocationFailure: child?.fixtureStderr?.allocationFailure === true };
}
export function alive(child) {
  if (child.fixtureError) throw child.fixtureError;
  assert.equal(child.exitCode, null, 'Private fixture process exited before its checkpoint');
  assert.equal(child.signalCode, null, 'Private fixture process was signalled before its checkpoint');
}
export async function stop(child, signal = 'SIGTERM') {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  const exited = once(child, 'exit');
  child.kill(signal);
  const timer = setTimeout(() => child.kill('SIGKILL'), 10000);
  try { await exited; } finally { clearTimeout(timer); }
}
export async function providerFixture({ root, binary, source, peer, proxy, mcpCredential, modelCredential }) {
  await access(binary);
  const directory = join(root, 'provider');
  await mkdir(directory, { recursive: true });
  const policies = join(directory, 'policies');
  await mkdir(policies, { recursive: true });
  for (const name of ['default.cedar', 'tool-approval.cedar', 'skill-mutation.cedar']) {
    await writeFile(join(policies, name), await readFile(join(resolve(source), 'policies', name)), { mode: 0o600 });
  }
  const port = await freePort(), grpc = await freePort(), token = secret();
  const supervisor = fixtureSupervisor({ serviceToken: token, peerBase: peer.base, mcpCredential, modelCredential });
  const frontendAuth = { token, workspaceId: workspace };
  let base, launchToken;
  const skills = join(directory, 'builtin-skills');
  const fixtureRoot = join(resolve(source), 'tests/fixtures/collaboration');
  const fixture = file => readFile(join(fixtureRoot, file), 'utf8');
  const skillPath = join(skills, 'sample-skill/SKILL.md');
  await mkdir(dirname(skillPath), { recursive: true });
  const skill = (await fixture('builtin-skills/sample-skill/SKILL.md'))
    .replace('  - native_echo\n', '  - native_echo\n  - fixture__effect\n');
  assert.ok(skill.includes('  - fixture__effect\n'), 'Skill fixture source changed');
  await writeFile(skillPath, skill, { mode: 0o600 });
  const endpoints = { runtime: proxy.base, administration: `${proxy.base}/api/uar`,
    models: `${proxy.base}/v1` };
  const config = {
    security: { deployment_profile: 'trusted_local', jwt_required: false,
      settings_mutation_auth_required: false },
    resilience: { rate_limit_enabled: false },
    persistence: { provider: 'surreal', database_url: `surrealkv://${join(directory, 'surreal')}` },
    service_instance: { instance_id: instanceId, ownership: 'external', workspace_location: 'local',
      credential_ref: 'env://BAUAR_UAR_BEARER',
      runtime_endpoint: endpoints.runtime, administration_endpoint: endpoints.administration,
      models_endpoint: endpoints.models },
    llm: { model: 'gpt-5.4-mini', base_url: `${peer.base}/v1`, api_key: modelCredential },
    server: { host: '127.0.0.1', port, grpc_port: grpc, shutdown_timeout_secs: 5 },
  };
  const configPath = join(directory, 'uar.yaml');
  await writeFile(configPath, JSON.stringify(config), { mode: 0o600 });
  await writeFile(join(directory, 'mcp.json'), JSON.stringify({ mcpServers: { fixture: {
    url: `${peer.base}/mcp`, grant_policy: { destination_id: 'bauar-private-effect',
      trusted_hosts: [hostId], required_scopes: [grantScope], allow_private_http: true } } } }), { mode: 0o600 });
  let process;
  async function start() {
    launchToken = secret();
    process = launch(binary, ['--config', configPath, '--port', String(port)], directory, {
      UAR_BUILTIN_SKILLS_DIR: skills, UAR_SECURITY__JWT_REQUIRED: 'false',
      UAR_SERVICE_INSTANCE__OWNERSHIP: 'external',
    }, { classifyStderr: true, sidecarToken: launchToken });
    await until('packaged sidecar READY port', async () => {
      alive(process);
      assert.equal(process.fixtureStdinError, false, 'Sidecar launch handshake pipe failed');
      return process.fixtureReadyPort;
    });
    base = `http://127.0.0.1:${process.fixtureReadyPort}`;
    supervisor.setLaunchToken(launchToken);
    proxy.setSupervisor(supervisor);
    proxy.setTarget(base);
    await until('authenticated packaged UAR readiness', async () => {
      alive(process);
      try { return (await request(base, '/readyz', { token: launchToken, principal: hostPrincipal })).status === 200; } catch { return false; }
    });
  }
  async function seed() {
    const capabilities = await expected(proxy.base, '/api/v1/collaboration/capabilities', frontendAuth);
    assert.ok(capabilities.bindingOwnerId, 'Verified service owner must come from provider');
    const agent = JSON.parse(await fixture('agent-definition.json'));
    agent.contextStrategy.value.max_messages = 20;
    for (const ref of [agent.skills[0], agent.sourceDescriptor.skills[0]]) {
      ref.digest = sha(skill);
      ref.requiredTools.push('fixture__effect');
    }
    agent.contentDigest = digest(agent);
    const team = JSON.parse(await fixture('team-definition.json'));
    team.members[0].definition.digest = agent.contentDigest;
    team.contentDigest = digest(team);
    const files = { 'agent-definition.json': `${JSON.stringify(agent, null, 2)}\n`,
      'team-definition.json': `${JSON.stringify(team, null, 2)}\n`,
      'workflow-definition.json': await fixture('workflow-definition.json') };
    const manifest = JSON.parse(await fixture('package-manifest.json'));
    manifest.entrypoints[0].digest = agent.contentDigest;
    manifest.files[0].definition.digest = agent.contentDigest;
    manifest.files[1].definition.digest = team.contentDigest;
    for (const file of manifest.files) file.byteDigest = sha(files[file.path]);
    manifest.lock[0].reference.digest = agent.contentDigest;
    manifest.contentDigest = digest(manifest);
    const installed = await expected(proxy.base, '/api/v1/collaboration/packages:install', {
      ...frontendAuth, method: 'POST', body: { commandId: 'bauar-package', manifest: JSON.stringify(manifest), files } }, [201]);
    assert.ok(installed.receipt?.catalogRevision > 0, 'Actual package receipt required');
    await expected(proxy.base, '/api/v1/collaboration/representation-grants', { ...frontendAuth, method: 'POST',
      body: { commandId: 'bauar-grant', expectedRevision: 0, grant: JSON.parse(await fixture('representation-grant-v1.json')) } }, [201]);
    const binding = JSON.parse(await fixture('deployment-binding.json'));
    binding.ownerId = capabilities.bindingOwnerId;
    binding.runtimeCredentialRef = 'env://BAUAR_UAR_BEARER';
    binding.package.digest = manifest.contentDigest;
    binding.skillBindings[0].digest = sha(skill);
    binding.skillBindings[0].requiredTools.push('fixture__effect');
    binding.skillBindings[0].installedLocation = `file://${skillPath}`;
    binding.contentDigest = digest(binding);
    const bound = await expected(proxy.base, '/api/v1/collaboration/deployment-bindings', { ...frontendAuth, method: 'POST',
      body: { commandId: 'bauar-binding', expectedRevision: 0, binding } }, [201]);
    assert.equal(bound.preflight?.activationSupported, true, 'Actual binding activation required');
    return { authority: 'service', workspaceId: workspace, bindingId: binding.id, bindingRevision: binding.revision,
      definition: { id: agent.id, version: agent.version, digest: agent.contentDigest },
      configurationPolicy: 'bound_uar_definition', toolPolicy: 'bound_uar_definition', resourcePolicy: 'bound_uar_definition' };
  }
  async function stopProvider(signal) {
    const child = process;
    if (signal || !child || child.exitCode !== null || child.signalCode !== null) return stop(child, signal);
    const exited = once(child, 'exit');
    let timer;
    child.stdin.end();
    try { await Promise.race([exited, new Promise(resolve => { timer = setTimeout(resolve, 5000); })]); }
    finally { clearTimeout(timer); }
    await stop(child);
  }
  return { get base() { return base; }, token,
    get auth() { return { token: launchToken, principal: hostPrincipal, workspaceId: workspace }; },
    coverage: supervisor.evidence, endpoints, start, seed, status: () => childStatus(process), stop: stopProvider,
    restart: async () => { await stopProvider(); await start(); } };
}
