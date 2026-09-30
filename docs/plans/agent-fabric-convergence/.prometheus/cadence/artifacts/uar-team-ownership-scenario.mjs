import { randomUUID } from 'node:crypto'
import { mkdtempSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'

async function request(evaluate, route, input) {
  const result = await evaluate(`(async () => {
    const result = await window.api.ipcApi.request(${JSON.stringify(route)}, ${JSON.stringify(input)});
    return result.ok ? {ok:true,data:result.data} : {ok:false,error:result.error};
  })()`)
  if (!result?.ok) throw new Error(`${route}: ${JSON.stringify(result?.error ?? 'no response')}`)
  return result.data
}

async function expectFailure(evaluate, route, input) {
  const result = await evaluate(`(async () => {
    const result = await window.api.ipcApi.request(${JSON.stringify(route)}, ${JSON.stringify(input)});
    return result.ok ? {ok:true,data:result.data} : {ok:false,error:result.error};
  })()`)
  if (result?.ok) throw new Error(`${route} accepted a stale revision`)
  return result.error
}

async function waitFor(evaluate, signal, expression, description) {
  const deadline = Date.now() + 30_000
  while (Date.now() < deadline) {
    signal.throwIfAborted()
    if (await evaluate(expression)) return
    await delay(200, undefined, { signal })
  }
  throw new Error(`${description} did not appear in the installed app`)
}

export default async function run({ evaluate, signal }) {
  signal.throwIfAborted()
  const directory = mkdtempSync(path.join(os.tmpdir(), 'boss-c09-ownership-'))
  const created = await evaluate(`(async () => window.api.dataApi.request({
    id:${JSON.stringify(randomUUID())},method:'POST',path:'/agent-workspaces',
    body:{path:${JSON.stringify(directory)},name:'Cadence team ownership'}
  }))()`)
  if (created?.error || !created?.data?.id) throw new Error('Could not create a Boss workspace')
  const workspaceId = created.data.id
  const binding = await request(evaluate, 'prometheus.uar.teams.setup_starter', { workspaceId })
  if (binding.activationSupported) throw new Error('Starter team unexpectedly advertises execution')
  const snapshot = await request(evaluate, 'prometheus.uar.teams.snapshot', { workspaceId })
  if (!snapshot.capabilities.planning || !snapshot.capabilities.ownership || !snapshot.capabilities.mailbox) {
    throw new Error('Packaged UAR did not advertise C09.2 ownership and mailbox capabilities')
  }
  const definition = snapshot.definitions.find((item) => item.package.digest === binding.package.digest)
  if (!definition) throw new Error('The current starter team definition is missing')
  const team = await request(evaluate, 'prometheus.uar.teams.create', {
    workspaceId, commandId: randomUUID(), deploymentBindingId: binding.id,
    teamDefinition: { id: definition.id, version: definition.version, digest: definition.digest },
    input: { brief: 'Assign and message a bounded local team' }, memberSlots: [{ role: 'worker', count: 2 }]
  })
  const workers = team.members.filter((member) => member.role === 'worker')
  const coordinator = team.members.find((member) => member.role === 'coordinator')
  if (workers.length !== 2 || !coordinator) throw new Error('Versioned starter team did not create two workers')
  const taskId = randomUUID()
  const planned = await request(evaluate, 'prometheus.uar.teams.add_task', {
    workspaceId, teamInstanceId: team.id, taskId, commandId: randomUUID(),
    expectedTeamRevision: team.revision, title: 'Deliver the assigned work', role: 'worker',
    input: { brief: 'Prepare one local increment' }, outputContract: { type: 'object' }, dependsOn: []
  })
  const initial = planned.tasks.find((item) => item.id === taskId)
  if (initial?.status !== 'ready') throw new Error('A task without dependencies is not ready')
  const command = (state, memberId) => ({
    workspaceId, teamInstanceId: team.id, taskId, commandId: randomUUID(),
    expectedTeamRevision: state.revision,
    expectedTaskRevision: state.tasks.find((item) => item.id === taskId).revision,
    memberId
  })
  const claimed = await request(evaluate, 'prometheus.uar.teams.claim_task', command(planned, workers[0].id))
  const firstClaim = claimed.tasks.find((item) => item.id === taskId)
  if (firstClaim.assigneeMemberId !== workers[0].id || firstClaim.ownershipEpoch !== 1 ||
      firstClaim.assignmentAuthority?.canExecute !== false || firstClaim.assignmentAuthority?.canUseTools !== false) {
    throw new Error('Claim did not persist a fenced, non-executable assignment')
  }
  const stale = await expectFailure(evaluate, 'prometheus.uar.teams.reassign_task', command(planned, workers[1].id))
  const reassigned = await request(evaluate, 'prometheus.uar.teams.reassign_task', command(claimed, workers[1].id))
  const secondClaim = reassigned.tasks.find((item) => item.id === taskId)
  if (secondClaim.assigneeMemberId !== workers[1].id || secondClaim.ownershipEpoch !== 2 ||
      secondClaim.assignmentAuthority?.memberId !== workers[1].id ||
      secondClaim.assignmentAuthority?.ownershipEpoch !== 2) {
    throw new Error('Reassignment did not fence the old owner')
  }
  const reviewed = await request(evaluate, 'prometheus.uar.teams.assign_reviewer', command(reassigned, coordinator.id))
  if (reviewed.tasks.find((item) => item.id === taskId)?.reviewerMemberId !== coordinator.id) {
    throw new Error('Independent reviewer assignment was not saved')
  }
  const messageCommandId = randomUUID()
  const sent = await request(evaluate, 'prometheus.uar.teams.mailbox_send', {
    workspaceId, teamInstanceId: team.id, commandId: messageCommandId,
    recipientMemberId: workers[1].id, mode: 'trigger-turn', content: 'Please review the assigned work.'
  })
  const replay = await request(evaluate, 'prometheus.uar.teams.mailbox_send', {
    workspaceId, teamInstanceId: team.id, commandId: messageCommandId,
    recipientMemberId: workers[1].id, mode: 'trigger-turn', content: 'Please review the assigned work.'
  })
  if (sent.status !== 'accepted' || replay.messageId !== sent.messageId || sent.deliveredAt || sent.processedAt) {
    throw new Error('Mailbox did not distinguish durable acceptance from delivery or execution')
  }
  const messages = await request(evaluate, 'prometheus.uar.teams.mailbox_list', { workspaceId, teamInstanceId: team.id })
  if (messages.messages.filter((item) => item.messageId === sent.messageId).length !== 1) {
    throw new Error('The accepted mailbox message was duplicated or missing')
  }
  const restart = await request(evaluate, 'prometheus.integration.start', { action: 'uar-restart' })
  const deadline = Date.now() + 90_000
  let restartStatus
  while (Date.now() < deadline) {
    signal.throwIfAborted()
    const state = await request(evaluate, 'prometheus.integration.snapshot', {})
    restartStatus = state.operations.find((item) => item.id === restart.id)?.status
    if (restartStatus === 'succeeded') break
    if (['failed', 'cancelled', 'interrupted'].includes(restartStatus)) throw new Error(`UAR restart ${restartStatus}`)
    await delay(250, undefined, { signal })
  }
  if (restartStatus !== 'succeeded') throw new Error('UAR restart did not finish')
  const recovered = await request(evaluate, 'prometheus.uar.teams.snapshot', { workspaceId })
  const restored = recovered.instances.find((item) => item.id === team.id)?.tasks.find((item) => item.id === taskId)
  const restoredMailbox = await request(evaluate, 'prometheus.uar.teams.mailbox_list', { workspaceId, teamInstanceId: team.id })
  if (restored?.assigneeMemberId !== workers[1].id || restored?.ownershipEpoch !== 2 ||
      restored?.reviewerMemberId !== coordinator.id ||
      restoredMailbox.messages.find((item) => item.messageId === sent.messageId)?.status !== 'accepted') {
    throw new Error('Ownership or mailbox receipt did not survive sidecar restart')
  }
  await waitFor(evaluate, signal, `(() => {
    const button = [...document.querySelectorAll('button')].find((item) => item.innerText.trim() === 'Set up later');
    if (!button) return false; button.click(); return true;
  })()`, 'Skip onboarding')
  await waitFor(evaluate, signal, `Boolean(document.querySelector('#app-sidebar'))`, 'Main app sidebar')
  await request(evaluate, 'navigation.open_route_in_main', { path: '/settings/uar?panel=teams' })
  await waitFor(evaluate, signal, `(() => {
    const button = document.querySelector('button[aria-label="Workspace"]');
    if (!button) return false; button.click(); return true;
  })()`, 'Workspace selector')
  await waitFor(evaluate, signal, `(() => {
    const option = [...document.querySelectorAll('[role="option"]')].find((item) => item.innerText.includes('Cadence team ownership'));
    if (!option) return false; option.click(); return true;
  })()`, 'Team workspace')
  await waitFor(evaluate, signal, `(() => {
    const button = document.querySelector('button[aria-label="Choose a team instance"]');
    if (!button) return false; button.click(); return true;
  })()`, 'Team instance selector')
  await waitFor(evaluate, signal, `(() => {
    const option = [...document.querySelectorAll('[role="option"]')].find((item) => item.innerText.includes(${JSON.stringify(team.id)}));
    if (!option) return false; option.click(); return true;
  })()`, 'Saved team instance')
  await waitFor(evaluate, signal, `document.body.innerText.includes('Deliver the assigned work') &&
    document.body.innerText.includes('Team mailbox') && document.body.innerText.includes('Please review the assigned work.')`,
    'Ownership board and mailbox in Teams settings')
  return {
    passed: true,
    observedBehavior: `Packaged Boss claimed and reassigned task ${taskId} (epoch 1→2), rejected stale revision, saved reviewer and one accepted mailbox message, restarted UAR, then displayed the recovered team board and mailbox. Stale error: ${JSON.stringify(stale)}.`
  }
}
