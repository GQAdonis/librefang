import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repository = 'Prometheus-AGS/the-boss';
const runId = '38084557578';
const tag = 'boss-tools-approval-repair-20261010-95719eae';
const source = '95719eaefc491e6d19c84ed7bf0b7d62632d8d0b';
const producer = '0fa0b73a849b96494e1b891eeb7f461ec06476ee';
const boss = '/Users/gqadonis/Projects/prometheus/worktrees/afc-c16-team-guidance';
const stage = '/var/folders/ln/0wnpd96j26z2qhvx9m6hwt2r0000gn/T/boss-integrated-publisher-EkroF9';
const platforms = ['darwin-arm64', 'win32-x64'];
const receipts = path.dirname(fileURLToPath(import.meta.url));
const receiptPath = path.join(receipts, 'repaired-bossfang-two-platform-publication-20261010.json');
const gh = args => execFileSync('gh', args, { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const run = JSON.parse(gh(['run', 'view', runId, '--repo', repository, '--json', 'status,conclusion,headSha,jobs']));
const producedJobs = platforms.map(platform => run.jobs.find(job => job.name === `Native tools (${platform})`));
if (run.headSha !== producer || producedJobs.some(job => !job ||
  !job.steps.some(step => step.name === 'Build final native tool payload' && step.conclusion === 'success') ||
  !job.steps.some(step => step.name.includes('upload-artifact') && step.conclusion === 'success')))
  throw new Error('Both exact native compile and artifact-upload steps must succeed before publication.');
// Post-build cache saving does not produce or change the uploaded native bytes.
const output = path.join(stage, 'build', 'repaired-bossfang', runId);
if (!fs.existsSync(output)) gh(['run', 'download', runId, '--repo', repository, '--pattern', 'native-tools-*', '--dir', output]);
const manifest = JSON.parse(fs.readFileSync(path.join(boss, 'build/integration-artifacts.json'), 'utf8'));
const tool = manifest.tools.find(item => item.name === 'bossfang');
const assets = [];
const selected = [];
for (const platform of platforms) {
  const dir = path.join(output, `native-tools-${platform}`);
  const record = JSON.parse(fs.readFileSync(path.join(dir, `tools-${platform}.json`), 'utf8'))
    .find(item => item.name === 'bossfang' && item.platform === platform);
  if (record?.source?.repository !== 'GQAdonis/librefang' || record.source.revision !== source)
    throw new Error(`Native producer mismatch: ${platform}`);
  const file = path.join(dir, record.asset);
  const bytes = fs.readFileSync(file);
  if (bytes.length !== record.size || hash(bytes) !== record.sha256) throw new Error(`Native bytes mismatch: ${platform}`);
  const { name, version, platform: ignoredPlatform, asset, ...pkg } = record;
  tool.version = version;
  tool.packages[platform] = { ...pkg, url: `https://github.com/${repository}/releases/download/${tag}/${asset}` };
  assets.push(file);
  selected.push({ platform, asset, sha256: record.sha256, size: record.size, source: record.source });
}
manifest.sources.bossfang = {
  repository: 'GQAdonis/librefang', revision: source,
  platformRevisions: Object.fromEntries(Object.entries(tool.packages).map(([platform, pkg]) => [platform, pkg.source.revision]))
};
const manifestPath = path.join(output, 'integration-artifacts.json');
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
const receipt = { schemaVersion: 1, kind: 'repaired-bossfang-two-platform-publication',
  recordedAt: new Date().toISOString(), status: 'intent-recorded', runId, producer, source, tag,
  selected, manifestPath, manifestSha256: hash(fs.readFileSync(manifestPath)),
  retainedOtherToolUrls: true, deferredPlatformsUploaded: false, installerPublication: false,
  observedRun: { status: run.status, conclusion: run.conclusion,
    jobs: producedJobs.map(job => ({ name: job.name, status: job.status, conclusion: job.conclusion,
      successfulProductionSteps: job.steps.filter(step => step.name === 'Build final native tool payload' ||
        step.name.includes('upload-artifact')).map(step => ({ name: step.name, conclusion: step.conclusion })) })) } }; 
fs.writeFileSync(receiptPath, JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
try {
  gh(['release', 'create', tag, ...assets, manifestPath, '--repo', repository, '--latest=false',
    '--target', producer, '--title', 'The Boss repaired BossFang customer-platform payload',
    '--notes', 'Repaired embedded dashboard approval revision for Mac Apple Silicon and Windows x64. Other tools retain their original immutable URLs and provenance. This is a native payload, not an installer release.']);
  const published = JSON.parse(gh(['release', 'view', tag, '--repo', repository, '--json', 'url,assets,tagName']));
  for (const item of selected) {
    const asset = published.assets.find(value => value.name === item.asset);
    if (!asset || asset.size !== item.size) throw new Error(`Published asset size mismatch: ${item.platform}`);
  }
  receipt.status = 'published';
  receipt.releaseUrl = published.url;
  receipt.assets = published.assets.map(item => ({ name: item.name, size: item.size, url: item.url, apiUrl: item.apiUrl }));
} catch (error) {
  receipt.status = 'reconcile-required';
  receipt.error = error.message;
  process.exitCode = 1;
} finally {
  receipt.finishedAt = new Date().toISOString();
  fs.writeFileSync(receiptPath, JSON.stringify(receipt, null, 2) + '\n');
  console.log(JSON.stringify({ status: receipt.status, receiptPath, releaseUrl: receipt.releaseUrl }));
}
