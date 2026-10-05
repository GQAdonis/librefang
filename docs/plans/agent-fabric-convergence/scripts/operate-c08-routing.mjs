import { randomUUID } from 'node:crypto';
import { access, mkdir, readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Blocked, digestFile, hash, immutable, redact } from './c08-operation/io.mjs';
import { receiver } from './c08-operation/callback.mjs';
import { realm } from './c08-operation/realm.mjs';
import { operation, resolveRefs, stopOwned } from './c08-operation/operations.mjs';
import { evaluate, scenarioNames } from './c08-operation/scenarios.mjs';

const initiative = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const defaultOut = join(initiative, '.prometheus/cadence/artifacts/c08-routed-channel-operation.json');
function options(values) {
  const result = { config: process.env.C08_OPERATION_CONFIG, out: defaultOut };
  for (let i = 0; i < values.length; i++) {
    if (!['--config', '--out'].includes(values[i]) || !values[i + 1]) throw new Blocked('usage:--config_PRIVATE.json_--out_PRIVATE-receipt.json');
    result[values[i].slice(2)] = values[++i];
  }
  if (!result.config) throw new Blocked('C08_OPERATION_CONFIG_or_config_argument_required');
  return result;
}
function validate(config) {
  if (config.schema !== 'c08-routing-operation/1' || config.disposable !== true) {
    throw new Blocked('isolated_disposable_operation_configuration_required');
  }
  if (!Array.isArray(config.plan) || !config.plan.length) throw new Blocked('production_operation_plan_required');
  if (!config.surreal || !config.callback) throw new Blocked('durable_storage_and_real_public_callback_required');
  for (const name of ['bossA', 'bossB', 'gate', 'fabric', 'uar']) {
    if (!config.services?.[name]?.url) throw new Blocked(`service_configuration_required:${name}`);
  }
  for (const name of ['bossA', 'bossB']) {
    if (!config.ingress?.[name]?.url || !config.ingress[name].secretEnv || !config.ingress[name].account) {
      throw new Blocked(`signed_native_webhook_configuration_required:${name}`);
    }
  }
  if (config.ingress.bossA.account !== config.ingress.bossB.account) throw new Blocked('two_hosts_must_share_the_native_account_for_race');
}

