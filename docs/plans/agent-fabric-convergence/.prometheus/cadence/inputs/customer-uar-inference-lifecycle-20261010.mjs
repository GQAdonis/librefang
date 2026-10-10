import fs from 'node:fs'
import { createHash, randomUUID } from 'node:crypto'
import { setTimeout as delay } from 'node:timers/promises'

const fact = (value, code) => { if (!value) throw Object.assign(new Error(code), { code }) }
const safe = error => /^[A-Za-z0-9_.:-]{1,160}$/.test(error?.code ?? '') ? error.code : 'CUSTOMER_UAR_LIFECYCLE_FAILED'
const sha = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex')

async function ipc(evaluate, route, input) {
  const value = await evaluate(`window.api.ipcApi.request(${JSON.stringify(route)},${JSON.stringify(input)})`)
  fact(value?.ok, `IPC_FAILED:${route}`)
  return value.data
}

async function messages(evaluate, sessionId) {
  const value = await evaluate(`window.api.dataApi.request(${JSON.stringify({ id: randomUUID(), method: 'GET',
    path: `/agent-sessions/${sessionId}/messages` })})`)
  fact(!value?.error && Array.isArray(value.data?.items), 'CUSTOMER_RETAINED_SESSION_MESSAGES_UNAVAILABLE')
  return value.data.items
}

async function wait(signal, read, code, timeout = 120_000) {
  const deadline = Date.now() + timeout
  while (Date.now() < deadline) {
    signal.throwIfAborted()
    const value = await read()
    if (value) return value
    await delay(100, undefined, { signal })
  }
  fact(false, code)
}

async function streamedTurn(context, { sessionId, parentAnchorId, modelId, prompt, expected, cancel }, result, save) {
  const { evaluate, signal } = context
  const key = `__customerLifecycle_${randomUUID().replaceAll('-', '')}`
  const topicId = `agent-session:${sessionId}`
  const before = new Set((await messages(evaluate, sessionId)).map(row => row.id))
  let finished = false
  try {
    await evaluate(`(()=>{
      const key=${JSON.stringify(key)},topicId=${JSON.stringify(topicId)};
      const state=window[key]={chunks:0,textChunks:0,textCharacters:0,done:false,error:false,failure:null,terminalStatus:null,anchorMessageId:null,unsubscribers:[]};
      for(const eventName of ['ai.stream.chunk','ai.stream.done','ai.stream.error']){
        const unsubscribe=window.api.ipcApi.on(eventName,event=>{
          if(event.topicId!==topicId)return;
          if(event.anchorMessageId)state.anchorMessageId=event.anchorMessageId;
          if(eventName==='ai.stream.chunk'){
            state.chunks++;
            if(event.chunk?.type==='text-delta'&&typeof event.chunk.delta==='string'&&event.chunk.delta.length){
              state.textChunks++;state.textCharacters+=event.chunk.delta.length;
            }
          }else if(event.isTopicDone){
            if(eventName==='ai.stream.done'){state.done=true;state.terminalStatus=event.status;}
            else {
              state.error=true;
              const error=event.error,native=error?.executionFailure?.failure;
              state.failure={
                name:/^[A-Za-z][A-Za-z0-9_]{0,100}$/.test(error?.name??'')?error.name:null,
                reasonCode:/^[A-Za-z0-9_.:-]{1,160}$/.test(native?.reasonCode??'')?native.reasonCode:null,
                statusCode:Number.isInteger(native?.context?.statusCode)&&native.context.statusCode>=100&&native.context.statusCode<=599?native.context.statusCode:null,
                sourceLayer:['provider','runtime','application','transport'].includes(native?.source?.layer)?native.source.layer:null,
                rawMessageRecorded:false
              };
            }
          }
        });
        if(typeof unsubscribe==='function')state.unsubscribers.push(unsubscribe);
      }
      return true;
    })()`)
    const opened = await ipc(evaluate, 'ai.stream.open', { trigger: 'submit-message', topicId,
      parentAnchorId, mentionedModelIds: [modelId], userMessageParts: [{ type: 'text', text: prompt }] })
    fact(opened.mode === 'started', 'CUSTOMER_FOLLOWUP_NOT_ADMITTED_AS_NEW_TURN')
    result.admitted = true; result.parentAnchorId = parentAnchorId; save()
    const observed = () => evaluate(`(()=>{const s=window[${JSON.stringify(key)}];return {
      chunks:s.chunks,textChunks:s.textChunks,textCharacters:s.textCharacters,done:s.done,error:s.error,
      terminalStatus:s.terminalStatus,anchorMessageId:s.anchorMessageId,failure:s.failure};})()`)
    if (cancel) {
      result.beforeCancel = await wait(signal, async () => {
        const state = await observed()
        if (state.error) { result.streamFailure = state.failure; save() }
        fact(!state.error, 'CUSTOMER_CANCEL_TURN_PROVIDER_ERROR')
        fact(!state.done, 'CUSTOMER_CANCEL_TURN_FINISHED_BEFORE_CANCEL')
        return state.textChunks > 0 && state
      }, 'CUSTOMER_UAR_SEMANTIC_STREAM_NOT_OBSERVED')
      result.cancelRequestedAt = new Date().toISOString(); save()
      await ipc(evaluate, 'ai.stream.abort', { topicId })
      result.cancelCommandAccepted = true
    }
    result.stream = await wait(signal, async () => {
      const state = await observed()
      if (state.error) { result.streamFailure = state.failure; save() }
      fact(!state.error, 'CUSTOMER_UAR_TURN_PROVIDER_ERROR')
      return state.done && state
    }, 'CUSTOMER_UAR_TURN_NOT_TERMINAL')
    const terminal = await wait(signal, async () => {
      const rows = await messages(evaluate, sessionId)
      const reply = rows.find(row => row.role === 'assistant' && !before.has(row.id) &&
        (!result.stream.anchorMessageId || row.id === result.stream.anchorMessageId))
      return reply && reply.status !== 'pending' && reply
    }, 'CUSTOMER_UAR_TERMINAL_MESSAGE_NOT_PERSISTED')
    const model = terminal.messageSnapshot?.model
    result.persisted = { id: terminal.id, status: terminal.status,
      textCharacters: terminal.searchableText?.length ?? 0,
      expectedReply: cancel ? null : terminal.searchableText?.trim() === expected,
      model: model ? { id: model.id, provider: model.provider } : null }
    if (cancel) {
      fact(result.stream.terminalStatus === 'paused' && terminal.status === 'paused' &&
        result.beforeCancel.textChunks > 0, 'CUSTOMER_UAR_CANCELLATION_NOT_PERSISTED')
      result.attach = await ipc(evaluate, 'ai.stream.attach', { topicId })
      // Do not serialize finalMessages: only the ordinary transport outcome is needed.
      result.attach = { status: result.attach.status }
      fact(result.attach.status === 'paused' || result.attach.status === 'not-found',
        'CUSTOMER_CANCELLED_TOPIC_STILL_LIVE')
    } else fact(result.stream.terminalStatus === 'success' && terminal.status === 'success' &&
      result.persisted.expectedReply && result.stream.textChunks > 0, 'CUSTOMER_UAR_FOLLOWUP_RESPONSE_FAILED')
    result.status = 'passed'; finished = true
    return terminal.id
  } finally {
    if (!finished) {
      try { await ipc(evaluate, 'ai.stream.abort', { topicId }); result.failedTurnAbortRequested = true }
      catch { result.failedTurnAbortRequested = false }
    }
    try { await evaluate(`(()=>{const s=window[${JSON.stringify(key)}];if(s){for(const u of s.unsubscribers)u();delete window[${JSON.stringify(key)}];}return true;})()`) }
    catch { result.listenerCleanupConfirmed = false }
    save()
  }
}

