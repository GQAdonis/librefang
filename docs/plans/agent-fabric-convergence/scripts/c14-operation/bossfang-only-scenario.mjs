import fs from 'node:fs'
import path from 'node:path'
import { randomBytes } from 'node:crypto'
import { operateBossFang } from './bossfang-scenario.mjs'
import { digest, requireFact, write } from './io.mjs'
import { ipc, setup } from './setup.mjs'

/** Retry only BossFang against a fresh ordinary profile; prior Teams evidence stays historical. */
export default async function bossfangOnlyScenario(context, configuration) {
  const startedAt = new Date().toISOString()
  requireFact(configuration.priorTeams?.evidenceSha256, 'C14_PRIOR_TEAMS_EVIDENCE_NOT_REUSABLE')
  const selected = await setup(context.evaluate, configuration)
  await ipc(context.evaluate, 'prometheus.uar.teams.setup_coding', {
    workspaceId: selected.workspaceId, model: selected.model
  })
  const sources = await ipc(context.evaluate, 'prometheus.uar.models.sources', {})
  const gateway = new URL(configuration.gateway.endpoint)
  gateway.pathname = gateway.pathname.replace(/\/$/, '').replace(/\/v1$/, '') + '/v1'
  const matching = sources.sources.filter(source => source.source === 'uar' && source.operational)
    .flatMap(source => source.providers.filter(provider => provider.enabled && provider.credentialConfigured &&
      provider.baseUrl === gateway.href.replace(/\/$/, ''))
      .flatMap(provider => provider.models.filter(model => model.enabled &&
        model.id === configuration.gateway.alias &&
        model.pricingIdentity?.providerId === configuration.gateway.providerId &&
        model.pricingIdentity?.modelId === configuration.gateway.modelId)
        .map(model => ({providerId: provider.id, modelId: model.id}))))
  requireFact(matching.length === 1, 'C14_BOSSFANG_ORDINARY_CONFIGURED_MODEL_UNAVAILABLE')
  const bossStatus = await ipc(context.evaluate, 'bossfang.status')
  if (!bossStatus.configured) await ipc(context.evaluate, 'bossfang.configure_credentials', {
    username: 'c14-disposable-operator', password: randomBytes(32).toString('base64url')
  })
  const bossfang = await operateBossFang(context, configuration, {
    workspaceId: selected.workspaceId, selectedModel: selected.model,
    executionModel: {...matching[0], source: 'ordinary-uar-model-catalog-after-coding-setup',
      workspaceId: selected.workspaceId, pricingIdentity: {
        providerId: configuration.gateway.providerId, modelId: configuration.gateway.modelId
      }}
  })
  const receipt = {schemaVersion: 1, kind: 'bossfang-failed-only-packaged-operation',
    sourceRefs: configuration.sourceRefs, startedAt, finishedAt: new Date().toISOString(),
    complete: false, sameSessionCombinedAcceptance: false,
    previousTeams: configuration.priorTeams,
    bossfang}
  const file = path.join(path.dirname(configuration.evidence), 'combined-evidence.json')
  write(file, receipt)
  return {passed: bossfang.passed === true, observedBehavior: JSON.stringify({
    bossfang: bossfang.passed, previousTeamsEvidenceSha256: configuration.priorTeams.evidenceSha256,
    sameSessionCombinedAcceptance: false, evidencePath: file,
    evidenceSha256: digest(fs.readFileSync(file))
  })}
}
