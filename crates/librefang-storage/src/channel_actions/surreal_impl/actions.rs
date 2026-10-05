use super::*;

pub(super) struct PreparedAction {
    pub(super) receipt: ActionReceipt,
    pub(super) root_before: Option<CausalRoot>,
    pub(super) root_after: CausalRoot,
    pub(super) charge: bool,
}

pub(super) struct ObserverAppend {
    pub(super) subscription_before: ObserverSubscription,
    pub(super) subscription_after: ObserverSubscription,
    pub(super) delivery: ObserverDeliveryReceipt,
    pub(super) projection: StoredObserverProjection,
}

impl ChannelActionStore {
    /// Admit a reply or forward action once. Observer copies use
    /// [`Self::enqueue_observer_delivery`] so their budget charge and queue
    /// sequence are committed atomically.
    pub async fn admit_action(
        &self,
        request: &CausalActionRequest,
    ) -> StorageResult<ActionAdmission> {
        if request.kind == ActionKind::ObserverCopy {
            return Err(StorageError::InvalidConfig(
                "observer copies must use enqueue_observer_delivery".into(),
            ));
        }
        let action_id = action_id(request);
        let request_hash = request_hash(request)?;
        let mut last_error = None;
        for _ in 0..4 {
            if let Some(existing) = self.read::<ActionReceipt>(ACTIONS, &action_id).await? {
                return existing_admission(existing, &request_hash);
            }
            let prepared = self.prepare_action(request).await?;
            match self.commit_action(&prepared, None).await {
                Ok(()) => return Ok(new_admission(prepared.receipt)),
                Err(error) => {
                    if let Some(existing) = self.read::<ActionReceipt>(ACTIONS, &action_id).await? {
                        return existing_admission(existing, &request_hash);
                    }
                    let latest: Option<CausalRoot> =
                        self.read(ROOTS, &request.root_occurrence_id).await?;
                    if latest.as_ref().map(|r| r.fanout_used)
                        == prepared.root_before.as_ref().map(|r| r.fanout_used)
                    {
                        return Err(error);
                    }
                    last_error = Some(error);
                }
            }
        }
        Err(last_error
            .unwrap_or_else(|| StorageError::Backend("causal action admission conflict".into())))
    }

    /// Read an action without changing its state or budget.
    pub async fn action_receipt(&self, action_id: &str) -> StorageResult<Option<ActionReceipt>> {
        validate_digest(action_id, "action_id")?;
        self.read(ACTIONS, action_record_id(action_id)).await
    }

    /// Claim one pending reply/forward effect. Claimed and uncertain effects
    /// are never automatically resent. Observer copies use delivery claims.
    pub async fn claim_effect(
        &self,
        action_id: &str,
        claimant: &str,
    ) -> StorageResult<ActionClaim> {
        validate_digest(action_id, "action_id")?;
        required(claimant, "claimant")?;
        let sql = format!(
            "UPDATE {ACTIONS}:{action_id} SET state = 'claimed', claimant = $claimant, \
             updated_at = $now WHERE state = 'pending' AND kind != 'observer_copy' RETURN AFTER"
        );
        let mut response = self
            .db
            .query(sql)
            .bind(("claimant", claimant.to_owned()))
            .bind(("now", now()))
            .await
            .map_err(db_error)?
            .check()
            .map_err(db_error)?;
        let rows: Vec<serde_json::Value> = response.take(0).map_err(db_error)?;
        if let Some(row) = rows.into_iter().next() {
            return Ok(ActionClaim::Acquired(decode(row)?));
        }
        Ok(match self.read(ACTIONS, action_id).await? {
            Some(receipt) => ActionClaim::NotClaimable(receipt),
            None => ActionClaim::Missing,
        })
    }

    /// Mark a claimed reply/forward effect complete after owner confirmation.
    pub async fn complete_effect(
        &self,
        action_id: &str,
        claimant: &str,
    ) -> StorageResult<ActionState> {
        self.transition_effect(action_id, claimant, ActionState::Completed)
            .await
    }

