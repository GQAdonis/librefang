import { createHmac, randomUUID } from 'node:crypto';
import { execFile, spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { isAbsolute } from 'node:path';
import { promisify } from 'node:util';
import { api, Blocked, digestFile, hash, immutable, secret, snapshot, source } from './io.mjs';

const uar = '/api/uar/channel-observers/v1';
export function resolveRefs(value, context) {
  if (Array.isArray(value)) return value.map(item => resolveRefs(item, context));
  if (!value || typeof value !== 'object') return value;
  if (Object.keys(value).length === 1 && value.ref) {
    let current = context;
    for (const key of value.ref.split('.')) current = current?.[key];
    if (current === undefined) throw new Blocked(`missing_operation_reference:${value.ref}`);
    return current;
  }
  if (Object.keys(value).length === 1 && value.env) return secret(value.env);
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, resolveRefs(item, context)]));
}
const pause = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
function service(config, name) {
  if (!config.services?.[name]) throw new Blocked(`missing_service:${name}`);
  return config.services[name];
}
function command(config, name) {
  const item = config.processes?.[name];
  if (!item?.command || !isAbsolute(item.command) || !Array.isArray(item.args)
      || !item.sourceRevision || !/^[a-f0-9]{40}$/.test(item.sourceRevision)) {
    throw new Blocked(`production_binary_command_required:${name}`);
  }
  if (/\.(sh|py)$/i.test(item.command) || /(^|[/\\])(bash|sh|zsh|cmd|powershell)(\.exe)?$/i.test(item.command)) {
    throw new Blocked('shell_lifecycle_command_refused');
  }
  if (item.args.some(value => typeof value === 'object' && value?.env)
      || item.args.some(value => typeof value === 'string' && /^--?(secret|token|password|bearer)(=|$)/i.test(value))) {
    throw new Blocked('process_credentials_require_environment_or_private_stdin');
  }
  return item;
}
async function startProcess(name, state) {
  if (state.children.has(name)) throw new Blocked(`owned_process_already_running:${name}`);
  const item = command(state.config, name);
  const sha256 = await digestFile(item.command);
  let sourceMetadata = { mode: 'operator_declared_revision' };
  if (item.sourceRepository) {
    const { stdout } = await promisify(execFile)('git', ['-C', item.sourceRepository, 'rev-parse', 'HEAD']);
    if (stdout.trim() !== item.sourceRevision) throw new Blocked(`source_checkout_revision_mismatch:${name}`);
    sourceMetadata = { mode: 'declared_revision_checked_against_checkout', sourceRevision: stdout.trim() };
  }
  if (item.sourceMetadataFile) {
    const raw = await readFile(item.sourceMetadataFile, 'utf8');
    const metadata = JSON.parse(raw);
    if (metadata.sourceRevision !== item.sourceRevision || metadata.binarySha256 !== sha256) {
      throw new Blocked(`binary_build_receipt_mismatch:${name}`);
    }
    sourceMetadata = { mode: 'matching_build_receipt', receiptSha256: hash(raw), sourceRevision: item.sourceRevision };
  }
  const environment = { ...process.env };
  for (const [name, envRef] of Object.entries(item.envRefs ?? {})) environment[name] = secret(envRef);
  for (const [name, value] of Object.entries(item.environment ?? {})) {
    if (/secret|token|password|bearer/i.test(name)) throw new Blocked('lifecycle_secrets_require_environment_refs');
    environment[name] = String(resolveRefs(value, state.values));
  }
  // Output is never printed: products can include credentials in startup logs.
  let outputDigest = '';
  const input = item.stdinEnv ? secret(item.stdinEnv) : null;
  const child = spawn(item.command, resolveRefs(item.args, state.values), {
    cwd: item.cwd, env: environment, shell: false, stdio: [input === null ? 'ignore' : 'pipe', 'pipe', 'pipe'],
  });
  const capture = chunk => { outputDigest = hash(`${outputDigest}:${hash(chunk)}`); };
  child.stdout.on('data', capture); child.stderr.on('data', capture);
  await new Promise((resolve, reject) => {
    child.once('spawn', resolve); child.once('error', () => reject(new Blocked(`process_spawn_failed:${name}`)));
  });
  if (input !== null) {
    child.stdin.on('error', () => {});
    // The production sidecar treats host stdin EOF as supervisor death.
    // Keep this pipe open for its entire owned lifetime.
    child.stdin.write(`${input}\n`);
  }
  const owned = { child, processName: name, pid: child.pid, sha256, sourceRevision: item.sourceRevision,
    startedAt: new Date().toISOString(), outputSha256: () => outputDigest };
  state.children.set(name, owned);
  child.once('exit', code => { owned.exited = true; owned.exitCode = code; });
  return { pid: child.pid, sha256, sourceRevision: item.sourceRevision, sourceMetadata, startedAt: owned.startedAt };
}
async function stopProcess(name, state) {
  const owned = state.children.get(name);
  if (!owned) throw new Blocked(`restart_requires_driver_owned_process:${name}`);
  if (!owned.exited) {
    owned.child.kill('SIGTERM');
    owned.child.stdin?.end();
    const deadline = Date.now() + 15000;
    while (!owned.exited && Date.now() < deadline) await pause(100);
    if (!owned.exited) throw new Blocked(`owned_process_did_not_exit:${name}`);
  }
  state.children.delete(name);
  return { pid: owned.pid, exited: true, exitCode: owned.exitCode, outputSha256: owned.outputSha256() };
}
export async function stopOwned(state) {
  const results = [];
  for (const name of [...state.children.keys()].reverse()) {
    try { results.push({ name, ...await stopProcess(name, state) }); }
    catch (error) { results.push({ name, status: 'blocked', code: error.code ?? 'owned_process_cleanup_failed' }); }
  }
  return results;
}

