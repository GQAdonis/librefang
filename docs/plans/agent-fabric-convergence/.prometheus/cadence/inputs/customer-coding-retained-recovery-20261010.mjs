import fs from 'node:fs'
import path from 'node:path'
import { spawn, execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { pathToFileURL } from 'node:url'
import { setTimeout as delay } from 'node:timers/promises'
import { minimalEnvironment } from '/Users/gqadonis/.codex/skills/delivery-cadence/scripts/lib/process.mjs'
import { attach } from '/Users/gqadonis/Projects/prometheus/worktrees/afc-c16-team-guidance/scripts/github-feedback-operation/client.mjs'
import { response, team, workspace } from '/Users/gqadonis/Projects/prometheus/worktrees/afc-c16-team-guidance/scripts/cadence/uar-team-operation-tools.mjs'
import { chooseCodingTeam, click, fill, selectOption, selectWorkspace } from '../../../scripts/c14-operation/controls.mjs'
import { ipc } from '../../../scripts/c14-operation/setup.mjs'
import { digest, repositoryResult, waitFor } from '../../../scripts/c14-operation/io.mjs'
import { candidatePackage, sha256, requireFact } from './corrected-candidate-contract-20261009.mjs'

const initiative = '/Users/gqadonis/Projects/prometheus/worktrees/agent-fabric-c06/librefang/docs/plans/agent-fabric-convergence'
const repository = '/Users/gqadonis/Projects/prometheus/worktrees/afc-c16-team-guidance'
const priorDirectory = path.join(initiative, '.prometheus/cadence/artifacts/customer-corrected-mac-2.2.26',
  'coding-team-proxy-repaired-2-2-26-98a32a91-5172-4cf5-81cf-e9e8dbed1751')
const installationFile = path.join(initiative, '.prometheus/cadence/artifacts',
  'customer-local-mac-2.2.26-48726225-b59c-4ad5-a73e-f8fe0f41af6f/installation.json')
const reopeningReceiptFile = path.join(initiative, '.prometheus/cadence/artifacts/customer-corrected-mac-2.2.26',
  'coding-retained-recovery-355f8c8c-26d0-4f6f-9ca4-979b233bbabf/operation.json')
const previousCancellationTeamId = '9e202453-dafa-47d2-a022-d93d8a2ba845'
const profile = '/var/folders/ln/0wnpd96j26z2qhvx9m6hwt2r0000gn/T/cadence-boss-naUYu8'
const route = name => 'prometheus.uar.teams.' + name
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const save = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { mode: 0o600 })
const code = error => /^[A-Za-z0-9_.:-]{1,160}$/.test(error?.code ?? '') ? error.code : 'C14_RETAINED_OPERATION_UNAVAILABLE'

// Same ownership rule as operate-retained-customer-bossfang: never signal foreign-UID auxiliaries.
function members(pid) {
  return execFileSync('/bin/ps', ['-axo', 'pid=,ppid=,pgid=,uid=,state='], { encoding: 'utf8' }).split('\n')
    .map(line => line.trim().match(/^(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\S+)$/))
    .filter(row => row && Number(row[3]) === pid)
    .map(row => ({ pid: Number(row[1]), parentPid: Number(row[2]), processGroup: Number(row[3]),
      uid: Number(row[4]), state: row[5] }))
}
async function ownedShutdown(child) {
  if (!child?.pid) return { ownedProcessesStopped: true, groupCreated: false }
  const receipt = { pid: child.pid, processGroup: child.pid, startedAt: new Date().toISOString(),
    gracefulQuitConfirmed: false, forceUsed: false, signals: [] }
  const owned = () => members(child.pid).filter(row => row.uid === process.getuid())
  const send = signal => {
    for (const row of owned()) {
      try { process.kill(row.pid, signal); receipt.signals.push({ pid: row.pid, signal }) }
      catch (error) { if (error.code !== 'ESRCH') throw error }
    }
  }
  const stopped = async ms => {
    const deadline = Date.now() + ms
    while (owned().length && Date.now() < deadline) await delay(100)
    return owned().length === 0
  }
  if (owned().some(row => row.pid === child.pid)) {
    try { child.kill('SIGTERM'); receipt.signals.push({ pid: child.pid, signal: 'SIGTERM' }) }
    catch (error) { if (error.code !== 'ESRCH') throw error }
  }
  if (!await stopped(15_000)) {
    send('SIGTERM')
    if (!await stopped(5_000)) { send('SIGKILL'); receipt.forceUsed = true; await stopped(3_000) }
  }
  const remaining = members(child.pid)
  receipt.ownedProcessesStopped = remaining.every(row => row.uid !== process.getuid())
  receipt.foreignUidGroupMembers = remaining.filter(row => row.uid !== process.getuid())
  receipt.remainingOwnedGroupMembers = remaining.filter(row => row.uid === process.getuid())
  receipt.finishedAt = new Date().toISOString()
  return receipt
}

