# BossFang connects to UAR

BossFang owns its dashboard/orchestration service, never the UAR process. It does not bundle, install, spawn, restart or terminate UAR. The selected instance may be The Boss-managed sidecar or an admitted external loopback HTTP/HTTPS instance. Historical enabled/command/restart/storage settings remain readable migration data. Select an existing runtime endpoint; missing legacy endpoints produce UAR_CONNECTION_MIGRATION_REQUIRED without launch fallback. Existing data is not deleted.

Authenticated Owner routes:

- POST /api/uar/connect with optional {instance,bearer,workspaceId}. Instance uses native snake_case UarServiceInstanceConfig. Bearer is private, process-local, never returned or persisted; supplied bearer requires workspaceId. Omission retains selected connection. Saved credential references resolve in the native host when selecting a saved instance.
- POST /api/uar/disconnect detaches locally; POST /api/uar/reconnect revalidates without restarting UAR. Historical start/stop/restart routes are deprecated connection aliases.
- GET /api/uar/status returns legacy state fields plus selected_instance_id, instances, effective_binding and compatibility. Legacy process path/restart count are empty/zero. Ownership is external relative to BossFang, independent of selected runtime supervisor ownership.
- GET /api/uar/models reads admitted models endpoint using its scoped credential.
- POST /api/uar/diagnostics/delegation {workspaceId,providerId,model,bossTaskId?} creates a real ephemeral inline no-effect agent through UAR full-harness admission. ProviderId is configured UAR registry ID and model is its provider-local ID, never a pricing alias. Missing task ID is generated; retaining it allows exact retry/reconciliation.

Diagnostic returns normal camelCase UarDelegatedRunProjection. definitionMode inline_diagnostic and empty targetBindingId denote no installed binding. definition.digest hashes authored source, not native expanded/stamped snapshot. UAR retains canonical authority. Bound definitions still require exact binding IDs. Pending projections are saved before dispatch; unresolved transport never means success.

GET /api/uar/delegations/{bossTaskId}/events?after=<u64> forwards existing stream as {delegation,events}; each event has taskId/cursor/revision/type/data and optional occurredAt (not synthesized). agui.message.delta uses data.delta.text. agui.done uses data.usage with nullable input_tokens/output_tokens/total_tokens/cost_usd_estimate/model. Only lookup executionState completed proves completion. Other states: submitted, working, input_required, failed, cancelled. Retention/replay follow UAR process-ephemeral runtime epoch/retention contract. Existing .../cancel route retains independent requested/acknowledged/terminal/cleanupUncertain fields; request alone is not settlement.

Managed UAR uses host-issued restricted 900-second delegation grants (discovery/model_read/model_completion/full_harness_delegation); external JWT identity is verified by UAR. BossFang sends Authorization and scoped x-uar-workspace-id, never x-uar-principal. No launch token is copied. Private replacement refreshes a credential; expiry errors remain real upstream failures. URI validation and disabled redirects protect the actual outbound credential boundary. No grant implies catalog administration or paired-host tool admission authority.

Source implemented without builds/tests/compiler/review. Parent-owned native packaging and real desktop operations remain the delivery boundary.

## Original connections survive selection changes

Existing task lookup/events/approval/cancel/reconciliation resolve the original private authenticated transport retained before dispatch. Current selection applies only to new admission; disconnect/selection replacement never migrates or replays an old run. Credential material is process-local and zeroized on drop; durable projections contain no bearer.

Owner GET /api/uar/connections returns {connections:[{bossTaskId,workspaceId,selectedInstanceId,effectiveBinding,runtimeEpoch,executionState,admissionState,cancellation,credentialState}]}. Only active loaded projections are listed; terminal completed/failed/cancelled and refused projections are excluded. credentialState retained means private material present (not an expiry/health assertion); reattachment_required means material must be reattached. Existing-run operations without it return503 code uar_connection_reattachment_required.

Owner POST /api/uar/connections/refresh {bossTaskId,workspaceId,instance,bearer} replaces only that run's original credential after exact saved binding fields, native epoch and authenticated owned task/admission receipt validation. Instance uses native snake_case fields with canonical saved effectiveBinding endpoints, id, profile, workspace_locality, workspace and credential_ref. Success200 returns the normal direct projection; runtime epoch mismatch returns410 with recovery_unsupported posture. Real upstream credential/scope refusals remain authoritative. The selected connection is unchanged. Retain the previous host grant until replacement succeeds; refresh/revoke is owned by the desktop trusted main process, not dashboard inputs.

Loaded original projections survive BossFang restart according to the existing store retention mode; private credentials do not. Explicit original-instance reattachment is supported while the original UAR epoch still exists. There is no automatic fallback, stored secret, new scheduler or native task replay.
