import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

// Imported by the production cadence boss-launch.mjs. Preparing this source is
// not execution evidence. The launcher supplies a real packaged renderer CDP.
const digest = value => createHash('sha256').update(String(value)).digest('hex');
const failure = code => { throw new Error(`C08_UI_${code}`); };
const states = { pending_authority: 'Pending authority', admitted: 'Admitted',
  withheld: 'Withheld', uncertain: 'Uncertain', acknowledged: 'Acknowledged' };
const now = () => new Date().toISOString();

async function privateJson(path) {
  if (!isAbsolute(path ?? '')) failure('PRIVATE_PATH_REQUIRED');
  const metadata = await stat(path);
  if (!metadata.isFile() || (metadata.mode & 0o077) !== 0) failure('PRIVATE_FILE_REQUIRED');
  return JSON.parse(await readFile(path, 'utf8'));
}
async function immutable(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
}
function credential(ref) {
  if (typeof ref !== 'string' || !/^[A-Z][A-Z0-9_]*$/.test(ref) || !process.env[ref]) {
    failure('CREDENTIAL_ENV_REQUIRED');
  }
  return process.env[ref];
}

// Only existing DOM controls are driven here. No IPC controls, React state
// injection, network replacement, or direct feature mutation is used.
function dom(action, args) {
  const visible = node => node && node.getBoundingClientRect().width > 0
    && node.getBoundingClientRect().height > 0 && getComputedStyle(node).visibility !== 'hidden';
  const usable = node => visible(node) && !node.disabled && node.getAttribute('aria-disabled') !== 'true';
  const text = node => node?.textContent.trim();
  const nodes = (selector, root = document) => [...root.querySelectorAll(selector)];
  const group = title => {
    const heading = nodes('span,div,h2,h3').find(node => visible(node) && text(node) === title);
    return heading?.closest('.bg-card');
  };
  const article = id => nodes('article').find(node => text(node.querySelector('h3')) === id);
  const instance = id => nodes('div').find(node => visible(node) && node.children.length === 0
    && text(node) === id)?.closest('.p-4');
  const root = args.subscriptionId ? article(args.subscriptionId)
    : args.instanceId ? instance(args.instanceId) : args.group ? group(args.group) : document;
  if (!root) return false;
  const pairs = target => Object.fromEntries(nodes('dt', target).map(node => [text(node), text(node.nextElementSibling)]));
  if (action === 'click') {
    const button = nodes('button', root).find(node => usable(node)
      && (text(node) === args.text || node.getAttribute('aria-label') === args.text));
    if (!button) return false;
    button.click(); return true;
  }
  if (action === 'navigate') {
    const anchor = nodes('a[href]').find(node => visible(node) && (args.away
      ? node.getAttribute('href').includes('/settings/') && !node.getAttribute('href').includes('/settings/uar')
      : node.getAttribute('href').includes('/settings/uar')));
    if (anchor) { anchor.click(); return true; }
    const buttonText = args.away ? 'General' : 'Universal Agent Runtime';
    const button = nodes('button').find(node => usable(node) && text(node) === buttonText);
    if (!button) return false;
    button.click(); return true;
  }
  if (action === 'fill' || action === 'choice') {
    const label = nodes('label', root).find(node => text(node) === args.label);
    const input = label ? document.getElementById(label.htmlFor) : null;
    if (!usable(input)) return false;
    if (action === 'fill') {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, args.value);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
      input.focus(); input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    }
    return true;
  }
  if (action === 'workspace') {
    const input = nodes('[role="combobox"]').find(node => usable(node) && node.getAttribute('aria-label') === 'Workspace');
    if (!input) return false;
    input.focus(); input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    return true;
  }
  if (action === 'option') {
    const option = nodes('[role="option"]').find(node => usable(node)
      && (text(node) === args.text || text(node)?.endsWith(` · ${args.text}`)));
    if (!option) return false;
    option.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerType: 'mouse', button: 0 }));
    option.click(); return true;
  }
  if (action === 'surface') {
    const button = nodes('nav button').find(node => usable(node) && text(node) === args.text);
    if (button) { button.click(); return 'button'; }
    const select = nodes('[role="combobox"]').find(node => usable(node)
      && node.getAttribute('aria-label') === 'UAR administration section');
    if (!select) return false;
    select.click(); return 'select';
  }
  if (action === 'instance') return {
    selected: nodes('span,div', root).some(node => node.children.length === 0 && text(node) === 'Default'),
    operational: nodes('span,div', root).some(node => node.children.length === 0 && text(node) === 'Operational'),
    identityObserved: root.textContent.includes(`Observed ${args.expectedRuntimeId}, version `)
  };
  if (action === 'subscription') {
    const fields = pairs(root);
    const top = root.firstElementChild;
    return { fields, state: ['Active', 'Paused', 'Revoked'].find(value =>
      nodes('span,div', top).some(node => node.children.length === 0 && text(node) === value)) };
  }
  if (action === 'deliveries') {
    const panel = document.getElementById(`channel-deliveries-${args.subscriptionId}`);
    if (!panel || !visible(panel)) return false;
    return args.deliveries.every(delivery => {
      const row = nodes('dl', panel).find(node => pairs(node)['Delivery ID'] === delivery.deliveryId)?.parentElement;
      if (!row) return false;
      const fields = pairs(row);
      return fields['Occurrence ID'] === delivery.occurrenceId && fields.Cursor === delivery.subscriberCursorId
        && fields['Recorded at'] === delivery.admittedAt && fields['Updated at'] === delivery.updatedAt
        && nodes('span', row).some(node => text(node) === delivery.label);
    });
  }
  return false;
}

