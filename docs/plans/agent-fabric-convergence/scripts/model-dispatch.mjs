#!/usr/bin/env node
// Resolve an AFC task against canonical KBD and its OpenSpec mirror before launch.
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const policy = JSON.parse(readFileSync(resolve(root, 'model-dispatch.json'), 'utf8'));
const args = process.argv.slice(2);
const command = args[0] || 'resolve';
const option = (name) => {
  const at = args.indexOf(name);
  return at < 0 ? null : args[at + 1];
};
const taskId = option('--task');
const harness = option('--harness') || 'codex';
const promptFile = option('--prompt-file');
const exact = args.includes('--exact-model');

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(2);
}

if (!['resolve', 'launch', 'list'].includes(command)) fail('Use resolve, launch, or list.');
if (!Object.hasOwn(policy.harnesses, harness)) fail(`Unknown harness: ${harness}`);

const status = JSON.parse(execFileSync('prometheus', ['kbd', '--path', root, 'status', '--json'], {
  encoding: 'utf8', maxBuffer: 16 * 1024 * 1024,
}));
const phase = status.phases['agent-fabric-convergence'];
if (!phase) fail('Canonical AFC phase is unavailable.');
const packages = JSON.parse(readFileSync(resolve(root, 'work-packages.json'), 'utf8')).changes;
const byId = new Map(packages.flatMap((change) => change.tasks.map((task) => [task.id, { change, task }])));

function route(id) {
  const item = byId.get(id);
  const kind = policy.tasks[id];
  if (!item || !kind) fail(`No model policy for task ${id}.`);
  const canonicalChange = phase.changes[item.change.slug];
  const canonicalTask = canonicalChange?.tasks?.[id];
  if (!canonicalTask) fail(`Canonical KBD task ${id} is unavailable.`);
  const openSpec = readFileSync(resolve(root, 'openspec/changes', item.change.slug, 'tasks.md'), 'utf8');
  const mirror = openSpec.split('\n').find((line) => line.includes(`Initiative task: ${id}.`));
  if (!mirror) fail(`OpenSpec mirror for ${id} is unavailable.`);
  const mirrorDone = /^- \[x\]/.test(mirror);
  const canonicalDone = canonicalTask.status === 'complete';
  if (mirrorDone !== canonicalDone) fail(`${id} completion differs between KBD and OpenSpec; reconcile before dispatch.`);
  const preferred = policy.policy[kind];
  let chosen = policy.harnesses[harness][kind];
  let launchHarness = harness;
  let reason = 'native harness model';
  if (exact || !chosen) {
    chosen = preferred;
    launchHarness = 'codex';
    reason = exact ? 'exact preferred model requested' : 'no verified native task route; external Codex agent';
  }
  const argv = {
    codex: ['codex', 'exec', '--model', chosen],
    'claude-code': ['claude', '--model', chosen, '--print'],
    opencode: ['opencode', 'run', '--model', chosen],
    'kimi-code': ['kimi', '--model', chosen, '--prompt'],
  }[launchHarness];
  if (!argv) fail(`No supported launch contract for ${launchHarness}.`);
  return {
    taskId: id, changeId: item.change.slug, openSpecTaskId: item.task.openSpecTaskId,
    canonicalStatus: canonicalTask.status, openSpecStatus: mirrorDone ? 'complete' : 'pending',
    class: kind, preferredModel: preferred, requestedHarness: harness,
    launchHarness, model: chosen, reason, argv,
    note: 'Model catalog presence is not authentication or inference proof. Do not advance KBD/OpenSpec from this receipt.',
  };
}

if (command === 'list') {
  const remaining = Object.keys(policy.tasks).map(route).filter((result) => result.canonicalStatus !== 'complete');
  process.stdout.write(JSON.stringify(remaining, null, 2) + '\n');
  process.exit(0);
}

const selected = taskId || status.activePath?.taskId;
if (!selected) fail('No active task. Supply --task Cxx.y.');
const result = route(selected);
if (result.canonicalStatus === 'complete') fail(`${selected} is already complete.`);
if (command === 'resolve') {
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  process.exit(0);
}
if (!promptFile) fail('launch requires --prompt-file with an explicit task handoff.');
const prompt = readFileSync(resolve(promptFile), 'utf8');
if (!prompt.trim()) fail('Prompt file is empty.');
const child = spawnSync(result.argv[0], [...result.argv.slice(1), prompt], {
  cwd: process.cwd(), stdio: 'inherit', shell: false,
});
if (child.error) fail(`Launch failed: ${child.error.message}`);
process.exit(child.status ?? 1);