export async function operate(values = process.argv.slice(2)) {
  const args = options(values);
  const out = resolve(args.out);
  const directory = `${out}.d`;
  await mkdir(dirname(out), { recursive: true });
  try { await access(out); throw new Blocked('immutable_operation_receipt_already_exists'); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  // Atomic reservation prevents two drivers issuing the same planned effects.
  try { await mkdir(directory, { mode: 0o700 }); }
  catch { throw new Blocked('operation_directory_already_reserved_use_new_output_path'); }
  const receipt = { schema: 'c08-routing-operation/1', checkpointId: 'c08-routed-channel-operation',
    creationTaskRef: 'C08.3', runId: randomUUID(), status: 'blocked',
    functionalAcceptance: 'unverified', startedAt: new Date().toISOString(),
    operationCoverage: 'unverified', profile: 'signed_webhook_v1',
    installedPlatformAcceptance: 'unverified', acceptedProviderCheckpoint: false,
    steps: [], scenarios: {}, prerequisites: [], helperDigests: {} };
  let state;
  let authority;
  let callback;
  let previousCallback;
  try {
    const raw = await readFile(resolve(args.config), 'utf8');
    const config = JSON.parse(raw);
    receipt.configSha256 = hash(raw);
    validate(config);
    receipt.driverRuntime = { nodeVersion: process.version, executableSha256: await digestFile(process.execPath) };
    receipt.producerFiles = [];
    for (const item of config.producerFiles ?? []) {
      receipt.producerFiles.push({ name: item.name, sha256: await digestFile(item.path),
        sourceRevision: item.sourceRevision ?? null, version: item.version ?? null,
        sourceBinding: 'operator_declared_file_hashed' });
    }
    for (const file of ['operate-c08-routing.mjs', 'c08-operation/io.mjs', 'c08-operation/callback.mjs',
      'c08-operation/realm.mjs', 'c08-operation/operations.mjs', 'c08-operation/scenarios.mjs',
      'c08-operation/bootstrap/documents.mjs', 'c08-operation/bootstrap/plan.mjs']) {
      receipt.helperDigests[file] = await digestFile(join(dirname(fileURLToPath(import.meta.url)), file));
    }
    authority = await realm(config.realm);
    callback = await receiver(config.callback, join(directory, 'native-callback-receipts'), receipt.runId);
    if (config.callback.urlEnv) {
      if (!/^C08_[A-Z0-9_]+$/.test(config.callback.urlEnv) || process.env[config.callback.urlEnv]) {
        throw new Blocked('isolated_callback_environment_name_conflict');
      }
      previousCallback = config.callback.urlEnv; process.env[previousCallback] = callback.url;
    }
    receipt.authority = authority.publicReceipt;
    receipt.callback = { publicEndpointSha256: hash(callback.url), localPort: callback.port,
      tunnelCommandSha256: callback.tunnelSha256, nativeReceiptCommitBeforeResponse: true };
    state = { config, callback, runId: receipt.runId, children: new Map(),
      values: { runId: receipt.runId, callback: { url: callback.url, port: callback.port },
        realm: { jwksUrl: authority.jwksUrl, issuer: config.realm?.issuer }, constants: config.constants ?? {}, steps: {} } };
    for (let index = 0; index < config.plan.length; index++) {
      const step = config.plan[index];
      try {
        const result = await operation(step, state);
        receipt.steps.push(result);
        await immutable(join(directory, `step-${String(index + 1).padStart(3, '0')}.json`), redact(result));
      } catch (error) {
        const result = { id: step.id, kind: step.kind, status: error instanceof Blocked ? 'blocked' : 'failed',
          code: error.code ?? 'production_operation_failed', observedAt: new Date().toISOString(),
          response: error.response, tables: error.snapshot };
        receipt.steps.push(result);
        await immutable(join(directory, `step-${String(index + 1).padStart(3, '0')}.json`), redact(result));
        // Effects are never retried with a fresh identity after uncertainty.
        if (step.continueOnBlocked !== true || result.status === 'failed') break;
      }
    }
    for (const name of scenarioNames) {
      try { receipt.scenarios[name] = evaluate(name, resolveRefs(config.scenarios?.[name], state.values), state); }
      catch (error) { receipt.scenarios[name] = { status: 'blocked', code: error.code ?? 'scenario_reference_unavailable' }; }
    }
    receipt.nativeCallbacks = structuredClone(callback.posts);
    const stepsComplete = receipt.steps.length === config.plan.length && receipt.steps.every(row => row.status === 'observed');
    receipt.operationCoverage = stepsComplete ? 'observed' : 'incomplete';
    const states = Object.values(receipt.scenarios).map(row => row.status);
    receipt.status = receipt.steps.some(row => row.status === 'failed') || states.includes('failed') ? 'failed'
      : stepsComplete && states.every(status => status === 'passed') ? 'success' : 'blocked';
    receipt.functionalAcceptance = receipt.status === 'success' ? 'passed' : 'unverified';
  } catch (error) {
    receipt.prerequisites.push({ status: 'blocked', code: error.code ?? 'operation_configuration_or_runtime_unavailable' });
  } finally {
    if (state) receipt.cleanup = await stopOwned(state);
    if (receipt.cleanup?.some(row => row.status === 'blocked')) {
      if (receipt.status !== 'failed') receipt.status = 'blocked';
      receipt.functionalAcceptance = 'unverified';
    }
    if (callback) {
      try { await callback.close(); }
      catch { receipt.prerequisites.push({ status: 'blocked', code: 'callback_cleanup_unconfirmed' }); receipt.status = 'blocked'; }
    }
    if (previousCallback) delete process.env[previousCallback];
    if (authority) {
      try { await authority.close(); }
      catch { receipt.prerequisites.push({ status: 'blocked', code: 'authority_cleanup_unconfirmed' }); receipt.status = 'blocked'; }
    }
    if (receipt.status !== 'success') receipt.functionalAcceptance = 'unverified';
    for (const name of scenarioNames) if (!receipt.scenarios[name]) {
      receipt.scenarios[name] = { status: 'blocked', code: 'production_scenario_not_executed' };
    }
    receipt.finishedAt = new Date().toISOString();
    await immutable(out, redact(receipt));
  }
  return { status: receipt.status, functionalAcceptance: receipt.functionalAcceptance,
    operationCoverage: receipt.operationCoverage, receiptFile: out, checkpointId: receipt.checkpointId,
    creationTaskRef: receipt.creationTaskRef };
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try {
    const result = await operate(); process.stdout.write(`${JSON.stringify(result)}\n`);
    process.exitCode = result.status === 'success' ? 0 : 1;
  } catch (error) {
    process.stderr.write(`C08 operation blocked: ${error instanceof Blocked ? error.code : 'private_receipt_required'}\n`);
    process.exitCode = 1;
  }
}
