import fs from 'node:fs'
import path from 'node:path'
import { randomBytes } from 'node:crypto'
import teams from './scenario.mjs'
import { operateBossFang } from './bossfang-scenario.mjs'
import { digest, write } from './io.mjs'
import { ipc } from './setup.mjs'

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
  const bossfang = await operateBossFang(context, configuration, {
    workspaceId: teamEvidence?.workspaceId,
    selectedModel: teamEvidence?.selectedModel
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
