import fs from 'node:fs'
import path from 'node:path'
import { createHash, randomUUID } from 'node:crypto'
import { fileURLToPath, pathToFileURL } from 'node:url'

const initiative = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

export default async function capture(context) {
  const root = path.join(initiative, '.prometheus', 'cadence')
  const state = JSON.parse(fs.readFileSync(path.join(root, 'state.json'), 'utf8'))
  const iteration = state.iterations.at(-1)
  const source = path.join(process.env.BOSS_C094_REPOSITORY, 'scripts', 'cadence', 'uar-team-cooperation-scenario.mjs')
  const { default: operate } = await import(pathToFileURL(source).href)
  const startedAt = new Date().toISOString()
  const operationId = randomUUID()
  const attempts = new Map()
  const denials = []
  const observations = []
  let result
  try {
    result = await operate({
      ...context,
      async onObservation(receipt) {
        const filename = path.join(root, 'artifacts', `c094-scenario-${operationId}-${observations.length + 1}.json`)
        const bytes = JSON.stringify({
          schemaVersion: 1, operationId, iterationId: iteration.id, sourceRefs: iteration.sourceRefs,
          observedAt: new Date().toISOString(), receipt
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
            diagnosticCode: item.diagnostic?.code ?? null,
            protectedDiagnosticRef: item.diagnostic?.protectedDiagnosticRef ?? null
          })
        }
        if (reply?.ok === false && expression.includes('prometheus.uar.teams.')) denials.push({
          operation: expression.match(/prometheus\.uar\.teams\.[a-z_]+/)?.[0],
          code: reply.error?.code,
          knownCodes: JSON.stringify(reply.error ?? {}).match(/TEAM_[A-Z_]+|UAR_[A-Z_]+/g) ?? []
        })
        return reply
      }
    })
  } catch (error) {
    const filename = path.join(root, 'artifacts', `c094-operation-failure-${randomUUID()}.json`)
    fs.writeFileSync(filename, JSON.stringify({
      schemaVersion: 1, iterationId: iteration.id, sourceRefs: iteration.sourceRefs,
      startedAt, finishedAt: new Date().toISOString(), passed: false,
      attempts: [...attempts.values()], denials, observations,
      failureCode: error.message?.match(/C094_[A-Z_]+/)?.[0] ?? 'protected-operation-failure'
    }, null, 2) + '\n', { flag: 'wx', mode: 0o600 })
    process.stderr.write('Preserved C09.4 operation observations: ' + filename + '\n')
    throw error
  }
  const evidence = {
    schemaVersion: 1, iterationId: iteration.id, sourceRefs: iteration.sourceRefs,
    scenario: source,
    scenarioSha256: createHash('sha256').update(fs.readFileSync(source)).digest('hex'),
    startedAt, finishedAt: new Date().toISOString(), passed: result.passed,
    complete: result.scope?.complete === true, observations,
    qualification: 'local staged operation; public capability promotion recorded separately',
    teamExecutionCapacity: 1,
    operations: JSON.parse(result.observedBehavior)
  }
  const filename = path.join(root, 'artifacts', `c094-complete-operation-${randomUUID()}.json`)
  const bytes = JSON.stringify(evidence, null, 2) + '\n'
  fs.writeFileSync(filename, bytes, { flag: 'wx', mode: 0o600 })
  return {
    passed: result.passed && result.scope?.complete === true,
    observedBehavior: JSON.stringify({
      evidencePath: filename,
      evidenceSha256: createHash('sha256').update(bytes).digest('hex'),
      scope: 'C09.4 governed peer communication, capacity-one yield/resume, ordered target outcomes and durable recovery'
    })
  }
}
