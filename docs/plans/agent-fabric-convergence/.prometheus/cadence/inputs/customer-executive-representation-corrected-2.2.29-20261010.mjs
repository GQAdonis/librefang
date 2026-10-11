import { createHash, randomUUID } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import readline from 'node:readline'
import { openWork, setup } from '/Users/gqadonis/Projects/prometheus/worktrees/afc-c16-team-guidance/scripts/reusable-team-operation/scenario.mjs'
import { candidatePackage, requireCandidateConfiguration } from './corrected-candidate-contract-2.2.29-20261010.mjs'

const digest = value => createHash('sha256').update(value).digest('hex')
const delay = (ms, signal) => new Promise((resolve, reject) => {
  signal.throwIfAborted()
  const abort = () => { clearTimeout(timer); reject(signal.reason) }
  const timer = setTimeout(() => { signal.removeEventListener('abort', abort); resolve() }, ms)
  signal.addEventListener('abort', abort, { once: true })
})
const requireFact = (value, code) => { if (!value) throw new Error(code) }
const outcomeCodes = new Set([
  'actor_root_request_scope_mismatch', 'actor_root_artifact_scope_failed', 'actor_root_catalog_binding_failed',
  'actor_root_instance_epoch_failed', 'actor_root_previous_recovery_failed', 'actor_root_identity_failed',
  'actor_root_registration_failed', 'actor_root_terminal_epoch_failed', 'actor_root_terminal_persistence_failed',
  'actor_host_failed', 'actor_kernel_failed', 'actor_root_mismatch', 'run_owner_mismatch',
  'mcp_catalog_unavailable', 'mcp_capture_mismatch', 'child_bindings_unavailable', 'sandbox_binding_unavailable',
  'mcp_server_not_run_scoped', 'mcp_preflight_failed', 'approval_channel_unavailable', 'world_state_load_failed', 'world_state_budget_exceeded',
  'tool_admission_context_failed', 'provider_model_unavailable', 'thread_attachment_failed',
  'turn_assembly_rejected', 'root_resource_binding_conflict', 'kernel_completion_closed', 'kernel_panicked',
  'thread_cleanup_unconfirmed', 'session_persistence_unconfirmed', 'representation_cedar_required',
  'representation_history_scope_unsupported', 'representation_instance_scope_denied', 'representation_admission_denied'
])

export async function preparePublicOperation({ installation }) {
  candidatePackage(installation)
  return { configuration: { expectedBossSource: installation.source } }
}

