import fs from 'node:fs'
import path from 'node:path'
import net from 'node:net'
import { createHash, randomUUID } from 'node:crypto'
import { setTimeout as delay } from 'node:timers/promises'
import { openWork, setup } from '/Users/gqadonis/Projects/prometheus/worktrees/afc-c16-team-guidance/scripts/reusable-team-operation/scenario.mjs'
import { candidatePackage, requireCandidateConfiguration } from './corrected-candidate-contract-2.2.28-20261010.mjs'

const boss = '6de6477cdddb0886387dcb752913c43bf3ec3de2'
const sha = value => createHash('sha256').update(value).digest('hex')
const fact = (value, code) => { if (!value) throw Object.assign(new Error(code), { code }) }
const safeCode = error => /^[A-Za-z0-9_.:-]{1,160}$/.test(error?.code ?? '') ? error.code : 'CUSTOMER_GATEWAY_RECOVERY_OPERATION_FAILED'
async function ipc(evaluate, route, input) {
  const response = await evaluate('window.api.ipcApi.request(' + JSON.stringify(route) + ',' + JSON.stringify(input) + ')')
  fact(response?.ok, 'CUSTOMER_GATEWAY_TYPED_OPERATION_FAILED:' + route)
  return response.data
}
async function data(evaluate, method, resource, body) {
  const response = await evaluate('window.api.dataApi.request(' + JSON.stringify({ id: randomUUID(), method, path: resource,
    ...(body === undefined ? {} : { body }) }) + ')')
  fact(!response?.error, 'CUSTOMER_GATEWAY_DATA_OPERATION_FAILED')
  return response.data
}
async function wait(signal, read, code, timeout = 120000) {
  const until = Date.now() + timeout
  while (Date.now() < until) {
    signal.throwIfAborted(); const value = await read()
    if (value) return value
    await delay(200, undefined, { signal })
  }
  fact(false, code)
}
async function unusedEndpoint() {
  const server = net.createServer()
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve) })
  const port = server.address().port
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
  return 'http://127.0.0.1:' + port
}
const visibleNetworkLabels = () => {
  const directory = '/Users/gqadonis/Projects/prometheus/worktrees/afc-c16-team-guidance/src/renderer/i18n/locales'
  return fs.readdirSync(directory).filter(file => file.endsWith('.json')).map(file => {
    const content = JSON.parse(fs.readFileSync(path.join(directory, file), 'utf8'))
    return content['error.diagnosis.network']
  }).filter(label => typeof label === 'string' && label.length > 0)
}

export async function preparePublicOperation({ installation }) {
  candidatePackage(installation)
  fact(installation.source === boss, 'CUSTOMER_GATEWAY_FROZEN_BOSS_SOURCE_REQUIRED')
  return { configuration: { expectedBossSource: boss, isolatedProfile: true } }
}

