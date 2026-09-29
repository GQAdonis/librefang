// C08 service-boundary evidence collector. Run only after production wiring.
// The current product has no channel-source injection API. Existing source
// records may be inspected, but this collector cannot certify source ingress.
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const args = Object.fromEntries(process.argv.slice(2).reduce((pairs, value, index, all) => {
  if (value === '--config' || value === '--out') pairs.push([value.slice(2), all[index + 1]]);
  return pairs;
}, []));
if (!args.config || !args.out) throw new Error('usage: node afc-c08-gate.mjs --config PRIVATE.json --out PRIVATE-receipt.json');

const receipt = {
  gate: 'afc-c08-composed-production',
  schema: 1,
  startedAt: new Date().toISOString(),
  status: 'unsupported',
  acceptance: { serviceBoundary: 'unverified', liveChannelSource: 'unverified',
    crossHostProfile: 'unsupported' },
  services: {},
  binaries: {},
  scenarios: {},
};
const scenarioNames = [
  'handlerConflictAndRecipient', 'observerIsolation', 'revocationRestartReplay',
  'replyEchoAndScope', 'boundedReaction', 'detachAndOwnerCancel',
];
const mark = (name, status, reason, evidence = {}) => {
  receipt.scenarios[name] = { status, reason, evidence };
};
const fingerprint = value => createHash('sha256').update(String(value)).digest('hex').slice(0, 20);
const unique = values => new Set(values).size === values.length;
const field = (obj, name) => obj?.[name] ?? obj?.[name.replaceAll(/_([a-z])/g, (_, c) => c.toUpperCase())];

function baseUrl(value) {
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new Error('service URLs must be plain HTTP(S) origins without credentials or query parameters');
  }
  return url.toString().replace(/\/$/, '');
}

function credential(name) {
  if (!name || !process.env[name]) throw new Error(`required credential environment variable is absent: ${name ?? '(unspecified)'}`);
  return process.env[name];
}

