import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { registrationDocuments, gatePolicy } from './documents.mjs';
import { serviceConfiguration } from './services.mjs';
import { buildPlan } from './plan.mjs';

const args = process.argv.slice(2);
const exec = promisify(execFile);
const argument = name => args[args.indexOf(name) + 1];
if (!args.includes('--input') || !args.includes('--out')) throw new Error('Use --input operator-input.json --out /absolute/new/private-directory');
const input = JSON.parse(await readFile(resolve(argument('--input')), 'utf8'));
const root = resolve(argument('--out'));
if (input.model?.provider !== 'openai' || input.model?.modelId !== 'gpt-5.6-sol') throw new Error('C08 requires the explicit approved OpenAI/gpt-5.6-sol binding');
for (const name of ['bossfang', 'uar', 'gate', 'fabric', 'liter']) {
  const binary = input.binaries?.[name];
  if (!binary?.command?.startsWith('/') || !binary.sourceMetadataFile?.startsWith('/') || !binary.sourceRepository?.startsWith('/') || !/^[a-f0-9]{40}$/.test(binary.sourceRevision ?? '')) {
    throw new Error(`Actual ${name} executable path and immutable build metadata are required`);
  }
}
await mkdir(root, { mode: 0o700 });
async function write(name, contents) {
  await mkdir(dirname(join(root, name)), { recursive: true, mode: 0o700 });
  await writeFile(join(root, name), contents, { mode: 0o600, flag: 'wx' });
}
for (const name of ['uar', 'gate', 'fabric', 'liter', 'bossA/data', 'bossB/data', 'surreal', 'postgres', 'iggy']) await mkdir(join(root, name), { recursive: true, mode: 0o700 });
const uarPolicyBundle = {
  sourceRepository: input.binaries.uar.sourceRepository,
  sourceRevision: input.binaries.uar.sourceRevision,
  files: [],
};
for (const name of ['default.cedar', 'tool-approval.cedar', 'skill-mutation.cedar']) {
  const relativePath = `policies/${name}`;
  const sourcePath = join(uarPolicyBundle.sourceRepository, relativePath);
  const runtimePath = join(root, 'uar', relativePath);
  const gitObject = `${uarPolicyBundle.sourceRevision}:${relativePath}`;
  const contents = (await exec('git', ['-C', uarPolicyBundle.sourceRepository, 'show', gitObject],
    { encoding: 'buffer' })).stdout;
  await write(join('uar', relativePath), contents);
  uarPolicyBundle.files.push({ relativePath, sourcePath, gitObject, runtimePath,
    sha256: createHash('sha256').update(contents).digest('hex') });
}
const config = JSON.parse(await readFile(resolve(input.plan ?? fileURLToPath(new URL('../config.example.json', import.meta.url))), 'utf8'));
config.services.uar.url = `http://127.0.0.1:${input.ports?.uar ?? 1916}`;
const workspace = `c08-${randomUUID()}`;
const secrets = Object.fromEntries(['C08_BOSS_A_OWNER', 'C08_BOSS_B_OWNER', 'C08_SURREAL_PASSWORD', 'C08_POSTGRES_PASSWORD',
  'C08_IGGY_PASSWORD', 'C08_GATE_JWT_SECRET', 'C08_UAR_JWT_UNUSED', 'C08_UAR_SETTINGS_ADMIN_KEY',
  'C08_LITER_MASTER'].map(name => [name, randomBytes(32).toString('hex')]));