export default async function run({ evaluate, signal }, configuration) {
  const evidence = { schemaVersion: 1, kind: 'ordinary-work-gateway-outage-settings-restoration',
    sourceRefs: configuration.sourceRefs, startedAt: new Date().toISOString(), complete: false, passed: false,
    checks: [], turns: [], status: 'failed', newCadenceDelivery: false, credentialValueRecorded: false,
    operationScope: 'Fresh no-tools turns in one disposable gateway-assigned Work session; no uncertain or prior effects replayed.' }
  const save = () => fs.writeFileSync(configuration.evidence, JSON.stringify(evidence, null, 2) + '\n', { mode: 0o600 })
  let stage = 'frozen-candidate-and-isolated-profile', originalServices, changed = false
  let sessionId, selectedModelId
  const messages = async () => (await data(evaluate, 'GET', '/agent-sessions/' + sessionId + '/messages')).items
  const restore = async () => {
    if (!changed) return
    const current = await ipc(evaluate, 'prometheus.integration.snapshot', {})
    await ipc(evaluate, 'prometheus.integration.configure', { updates: [{ feature: 'services',
      expectedRevision: current.revisions.services, value: originalServices }], secrets: {} })
    const restored = await ipc(evaluate, 'prometheus.integration.snapshot', {})
    fact(JSON.stringify(restored.config.services) === JSON.stringify(originalServices), 'CUSTOMER_GATEWAY_EXACT_SETTINGS_NOT_RESTORED')
    changed = false
    evidence.restoration = { route: 'prometheus.integration.configure', secretMutation: 'none',
      exactServicesSha256: sha(JSON.stringify(restored.config.services)), endpoint: restored.config.services.liter.endpoint }
    save()
  }
  async function turn(kind, expected, parentAnchorId) {
    const result = { kind, startedAt: new Date().toISOString(), status: 'pending' }
    evidence.turns.push(result); save()
    const topicId = 'agent-session:' + sessionId, key = '__gatewayRecovery_' + randomUUID().replaceAll('-', '')
    const before = new Set((await messages()).map(row => row.id))
    try {
      await evaluate('(()=>{const key=' + JSON.stringify(key) + ',topicId=' + JSON.stringify(topicId) + ';' +
        'const state=window[key]={done:false,error:false,textChunks:0,anchorMessageId:null,unsubscribers:[]};' +
        'for(const eventName of ["ai.stream.chunk","ai.stream.done","ai.stream.error"]){' +
        'const unsub=window.api.ipcApi.on(eventName,event=>{if(event.topicId!==topicId)return;' +
        'if(event.anchorMessageId)state.anchorMessageId=event.anchorMessageId;' +
        'if(eventName==="ai.stream.chunk"&&event.chunk?.type==="text-delta"&&event.chunk.delta)state.textChunks++;' +
        'if(event.isTopicDone&&eventName==="ai.stream.done")state.done=true;' +
        'if(event.isTopicDone&&eventName==="ai.stream.error")state.error=true;});' +
        'if(typeof unsub==="function")state.unsubscribers.push(unsub);}return true;})()')
      const opened = await ipc(evaluate, 'ai.stream.open', { trigger: 'submit-message', topicId,
        ...(parentAnchorId ? { parentAnchorId } : {}), mentionedModelIds: [selectedModelId],
        userMessageParts: [{ type: 'text', text: 'Reply with exactly ' + expected + '. Do not use tools or perform any effect.' }] })
      fact(opened.mode === 'started', 'CUSTOMER_GATEWAY_NEW_TURN_NOT_ADMITTED')
      result.stream = await wait(signal, () => evaluate('(()=>{const s=window[' + JSON.stringify(key) +
        '];return (s.done||s.error)&&{done:s.done,error:s.error,textChunks:s.textChunks,anchorMessageId:s.anchorMessageId};})()'),
      'CUSTOMER_GATEWAY_TURN_NOT_TERMINAL')
      const reply = await wait(signal, async () => (await messages()).find(row => row.role === 'assistant' &&
        !before.has(row.id) && (!result.stream.anchorMessageId || row.id === result.stream.anchorMessageId) && row.status !== 'pending'),
      'CUSTOMER_GATEWAY_TERMINAL_MESSAGE_NOT_PERSISTED')
      result.replyId = reply.id; result.persistedStatus = reply.status
      if (kind === 'unavailable-gateway') {
        const error = reply.data?.parts?.find(part => part.type === 'data-error')?.data
        const message = String(error?.message ?? '')
        const networkTextRecognized = /fetch failed|econnrefused|connection refused|failed to fetch/i.test(message)
        fact(result.stream.error && reply.status === 'error' && networkTextRecognized,
          'CUSTOMER_GATEWAY_NETWORK_FAILURE_NOT_CLASSIFIED')
        result.failure = { name: /^[A-Za-z][A-Za-z0-9_]{0,100}$/.test(error?.name ?? '') ? error.name : null,
          category: 'network', classifierContract: 'src/shared/utils/errorCategory.ts:network',
          originalMessageSha256: sha(message), rawErrorRecorded: false }
        const labels = visibleNetworkLabels()
        result.visibleFailure = await wait(signal, () => evaluate('(()=>{const node=[...document.querySelectorAll("[data-message-id]")].find(n=>' +
          'n.getClientRects().length&&n.getAttribute("data-message-id")===' + JSON.stringify(reply.id) + ');' +
          'return node&&' + JSON.stringify(labels) + '.some(label=>node.innerText.includes(label))&&{visible:true,messageId:node.getAttribute("data-message-id")};})()'),
        'CUSTOMER_GATEWAY_CLASSIFIED_FAILURE_NOT_VISIBLE')
      } else {
        const model = reply.messageSnapshot?.model
        fact(result.stream.done && !result.stream.error && result.stream.textChunks > 0 && reply.status === 'success' &&
          reply.searchableText?.trim() === expected && model?.id === configuration.gateway.alias && model?.provider === 'the-boss-gateway',
        'CUSTOMER_GATEWAY_RESTORED_FRESH_FOLLOWUP_FAILED')
        result.responseSha256 = sha(reply.searchableText)
        result.effectiveModel = { id: model.id, provider: model.provider }
      }
      result.status = 'passed'; result.finishedAt = new Date().toISOString(); save()
      return reply.id
    } finally {
      const state = await evaluate('(()=>{const s=window[' + JSON.stringify(key) + '];return s?{done:s.done,error:s.error}:null;})()').catch(() => null)
      if (state && !state.done && !state.error) {
        try { await ipc(evaluate, 'ai.stream.abort', { topicId }); result.unfinishedTurnAbortRequested = true }
        catch { result.unfinishedTurnAbortRequested = false }
      }
      await evaluate('(()=>{const s=window[' + JSON.stringify(key) + '];if(s){for(const u of s.unsubscribers)u();delete window[' + JSON.stringify(key) + '];}return true;})()').catch(() => { result.listenerCleanupPending = true })
      save()
    }
  }
  try {
    requireCandidateConfiguration(configuration)
    fact(configuration.sourceRefs.boss === boss && configuration.isolatedProfile === true, 'CUSTOMER_GATEWAY_FROZEN_DISPOSABLE_SCOPE_REQUIRED')
    const info = await ipc(evaluate, 'app.get_info', undefined)
    fact(info.isPackaged && info.version === '2.2.28' && /^cadence-boss-[A-Za-z0-9_-]+$/.test(path.basename(info.appDataPath)),
      'CUSTOMER_GATEWAY_DISPOSABLE_PACKAGED_PROFILE_REQUIRED')
    stage = 'ordinary-work-and-gateway-configuration'
    await openWork(evaluate, signal)
    const prepared = await setup(evaluate, configuration)
    const configured = await ipc(evaluate, 'prometheus.integration.snapshot', {})
    originalServices = configured.config.services
    fact(originalServices.liter.ownership === 'external' && originalServices.liter.endpoint === configuration.gateway.endpoint,
      'CUSTOMER_GATEWAY_ORIGINAL_BINDING_REQUIRED')
    const models = await data(evaluate, 'GET', '/models')
    const compatible = models.find(model => model.isEnabled && !model.id.startsWith('openai-codex::') && !model.id.startsWith('claude-code::')) ??
      models.find(model => !model.id.startsWith('openai-codex::') && !model.id.startsWith('claude-code::'))
    fact(compatible, 'CUSTOMER_GATEWAY_EXISTING_COMPATIBILITY_MODEL_REQUIRED')
    if (!compatible.isEnabled) await data(evaluate, 'PATCH', '/models/' + compatible.id, { isEnabled: true })
    selectedModelId = compatible.id
    const assignment = { source: 'gateway', modelId: configuration.gateway.alias }
    const agent = await ipc(evaluate, 'ai.agent.create', { type: 'uar', name: 'Disposable gateway recovery ' + randomUUID(),
      instructions: 'Reply only with the exact text requested. Never use tools, write, delegate or perform effects.',
      model: selectedModelId, mcps: [], configuration: { permission_mode: 'plan', uar_model_assignment: assignment } })
    fact(agent.type === 'uar' && agent.configuration?.uar_model_assignment?.source === 'gateway' &&
      agent.configuration?.uar_catalog_link?.authority !== 'catalog', 'CUSTOMER_GATEWAY_ENDPOINT_MUTATION_UNSUPPORTED_ASSIGNMENT')
    const created = await ipc(evaluate, 'ai.agent.session.reuse_or_create', { agentId: agent.id,
      workspace: { type: 'user', workspaceId: prepared.workspaceId } })
    sessionId = created.session.id
    await ipc(evaluate, 'navigation.open_route_in_main', { path: '/app/agents?sessionId=' + encodeURIComponent(sessionId) })
    evidence.fixture = { agentId: agent.id, sessionId, workspaceId: prepared.workspaceId, assignment, permissionMode: 'plan', mcps: [] }
    stage = 'unavailable-selected-gateway'
    const endpoint = await unusedEndpoint()
    // Mark restoration owed before the mutation: an interrupted response cannot silently discard it.
    changed = true
    await ipc(evaluate, 'prometheus.integration.configure', { updates: [{ feature: 'services',
      expectedRevision: configured.revisions.services, value: { ...originalServices, liter: { ...originalServices.liter, endpoint } } }], secrets: {} })
    const unavailable = await ipc(evaluate, 'prometheus.integration.snapshot', {})
    fact(unavailable.config.services.liter.endpoint === endpoint, 'CUSTOMER_GATEWAY_UNAVAILABLE_SETTING_NOT_APPLIED')
    evidence.outage = { endpoint, unusedPortProbe: 'owned-ephemeral-loopback-listener-closed-before-configure',
      originalServicesSha256: sha(JSON.stringify(originalServices)), secretMutation: 'none' }
    const failedAnchor = await turn('unavailable-gateway', 'UNREACHABLE_GATEWAY_MUST_NOT_REPLY')
    evidence.checks.push('ordinary-work-shows-persisted-classified-selected-gateway-outage')
    stage = 'restore-exact-saved-services'
    await restore()
    evidence.checks.push('normal-typed-settings-restore-exact-endpoint-and-provider-bindings-without-secret-mutation')
    stage = 'fresh-read-only-followup-after-restoration'
    await turn('restored-fresh-followup', 'RECOVERED_GATEWAY_' + randomUUID().slice(0, 8), failedAnchor)
    evidence.checks.push('restored-same-agent-session-streams-and-persists-fresh-no-tools-response')
    evidence.complete = true; evidence.passed = true; evidence.status = 'passed'
    evidence.observedBehavior = 'The packaged Work session displayed the actual classified gateway outage, restored its exact saved settings without changing secrets, and completed a fresh streamed response with its original gateway model.'
  } catch (error) { evidence.failureStage = stage; evidence.failureCode = safeCode(error) }
  finally {
    if (changed) {
      try { await restore() } catch (error) { evidence.restorationPending = true; evidence.restorationFailureCode = safeCode(error) }
    }
    if (evidence.restorationPending) { evidence.complete = false; evidence.passed = false; evidence.status = 'failed' }
    evidence.finishedAt = new Date().toISOString(); save()
  }
  return evidence
}
