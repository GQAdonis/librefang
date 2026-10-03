// Builds API operations only. Every outcome is read from real service receipts.
export function buildPlan(config, input) {
  const ref = value => ({ ref: value });
  const textRef = value => ({ ref: value, format: 'string' });
  const body = id => `steps.${id}.result.result`;
  const result = id => `steps.${id}.result`;
  const instance = name => ref(`${body(`registerInstance${name}`)}.instanceId`);
  const subscription = name => ref(`${body(`observer${name}`)}.subscription.subscription_id`);
  const native = id => ref(`${result(id)}.input`);
  const base = config.constants.gateScope;
  const source = config.constants.sourceScope;
  const handlerA = config.constants.handlerA;
  const handlerB = config.constants.handlerB;
  const grantIssuer = config.realm.issuer;
  const first = config.plan.findIndex(step => step.id === 'conflict');
  const plan = first < 0 ? [...config.plan] : config.plan.slice(0, first);
  const add = (id, kind, values = {}) => plan.push({ id, kind, ...values });
  const grant = (id, grantId, action, scope, recipient, handler, classification, expectedRevision) => add(id, 'grant', {
    specification: { issuer: grantIssuer, grant_id: grantId, action, scope, recipient, handler, classification,
      max_remaining_depth: 4, max_remaining_fanout: 8 }, ...(expectedRevision === undefined ? {} : { expectedRevision }),
  });
  const message = (room = base.room, mentions = [handlerA]) => ({ workspace_id: base.workspace,
    room_id: room, thread_id: base.thread, sender_id: base.sender,
    message: 'C08 disposable operation. Reply briefly.', is_group: true,
    metadata: { mention_names: mentions } });
  const ingress = (id, host = 'bossA', values = {}) => add(id, 'ingress', { host, input: message(), ...values });
  const wait = (id, sourceId, condition = 'dispatch_completed') => add(id, 'wait', {
    input: native(sourceId),
    condition,
    ...(condition === 'dispatch_completed' ? { timeoutMs: 210000 } : {}),
  });
  const list = (id, name) => add(id, 'subscriptions', { service: 'uar', ...(name ? { subscriptionId: subscription(name) } : {}) });
  const inventory = (id, name) => add(id, 'deliveries', { subscriptionId: subscription(name), minimum: 1 });
  const acknowledge = (id, name, inventoryId, revisionId, index) => add(id, 'acknowledge', {
    subscriptionId: subscription(name), deliveryId: ref(`${body(inventoryId)}.deliveries.${index}.deliveryId`),
    expectedRevision: ref(`${result(revisionId)}.selectedSubscription.revision`),
  });
  const snapshot = id => add(id, 'snapshot');
  const quiet = (id, sourceId) => add(id, 'observe_no_repost', { input: native(sourceId), observationMs: 3000 });
  // A routed callback includes the bounded model turn before the native post.
  // Observe it for the same declared window as dispatch completion instead of
  // imposing an unrelated 60-second helper deadline.
  const callback = (id, sourceId) => add(id, 'wait_callback', {
    input: native(sourceId), timeoutMs: 210000,
  });

  grant('grantHandlerB', 'handler-b', 'handler_execution', base, handlerB, handlerB, 'handler_payload');
  grant('grantReplyB', 'reply-b', 'scoped_reply', base, base.room, handlerB, 'scoped_reply');
  grant('grantReassignA', 'reassign-a', 'route_reassignment', base, handlerA, handlerA, 'metadata_only');
  grant('grantReassignB', 'reassign-b', 'route_reassignment', base, handlerB, handlerB, 'metadata_only');
  for (const name of ['A', 'B']) {
    grant(`grantSource${name}`, `source-observer-${name.toLowerCase()}`, 'source_disclosure', base, instance(name), handlerA, 'policy_filtered');
    grant(`grantRecipient${name}`, `recipient-observer-${name.toLowerCase()}`, 'recipient_delivery', base, instance(name), handlerA, 'policy_filtered');
    const request = structuredClone(config.constants[`observer${name}`]);
    request.recipient_grant_revision = textRef(`${body(`grantRecipient${name}`)}.grant.revision`);
    add(`observer${name}`, 'subscribe', { host: 'bossA', request });
  }
  // Register the real bound denied observer but deliberately grant no disclosure.
  grant('grantRecipientDenied', 'recipient-observer-denied', 'recipient_delivery', base, instance('Denied'), handlerA, 'policy_filtered');
  const denied = structuredClone(config.constants.observerDenied);
  denied.recipient_grant_revision = textRef(`${body('grantRecipientDenied')}.grant.revision`);
  add('observerDenied', 'subscribe', { host: 'bossA', request: denied });

  add('conflict', 'race_ingress', { hosts: ['bossA', 'bossB'], input: message('c08-conflict-room', [handlerA, handlerB]) });
  ingress('selected'); wait('selectedObserved', 'selected'); snapshot('conflictFinal'); callback('callbackA', 'selected');
  wait('observersDelivered', 'selected', 'observers_delivered');
  inventory('deliveryA', 'A'); list('revisionA', 'A'); acknowledge('ackInitialA', 'A', 'deliveryA', 'revisionA', 0);
  inventory('deliveryB', 'B'); list('revisionB', 'B'); acknowledge('ackInitialB', 'B', 'deliveryB', 'revisionB', 0);
  list('uarSubscriptions');
  add('sourceDenial', 'gate_evaluate', { input: native('selected'), action: 'source_disclosure', recipient: instance('Denied'),
    handler: handlerA, classification: 'policy_filtered', grantIssuer, grantId: 'source-observer-denied-missing' });
  ingress('secondSource'); wait('secondDelivered', 'secondSource', 'observers_delivered'); callback('secondCallback', 'secondSource');
  inventory('secondDeliveryA', 'A'); list('cursorBefore', 'A');
  acknowledge('ackSecondA', 'A', 'secondDeliveryA', 'cursorBefore', 1); list('cursorAfter'); snapshot('observerFinal');

  snapshot('beforeEcho');
  ingress('echo', 'bossA', { echoAction: ref(`${result('callbackA')}.action.action_id`) });
  ingress('echoReplay', 'bossB', { input: native('selected') }); quiet('echoQuiet', 'selected');

  add('reassignB', 'reassign', { host: 'bossA', scope: source,
    expectedRevision: ref(`${result('selectedObserved')}.occurrence.route_revision`), handler: handlerB, grantIssuer, grantId: 'reassign-b' });
  ingress('sourceB', 'bossB', { input: message(base.room, [handlerB]), referenceAction: ref(`${result('callbackA')}.action.action_id`) });
  callback('callbackB', 'sourceB');
  add('reassignA', 'reassign', { host: 'bossA', scope: source,
    expectedRevision: ref(`${body('reassignB')}.revision`), handler: handlerA, grantIssuer, grantId: 'reassign-a' });
  ingress('sourceBackA', 'bossA', { referenceAction: ref(`${result('callbackB')}.action.action_id`) });
  wait('backSuppressed', 'sourceBackA', 'suppressed'); snapshot('boundedFinal');

  const other = { ...base, room: 'c08-other-room' };
  grant('grantOtherHandler', 'handler-a', 'handler_execution', other, handlerA, handlerA, 'handler_payload',
    ref(`${body('grantHandlerA')}.grant.revision`));
  ingress('crossScopeSource', 'bossA', { input: message(other.room) });
  wait('crossScopeTerminal', 'crossScopeSource', 'reply_terminal');
  add('scopeDenial', 'gate_evaluate', { input: native('crossScopeSource'), action: 'scoped_reply', recipient: other.room,
    handler: handlerA, classification: 'scoped_reply', grantIssuer, grantId: 'reply-a' });
  quiet('crossScopeQuiet', 'crossScopeSource');
  ingress('foreignReference', 'bossA', { input: message(other.room), referenceAction: ref(`${result('callbackA')}.action.action_id`) });
  wait('foreignAdmitted', 'foreignReference', 'source'); quiet('foreignQuiet', 'foreignReference'); snapshot('replyFinal');
  grant('restoreHandler', 'handler-a', 'handler_execution', base, handlerA, handlerA, 'handler_payload',
    ref(`${body('grantOtherHandler')}.grant.revision`));

  // Settle prior sources before the real transport outage. The first failed
  // claimed copy may become uncertain; only an actually pending copy qualifies.
  add('stopFabric', 'stop_process', { process: 'fabric' });
  ingress('queuedSource'); wait('queueObserved', 'queuedSource', 'queued');
  add('revokeQueued', 'revoke_grant', { issuer: ref(`${result('queueObserved')}.selectedSubscription.source_grant_issuer`),
    grantId: ref(`${result('queueObserved')}.selectedSubscription.source_grant_id`) });
  callback('queuedCallback', 'queuedSource'); snapshot('beforeRestart');
  add('restartBossA', 'restart', { process: 'bossA' }); add('restartBossB', 'restart', { process: 'bossB' });
  add('restartUar', 'restart', { process: 'uar' });
  add('startFabricAgain', 'start_process', { process: 'fabric' });
  for (const name of ['gate', 'fabric', 'uar']) add(`afterRestart${name}`, 'probe', { service: name });
  for (const name of ['bossA', 'bossB']) {
    add(`afterRestart${name}`, 'probe', {
      service: name,
      requireQualified: true,
      webhookPort: Number(new URL(config.ingress[name].url).port),
    });
  }
  ingress('replay', 'bossA', { input: native('queuedSource') });
  wait('queuedWithheld', 'queuedSource', 'withheld'); quiet('replayQuiet', 'queuedSource'); snapshot('restartFinal');

  snapshot('beforeDetach');
  add('detach', 'detach', { host: 'bossA', subscriptionId: subscription('B') });
  ingress('afterDetachSource'); wait('afterDetachCompleted', 'afterDetachSource'); callback('afterDetachCallback', 'afterDetachSource');
  add('cancel', 'cancel', { host: 'bossA', occurrenceId: ref(`${result('afterDetachCompleted')}.occurrence.occurrence_id`) }); snapshot('controlFinal');

  config.scenarios = {
    handlerConflictAndRecipient: { conflict: 'conflict', selected: 'selected', handler: handlerA, final: 'conflictFinal' },
    observerIsolation: { observerA: 'observerA', observerB: 'observerB', observerDenied: 'observerDenied', source: 'selected',
      denial: 'sourceDenial', uarSubscriptions: 'uarSubscriptions', cursorBefore: 'cursorBefore', acknowledge: 'ackSecondA', cursorAfter: 'cursorAfter', final: 'observerFinal' },
    revocationRestartReplay: { source: 'queuedSource', queued: 'queueObserved', deliveryId: ref(`${result('queueObserved')}.selectedDelivery.delivery_id`),
      revoke: 'revokeQueued', restartBossA: 'restartBossA', restartBossB: 'restartBossB', restartUar: 'restartUar',
      restartFabric: { stop: 'stopFabric', start: 'startFabricAgain' }, beforeRestart: 'beforeRestart', replay: 'replay', final: 'restartFinal' },
    replyEchoAndScope: { source: 'selected', callback: 'callbackA', beforeEcho: 'beforeEcho', echo: 'echo', quiet: 'echoQuiet',
      crossScopeSource: 'crossScopeSource', scopeDenial: 'scopeDenial', crossScopeQuiet: 'crossScopeQuiet', final: 'replyFinal' },
    boundedReaction: { sourceA: 'selected', callbackA: 'callbackA', reassignB: 'reassignB', sourceB: 'sourceB', callbackB: 'callbackB', reassignA: 'reassignA', sourceBackA: 'sourceBackA', final: 'boundedFinal' },
    detachAndOwnerCancel: { beforeDetach: 'beforeDetach', detach: 'detach', afterDetachSource: 'afterDetachSource', handler: handlerA, cancel: 'cancel', final: 'controlFinal' },
  };

  if (input.ui) {
    config.ui = { ...input.ui, ...config.ui, expectedRuntimeId: config.constants.runtimeId };
    if (!config.processes.bossUi || !config.constants.registrationBindingA) throw new Error('Actual UI launcher and binding template required');
    add('startBossUi', 'start_process', { process: 'bossUi' }); add('uiWorkspace', 'wait_ui_workspace', { timeoutMs: 180000 });
    const workspaceId = ref(`${result('uiWorkspace')}.workspaceId`);
    const binding = structuredClone(config.constants.registrationBindingA);
    binding.commandId += '-ui'; binding.binding.id += '-ui'; binding.binding.workspaceId = workspaceId;
    add('registerUiBinding', 'register', { service: 'uar', path: '/api/v1/collaboration/deployment-bindings', workspaceId, body: binding, resealBinding: true });
    add('registerUiInstance', 'register', { service: 'uar', path: '/api/uar/agent-instances/v1', workspaceId,
      body: { deploymentBindingId: binding.binding.id, profile: 'resident' } });
    const uiScope = { ...base, workspace: workspaceId };
    grant('grantUiHandler', 'handler-a', 'handler_execution', uiScope, handlerA, handlerA, 'handler_payload', ref(`${body('restoreHandler')}.grant.revision`));
    const observer = ref(`${body('registerUiInstance')}.instanceId`);
    grant('grantUiSource', 'ui-source', 'source_disclosure', uiScope, observer, handlerA, 'policy_filtered');
    grant('grantUiRecipient', 'ui-recipient', 'recipient_delivery', uiScope, observer, handlerA, 'policy_filtered');
    add('uiSubscribe', 'subscribe', { host: 'bossA', request: { observer_instance_id: observer,
      source: { ...source, workspace: workspaceId }, source_profile: 'signed_webhook_v1',
      source_grant_issuer: grantIssuer, source_grant_id: 'ui-source', recipient_grant_issuer: grantIssuer, recipient_grant_id: 'ui-recipient',
      recipient_grant_revision: textRef(`${body('grantUiRecipient')}.grant.revision`) } });
    ingress('uiSource', 'bossA', { input: { ...message(), workspace_id: workspaceId } });
    add('uiDelivered', 'wait', { input: native('uiSource'), condition: 'observers_delivered', count: 1 });
    add('uiExport', 'export_ui_subscription', { workspaceOperation: 'uiWorkspace', subscriptionId: ref(`${body('uiSubscribe')}.subscription.subscription_id`) });
    add('uiComplete', 'wait_process', { process: 'bossUi', timeoutMs: 300000, receiptPath: config.ui.receiptPath });
  }
  config.plan = plan;
  return config;
}
