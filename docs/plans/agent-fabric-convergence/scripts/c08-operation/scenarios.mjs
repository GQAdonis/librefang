import { Blocked, source } from './io.mjs';

export const scenarioNames = ['handlerConflictAndRecipient', 'observerIsolation',
  'revocationRestartReplay', 'replyEchoAndScope', 'boundedReaction', 'detachAndOwnerCancel'];
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const unique = values => new Set(values).size === values.length;

// Every named item must resolve to an executed operation receipt. A private
// config can select resources but cannot supply an observed outcome or Boolean.
function event(state, evidence, key, kinds) {
  const value = state.values.steps[evidence[key]];
  if (!value || value.status !== 'observed' || (kinds && !kinds.includes(value.kind))) {
    throw new Blocked(`actual_operation_receipt_required:${key}`);
  }
  return value;
}
function input(state, evidence, key) {
  const value = event(state, evidence, key, ['ingress', 'race_ingress']).result;
  return value.input ?? value.sends[0].input;
}
function tables(state, evidence, key = 'final') {
  return event(state, evidence, key, ['snapshot', 'wait', 'wait_callback', 'observe_no_repost']).result.tables;
}
function occurrence(state, evidence, key, rows) {
  const value = source(rows, input(state, evidence, key));
  if (!value) throw new Blocked(`durable_source_not_observed:${key}`);
  return value;
}
function requireValue(condition, code) {
  if (!condition) throw new Error(code);
}
function conflict(state, e) {
  const rows = tables(state, e);
  const raced = event(state, e, 'conflict', ['race_ingress']);
  const denied = occurrence(state, e, 'conflict', rows);
  const selected = occurrence(state, e, 'selected', rows);
  const handlers = denied.decision.outcome.handlers;
  requireValue(raced.result.sends.length === 2 && unique(raced.result.sends.map(row => row.host)), 'two_hosts_not_exercised');
  requireValue(denied.decision.outcome.kind === 'conflict' && handlers?.length === 2 && unique(handlers), 'handler_conflict_not_observed');
  requireValue(!rows.channel_route_dispatch.some(row => row.occurrence_id === denied.occurrence_id), 'conflict_dispatched');
  requireValue(selected.decision.outcome.kind === 'selected' && selected.decision.reason === 'explicit_address'
    && selected.decision.outcome.handler === e.handler, 'explicit_recipient_not_selected');
  requireValue(rows.channel_route_dispatch.some(row => row.occurrence_id === selected.occurrence_id && row.state === 'completed'), 'selected_handler_not_completed');
  return { conflict: denied, selected };
}
function observers(state, e) {
  const rows = tables(state, e);
  const admitted = occurrence(state, e, 'source', rows);
  const registered = ['observerA', 'observerB', 'observerDenied'].map(key =>
    event(state, e, key, ['subscribe']).result.result.subscription);
  const ids = registered.map(row => row.subscription_id);
  requireValue(unique(ids), 'subscriber_identity_collapsed');
  const copies = rows.channel_observer_deliveries.filter(row => row.occurrence_id === admitted.occurrence_id);
  const authorized = copies.filter(row => ids.slice(0, 2).includes(row.subscription_id));
  requireValue(authorized.length === 2 && unique(authorized.map(row => row.delivery_id))
    && unique(authorized.map(row => row.action_id)), 'independent_copies_not_observed');
  requireValue(!copies.some(row => row.subscription_id === ids[2]), 'unauthorized_observer_received_copy');
  for (const copy of authorized) {
    requireValue(copy.state === 'delivered' && rows.channel_observer_subscriptions.some(row =>
      row.subscription_id === copy.subscription_id && row.ack_sequence >= copy.sequence), 'subscriber_cursor_not_acknowledged');
  }
  const denied = event(state, e, 'denial', ['gate_evaluate']).result;
  requireValue(denied.request.action === 'source_disclosure' && denied.result.disposition === 'withheld', 'gate_disclosure_denial_not_observed');
  const uarList = event(state, e, 'uarSubscriptions', ['subscriptions']).result.result;
  const cursors = ids.slice(0, 2).map(id => uarList.find(row => row.subscriptionId === id)?.cursor);
  requireValue(cursors.every(Boolean) && unique(cursors), 'uar_independent_cursors_not_observed');
  const before = event(state, e, 'cursorBefore', ['subscriptions']).result.result;
  const after = event(state, e, 'cursorAfter', ['subscriptions']).result.result;
  const acknowledged = event(state, e, 'acknowledge', ['acknowledge']).result.result;
  const changed = before.find(row => row.subscriptionId === ids[0]);
  const unchanged = before.find(row => row.subscriptionId === ids[1]);
  requireValue(acknowledged.subscriptionId === ids[0]
    && after.find(row => row.subscriptionId === ids[0])?.cursor !== changed?.cursor
    && after.find(row => row.subscriptionId === ids[1])?.cursor === unchanged?.cursor, 'independent_acknowledgement_not_observed');
  return { source: admitted.occurrence_id, authorized, denied: denied.result, cursors };
}
function restartReplay(state, e) {
  const before = tables(state, e, 'queued');
  const settled = e.beforeRestart ? tables(state, e, 'beforeRestart') : before;
  const after = tables(state, e);
  const queued = before.channel_observer_deliveries.find(row => row.delivery_id === e.deliveryId);
  if (!queued || queued.state !== 'pending') throw new Blocked('real_pending_delivery_before_revocation_required');
  const revoked = event(state, e, 'revoke', ['revoke_grant']);
  requireValue(revoked.result.result.grant.active === false, 'gate_revocation_not_committed');
  requireValue(event(state, e, 'queued').finishedAt <= revoked.startedAt, 'queue_revocation_order_not_observed');
  const withheld = after.channel_observer_deliveries.find(row => row.delivery_id === queued.delivery_id);
  requireValue(withheld?.state === 'withheld', 'revoked_queue_not_withheld');
  for (const key of ['restartBossA', 'restartBossB', 'restartFabric', 'restartUar']) {
    const expectedProcess = { restartBossA: 'bossA', restartBossB: 'bossB', restartFabric: 'fabric', restartUar: 'uar' }[key];
    let epoch;
    if (e[key] && typeof e[key] === 'object') {
      const stopped = event(state, e[key], 'stop', ['stop_process']);
      const started = event(state, e[key], 'start', ['start_process']);
      requireValue(stopped.process === expectedProcess && started.process === expectedProcess
        && stopped.finishedAt <= started.startedAt, 'restart_wrong_execution_owner_or_order');
      epoch = { stopped: stopped.result, started: started.result, changedPid: stopped.result.pid !== started.result.pid };
    } else {
      const restart = event(state, e, key, ['restart']);
      requireValue(restart.process === expectedProcess, 'restart_wrong_execution_owner');
      epoch = restart.result;
    }
    requireValue(epoch.changedPid && epoch.stopped.exited && epoch.started.pid, 'owned_process_restart_not_observed');
  }
  const admittedBefore = occurrence(state, e, 'source', before);
  const admittedAfter = occurrence(state, e, 'source', after);
  const replay = input(state, e, 'replay');
  requireValue(same(replay, input(state, e, 'source')), 'replay_changed_native_occurrence');
  requireValue(same(admittedBefore, admittedAfter), 'restart_changed_admitted_occurrence');
  const affinityBefore = before.channel_route_affinity.find(row => row.scope_key === admittedBefore.scope_key);
  const affinityAfter = after.channel_route_affinity.find(row => row.scope_key === admittedBefore.scope_key);
  requireValue(same(affinityBefore, affinityAfter) && affinityBefore, 'restart_changed_route_affinity');
  const count = rows => rows.channel_causal_actions.filter(row => row.source_occurrence_id === admittedBefore.occurrence_id && row.kind !== 'observer_copy').length;
  requireValue(count(settled) === count(after), 'replay_created_another_handler_or_reply');
  return { withheld, retainedAffinity: affinityAfter, source: admittedAfter.occurrence_id };
}
function replyEcho(state, e) {
  const before = tables(state, e, 'beforeEcho');
  const after = tables(state, e);
  const posted = event(state, e, 'callback', ['wait_callback']).result;
  const admitted = occurrence(state, e, 'source', before);
  requireValue(posted.action.state === 'completed' && posted.posts.length > 0, 'real_scoped_reply_receipt_required');
  for (const post of posted.posts) requireValue(after.channel_provider_echoes.some(row =>
    row.action_id === post.action_id && row.native_message_id === post.native_message_id), 'native_callback_receipt_not_bound');
  const echoed = input(state, e, 'echo');
  requireValue(posted.posts.some(row => row.native_message_id === echoed.message_id), 'ingress_did_not_echo_actual_post');
  requireValue(!source(after, echoed), 'provider_echo_readmitted');
  const replies = rows => rows.channel_causal_actions.filter(row => row.root_occurrence_id === admitted.occurrence_id && row.kind === 'reply');
  requireValue(same(replies(before), replies(after)), 'echo_or_replay_created_another_reply');
  const quiet = event(state, e, 'quiet', ['observe_no_repost']).result;
  requireValue(quiet.noAdditionalAction && quiet.noAdditionalCallback && quiet.observationMs >= 1000, 'bounded_echo_replay_observation_required');
  const denied = event(state, e, 'scopeDenial', ['gate_evaluate']).result;
  requireValue(denied.request.action === 'scoped_reply' && denied.result.disposition === 'withheld'
    && denied.result.reason === 'channel_grant_scope_mismatch', 'gate_cross_scope_reply_refusal_not_observed');
  const foreign = occurrence(state, e, 'crossScopeSource', after);
  requireValue(foreign.scope.room !== admitted.scope.room && foreign.scope.account === admitted.scope.account,
    'distinct_authorized_native_room_required');
  requireValue(same(denied.request.scope, Object.fromEntries(Object.entries(foreign.scope).filter(([key]) => key !== 'account_kind'))),
    'gate_denial_not_bound_to_attempted_scope');
  requireValue(denied.request.occurrence_id === foreign.occurrence_id, 'gate_denial_not_bound_to_attempted_occurrence');
  const attempt = after.channel_causal_actions.find(row => row.source_occurrence_id === foreign.occurrence_id && row.kind === 'reply');
  if (!attempt) throw new Blocked('actual_cross_scope_reply_attempt_not_observed');
  const foreignQuiet = event(state, e, 'crossScopeQuiet', ['observe_no_repost']).result;
  requireValue(foreignQuiet.noAdditionalCallback && foreignQuiet.noAdditionalAction
    && !state.callback.posts.some(row => row.action_id === attempt.action_id), 'cross_scope_native_post_observed');
  const evidence = { source: admitted.occurrence_id, posted: posted.posts, echo: echoed.message_id,
    gateScopeDenial: denied.result, crossScopeReply: attempt,
    nativeBoundary: 'no_post_observed', authorityDecisionBinding: 'independent_gate_scope_denial',
    limitation: attempt.state === 'uncertain' ? 'production_reply_terminal_uncertain_not_definitive_gate_withheld' : null };
  requireValue(['uncertain', 'withheld'].includes(attempt.state) && attempt.reply_grant_id === denied.request.grant_id,
    'cross_scope_reply_refusal_not_observed');
  return evidence;
}
function bounded(state, e) {
  const rows = tables(state, e);
  const root = occurrence(state, e, 'sourceA', rows);
  const bSource = occurrence(state, e, 'sourceB', rows);
  const backSource = occurrence(state, e, 'sourceBackA', rows);
  for (const key of ['reassignB', 'reassignA']) {
    const reassignment = event(state, e, key, ['reassign']);
    requireValue(reassignment.result.status === 200, 'authorized_revision_reassignment_not_observed');
  }
  const action = (id, kind) => rows.channel_causal_actions.find(row => row.source_occurrence_id === id && row.kind === kind);
  const a = action(root.occurrence_id, 'forward');
  const aReply = action(root.occurrence_id, 'reply');
  const b = action(bSource.occurrence_id, 'forward');
  const bReply = action(bSource.occurrence_id, 'reply');
  const back = action(backSource.occurrence_id, 'forward');
  if (!a || !aReply || !b || !bReply || !back) throw new Blocked('actual_a_b_a_action_chain_required');
  requireValue(aReply.parent_action_id === a.action_id && b.parent_action_id === aReply.action_id
    && bReply.parent_action_id === b.action_id && back.parent_action_id === bReply.action_id, 'causal_parent_chain_changed');
  requireValue([a, aReply, b, bReply, back].every(row => row.root_occurrence_id === root.occurrence_id), 'downstream_reset_causal_root');
  requireValue(a.route_identity === back.route_identity && a.route_identity !== b.route_identity
    && back.state === 'suppressed' && back.suppression_reason === 'visited_route', 'a_b_a_revisit_not_suppressed');
  requireValue(aReply.state === 'completed' && bReply.state === 'completed', 'predecessor_reply_not_completed');
  for (const [key, expected] of [['callbackA', aReply], ['callbackB', bReply]]) {
    const receipt = event(state, e, key, ['wait_callback']).result;
    requireValue(receipt.action.action_id === expected.action_id && receipt.posts.length > 0, 'causal_predecessor_post_not_observed');
  }
  requireValue(back.remaining_depth <= bReply.remaining_depth && back.remaining_fanout <= bReply.remaining_fanout,
    'downstream_reset_causal_budget');
  return { root: root.occurrence_id, actions: [a, aReply, b, bReply, back] };
}
function control(state, e) {
  const before = tables(state, e, 'beforeDetach');
  const after = tables(state, e);
  const detached = event(state, e, 'detach', ['detach']).result.result;
  requireValue(detached.status === 'observation_detached' && detached.execution_state_changed === false
    && detached.shared_fabric_socket_closed === false, 'detach_conflated_execution_or_transport');
  const sub = detached.subscription;
  const original = before.channel_observer_subscriptions.find(row => row.subscription_id === sub.subscription_id);
  const paused = after.channel_observer_subscriptions.find(row => row.subscription_id === sub.subscription_id);
  requireValue(original && paused?.status === 'paused' && paused.ack_sequence === original.ack_sequence,
    'detach_changed_or_lost_cursor');
  const next = occurrence(state, e, 'afterDetachSource', after);
  requireValue(next.decision.outcome.kind === 'selected' && next.decision.outcome.handler === e.handler
    && after.channel_route_dispatch.some(row => row.occurrence_id === next.occurrence_id && row.state === 'completed'),
  'detach_stopped_selected_handler');
  const cancellation = event(state, e, 'cancel', ['cancel']).result;
  requireValue(cancellation.status === 501 && cancellation.result.status === 'execution_cancel_unsupported'
    && cancellation.result.execution_state_changed === false && cancellation.result.observation_state_changed === false,
  'cancel_fabricated_runtime_success');
  return { detached: sub.subscription_id, preservedCursor: paused.ack_sequence,
    handlerOccurrence: next.occurrence_id, cancellation: cancellation.result };
}

const evaluators = { handlerConflictAndRecipient: conflict, observerIsolation: observers,
  revocationRestartReplay: restartReplay, replyEchoAndScope: replyEcho,
  boundedReaction: bounded, detachAndOwnerCancel: control };
export function evaluate(name, evidence, state) {
  if (!evidence || !evaluators[name]) return { status: 'blocked', code: 'scenario_operation_plan_required' };
  try {
    const result = evaluators[name](state, evidence);
    return result?.status ? result : { status: 'passed', evidence: result };
  } catch (error) {
    return { status: error instanceof Blocked ? 'blocked' : 'failed', code: error.code ?? error.message };
  }
}
