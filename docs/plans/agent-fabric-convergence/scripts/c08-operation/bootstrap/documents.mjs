import { createHash } from 'node:crypto';

const profile = 'urn:prometheus:uar:collaboration:0.1.0-draft.2';
const sha = value => `sha256:${createHash('sha256').update(value).digest('hex')}`;
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
  return value;
}
export function sealDocument(value) {
  const { contentDigest, ...rest } = value;
  return { ...rest, contentDigest: sha(JSON.stringify(canonical(rest))) };
}
const sealed = sealDocument;
export function registrationDocuments(workspace, runtimeId, modelId) {
  const provenance = { source: 'C08 disposable operation bootstrap', authors: ['Prometheus-AGS'] };
  const common = { profile, version: '1.0.0', provenance, requiredCapabilities: [], extensions: {} };
  const id = `urn:uar:c08:${workspace}/observer`;
  const sourceDescriptor = { instructions: 'Observe the delivered authorized text. Reply briefly. Do not publish, forward, or invoke tools.' };
  const limits = { concurrentTurns: 1, maxMembers: 1, maxDepth: 0, maxPendingTasks: 8 };
  const optional = { required: false, value: {} };
  const agent = sealed({ ...common, kind: 'AgentDefinition', id, title: 'C08 scoped observer', role: 'observer',
    whenToUse: 'Consume an admitted channel observation.', instructions: sourceDescriptor.instructions,
    input: { type: 'string' }, output: { type: 'string' }, skills: [],
    models: [{ role: 'primary', capabilities: ['text'], preferredAliases: ['c08-model'] }],
    permittedChildren: [], context: { mode: 'none', artifacts: [], history: 'none', memoryScopes: [] }, requestedLimits: limits,
    sourceIdentity: { profile: 'c08.bootstrap-definition/1', id, version: '1.0.0', digest: sha(JSON.stringify(sourceDescriptor)), revision: null },
    renameMapping: { sourceId: id, targetId: id, reason: 'unchanged' }, authoredFields: [],
    modelRequirements: { required: true, value: { capabilities: ['text'] } }, promptDialect: optional,
    ragConfiguration: optional, contextStrategy: optional, apiHarness: optional, legacySections: {}, sourceDescriptor });
  const agentText = JSON.stringify(agent);
  const reference = { id, version: agent.version, digest: agent.contentDigest };
  const manifest = sealed({ ...common, kind: 'PackageManifest', id: `urn:uar:c08:${workspace}/package`,
    entrypoints: [reference], files: [{ path: 'observer.json', kind: 'AgentDefinition', definition: reference, byteDigest: sha(agentText) }],
    lock: [], capabilityDeclarations: [], resolution: 'exact-version-and-digest' });
  const packageRef = { id: manifest.id, version: manifest.version, digest: manifest.contentDigest };
  const packageRequest = { commandId: `${workspace}-package`, manifest: JSON.stringify(manifest), files: { 'observer.json': agentText } };
  const bindings = Object.fromEntries(['A', 'B', 'Denied'].map(name => {
    const binding = sealed({ ...common, kind: 'DeploymentBinding', id: `urn:uar:c08:${workspace}/binding-${name.toLowerCase()}`,
      exportClass: 'private-installed-state', package: packageRef, ownerId: 'v1:s:9:c08-owner', workspaceId: workspace,
      runtimeInstanceId: runtimeId, revision: 1,
      modelBindings: [{ requestedAlias: 'c08-model', providerId: 'c08-liter', modelId, credentialRef: 'protected-credential://c08/liter' }],
      skillBindings: [], storage: { backend: 'surreal', connectionRef: 'protected-connection://c08/uar', durableTransactions: true },
      policyRevision: 'c08-disposable:1', effectiveLimits: limits,
      effectiveBudget: { maxTokens: 4096, maxCostMicrounits: 1000000, currency: 'USD', maxElapsedSeconds: 180 },
      contextGrants: [], representationGrantRefs: [], effectiveBindingReceiptRef: null, status: 'active' });
    return [name, { commandId: `${workspace}-binding-${name.toLowerCase()}`, binding }];
  }));
  return { packageRequest, bindings };
}

export function gatePolicy() {
  const actions = ['source-disclosure', 'recipient-delivery', 'handler-execution', 'scoped-reply', 'route-reassignment'].map(name => `afc.channel:${name}/1`);
  return { id: 'c08-disposable-channel-effects', enabled: true,
    policy_text: `permit(principal == Service::"c08-host", action in [${actions.map(name => `Action::"${name}"`).join(', ')}], resource);`,
    schema_json: { '': { entityTypes: { Service: {}, Route: {} }, actions: Object.fromEntries(actions.map(name => [name,
      { appliesTo: { principalTypes: ['Service'], resourceTypes: ['Route'], context: { type: 'Record', attributes: {} } } }])) } } };
}