/** Root owns the sole installed-package session. This driver never starts another runtime or supplies human approval. */
export default async function run({ evaluate, signal, onObservation }, configuration) {
  const stateFile = configuration.resumeState ?? path.join(path.dirname(configuration.evidence), 'representation-state.json')
  const state = configuration.resumeState ? JSON.parse(fs.readFileSync(stateFile, 'utf8')) : {
    schemaVersion: 1, sourceRefs: configuration.sourceRefs, checks: [], startedAt: new Date().toISOString()
  }
  const approvalReceiptPath = configuration.approvalReceiptPath ?? path.join(path.dirname(configuration.evidence), 'representation-human-approval.json')
  const result = { schemaVersion: 1, kind: 'corrected-customer-executive-representation', complete: false,
    status: 'failed', sourceRefs: state.sourceRefs, startedAt: state.startedAt, checks: state.checks,
    historicalCandidate: '2.2.25 grant/turn gap; no qualification retained', newCadenceDelivery: false }
  let stage = 'corrected-candidate-provenance', paused = false
  const persist = () => fs.writeFileSync(stateFile, JSON.stringify(state, null, 2) + '\n', { mode: 0o600 })
  async function ipc(route, input, cleanup = false) {
    if (!cleanup) signal.throwIfAborted()
    const response = await evaluate(`window.api.ipcApi.request(${JSON.stringify(route)},${JSON.stringify(input)})`)
    if (!response?.ok) {
      const message = String(response?.error?.message ?? '')
      const http = message.match(/failed with HTTP (\d{3})(?: \(([A-Za-z0-9_.:-]+)\))?/)
      let validationIssues
      try {
        const issues = JSON.parse(message)
        if (Array.isArray(issues)) validationIssues = issues.map(({ code, path }) => ({ code, path }))
      } catch {}
      let redactedMessage = message
      for (const [name, value] of Object.entries(process.env))
        if (/TOKEN|SECRET|PASSWORD|KEY/i.test(name) && value?.length >= 6)
          redactedMessage = redactedMessage.split(value).join('[credential]')
      result.failedApplicationRequest ??= {
        route, code: response?.error?.code,
        category: http ? 'native-http' : validationIssues ? 'response-projection' : 'host-adapter',
        httpStatus: http ? Number(http[1]) : undefined, nativeCode: http?.[2], validationIssues,
        redactedMessage: redactedMessage.replace(/https?:\/\/[^\s"']+/g, '[endpoint]')
          .replace(/Bearer\s+\S+/gi, 'Bearer [credential]').slice(0, 500)
      }
      throw new Error(response?.error?.code ?? 'C17_TYPED_OPERATION_FAILED')
    }
    return response.data
  }
  const selector = () => ({ workspaceId: state.workspaceId, instanceId: state.instanceId })
  function stopOnUncertain(instance, command, page) {
    if (command?.status !== 'uncertain') return
    const outcome = command.outcome
    const diagnostic = outcomeCodes.has(outcome?.errorCode) && ['actor_host', 'run_kernel'].includes(outcome?.sourceStage)
      ? { sourceStage: outcome.sourceStage, errorCode: outcome.errorCode } : null
    const eventCodes = [...new Set((page?.events?.events ?? []).filter(event => event.eventName === 'agui.error' &&
      event.data?.request_id === command.rootRunId && outcomeCodes.has(event.data?.code)).map(event => event.data.code))]
    state.uncertainCommand = { commandId: command.commandId, attemptId: command.attemptId ?? null,
      runId: command.rootRunId ?? null, status: command.status, observedAt: new Date().toISOString(),
      lastErrorCode: instance.lastErrorCode === 'turn_outcome_uncertain' ? instance.lastErrorCode : null,
      diagnostic, diagnosticAvailable: diagnostic !== null, eventCodes }
    result.status = 'pending-reconciliation'; result.uncertainCommand = state.uncertainCommand
    result.resumeState = stateFile; result.sameTurn = { commandId: command.commandId, runId: command.rootRunId ?? null }
    result.replayAuthorized = false
    persist()
    throw new Error('C17_NATIVE_TURN_UNCERTAIN_RECONCILIATION_REQUIRED')
  }
  async function captureUncertainDiagnostic() {
    const command = state.uncertainCommand
    if (!command) return
    try {
      const info = await ipc('app.get_info', undefined, true)
      requireFact(info.isPackaged && info.version === state.sourceRefs.installedVersion &&
        path.basename(info.appDataPath).startsWith('cadence-boss-'), 'C17_ISOLATED_LOG_SOURCE_REQUIRED')
      const files = fs.readdirSync(info.logsPath).filter(name => /^app-error\.\d{4}-\d{2}-\d{2}\.log(?:\.\d+)?$/.test(name)).sort().slice(-2)
      for (const file of files) {
        const input = fs.createReadStream(path.join(info.logsPath, file), { encoding: 'utf8' })
        const lines = readline.createInterface({ input, crlfDelay: Infinity })
        try {
          for await (const line of lines) {
            if (!line.includes('UAR_INSTANCE_TURN_DIAGNOSTIC') || !line.includes(command.commandId) || !line.includes(command.attemptId)) continue
            let entry
            try { entry = JSON.parse(line) } catch { continue }
            if (entry.process !== 'main' || entry.module !== 'UarSidecarService' || entry.message !== 'UAR_INSTANCE_TURN_DIAGNOSTIC' ||
              entry.command_id !== command.commandId || entry.attempt_id !== command.attemptId ||
              !['actor_host', 'run_kernel'].includes(entry.source_stage) || !outcomeCodes.has(entry.error_code)) continue
            command.diagnostic = { sourceStage: entry.source_stage, errorCode: entry.error_code }
            command.diagnosticAvailable = true
            command.privateLogSource = { route: 'app.get_info', file }
            return
          }
        } finally { lines.close(); input.destroy() }
      }
    } catch { command.diagnosticReadCode = 'C17_PRIVATE_DIAGNOSTIC_UNAVAILABLE' }
  }
  function recordHumanReceipt(pending) {
    const human = JSON.parse(fs.readFileSync(approvalReceiptPath, 'utf8'))
    requireFact(human.kind === 'operator-exact-native-approval' && human.approved === true &&
      human.workspaceId === state.workspaceId && human.instanceId === state.instanceId &&
      human.commandId === state.command.commandId && human.runId === state.runId &&
      human.approvalId === pending.approvalId && human.issuerId === pending.issuerId &&
      human.challengeId === pending.challengeId && human.toolName === 'file_read' &&
      human.argumentsSha256 === state.pendingApproval.argumentsSha256 && human.fileSha256 === state.fileSha256 &&
      human.exactFile === state.file && typeof human.operatorResponseRef === 'string' && human.operatorResponseRef.length > 0,
    'C17_OPERATOR_RECEIPT_SCOPE_MISMATCH')
    state.operatorApprovalReceipt = { path: approvalReceiptPath, sha256: digest(fs.readFileSync(approvalReceiptPath)), ...human }
  }
  async function readInstance() {
    const snapshot = await ipc('prometheus.uar.durable.read', { workspaceId: state.workspaceId })
    const instance = snapshot.instances.find(row => row.instanceId === state.instanceId)
    requireFact(instance, 'C17_INSTANCE_NOT_REOPENED'); return instance
  }
  async function submit(prompt, commandId = randomUUID()) {
    return ipc('prometheus.uar.durable.submit_turn', { ...selector(), commandId, prompt })
  }
  async function waitCommand(commandId, limit = 90000) {
    const until = Date.now() + limit
    while (Date.now() < until) {
      const instance = await readInstance()
      const command = instance.commands.find(row => row.commandId === commandId)
      stopOnUncertain(instance, command)
      if (command && (command.rootRunId || ['failed', 'cancelled'].includes(command.status))) return command
      await delay(500, signal)
    }
    throw new Error('C17_COMMAND_PROGRESS_NOT_OBSERVED')
  }
  async function saveRevision(changes) {
    const { issuerPrincipalId: _issuer, constraintDigest: _digest, ...grant } = state.grant
    const saved = await ipc('prometheus.uar.representation.save', { workspaceId: state.workspaceId,
      commandId: randomUUID(), expectedRevision: grant.revision,
      grant: { ...grant, ...changes, revision: grant.revision + 1 } })
    state.grant = saved.grant; persist(); return saved
  }
  async function deniedTurn(name) {
    const command = await submit(`Use file_read to read ${JSON.stringify(state.file)} and quote its contents. Do not use another tool.`)
    let current = await waitCommand(command.commandId)
    const until = Date.now() + 30000
    while (!['failed', 'cancelled', 'completed'].includes(current.status) && Date.now() < until) {
      await delay(500, signal)
      const instance = await readInstance()
      current = instance.commands.find(row => row.commandId === command.commandId)
      stopOnUncertain(instance, current)
    }
    requireFact(current?.status === 'failed', `C17_${name}_REFUSAL_NOT_OBSERVED`)
    if (current.rootRunId) {
      const run = await ipc('prometheus.uar.durable.run', { ...selector(), runId: current.rootRunId, after: 0 })
      requireFact(!run.effects.some(effect => effect.state === 'succeeded'), `C17_${name}_EFFECT_NOT_DENIED`)
    }
    state.checks.push({ name, passed: true, commandId: command.commandId, runId: current.rootRunId ?? null,
      commandStatus: current.status, interpretation: 'Actual represented turn refused; no successful native effect observed.' })
    persist()
  }
  try {
    requireCandidateConfiguration(configuration)
    requireFact(JSON.stringify(state.sourceRefs) === JSON.stringify(configuration.sourceRefs), 'C17_RESUME_SOURCE_CHANGED')
    if (!configuration.resumeState) {
      stage = 'configure-isolated-gateway-and-native-model'
      await openWork(evaluate, signal)
      const prepared = await setup(evaluate, configuration)
      await ipc('prometheus.uar.teams.setup_starter', { workspaceId: prepared.workspaceId, model: prepared.model })
      state.workspaceId = prepared.workspaceId
      state.checks.push({ name: 'isolated-gateway-and-native-model-prepared-through-typed-settings', passed: true,
        workspaceId: state.workspaceId, model: prepared.model, credentialReference: configuration.gateway.credentialEnv,
        interpretation: 'Configuration and native provider preparation only; inference operation remains required.' })
      persist()
      const sources = await ipc('prometheus.uar.models.sources', {})
      const native = sources.sources.find(source => source.source === 'uar')
      const gatewayUrl = new URL(configuration.gateway.endpoint)
      const gatewayPath = gatewayUrl.pathname.replace(/\/$/, '')
      gatewayUrl.pathname = gatewayPath.endsWith('/v1') ? gatewayPath : gatewayPath + '/v1'
      const gatewayBaseUrl = gatewayUrl.href.replace(/\/$/, '')
      const choices = native?.providers.filter(provider => provider.enabled && provider.credentialConfigured &&
        provider.baseUrl === gatewayBaseUrl).flatMap(provider => provider.models.filter(model => model.enabled &&
          model.id === prepared.model.modelId && model.pricingIdentity?.providerId === configuration.gateway.providerId &&
          model.pricingIdentity?.modelId === configuration.gateway.modelId).map(model =>
          ({ source: 'uar', providerId: provider.id, modelId: model.id }))) ?? []
      const selected = choices.find(model => !process.env.BOSS_CUSTOMER_UAR_MODEL ||
        `${model.providerId}::${model.modelId}` === process.env.BOSS_CUSTOMER_UAR_MODEL)
      requireFact(native?.operational && selected, 'C17_CONFIGURED_NATIVE_UAR_MODEL_REQUIRED')
      stage = 'apply-observed-codex-route-context-capacity'
      requireFact(configuration.gateway.modelId === 'gpt-6.1-sol', 'C17_OBSERVED_CODEX_MODEL_REQUIRED')
      const provider = native.providers.find(row => row.id === selected.providerId)
      const modelInputs = provider.models.map(model => ({
        id: model.id, displayName: model.name, enabled: model.enabled,
        ...(model.contextWindow ? { contextWindow: model.contextWindow } : {}),
        ...(model.maxOutputTokens ? { maxOutputTokens: model.maxOutputTokens } : {}),
        supportsVision: model.supportsVision, supportsTools: model.supportsTools,
        supportsReasoning: model.supportsReasoning, supportsStructuredOutput: model.supportsStructuredOutput,
        supportsStreaming: model.supportsStreaming,
        ...(model.pricingIdentity ? { pricingIdentity: model.pricingIdentity } : {}),
        ...(model.executionProfile ? { executionProfile: model.executionProfile } : {}),
        ...(model.id === selected.modelId ? { contextWindow: 272000 } : {})
      }))
      const updatedSources = await ipc('prometheus.uar.providers.save', { mode: 'update',
        id: provider.id, displayName: provider.name, baseUrl: provider.baseUrl, protocol: provider.protocol,
        ...(provider.defaultModel ? { defaultModel: provider.defaultModel } : {}),
        enabled: provider.enabled, models: modelInputs, credential: { operation: 'unchanged' } })
      const appliedProvider = updatedSources.sources.find(row => row.source === 'uar')?.providers.find(row => row.id === selected.providerId)
      const appliedModel = appliedProvider?.models.find(row => row.id === selected.modelId)
      const priorModel = provider.models.find(row => row.id === selected.modelId)
      requireFact(appliedProvider?.credentialConfigured && appliedModel?.contextWindow === 272000 &&
        JSON.stringify(appliedModel.pricingIdentity) === JSON.stringify(priorModel.pricingIdentity) &&
        JSON.stringify(appliedModel.executionProfile) === JSON.stringify(priorModel.executionProfile),
      'C17_SELECTED_MODEL_CONTEXT_OR_BINDING_NOT_PRESERVED')
      state.contextCapacity = { providerId: selected.providerId, modelId: selected.modelId,
        contextWindow: appliedModel.contextWindow, priorContextWindow: priorModel.contextWindow ?? null,
        route: 'prometheus.uar.providers.save', nativeField: 'ModelConfig.context_window',
        authority: 'Observed route metadata; isolated selected model only. Generic budgets and grant scopes unchanged.',
        source: { kind: 'local-codex-model-cache', clientVersion: '0.162.0',
          fetchedAt: '2026-10-10T02:09:17.941282Z', model: 'gpt-6.1-sol', contextWindow: 272000,
          sha256: 'e4a459b1d0b550d89a41a26863f33265116f5fd971e90a63355e241fd449a1a5' } }
      state.checks.push({ name: 'selected-native-model-observed-context-capacity-applied', passed: true,
        ...state.contextCapacity, credentialMutation: 'unchanged' })
      state.selectedModel = selected
      state.directory = configuration.workspaceDirectory
      state.file = path.join(state.directory, 'representation-synthetic.txt')
      state.content = `Synthetic advisory record only.\nMarker: ${randomUUID()}\nNo real person, authority, spending or organizational data.\n`
      fs.writeFileSync(state.file, state.content, { flag: 'wx', mode: 0o600 }); state.fileSha256 = digest(state.content)
      stage = 'native-tool-settings-and-owned-restart'
      const settings = await ipc('prometheus.uar.settings.read', { namespace: 'native-tools' })
      const fields = ['file_tools_enabled', 'file_allowed_paths']
      state.priorNativeSettings = fields.map(field => {
        const setting = settings.settings.find(row => row.field === field)
        requireFact(setting, 'C17_NATIVE_SETTING_NOT_AVAILABLE')
        return { field, value: setting.saved }
      })
      const updated = await ipc('prometheus.uar.settings.update', { namespace: 'native-tools',
        changes: fields.map(field => ({ field, value: field === 'file_tools_enabled' ? true : [state.directory],
          expectedRevision: settings.settings.find(row => row.field === field).revision })) })
      requireFact(!updated.errors?.length, 'C17_NATIVE_SETTINGS_NOT_SAVED'); persist()
      const restart = await ipc('prometheus.integration.start', { action: 'uar-restart' })
      const until = Date.now() + 90000
      let running
      while (Date.now() < until) {
        await delay(1000, signal)
        const snapshot = await ipc('prometheus.integration.snapshot', {})
        running = snapshot.operations?.find(row => row.id === restart.id)
        if (running && !['queued', 'running'].includes(running.status)) break
      }
      requireFact(running?.status === 'succeeded', 'C17_NATIVE_SETTINGS_RESTART_INCOMPLETE')
      const effective = await ipc('prometheus.uar.settings.read', { namespace: 'native-tools' })
      requireFact(effective.settings.find(row => row.field === 'file_tools_enabled')?.effective === true &&
        JSON.stringify(effective.settings.find(row => row.field === 'file_allowed_paths')?.effective) === JSON.stringify([state.directory]),
      'C17_NATIVE_SETTINGS_NOT_APPLIED')
      stage = 'synthetic-role-and-applied-scoped-grant'
      const authoring = { workspaceId: state.workspaceId, office: 'cio', title: 'Synthetic qualification CIO',
        purpose: 'Synthetic read-only advisory qualification; no real-person or organization authority.',
        instructions: 'Read only the exact synthetic file requested. Disclose AI assistance. Never claim human authorship or approval; never write, send, spend or delegate.' }
      const preview = await ipc('prometheus.uar.representation.preview_role', authoring)
      const binding = await ipc('prometheus.uar.representation.install_role', { ...authoring, reviewedDigest: preview.identity.digest, model: selected })
      const instance = await ipc('prometheus.uar.durable.create_instance', { workspaceId: state.workspaceId, deploymentBindingId: binding.id, profile: 'on_demand' })
      state.instanceId = instance.instanceId
      const snapshot = await ipc('prometheus.uar.representation.snapshot', { workspaceId: state.workspaceId })
      state.issuerPrincipalId = snapshot.issuerPrincipalId
      const grantId = `customer-synthetic-cio-${randomUUID()}`, now = Date.now()
      const saved = await ipc('prometheus.uar.representation.save', { workspaceId: state.workspaceId, commandId: randomUUID(), expectedRevision: 0,
        grant: { profile: 'urn:prometheus:uar:collaboration:0.1.0-draft.2', kind: 'RepresentationGrant', exportClass: 'private-authority-state',
          grantId, subjectPrincipalId: 'synthetic:customer-qualification-office-holder', granteeAgentInstanceId: state.instanceId,
          organizationId: 'synthetic:customer-qualification-organization', office: 'cio', purpose: authoring.purpose,
          audienceScopes: [`user:${snapshot.issuerPrincipalId}`], actionScopes: ['tool:file_read'], resourceScopes: [`workspace:${state.workspaceId}`], dataScopes: [],
          approvalRequirements: ['current-policy', 'real-human'], disclosureRequirements: ['disclose-agent-assistance'],
          consentEvidenceRef: `protected-evidence://synthetic-qualification/${grantId}/consent`, organizationalAuthorityEvidenceRef: `protected-evidence://synthetic-qualification/${grantId}/authority`,
          revision: 1, status: 'active', notBefore: new Date(now).toISOString(), expiresAt: new Date(now + 3600000).toISOString(), revocation: null,
          retention: { policy: 'retain-audit', deleteAfter: null }, offboarding: { mode: 'revoke-immediately', requiredActions: ['disable-binding'] },
          restrictions: { forbiddenClaims: ['human-authorship', 'human-approval'], notes: ['Synthetic fixture only; no real organizational authority.'] } } })
      state.grant = saved.grant
      const applied = await readInstance()
      requireFact(applied.representationGrantRefs?.some(ref => ref.grantId === saved.grant.grantId &&
        ref.revision === saved.grant.revision && ref.constraintDigest === saved.grant.constraintDigest), 'C17_EXACT_GRANT_NOT_APPLIED')
      state.checks.push({ name: 'synthetic-role-and-exact-private-grant-applied', passed: true,
        instanceId: state.instanceId, grantId, revision: saved.grant.revision, constraintDigest: saved.grant.constraintDigest })
      state.command = await submit(`Use file_read exactly once to read ${JSON.stringify(state.file)}. Quote its exact contents and include the required AI-assistance disclosure. Do not use any other tool or perform another effect.`)
      persist()
    }
    stage = 'same-turn-real-native-approval-and-output'
    const command = await waitCommand(state.command.commandId)
    requireFact(command.rootRunId, 'C17_REPRESENTED_TURN_NOT_RUNNING'); state.runId = command.rootRunId; persist()
    if (state.pendingApproval && fs.existsSync(approvalReceiptPath)) recordHumanReceipt(state.pendingApproval)
    let until = Date.now() + 90000
    let page, text = ''
    while (Date.now() < until) {
      let instance = await readInstance()
      let current = instance.commands.find(row => row.commandId === state.command.commandId)
      stopOnUncertain(instance, current, page)
      page = await ipc('prometheus.uar.durable.run', { ...selector(), runId: state.runId, after: 0 })
      const pending = page.approval
      if (pending) {
        requireFact(pending.toolName === 'file_read' && (pending.decisionOwner ?? pending.admissionOwner) === 'uar-runtime', 'C17_UNEXPECTED_APPROVAL_TOOL_OR_AUTHORITY')
        const args = JSON.parse(pending.argumentsJson)
        requireFact(args.operation === 'file_read' && args.target === state.file && args.detailsAvailable === true, 'C17_APPROVAL_FILE_MISMATCH')
        state.pendingApproval = { ...pending, argumentsSha256: digest(pending.argumentsJson),
          exactFile: state.file, exactContents: state.content, fileSha256: state.fileSha256 }
        persist(); paused = true
        result.status = 'pending-human-approval'; result.pendingApproval = state.pendingApproval
        result.resumeState = stateFile; result.sameTurn = { commandId: state.command.commandId, runId: state.runId }
        result.uiPath = `/settings/uar?panel=instances&adminWorkspaceId=${encodeURIComponent(state.workspaceId)}`
        const waitMs = Math.min(600000, Math.max(1000, configuration.operatorWaitMs ?? 600000))
        const challenge = page.history.find(record => record.issuerId === pending.issuerId && record.challengeId === pending.challengeId)
        state.operatorDeadline ??= new Date(Math.min(Date.now() + waitMs, Date.parse(challenge?.expiresAt ?? state.grant.expiresAt), Date.parse(state.grant.expiresAt))).toISOString()
        result.operatorDeadline = state.operatorDeadline; result.approvalReceiptPath = approvalReceiptPath
        persist(); fs.writeFileSync(configuration.evidence, JSON.stringify(result, null, 2) + '\n', { mode: 0o600 })
        if (!state.challengePublished) {
          await onObservation?.({ stage, status: result.status, ...state.pendingApproval,
            workspaceId: state.workspaceId, instanceId: state.instanceId, commandId: state.command.commandId,
            runId: state.runId, operatorDeadline: state.operatorDeadline, approvalReceiptPath })
          state.challengePublished = true; persist()
        }
        if (!configuration.holdForOperator) return result
        while (!fs.existsSync(approvalReceiptPath) && Date.now() < Date.parse(state.operatorDeadline)) {
          await delay(1000, signal)
          const waitingInstance = await readInstance()
          const current = waitingInstance.commands.find(row => row.commandId === state.command.commandId)
          if (current?.status === 'uncertain') paused = false
          stopOnUncertain(waitingInstance, current, page)
          if (current?.status === 'failed' || current?.status === 'cancelled') { paused = false; throw new Error('C17_PENDING_TURN_TERMINATED_BEFORE_APPROVAL') }
        }
        if (!fs.existsSync(approvalReceiptPath)) {
          const waitingInstance = await readInstance()
          const waitingCommand = waitingInstance.commands.find(row => row.commandId === state.command.commandId)
          if (waitingCommand?.status === 'uncertain') paused = false
          stopOnUncertain(waitingInstance, waitingCommand, page)
          const latest = await ipc('prometheus.uar.durable.run', { ...selector(), runId: state.runId, after: 0 })
          result.status = latest.approval ? 'pending-human-approval' : 'approval-outcome-unresolved'
          return result
        }
        recordHumanReceipt(pending)
        persist(); paused = false; result.status = 'awaiting-recorded-native-decision'
        // Root submits the actual UI decision separately. A receipt cannot authorize an effect by itself.
        const decided = await ipc('prometheus.uar.durable.run', { ...selector(), runId: state.runId, after: 0 })
        if (decided.approval) { await delay(500, signal); continue }
        until = Date.now() + 90000
        continue
      }
      text = page.events.events.flatMap(event => event.eventName === 'agui.message.delta' &&
        event.data?.request_id === state.runId && typeof event.data?.delta?.text === 'string' ? [event.data.delta.text] : []).join('')
      instance = await readInstance()
      current = instance.commands.find(row => row.commandId === state.command.commandId)
      stopOnUncertain(instance, current, page)
      if (current?.status === 'completed') break
      requireFact(current?.status !== 'failed' && current?.status !== 'cancelled', 'C17_REPRESENTED_TURN_FAILED')
      await delay(500, signal)
    }
    const succeeded = page.effects.filter(effect => effect.toolName === 'file_read' && effect.state === 'succeeded')
    requireFact(succeeded.length === 1 && text.includes(state.content.trim()) && text.includes('AI-assisted representation under scoped grants'), 'C17_REAL_READ_OR_DISCLOSURE_NOT_OBSERVED')
    const approved = page.history.find(record => record.toolName === 'file_read' && record.state === 'approved' && record.decision?.approved)
    requireFact(approved?.decision?.actor && approved?.decision?.decisionId, 'C17_ACTUAL_AUTHORITY_RECEIPT_MISSING')
    requireFact(state.operatorApprovalReceipt, 'C17_OPERATOR_APPROVAL_PROVENANCE_REQUIRED')
    state.checks.push({ name: 'real-read-ai-disclosure-and-authoritative-approval', passed: true,
      commandId: state.command.commandId, runId: state.runId, effect: succeeded[0], approval: approved,
      operatorApprovalReceipt: state.operatorApprovalReceipt, fileSha256: state.fileSha256, outputSha256: digest(text) })
    stage = 'resource-and-audience-restrictions'
    await saveRevision({ resourceScopes: ['workspace:synthetic-other-workspace'] }); await deniedTurn('wrong-workspace')
    await saveRevision({ resourceScopes: [`workspace:${state.workspaceId}`], audienceScopes: ['user:synthetic-other-user'] }); await deniedTurn('wrong-audience')
    stage = 'expiry-and-revocation-offboarding'
    await saveRevision({ audienceScopes: [`user:${state.issuerPrincipalId}`], expiresAt: new Date(Date.now() - 1000).toISOString() }); await deniedTurn('expired-grant')
    state.revoked = await ipc('prometheus.uar.representation.revoke', { workspaceId: state.workspaceId,
      grantId: state.grant.grantId, expectedRevision: state.grant.revision, reason: 'Synthetic fixture offboarded' })
    state.grant = state.revoked.grant; persist(); await deniedTurn('revoked-offboarded-grant')
    const reopened = await readInstance()
    requireFact(reopened.representationGrantRefs?.some(ref => ref.grantId === state.grant.grantId) &&
      reopened.commands.some(row => row.commandId === state.command.commandId), 'C17_DURABLE_AUTHORITY_NOT_REOPENED')
    state.checks.push({ name: 'durable-reopen-retains-command-and-fail-closed-grant-reference', passed: true,
      scope: 'Fresh typed read; whole-process restart of retained output is not asserted.' })
    result.complete = true; result.status = 'passed'
  } catch (cause) {
    result.failureStage = stage; result.failureCode = /^[A-Za-z0-9_.:-]{1,160}$/.test(cause.message) ? cause.message : 'C17_OPERATION_FAILED_INSPECT_LOCAL_LOG'
    if (state.uncertainCommand) await captureUncertainDiagnostic()
  } finally {
    if (!paused) {
      if (state.instanceId) {
        try {
          if (state.grant && state.grant.status !== 'revoked') await ipc('prometheus.uar.representation.revoke', {
            workspaceId: state.workspaceId, grantId: state.grant.grantId, expectedRevision: state.grant.revision, reason: 'Synthetic operation cleanup' }, true)
          await ipc('prometheus.uar.durable.instance_action', { ...selector(), action: 'disable', commandId: randomUUID() }, true)
        } catch { result.cleanupPending = true }
      }
      if (state.priorNativeSettings) {
        try {
          const snapshot = await ipc('prometheus.uar.settings.read', { namespace: 'native-tools' }, true)
          await ipc('prometheus.uar.settings.update', { namespace: 'native-tools', changes: state.priorNativeSettings.map(row => ({
            ...row, expectedRevision: snapshot.settings.find(field => field.field === row.field).revision })) }, true)
          result.nativeSettingsRestoredForNextRestart = true
        } catch { result.nativeSettingsCleanupPending = true }
      }
    }
    result.passed = result.complete
    result.observedBehavior = JSON.stringify({ status: result.status, complete: result.complete, checks: result.checks,
      uncertainCommand: result.uncertainCommand,
      failureCode: result.failureCode, failureStage: result.failureStage, resumeState: result.resumeState, evidencePath: configuration.evidence })
    result.finishedAt = new Date().toISOString(); result.fixtures = { workspaceId: state.workspaceId, instanceId: state.instanceId, grantId: state.grant?.grantId }
    persist(); fs.writeFileSync(configuration.evidence, JSON.stringify(result, null, 2) + '\n', { mode: 0o600 })
  }
  return result
}
