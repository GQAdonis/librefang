import { createServer } from 'node:net'
import { click, fill, selectOption } from './controls.mjs'
import { ipc } from './setup.mjs'
import { requireFact, waitFor } from './io.mjs'

export const selector = (token) => `[data-ui~="bossfang-${token}"]`
const visible = (query) => `[...document.querySelectorAll(${JSON.stringify(query)})].find(node=>node.getClientRects().length)`

// Only the explicitly public, credential-free product DTOs cross this boundary.
// Error text, log bodies and remote event bodies are deliberately not exported.
export async function status(evaluate) {
  const value = await ipc(evaluate, 'bossfang.status')
  return {
    status: value.status, configured: value.configured, ownership: value.ownership,
    requested: value.requested, effective: value.effective, restartRequired: value.restartRequired,
    connection: value.connection, hasError: Boolean(value.error),
    hasConnectionError: Boolean(value.connectionError), logCount: value.logs.length
  }
}

export async function uarState(evaluate) {
  const snapshot = await ipc(evaluate, 'prometheus.integration.snapshot', {})
  return {
    state: snapshot.uar.state, processId: snapshot.uar.processId,
    startedAt: snapshot.uar.startedAt, port: snapshot.uar.effectivePort,
    selectedInstanceId: snapshot.uar.selectedInstanceId
  }
}

export function sameUar(before, after) {
  requireFact(before.state === 'running' && after.state === 'running' &&
    Number.isInteger(before.processId) && before.processId === after.processId &&
    before.startedAt === after.startedAt, 'C14_BOSSFANG_CHANGED_UAR_PROCESS')
}

export async function openSettings(evaluate, signal) {
  await ipc(evaluate, 'navigation.open_route_in_main', {path: '/settings/bossfang'})
  await waitFor(signal, () => evaluate(`Boolean(${visible(selector('ownership'))})`),
    'C14_BOSSFANG_DEDICATED_SETTINGS_UNAVAILABLE')
}

export async function choose(evaluate, signal, token, value) {
  await selectOption(evaluate, signal, selector(token),
    `[...document.querySelectorAll('[role="option"]')].find(node=>node.getAttribute('data-value')===${JSON.stringify(value)} && node.getClientRects().length)`,
    'C14_BOSSFANG_' + token.toUpperCase().replaceAll('-', '_') + '_UNAVAILABLE')
}

export async function saveDraft(evaluate, signal) {
  const enabled = await evaluate(`(() => {const node=${visible(selector('save'))};return Boolean(node&&!node.disabled)})()`)
  if (enabled) await click(evaluate, signal, selector('save'), 'C14_BOSSFANG_SAVE_UNAVAILABLE')
}

export async function managedConfig(evaluate, signal, {port, portPolicy, instanceId, workspaceId, modelId}) {
  await openSettings(evaluate, signal)
  const before = await status(evaluate)
  if (before.requested.ownership !== 'managed') await choose(evaluate, signal, 'ownership', 'managed')
  if (before.requested.port !== port) await fill(evaluate, signal, selector('port'), String(port), 'C14_BOSSFANG_PORT_UNAVAILABLE')
  if (before.requested.portPolicy !== portPolicy) await choose(evaluate, signal, 'port-policy', portPolicy)
  if (before.requested.uarInstanceId !== instanceId) await choose(evaluate, signal, 'uar-instance', instanceId)
  if (before.requested.workspaceId !== workspaceId) await choose(evaluate, signal, 'workspace', workspaceId)
  if (modelId && before.requested.diagnosticModelId !== modelId) await choose(evaluate, signal, 'model', modelId)
  await saveDraft(evaluate, signal)
  return waitFor(signal, async () => {
    const next = await status(evaluate)
    return next.requested.ownership === 'managed' && next.requested.port === port &&
      next.requested.portPolicy === portPolicy && next.requested.uarInstanceId === instanceId &&
      next.requested.workspaceId === workspaceId && (!modelId || next.requested.diagnosticModelId === modelId) && next
  }, 'C14_BOSSFANG_CONFIGURATION_NOT_APPLIED')
}

export async function action(evaluate, signal, token, predicate, timeoutMs = 150000) {
  await click(evaluate, signal, selector(token), 'C14_BOSSFANG_' + token.toUpperCase() + '_UNAVAILABLE')
  return waitFor(signal, async () => {
    const next = await status(evaluate)
    return predicate(next) && next
  }, 'C14_BOSSFANG_' + token.toUpperCase() + '_NOT_OBSERVED', timeoutMs)
}

export async function diagnostic(evaluate, signal, id) {
  const actualId = id ?? await waitFor(signal, () => evaluate(`(() => {
    const node=${visible(selector('diagnostic-report'))};return node?.getAttribute('data-diagnostic-id')||false;
  })()`), 'C14_BOSSFANG_DIAGNOSTIC_ID_UNAVAILABLE')
  const value = await ipc(evaluate, 'bossfang.diagnostic.status', {id: actualId})
  return {
    id: value.id, status: value.status, instanceId: value.instanceId, workspaceId: value.workspaceId,
    model: value.model, taskId: value.taskId, startedAt: value.startedAt, completedAt: value.completedAt,
    checks: value.checks,
    stages: value.stages.map(item => ({stage: item.stage, status: item.status})),
    events: value.events.map(item => ({cursor: item.cursor, type: item.type, occurredAt: item.occurredAt})),
    usage: value.usage, cancellation: value.cancellation ?? null,
    hasError: Boolean(value.error), action: value.action
  }
}

export async function dashboard(evaluate, signal, expectedOrigin) {
  return waitFor(signal, async () => {
    try {
      const observed = await evaluate(`(async()=>{
        const guest=${visible('webview[data-mini-app-id="bossfang-dashboard"]')};
        if(!guest||!guest.getURL().startsWith(${JSON.stringify(expectedOrigin + '/dashboard')}))return false;
        const content=await guest.executeJavaScript(${JSON.stringify(`(async()=>{
          // Match the native dashboard client's existing sessionStorage/header
          // contract. The credential stays inside the isolated guest; only the
          // HTTP status and rendered auth state leave this evaluation.
          const response=await fetch('/api/authz/whoami',{credentials:'include',redirect:'error',
            headers:{Authorization:'Bearer '+(sessionStorage.getItem('bossfang-api-key')||'')}});
          return {authenticatedStatus:response.status,loginDialog:Boolean(document.querySelector('#auth-dialog-title')),
            shellVisible:Boolean(document.querySelector('nav')),hostIpcExposed:Boolean(window.api?.ipcApi),
            mascotVisible:[...document.images].some(node=>node.currentSrc.includes('boss-libre.png')&&node.naturalWidth>0)};
        })()`)});
        return {partition:guest.getAttribute('partition'),...content};
      })()`)
      return observed?.authenticatedStatus === 200 && !observed.loginDialog && observed.shellVisible && observed
    } catch { return false }
  }, 'C14_BOSSFANG_AUTHENTICATED_DASHBOARD_UNAVAILABLE', 60000)
}

// An actual occupied socket, with no HTTP handler or fabricated service response.
export async function occupy(port) {
  const server = createServer(socket => socket.destroy())
  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(port, '127.0.0.1', resolve)
  })
  return () => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
}