    /// Preserve an effect with an uncertain external result for reconciliation.
    pub async fn mark_effect_uncertain(
        &self,
        action_id: &str,
        claimant: &str,
    ) -> StorageResult<ActionState> {
        self.transition_effect(action_id, claimant, ActionState::Uncertain)
            .await
    }

    /// Record a definitive Gate denial before the channel sender is called.
    /// The claimed action remains terminal so a replay cannot re-issue it.
    pub async fn withhold_effect(
        &self,
        action_id: &str,
        claimant: &str,
    ) -> StorageResult<ActionState> {
        self.transition_effect(action_id, claimant, ActionState::Withheld)
            .await
    }

    /// List only unclaimed reply/forward effects for restart recovery.
    pub async fn pending_effects(&self, limit: usize) -> StorageResult<Vec<ActionReceipt>> {
        self.list_effects("state = 'pending' AND kind != 'observer_copy'", limit)
            .await
    }

    /// Show claimed/uncertain effects for operator reconciliation; never resend.
    pub async fn unresolved_effects(&self, limit: usize) -> StorageResult<Vec<ActionReceipt>> {
        self.list_effects("state = 'claimed' OR state = 'uncertain'", limit)
            .await
    }

    async fn list_effects(
        &self,
        condition: &str,
        limit: usize,
    ) -> StorageResult<Vec<ActionReceipt>> {
        let sql = format!(
            "SELECT * FROM {ACTIONS} WHERE {condition} \
             ORDER BY updated_at ASC, action_id ASC LIMIT $limit"
        );
        let mut response = self
            .db
            .query(sql)
            .bind(("limit", limit.min(1000) as i64))
            .await
            .map_err(db_error)?
            .check()
            .map_err(db_error)?;
        let rows: Vec<serde_json::Value> = response.take(0).map_err(db_error)?;
        rows.into_iter().map(decode).collect()
    }

    async fn transition_effect(
        &self,
        action_id: &str,
        claimant: &str,
        target: ActionState,
    ) -> StorageResult<ActionState> {
        validate_digest(action_id, "action_id")?;
        required(claimant, "claimant")?;
        let sql = format!(
            "UPDATE {ACTIONS}:{action_id} SET state = $target, updated_at = $now \
             WHERE state = 'claimed' AND claimant = $claimant \
             AND kind != 'observer_copy' RETURN AFTER"
        );
        let mut response = self
            .db
            .query(sql)
            .bind(("target", encode(target)?))
            .bind(("claimant", claimant.to_owned()))
            .bind(("now", now()))
            .await
            .map_err(db_error)?
            .check()
            .map_err(db_error)?;
        let rows: Vec<serde_json::Value> = response.take(0).map_err(db_error)?;
        if let Some(row) = rows.into_iter().next() {
            let receipt: ActionReceipt = decode(row)?;
            return Ok(receipt.state);
        }
        Err(StorageError::Backend(format!(
            "causal action {action_id} is not claimed by this caller"
        )))
    }