async function read(evaluate, resource) {
  const value = await evaluate(`window.api.dataApi.request(${JSON.stringify({ id: randomUUID(), method: 'GET', path: resource })})`)
  fact(!value?.error, 'CUSTOMER_UAR_RETAINED_READ_FAILED')
  return value.data
}

function failureFrom(reply) {
  const error = reply?.data?.parts?.find(part => part.type === 'data-error')?.data
  if (!error) return null
  const native = error.executionFailure?.failure
  return {
    name: /^[A-Za-z][A-Za-z0-9_]{0,100}$/.test(error.name ?? '') ? error.name : null,
    reasonCode: /^[A-Za-z0-9_.:-]{1,160}$/.test(native?.reasonCode ?? '') ? native.reasonCode : null,
    statusCode: Number.isInteger(native?.context?.statusCode) ? native.context.statusCode : null,
    sourceLayer: ['provider', 'runtime', 'application', 'transport'].includes(native?.source?.layer) ? native.source.layer : null,
    messageSha256: createHash('sha256').update(String(error.message ?? '')).digest('hex'),
    rawMessageRecorded: false
  }
}

export default async function scenario(context, configuration) {
  const evidence = { schemaVersion: 1, kind: 'ordinary-uar-retained-followup-cancellation',
    startedAt: new Date().toISOString(), sourceRefs: configuration.sourceRefs,
    status: 'pending', complete: false, passed: false, checks: [], results: [],
    exercisedThrough: 'ordinary-work-typed-stream-commands',
    repeatedFreshInferenceBaseline: false, repeatedNativeCodexClaude: false,
    providerConfigurationMutated: false, credentialValueRecorded: false }
  const save = () => fs.writeFileSync(configuration.evidence, JSON.stringify(evidence, null, 2) + '\n', { mode: 0o600 })
  let stage = 'prerequisites'
  let result
  try {
    fact(configuration.isolatedProfile === true, 'CUSTOMER_ISOLATED_PROFILE_REQUIRED')
    fact(configuration.sourceRefs?.installedVersion === '2.2.27', 'CUSTOMER_UAR_CURRENT_CANDIDATE_REQUIRED')
    const info = await ipc(context.evaluate, 'app.get_info', undefined)
    fact(info.isPackaged && info.version === configuration.sourceRefs.installedVersion,
      'CUSTOMER_UAR_PACKAGED_VERSION_MISMATCH')
    const previous = JSON.parse(fs.readFileSync(configuration.priorInferenceEvidence, 'utf8'))
    const prior = previous.results?.find(item => item.route === 'uar')
    fact(prior?.status === 'passed' && prior.committedRuntime === 'uar' && prior.persisted?.exactReply &&
      prior.persisted?.exactModel && prior.sessionId && prior.agentId && prior.marker && prior.selectedModelId &&
      prior.assignment?.source === 'gateway', 'CUSTOMER_UAR_PASSING_BASELINE_REQUIRED')
    evidence.baseline = { evidenceSha256: sha(configuration.priorInferenceEvidence), sourceRefs: previous.sourceRefs,
      applicabilityReceiptSha256: sha(configuration.applicabilityReceipt), repeated: false }
    stage = 'retained-agent-model-and-gateway'
    const agent = await read(context.evaluate, `/agents/${prior.agentId}`)
    fact(agent.type === 'uar' && agent.model === prior.selectedModelId &&
      agent.configuration?.uar_model_assignment?.source === prior.assignment.source &&
      agent.configuration?.uar_model_assignment?.modelId === prior.assignment.modelId,
      'CUSTOMER_UAR_RETAINED_AGENT_ASSIGNMENT_CHANGED')
    const configured = await ipc(context.evaluate, 'prometheus.integration.snapshot', {})
    fact(configured.config.services.liter.ownership === 'external' &&
      configured.config.services.liter.endpoint === configuration.expectedGatewayEndpoint,
      'CUSTOMER_UAR_RETAINED_GATEWAY_BINDING_CHANGED')
    const snapshot = await ipc(context.evaluate, 'prometheus.uar.admin.snapshot', {})
    fact(snapshot.uarVersion && snapshot.generation, 'CUSTOMER_UAR_RUNTIME_NOT_OPERATIONAL')
    const sources = await ipc(context.evaluate, 'prometheus.uar.models.sources', {})
    const gateway = sources.sources.find(item => item.source === 'gateway')
    fact(gateway?.operational && gateway.providers.flatMap(provider => provider.models)
      .some(model => model.enabled && model.id === prior.assignment.modelId), 'CUSTOMER_UAR_RETAINED_ALIAS_UNAVAILABLE')
    result = { route: 'uar', status: 'pending', sessionId: prior.sessionId, agentId: prior.agentId,
      selectedModelId: prior.selectedModelId, assignment: prior.assignment, expectedModel: prior.expectedModel,
      runtimeGeneration: snapshot.generation, turns: [] }
    evidence.results.push(result); save()
    stage = 'retained-history-anchor'
    const baseline = (await messages(context.evaluate, prior.sessionId)).find(row => row.role === 'assistant' &&
      row.status === 'success' && row.searchableText?.trim() === prior.marker)
    fact(baseline?.id, 'CUSTOMER_UAR_SAME_DISPOSABLE_PROFILE_REQUIRED')
    let anchor = baseline.id
    for (const step of [
      { name: 'retained-history-followup', prompt: 'Repeat the exact marker from my previous message followed immediately by +FOLLOWUP. Output only that combined text.', expected: prior.marker + '+FOLLOWUP' },
      { name: 'semantic-stream-cancellation', prompt: 'Output the numbers 1 through 10000, one complete line per number. Do not summarize, use tools or change files.', cancel: true },
      { name: 'post-cancellation-followup', prompt: 'Reply with exactly RECOVERED_UAR.', expected: 'RECOVERED_UAR' }
    ]) {
      stage = step.name
      const turn = { kind: step.name, status: 'pending', startedAt: new Date().toISOString() }
      result.turns.push(turn); save()
      anchor = await streamedTurn(context, { ...step, sessionId: prior.sessionId, parentAnchorId: anchor,
        modelId: prior.selectedModelId }, turn, save)
      fact(turn.persisted.model?.id === prior.expectedModel.id && turn.persisted.model?.provider === prior.expectedModel.provider,
        'CUSTOMER_UAR_LIFECYCLE_EFFECTIVE_MODEL_CHANGED')
      turn.finishedAt = new Date().toISOString(); save()
    }
    result.status = 'passed'; evidence.complete = true; evidence.passed = true
    evidence.checks.push('ordinary-uar-retained-history-semantic-stream-cancel-and-followup')
    evidence.observedBehavior = 'The retained ordinary UAR Work session completed follow-up, streamed semantic text before explicit cancellation, persisted paused state, and accepted a later turn with the same configured gateway model.'
  } catch (error) {
    evidence.failureStage = stage; evidence.failureCode = safe(error)
    if (result) {
      result.status = 'failed'
      try { result.persistedFailure = failureFrom((await messages(context.evaluate, result.sessionId)).filter(row => row.role === 'assistant').at(-1)) }
      catch { result.failureCaptureUnavailable = true }
    }
  } finally { evidence.status = evidence.passed ? 'passed' : 'failed'; evidence.finishedAt = new Date().toISOString(); save() }
  return evidence
}