async function workState(evaluate) {
  return evaluate(`(() => {
    const visible=selector=>[...document.querySelectorAll(selector)].filter(n=>n.getClientRects().length);
    return {readyState:document.readyState,sidebar:Boolean(document.querySelector('#app-sidebar')),
      visibleWorkModes:visible('[data-ui~="work-mode-teams"]').map(n=>({pressed:n.getAttribute('aria-pressed')})),
      visibleTeamRoots:visible('[data-ui~="teams-work"]').map(n=>({workspaceId:n.getAttribute('data-workspace-id')})),
      visibleWorkspaceControls:visible('[data-ui~="teams-workspace"]').length,
      visibleRuns:visible('[data-ui~="teams-run"]').map(n=>n.getAttribute('data-team-id'))};
  })()`)
}
async function openRetained(evaluate, signal, selector, reload = false) {
  let previousTimeOrigin, reloadedTimeOrigin
  if (reload) {
    previousTimeOrigin = await evaluate('performance.timeOrigin')
    await evaluate('setTimeout(()=>location.reload(),50);true')
    reloadedTimeOrigin = await waitFor(signal, () => evaluate(`performance.timeOrigin!==${previousTimeOrigin} &&
      document.readyState==='complete' && Boolean(document.querySelector('#app-sidebar')) && performance.timeOrigin`)
      .catch(() => false), 'C14_RETAINED_RENDERER_RELOAD_UNAVAILABLE')
  }
  await waitFor(signal, () => evaluate("Boolean(window.api?.ipcApi && document.querySelector('#app-sidebar'))"),
    'C14_RETAINED_MAIN_NOT_READY')
  const beforeRoute = await workState(evaluate)
  const query = new URLSearchParams({ mode: 'teams', workspaceId: selector.workspaceId,
    teamInstanceId: selector.teamInstanceId })
  await ipc(evaluate, 'navigation.open_route_in_main', { path: '/app/agents?' + query })
  await waitFor(signal, () => evaluate(`(() => {
    const root=[...document.querySelectorAll('[data-ui~="teams-work"]')].find(n=>n.getClientRects().length);
    const button=[...document.querySelectorAll('[data-ui~="teams-workspace"]')].find(n=>n.getClientRects().length);
    return root?.getAttribute('data-workspace-id')===${JSON.stringify(selector.workspaceId)} && Boolean(button&&!button.disabled);
  })()`), 'C14_RETAINED_EXPLICIT_TEAMS_ROUTE_UNAVAILABLE')
  // Exercise the real controls after the actual route has committed, rather than assuming a click navigated.
  await selectWorkspace(evaluate, signal, selector.workspaceId)
  await selectOption(evaluate, signal, '[data-ui~="teams-instance"]',
    `document.querySelector('[role="option"][data-team-id="${selector.teamInstanceId}"]')`,
    'C14_RETAINED_INSTANCE_CONTROL_UNAVAILABLE')
  await waitFor(signal, () => evaluate(`Boolean([...document.querySelectorAll('[data-ui~="teams-run"]')]
    .find(n=>n.getClientRects().length && n.getAttribute('data-team-id')===${JSON.stringify(selector.teamInstanceId)}))`),
    'C14_RETAINED_RUN_NOT_VISIBLE')
  return { previousTimeOrigin, reloadedTimeOrigin, beforeRoute, afterRoute: await workState(evaluate),
    navigation: 'existing typed /app/agents?mode=teams route, followed by ordinary selectors' }
}