async function sendIngress(step, state, host) {
  const input = { ...step.input };
  // account is receipt context from the configured adapter, not a native
  // caller field. Replaying a receipt preserves the original signed payload.
  delete input.account;
  if (step.echoAction || step.referenceAction) {
    const actionId = step.echoAction ?? step.referenceAction;
    const post = state.callback.posts.find(row => row.action_id === actionId);
    if (!post) throw new Blocked('real_callback_receipt_required');
    if (step.echoAction) input.message_id = post.native_message_id;
    else input.metadata = { ...input.metadata, reply_to_native_message_id: post.native_message_id };
  }
  if (!input.message_id) input.message_id = `${state.runId}:${step.id}`;
  for (const key of ['workspace_id', 'room_id', 'sender_id', 'message_id', 'message']) {
    if (typeof input[key] !== 'string' || !input[key].trim()) throw new Blocked(`native_source_field_required:${key}`);
  }
  if (!Object.hasOwn(input, 'thread_id') || (input.thread_id !== null
      && (typeof input.thread_id !== 'string' || !input.thread_id.trim()))) throw new Blocked('explicit_native_thread_required');
  const provider = state.config.ingress?.[host];
  if (!provider?.url || !provider.secretEnv || !provider.account) throw new Blocked(`qualified_ingress_required:${host}`);
  const body = JSON.stringify(input);
  let response;
  try {
    response = await fetch(provider.url, { method: 'POST', body, redirect: 'error',
      headers: { 'content-type': 'application/json',
        'x-webhook-signature': `sha256=${createHmac('sha256', secret(provider.secretEnv)).update(body).digest('hex')}`,
        'x-webhook-timestamp': String(Date.now()) }, signal: AbortSignal.timeout(15000) });
  } catch { throw new Blocked(`webhook_transport_unavailable:${host}`); }
  if (response.status !== 200) throw new Blocked(`webhook_ingress_status:${response.status}`);
  return { input: { ...input, account: provider.account }, host, status: response.status,
    requestSha256: hash(body), responseSha256: hash(await response.text()), observedAt: new Date().toISOString() };
}