secrets.C08_SURREAL_USER = 'root';
secrets.C08_GATE_DATABASE_URL = `postgres://c08:${secrets.C08_POSTGRES_PASSWORD}@127.0.0.1:18459/c08`;
secrets.C08_IGGY_CONNECTION = `iggy://c08:${secrets.C08_IGGY_PASSWORD}@127.0.0.1:18460`;
const oldWorkspace = config.services.uar.workspace;
function replaceWorkspace(value) {
  if (Array.isArray(value)) return value.map(replaceWorkspace);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, replaceWorkspace(item)]));
  return value === oldWorkspace ? workspace : value;
}
Object.assign(config, replaceWorkspace(config));
config.surreal.namespace = workspace.replaceAll('-', '_'); config.surreal.database = 'main';
const channelGrantIssuer = config.realm.issuer;
for (const name of ['handlerGrantA', 'replyGrantA']) config.constants[name].issuer = channelGrantIssuer;
for (const name of ['observerA', 'observerB', 'observerDenied']) {
  config.constants[name].source_grant_issuer = channelGrantIssuer;
  config.constants[name].recipient_grant_issuer = channelGrantIssuer;
}
config.realm.tokens = [
  { tokenEnv: 'C08_GATE_ADMIN_EFFECT', claims: { sub: 'c08-host', aud: 'c08-gate', scope: 'afc.channel.grants.write afc.channel.effects.execute', roles: ['admin'] } },
  { tokenEnv: 'C08_GATE_EFFECT', claims: { sub: 'c08-host', aud: 'c08-gate', scope: 'afc.channel.effects.execute', roles: ['service'] } },
  { tokenEnv: 'C08_FABRIC_TOKEN', claims: { sub: 'c08-host', aud: 'c08-fabric', tenant_id: randomUUID(), scope: 'frf.events.read frf.events.write', principal_type: 'service' } },
  { tokenEnv: 'C08_UAR_OWNER', claims: { sub: 'c08-owner', aud: 'c08-uar', roles: ['owner', 'operator'] } },
];
config.constants.fabricTenantId = config.realm.tokens[2].claims.tenant_id;
config.constants.fabricChannelId = randomUUID();
const prepared = await serviceConfiguration(config, input, root, secrets, write);
config.constants.runtimeId = prepared.runtimeId;
if (input.ui?.process) {
  config.ui = { requestPath: join(root, 'ui-workspace-request.json'), responsePath: join(root, 'ui-subscription-response.json'),
    receiptPath: join(root, 'ui-receipt.json'), expectedRuntimeId: prepared.runtimeId };
  await mkdir(join(root, 'ui-workspace'), { mode: 0o700 });
  await write('boss-ui.json', JSON.stringify({ schema: 'c08-boss-ui-operation/1', disposable: true,
    uar: { instanceId: prepared.runtimeId, expectedRuntimeId: prepared.runtimeId, name: `Disposable ${workspace}`, url: config.services.uar.url,
      workspaceLocation: 'remote', tokenEnv: 'C08_UAR_OWNER', adminTokenEnv: 'C08_UAR_OWNER' },
    workspace: { name: `Disposable ${workspace}`, path: join(root, 'ui-workspace'), type: 'user' },
    provision: { requestPath: config.ui.requestPath, responsePath: config.ui.responsePath } }, null, 2));
  secrets.C08_UI_CONFIG_PATH = join(root, 'boss-ui.json'); secrets.C08_UI_RECEIPT_PATH = config.ui.receiptPath;
  const uiArgs = [...input.ui.process.args];
  const receiptIndex = uiArgs.indexOf('--receipt');
  if (receiptIndex < 0) uiArgs.push('--receipt', config.ui.receiptPath);
  else uiArgs[receiptIndex + 1] = config.ui.receiptPath;
  config.processes.bossUi = { ...input.ui.process, args: uiArgs, envRefs: { ...input.ui.process.envRefs,
    C08_BOSS_UI_CONFIG: 'C08_UI_CONFIG_PATH', C08_BOSS_UI_RECEIPT: 'C08_UI_RECEIPT_PATH', C08_UAR_OWNER: 'C08_UAR_OWNER' } };
}
const docs = registrationDocuments(workspace, prepared.runtimeId, input.model.modelId);
config.constants.registrationBindingA = docs.bindings.A;
const ref = name => ({ ref: name });
const register = (id, service, path, body, method = 'POST') => ({ id, kind: 'register', service, method, path, ...(body ? { body } : {}) });
const registration = [register('registerGatePolicy', 'gate', '/policies', gatePolicy()),
  register('catalogIdentity', 'uar', '/api/v1/collaboration/capabilities', null, 'GET'),
  register('registerPackage', 'uar', '/api/v1/collaboration/packages:install', docs.packageRequest)];
for (const name of ['A', 'B', 'Denied']) {
  registration.push(register(`registerBinding${name}`, 'uar', '/api/v1/collaboration/deployment-bindings', docs.bindings[name]));
  registration.push(register(`registerInstance${name}`, 'uar', '/api/uar/agent-instances/v1', { deploymentBindingId: docs.bindings[name].binding.id, profile: 'resident' }));
  config.constants[`observer${name}`].observer_instance_id = ref(`steps.registerInstance${name}.result.result.instanceId`);
}
for (const name of ['A', 'B']) {
  const agentName = `c08-${name.toLowerCase()}`;
  const manifest = { manifest_toml:
    `name = ${JSON.stringify(agentName)}\nversion = "1.0.0"\ndescription = "Disposable C08 channel handler"\n[model]\nprovider = "uar"\nmodel = ${JSON.stringify(`c08-liter/${input.model.modelId}`)}\ncontext_window = 1050000\nsystem_prompt = "Reply briefly to the supplied message. Do not call tools or publish outside this reply."\n` };
  registration.push(register(`registerAgent${name}`, `boss${name}`, '/api/agents', manifest));
  const other = name === 'A' ? 'B' : 'A';
  registration.push(register(`registerAgent${name}on${other}`, `boss${other}`, '/api/agents', manifest));
  config.constants[`handlerUuid${name}`] = ref(`steps.registerAgent${name}.result.result.agent_id`);
}
// Channel grants and route receipts identify the stable agent name. Adapter
// default_agent alone requires the UUID returned by the registration API.
config.plan = config.plan.map(step => step.kind === 'configure_webhook'
  ? { ...step, handler: config.constants[step.host === 'bossA' ? 'handlerUuidA' : 'handlerUuidB'] } : step);
const firstMutation = config.plan.findIndex(step => !['start_process', 'probe'].includes(step.kind));
config.plan.splice(firstMutation < 0 ? config.plan.length : firstMutation, 0, ...registration);
for (const name of ['bufferHold', 'bufferRelease']) if (!input.processes?.[name]) delete config.processes[name];
Object.assign(config.processes, input.processes ?? {});
await buildPlan(config, input);
if (config.plan.some(step => step.process && !config.processes[step.process])) throw new Error('Selected operation plan requires an actual owner buffer control; supply its real process metadata or use a plan without that scenario');
await write('secrets.json', JSON.stringify(secrets, null, 2));
await write('operation.json', JSON.stringify(config, null, 2));
await write('bootstrap.json', JSON.stringify({ schema: 'c08-service-bootstrap/1', privateRoot: root, docker: input.docker ?? '/usr/local/bin/docker',
  containers: { surreal: { image: 'surrealdb/surrealdb:v3.3.0', port: 18000 }, postgres: { image: 'postgres:15.2-alpine', port: 18459 },
    iggy: { image: 'iggyrs/iggy:latest', expectedRevision: '4018aa3612a246b848bf55f052d274f092f9bdbb', port: 18460 } },
  liter: prepared.liter, model: input.model, literUrl: prepared.literUrl, uarPolicyBundle, input }, null, 2));
console.log(JSON.stringify({ schema: 'c08-bootstrap-prepared/1', privateRoot: root, workspace, configurationPrepared: true, servicesStarted: false, binaryProvenanceChecked: false }));
