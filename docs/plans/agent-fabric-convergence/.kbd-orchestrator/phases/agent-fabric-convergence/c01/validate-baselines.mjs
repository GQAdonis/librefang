import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../../..');
const read = (file) => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const prefix = '.kbd-orchestrator/phases/agent-fabric-convergence/c01/';
const ledger = read('baseline-ledger.json');
const refresh = read(prefix + 'repository-refresh.json');
const evidence = read(prefix + 'source-receipts.json');
const dispositions = read(prefix + 'recommendation-dispositions.json');
const recommendations = read('recommendations.json');
const inventory = read(prefix + 'dependency-inventory.json');
const errors = [];
const check = (condition, message) => { if (!condition) errors.push(message); };
const hash = (text) => crypto.createHash('sha256').update(text).digest('hex');
const repositories = new Map(refresh.repositories.map(r => [r.name, r]));
const evidenceIds = new Set(evidence.records.map(e => e.id));
check(ledger.repositories.length === 11 && repositories.size === 11, 'Expected 11 repositories');
check(new Set(ledger.repositories.map(r => r.repository)).size === 11, 'Duplicate ledger repository');
check(dispositions.recommendations.length === 61, 'Expected 61 dispositions');
check(new Set(dispositions.recommendations.map(r => r.id)).size === 61, 'Duplicate disposition');
for (const row of ledger.repositories) {
  const repo = repositories.get(row.repository);
  check(Boolean(repo?.fetch.ok), `Fetch failed: ${row.repository}`);
  check(!row.implementationReady && !row.owner.agreementAccepted, `Unfounded readiness: ${row.repository}`);
  check(row.blockingDependencies.length > 0 && row.sourceEvidence.length > 0, `Missing ownership/evidence: ${row.repository}`);
  check(fs.existsSync(path.join(root, row.acceptanceReference)), `Missing acceptance: ${row.repository}`);
  if (!repo) continue;
  const git = args => execFileSync('git', args, { cwd: repo.worktree, encoding: 'utf8', maxBuffer: 30e6 }).trim();
  check(git(['branch', '--show-current']) === 'codex/agent-fabric-convergence', `Wrong branch: ${repo.name}`);
  try { git(['merge-base', '--is-ancestor', row.planningBaseline, 'HEAD']); }
  catch { errors.push(`Baseline ancestry changed: ${repo.name}`); }
  if (repo.name !== 'librefang') check(git(['status', '--porcelain']) === '', `Convergence product checkout dirty: ${repo.name}`);
}
for (const item of dispositions.recommendations) {
  const original = recommendations.recommendations.find(r => r.id === item.id);
  check(original?.change === item.change && original?.acceptance === item.acceptance, `Acceptance drift: ${item.id}`);
  check(['retained', 'superseded', 'externally-owned', 'unresolved'].includes(item.disposition), `Invalid disposition: ${item.id}`);
  check(item.evidence.length > 0 && item.evidence.every(id => evidenceIds.has(id)), `Missing evidence: ${item.id}`);
  check(!item.implemented && !item.runtimeVerified && !item.owner.fileClaimAccepted, `False completion: ${item.id}`);
  check(fs.existsSync(path.join(root, item.acceptanceReference)), `Missing acceptance file: ${item.id}`);
}
for (const item of evidence.records) {
  const repo = repositories.get(item.repository);
  const content = execFileSync('git', ['show', item.commit + ':' + item.path], { cwd: repo.worktree, encoding: 'utf8', maxBuffer: 30e6 });
  check(hash(content) === item.sha256, `Source hash mismatch: ${item.id}`);
  const lines = content.split('\n');
  if (item.excerpt !== undefined) check(lines.slice(item.firstLine - 1, item.lastLine).join('\n') === item.excerpt, `Excerpt mismatch: ${item.id}`);
  for (const excerpt of item.excerpts || []) check(lines.slice(excerpt.start - 1, excerpt.end).join('\n') === excerpt.text, `Excerpt range mismatch: ${item.id}`);
}
for (const item of inventory.repositories) {
  const repo = repositories.get(item.repository);
  for (const manifest of item.manifests) {
    const content = execFileSync('git', ['show', item.commit + ':' + manifest.path], { cwd: repo.worktree, encoding: 'utf8', maxBuffer: 30e6 });
    check(hash(content) === manifest.sha256, `Manifest hash mismatch: ${item.repository}/${manifest.path}`);
  }
}
const result = { checkedAt: new Date().toISOString(), repositories: 11, recommendations: 61, sourceReceipts: evidence.records.length, inventoryRepositories: inventory.repositories.length, errors, status: errors.length ? 'FAIL' : 'PASS', limits: 'Validates provenance, coverage, ownership gates and convergence checkout isolation; does not run or certify products.' };
fs.writeFileSync(path.join(here, 'validation.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
process.exitCode = errors.length ? 1 : 0;
