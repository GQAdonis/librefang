import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'

export const expectedPins = {
  version: '2.2.30',
  uar: '308aea46ff26e7f61340281bb51f67ebe5351569',
  mini: '838371d3b597e785b1fe264377b3f55b9ca6333f',
  full: 'bb8950b254825079ab382119a8c425d645a081ae'
}
export const sha256 = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex')
export const requireFact = (value, code) => { if (!value) throw Object.assign(new Error(code), { code }) }

export function candidatePackage(installation) {
  requireFact(installation?.status === 'passed' && installation.version === expectedPins.version &&
    /^[a-f0-9]{40}$/.test(installation.source ?? ''), 'CUSTOMER_CORRECTED_INSTALLATION_REQUIRED')
  const resources = path.join(installation.app, 'Contents/Resources')
  const nativeRoot = path.join(resources, 'app.asar.unpacked/resources/binaries/darwin-arm64')
  const miniRoot = path.join(resources, 'app.asar.unpacked/resources/prometheus-skills-mini')
  requireFact(sha256(path.join(resources, 'app.asar')) === installation.appAsarSha256 &&
    sha256(path.join(nativeRoot, 'uar-sidecar')) === installation.sidecarSha256,
  'CUSTOMER_CORRECTED_INSTALLED_BYTES_MISMATCH')
  const native = JSON.parse(fs.readFileSync(path.join(nativeRoot, 'payload-manifest.json'), 'utf8'))
  const skills = JSON.parse(fs.readFileSync(path.join(miniRoot, 'release-manifest.json'), 'utf8'))
  requireFact(native.source === expectedPins.uar && skills.revision === expectedPins.mini &&
    skills.sourceIntent?.mini?.revision === expectedPins.mini && skills.sourceIntent?.['skill-pack']?.revision === expectedPins.full,
  'CUSTOMER_CORRECTED_PAYLOAD_PINS_MISMATCH')
  return { installation, resources, miniRoot, nativeRoot, native, skills }
}

export function requireCandidateConfiguration(configuration) {
  const refs = configuration.sourceRefs
  requireFact(refs?.installedVersion === expectedPins.version && refs.uar === expectedPins.uar &&
    /^[a-f0-9]{40}$/.test(refs.boss ?? '') && /^[a-f0-9]{64}$/.test(refs.appAsarSha256 ?? '') &&
    /^[a-f0-9]{64}$/.test(refs.sidecarSha256 ?? '') && /^[a-f0-9]{64}$/.test(refs.installationReceiptSha256 ?? ''),
  'CUSTOMER_CORRECTED_SOURCE_RECEIPT_REQUIRED')
  requireFact(/^[a-f0-9]{40}$/.test(configuration.expectedBossSource ?? '') && refs.boss === configuration.expectedBossSource,
    'CUSTOMER_CORRECTED_BOSS_PIN_MISMATCH')
  return refs
}

async function ipc(evaluate, route, input) {
  const response = await evaluate(`window.api.ipcApi.request(${JSON.stringify(route)},${JSON.stringify(input)})`)
  requireFact(response?.ok, 'CUSTOMER_RESILIENCE_TYPED_OPERATION_FAILED')
  return response.data
}

/** Observe committed settings; mutate only an explicit operator-approved policy in the isolated candidate profile. */
export async function persistedResilience(evaluate, configuration) {
  const before = await ipc(evaluate, 'prometheus.uar.settings.read', { namespace: 'resilience' })
  const summarize = snapshot => snapshot.settings.map(({ key, field, saved, effective, revision, apply, applicationStatus }) =>
    ({ key, field, saved, effective, revision, apply, applicationStatus }))
  const selected = configuration.resiliencePolicy
  if (!selected) return { authority: 'existing-persisted-settings', mutated: false,
    settings: summarize(before), nextTurnContract: expectedPins.uar + ':src/uar/settings/persisted_resilience.rs' }
  requireFact(typeof selected.authorityRef === 'string' && selected.authorityRef.length > 0 &&
    selected.values && Object.keys(selected.values).length > 0, 'CUSTOMER_RESILIENCE_APPROVED_POLICY_REQUIRED')
  const changes = Object.entries(selected.values).map(([field, value]) => {
    const current = before.settings.find(row => row.field === field)
    requireFact(current, 'CUSTOMER_RESILIENCE_FIELD_NOT_ADVERTISED')
    return { field, value, expectedRevision: current.revision }
  })
  const update = await ipc(evaluate, 'prometheus.uar.settings.update', { namespace: 'resilience', changes })
  requireFact(update.status === 'updated' && !update.errors?.length, 'CUSTOMER_RESILIENCE_POLICY_NOT_COMMITTED')
  const after = await ipc(evaluate, 'prometheus.uar.settings.read', { namespace: 'resilience' })
  for (const change of changes) requireFact(JSON.stringify(after.settings.find(row => row.field === change.field)?.saved) ===
    JSON.stringify(change.value), 'CUSTOMER_RESILIENCE_SAVED_VALUE_MISMATCH')
  return { authority: selected.authorityRef, mutated: true, before: summarize(before), settings: summarize(after),
    nextTurnContract: expectedPins.uar + ':src/uar/settings/persisted_resilience.rs',
    interpretation: 'Saved next-turn policy; observed attempt outcome is still required. No default was widened.' }
}