    pub(super) async fn prepare_action(
        &self,
        request: &CausalActionRequest,
    ) -> StorageResult<PreparedAction> {
        validate_request(request)?;
        let source: serde_json::Value = self
            .read(OCCURRENCES, &request.source_occurrence_id)
            .await?
            .ok_or_else(|| StorageError::InvalidConfig("source occurrence is absent".into()))?;
        if request.root_occurrence_id != request.source_occurrence_id {
            let _: serde_json::Value = self
                .read(OCCURRENCES, &request.root_occurrence_id)
                .await?
                .ok_or_else(|| {
                StorageError::InvalidConfig("root occurrence is absent".into())
            })?;
        }
        verify_reply(request, &source)?;

        let root_before: Option<CausalRoot> = self.read(ROOTS, &request.root_occurrence_id).await?;
        if let Some(root) = &root_before {
            if root.policy_revision != request.policy.revision
                || root.max_depth != request.policy.max_depth
                || root.max_fanout != request.policy.max_fanout
            {
                return Err(StorageError::InvalidConfig(
                    "causal budget differs from the root's pinned policy".into(),
                ));
            }
        } else if request.parent_action_id.is_some()
            || request.source_occurrence_id != request.root_occurrence_id
        {
            return Err(StorageError::InvalidConfig(
                "non-root reaction has no durable causal root".into(),
            ));
        }

        let parent: Option<ActionReceipt> = match &request.parent_action_id {
            Some(parent_id) => {
                let parent: ActionReceipt = self
                    .read(ACTIONS, parent_id)
                    .await?
                    .ok_or_else(|| StorageError::InvalidConfig("parent action is absent".into()))?;
                if parent.root_occurrence_id != request.root_occurrence_id
                    || matches!(
                        parent.state,
                        ActionState::Pending
                            | ActionState::Suppressed
                            | ActionState::Withheld
                            | ActionState::Uncertain
                    )
                {
                    return Err(StorageError::InvalidConfig(
                        "parent action is not an eligible causal predecessor".into(),
                    ));
                }
                Some(parent)
            }
            None => {
                if request.source_occurrence_id != request.root_occurrence_id {
                    return Err(StorageError::InvalidConfig(
                        "non-root source must name its parent action".into(),
                    ));
                }
                None
            }
        };

        let depth = parent.as_ref().map_or(1, |p| p.depth.saturating_add(1));
        let mut visited_routes = parent
            .as_ref()
            .map_or_else(Vec::new, |p| p.visited_routes.clone());
        let root_used = root_before.as_ref().map_or(0, |r| r.fanout_used);
        let suppression = if visited_routes.contains(&request.route_identity) {
            Some("visited_route")
        } else if depth > request.policy.max_depth {
            Some("depth_exhausted")
        } else if root_used >= request.policy.max_fanout {
            Some("fanout_exhausted")
        } else {
            None
        };
        let charge = suppression.is_none();
        if charge {
            visited_routes.push(request.route_identity.clone());
        }
        let timestamp = now();
        let root_after = CausalRoot {
            root_occurrence_id: request.root_occurrence_id.clone(),
            policy_revision: request.policy.revision.clone(),
            max_depth: request.policy.max_depth,
            max_fanout: request.policy.max_fanout,
            fanout_used: root_used + u8::from(charge),
            recorded_at: root_before
                .as_ref()
                .map_or_else(|| timestamp.clone(), |r| r.recorded_at.clone()),
        };
        let receipt = ActionReceipt {
            action_id: action_id(request),
            request_hash: request_hash(request)?,
            root_occurrence_id: request.root_occurrence_id.clone(),
            source_occurrence_id: request.source_occurrence_id.clone(),
            parent_action_id: request.parent_action_id.clone(),
            route_identity: request.route_identity.clone(),
            visited_routes,
            depth,
            remaining_depth: request.policy.max_depth.saturating_sub(depth),
            remaining_fanout: request
                .policy
                .max_fanout
                .saturating_sub(root_after.fanout_used),
            kind: request.kind,
            reply_target: request.reply_target.clone(),
            reply_grant_id: request.reply_grant.as_ref().map(|g| g.grant_id.clone()),
            reply_grant_revision: request
                .reply_grant
                .as_ref()
                .map(|g| g.grant_revision.clone()),
            original_principal: request.original_principal.clone(),
            actor_id: request.actor_id.clone(),
            state: if charge {
                ActionState::Pending
            } else {
                ActionState::Suppressed
            },
            suppression_reason: suppression.map(str::to_owned),
            claimant: None,
            recorded_at: timestamp.clone(),
            updated_at: timestamp,
        };
        Ok(PreparedAction {
            receipt,
            root_before,
            root_after,
            charge,
        })
    }