async function recover(evaluate, signal, coding, result, persist, remainingOnly) {
  const selectorA = { workspaceId: coding.workspaceId, teamInstanceId: coding.teamId }
  const readA = () => ipc(evaluate, route('execution'), selectorA)
  const artifactsA = () => ipc(evaluate, route('artifacts'), selectorA)
  const expected = fs.readFileSync(path.join(priorDirectory, 'workspace/README.md'), 'utf8')
  requireFact(digest(expected) === coding.repository.sha256, 'C14_RETAINED_README_DIGEST_MISMATCH')
  repositoryResult(path.join(priorDirectory, 'workspace'), expected)
  const snapshot = () => ipc(evaluate, route('snapshot'), { workspaceId: coding.workspaceId })
  if (!remainingOnly) {
    result.stage = 'retained-whole-process-reopen'; persist()
    result.reopening = await openRetained(evaluate, signal, selectorA)
    const state = await snapshot()
    const instance = state.instances.find(item => item.id === coding.teamId)
    requireFact(instance && same(instance.definition, coding.definition) && same(instance.binding, coding.binding) &&
      same(instance.package, coding.package), 'C14_RETAINED_DURABLE_IDENTITY_CHANGED')
    const execution = await readA()
    const expectedAttempts = coding.executionTraces.map(item => item.attemptId).sort()
    requireFact(same(execution.attempts.map(item => item.id).sort(), expectedAttempts), 'C14_RETAINED_REPEATED_OR_LOST_INFERENCE')
    for (const old of coding.attempts) {
      const now = execution.attempts.find(item => item.id === old.id)
      requireFact(now && now.status === old.status && now.executionOutcome === old.executionOutcome &&
        digest(JSON.stringify(now.output)) === old.outputSha256 && same(now.contextArtifactIds, old.contextArtifactIds),
      'C14_RETAINED_SUCCESSFUL_ATTEMPT_CHANGED')
    }
    const artifacts = await artifactsA()
    requireFact(coding.artifacts.every(old => artifacts.artifacts.some(now => now.id === old.id &&
      now.attemptId === old.attemptId && digest(JSON.stringify(now.content)) === old.contentSha256)),
    'C14_RETAINED_ARTIFACT_CHANGED')
    await waitFor(signal, () => evaluate(`(() => {
      const run=[...document.querySelectorAll('[data-ui~="teams-run"]')].find(n=>n.getClientRects().length &&
        n.getAttribute('data-team-id')===${JSON.stringify(coding.teamId)});
      if(!run)return false;
      return ${JSON.stringify(coding.attempts.map(item => item.id))}.every(id=>
        Boolean(run.querySelector('[data-ui~="teams-attempt"][data-attempt-id="'+id+'"]'))) &&
        ${JSON.stringify(coding.artifacts.map(item => item.id))}.every(id=>
          Boolean(run.querySelector('[data-ui~="teams-artifacts"] [data-artifact-id="'+id+'"]')));
    })()`), 'C14_RETAINED_ATTEMPTS_AND_ARTIFACTS_NOT_VISIBLE')
    result.retained = { workspaceId: coding.workspaceId, teamId: coding.teamId,
      attemptIds: expectedAttempts, artifactIds: coding.artifacts.map(item => item.id),
      repository: repositoryResult(path.join(priorDirectory, 'workspace'), expected), firstTurnReplayed: false }
    result.checks.push('same-disposable-profile-whole-process-reopen-preserves-identity-attempts-artifacts-and-readme')

  }
  result.stage = 'read-only-cancellation-through-work'; persist()
  const state = await snapshot()
  const preset = state.definitions.find(item => item.id === coding.definition.id && item.digest === coding.definition.digest)
  const binding = state.bindings.find(item => item.id === coding.binding.id && item.revision === coding.binding.revision)
  requireFact(preset && binding, 'C14_RETAINED_CODING_BINDING_UNAVAILABLE')
  const eligible = (attempt, execution) => ['queued', 'running'].includes(attempt.status) ||
    (attempt.status === 'yielded' && execution.waits?.some(wait => wait.authority.attemptId === attempt.id &&
      ['waiting', 'blocked'].includes(wait.state)) === true)
  let cancelledTeam = remainingOnly && state.instances.find(item => item.id === previousCancellationTeamId)
  let cancelSelector = { workspaceId: coding.workspaceId, teamInstanceId: cancelledTeam?.id }
  let execution = cancelledTeam && await ipc(evaluate, route('execution'), cancelSelector)
  result.previousCancellation = cancelledTeam ? { teamId: cancelledTeam.id,
    attempts: execution.attempts.map(item => ({ id: item.id, status: item.status, cancellable: eligible(item, execution) })) } : null
  if (!cancelledTeam || !execution.attempts.some(item => eligible(item, execution))) {
    await openRetained(evaluate, signal, selectorA)
    await chooseCodingTeam(evaluate, signal, preset, binding)
    const priorIds = new Set(state.instances.map(item => item.id))
    await fill(evaluate, signal, '[data-ui~="teams-prompt"]',
      'Read only README.md and review the delivery marker ' + expected.match(/Delivery marker: ([^\n]+)/)[1] +
        '. Do not write files or perform external effects.', 'C14_RETAINED_CANCEL_PROMPT_UNAVAILABLE')
    await click(evaluate, signal, '[data-ui~="teams-start"]', 'C14_RETAINED_CANCEL_START_UNAVAILABLE')
    cancelledTeam = await waitFor(signal, async () => (await snapshot()).instances.find(item => !priorIds.has(item.id)),
      'C14_RETAINED_CANCEL_INSTANCE_UNAVAILABLE', 60_000, 1000)
    cancelSelector = { workspaceId: coding.workspaceId, teamInstanceId: cancelledTeam.id }
    result.freshReadOnlyTurnsAdmitted = 1
  } else {
    await openRetained(evaluate, signal, cancelSelector)
    result.freshReadOnlyTurnsAdmitted = 0
  }
  const cancelRead = () => ipc(evaluate, route('execution'), cancelSelector)
  const reason = 'Operator-requested read-only retained C14 cancellation'
  const active = await waitFor(signal, async () => {
    const current = await cancelRead()
    result.cancellationObservation = { teamId: cancelledTeam.id,
      attempts: current.attempts.map(item => ({ id: item.id, status: item.status, cancellable: eligible(item, current) })),
      waits: (current.waits ?? []).map(item => ({ id: item.id, state: item.state, attemptId: item.authority.attemptId })) }
    const selected = current.attempts.find(item => eligible(item, current))
    result.cancellationObservation.dom = await evaluate(`(() => {
      const root=[...document.querySelectorAll('[data-ui~="teams-run"]')].find(n=>n.getClientRects().length&&
        n.getAttribute('data-team-id')===${JSON.stringify(cancelledTeam.id)});
      const reason=root?.querySelector('[data-ui~="teams-control-reason"]');
      return {teamVisible:Boolean(root),reasonPresent:Boolean(reason),reasonLength:reason?.value.length??0,
        attempts:[...root?.querySelectorAll('[data-ui~="teams-attempt"]')??[]].map(n=>({
          id:n.getAttribute('data-attempt-id'),status:n.getAttribute('data-status'),
          cancelPresent:Boolean(n.querySelector('[data-ui~="teams-stop-executor"],[data-ui~="teams-cancel"]')),
          renderedCancelDataUi:n.querySelector('[data-ui~="teams-stop-executor"],[data-ui~="teams-cancel"]')?.getAttribute('data-ui'),
          cancelEnabled:Boolean(n.querySelector('[data-ui~="teams-stop-executor"]:not(:disabled),[data-ui~="teams-cancel"]:not(:disabled)'))}))};
    })()`)
    persist()
    if (!selected) {
      if (current.attempts.length && current.attempts.every(item => ['succeeded','failed','cancelled','uncertain'].includes(item.status)))
        requireFact(false, 'C14_RETAINED_TURN_TERMINAL_BEFORE_CANCEL')
      return false
    }
    await fill(evaluate, signal, '[data-ui~="teams-control-reason"]', reason, 'C14_RETAINED_CANCEL_REASON_UNAVAILABLE')
    await evaluate(`(() => {
      const root=[...document.querySelectorAll('[data-ui~="teams-run"]')].find(n=>n.getClientRects().length&&
        n.getAttribute('data-team-id')===${JSON.stringify(cancelledTeam.id)});
      const button=[...root?.querySelectorAll('[data-ui~="uar-team-execution"] button')??[]]
        .find(n=>n.innerText.trim()==='Refresh'&&!n.disabled);
      if(button)button.click();return Boolean(button);
    })()`)
    const clicked = await evaluate(`(() => {
      const root=[...document.querySelectorAll('[data-ui~="teams-run"]')].find(n=>n.getClientRects().length&&
        n.getAttribute('data-team-id')===${JSON.stringify(cancelledTeam.id)});
      const row=root?.querySelector('[data-ui~="teams-attempt"][data-attempt-id="'+${JSON.stringify(selected.id)}+'"]');
      const button=row?.querySelector('[data-ui~="teams-stop-executor"],[data-ui~="teams-cancel"]');
      const reason=root?.querySelector('[data-ui~="teams-control-reason"]');
      if(!button||button.disabled||reason?.value!==${JSON.stringify(reason)})return false;
      button.click();return {attemptId:row.getAttribute('data-attempt-id'),status:row.getAttribute('data-status'),renderedDataUi:button.getAttribute('data-ui'),reasonPresent:true};
    })()`)
    if (clicked) { result.cancelControl = { ...clicked, nativeAttemptId:selected.id, nativeStatus:selected.status }; persist(); return selected }
    return false
  }, 'C14_RETAINED_CANCEL_CONTROL_UNAVAILABLE', 60_000, 500)
  const cancelled = await waitFor(signal, async () => {
    const value = await cancelRead(); const attempt = value.attempts.find(item => item.id === active.id)
    requireFact(!['uncertain', 'succeeded', 'failed'].includes(attempt?.status), 'C14_RETAINED_CANCEL_NOT_CONFIRMED')
    return attempt?.status === 'cancelled' && attempt
  }, 'C14_RETAINED_CANCEL_TERMINAL_UNAVAILABLE', 120_000, 1000)
  result.cancellation = { teamId: cancelledTeam.id, attemptId: active.id, runId: active.runId, status: cancelled.status,
    freshTurnPurpose: 'only missing read-only cancellation operation; original successful inference never replayed' }
  result.cancellation.reopening = await openRetained(evaluate, signal, cancelSelector, true)
  requireFact((await cancelRead()).attempts.some(item => item.id === active.id && item.status === 'cancelled'),
    'C14_RETAINED_CANCEL_STATE_LOST')
  repositoryResult(path.join(priorDirectory, 'workspace'), expected)
  result.checks.push('work-read-only-cancel-and-renderer-reopen-preserve-cancelled-state')

  result.stage = 'second-workspace-isolation-without-inference'; persist()
  const workspaceB = await workspace(evaluate, 'Retained customer isolated team B')
  const teamB = await team(evaluate, workspaceB, coding.selectedModel, 'Second isolated team, no turn admitted')
  const priorA = await readA()
  const stateA = await snapshot()
  const stateB = await ipc(evaluate, route('snapshot'), { workspaceId: workspaceB })
  requireFact(stateA.instances.some(item => item.id === coding.teamId) &&
    !stateA.instances.some(item => item.id === teamB.teamInstanceId) &&
    stateB.instances.some(item => item.id === teamB.teamInstanceId) &&
    !stateB.instances.some(item => item.id === coding.teamId), 'C14_RETAINED_WORKSPACE_EXCLUSION_UNAVAILABLE')
  const refusals = []
  for (const [selector, foreignWorkspace] of [[selectorA, workspaceB], [teamB, coding.workspaceId]]) {
    for (const operation of ['execution', 'artifacts', 'approvals']) {
      const refused = await response(evaluate, route(operation), { ...selector, workspaceId: foreignWorkspace })
      requireFact(refused?.ok === false && Boolean(refused.error), 'C14_RETAINED_FOREIGN_WORKSPACE_READ_NOT_REFUSED')
      refusals.push({ teamInstanceId: selector.teamInstanceId, requestedWorkspaceId: foreignWorkspace, operation, refused: true })
    }
  }
  // A reload fetches the newly registered workspace through the ordinary mounted query.
  result.isolationNavigation = await openRetained(evaluate, signal, teamB, true)
  requireFact(await evaluate(`![...document.querySelectorAll('[data-ui~="teams-run"]')].some(n=>
    n.getClientRects().length && n.getAttribute('data-team-id')===${JSON.stringify(coding.teamId)})`),
  'C14_RETAINED_FOREIGN_RUN_VISIBLE')
  requireFact(same(priorA, await readA()), 'C14_RETAINED_ISOLATION_MUTATED_ORIGINAL_TEAM')
  const executionB = await ipc(evaluate, route('execution'), teamB)
  requireFact(executionB.attempts.length === 0, 'C14_RETAINED_SECOND_WORKSPACE_INFERENCE_ADMITTED')
  result.restoredNavigation = await openRetained(evaluate, signal, selectorA)
  result.isolation = { workspaceA: coding.workspaceId, teamA: coding.teamId, workspaceB, teamB: teamB.teamInstanceId,
    refusals, originalAttemptsUnchanged: true, modelCallsInWorkspaceB: 0 }
  repositoryResult(path.join(priorDirectory, 'workspace'), expected)
  result.checks.push('two-real-workspaces-exclude-foreign-instance-and-refuse-foreign-execution-artifact-approval-reads',
    'workspace-ui-selection-restored-with-original-attempts-and-exact-readme-unchanged')
}

