import { randomUUID } from 'node:crypto'
import { requireFact } from './io.mjs'

export async function ipc(evaluate, name, input) {
  const result = await evaluate(`window.api.ipcApi.request(${JSON.stringify(name)}, ${JSON.stringify(input)})`)
  requireFact(result?.ok, 'C14_SUPPORTED_APPLICATION_API_UNAVAILABLE')
  return result.data
}

/** Only ordinary configuration and workspace registration; team operations use Work DOM controls. */
export async function setup(evaluate, configuration) {
  const registered = await evaluate(`window.api.dataApi.request(${JSON.stringify({ id: randomUUID(),
    method: 'POST', path: '/agent-workspaces', body: { path: configuration.workspaceDirectory, name: configuration.workspaceLabel } })})`)
  requireFact(!registered?.error && registered?.data?.id, 'C14_ISOLATED_WORKSPACE_REGISTRATION_UNAVAILABLE')
  const gateway = configuration.gateway
  const credential = process.env[gateway.credentialEnv]
  requireFact(Boolean(credential?.trim()), 'C14_GATEWAY_CREDENTIAL_UNAVAILABLE')
  const initial = await ipc(evaluate, 'prometheus.integration.snapshot', {})
  await ipc(evaluate, 'prometheus.integration.configure', {
    updates: [{ feature: 'services', expectedRevision: initial.revisions.services,
      value: { ...initial.config.services, liter: { ownership: 'external', source: 'manual', endpoint: gateway.endpoint } } }],
    secrets: { literKey: { operation: 'set', value: credential } }
  })
  const catalog = await ipc(evaluate, 'prometheus.liter.catalog.read', {})
  requireFact(catalog.gateway?.operational && catalog.gateway.identity?.gatewayConnectionId,
    'C14_REAL_SELECTED_GATEWAY_UNAVAILABLE')
  const current = await ipc(evaluate, 'prometheus.integration.snapshot', {})
  const providerConnectionId = 'c14-selected-source'
  const gatewayConnectionId = catalog.gateway.identity.gatewayConnectionId
  await ipc(evaluate, 'prometheus.integration.configure', {
    updates: [{ feature: 'services', expectedRevision: current.revisions.services, value: {
      ...current.config.services,
      literConnections: [...current.config.services.literConnections.filter((item) => item.providerConnectionId !== providerConnectionId),
        { providerConnectionId, providerId: gateway.providerId, displayName: 'C14 selected configured source',
          ...(gateway.providerBaseUrl ? { baseUrl: gateway.providerBaseUrl } : {}), enabled: true, timeoutMs: 90000 }],
      literAliases: [...current.config.services.literAliases.filter((item) => item.gatewayConnectionId !== gatewayConnectionId || item.alias !== gateway.alias),
        { gatewayConnectionId, alias: gateway.alias, target: { providerConnectionId, providerId: gateway.providerId,
          modelId: gateway.modelId }, enabled: true, custom: false }]
    } }], secrets: {}
  })
  const sources = await ipc(evaluate, 'prometheus.uar.models.sources', {})
  const source = sources.sources.find((item) => item.source === 'gateway' && item.operational)
  const provider = source?.providers.find((item) => item.enabled && item.models.some((model) => model.enabled && model.id === gateway.alias))
  requireFact(provider, 'C14_SELECTED_CONFIGURED_MODEL_UNAVAILABLE')
  return { workspaceId: registered.data.id, model: { source: 'gateway', providerId: provider.id, modelId: gateway.alias },
    gatewayConnectionId, credentialReference: gateway.credentialEnv }
}