async function api(service, path) {
  const headers = { accept: 'application/json' };
  if (service.tokenEnv) headers.authorization = `Bearer ${credential(service.tokenEnv)}`;
  if (service.workspace) headers['x-uar-workspace-id'] = service.workspace;
  const response = await fetch(`${baseUrl(service.url)}${path}`, {
    headers, signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status} at ${path}`);
  return response.json();
}

async function sql(database, statement) {
  const headers = {
    accept: 'application/json', 'content-type': 'text/plain',
    'surreal-ns': database.namespace, 'surreal-db': database.database,
  };
  if (database.tokenEnv) headers.authorization = `Bearer ${credential(database.tokenEnv)}`;
  else headers.authorization = `Basic ${Buffer.from(`${credential(database.userEnv)}:${credential(database.passwordEnv)}`).toString('base64')}`;
  const response = await fetch(`${baseUrl(database.url)}/sql`, {
    method: 'POST', headers, body: statement, signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`SurrealDB SQL HTTP ${response.status}`);
  const result = await response.json();
  if (!Array.isArray(result) || result.length !== 1 || result[0]?.status !== 'OK' || !Array.isArray(result[0].result)) {
    throw new Error('SurrealDB returned an unsuccessful or unexpected SQL result');
  }
  if (result[0].result.length === 1000) throw new Error('C08 table read reached its 1000-row bound; use an isolated gate database');
  return result[0].result;
}

async function binaryDigest(path) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(resolve(path))) hash.update(chunk);
  return `sha256:${hash.digest('hex')}`;
}

function source(rows, id, scope) {
  if (!id) return null;
  const matches = rows.filter(row => row.native_message_id === id
    && Object.entries(scope ?? {}).every(([key, value]) => field(row.scope, key) === value));
  if (matches.length > 1) throw new Error('native source identity is ambiguous in durable storage');
  return matches[0] ?? null;
}

async function inspect(config) {
  for (const name of ['bossA', 'bossB', 'gate', 'fabric', 'uar']) {
    const service = config.services?.[name];
    if (!service?.url) throw new Error(`missing ${name} service URL`);
    const path = {
      bossA: '/api/channels/route-capability', bossB: '/api/channels/route-capability',
      gate: '/authority/channels/capabilities', fabric: '/readyz',
      uar: '/api/uar/channel-observers/v1/capabilities',
    }[name];
    try {
      const result = await api(service, path);
      const operational = name.startsWith('boss')
        ? result.operational === true && result.gate_effects_configured === true
          && result.fabric_transport_configured === true && result.uar_ingress_ready === true
        : name === 'gate' ? result.configured === true && result.available === true
        : name === 'fabric' ? result.status === 'ready'
          && Object.values(result.checks ?? {}).every(check => check.ok === true)
        : result.profile === 'uar.channel-source/1' && result.supported === true;
      receipt.services[name] = { status: operational ? 'operational' : 'unavailable',
        endpoint: baseUrl(service.url), capability: name.startsWith('boss')
          ? { profile: result.profile, operational: result.operational, gate: result.gate_effects_configured,
            fabric: result.fabric_transport_configured, uar: result.uar_ingress_ready,
            crossHostObservers: result.cross_host_observers }
          : name === 'uar' ? { profile: result.profile, supported: result.supported,
            crossHostSupported: result.crossHostSupported ?? result.cross_host_supported }
          : name === 'gate' ? { contract: result.contract, available: result.available }
          : { readiness: result.status } };
    } catch (error) {
      receipt.services[name] = { status: 'failed', endpoint: baseUrl(service.url), reason: error.message };
    }
  }
  for (const [name, binary] of Object.entries(config.binaries ?? {})) {
    if (!binary.path || !binary.sourceRevision) throw new Error(`binary ${name} needs an exact path and sourceRevision`);
    receipt.binaries[name] = { sourceRevision: binary.sourceRevision, sha256: await binaryDigest(binary.path) };
  }
  receipt.storage = { engine: 'surrealdb', expectedVersion: '3.3.0', namespace: config.surreal.namespace,
    database: config.surreal.database, endpoint: baseUrl(config.surreal.url) };
  const tables = Object.fromEntries(await Promise.all([
    'channel_source_occurrences', 'channel_route_affinity', 'channel_route_dispatch',
    'channel_observer_subscriptions', 'channel_observer_deliveries',
    'channel_causal_actions', 'channel_provider_echoes',
  ].map(async name => [name, await sql(config.surreal, `SELECT * FROM ${name} LIMIT 1000;`)])));
  const e = config.evidence ?? {};
  const scope = e.scope;
  const occurrences = tables.channel_source_occurrences;
  const conflict = source(occurrences, e.conflictNativeId, scope);
  const selected = source(occurrences, e.selectedNativeId, scope);
  const conflictOutcome = field(conflict?.decision, 'outcome');
  const selectedOutcome = field(selected?.decision, 'outcome');
  if (!conflict || !selected) {
    mark('handlerConflictAndRecipient', 'blocked', 'Provide two already-admitted normalized source IDs; the product has no source-injection API for this collector.');
  } else if (conflictOutcome?.kind !== 'conflict' || !unique(conflictOutcome.handlers ?? [])
    || (conflictOutcome.handlers ?? []).length !== 2
    || tables.channel_route_dispatch.some(row => row.occurrence_id === conflict.occurrence_id)
    || selectedOutcome?.kind !== 'selected' || selectedOutcome.handler !== e.expectedHandler
    || selected.decision.reason !== 'explicit_address') {
    mark('handlerConflictAndRecipient', 'failed', 'Durable conflict, non-dispatch, or explicit recipient disagrees with the expected outcome.');
  } else {
    mark('handlerConflictAndRecipient', 'observed', 'Durable rows show conflict/non-dispatch and explicit selection; source ingress remains unverified.',
      { conflict: fingerprint(conflict.occurrence_id), selected: fingerprint(selected.occurrence_id),
        bindingRevision: field(selected.decision, 'binding_revision'), routeRevision: selected.route_revision });
  }
  const observer = source(occurrences, e.observerNativeId, scope);
  const authorized = e.authorizedSubscriptionIds ?? [];
  const copies = tables.channel_observer_deliveries.filter(row => row.occurrence_id === observer?.occurrence_id);
  const selectedCopies = copies.filter(row => authorized.includes(row.subscription_id));
  const subscriptions = tables.channel_observer_subscriptions;
  if (!observer || authorized.length !== 2 || !e.deniedSubscriptionId) {
    mark('observerIsolation', 'blocked', 'Provide an admitted normalized source ID, two authorized subscriptions, and a denied subscriber ID.');
  } else if (selectedCopies.length !== 2 || !unique(selectedCopies.map(row => row.delivery_id))
    || !unique(selectedCopies.map(row => row.action_id))
    || copies.some(row => row.subscription_id === e.deniedSubscriptionId)
    || selectedCopies.some(copy => !subscriptions.some(sub => sub.subscription_id === copy.subscription_id
      && sub.ack_sequence >= copy.sequence))) {
    mark('observerIsolation', 'failed', 'Durable observer copies/cursors are duplicated, missing, unacknowledged, or disclosed to the denied subscriber.');
  } else {
    const uarList = await api(config.services.uar, '/api/uar/channel-observers/v1/subscriptions');
    if (!Array.isArray(uarList) || selectedCopies.some(copy => !uarList.some(sub => sub.subscriptionId === copy.subscription_id && sub.cursor))) {
      mark('observerIsolation', 'failed', 'UAR did not retain two distinct acknowledged subscriber cursors.');
    } else {
      mark('observerIsolation', 'observed', 'Two acknowledged copies and UAR cursors are durable; a missing third copy alone does not prove a Gate denial.',
        { source: fingerprint(observer.occurrence_id), deliveries: selectedCopies.map(row => fingerprint(row.delivery_id)) });
    }
  }
  const withheld = tables.channel_observer_deliveries.find(row => row.delivery_id === e.revokedDeliveryId);
  if (!withheld) {
    mark('revocationRestartReplay', 'blocked', 'A queued delivery ID and live withheld receipt are required after grant revocation and all three host restarts.');
  } else if (withheld.state !== 'withheld') {
    mark('revocationRestartReplay', 'failed', 'The queued delivery was not withheld by current authority.');
  } else {
    mark('revocationRestartReplay', 'blocked', 'Withheld storage exists, but current APIs do not attest revocation-before-release ordering or three-host restart epochs.',
      { delivery: fingerprint(withheld.delivery_id), state: withheld.state });
  }
  const replySource = source(occurrences, e.replyNativeId, scope);
  const replies = tables.channel_causal_actions.filter(row => row.root_occurrence_id === replySource?.occurrence_id && row.kind === 'reply');
  const echoes = tables.channel_provider_echoes.filter(row => replies.some(reply => reply.action_id === row.action_id));
  if (!replySource || !e.postedNativeId) {
    mark('replyEchoAndScope', 'blocked', 'Provide a real source and provider-native outbound message ID after an authorized scoped reply.');
  } else if (replies.length !== 1 || replies[0].state !== 'completed'
    || echoes.filter(row => row.native_message_id === e.postedNativeId).length !== 1) {
    mark('replyEchoAndScope', 'failed', 'Reply action or native echo mapping is missing, duplicated, or not settled.');
  } else {
    mark('replyEchoAndScope', 'blocked', 'One reply/action/echo binding is durable; product APIs do not yet expose a cross-scope refusal receipt or prove injected echo suppression.',
      { action: fingerprint(replies[0].action_id), source: fingerprint(replySource.occurrence_id) });
  }
  const reaction = tables.channel_causal_actions.filter(row => row.root_occurrence_id === e.reactionRootOccurrenceId);
  const a = reaction.find(row => row.action_id === e.reactionAForwardActionId);
  const aReply = reaction.find(row => row.action_id === e.reactionAReplyActionId);
  const b = reaction.find(row => row.action_id === e.reactionBForwardActionId);
  const bReply = reaction.find(row => row.action_id === e.reactionBReplyActionId);
  const back = reaction.find(row => row.action_id === e.reactionBackToAForwardActionId);
  if (!a || !aReply || !b || !bReply || !back) {
    mark('boundedReaction', 'blocked', 'No production A→B→A chain is present. Source now links Discord reply references through durable actions, but without live ingress the Gate-authorized A→B and B→A reassignment/effect path is unverified.');
  } else if (aReply.parent_action_id !== a.action_id || b.parent_action_id !== aReply.action_id
    || bReply.parent_action_id !== b.action_id || back.parent_action_id !== bReply.action_id
    || a.kind !== 'forward' || b.kind !== 'forward' || back.kind !== 'forward'
    || a.route_identity !== back.route_identity || a.route_identity === b.route_identity
    || back.state !== 'suppressed' || back.suppression_reason !== 'visited_route') {
    mark('boundedReaction', 'failed', 'A→B→A lineage was not durably suppressed at the revisited route.');
  } else {
    mark('boundedReaction', 'blocked', 'Visited-route suppression is durable, but rows alone do not attest Gate-authorized revision-CAS reassignments and real predecessor effects.',
      { root: fingerprint(e.reactionRootOccurrenceId), parent: fingerprint(bReply.action_id), suppression: back.suppression_reason });
  }
  mark('detachAndOwnerCancel', 'blocked', 'Fabric detach and owner cancellation require live run-state and control receipts from their owning runtimes; no synthetic pass is accepted.');
}

try {
  const config = JSON.parse(await readFile(resolve(args.config), 'utf8'));
  await inspect(config);
} catch (error) {
  receipt.error = error.message;
} finally {
  for (const name of scenarioNames) {
    if (!receipt.scenarios[name]) mark(name, 'blocked', 'The composed service/storage inspection did not complete.');
  }
  const states = Object.values(receipt.scenarios).map(row => row.status);
  receipt.acceptance.serviceBoundary = Object.values(receipt.services).length === 5
    && Object.values(receipt.services).every(service => service.status === 'operational')
    ? 'operational' : 'failed';
  receipt.status = states.includes('failed') || receipt.acceptance.serviceBoundary === 'failed'
    ? 'failed' : 'unsupported';
  receipt.finishedAt = new Date().toISOString();
  await mkdir(dirname(resolve(args.out)), { recursive: true });
  await writeFile(resolve(args.out), `${JSON.stringify(receipt, null, 2)}\n`, { mode: 0o600 });
  console.log(`C08 gate ${receipt.status}; receipt: ${resolve(args.out)}`);
  if (receipt.status !== 'passed') process.exitCode = 1;
}