export default async function run({ evaluate, signal }) {
  const receipt = { schema: 'c08-boss-ui-operation-receipt/1', status: 'blocked',
    startedAt: now(), setup: [], actions: [], executionCancellation: 'not_operated' };
  let receiptPath;
  try {
    receiptPath = process.env.C08_BOSS_UI_RECEIPT;
    if (!isAbsolute(receiptPath ?? '')) failure('RECEIPT_PATH_REQUIRED');
    const config = await privateJson(process.env.C08_BOSS_UI_CONFIG);
    if (config.schema !== 'c08-boss-ui-operation/1' || config.disposable !== true) failure('DISPOSABLE_CONFIG_REQUIRED');
    const uar = config.uar;
    const endpoint = new URL(uar?.url);
    if (endpoint.username || endpoint.password || endpoint.search || endpoint.hash || endpoint.pathname !== '/'
      || !(endpoint.protocol === 'https:' || (endpoint.protocol === 'http:'
        && ['127.0.0.1', 'localhost', '[::1]'].includes(endpoint.hostname)))) failure('TRUSTED_ENDPOINT_REQUIRED');
    if (!uar.instanceId || !uar.name || !uar.expectedRuntimeId || uar.workspaceLocation !== 'remote'
      || !isAbsolute(config.workspace?.path ?? '') || !config.workspace.name
      || !isAbsolute(config.provision?.requestPath ?? '') || !isAbsolute(config.provision?.responsePath ?? '')) {
      failure('EXPLICIT_DISPOSABLE_SCOPE_REQUIRED');
    }
    if (!(await stat(config.workspace.path)).isDirectory()) failure('WORKSPACE_DIRECTORY_REQUIRED');
    const runtimeCredential = credential(uar.tokenEnv);
    const adminCredential = credential(uar.adminTokenEnv);
    receipt.instanceId = uar.instanceId;
    receipt.expectedRuntimeId = uar.expectedRuntimeId;
    receipt.endpointSha256 = digest(uar.url);
    const call = (action, args = {}) => evaluate(`(${dom.toString()})(${JSON.stringify(action)},${JSON.stringify(args)})`);
    async function wait(code, observe, accept = Boolean, milliseconds = 20000) {
      const deadline = Date.now() + milliseconds;
      do {
        signal.throwIfAborted();
        const value = await observe();
        if (accept(value)) return value;
        await delay(150, undefined, { signal });
      } while (Date.now() < deadline);
      failure(code);
    }
    async function click(text, scope = {}) {
      await wait('CONTROL_NOT_ACTIONABLE', () => call('click', { text, ...scope }));
      receipt.actions.push({ action: text, boundary: 'packaged-renderer-dom', at: now() });
    }
    async function selectSurface(text) {
      const mode = await wait('ADMINISTRATION_SURFACE_NOT_ACTIONABLE', () => call('surface', { text }), Boolean, 90000);
      if (mode === 'select') await wait('ADMINISTRATION_SURFACE_OPTION_NOT_ACTIONABLE', () => call('option', { text }));
      receipt.actions.push({ action: `Open ${text}`, boundary: 'packaged-renderer-dom', at: now() });
    }
    await wait('ONBOARDING_OR_SETTINGS_NOT_READY', async () => {
      if (await call('click', { text: 'Set up later' })) return true;
      return call('click', { text: 'Settings' });
    });
    // Skip transitions asynchronously into the main shell. Wait for its real
    // Settings control instead of racing the first render and discarding a
    // false click result.
    await wait('SETTINGS_NOT_ACTIONABLE', () => call('click', { text: 'Settings' }));
    await wait('UAR_SETTINGS_NOT_VISIBLE', () => call('navigate'));
    const form = { group: 'Add an external UAR instance' };
    await selectSurface('Runtime instances');
    await wait('EXTERNAL_INSTANCE_FORM_NOT_VISIBLE', () => call('fill', {
      ...form, label: 'Instance ID', value: uar.instanceId
    }));
    const fields = {
      Name: uar.name, 'Expected runtime identity': uar.expectedRuntimeId,
      'Execution profile': 'uar.service-instance/1', 'Minimum version': uar.minimumVersion ?? '',
      'Allowed workspace roots': '', 'Required capabilities': '',
      'Runtime endpoint': uar.url,
      'Administration endpoint': new URL('/api/uar', endpoint).toString(),
      'Models endpoint': new URL('/v1', endpoint).toString(),
      'Console endpoint': new URL('/admin', endpoint).toString(),
      'Protected credential · Runtime endpoint': runtimeCredential,
      'Protected credential · Administration endpoint': adminCredential
    };
    for (const [label, value] of Object.entries(fields)) {
      await wait('INSTANCE_FIELD_NOT_ACTIONABLE', () => call('fill', { ...form, label, value }));
    }
    await wait('REMOTE_PLACEMENT_NOT_ACTIONABLE', () => call('choice', { ...form, label: 'Workspace location' }));
    await wait('REMOTE_OPTION_NOT_ACTIONABLE', () => call('option', { text: 'Remote' }));
    await click('Save', form);
    await click('Make default', { instanceId: uar.instanceId });
    await click('Check connection', { instanceId: uar.instanceId });
    const placement = await wait('INSTANCE_IDENTITY_NOT_VERIFIED', () => call('instance', {
      instanceId: uar.instanceId, expectedRuntimeId: uar.expectedRuntimeId
    }), value => value?.selected && value.operational && value.identityObserved);
    receipt.placement = { ...placement, at: now(), boundary: 'packaged-renderer-dom' };

    const workspace = await evaluate(`(async () => {
      const response = await window.api.dataApi.request({ id: ${JSON.stringify(`c08_${randomUUID()}`)},
        method: 'POST', path: '/agent-workspaces',
        body: ${JSON.stringify(config.workspace)}, metadata: { timestamp: Date.now() } });
      if (response.error || response.status < 200 || response.status >= 300
        || !response.data?.id || response.data.type !== 'user') throw new Error('C08_UI_WORKSPACE_SETUP_FAILED');
      return { id: response.data.id, name: response.data.name, type: response.data.type };
    })()`);
    if (!workspace?.id || workspace.name !== config.workspace.name || workspace.type !== 'user') failure('WORKSPACE_SETUP_FAILED');
    receipt.workspaceId = workspace.id;
    receipt.setup.push({ action: 'create-disposable-workspace', boundary: 'packaged-preload-dataapi',
      workspaceId: workspace.id, workspacePathSha256: digest(config.workspace.path), at: now() });
    await immutable(config.provision.requestPath, { schema: 'c08-boss-ui-workspace/1', disposable: true,
      workspaceId: workspace.id, instanceId: uar.instanceId, expectedRuntimeId: uar.expectedRuntimeId,
      endpointSha256: digest(uar.url), ownerCredentialRef: uar.tokenEnv,
      workspacePathSha256: digest(config.workspace.path) });
    const exported = await wait('AUTHORIZED_SUBSCRIPTION_NOT_PROVISIONED', async () => {
      try { return await privateJson(config.provision.responsePath); }
      catch (error) { if (error.code === 'ENOENT') return null; throw error; }
    }, Boolean, 180000);
    if (exported.schema !== 'c08-boss-ui-subscription/1' || exported.disposable !== true
      || exported.workspaceId !== workspace.id || exported.expectedRuntimeId !== uar.expectedRuntimeId
      || exported.endpointSha256 !== digest(uar.url) || exported.ownerCredentialRef !== uar.tokenEnv
      || exported.authorizedOperation !== 'pause-resume' || !exported.subscriptionId || !exported.source) {
      failure('AUTHORIZED_SCOPE_MISMATCH');
    }
    receipt.subscriptionId = exported.subscriptionId;
    receipt.sourceSha256 = digest(JSON.stringify(exported.source));
    async function read(path) {
      let response;
      try {
        response = await fetch(new URL(path, endpoint), { redirect: 'error', headers: {
          authorization: `Bearer ${runtimeCredential}`, 'x-uar-workspace-id': workspace.id
        }, signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]) });
      } catch { failure('UAR_READ_UNAVAILABLE'); }
      if (!response.ok) failure(`UAR_READ_STATUS_${response.status}`);
      try { return await response.json(); } catch { failure('UAR_READ_INVALID'); }
    }
    const base = '/api/uar/channel-observers/v1/subscriptions';
    async function subscription() {
      const records = await read(base);
      const record = Array.isArray(records) && records.find(row => row.subscriptionId === exported.subscriptionId);
      if (!record || record.workspaceId !== workspace.id || JSON.stringify(record.source) !== JSON.stringify(exported.source)) {
        failure('REAL_SUBSCRIPTION_SCOPE_MISMATCH');
      }
      return { revision: record.revision, cursor: record.cursor, paused: record.paused, revoked: record.revoked,
        workspaceId: record.workspaceId, observerInstanceId: record.observerInstanceId, source: record.source };
    }
    const initial = await subscription();
    const stateReceipt = record => ({ revision: record.revision, cursor: record.cursor, paused: record.paused, revoked: record.revoked });
    receipt.initial = { ...stateReceipt(initial), observedAt: now() };
    if (initial.paused || initial.revoked) failure('ACTIVE_SUBSCRIPTION_REQUIRED');
    await wait('SETTINGS_REFRESH_NAVIGATION_UNAVAILABLE', () => call('navigate', { away: true }));
    await wait('UAR_SETTINGS_NOT_VISIBLE', () => call('navigate'));
    await selectSurface('Local observers');
    await wait('WORKSPACE_SELECT_NOT_ACTIONABLE', () => call('workspace'));
    await wait('WORKSPACE_OPTION_NOT_ACTIONABLE', () => call('option', { text: workspace.name }));
    await click('Refresh', { group: 'Channel observations' });
    const scope = { subscriptionId: exported.subscriptionId };
    async function visibleRecord(record) {
      return wait('REAL_SUBSCRIPTION_NOT_DISPLAYED', () => call('subscription', scope), value => value
        && value.fields.Workspace === workspace.id && Number(value.fields.Revision) === record.revision
        && value.fields.Cursor === (record.cursor ?? '—')
        && value.fields.Provider === record.source.provider && value.fields.Account === record.source.account
        && value.fields['Source workspace'] === record.source.workspace && value.fields['Room / channel'] === record.source.room
        && value.fields.Thread === (record.source.thread ?? '—') && value.fields.Sender === record.source.sender
        && value.fields['Observer instance'] === record.observerInstanceId
        && value.state === (record.revoked ? 'Revoked' : record.paused ? 'Paused' : 'Active'));
    }
    await visibleRecord(initial);
    const inventory = await read(`${base}/${encodeURIComponent(exported.subscriptionId)}/deliveries`);
    if (inventory.subscriptionId !== exported.subscriptionId || inventory.cursor !== initial.cursor
      || !Array.isArray(inventory.deliveries) || !inventory.deliveries.length
      || inventory.deliveries.some(row => !states[row.status])) failure('REAL_DELIVERY_METADATA_REQUIRED');
    if ((config.requiredDeliveryStatuses ?? []).some(status => !inventory.deliveries.some(row => row.status === status))) {
      failure('REQUIRED_DELIVERY_STATE_NOT_OBSERVED');
    }
    const deliveries = inventory.deliveries.map(row => ({ deliveryId: row.deliveryId, occurrenceId: row.occurrenceId,
      subscriberCursorId: row.subscriberCursorId, status: row.status, admittedAt: row.admittedAt, updatedAt: row.updatedAt }));
    await click('Delivery details', scope);
    await wait('REAL_DELIVERY_METADATA_NOT_DISPLAYED', () => call('deliveries', {
      ...scope, deliveries: deliveries.map(row => ({ ...row, label: states[row.status] }))
    }));
    receipt.deliveries = { boundary: 'read-only-uar-and-packaged-dom', observedAt: now(), cursor: inventory.cursor, records: deliveries };
    await click('Pause observation', scope);
    const paused = await wait('PAUSE_CHANGE_NOT_OBSERVED', subscription,
      record => record.paused && !record.revoked && record.revision > initial.revision);
    receipt.paused = { ...stateReceipt(paused), observedAt: now(), mutationBoundary: 'packaged-renderer-dom' };
    if (paused.cursor !== initial.cursor) failure('PAUSE_CURSOR_CHANGED');
    await visibleRecord(paused);
    await click('Resume observation', scope);
    const resumed = await wait('RESUME_CHANGE_NOT_OBSERVED', subscription,
      record => !record.paused && !record.revoked && record.revision > paused.revision);
    receipt.resumed = { ...stateReceipt(resumed), observedAt: now(), mutationBoundary: 'packaged-renderer-dom' };
    if (resumed.cursor !== initial.cursor) failure('RESUME_CURSOR_CHANGED');
    await visibleRecord(resumed);
    receipt.status = 'observed';
    receipt.finishedAt = now();
    await immutable(receiptPath, receipt);
    return { passed: true, observedBehavior: 'Configured and selected the authenticated disposable external UAR in the packaged Boss UI; verified its observed runtime identity. Created the disposable workspace through the approved preload DataApi setup seam. Refreshed real channel observations, displayed retained delivery metadata, and operated Pause observation and Resume observation through actual DOM controls. Read-only UAR observations confirmed increasing revisions and preserved cursor, with the subscription active again. No execution cancellation was operated.' };
  } catch (error) {
    receipt.finishedAt = now();
    receipt.code = /^C08_UI_[A-Z0-9_]+$/.test(error.message ?? '') ? error.message : 'C08_UI_OPERATION_BLOCKED';
    if (receiptPath && isAbsolute(receiptPath)) {
      try { await immutable(receiptPath, receipt); } catch { /* Never replace prior evidence. */ }
    }
    throw new Error(receipt.code);
  }
}
