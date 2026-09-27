import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const initiative = path.resolve(here, '../../../..');
const readJson = (file) => JSON.parse(fs.readFileSync(path.join(here, file), 'utf8'));
const fail = (message) => {
  throw new Error(message);
};

const vocabulary = readJson('identity-state-action-vocabulary-v1.json');
const matrix = readJson('dependency-compatibility-matrix-v1.json');
const checkpoints = readJson('adoption-rollback-checkpoints-v1.json');
const contract = readJson('convergence-contract-v1.json');
const manifest = JSON.parse(fs.readFileSync(path.join(initiative, 'repository-manifest.json'), 'utf8'));
const recommendations = JSON.parse(fs.readFileSync(path.join(initiative, 'recommendations.json'), 'utf8'));
const workPackages = JSON.parse(fs.readFileSync(path.join(initiative, 'work-packages.json'), 'utf8'));

if (vocabulary.schemaVersion !== 'afc.identity-state-action.v1') fail('unexpected vocabulary schema');
if (matrix.schemaVersion !== 'afc.dependency-compatibility-matrix.v1') fail('unexpected matrix schema');
if (checkpoints.schemaVersion !== 'afc.adoption-rollback-checkpoints.v1') fail('unexpected checkpoint schema');
if (contract.schemaVersion !== 'afc.convergence-contract.v1') fail('unexpected umbrella contract schema');

const unique = (values, label) => {
  const duplicates = values.filter((value, index) => values.indexOf(value) !== index);
  if (duplicates.length) fail(`${label} contains duplicates: ${[...new Set(duplicates)].join(', ')}`);
};

unique(vocabulary.identities.map((item) => item.term), 'identity vocabulary');
unique(vocabulary.actions.map((item) => item.term), 'action vocabulary');

const expectedRepositories = manifest.repositories.map((item) => item.name).sort();
const actualRepositories = matrix.repositories.map((item) => item.name).sort();
if (JSON.stringify(expectedRepositories) !== JSON.stringify(actualRepositories)) {
  fail(`matrix repository set differs from manifest\nexpected=${expectedRepositories}\nactual=${actualRepositories}`);
}

for (const row of matrix.repositories) {
  for (const key of ['observedAt', 'revision', 'anchorKind', 'evidenceAnchors', 'boundaryTypes', 'capability', 'capabilityDisposition', 'compatibilityStatus', 'checkpointStatus', 'unresolvedIncompatibility', 'adoptionOwner', 'rollbackAnchor']) {
    if (row[key] === undefined || row[key] === null && key !== 'externalCheckpoint') fail(`${row.name} missing ${key}`);
  }
  if (!row.boundaryTypes.length) fail(`${row.name} has no boundary type`);
  if (!row.evidenceAnchors.length) fail(`${row.name} has no evidence anchor`);
}

const eventId = vocabulary.identities.find((item) => item.term === 'EventId');
if (!eventId || eventId.versionedBy.length) fail('EventId must remain independent of event sequence and projection cursor');
for (const term of ['EventSequence', 'ProjectionCursor']) {
  if (!vocabulary.identities.some((item) => item.term === term)) fail(`${term} is absent from the vocabulary`);
}
if (JSON.stringify(vocabulary.states.attempt) !== JSON.stringify(['admitted', 'running', 'settled', 'interrupted', 'uncertain'])) fail('attempt state vocabulary differs from the accepted runtime snapshot contract');
if (!contract.precedence?.some((item) => item.higher === 'p1-contract-checkpoint.json')) fail('umbrella contract does not declare P1 checkpoint precedence');

const orders = checkpoints.adoption.map((item) => item.order);
if (JSON.stringify(orders) !== JSON.stringify(orders.map((_, index) => index + 1))) fail('adoption order is not contiguous');
unique(checkpoints.adoption.map((item) => item.id), 'adoption checkpoint IDs');
if (checkpoints.rollback.order !== 'reverse-dependency-order' || checkpoints.rollback.steps.length < 8) fail('rollback contract is incomplete');

const adoptionOrder = new Map();
for (const checkpoint of checkpoints.adoption) {
  for (const change of checkpoint.changes) {
    if (adoptionOrder.has(change)) fail(`${change} is assigned to more than one adoption checkpoint`);
    adoptionOrder.set(change, checkpoint.order);
  }
}
for (const change of workPackages.changes) {
  const order = adoptionOrder.get(change.id);
  if (!order) fail(`${change.id} is absent from the adoption checkpoints`);
  for (const dependency of change.dependsOn) {
    if ((adoptionOrder.get(dependency) ?? Number.POSITIVE_INFINITY) >= order) {
      fail(`${change.id} is not ordered after dependency ${dependency}`);
    }
  }
}

for (const id of ['REC-007', 'REC-011', 'REC-012', 'REC-042']) {
  const item = recommendations.recommendations.find((candidate) => candidate.id === id);
  if (!item?.implemented) fail(`${id} is not marked implemented in the C01 recommendation register`);
}

for (const file of [
  'convergence-contract-v1.md',
  'identity-state-action-vocabulary-v1.md',
  'dependency-compatibility-matrix-v1.md',
  'adoption-rollback-checkpoints-v1.md'
]) {
  if (!fs.readFileSync(path.join(here, file), 'utf8').trim()) fail(`${file} is empty`);
}

console.log(JSON.stringify({
  result: 'PASS',
  contractVersion: '1.0.0',
  repositories: actualRepositories.length,
  identities: vocabulary.identities.length,
  actions: vocabulary.actions.length,
  adoptionCheckpoints: checkpoints.adoption.length,
  rollbackSteps: checkpoints.rollback.steps.length,
  recommendations: ['REC-007', 'REC-011', 'REC-012', 'REC-042']
}, null, 2));
