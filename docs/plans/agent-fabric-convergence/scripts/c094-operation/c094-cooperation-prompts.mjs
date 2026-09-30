import { randomUUID } from 'node:crypto'

export const marker = (label) => `C094_${label}_${randomUUID().replaceAll('-', '').slice(0, 10).toUpperCase()}`

/** The model must issue these calls itself through the actual native tool assembly. */
export function cooperationPlan(
  fixture,
  outcomes,
  budget,
  { duplicate = false, cycle = false, send = true, restart = false } = {}
) {
  const final = marker('FINAL')
  const count = outcomes.length
  const share = count + 2
  const reservation = (tokens, elapsedSeconds) => ({
    tokens,
    costMicrounits: Math.floor(budget.maxCostMicrounits / share),
    elapsedSeconds
  })
  const workerTokens = 16000
  const initial = reservation(40000, 300)
  const continuation = reservation(20000, 240)
  const targets = outcomes.map((outcome, index) => {
    const output = marker('WORKER')
    const sendArgs = {
      commandId: randomUUID(),
      recipient: { memberId: fixture.coordinatorId },
      payload: { text: `Worker ${index + 1} completed its assigned preparation.`, artifactIds: [] }
    }
    const instruction =
      outcome === 'cancelled'
        ? `${restart ? `Your first action must be the real team_send tool call with exactly ${JSON.stringify(sendArgs)}. Do not answer before that tool call returns. ` : ''}Write 300 detailed numbered paragraphs; do not use any other tools. The owner will cancel this bounded task.`
        : `${send ? `First call team_send with exactly ${JSON.stringify(sendArgs)}. ` : ''}Then reply with exactly ${output}, no quotes or markup, and do not call any other tool.`
    const taskId = randomUUID()
    return {
      taskId,
      outcome,
      output,
      args: {
        commandId: randomUUID(),
        recipientMemberId: fixture.workerIds[index],
        expectedTeamRevision: '$HOST_TEAM_REVISION',
        task: {
          taskId,
          role: 'worker',
          input: { instruction },
          outputContract: outcome === 'failed' ? { type: 'string', not: {} } : outcome === 'cancelled' && restart ? { type: 'string' } : { type: 'string', const: output },
          dependsOn: cycle ? ['$CURRENT_TASK_ID'] : []
        },
        payload: { text: `Perform your explicitly assigned worker task ${index + 1}.`, artifactIds: [] },
        reservation: reservation(workerTokens, 180)
      }
    }
  })
  const waitArgs = {
    commandId: randomUUID(),
    targetTaskIds: targets.map((target) => target.taskId),
    predicate: 'all-terminal',
    continuationInput: {
      text: 'Use the actual ordered terminal target outcomes to complete the original assignment.',
      artifactIds: []
    },
    continuationReservation: continuation
  }
  const instruction = [
    `Read the ACTUAL host-selected context field targetOutcomes. The expected outcome list in this instruction is not that field. If the field is nonempty, require exactly these ordered outcomes: ${JSON.stringify(outcomes)}. Only on that resumed branch reply with exactly ${final}; never delegate or wait again.`,
    'If the ACTUAL host-selected targetOutcomes field is empty, this is the first turn. Do not send the final marker yet. Call team_roster with {"limit":50}; use the authorized worker IDs, and do not invent sender or root identity.',
    `Use the host-selected assignment.teamRevision as the first expectedTeamRevision. For each accepted delegate increase that revision by exactly one. Replace $CURRENT_TASK_ID with your host-selected assignment.taskId.`,
    ...targets.map(
      (target, index) =>
        `Call team_delegate ${index + 1} with ${JSON.stringify(target.args)}, replacing $HOST_TEAM_REVISION with that numeric revision. ${duplicate && index === 0 ? 'Immediately call team_delegate again with exactly the SAME arguments and commandId; require the same queuedAttemptId. Do not increment the revision for that replay.' : ''}`
    ),
    `Then call team_wait with exactly ${JSON.stringify(waitArgs)}. This yields your turn. Do not return a final answer, call more tools, or invent terminal outcomes before the host resumes you.`,
    ...(cycle
      ? [
          `For this explicit cycle-refusal case only, the delegated task depends on your current task. team_wait must refuse that cycle; after the refusal reply exactly ${final}.`
        ]
      : [])
  ].join('\n')
  return { final, targets, waitArgs, initial, instruction, duplicate, send, restart }
}

export function deniedPlan(recipientMemberId, budget) {
  const args = {
    commandId: randomUUID(),
    recipientMemberId,
    expectedTeamRevision: '$HOST_TEAM_REVISION',
    task: {
      taskId: randomUUID(),
      role: 'worker',
      input: { instruction: 'Reply with a bounded marker.' },
      outputContract: { type: 'string' },
      dependsOn: []
    },
    payload: { text: 'Explicit refusal exercise.', artifactIds: [] },
    reservation: {
      tokens: 4000,
      costMicrounits: Math.floor(budget.maxCostMicrounits / 3),
      elapsedSeconds: Math.floor(budget.maxElapsedSeconds / 3)
    }
  }
  return {
    final: null,
    args,
    initial: { ...args.reservation, tokens: 20000 },
    instruction: `Your task is to observe the actual runtime refusal. First call team_roster with {"limit":50}. Then call team_delegate once with ${JSON.stringify(args)}, replacing $HOST_TEAM_REVISION with host assignment.teamRevision. Do not answer before both tool calls. Never retry, use another recipient, or wait. After the refusal, briefly report the returned status.`
  }
}