async function waitSnapshot(step, state) {
  const deadline = Date.now() + (step.timeoutMs ?? 60000);
  const input = step.input;
  let last;
  do {
    last = await snapshot(state.config);
    const occurrence = input ? source(last, input) : null;
    const dispatch = last.channel_route_dispatch.find(row => row.occurrence_id === occurrence?.occurrence_id);
    const actions = last.channel_causal_actions.filter(row => row.source_occurrence_id === occurrence?.occurrence_id);
    const deliveries = last.channel_observer_deliveries.filter(row => row.occurrence_id === occurrence?.occurrence_id);
    const ready = step.condition === 'source' ? !!occurrence
      : step.condition === 'dispatch_completed' ? dispatch?.state === 'completed'
      : step.condition === 'queued' ? deliveries.some(row => row.state === 'pending')
      : step.condition === 'withheld' ? deliveries.some(row => row.state === 'withheld')
      : step.condition === 'suppressed' ? actions.some(row => row.state === 'suppressed')
      : step.condition === 'observers_delivered' ? deliveries.filter(row => row.state === 'delivered').length >= (step.count ?? 2)
      : step.condition === 'reply_completed' ? actions.some(row => row.kind === 'reply' && row.state === 'completed')
      : step.condition === 'reply_terminal' ? actions.some(row => row.kind === 'reply' && ['withheld', 'uncertain'].includes(row.state))
      : false;
    if (ready) return { tables: last, occurrence, dispatch, actions, deliveries, observedAt: new Date().toISOString() };
    await pause(250);
  } while (Date.now() < deadline);
  const error = new Blocked(`production_receipt_not_observed:${step.condition}`);
  error.snapshot = last; throw error;
}