    pub(super) async fn commit_action(
        &self,
        prepared: &PreparedAction,
        observer: Option<&ObserverAppend>,
    ) -> StorageResult<()> {
        let transaction_label = if observer.is_some() {
            "observer_action_commit"
        } else {
            "causal_action_commit"
        };
        let root_id = &prepared.receipt.root_occurrence_id;
        let action_id = &prepared.receipt.action_id;
        let mut sql = String::from("BEGIN TRANSACTION; ");
        if prepared.root_before.is_some() {
            sql.push_str(&format!(
                "LET $root_current = SELECT * FROM ONLY {ROOTS}:{root_id} FOR UPDATE; \
                 IF $root_current = NONE {{ THROW 'causal root missing' }}; \
                 IF $root_current.fanout_used != $expected_used \
                    OR $root_current.policy_revision != $policy_revision {{ \
                     THROW 'causal root changed' \
                 }}; "
            ));
            if prepared.charge {
                sql.push_str(&format!(
                    "UPDATE ONLY {ROOTS}:{root_id} CONTENT $root_after; "
                ));
            }
        } else {
            sql.push_str(&format!(
                "CREATE ONLY {ROOTS}:{root_id} CONTENT $root_after; "
            ));
        }
        if let Some(observer) = observer {
            let subscription_key = subscription_record_id(&observer.delivery.subscription_id);
            let delivery_key = &observer.delivery.delivery_id;
            sql.push_str(&format!(
                "LET $subscriber_current = SELECT * FROM ONLY {SUBSCRIPTIONS}:{subscription_key} FOR UPDATE; \
                 IF $subscriber_current = NONE {{ THROW 'observer subscription missing' }}; \
                 IF $subscriber_current.next_sequence != $expected_sequence \
                    OR $subscriber_current.status != 'active' \
                    OR $subscriber_current.grant_revision != $grant_revision {{ \
                     THROW 'observer subscription changed' \
                 }}; \
                 UPDATE ONLY {SUBSCRIPTIONS}:{subscription_key} CONTENT $subscriber_after; "
            ));
            if prepared.charge {
                sql.push_str(&format!(
                    "CREATE ONLY {DELIVERIES}:{delivery_key} CONTENT $delivery; "
                ));
                sql.push_str(&format!(
                    "CREATE ONLY {PROJECTIONS}:{delivery_key} CONTENT $projection; "
                ));
            }
        }
        sql.push_str(&format!(
            "CREATE ONLY {ACTIONS}:{action_id} CONTENT $action; COMMIT TRANSACTION;"
        ));
        let mut query = self
            .db
            .query(sql)
            .bind(("root_after", encode(&prepared.root_after)?))
            .bind(("action", encode(&prepared.receipt)?))
            .bind((
                "policy_revision",
                prepared.root_after.policy_revision.clone(),
            ))
            .bind((
                "expected_used",
                prepared.root_before.as_ref().map_or(0, |r| r.fanout_used) as i64,
            ));
        if let Some(observer) = observer {
            query = query
                .bind(("subscriber_after", encode(&observer.subscription_after)?))
                .bind(("delivery", encode(&observer.delivery)?))
                .bind(("projection", encode(&observer.projection)?))
                .bind(("grant_revision", observer.delivery.grant_revision.clone()))
                .bind((
                    "expected_sequence",
                    observer.subscription_before.next_sequence as i64,
                ));
        }
        let mut response = query.await.map_err(db_error)?;
        let mut errors = response.take_errors().into_iter().collect::<Vec<_>>();
        if !errors.is_empty() {
            errors.sort_by_key(|(index, _)| *index);
            let (index, error) = errors
                .iter()
                .find(|(_, error)| {
                    !matches!(
                        error.query_details(),
                        Some(surrealdb::types::QueryError::NotExecuted)
                    )
                })
                .unwrap_or(&errors[0]);
            return Err(StorageError::Backend(format!(
                "{transaction_label} statement {index} failed ({})",
                redacted_error_class(error)
            )));
        }
        Ok(())
    }
}

fn redacted_error_class(error: &surrealdb::Error) -> &'static str {
    match error.query_details() {
        Some(surrealdb::types::QueryError::NotExecuted) => "query_not_executed",
        Some(surrealdb::types::QueryError::TimedOut { .. }) => "query_timed_out",
        Some(surrealdb::types::QueryError::Cancelled) => "query_cancelled",
        Some(surrealdb::types::QueryError::TransactionConflict) => "transaction_conflict",
        Some(_) => "query_other",
        None if error.is_validation() => "validation",
        None if error.is_configuration() => "configuration",
        None if error.is_serialization() => "serialization",
        None if error.is_not_allowed() => "not_allowed",
        None if error.is_not_found() => "not_found",
        None if error.is_already_exists() => "already_exists",
        None if error.is_connection() => "connection",
        None if error.is_thrown() => "thrown",
        None if error.is_context() => "context",
        None => "internal",
    }
}

