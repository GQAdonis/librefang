import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { candidatePackage, expectedPins, persistedResilience, requireCandidateConfiguration, requireFact, sha256 } from './corrected-candidate-contract-2.2.27-20261010.mjs'
import { scenario as remainingScenario } from './c15-remaining-required-skill-operation-2.2.27-20261010.mjs'

const initiative = '/Users/gqadonis/Projects/prometheus/worktrees/agent-fabric-c06/librefang/docs/plans/agent-fabric-convergence'
const boss = '/Users/gqadonis/Projects/prometheus/worktrees/afc-c16-team-guidance'
const uar = '/Users/gqadonis/.claude/worktrees/uar-c14-delegation-host-context'
const prior = path.join(initiative, '.prometheus/cadence/artifacts/customer-corrected-mac-2.2.26',
  'reviewed-skills-proxy-repaired-2-2-26-e1d068fc-4df0-41b7-8b76-a6417883c434')
const evidenceFile = path.join(prior, 'evidence.json')
const preparationFile = path.join(prior, 'reviewed-skill-preparation.json')
const frozenBoss = 'efc36dba3e482c30d4ce97874fed2f9573a38f1b'
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'))
const git = (repository, args) => execFileSync('git', args, { cwd: repository, encoding: 'utf8' }).trim()
const fileDigest = file => 'sha256:' + sha256(file)
const descendants = (root, child) => {
  const relative = path.relative(fs.realpathSync(root), fs.realpathSync(child))
  return Boolean(relative) && !path.isAbsolute(relative) && relative !== '..' && !relative.startsWith('..' + path.sep)
}

export function correctedPackage(installation) { return candidatePackage(installation) }

