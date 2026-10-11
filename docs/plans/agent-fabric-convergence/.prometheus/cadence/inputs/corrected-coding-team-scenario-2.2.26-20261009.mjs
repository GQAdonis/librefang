import { persistedResilience, requireCandidateConfiguration } from './corrected-candidate-contract-20261009.mjs'
import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'

import codingScenario from '../../../scripts/c14-operation/scenario.mjs'
import { selectOption, selectWorkspace } from '../../../scripts/c14-operation/controls.mjs'
import { ipc } from '../../../scripts/c14-operation/setup.mjs'
import { digest, requireFact, repositoryResult, waitFor, write } from '../../../scripts/c14-operation/io.mjs'
import { response, team, workspace } from '/Users/gqadonis/Projects/prometheus/worktrees/afc-c16-team-guidance/scripts/cadence/uar-team-operation-tools.mjs'

const initiative = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')
const repository = '/Users/gqadonis/Projects/prometheus/worktrees/afc-c16-team-guidance'
const sha = (file) => createHash('sha256').update(fs.readFileSync(file)).digest('hex')
const route = (name) => 'prometheus.uar.teams.' + name
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right)

/** Root owns the public package launcher; this is a scenario, never an independent runtime launcher. */
export default async function scenario(context, configuration) {
  const { evaluate, signal } = context
  const sourceRefs = {
    ...configuration.sourceRefs,
    codingProcedureFiles: Object.fromEntries(
      ['scenario.mjs', 'setup.mjs', 'controls.mjs', 'approvals.mjs', 'diagnostics.mjs', 'io.mjs']
        .map((name) => ['scripts/c14-operation/' + name, sha(path.join(initiative, 'scripts/c14-operation', name))])
    ),
    ordinaryTeamToolsSha256: sha(path.join(repository, 'scripts/cadence/uar-team-operation-tools.mjs'))
  }
  const result = {
    schemaVersion: 1, kind: 'corrected-customer-coding-team-and-workspace-operation',
    startedAt: new Date().toISOString(), complete: false, status: 'blocked', sourceRefs,
    normalProfile: true, experimentalOptIn: false, checks: [],
    scope: 'Current coding edit, handoff, exact Work approvals, cancel/renderer reopen, two-workspace exclusion',
    restartScope: 'renderer reload only; whole-process pending-approval recovery remains separate',
    modelCallsInWorkspaceB: 0, newCadenceDelivery: false
  }
  let stage = 'public-source-and-owned-fixture'
  try {
    requireCandidateConfiguration(configuration)
    result.resiliencePolicy = await persistedResilience(evaluate, configuration)
    const fixtureFile = path.join(configuration.workspaceDirectory, 'README.md')
    const original = fs.readFileSync(fixtureFile, 'utf8')
    requireFact(digest(original) === configuration.workspaceSha256 &&
      original.includes(configuration.marker) && !original.includes('pending-' + configuration.marker),
    'C14_ROOT_OWNED_FRESH_FIXTURE_MISMATCH')
    repositoryResult(configuration.workspaceDirectory, original)
    const before = original.replace(configuration.marker, 'pending-' + configuration.marker)
    fs.writeFileSync(fixtureFile, before)
    const codingEvidencePath = path.join(path.dirname(configuration.evidence), 'coding-evidence.json')
    stage = 'ordinary-work-coding-and-controls'
    await codingScenario(context, {
      ...configuration, sourceRefs, evidence: codingEvidencePath,
      workspaceLabel: 'Corrected customer coding ' + configuration.marker,
      repository: { beforeSha256: digest(before), afterSha256: digest(original), after: original }
    })
    const coding = JSON.parse(fs.readFileSync(codingEvidencePath, 'utf8'))
    result.codingEvidence = { path: codingEvidencePath, sha256: sha(codingEvidencePath) }
    result.checks.push(...coding.checks)
    requireFact(coding.complete === true, coding.failureCode ?? 'C14_PUBLIC_CODING_INCOMPLETE')
    requireFact(coding.approvals.some((approval) => ['filesystem__edit', 'filesystem__write'].includes(approval.tool) &&
      approval.preparedEffect && approval.decisionSurface === 'Work exact approval control'),
    'C14_ACTUAL_BOUNDED_FILE_APPROVAL_NOT_RECORDED')

    stage = 'second-workspace-real-team-without-inference'
    const workspaceB = await workspace(evaluate, 'Corrected customer isolated team B')
    const teamB = await team(evaluate, workspaceB, coding.selectedModel, 'Isolated second team; no turn admitted')
    const selectorA = { workspaceId: coding.workspaceId, teamInstanceId: coding.teamId }
    const readA = () => ipc(evaluate, route('execution'), selectorA)
    const priorA = await readA()
    const snapshotA = await ipc(evaluate, route('snapshot'), { workspaceId: coding.workspaceId })
    const snapshotB = await ipc(evaluate, route('snapshot'), { workspaceId: workspaceB })
    requireFact(snapshotA.instances.some((instance) => instance.id === coding.teamId) &&
      !snapshotA.instances.some((instance) => instance.id === teamB.teamInstanceId) &&
      snapshotB.instances.some((instance) => instance.id === teamB.teamInstanceId) &&
      !snapshotB.instances.some((instance) => instance.id === coding.teamId),
    'C14_TWO_WORKSPACE_INSTANCE_EXCLUSION_NOT_OBSERVED')
    const refusals = []
    for (const [selector, foreignWorkspace] of [[selectorA, workspaceB], [teamB, coding.workspaceId]]) {
      for (const operation of ['execution', 'artifacts', 'approvals']) {
        const refused = await response(evaluate, route(operation), { ...selector, workspaceId: foreignWorkspace })
        requireFact(refused?.ok === false && Boolean(refused.error), 'C14_FOREIGN_WORKSPACE_READ_NOT_REFUSED')
        refusals.push({ teamInstanceId: selector.teamInstanceId, requestedWorkspaceId: foreignWorkspace,
          operation, refused: true })
      }
    }
    await selectWorkspace(evaluate, signal, workspaceB)
    await waitFor(signal, () => evaluate(`(() => {
      const root=document.querySelector('[data-ui~="teams-work"]');
      return root?.getAttribute('data-workspace-id')===${JSON.stringify(workspaceB)} &&
        !document.querySelector('[data-ui~="teams-run"][data-team-id="${coding.teamId}"]');
    })()`), 'C14_WORK_SECOND_WORKSPACE_RETAINS_FOREIGN_TEAM')
    requireFact(same(priorA, await readA()), 'C14_FOREIGN_WORKSPACE_INSPECTION_MUTATED_TEAM')
    const executionB = await ipc(evaluate, route('execution'), teamB)
    requireFact(executionB.attempts.length === 0, 'C14_SECOND_WORKSPACE_UNREQUESTED_INFERENCE')
    repositoryResult(configuration.workspaceDirectory, original)
    await selectWorkspace(evaluate, signal, coding.workspaceId)
    await selectOption(evaluate, signal, '[data-ui~="teams-instance"]',
      `document.querySelector('[role="option"][data-team-id="${coding.teamId}"]')`,
      'C14_WORK_ORIGINAL_TEAM_RESELECT_UNAVAILABLE')
    result.isolation = { workspaceA: coding.workspaceId, teamA: coding.teamId,
      workspaceB, teamB: teamB.teamInstanceId, refusals, originalAttemptsUnchanged: true,
      secondTeamAttempts: executionB.attempts.length, workSelectionRestored: true }
    result.checks.push('two-real-teams-in-separate-owned-workspaces', 'foreign-workspace-execution-artifact-approval-reads-refused',
      'work-workspace-selector-excludes-foreign-run', 'isolation-preserves-original-attempts-and-exact-fixture')
    result.complete = true
    result.status = 'success'
  } catch (error) {
    result.failureStage = stage
    result.failureCode = /^C14_[A-Z0-9_]+$/.test(error.code ?? '') ? error.code : 'C14_PUBLIC_CODING_OPERATION_UNAVAILABLE'
  } finally {
    result.finishedAt = new Date().toISOString()
    write(configuration.evidence, result)
  }
  return { passed: result.complete, observedBehavior: JSON.stringify({ complete: result.complete,
    checks: result.checks, failureCode: result.failureCode, failureStage: result.failureStage,
    evidencePath: configuration.evidence, evidenceSha256: sha(configuration.evidence) }) }
}
