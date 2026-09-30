import fs from 'node:fs'
import path from 'node:path'
import { createHash, randomUUID } from 'node:crypto'
import { fileURLToPath, pathToFileURL } from 'node:url'

const initiative = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

export default async function capture(context) {
  const root = path.join(initiative, '.prometheus', 'cadence')
  const state = JSON.parse(fs.readFileSync(path.join(root, 'state.json'), 'utf8'))
  const iteration = state.iterations.at(-1)
  const source = path.join(initiative, 'scripts', 'c094-operation', 'uar-team-cooperation-scenario.mjs')
  const operationModules = fs.readdirSync(path.dirname(source)).filter((name) => name.endsWith('.mjs')).sort().map((name) => ({
    path: path.join(path.dirname(source), name),
    sha256: createHash('sha256').update(fs.readFileSync(path.join(path.dirname(source), name))).digest('hex')
  }))
  const { default: operate, cooperationCases, cooperationReceiptNames } = await import(pathToFileURL(source).href)
  const startedAt = new Date().toISOString()
  const operationId = randomUUID()
  const attempts = new Map()
  const denials = []
  const observations = []
  // The failed starter IPC returned only INTERNAL in the original receipt.
  // Persist only exact messages authored in these adapters, never remote text.
  const knownMessages = new Set()
  for (const name of ['UarStarterAdministrationAdapter.ts', 'uarTeamModelSetup.ts', 'UarSidecarService.ts']) {
    const text = fs.readFileSync(path.join(process.env.BOSS_C094_REPOSITORY, 'src', 'main', 'ai', 'runtime', 'uar', name), 'utf8')
    for (const match of text.matchAll(/throw new Error\('([^'\n]+)'\)/g)) knownMessages.add(match[1])
  }
  let result
  try {
    result = await operate({
      ...context,
      cases: process.env.BOSS_C094_CASES?.split(',').map((name) => name.trim()).filter(Boolean),
      async onObservation(receipt) {
        const filename = path.join(root, 'artifacts', `c094-scenario-${operationId}-${observations.length + 1}.json`)
        const bytes = JSON.stringify({
          schemaVersion: 1, operationId, iterationId: iteration.id, sourceRefs: iteration.sourceRefs,
          observedAt: new Date().toISOString(), operationModules, receipt
        }, null, 2) + '\n'
        fs.writeFileSync(filename, bytes, { flag: 'wx', mode: 0o600 })
        observations.push({ path: filename, sha256: createHash('sha256').update(bytes).digest('hex'), case: receipt.case })
        process.stderr.write('Completed C09.4 operation case: ' + receipt.case + '\n')
      },
      async evaluate(expression) {
        const reply = await context.evaluate(expression)
        if (expression.includes('prometheus.uar.teams.execution') && reply?.ok) {
          for (const item of reply.data?.attempts ?? []) attempts.set(item.id, {
            attemptId: item.id, taskId: item.taskId, runId: item.runId,
            rootId: item.rootId, approvalScopeId: item.approvalScopeId,
            status: item.status, executionOutcome: item.executionOutcome,
            continuationOfWaitId: item.continuationOfWaitId,
            accountingState: item.accountingState,
            stateReason: [
              'team_output_contract_rejected',
              'team_dispatch_denied_before_kernel_entry',
              'team_usage_or_effect_outcome_uncertain',
              'team_artifact_publication_unconfirmed',
              'terminal_result_missing'
            ].includes(item.stateReason) ? item.stateReason : null,
            diagnosticCode: item.diagnostic?.code ?? null,
            protectedDiagnosticRef: item.diagnostic?.protectedDiagnosticRef ?? null
          })
        }
        if (reply?.ok === false && expression.includes('prometheus.uar.teams.')) denials.push({
          operation: expression.match(/prometheus\.uar\.teams\.[a-z_]+/)?.[0],
          code: reply.error?.code,
          knownCodes: JSON.stringify(reply.error ?? {}).match(/TEAM_[A-Z_]+|UAR_[A-Z_]+/g) ?? [],
          authoredMessage: knownMessages.has(reply.error?.message) ? reply.error.message : null,
          requestFailure: (() => {
            const message = reply.error?.message ?? ''
            const capability = message.match(/UAR sidecar capability check failed with HTTP ([1-5][0-9]{2})/)
            if (capability) return { method: 'GET', path: '/api/uar/capabilities', status: Number(capability[1]) }
            const scoped = message.match(/UAR request (GET|POST|PUT|DELETE) (\/api\/[A-Za-z0-9_/:.-]+) failed with HTTP ([1-5][0-9]{2})/)
            if (scoped) return { method: scoped[1], path: scoped[2], status: Number(scoped[3]) }
            const provider = message.match(/UAR team gateway provider setup failed \(HTTP ([1-5][0-9]{2})\)/)
            if (provider) return { method: 'POST', path: '/api/uar/providers', status: Number(provider[1]) }
            return null
          })(),
          httpStatuses: reply.error?.message?.match(/HTTP [1-5][0-9]{2}/g) ?? [],
          validationIssues: (() => {
            try {
              const issues = JSON.parse(reply.error?.message ?? '')
              return Array.isArray(issues) ? issues.map((issue) => ({
                code: /^[a-z_]+$/.test(issue.code ?? '') ? issue.code : 'unknown',
                path: Array.isArray(issue.path) ? issue.path.filter((item) => typeof item === 'number' || (typeof item === 'string' && /^[A-Za-z_][A-Za-z0-9_]*$/.test(item))) : []
              })) : []
            } catch { return [] }
          })()
        })
        return reply
      }
    })
  } catch (error) {
    const filename = path.join(root, 'artifacts', `c094-operation-failure-${randomUUID()}.json`)
    fs.writeFileSync(filename, JSON.stringify({
      schemaVersion: 1, iterationId: iteration.id, sourceRefs: iteration.sourceRefs,
      startedAt, finishedAt: new Date().toISOString(), passed: false, operationModules,
      attempts: [...attempts.values()], denials, observations,
      operationStage: /^[a-z0-9-]+$/.test(error.operationEvidence?.stage ?? '') ? error.operationEvidence.stage : null,
      requestFailure: error.requestFailure ?? null,
      providerDiagnostics: error.providerDiagnostics ?? [],
      nativeToolEvidence: error.nativeToolEvidence ?? [],
      failureCode: error.message?.match(/C094_[A-Z_]+/)?.[0] ?? 'protected-operation-failure'
    }, null, 2) + '\n', { flag: 'wx', mode: 0o600 })
    process.stderr.write('Preserved C09.4 operation observations: ' + filename + '\n')
    throw error
  }
  const prior = new Map()
  for (const name of fs.readdirSync(path.join(root, 'artifacts')).filter((value) => /^c094-scenario-[\w-]+\.json$/.test(value))) {
    const filename = path.join(root, 'artifacts', name)
    const bytes = fs.readFileSync(filename)
    const item = JSON.parse(bytes)
    if (item.iterationId !== iteration.id || JSON.stringify(item.sourceRefs) !== JSON.stringify(iteration.sourceRefs)) continue
    const label = item.receipt?.case
    if (!label || (prior.get(label)?.observedAt ?? '') >= item.observedAt) continue
    prior.set(label, { observedAt: item.observedAt, path: filename, sha256: createHash('sha256').update(bytes).digest('hex') })
  }
  const publicQualification = process.env.BOSS_C094_PUBLIC_QUALIFICATION === '1'
  const requiredLabels = publicQualification
    ? cooperationReceiptNames.success
    : cooperationCases.flatMap((name) => cooperationReceiptNames[name])
  const gateBPath = path.join(initiative, 'openspec', 'changes', 'afc-c09-bounded-teams-and-shared-task-board', 'c09-4-gate-b-receipt.json')
  const gateBBytes = publicQualification ? fs.readFileSync(gateBPath) : null
  const gateB = gateBBytes ? JSON.parse(gateBBytes) : null
  const priorGateB = gateB && gateB.outcome === 'passed-staged-operation' && gateB.cases?.length === 14 &&
    createHash('sha256').update(fs.readFileSync(path.join(root, 'artifacts', 'c094-team-runtime-operation.json'))).digest('hex') === gateB.aggregateOperation?.sha256
    ? { path: gateBPath, sha256: createHash('sha256').update(gateBBytes).digest('hex'), sourceRefs: gateB.sourceRefs }
    : null
  const complete = requiredLabels.every((name) => prior.has(name)) && (!publicQualification || priorGateB !== null)
  const caseReceipts = requiredLabels.filter((name) => prior.has(name)).map((name) => ({ case: name, ...prior.get(name) }))
  const evidence = {
    schemaVersion: 1, iterationId: iteration.id, sourceRefs: iteration.sourceRefs,
    scenario: source,
    scenarioSha256: createHash('sha256').update(fs.readFileSync(source)).digest('hex'),
    operationModules,
    startedAt, finishedAt: new Date().toISOString(), passed: result.passed,
    complete, observations, caseReceipts, priorGateB,
    qualification: publicQualification ? 'public-qualified source operated with prior complete Gate B evidence' : 'local staged operation; public capability promotion recorded separately',
    teamExecutionCapacity: 1,
    operations: { ...JSON.parse(result.observedBehavior), completedCases: caseReceipts.map((receipt) => receipt.case) }
  }
  const filename = path.join(root, 'artifacts', `c094-complete-operation-${randomUUID()}.json`)
  const bytes = JSON.stringify(evidence, null, 2) + '\n'
  fs.writeFileSync(filename, bytes, { flag: 'wx', mode: 0o600 })
  return {
    passed: result.passed,
    observedBehavior: JSON.stringify({
      evidencePath: filename,
      evidenceSha256: createHash('sha256').update(bytes).digest('hex'),
      complete,
      scope: 'C09.4 governed peer communication, capacity-one yield/resume, ordered target outcomes and durable recovery'
    })
  }
}
