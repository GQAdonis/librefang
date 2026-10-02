import { readFile, open, stat } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createHash, randomUUID } from 'node:crypto';
import { createConnection } from 'node:net';
import { fileURLToPath } from 'node:url';

const argv = process.argv.slice(2);
if (!argv.includes('--private') || !argv.includes('--receipt')) throw new Error('Use --private prepared-directory --receipt new-operation-receipt.json after source freeze/build');
const root = resolve(argv[argv.indexOf('--private') + 1]);
const receipt = resolve(argv[argv.indexOf('--receipt') + 1]);
const bootstrap = JSON.parse(await readFile(join(root, 'bootstrap.json'), 'utf8'));
const config = JSON.parse(await readFile(join(root, 'operation.json'), 'utf8'));
const secrets = JSON.parse(await readFile(join(root, 'secrets.json'), 'utf8'));
const environment = { ...process.env, ...secrets };
if (!environment.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is required for the explicitly approved model; no fallback');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const exec = promisify(execFile);
const pause = ms => new Promise(resolveWait => setTimeout(resolveWait, ms));
const owned = [];
const children = [];
const id = `c08-${randomUUID()}`;
const evidence = { schema: 'c08-service-bootstrap-receipt/1', runId: id, model: bootstrap.model, images: {}, binaries: {}, started: [], cleanup: [] };
// Immutable evidence paths are reserved before any service operation.
for (const path of [receipt, `${receipt}.d`]) {
  try { await stat(path); throw new Error('The operation receipt path already exists'); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
}
const bootstrapReceipt = await open(`${receipt}.bootstrap.json`, 'wx', 0o600);
let interrupted = false;
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => {
  interrupted = true;
  for (const child of children) if (child.exitCode === null) child.kill('SIGTERM');
});
async function verifiedBinary(name, item) {
  const metadata = JSON.parse(await readFile(item.sourceMetadataFile, 'utf8'));
  const bytes = await readFile(item.command);
  const observed = (await exec('git', ['-C', item.sourceRepository, 'rev-parse', 'HEAD'])).stdout.trim();
  if (metadata.sourceRevision !== item.sourceRevision || observed !== item.sourceRevision) throw new Error(`Source/build receipt mismatch: ${name}`);
  if (item.provenance === 'node-script') {
    const appRevision = (await exec('git', ['-C', metadata.applicationSourceRepository, 'rev-parse', 'HEAD'])).stdout.trim();
    const appIndex = item.args.indexOf('--app');
    if (appIndex < 0 || metadata.applicationExecutable !== join(item.args[appIndex + 1], 'Contents', 'MacOS', 'The Boss')
        || metadata.commandSha256 !== hash(bytes) || metadata.scriptPath !== item.scriptPath || item.args[0] !== item.scriptPath
        || metadata.scriptSha256 !== hash(await readFile(item.scriptPath))
        || metadata.applicationSha256 !== hash(await readFile(metadata.applicationExecutable))
        || metadata.applicationSourceRevision !== appRevision) throw new Error(`Script/application receipt mismatch: ${name}`);
    evidence.binaries[name] = { mode: 'node_script_and_packaged_application', commandSha256: metadata.commandSha256,
      scriptSha256: metadata.scriptSha256, sourceRevision: observed, applicationSha256: metadata.applicationSha256,
      applicationSourceRevision: appRevision, buildMetadataSha256: hash(JSON.stringify(metadata)) };
  } else {
    if (metadata.binarySha256 !== hash(bytes)) throw new Error(`Source/build receipt mismatch: ${name}`);
    evidence.binaries[name] = { sourceRevision: observed, binarySha256: metadata.binarySha256, buildMetadataSha256: hash(JSON.stringify(metadata)) };
  }
}
async function ready(check, name) {
  const deadline = Date.now() + 60000;
  do {
    if (interrupted) throw new Error('Bootstrap interrupted by owner');
    try { if (await check()) return; } catch { /* Startup readiness of these owned dependencies is the named boundary. */ }
    if (Date.now() >= deadline) throw new Error(`Owned dependency did not become ready: ${name}`);
    await pause(500);
  } while (true);
}
async function tcp(port) {
  return new Promise(resolveReady => {
    const socket = createConnection({ host: '127.0.0.1', port });
    socket.setTimeout(1000); socket.once('connect', () => { socket.destroy(); resolveReady(true); });
    for (const event of ['error', 'timeout']) socket.once(event, () => { socket.destroy(); resolveReady(false); });
  });
}
function start(command, args, env, cwd) {
  const child = spawn(command, args, { env, cwd, shell: false, stdio: ['ignore', 'pipe', 'pipe'] });
  // Raw product logs are deliberately never emitted or copied to evidence.
  let logDigest = '';
  const digest = chunk => { logDigest = hash(`${logDigest}:${hash(chunk)}`); };
  child.stdout.on('data', digest); child.stderr.on('data', digest);
  child.once('error', () => {});
  children.push(child);
  return { child, outputSha256: () => logDigest };
}
async function container(name, args, env) {
  const spec = bootstrap.containers[name];
  const inspect = JSON.parse((await exec(bootstrap.docker, ['image', 'inspect', spec.image])).stdout)[0];
  if (name === 'iggy' && inspect.Config.Labels?.['org.opencontainers.image.revision'] !== spec.expectedRevision) throw new Error('The available Iggy image differs from the source contract inspected for its credential configuration');
  const containerName = `${id}-${name}`;
  evidence.images[name] = { imageId: inspect.Id, repoDigests: inspect.RepoDigests ?? [], sourceRevision: inspect.Config.Labels?.['org.opencontainers.image.revision'] ?? null };
  const result = await exec(bootstrap.docker, ['run', '--detach', '--rm', '--name', containerName, '--label', `c08.operation=${id}`, ...args, inspect.Id,
    ...(name === 'surreal' ? ['start', '--log', 'error', 'surrealkv:/data/c08.db'] : [])], { env });
  const containerId = result.stdout.trim();
  if (!/^[a-f0-9]{64}$/.test(containerId)) throw new Error('Owned container creation did not return a container ID');
  owned.push(containerId); evidence.started.push({ name, containerId });
  return containerId;
}
try {
  for (const [name, item] of Object.entries(config.processes)) await verifiedBinary(name, item);
  await verifiedBinary('liter', bootstrap.liter);
  await container('surreal', ['--user', '0', '--publish', '127.0.0.1:18000:8000', '--mount', `type=bind,src=${join(root, 'surreal')},dst=/data`, '--env', 'SURREAL_USER', '--env', 'SURREAL_PASS'],
    { ...environment, SURREAL_USER: 'root', SURREAL_PASS: secrets.C08_SURREAL_PASSWORD });
  await ready(async () => (await fetch('http://127.0.0.1:18000/health', { signal: AbortSignal.timeout(1500) })).ok, 'surreal');
  const postgresId = await container('postgres', ['--publish', '127.0.0.1:18459:5432', '--mount', `type=bind,src=${join(root, 'postgres')},dst=/var/lib/postgresql/data`,
    '--env', 'POSTGRES_USER', '--env', 'POSTGRES_DB', '--env', 'POSTGRES_PASSWORD'],
  { ...environment, POSTGRES_USER: 'c08', POSTGRES_DB: 'c08', POSTGRES_PASSWORD: secrets.C08_POSTGRES_PASSWORD });
  await ready(async () => { await exec(bootstrap.docker, ['exec', postgresId, 'pg_isready', '-U', 'c08', '-d', 'c08']); return true; }, 'postgres');
  await container('iggy', ['--publish', '127.0.0.1:18460:8090', '--mount', `type=bind,src=${join(root, 'iggy')},dst=/data`,
    '--env', 'IGGY_SYSTEM_PATH', '--env', 'IGGY_ROOT_USERNAME', '--env', 'IGGY_ROOT_PASSWORD'],
  { ...environment, IGGY_SYSTEM_PATH: '/data', IGGY_ROOT_USERNAME: 'c08', IGGY_ROOT_PASSWORD: secrets.C08_IGGY_PASSWORD });
  await ready(() => tcp(18460), 'iggy TCP listener; Fabric subsequently verifies the broker handshake');
  const liter = bootstrap.liter;
  const literEnvironment = { ...environment, ...liter.environment };
  for (const [key, value] of Object.entries(liter.envRefs)) literEnvironment[key] = environment[value];
  const launchedLiter = start(liter.command, liter.args, literEnvironment, liter.cwd);
  await ready(async () => {
    if (launchedLiter.child.exitCode !== null) throw new Error('Liter exited');
    const response = await fetch(`${bootstrap.literUrl}/models`, { headers: { Authorization: `Bearer ${secrets.C08_LITER_MASTER}` }, signal: AbortSignal.timeout(1500) });
    const body = await response.json();
    return response.ok && body.data?.some(model => model.id === bootstrap.model.modelId);
  }, 'pinned Liter authenticated model catalog');
  evidence.started.push({ name: 'liter', pid: launchedLiter.child.pid });
  const driver = start(process.execPath, [fileURLToPath(new URL('../../operate-c08-routing.mjs', import.meta.url)), '--config', join(root, 'operation.json'), '--out', receipt], environment, root);
  const exit = await new Promise(resolveExit => { driver.child.once('exit', resolveExit); driver.child.once('error', () => resolveExit(1)); });
  evidence.driverExitCode = exit; evidence.driverOutputSha256 = driver.outputSha256();
  if (exit !== 0) process.exitCode = 1;
} catch (error) {
  // Fixed diagnostic; a product/CLI exception can contain a credential or DSN.
  evidence.status = 'blocked'; evidence.errorSha256 = hash(String(error)); process.exitCode = 1;
  console.error('C08 bootstrap did not complete; inspect its private structured receipt.');
} finally {
  for (const child of children.reverse()) if (child.exitCode === null) child.kill('SIGTERM');
  for (const containerId of owned.reverse()) {
    try { await exec(bootstrap.docker, ['stop', '--time', '10', containerId]); evidence.cleanup.push({ containerId, stopped: true }); }
    catch { evidence.cleanup.push({ containerId, stopped: false }); process.exitCode = 1; }
  }
  await bootstrapReceipt.writeFile(JSON.stringify(evidence, null, 2));
  await bootstrapReceipt.close();
}
