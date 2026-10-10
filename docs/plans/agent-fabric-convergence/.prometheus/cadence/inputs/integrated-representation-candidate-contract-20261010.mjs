import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'

export const sha256 = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex')
export const requireFact = (value, code) => { if (!value) throw new Error(code) }
export function candidatePins(candidate) {
  requireFact(candidate?.version === '2.2.31' && ['boss', 'uar', 'mini', 'full'].every(key =>
    /^[a-f0-9]{40}$/.test(candidate[key] ?? '')), 'C17_INTEGRATED_FROZEN_CANDIDATE_REQUIRED')
  return candidate
}
export function candidatePackage(installation, candidate) {
  const pins = candidatePins(candidate)
  requireFact(installation?.status === 'passed' && installation.version === pins.version &&
    installation.source === pins.boss, 'C17_INTEGRATED_INSTALLATION_SOURCE_REQUIRED')
  const resources = path.join(installation.app, 'Contents/Resources')
  const nativeRoot = path.join(resources, 'app.asar.unpacked/resources/binaries/darwin-arm64')
  const miniRoot = path.join(resources, 'app.asar.unpacked/resources/prometheus-skills-mini')
  requireFact(sha256(path.join(resources, 'app.asar')) === installation.appAsarSha256 &&
    sha256(path.join(nativeRoot, 'uar-sidecar')) === installation.sidecarSha256,
    'C17_INTEGRATED_INSTALLED_BYTES_MISMATCH')
  const native = JSON.parse(fs.readFileSync(path.join(nativeRoot, 'payload-manifest.json'), 'utf8'))
  const skills = JSON.parse(fs.readFileSync(path.join(miniRoot, 'release-manifest.json'), 'utf8'))
  requireFact(native.source === pins.uar && skills.revision === pins.mini &&
    skills.sourceIntent?.mini?.revision === pins.mini && skills.sourceIntent?.['skill-pack']?.revision === pins.full,
    'C17_INTEGRATED_PAYLOAD_PINS_MISMATCH')
  return { installation, resources, miniRoot, nativeRoot, native, skills }
}
export function requireCandidateConfiguration(configuration) {
  const pins = candidatePins(configuration.candidate)
  const refs = configuration.sourceRefs
  requireFact(refs?.installedVersion === pins.version && refs.boss === pins.boss && refs.uar === pins.uar &&
    refs.mini === pins.mini && refs.full === pins.full &&
    ['appAsarSha256', 'sidecarSha256', 'installationReceiptSha256', 'configurationSha256'].every(key =>
      /^[a-f0-9]{64}$/.test(refs[key] ?? '')), 'C17_INTEGRATED_SOURCE_RECEIPT_REQUIRED')
  requireFact(configuration.expectedBossSource === pins.boss, 'C17_INTEGRATED_BOSS_PIN_MISMATCH')
  return refs
}
