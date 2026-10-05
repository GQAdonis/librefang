import fs from 'node:fs'
import path from 'node:path'
import { randomBytes } from 'node:crypto'
import teams from './scenario.mjs'
import { operateBossFang } from './bossfang-scenario.mjs'
import { digest, requireFact, write } from './io.mjs'
import { ipc } from './setup.mjs'

/** Resolve the native route from the exact admitted team's validated execution receipts. */
async function teamExecutionModel(evaluate, evidence) {
  const missing = 'C14_BOSSFANG_TEAM_EXECUTION_MODEL_UNAVAILABLE'
  const scope = 'C14_BOSSFANG_TEAM_EXECUTION_MODEL_SCOPE_MISMATCH'
  requireFact(evidence?.workspaceId && evidence.teamId && evidence.binding && evidence.definition, missing)
  const selector = {workspaceId: evidence.workspaceId, teamInstanceId: evidence.teamId}
  const snapshot = await ipc(evaluate, 'prometheus.uar.teams.snapshot', {workspaceId: selector.workspaceId})
  const team = snapshot.instances.find(item => item.id === selector.teamInstanceId)
  const sameIdentity = (a,b) => a?.id === b?.id && a?.version === b?.version && a?.digest === b?.digest
  requireFact(team?.workspaceId === selector.workspaceId && sameIdentity(team.definition,evidence.definition) &&
    team.binding.id === evidence.binding.id && team.binding.revision === evidence.binding.revision, scope)
  const binding = snapshot.bindings.find(item => item.id === team.binding.id)
  requireFact(binding?.workspaceId === selector.workspaceId && binding.revision === team.binding.revision &&
    binding.activationSupported && sameIdentity(binding.package,team.package), scope)
  const coordinators = team.members.filter(item => item.role === 'coordinator')
  requireFact(coordinators.length === 1, missing)
  const execution = await ipc(evaluate, 'prometheus.uar.teams.execution', selector)
  const receipts = execution.attempts.filter(attempt => attempt.memberId === coordinators[0].id &&
    attempt.teamId === team.id && attempt.workspaceId === team.workspaceId && attempt.ownerId === team.ownerId &&
    attempt.bindingRevision === team.binding.revision).flatMap(attempt =>
      (attempt.effectiveModels ?? []).filter(model => model.support === 'validated' && model.supportEvidenceRef &&
        model.wireModelAlias === evidence.selectedModel.modelId && model.route?.providerId && model.route?.modelId)
        .map(model => ({attemptId: attempt.id, runId: attempt.runId, route: model.route,
          wireModelAlias: model.wireModelAlias, supportEvidenceRef: model.supportEvidenceRef})))
  const routes = [...new Map(receipts.map(item => [JSON.stringify(item.route),item.route])).values()]
  requireFact(routes.length === 1, missing)
  return {...routes[0], source: 'uar-team-effective-model-receipt', workspaceId: team.workspaceId,
    teamId: team.id, definition: team.definition, binding: team.binding,
    coordinatorMemberId: coordinators[0].id, receipts}
}

/** Operate both completed capabilities in the same real packaged application. */
export default async function combinedScenario(context, configuration) {
  const startedAt = new Date().toISOString()
  const teamResult = await teams(context, configuration)
  const teamEvidence = fs.existsSync(configuration.evidence)
    ? JSON.parse(fs.readFileSync(configuration.evidence, 'utf8')) : null
  const bossStatus = await ipc(context.evaluate, 'bossfang.status')
  if (!bossStatus.configured) {
    // This launcher uses a disposable application profile. The credential lives
    // only in runner memory and the application's protected credential store.
    await ipc(context.evaluate, 'bossfang.configure_credentials', {
      username: 'c14-disposable-operator', password: randomBytes(32).toString('base64url')
    })
  }
  let executionModel, executionModelUnavailable
  try { executionModel = await teamExecutionModel(context.evaluate,teamEvidence) }
  catch(error) { executionModelUnavailable = /^C14_[A-Z0-9_]+$/.test(error.code ?? '')
    ? error.code : 'C14_BOSSFANG_TEAM_EXECUTION_MODEL_UNAVAILABLE' }
  const bossfang = await operateBossFang(context, configuration, {
    workspaceId: teamEvidence?.workspaceId,
    selectedModel: teamEvidence?.selectedModel, executionModel, executionModelUnavailable
  })
  const receipt = {
    schemaVersion: 1, kind: 'combined-teams-bossfang-packaged-operation',
    sourceRefs: configuration.sourceRefs, startedAt, finishedAt: new Date().toISOString(),
    complete: teamResult.passed === true && bossfang.passed === true,
    teams: { passed: teamResult.passed, evidence: configuration.evidence,
      ...(teamEvidence ? { evidenceSha256: digest(fs.readFileSync(configuration.evidence)) } : {}) },
    bossfang
  }
  write(path.join(path.dirname(configuration.evidence), 'combined-evidence.json'), receipt)
  return { passed: receipt.complete, observedBehavior: JSON.stringify({
    complete: receipt.complete, teams: teamResult.passed, bossfang: bossfang.passed,
    evidencePath: path.join(path.dirname(configuration.evidence), 'combined-evidence.json')
  }) }
}
