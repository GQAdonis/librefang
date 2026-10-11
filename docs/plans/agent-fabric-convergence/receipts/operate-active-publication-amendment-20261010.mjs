import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';

const initiative = path.dirname(new URL(import.meta.url).pathname);
const realRoot = path.resolve(initiative, '../.prometheus/cadence');
const full = '/Users/gqadonis/Projects/prometheus/worktrees/cadence-nested-source-full/skills/process/delivery-cadence';
const mini = '/Users/gqadonis/Projects/prometheus/worktrees/cadence-nested-source-mini/skills/delivery-cadence';
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cadence-active-publication-operation-'));
const state = directory => JSON.parse(fs.readFileSync(path.join(directory, 'state.json'), 'utf8'));
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const bytesHash = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const fact = (condition, message) => { if (!condition) throw new Error(message); };
const receiptPath = path.join(initiative, 'active-publication-amendment-operation-20261010.json');
const authorityRef = path.join(initiative, 'customer-platform-priority-20261010.json');
const receipt = { schemaVersion: 1, kind: 'completed-skill-boundary-active-publication-cli-operation',
  startedAt: new Date().toISOString(), complete: false, disposableRoot: root,
  actualProjectMutated: false, applicationLaunched: false, externalPublicationPerformed: false,
  checks: [], commands: [], limitations: ['Mac ARM64 native Node operation only; Windows execution remains pending.',
    'This operates publication policy metadata, not application functionality or installer publication.',
    'Frozen-source reconciliation still requires its own complete feature evidence.'] };
const input = { profile: { publication: { platforms: ['darwin-arm64', 'win32-x64'],
  procedure: { platforms: 'darwin-arm64,win32-x64',
    requiredInputs: ['release_version', 'release_profile', 'platforms', 'uar_darwin_arm64_record_url', 'uar_win32_x64_record_url'],
    completion: 'Both selected installers, source-bound metadata and matching live website links are published. Installed acceptance remains separate.' } } },
  activePublication: { authorityRef, reason: 'Operator explicitly deferred Mac Intel, Windows ARM64 and Linux; preserve the current continuous delivery.' } };
function invoke(skill, value, commandId) {
  const file = path.join(root, commandId + '.json');
  if (!fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
  const result = spawnSync(process.execPath, [path.join(skill, 'scripts/cadence.mjs'), 'configure',
    '--root', root, '--input', file, '--command-id', commandId], { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
  let output;
  try { output = JSON.parse(result.stdout); } catch { output = null; }
  receipt.commands.push({ skill, commandId, exitCode: result.status, signal: result.signal,
    stdoutSha256: hash(result.stdout), stderrSha256: hash(result.stderr), inputSha256: bytesHash(file) });
  return { ...result, output };
}
try {
  for (const name of ['state.json', 'events.jsonl', 'event-archives.json', 'archives'])
    fs.cpSync(path.join(realRoot, name), path.join(root, name), { recursive: true });
  const before = state(root);
  const iteration = before.iterations.find(item => item.id === before.activeIterationId);
  fact(iteration && before.successfulDeliveries === 15, 'Expected actual continuous active delivery state');
  const candidate = before.candidates.find(item => item.id === iteration.candidateId);
  const originalManifestSha256 = bytesHash(candidate.manifestPath);
  const result = invoke(full, input, 'active-two-platform-skill-boundary-operation-v1');
  fact(result.status === 0, 'Actual publication amendment CLI failed: ' + result.stderr);
  const after = state(root), active = after.iterations.find(item => item.id === after.activeIterationId);
  fact(after.runId === before.runId && after.startedAt === before.startedAt &&
    after.successfulDeliveries === before.successfulDeliveries && active.id === iteration.id &&
    active.startedAt === iteration.startedAt, 'Clock, run, active iteration or delivery count changed');
  fact(hash(after.obligations) === hash(before.obligations) &&
    hash(after.externalReleases) === hash(before.externalReleases) &&
    hash(after.publicationLinks) === hash(before.publicationLinks) &&
    hash(active.checkpoints) === hash(iteration.checkpoints) &&
    hash(after.candidates) === hash(before.candidates) &&
    bytesHash(candidate.manifestPath) === originalManifestSha256,
    'Historical obligations, receipts, checkpoints or candidates changed');
  fact(hash(active.profile.publication.platforms) === hash(['darwin-arm64', 'win32-x64']) &&
    hash(after.profile.publication.platforms) === hash(active.profile.publication.platforms) &&
    active.publicationPolicyRevisions.at(-1).authorityEvidence.sha256 === bytesHash(authorityRef),
    'Selected targets or retained operator authority mismatch');
  receipt.checks.push('active-target-deferral-with-original-clock-count-and-iteration',
    'immutable-historical-obligations-receipts-checkpoints-and-candidates',
    'explicit-checksummed-operator-authority-and-future-policy');
  const replay = invoke(mini, input, 'active-two-platform-skill-boundary-operation-v1');
  fact(replay.status === 0 && state(root).eventsSeq === after.eventsSeq &&
    hash(state(root).iterations.find(item => item.id === after.activeIterationId).publicationPolicyRevisions) ===
      hash(active.publicationPolicyRevisions), 'Full/mini command replay changed history');
  receipt.checks.push('portable-mini-replay-of-full-command-without-duplicate-event');
  const absentAuthority = invoke(full, { ...input, activePublication: { reason: input.activePublication.reason } },
    'active-publication-missing-authority-refusal-v1');
  fact(absentAuthority.status !== 0, 'Missing authority was accepted');
  const unrelated = invoke(full, { ...input, profile: { ...input.profile, iterationMinutes: 60 } },
    'active-publication-unrelated-profile-refusal-v1');
  fact(unrelated.status !== 0, 'Unrelated active profile change was accepted');
  const broadened = invoke(full, { ...input, profile: { publication: { platforms: ['darwin-arm64', 'win32-x64', 'darwin-x64'] } } },
    'active-publication-target-expansion-refusal-v1');
  fact(broadened.status !== 0, 'Active target expansion was accepted');
  receipt.checks.push('missing-authority-unrelated-profile-and-target-expansion-refused');
  const final = state(root), finalIteration = final.iterations.find(item => item.id === final.activeIterationId);
  fact(final.successfulDeliveries === 15 && final.startedAt === before.startedAt &&
    finalIteration.startedAt === iteration.startedAt && hash(final.obligations) === hash(before.obligations),
    'Refused commands changed retained clock, count or debt');
  receipt.identity = { runId: before.runId, startedAt: before.startedAt, iterationId: iteration.id,
    iterationStartedAt: iteration.startedAt, successfulDeliveries: final.successfulDeliveries,
    beforeEventsSeq: before.eventsSeq, afterEventsSeq: final.eventsSeq,
    priorCandidateId: candidate.id, priorManifestSha256: originalManifestSha256,
    priorPlatforms: iteration.profile.publication.platforms, selectedPlatforms: finalIteration.profile.publication.platforms };
  receipt.complete = true;
} catch (error) {
  receipt.failure = { message: error.message };
  process.exitCode = 1;
} finally {
  receipt.finishedAt = new Date().toISOString();
  fs.writeFileSync(receiptPath, JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  console.log(JSON.stringify({ complete: receipt.complete, receiptPath, checks: receipt.checks, failure: receipt.failure }));
}