pub(super) fn action_id(request: &CausalActionRequest) -> String {
    digest_parts(&[
        "channel-causal-action-v1",
        &request.root_occurrence_id,
        request.parent_action_id.as_deref().unwrap_or(""),
        &request.action_key,
    ])
}

pub(super) fn request_hash(request: &CausalActionRequest) -> StorageResult<String> {
    let bytes = serde_json::to_vec(request)
        .map_err(|e| StorageError::Backend(format!("causal request encoding failed: {e}")))?;
    Ok(hex::encode(Sha256::digest(bytes)))
}

pub(super) fn existing_admission(
    existing: ActionReceipt,
    expected_hash: &str,
) -> StorageResult<ActionAdmission> {
    if existing.request_hash != expected_hash {
        return Err(StorageError::InvalidConfig(
            "action key was reused with different immutable provenance".into(),
        ));
    }
    Ok(if existing.state == ActionState::Suppressed {
        ActionAdmission::Suppressed(existing)
    } else {
        ActionAdmission::Replay(existing)
    })
}

pub(super) fn new_admission(receipt: ActionReceipt) -> ActionAdmission {
    if receipt.state == ActionState::Suppressed {
        ActionAdmission::Suppressed(receipt)
    } else {
        ActionAdmission::New(receipt)
    }
}

fn validate_request(request: &CausalActionRequest) -> StorageResult<()> {
    validate_digest(&request.root_occurrence_id, "root_occurrence_id")?;
    validate_digest(&request.source_occurrence_id, "source_occurrence_id")?;
    if let Some(parent) = &request.parent_action_id {
        validate_digest(parent, "parent_action_id")?;
    }
    for (name, value) in [
        ("action_key", &request.action_key),
        ("route_identity", &request.route_identity),
        ("original_principal", &request.original_principal),
        ("actor_id", &request.actor_id),
        ("policy revision", &request.policy.revision),
    ] {
        required(value, name)?;
    }
    if request.policy.max_depth == 0
        || request.policy.max_depth > DEFAULT_MAX_DEPTH
        || request.policy.max_fanout == 0
        || request.policy.max_fanout > DEFAULT_MAX_FANOUT
    {
        return Err(StorageError::InvalidConfig(
            "causal policy may lower but not raise default depth 4/fanout 8".into(),
        ));
    }
    Ok(())
}

fn verify_reply(request: &CausalActionRequest, source: &serde_json::Value) -> StorageResult<()> {
    if request.kind != ActionKind::Reply {
        if request.reply_target.is_some() || request.reply_grant.is_some() {
            return Err(StorageError::InvalidConfig(
                "non-reply action cannot carry reply authority".into(),
            ));
        }
        return Ok(());
    }
    let target = request
        .reply_target
        .as_ref()
        .ok_or_else(|| StorageError::InvalidConfig("reply requires an exact target".into()))?;
    let grant = request.reply_grant.as_ref().ok_or_else(|| {
        StorageError::InvalidConfig("reply requires a current grant reference".into())
    })?;
    required(&grant.grant_id, "reply grant ID")?;
    required(&grant.grant_revision, "reply grant revision")?;
    if grant.allowed_target != *target {
        return Err(StorageError::InvalidConfig(
            "reply target differs from the granted exact target".into(),
        ));
    }
    let source_scope: ChannelScope = decode(source.get("scope").cloned().ok_or_else(|| {
        StorageError::Backend("source occurrence lacks normalized scope".into())
    })?)?;
    if grant.scope == ReplyGrantScope::SourceOnly
        && ReplyTargetScope::from(&source_scope) != *target
    {
        return Err(StorageError::InvalidConfig(
            "cross-scope reply requires a separate exact-target grant".into(),
        ));
    }
    Ok(())
}
