import { join } from 'node:path';
import { createHash } from 'node:crypto';

const quote = JSON.stringify;
export async function serviceConfiguration(config, input, root, secrets, write) {
  const uarUrl = config.services.uar.url;
  const surrealUrl = config.surreal.url.replace(/^http/, 'ws');
  const namespace = config.surreal.namespace;
  const workspace = config.services.uar.workspace;
  const runtimeId = `c08-runtime-${workspace}`;
  const literPort = input.ports?.liter ?? 18457;
  const literUrl = `http://127.0.0.1:${literPort}/v1`;
  const modelId = input.model.modelId;
  const contextWindow = input.model.contextWindow;
  const credentialEnv = input.model.credentialEnv;
  const jwks = `${config.realm.issuer}/.well-known/jwks.json`;
  const channelGrantIssuer = config.realm.issuer;
  await write('liter.toml', `[general]\nmaster_key = "\${C08_LITER_MASTER}"\n\n[[models]]\nname = ${quote(modelId)}\nprovider_model = ${quote(`${input.model.provider}/${modelId}`)}\napi_key = "\${${credentialEnv}}"\nfallbacks = []\n`);
  await write('uar.json', JSON.stringify({
    server: { host: '127.0.0.1', grpc_port: 19516 },
    service_instance: {
      instance_id: runtimeId,
      ownership: 'external',
      workspace_location: 'remote',
      credential_ref: 'env://C08_UAR_OWNER',
    },
    security: { jwt_required: true, jwks_url: jwks, jwt_issuer: config.realm.issuer, jwt_audience: 'c08-uar',
      jwt_secret: secrets.C08_UAR_JWT_UNUSED, settings_mutation_auth_required: true },
    persistence: { provider: 'surreal', database_url: surrealUrl, surreal_ns: `${namespace}_uar`, surreal_db: 'main',
      surreal_user: 'root', surreal_pass: secrets.C08_SURREAL_PASSWORD, surreal_auth_level: 'root', external_cache_enabled: false },
    providers: [{ id: 'c08-liter', display_name: 'C08 pinned Liter', base_url: literUrl, api_key: secrets.C08_LITER_MASTER,
      protocol: 'chat', default_model: modelId, enabled: true,
      models: [{ id: modelId, enabled: true, supports_tools: true, context_window: contextWindow }] }],
    llm: { model: `c08-liter/${modelId}`, base_url: literUrl, api_key: secrets.C08_LITER_MASTER, protocol: 'chat' },
    resilience: { stream_start_timeout_ms: 150_000, retry_max_attempts: 1 },
  }, null, 2));
  await write('gate.yaml', JSON.stringify({
    server: { listen: '127.0.0.1:18458', admin_listen: new URL(config.services.gate.url).host,
      require_policies_at_startup: false, admin_auth: { provider: { type: 'jwt', jwks_url: jwks, issuer: config.realm.issuer, audience: 'c08-gate' } } },
    database: { url: secrets.C08_GATE_DATABASE_URL }, approval: { backend: 'postgres' }, cache: { l2: { enabled: false } },
  }, null, 2));
  for (const [name, port] of [['bossA', 18789], ['bossB', 18790]]) {
    const home = join(root, name);
    const key = secrets[name === 'bossA' ? 'C08_BOSS_A_OWNER' : 'C08_BOSS_B_OWNER'];
    const configText = `home_dir = ${quote(home)}\ndata_dir = ${quote(join(home, 'data'))}\napi_listen = ${quote(`127.0.0.1:${port}`)}\napi_key_hash = ${quote(`$sha256$${createHash('sha256').update(key).digest('hex')}`)}\n\n[storage]\nnamespace = ${quote(namespace)}\ndatabase = "main"\n\n[storage.backend]\nkind = "remote"\nurl = ${quote(surrealUrl)}\nnamespace = ${quote(namespace)}\ndatabase = "main"\nusername = "root"\npassword_env = "C08_SURREAL_PASSWORD"\n\n[default_model]\nprovider = "uar"\nmodel = ${quote(`c08-liter/${modelId}`)}\n\n[uar]\nselected_instance_id = ${quote(runtimeId)}\n\n[[uar.instances]]\nid = ${quote(runtimeId)}\nownership = "external"\nworkspace_locality = "remote"\nprofile = "uar.service-instance/1"\n[uar.instances.endpoints]\nruntime = ${quote(uarUrl)}\nadministration = ${quote(`${uarUrl}/api/uar`)}\nmodels = ${quote(`${uarUrl}/v1`)}\n[uar.instances.credential_refs]\nruntime = "env://C08_UAR_OWNER"\nadministration = "env://C08_UAR_OWNER"\nmodels = "env://C08_UAR_OWNER"\n[uar.instances.sidecar]\nendpoint = ${quote(uarUrl)}\n`;
    await write(`${name}/config.toml`, configText);
    config.processes[name] = { ...input.binaries.bossfang, args: ['--config', join(home, 'config.toml'), 'start', '--foreground'], cwd: home,
      envRefs: { LIBREFANG_CHANNEL_GATE_TOKEN: 'C08_GATE_EFFECT', LIBREFANG_CHANNEL_FABRIC_BEARER: 'C08_FABRIC_TOKEN',
        C08_UAR_OWNER: 'C08_UAR_OWNER', C08_SURREAL_PASSWORD: 'C08_SURREAL_PASSWORD' },
      environment: { LIBREFANG_HOME: home, BOSSFANG_HOME: home,
        LIBREFANG_CHANNEL_GATE_URL: config.services.gate.url, LIBREFANG_CHANNEL_GATE_IDENTITY_ISSUER: config.realm.issuer,
        LIBREFANG_CHANNEL_GATE_IDENTITY_SUBJECT: 'c08-host', LIBREFANG_CHANNEL_GATE_IDENTITY_REVISION: '1',
        LIBREFANG_CHANNEL_HANDLER_GRANT_ISSUER: channelGrantIssuer, LIBREFANG_CHANNEL_HANDLER_GRANT_ID: name === 'bossA' ? 'handler-a' : 'handler-b',
        LIBREFANG_CHANNEL_REPLY_GRANT_ISSUER: channelGrantIssuer, LIBREFANG_CHANNEL_REPLY_GRANT_ID: name === 'bossA' ? 'reply-a' : 'reply-b',
        LIBREFANG_CHANNEL_REPLY_GRANT_REVISION: '1', LIBREFANG_CHANNEL_FABRIC_URL: config.services.fabric.url,
        LIBREFANG_CHANNEL_FABRIC_CHANNEL_ID: config.constants.fabricChannelId, LIBREFANG_CHANNEL_FABRIC_TENANT_ID: config.constants.fabricTenantId,
      } };
  }
  config.processes.uar = { ...input.binaries.uar, cwd: join(root, 'uar'), args: ['--config', join(root, 'uar.json'), '--port', new URL(uarUrl).port],
    envRefs: { UAR_CHANNEL_GATE_BEARER_TOKEN: 'C08_GATE_EFFECT',
      UAR_SECURITY__JWT_SECRET: 'C08_UAR_JWT_UNUSED', UAR_SECURITY__SETTINGS_ADMIN_KEY: 'C08_UAR_SETTINGS_ADMIN_KEY' },
    environment: { UAR_SECURITY__JWT_REQUIRED: 'true', UAR_REMOTE_SURREAL_DURABILITY_ATTESTED: '1', UAR_CHANNEL_GATE_URL: config.services.gate.url } };
  config.processes.gate = { ...input.binaries.gate, cwd: join(root, 'gate'), args: ['--config', join(root, 'gate.yaml'), '--require-database'],
    envRefs: { DATABASE_URL: 'C08_GATE_DATABASE_URL', FLINT_GATE_JWT_SECRET: 'C08_GATE_JWT_SECRET' }, environment: {} };
  config.processes.fabric = { ...input.binaries.fabric, cwd: join(root, 'fabric'), args: [],
    envRefs: { IGGY_CONNECTION_STRING: 'C08_IGGY_CONNECTION' }, environment: { BIND_ADDR: new URL(config.services.fabric.url).host,
      AUTHZ_BACKEND: 'verified-identity', GATEWAY_PROFILE: 'full', GATEWAY_JWKS_URL: jwks, JWT_AUDIENCE: 'c08-fabric',
      JWT_ISSUER: config.realm.issuer, GRPC_PORT: '0', SFU_MODE: 'sovereign', CDC_ENABLED: 'false', FEDERATION_ENABLED: 'false' } };
  return { runtimeId, liter: { ...input.binaries.liter, cwd: join(root, 'liter'), args: ['api', '--config', join(root, 'liter.toml'), '--host', '127.0.0.1', '--port', String(literPort)],
    envRefs: { LITER_LLM_MASTER_KEY: 'C08_LITER_MASTER', [credentialEnv]: credentialEnv }, environment: {} }, literUrl };
}
