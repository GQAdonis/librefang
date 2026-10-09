import { candidatePackage, expectedPins, persistedResilience, requireCandidateConfiguration } from './corrected-candidate-contract-20261009.mjs'
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'

import { scenario as reviewedScenario } from 'file:///Users/gqadonis/Projects/prometheus/worktrees/afc-c16-team-guidance/scripts/team-reviewed-skills-operation/scenario.mjs'
import { createAndExerciseDisposableFullGeneration } from 'file:///Users/gqadonis/Projects/prometheus/worktrees/afc-c16-team-guidance/scripts/team-reviewed-skills-operation/full-generation.mjs'

export const fullRevision = expectedPins.full
export const miniRevision = expectedPins.mini
const initiative = '/Users/gqadonis/Projects/prometheus/worktrees/agent-fabric-c06/librefang/docs/plans/agent-fabric-convergence'
const fullRepository = '/Users/gqadonis/Projects/prometheus/worktrees/cadence-nested-source-full'
export const sha256 = (file) => createHash('sha256').update(fs.readFileSync(file)).digest('hex')
const requireFact = (condition, code) => { if (!condition) throw Object.assign(new Error(code), { code }) }

export function correctedPackage(installation) { return candidatePackage(installation) }

/** Root invokes this only after assigning the packaged-operation slot, before launchBoss. */
export async function preparePublicOperation({ directory, installation: candidateInstallation, signal = new AbortController().signal }) {
  const { installation, resources } = correctedPackage(candidateInstallation)
  const operationDirectory = fs.realpathSync(directory)
  const allowedRoot = fs.realpathSync(path.join(initiative, '.prometheus/cadence/artifacts/customer-corrected-mac-' + expectedPins.version))
  const relative = path.relative(allowedRoot, operationDirectory)
  requireFact(relative && !path.isAbsolute(relative) && !relative.startsWith('..'), 'C15_PUBLIC_PREPARATION_NOT_ISOLATED')
  const sourceFixture = path.join(operationDirectory, 'frozen-full-source')
  requireFact(!fs.existsSync(sourceFixture), 'C15_PUBLIC_FROZEN_FIXTURE_ALREADY_EXISTS')
  signal.throwIfAborted()
  execFileSync('git', ['clone', '--shared', '--no-checkout', fullRepository, sourceFixture], { stdio: 'ignore' })
  execFileSync('git', ['-C', sourceFixture, '-c', 'core.hooksPath=/dev/null', 'checkout', '--detach', fullRevision],
    { stdio: 'ignore' })
  requireFact(execFileSync('git', ['-C', sourceFixture, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim() === fullRevision,
    'C15_PUBLIC_FROZEN_FULL_SOURCE_MISMATCH')
  // The first preparation failed because a plain clone leaves the imported
  // inventory roots empty. Materialize those exact gitlinks, never main.
  const imports = ['skills/imported/artifact-refiner', 'skills/imported/sycophancy-correction']
  execFileSync('git', ['-C', sourceFixture, 'submodule', 'update', '--init', '--recursive', '--', ...imports],
    { stdio: 'ignore' })
  const initializedImports = Object.fromEntries(imports.map((relative) => [relative,
    execFileSync('git', ['-C', path.join(sourceFixture, relative), 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()]))
  const outputRoot = path.join(operationDirectory, 'c15-full-generation')
  const preparationEvidence = {}
  const preparedFullGeneration = await createAndExerciseDisposableFullGeneration({
    executable: process.execPath,
    fullSourceRoot: sourceFixture,
    outputRoot,
    isolatedUserData: operationDirectory,
    verifierScript: path.join(resources, 'app.asar.unpacked/resources/prometheus-skills-mini/reviewed-verifier/scripts/verify-reviewed-skill-coverage.js'),
    signal,
    evidence: preparationEvidence
  })
  requireFact(preparedFullGeneration.complete === true, 'C15_PUBLIC_PRELAUNCH_FULL_GENERATION_INCOMPLETE')
  const fullHome = path.join(outputRoot, 'home')
  const preparation = { fullSourceRevision: fullRevision, miniSourceRevision: miniRevision,
    correctedAppAsarSha256: installation.appAsarSha256, correctedSidecarSha256: installation.sidecarSha256,
    sourceFixture, fullHome, initializedImports, ...preparationEvidence }
  fs.writeFileSync(path.join(operationDirectory, 'reviewed-skill-preparation.json'), JSON.stringify(preparation, null, 2) + '\n',
    { flag: 'wx', mode: 0o600 })
  return { environment: { HOME: fullHome }, configuration: {
    appResources: resources, fullSourceRoot: sourceFixture, fullHome, preparedFullGeneration,
    correctedReviewedPreparation: preparation, correctedCandidateInstallation: installation,
    operationDriverSources: [import.meta.url,
      'file:///Users/gqadonis/Projects/prometheus/worktrees/afc-c16-team-guidance/scripts/team-reviewed-skills-operation/scenario.mjs',
      'file:///Users/gqadonis/Projects/prometheus/worktrees/afc-c16-team-guidance/scripts/team-reviewed-skills-operation/full-generation.mjs',
      'file:///Users/gqadonis/Projects/prometheus/worktrees/afc-c16-team-guidance/scripts/team-reviewed-skills-operation/runtime-scenarios.mjs']
      .map((url) => ({ path: new URL(url).pathname, sha256: sha256(new URL(url)) }))
  } }
}

export async function scenario(context, configuration) {
  requireCandidateConfiguration(configuration)
  const { resources } = correctedPackage(configuration.correctedCandidateInstallation)
  const resiliencePolicy = await persistedResilience(context.evaluate, configuration)
  requireFact(configuration.appResources === resources && configuration.preparedFullGeneration?.complete === true,
    'C15_PUBLIC_PRELAUNCH_PREPARATION_REQUIRED')
  const outcome = await reviewedScenario({ ...context, trustedRequest: undefined }, { ...configuration,
    sourceRefs: { ...configuration.sourceRefs, fullSkillSourceRevision: fullRevision, miniSkillSourceRevision: miniRevision },
    appResources: resources })
  const observed = JSON.parse(fs.readFileSync(configuration.evidence, 'utf8'))
  observed.resiliencePolicy = resiliencePolicy
  observed.correctedCandidate = expectedPins
  fs.writeFileSync(configuration.evidence, JSON.stringify(observed, null, 2) + '\n', { mode: 0o600 })
  return { ...outcome, observedBehavior: JSON.stringify({ complete: observed.complete, checks: observed.checks,
    failureCode: observed.failureCode, evidencePath: configuration.evidence, evidenceSha256: sha256(configuration.evidence),
    resiliencePolicy: { authority: resiliencePolicy.authority, mutated: resiliencePolicy.mutated } }) }
}