export async function operation(raw, state) {
  if (!raw.id || state.values.steps[raw.id]) throw new Blocked('unique_operation_id_required');
  const step = resolveRefs(raw, state.values);
  const startedAt = new Date().toISOString();
  let result;
  switch (step.kind) {
    case 'wait_ui_workspace': {
      if (!state.config.ui?.requestPath || !isAbsolute(state.config.ui.requestPath)) {
        throw new Blocked('private_ui_workspace_handoff_required');
      }
      const deadline = Date.now() + (step.timeoutMs ?? 180000);
      do {
        try { result = JSON.parse(await readFile(state.config.ui.requestPath, 'utf8')); break; }
        catch (error) {
          if (error.code !== 'ENOENT' && !(error instanceof SyntaxError)) throw new Blocked('ui_workspace_handoff_invalid');
          await pause(250);
        }
      } while (Date.now() < deadline);
      const target = service(state.config, 'uar');
      if (result?.schema !== 'c08-boss-ui-workspace/1' || result.disposable !== true || !result.workspaceId
          || result.expectedRuntimeId !== state.config.ui.expectedRuntimeId
          || result.endpointSha256 !== hash(target.url) || result.ownerCredentialRef !== target.tokenEnv) {
        throw new Blocked('actual_ui_workspace_handoff_not_observed');
      }
      break;
    }
    case 'export_ui_subscription': {
      const handoff = state.values.steps[step.workspaceOperation]?.result;
      if (handoff?.schema !== 'c08-boss-ui-workspace/1' || !state.config.ui?.responsePath
          || !isAbsolute(state.config.ui.responsePath)) throw new Blocked('observed_private_ui_workspace_required');
      const target = { ...service(state.config, 'uar'), workspace: handoff.workspaceId };
      const inventory = await api(target, `${uar}/subscriptions`);
      const subscription = inventory.result.find(row => row.subscriptionId === step.subscriptionId);
      if (!subscription || subscription.source?.workspace !== handoff.workspaceId) {
        throw new Blocked('real_ui_workspace_subscription_not_observed');
      }
      const exported = { schema: 'c08-boss-ui-subscription/1', disposable: true,
        workspaceId: handoff.workspaceId, subscriptionId: subscription.subscriptionId,
        source: subscription.source, expectedRuntimeId: handoff.expectedRuntimeId,
        endpointSha256: handoff.endpointSha256, ownerCredentialRef: handoff.ownerCredentialRef,
        authorizedOperation: 'pause-resume' };
      await immutable(state.config.ui.responsePath, exported);
      result = { ...exported, subscriptionInventorySha256: hash(JSON.stringify(inventory.result)) }; break;
    }
    case 'register': {
      const method = step.method ?? 'POST';
      if (!['bossA', 'bossB', 'gate', 'uar'].includes(step.service)
          || !['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(method)
          || typeof step.path !== 'string' || !step.path.startsWith('/')
          || step.path.includes('..') || step.path.includes('?') || step.path.includes('#')
          || step.path.includes('//')) throw new Blocked('scoped_registration_request_required');
      const allowed = step.service === 'gate' ? step.path.startsWith('/policies')
        : step.service === 'uar' ? step.path.startsWith('/api/uar/') || step.path.startsWith('/api/v1/collaboration/')
        : step.path.startsWith('/api/agents');
      if (!allowed || step.path.startsWith(`${uar}/`)) {
        throw new Blocked('registration_cannot_replace_channel_ingress_or_effect_owner');
      }
      result = await api(service(state.config, step.service), step.path, step.body,
        step.acceptedStatuses ?? [200, 201, 202, 204], { method }); break;
    }
    case 'start_process': result = await startProcess(step.process, state); break;
    case 'stop_process': result = await stopProcess(step.process, state); break;
    case 'wait_process': {
      const owned = state.children.get(step.process);
      if (!owned) throw new Blocked('actual_driver_owned_process_required');
      const deadline = Date.now() + (step.timeoutMs ?? 180000);
      while (!owned.exited && Date.now() < deadline) await pause(250);
      if (!owned.exited) throw new Blocked('owned_operation_process_not_completed');
      if (owned.exitCode !== 0) throw new Error('owned_operation_process_failed');
      result = { pid: owned.pid, exited: true, exitCode: owned.exitCode, outputSha256: owned.outputSha256() };
      if (step.receiptPath) {
        if (!isAbsolute(step.receiptPath)) throw new Blocked('private_operation_receipt_path_required');
        const raw = await readFile(step.receiptPath, 'utf8');
        result.operationReceipt = JSON.parse(raw); result.operationReceiptSha256 = hash(raw);
      }
      break;
    }
    case 'restart': {
      const stopped = await stopProcess(step.process, state);
      const started = await startProcess(step.process, state);
      result = { stopped, started, changedPid: stopped.pid !== started.pid }; break;
    }
    case 'lifecycle': {
      // External queue/buffer controllers are actual executable operations,
      // never database mutations or a manually asserted successful result.
      const item = command(state.config, step.process);
      const start = await startProcess(step.process, state);
      const owned = state.children.get(step.process);
      const deadline = Date.now() + (step.timeoutMs ?? 30000);
      while (!owned.exited && Date.now() < deadline) await pause(100);
      if (!owned.exited) throw new Blocked('lifecycle_control_not_completed');
      state.children.delete(step.process);
      if (owned.exitCode !== 0) throw new Blocked('lifecycle_control_refused');
      result = { ...start, operation: step.operation, exitCode: 0,
        commandSha256: await digestFile(item.command), outputSha256: owned.outputSha256() }; break;
    }
    case 'probe': {
      const paths = { bossA: '/api/channels/route-capability', bossB: '/api/channels/route-capability',
        gate: '/authority/channels/capabilities', fabric: '/readyz', uar: `${uar}/capabilities` };
      if (!paths[step.service]) throw new Blocked('unknown_production_probe');
      const deadline = Date.now() + (step.timeoutMs ?? 60000);
      do {
        try {
          const observed = await api(service(state.config, step.service), paths[step.service]);
          const capability = observed.result;
          const ready = step.service.startsWith('boss')
            ? capability?.profile === 'remote_shared' && capability.operational === true
              && capability.gate_effects_configured === true && capability.fabric_transport_configured === true
              && capability.uar_ingress_ready === true
              && (!step.requireQualified || capability.qualified_webhook?.prerequisites_configured === true)
            : step.service === 'gate' ? capability?.configured === true && capability.available === true
            : step.service === 'fabric' ? capability?.status === 'ready'
            : capability?.supported === true;
          if (!ready) throw new Blocked(`production_capability_not_ready:${step.service}`);
          result = observed; break;
        }
        catch (error) { if (Date.now() >= deadline) throw error; await pause(500); }
      } while (Date.now() < deadline);
      if (!result) throw new Blocked('production_probe_not_ready'); break;
    }
    case 'configure_webhook': {
      if (!step.values?.WEBHOOK_DURABLE_PROFILE || !step.values?.WEBHOOK_ACCOUNT_ID) throw new Blocked('full_qualified_sidecar_form_required');
      result = await api(service(state.config, step.host), '/api/channels/sidecar/webhook/configure', {
        values: { ...step.values, WEBHOOK_CALLBACK_URL: state.callback.url },
        instance_name: step.instanceName, agent: step.handler,
      }); break;
    }
    case 'grant': result = await api(service(state.config, 'gate'), '/authority/channels/grants', {
      specification: step.specification, expected_revision: step.expectedRevision ?? null,
    }); break;
    case 'revoke_grant': result = await api(service(state.config, 'gate'),
      `/authority/channels/grants/${encodeURIComponent(step.issuer)}/${encodeURIComponent(step.grantId)}/revoke`,
      { expected_revision: step.expectedRevision }); break;
    case 'gate_evaluate': {
      let request = step.request;
      if (!request) {
        const tables = await snapshot(state.config);
        const occurrence = source(tables, step.input);
        if (!occurrence?.route_revision) throw new Blocked('real_selected_occurrence_required_for_gate_evaluation');
        if (!state.config.gateIdentity) throw new Blocked('verified_gate_service_identity_required');
        const effectId = randomUUID();
        const scope = step.scope ?? occurrence.scope;
        const { account_kind, ...gateScope } = scope;
        request = { protocol: 'afc.channel-effect/1', effect_id: effectId,
          occurrence_id: occurrence.occurrence_id, action: step.action, scope: gateScope,
          recipient: step.recipient, handler: step.handler,
          route_revision: String(occurrence.route_revision),
          payload: { algorithm: 'sha256', sha256: hash(step.payload ?? 'C08 disposable boundary operation') },
          classification: step.classification,
          causality: { root_occurrence_id: occurrence.occurrence_id, parent_action_id: null,
            action_id: effectId, route_identity: occurrence.scope_key, visited_routes: [], remaining_depth: 1, remaining_fanout: 1 },
          identity: state.config.gateIdentity, grant_issuer: step.grantIssuer, grant_id: step.grantId };
      }
      result = { ...await api(service(state.config, 'gate'), '/authority/channels/evaluate', request), request }; break;
    }
    case 'subscribe': result = await api(service(state.config, step.host ?? 'bossA'), '/api/channels/observers', step.request); break;
    case 'ingress': result = await sendIngress(step, state, step.host ?? 'bossA'); break;
    case 'race_ingress': {
      if (step.hosts?.length !== 2 || step.hosts[0] === step.hosts[1]) throw new Blocked('two_distinct_ingress_hosts_required');
      const messageId = step.input.message_id ?? `${state.runId}:${step.id}`;
      result = { sends: await Promise.all(step.hosts.map(host => sendIngress({ ...step, input: { ...step.input, message_id: messageId } }, state, host))) };
      break;
    }
    case 'reassign': result = await api(service(state.config, step.host ?? 'bossA'), '/api/channels/routes/reassign', {
      scope: step.scope, expected_revision: step.expectedRevision, handler: step.handler,
      grant_issuer: step.grantIssuer, grant_id: step.grantId,
    }); break;
    case 'detach': result = await api(service(state.config, step.host ?? 'bossA'),
      `/api/channels/observers/${encodeURIComponent(step.subscriptionId)}/detach`, {}); break;
    case 'cancel': result = await api(service(state.config, step.host ?? 'bossA'),
      `/api/channels/occurrences/${encodeURIComponent(step.occurrenceId)}/cancel`, {}, [501]); break;
    case 'acknowledge': result = await api(service(state.config, 'uar'),
      `${uar}/subscriptions/${encodeURIComponent(step.subscriptionId)}/deliveries/${encodeURIComponent(step.deliveryId)}/acknowledge`,
      { expectedRevision: step.expectedRevision }); break;
    case 'subscriptions': result = await api(service(state.config, step.service ?? 'uar'),
      step.service === 'bossA' || step.service === 'bossB' ? '/api/channels/observers' : `${uar}/subscriptions`); break;
    case 'deliveries': result = await api(service(state.config, 'uar'),
      `${uar}/subscriptions/${encodeURIComponent(step.subscriptionId)}/deliveries`); break;
    case 'wait': result = await waitSnapshot(step, state); break;
    case 'snapshot': result = { tables: await snapshot(state.config), observedAt: new Date().toISOString() }; break;
    case 'callback_receipts': result = { posts: structuredClone(state.callback.posts), observedAt: new Date().toISOString() }; break;
    case 'observe_no_repost': {
      const before = await snapshot(state.config);
      const admitted = source(before, step.input);
      if (!admitted) throw new Blocked('completed_source_required_for_no_repost_observation');
      const sameScope = row => JSON.stringify(row.scope) === JSON.stringify(admitted.scope);
      const actionsInScope = rows => {
        const ids = rows.channel_source_occurrences.filter(sameScope).map(row => row.occurrence_id);
        return rows.channel_causal_actions.filter(row => ids.includes(row.source_occurrence_id)
          && row.kind !== 'observer_copy').map(row => row.action_id).sort();
      };
      const initial = actionsInScope(before);
      const initialPosts = state.callback.posts.length;
      const milliseconds = step.observationMs ?? 3000;
      if (!Number.isSafeInteger(milliseconds) || milliseconds < 1000 || milliseconds > 60000) {
        throw new Blocked('bounded_no_repost_observation_required');
      }
      const deadline = Date.now() + milliseconds;
      let after;
      do {
        await pause(250); after = await snapshot(state.config);
        if (JSON.stringify(actionsInScope(after)) !== JSON.stringify(initial)
            || state.callback.posts.length !== initialPosts) throw new Error('unexpected_channel_repost_observed');
      } while (Date.now() < deadline);
      result = { tables: after, observationMs: milliseconds, actionIds: initial,
        callbackCount: initialPosts, noAdditionalAction: true, noAdditionalCallback: true }; break;
    }
    case 'wait_callback': {
      const deadline = Date.now() + (step.timeoutMs ?? 60000);
      do {
        const tables = await snapshot(state.config);
        const occurrence = source(tables, step.input);
        const actions = tables.channel_causal_actions.filter(row => row.source_occurrence_id === occurrence?.occurrence_id
          && row.kind === 'reply' && row.state === 'completed');
        if (actions.length > 1) throw new Blocked('ambiguous_scoped_reply_action');
        const action = actions[0];
        const posts = state.callback.posts.filter(row => row.action_id === action?.action_id);
        if (posts.length) { result = { action, posts: structuredClone(posts), tables, occurrence }; break; }
        await pause(250);
      } while (Date.now() < deadline);
      if (!result) throw new Blocked('actual_callback_and_completed_reply_not_observed'); break;
    }
    default: throw new Blocked(`unsupported_production_operation:${step.kind}`);
  }
  const receipt = { id: step.id, kind: step.kind, process: step.process,
    startedAt, finishedAt: new Date().toISOString(),
    status: 'observed', requestSha256: hash(JSON.stringify(step)), result };
  state.values.steps[step.id] = receipt;
  return receipt;
}
