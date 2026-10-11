import fs from 'node:fs'
import { createHash, randomUUID } from 'node:crypto'
import { setTimeout as delay } from 'node:timers/promises'

const fact = (value, code) => { if (!value) throw Object.assign(new Error(code), { code }) }
const safe = error => /^[A-Za-z0-9_.:-]{1,160}$/.test(error?.code ?? '') ? error.code : 'CUSTOMER_NATIVE_LIFECYCLE_FAILED'
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
      const state=window[key]={chunks:0,textChunks:0,textCharacters:0,done:false,error:false,terminalStatus:null,anchorMessageId:null,unsubscribers:[]};
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
            else state.error=true;
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
      terminalStatus:s.terminalStatus,anchorMessageId:s.anchorMessageId};})()`)
    if (cancel) {
      result.beforeCancel = await wait(signal, async () => {
        const state = await observed()
        fact(!state.error, 'CUSTOMER_CANCEL_TURN_PROVIDER_ERROR')
        fact(!state.done, 'CUSTOMER_CANCEL_TURN_FINISHED_BEFORE_CANCEL')
        return state.textChunks > 0 && state
      }, 'CUSTOMER_NATIVE_SEMANTIC_STREAM_NOT_OBSERVED')
      result.cancelRequestedAt = new Date().toISOString(); save()
      await ipc(evaluate, 'ai.stream.abort', { topicId })
      result.cancelCommandAccepted = true
    }
    result.stream = await wait(signal, async () => {
      const state = await observed()
      fact(!state.error, 'CUSTOMER_NATIVE_TURN_PROVIDER_ERROR')
      return state.done && state
    }, 'CUSTOMER_NATIVE_TURN_NOT_TERMINAL')
    const terminal = await wait(signal, async () => {
      const rows = await messages(evaluate, sessionId)
      const reply = rows.find(row => row.role === 'assistant' && !before.has(row.id) &&
        (!result.stream.anchorMessageId || row.id === result.stream.anchorMessageId))
      return reply && reply.status !== 'pending' && reply
    }, 'CUSTOMER_NATIVE_TERMINAL_MESSAGE_NOT_PERSISTED')
    const model = terminal.messageSnapshot?.model
    result.persisted = { id: terminal.id, status: terminal.status,
      textCharacters: terminal.searchableText?.length ?? 0,
      expectedReply: cancel ? null : terminal.searchableText?.trim() === expected,
      model: model ? { id: model.id, provider: model.provider } : null }
    if (cancel) {
      fact(result.stream.terminalStatus === 'paused' && terminal.status === 'paused' &&
        result.beforeCancel.textChunks > 0, 'CUSTOMER_NATIVE_CANCELLATION_NOT_PERSISTED')
      result.attach = await ipc(evaluate, 'ai.stream.attach', { topicId })
      // Do not serialize finalMessages: only the ordinary transport outcome is needed.
      result.attach = { status: result.attach.status }
      fact(result.attach.status === 'paused' || result.attach.status === 'not-found',
        'CUSTOMER_CANCELLED_TOPIC_STILL_LIVE')
    } else fact(result.stream.terminalStatus === 'success' && terminal.status === 'success' &&
      result.persisted.expectedReply && result.stream.textChunks > 0, 'CUSTOMER_NATIVE_FOLLOWUP_RESPONSE_FAILED')
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

export default async function scenario(context, configuration) {
  const evidence = { schemaVersion: 1, kind: 'customer-native-inference-followup-cancellation',
    startedAt: new Date().toISOString(), sourceRefs: configuration.sourceRefs, complete: false, passed: false,
    checks: [], results: [], credentialValueRecorded: false, nativeSubscriptionsSubstituted: false,
    repeatedFreshInferenceBaseline: false, exercisedThrough: 'ordinary-work-typed-stream-commands' }
  const save = () => fs.writeFileSync(configuration.evidence, JSON.stringify(evidence, null, 2) + '\n', { mode: 0o600 })
  let stage = 'prerequisites'
  try {
    fact(configuration.isolatedProfile === true, 'CUSTOMER_ISOLATED_PROFILE_REQUIRED')
    const routes = configuration.routes ?? ['codex', 'claude']
    fact(routes.length > 0 && new Set(routes).size === routes.length &&
      routes.every(route => ['codex', 'claude'].includes(route)), 'CUSTOMER_EXPLICIT_NATIVE_LIFECYCLE_SCOPE_REQUIRED')
    for (const route of routes) {
      context.signal.throwIfAborted()
      stage = `${route}-retained-baseline`
      const file = configuration.priorInferenceEvidence?.[route]
      fact(typeof file === 'string' && file.length > 0, 'CUSTOMER_NATIVE_BASELINE_EVIDENCE_REQUIRED')
      const previous = JSON.parse(fs.readFileSync(file, 'utf8'))
      const prior = previous.results?.find(item => item.route === route)
      fact(prior?.status === 'passed' && prior.persisted?.exactReply && prior.persisted?.exactModel && prior.sessionId &&
        prior.selectedModelId && prior.marker, 'CUSTOMER_NATIVE_PASSING_BASELINE_REQUIRED')
      fact(['boss', 'uar', 'appAsarSha256', 'sidecarSha256'].every(key =>
        previous.sourceRefs?.[key] === configuration.sourceRefs?.[key]), 'CUSTOMER_NATIVE_BASELINE_SOURCE_CHANGED')
      const result = { route, status: 'pending', sessionId: prior.sessionId,
        baselineEvidenceSha256: sha(file), baselineSourceRefs: previous.sourceRefs,
        selectedModelId: prior.selectedModelId, turns: [] }
      evidence.results.push(result); save()
      const provider = route === 'codex' ? 'openai-codex' : 'claude-code'
      const probe = route === 'codex' ? 'oauth.has_token' : 'oauth.check_external_login'
      fact(await ipc(context.evaluate, probe, { providerId: provider }), 'CUSTOMER_NATIVE_AUTHENTICATION_REQUIRED')
      const baseline = (await messages(context.evaluate, prior.sessionId)).find(row => row.role === 'assistant' &&
        row.status === 'success' && row.searchableText?.trim() === prior.marker)
      fact(baseline?.id, 'CUSTOMER_SAME_ISOLATED_PROFILE_RETAINED_SESSION_REQUIRED')
      let anchor = baseline.id
      const steps = [
        { name: 'retained-history-followup', prompt: 'Repeat the exact marker from my previous message followed immediately by +FOLLOWUP. Output only that combined text.',
          expected: prior.marker + '+FOLLOWUP' },
        { name: 'semantic-stream-cancellation', prompt: 'Output the numbers 1 through 10000, one complete line per number. Do not summarize, use tools or change files.', cancel: true },
        { name: 'post-cancellation-followup', prompt: `Reply with exactly RECOVERED_${route.toUpperCase()}.`,
          expected: `RECOVERED_${route.toUpperCase()}` }
      ]
      for (const step of steps) {
        stage = `${route}-${step.name}`
        const turn = { kind: step.name, status: 'pending', startedAt: new Date().toISOString() }
        result.turns.push(turn); save()
        anchor = await streamedTurn(context, { ...step, sessionId: prior.sessionId, parentAnchorId: anchor,
          modelId: prior.selectedModelId }, turn, save)
        fact(turn.persisted.model?.id === prior.expectedModel.id && turn.persisted.model?.provider === prior.expectedModel.provider,
          'CUSTOMER_NATIVE_LIFECYCLE_EFFECTIVE_MODEL_CHANGED')
        turn.finishedAt = new Date().toISOString(); save()
      }
      result.status = 'passed'
      evidence.checks.push(`${route}-retained-history-semantic-stream-cancel-and-followup`)
      save()
    }
    evidence.complete = true; evidence.passed = true
    evidence.observedBehavior = 'The selected native subscription routes completed retained-history follow-up, streamed actual semantic output before explicit cancellation, persisted paused state, and accepted a later ordinary turn using the same model.'
  } catch (error) { evidence.failureStage = stage; evidence.failureCode = safe(error) }
  finally { evidence.status = evidence.passed ? 'passed' : 'failed'; evidence.finishedAt = new Date().toISOString(); save() }
  return evidence
}