export async function preparePublicOperation({ directory, installation, signal = new AbortController().signal }) {
  const candidate = candidatePackage(installation)
  requireFact(installation.source === frozenBoss && descendants(path.join(initiative,
    '.prometheus/cadence/artifacts/customer-corrected-mac-2.2.27'), directory), 'C15_REMAINING_CANDIDATE_SCOPE_REQUIRED')
  const old = read(evidenceFile)
  const prepared = read(preparationFile)
  requireFact(old.failureStage === 'normal-work-run-with-read-only-approval' &&
    old.failureCode === 'C15_APPROVAL_DELEGATION_SCOPE_MISMATCH' && old.coverageCoreComplete === true &&
    prepared.fullSourceRevision === expectedPins.full && prepared.miniSourceRevision === expectedPins.mini &&
    old.fullGeneration?.complete === true, 'C15_RETAINED_PARTIAL_RECEIPT_REQUIRED')
  const negativeScenarios = ['non-entrypoint-closure-byte-tamper', 'missing-non-entrypoint-closure-file',
    'actual-required-tool-outside-member-host-scope']
  requireFact(negativeScenarios.every(name => old.coverageScenarios.some(item => item.scenario === name && item.status === 'passed')) &&
    old.fullGeneration.signatureScenarios.length === 2 &&
    old.fullGeneration.signatureScenarios.every(item => item.status === 'passed'), 'C15_RETAINED_PASSING_CRITERIA_REQUIRED')
  const changes = (repository, from, to) => git(repository, ['diff', '--name-only', from, to]).split('\n').filter(Boolean)
  const bossChanges = changes(boss, old.sourceRefs.boss, frozenBoss)
  const nativeChanges = changes(uar, old.sourceRefs.uar, expectedPins.uar)
  requireFact(bossChanges.every(file => ['build/integration-sources.json', 'build/local-uar-source.json', 'package.json',
    'src/main/ai/runtime/uar/UarSidecarService.ts', 'src/main/ai/runtime/uar/uarTeamAuthoringPackage.ts'].includes(file)) &&
    nativeChanges.every(file => ['src/uar/runtime/instance/pump.rs', 'src/uar/runtime/thread/actor_host.rs'].includes(file)),
  'C15_RETAINED_ADMISSION_SOURCE_AGREEMENT_CHANGED')
  requireFact(git(prepared.sourceFixture, ['rev-parse', 'HEAD']) === expectedPins.full &&
    fileDigest(path.join(prepared.sourceFixture, 'scripts/install-plugin-generation.js')) === old.fullGeneration.installer.sha256,
  'C15_RETAINED_FULL_SOURCE_CHANGED')
  const miniInventory = path.join(candidate.miniRoot, 'reviewed-skill-closures.json')
  const previousMiniInventory = path.join(old.packRoot, 'reviewed-skill-closures.json')
  requireFact(descendants(old.isolatedUserData, previousMiniInventory) && sha256(miniInventory) === sha256(previousMiniInventory),
    'C15_RETAINED_MINI_INVENTORY_CHANGED')
  const verifier = path.join(candidate.resources,
    'app.asar.unpacked/resources/prometheus-skills-mini/reviewed-verifier/scripts/verify-reviewed-skill-coverage.js')
  requireFact(fileDigest(verifier) === old.fullGeneration.verifier.sha256, 'C15_RETAINED_VERIFIER_CHANGED')
  const fullHome = fs.realpathSync(prepared.fullHome)
  requireFact(descendants(prior, fullHome), 'C15_RETAINED_FULL_HOME_NOT_DISPOSABLE')
  const pluginRoot = path.join(fullHome, '.prometheus/plugins/prometheus-skill-pack')
  const trustStore = path.join(pluginRoot, 'trust/allowed-signers.json')
  signal.throwIfAborted()
  // Read-only integrity admission for reuse; do not repeat previously passing tamper scenarios.
  const baseline = JSON.parse(execFileSync(process.execPath, [verifier, '--plugin-root', pluginRoot,
    '--home', fullHome, '--trust-store', trustStore], { signal, encoding: 'utf8', shell: false,
    env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' }, maxBuffer: 64 * 1024 * 1024 }))
  requireFact(baseline.sourceClass === 'signed-full-generation' && /^[a-f0-9]{64}$/.test(baseline.generation) &&
    old.fullGeneration.signatureScenarios.every(item => item.generationDigest === baseline.generationDigest),
  'C15_RETAINED_SIGNED_GENERATION_CHANGED')
  const fullInventory = read(path.join(pluginRoot, 'generations', baseline.generation, 'reviewed-skill-closures.json'))
  requireFact(fullInventory.inventoryDigest === old.selectedSkills.fullInventoryDigest &&
    fullInventory.skills.some(item => item.identity.artifactDigest === old.selectedSkills.full.digest) &&
    read(miniInventory).skills.some(item => item.identity.artifactDigest === old.selectedSkills.mini.digest),
  'C15_RETAINED_REQUIRED_SKILLS_CHANGED')
  const retainedCoverage = {
    evidence: evidenceFile, evidenceSha256: sha256(evidenceFile), preparation: preparationFile,
    preparationSha256: sha256(preparationFile), originalSourceRefs: old.sourceRefs,
    sourceAgreement: { bossChanges, nativeChanges, full: expectedPins.full, mini: expectedPins.mini },
    selectedSkills: old.selectedSkills, passingChecks: old.checks,
    signatureScenarios: old.fullGeneration.signatureScenarios, coverageScenarios: old.coverageScenarios,
    coverageCoreComplete: old.coverageCoreComplete, privatePreflight: old.privatePreflight,
    privatePreflightDisposition: 'Optional private callback remains unavailable as expressly recorded by C15 delivery-11 evidence; not passed.',
    fullGenerationDigest: baseline.generationDigest, currentVerifierSha256: fileDigest(verifier),
    currentMiniInventorySha256: fileDigest(miniInventory), negativeScenariosRepeated: false
  }
  fs.writeFileSync(path.join(directory, 'reviewed-skill-retained-preparation.json'), JSON.stringify(retainedCoverage, null, 2) + '\n',
    { flag: 'wx', mode: 0o600 })
  return { environment: { HOME: fullHome }, configuration: {
    appResources: candidate.resources, fullSourceRoot: prepared.sourceFixture, fullHome,
    preparedFullGeneration: { ...old.fullGeneration, authority: 'retained immutable passing receipt', repeated: false },
    correctedCandidateInstallation: installation, retainedCoverage,
    operationDriverSources: [new URL(import.meta.url), new URL('./c15-remaining-required-skill-operation-2.2.27-20261010.mjs', import.meta.url),
      new URL('./corrected-candidate-contract-2.2.27-20261010.mjs', import.meta.url)]
      .map(url => ({ path: url.pathname, sha256: sha256(url) }))
  } }
}

export async function scenario(context, configuration) {
  requireCandidateConfiguration(configuration)
  const { resources } = candidatePackage(configuration.correctedCandidateInstallation)
  requireFact(configuration.appResources === resources && configuration.retainedCoverage?.coverageCoreComplete === true,
    'C15_RETAINED_PREPARATION_REQUIRED')
  let resiliencePolicy
  const outcome = await remainingScenario({ ...context, trustedRequest: undefined }, { ...configuration,
    sourceRefs: { ...configuration.sourceRefs, fullSkillSourceRevision: expectedPins.full, miniSkillSourceRevision: expectedPins.mini },
    onRuntimePrepared: async () => { resiliencePolicy = await persistedResilience(context.evaluate, configuration) } })
  const observed = read(configuration.evidence)
  observed.resiliencePolicy = resiliencePolicy
  observed.correctedCandidate = expectedPins
  fs.writeFileSync(configuration.evidence, JSON.stringify(observed, null, 2) + '\n', { mode: 0o600 })
  return { ...outcome, observedBehavior: JSON.stringify({ complete: observed.complete, checks: observed.checks,
    failureCode: observed.failureCode, retainedEvidence: configuration.retainedCoverage.evidence,
    evidencePath: configuration.evidence, evidenceSha256: sha256(configuration.evidence) }) }
}