export async function operate({ remainingOnly = false } = {}) {
  requireFact(process.platform === 'darwin' && process.arch === 'arm64', 'C14_RETAINED_MAC_ARM64_REQUIRED')
  const codingFile = path.join(priorDirectory, 'coding-evidence.json')
  const coding = JSON.parse(fs.readFileSync(codingFile, 'utf8'))
  const priorLaunch = JSON.parse(fs.readFileSync(path.join(priorDirectory, 'launch.json'), 'utf8'))
  const installation = JSON.parse(fs.readFileSync(installationFile, 'utf8'))
  const reopeningReceipt = remainingOnly && JSON.parse(fs.readFileSync(reopeningReceiptFile, 'utf8'))
  if (remainingOnly) requireFact(reopeningReceipt.failureCode === 'C14_RETAINED_CANCEL_CONTROL_UNAVAILABLE' &&
    reopeningReceipt.checks.includes('same-disposable-profile-whole-process-reopen-preserves-identity-attempts-artifacts-and-readme') &&
    reopeningReceipt.sourceRefs.appAsarSha256 === installation.appAsarSha256 && reopeningReceipt.isolatedUserData === profile,
  'C14_RETAINED_REOPENING_RECEIPT_MISMATCH')
  candidatePackage(installation)
  requireFact(priorLaunch.isolatedUserData === profile && fs.statSync(profile).isDirectory(), 'C14_RETAINED_PROFILE_MISMATCH')
  requireFact(coding.failureCode === 'C14_WORK_WORKSPACE_MENU_UNAVAILABLE' && coding.checks.length === 6 &&
    coding.failureStage === 'durable-work-reopening', 'C14_RETAINED_FAILURE_PROVENANCE_MISMATCH')
  requireFact(coding.sourceRefs.boss === installation.source && coding.sourceRefs.uar === installation.uarSource &&
    coding.sourceRefs.appAsarSha256 === installation.appAsarSha256 &&
    coding.sourceRefs.sidecarSha256 === installation.sidecarSha256 &&
    coding.sourceRefs.installationReceiptSha256 === sha256(installationFile), 'C14_RETAINED_CANDIDATE_CHANGED')
  requireFact(['UAR_TEAM_EXECUTION_PROFILE_STAGE', 'UAR_WORKFLOW_EXECUTION_PROFILE_STAGE', 'BOSS_C094_PUBLIC_QUALIFICATION']
    .every(name => process.env[name] === undefined), 'C14_RETAINED_NORMAL_PROFILE_REQUIRED')
  const directory = path.join(initiative, '.prometheus/cadence/artifacts/customer-corrected-mac-2.2.26',
    'coding-retained-recovery-' + randomUUID())
  fs.mkdirSync(directory, { mode: 0o700 })
  const receiptPath = path.join(directory, 'operation.json')
  const result = { schemaVersion: 1, kind: 'customer-coding-retained-controls-recovery', status: 'pending',
    startedAt: new Date().toISOString(), sourceRefs: coding.sourceRefs, installationReceipt: installationFile,
    driverSha256: sha256(new URL(import.meta.url)), priorEvidence: { path: codingFile, sha256: sha256(codingFile),
      retainedPassingChecks: coding.checks, failureCode: coding.failureCode, failureStage: coding.failureStage },
    retainedReopening: remainingOnly ? { path: reopeningReceiptFile, sha256: sha256(reopeningReceiptFile),
      checks: reopeningReceipt.checks, repeated: false } : undefined,
    remainingOnly, isolatedUserData: profile, originalUserProfileTouched: false, credentialsRecorded: false,
    firstTurnInferenceReplayed: false, newCadenceDelivery: false, qualificationLedgerMutated: false, checks: [],
    diagnosis: { observation: 'workspace selector missing after renderer reopen; no native execution failure',
      sourceFinding: 'old openWork returns after click, without awaiting Teams root; recovery uses supported explicit Teams route',
      certainty: 'source sequencing gap confirmed; retained UI operation will determine actual reopening behavior' } }
  const persist = () => save(receiptPath, result)
  const controller = new AbortController()
  const abort = () => controller.abort('owned operation cancelled')
  process.once('SIGINT', abort); process.once('SIGTERM', abort)
  const budget = setTimeout(() => controller.abort('bounded retained operation expired'), 600_000)
  let child, connection
  try {
    const activePort = path.join(profile, 'DevToolsActivePort')
    fs.rmSync(activePort, { force: true })
    child = spawn(path.join(installation.app, 'Contents/MacOS/The Boss'),
      ['--lang=en-US', '--remote-debugging-address=127.0.0.1', '--remote-debugging-port=0', `--user-data-dir=${profile}`],
      { cwd: repository, env: minimalEnvironment(['USER']), detached: true, shell: false, stdio: 'ignore' })
    await new Promise((resolve, reject) => { child.once('spawn', resolve); child.once('error', () =>
      reject(Object.assign(new Error('C14_RETAINED_SPAWN_UNAVAILABLE'), { code: 'C14_RETAINED_SPAWN_UNAVAILABLE' }))) })
    result.pid = child.pid; result.stage = 'retained-private-launch'; persist()
    await waitFor(controller.signal, async () => {
      requireFact(child.exitCode === null && child.signalCode === null, 'C14_RETAINED_APP_EXITED')
      if (!fs.existsSync(activePort)) return false
      const port = Number(fs.readFileSync(activePort, 'utf8').split(/\r?\n/)[0])
      if (!Number.isInteger(port) || port < 1 || port > 65535) return false
      try {
        const reply = await fetch(`http://127.0.0.1:${port}/json/list`, {
          signal: AbortSignal.any([controller.signal, AbortSignal.timeout(2000)]) })
        return reply.ok && (await reply.json()).some(item => item.type === 'page' &&
          item.url.includes('/windows/main/index.html') && !/^https?:/i.test(item.url) && item.webSocketDebuggerUrl)
      } catch { controller.signal.throwIfAborted(); return false }
    }, 'C14_RETAINED_PACKAGED_MAIN_UNAVAILABLE', 60_000)
    connection = await attach({ status: 'success', keptOpen: true, pid: child.pid, isolatedUserData: profile }, controller.signal)
    await recover(connection.evaluate, controller.signal, coding, result, persist, remainingOnly)
    result.status = 'passed'; result.functionalAcceptance = 'passed'
    result.wholeProcessReopen = remainingOnly ? 'prior immutable passing receipt retained; not repeated' :
      'same disposable profile reopened using exact installed candidate; graceful prior quit not claimed'
  } catch (error) {
    result.status = controller.signal.aborted ? 'cancelled' : 'failed'; result.failureCode = code(error)
    result.functionalAcceptance = 'pending'
    if (connection && !controller.signal.aborted) result.failureDom = await workState(connection.evaluate).catch(() => null)
  } finally {
    connection?.close()
    try { result.shutdown = await ownedShutdown(child) }
    catch (error) { result.shutdown = { ownedProcessesStopped: false, failureCode: code(error) } }
    if (!result.shutdown.ownedProcessesStopped) { result.status = 'failed'; result.failureCode = 'C14_RETAINED_OWNED_SHUTDOWN_UNCONFIRMED' }
    clearTimeout(budget); process.removeListener('SIGINT', abort); process.removeListener('SIGTERM', abort)
    result.finishedAt = new Date().toISOString(); result.operatorAcceptance = 'pending'; persist()
  }
  return { status: result.status, receiptPath, checks: result.checks, failureCode: result.failureCode }
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  if (![3,4].includes(process.argv.length) || process.argv[2] !== '--execute' ||
    (process.argv.length === 4 && process.argv[3] !== '--remaining-only')) {
    process.stderr.write('Prepared only. Root must release the UI slot before invoking --execute.\n'); process.exitCode = 2
  } else {
    try { const result = await operate({ remainingOnly: process.argv[3] === '--remaining-only' }); console.log(JSON.stringify(result)); process.exitCode = result.status === 'passed' ? 0 : 1 }
    catch { process.stderr.write('Retained operation prerequisites unavailable; private inputs were not printed.\n'); process.exitCode = 1 }
  }
}
