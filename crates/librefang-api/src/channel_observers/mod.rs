//! Fabric is the observer transport, never the channel scheduler. BossFang
//! retains the source route and UAR owns any selected handler execution.

use librefang_channels::channel_route::{RouteAdmission, SourceOccurrence};
use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use uuid::Uuid;

pub const PROFILE: &str = "frf.routed-observer/1";

#[derive(Clone)]
pub struct ObserverTransportConfig {
    pub fabric_url: String,
    pub fabric_bearer: String,
    pub fabric_channel_id: Uuid,
    pub tenant_id: Uuid,
}

#[derive(Clone)]
pub struct ObserverTarget {
    pub subscription_id: String,
    pub uar_workspace_id: String,
    pub source_grant_issuer: String,
    pub source_grant_id: String,
}

impl ObserverTransportConfig {
    /// No partial activation: an incomplete protected host configuration is
    /// unavailable rather than a silent, apparently enabled observer.
    pub fn from_host() -> Result<Option<Self>, String> {
        let names = [
            "LIBREFANG_CHANNEL_FABRIC_URL",
            "LIBREFANG_CHANNEL_FABRIC_BEARER",
            "LIBREFANG_CHANNEL_FABRIC_CHANNEL_ID",
            "LIBREFANG_CHANNEL_FABRIC_TENANT_ID",
        ];
        let values = names.map(std::env::var);
        if values.iter().all(Result::is_err) {
            return Ok(None);
        }
        let mut values = values.into_iter();
        let mut next = |name: &str| -> Result<String, String> {
            values
                .next()
                .expect("fixed observer host configuration field count")
                .map_err(|_| format!("{name} is not configured"))
                .and_then(|value| {
                    (!value.trim().is_empty())
                        .then_some(value)
                        .ok_or_else(|| format!("{name} is empty"))
                })
        };
        let fabric_url = next(names[0])?;
        let fabric_bearer = next(names[1])?;
        let fabric_channel_id = Uuid::parse_str(&next(names[2])?)
            .map_err(|_| "Fabric channel ID must be a UUID".to_string())?;
        let tenant_id = Uuid::parse_str(&next(names[3])?)
            .map_err(|_| "Fabric tenant ID must be a UUID".to_string())?;
        let parsed = reqwest::Url::parse(&fabric_url)
            .map_err(|_| "Fabric URL is invalid".to_string())?;
        let loopback = matches!(parsed.host_str(), Some("127.0.0.1" | "localhost" | "::1"));
        if parsed.scheme() != "https" && !(parsed.scheme() == "http" && loopback) {
            return Err("Fabric URL must use HTTPS or loopback HTTP".into());
        }
        Ok(Some(Self {
            fabric_url: fabric_url.trim_end_matches('/').to_string(),
            fabric_bearer,
            fabric_channel_id,
            tenant_id,
        }))
    }
}

/// Carry only the Gate-authorized text projection and selected-route metadata.
/// Media, channel credentials and arbitrary sidecar metadata stay out.
#[cfg(feature = "surreal-backend")]
pub fn observer_envelope(
    config: &ObserverTransportConfig,
    target: &ObserverTarget,
    source: &librefang_storage::SourceOccurrenceReceipt,
    delivery: &librefang_storage::channel_actions::ObserverDeliveryReceipt,
    action: &librefang_storage::channel_actions::ActionReceipt,
    policy_revision: &str,
    text: &str,
) -> Result<Value, String> {
    use librefang_storage::channel_actions::{ActionKind, CausalPolicy};
    let policy = CausalPolicy::default();
    let fanout = policy.max_fanout.checked_sub(action.remaining_fanout)
        .ok_or_else(|| "observer action fanout exceeds its pinned policy".to_string())?;
    if action.action_id != delivery.action_id
        || action.source_occurrence_id != source.occurrence_id
        || action.kind != ActionKind::ObserverCopy
        || action.route_identity != format!("observer:{}", target.subscription_id)
        || action.visited_routes.last() != Some(&action.route_identity)
        || action.depth == 0
        || action.depth > policy.max_depth
        || action.remaining_depth != policy.max_depth - action.depth
        || fanout == 0
        || delivery.subscription_id != target.subscription_id
    {
        return Err("observer action lineage does not match the durable delivery".into());
    }
    let revision = source.route_revision
        .ok_or_else(|| "observer source route has no revision".to_string())?;
    let handler = match &source.decision.outcome {
        librefang_storage::RouteOutcome::Selected { handler } => handler.as_str(),
        _ => return Err("observer source has no selected handler".into()),
    };
    let scope = &source.scope;
    Ok(json!({
        "profile": PROFILE,
        "source": {
            "occurrence_id": source.occurrence_id,
            "native_message_id": source.native_message_id,
            "tenant_id": config.tenant_id,
            "provider": scope.provider,
            "account": scope.account,
            "workspace": scope.workspace,
            "room": scope.room,
            "thread": scope.thread,
            "sender": scope.sender,
        },
        "selection": {
            "route_id": source.scope_key,
            "handler_id": handler,
            "route_revision": revision.to_string(),
            "binding_revision": source.decision.binding_revision.as_deref().unwrap_or("unversioned"),
            "policy_revision": policy_revision,
            "original_principal": scope.sender,
        },
        "delivery": {
            "delivery_id": delivery.delivery_id,
            "subscriber_id": target.subscription_id,
            "subscriber_cursor_id": format!("{}:{}", target.subscription_id, delivery.sequence),
            "classification": "policy_filtered",
        },
        "causal": {
            "root_occurrence_id": action.root_occurrence_id,
            "parent_action_id": action.parent_action_id,
            "action_id": action.action_id,
            "depth": action.depth,
            "fanout": fanout,
            "visited_routes": action.visited_routes,
        },
        "projection": {"text": text},
    }))
}

#[cfg(feature = "surreal-backend")]
pub fn source_filter_id(source: &librefang_channels::channel_route::ChannelScope) -> Result<String, String> {
    let scope = serde_json::to_vec(source)
        .map_err(|_| "cannot encode observer source filter".to_string())?;
    Ok(hex::encode(Sha256::digest([b"channel-source-filter-v1:".as_slice(), &scope].concat())))
}

/// Gate first, then atomically enqueue one text-only copy for each matching
/// independent subscriber. A denied subscriber never gets a content row.
#[cfg(feature = "surreal-backend")]
pub async fn queue_observers(
    storage: &librefang_storage::StorageConfig,
    source: &SourceOccurrence,
    route: &RouteAdmission,
    handler: &str,
    message: &librefang_channels::types::ChannelMessage,
) -> Result<(), String> {
    use librefang_channels::types::ChannelContent;
    use librefang_storage::channel_actions::{
        ActionKind, CausalActionRequest, CausalPolicy, ChannelActionStore,
        ObserverDeliveryRequest, ObserverProjection, ObserverStatus,
    };
    if ObserverTransportConfig::from_host()?.is_none() {
        return Ok(());
    }
    if !matches!(&storage.backend, librefang_storage::StorageBackendKind::Remote(_)) {
        return Err("cross-host observers require remote shared SurrealDB".into());
    }
    let ChannelContent::Text(text) = &message.content else {
        return Err("media observer projection is unsupported".into());
    };
    let route_revision = route.route_revision
        .ok_or_else(|| "observer source route has no revision".to_string())?
        .to_string();
    let session = librefang_storage::shared_pool().open(storage).await
        .map_err(|error| format!("open observer storage: {error}"))?;
    let store = ChannelActionStore::open(&session).await
        .map_err(|error| format!("open observer queue: {error}"))?;
    let filter_id = source_filter_id(&source.scope)?;
    let subscriptions = store.list_observer_subscriptions_for_filter(&filter_id, 1000).await
        .map_err(|error| format!("list authorized observer subscriptions: {error}"))?;
    let actor = std::env::var("LIBREFANG_CHANNEL_GATE_IDENTITY_SUBJECT")
        .map_err(|_| "channel Gate service identity is not configured".to_string())?;
    for subscriber in subscriptions {
        if subscriber.status != ObserverStatus::Active {
            continue;
        }
        let source_key = format!("observer-source-v1:{}:{}", subscriber.subscription_id, route.occurrence_id);
        let destination_key = format!("observer-recipient-v1:{}:{}", subscriber.subscription_id, route.occurrence_id);
        let route_identity = format!("observer:{}", subscriber.subscription_id);
        let source_effect = crate::channel_authority::ChannelEffectInput {
            effect_key: &source_key,
            occurrence_id: &route.occurrence_id,
            action: crate::channel_authority::ChannelEffectAction::SourceDisclosure,
            scope: &source.scope,
            recipient: &subscriber.observer_instance_id,
            handler,
            route_revision: &route_revision,
            payload: text.as_bytes(),
            payload_sha256: None,
            classification: "policy_filtered",
            root_occurrence_id: &route.occurrence_id,
            parent_action_id: None,
            route_identity: &route_identity,
            visited_routes: &[],
            remaining_depth: 1,
            remaining_fanout: 1,
            grant_issuer: &subscriber.source_grant_issuer,
            grant_id: &subscriber.source_grant_id,
        };
        let disclosure = match crate::channel_authority::release_channel_effect(&source_effect).await {
            Ok(released) => released,
            Err(error) if error.contains("did not authorize") => continue,
            Err(error) => return Err(error),
        };
        let recipient_effect = crate::channel_authority::ChannelEffectInput {
            effect_key: &destination_key,
            occurrence_id: &route.occurrence_id,
            action: crate::channel_authority::ChannelEffectAction::RecipientDelivery,
            scope: &source.scope,
            recipient: &subscriber.observer_instance_id,
            handler,
            route_revision: &route_revision,
            payload: text.as_bytes(),
            payload_sha256: None,
            classification: "policy_filtered",
            root_occurrence_id: &route.occurrence_id,
            parent_action_id: None,
            route_identity: &route_identity,
            visited_routes: &[],
            remaining_depth: 1,
            remaining_fanout: 1,
            grant_issuer: &subscriber.recipient_grant_issuer,
            grant_id: &subscriber.recipient_grant_id,
        };
        let recipient = match crate::channel_authority::evaluate_channel_effect(&recipient_effect).await {
            Ok(eligible) => eligible,
            Err(error) if error.contains("did not authorize") => continue,
            Err(error) => return Err(error),
        };
        if recipient.grant_revision.to_string() != subscriber.grant_revision {
            continue;
        }
        let request = ObserverDeliveryRequest {
            subscription_id: subscriber.subscription_id.clone(),
            occurrence_id: route.occurrence_id.clone(),
            grant_revision: subscriber.grant_revision.clone(),
            action: CausalActionRequest {
                root_occurrence_id: route.occurrence_id.clone(),
                source_occurrence_id: route.occurrence_id.clone(),
                parent_action_id: None,
                action_key: format!("observer:{}", subscriber.subscription_id),
                route_identity,
                kind: ActionKind::ObserverCopy,
                reply_target: None,
                reply_grant: None,
                policy: CausalPolicy::default(),
                original_principal: source.scope.sender.clone(),
                actor_id: actor.clone(),
            },
            projection: ObserverProjection {
                source_grant_issuer: subscriber.source_grant_issuer,
                source_grant_id: subscriber.source_grant_id,
                source_grant_revision: disclosure.grant_revision.to_string(),
                classification: "policy_filtered".into(),
                text: Some(text.clone()),
            },
        };
        store.enqueue_observer_delivery(&request).await
            .map_err(|error| format!("queue authorized observer copy: {error}"))?;
    }
    Ok(())
}

#[cfg(feature = "surreal-backend")]
fn channel_scope(scope: &librefang_storage::ChannelScope) -> Result<librefang_channels::channel_route::ChannelScope, String> {
    use librefang_channels::channel_route::AccountKind;
    let account_kind = match scope.account_kind.as_str() {
        "native" => AccountKind::Native,
        "configured_instance" => AccountKind::ConfiguredInstance,
        _ => return Err("stored observer source account kind is invalid".into()),
    };
    Ok(librefang_channels::channel_route::ChannelScope {
        provider: scope.provider.clone(),
        account: scope.account.clone(),
        account_kind,
        workspace: scope.workspace.clone(),
        room: scope.room.clone(),
        thread: scope.thread.clone(),
        sender: scope.sender.clone(),
    })
}

/// Drain only pending, unclaimed copies. A claimed publish with an unknown
/// outcome remains uncertain for operator reconciliation, never auto-reposted.
#[cfg(feature = "surreal-backend")]
pub async fn flush_pending_observers(
    storage: &librefang_storage::StorageConfig,
    config: &ObserverTransportConfig,
) -> Result<(), String> {
    use librefang_storage::channel_actions::{ChannelActionStore, ObserverDeliveryClaim, ObserverStatus};
    if !matches!(&storage.backend, librefang_storage::StorageBackendKind::Remote(_)) {
        return Err("cross-host observers require remote shared SurrealDB".into());
    }
    let session = librefang_storage::shared_pool().open(storage).await
        .map_err(|error| format!("open observer storage: {error}"))?;
    let actions = ChannelActionStore::open(&session).await
        .map_err(|error| format!("open observer action store: {error}"))?;
    let routes = librefang_storage::ChannelRouteStore::open(&session).await
        .map_err(|error| format!("open observer source store: {error}"))?;
    let subscriptions = actions.list_observer_subscriptions(1000).await
        .map_err(|error| format!("list observer subscriptions: {error}"))?;
    for subscriber in subscriptions {
        if subscriber.status != ObserverStatus::Active {
            continue;
        }
        let pending = actions.pending_observer_deliveries(&subscriber.subscription_id, 100).await
            .map_err(|error| format!("list pending observer copies: {error}"))?;
        for delivery in pending {
            if delivery.projection_sha256.is_empty() || delivery.classification != "policy_filtered" {
                // A pre-048 row cannot be disclosed from an inferred digest.
                continue;
            }
            let source = routes.source_occurrence(&delivery.occurrence_id).await
                .map_err(|error| format!("read observer source occurrence: {error}"))?
                .ok_or_else(|| "observer source occurrence is missing".to_string())?;
            let handler = match &source.decision.outcome {
                librefang_storage::RouteOutcome::Selected { handler } => handler.as_str(),
                _ => continue,
            };
            let scope = channel_scope(&source.scope)?;
            let route_revision = source.route_revision
                .ok_or_else(|| "observer source route revision is missing".to_string())?
                .to_string();
            let route_identity = format!("observer:{}", subscriber.subscription_id);
            let source_key = format!("observer-source-v1:{}:{}", subscriber.subscription_id, delivery.occurrence_id);
            let destination_key = format!("observer-recipient-v1:{}:{}", subscriber.subscription_id, delivery.occurrence_id);
            let source_effect = crate::channel_authority::ChannelEffectInput {
                effect_key: &source_key,
                occurrence_id: &delivery.occurrence_id,
                action: crate::channel_authority::ChannelEffectAction::SourceDisclosure,
                scope: &scope,
                recipient: &subscriber.observer_instance_id,
                handler,
                route_revision: &route_revision,
                payload: &[],
                payload_sha256: Some(&delivery.projection_sha256),
                classification: &delivery.classification,
                root_occurrence_id: &delivery.occurrence_id,
                parent_action_id: None,
                route_identity: &route_identity,
                visited_routes: &[],
                remaining_depth: 1,
                remaining_fanout: 1,
                grant_issuer: &subscriber.source_grant_issuer,
                grant_id: &subscriber.source_grant_id,
            };
            let disclosure = match crate::channel_authority::evaluate_channel_effect(&source_effect).await {
                Ok(eligible) => eligible,
                Err(error) if error.contains("did not authorize") => {
                    actions.withhold_observer_delivery(&subscriber.subscription_id, delivery.sequence, "current_source_grant_denied")
                        .await.map_err(|err| format!("withhold observer copy: {err}"))?;
                    continue;
                }
                Err(error) => return Err(error),
            };
            let recipient_effect = crate::channel_authority::ChannelEffectInput {
                effect_key: &destination_key,
                occurrence_id: &delivery.occurrence_id,
                action: crate::channel_authority::ChannelEffectAction::RecipientDelivery,
                scope: &scope,
                recipient: &subscriber.observer_instance_id,
                handler,
                route_revision: &route_revision,
                payload: &[],
                payload_sha256: Some(&delivery.projection_sha256),
                classification: &delivery.classification,
                root_occurrence_id: &delivery.occurrence_id,
                parent_action_id: None,
                route_identity: &route_identity,
                visited_routes: &[],
                remaining_depth: 1,
                remaining_fanout: 1,
                grant_issuer: &subscriber.recipient_grant_issuer,
                grant_id: &subscriber.recipient_grant_id,
            };
            let recipient = match crate::channel_authority::evaluate_channel_effect(&recipient_effect).await {
                Ok(eligible) => eligible,
                Err(error) if error.contains("did not authorize") => {
                    actions.withhold_observer_delivery(&subscriber.subscription_id, delivery.sequence, "current_recipient_grant_denied")
                        .await.map_err(|err| format!("withhold observer copy: {err}"))?;
                    continue;
                }
                Err(error) => return Err(error),
            };
            if recipient.grant_revision.to_string() != delivery.grant_revision {
                actions.withhold_observer_delivery(&subscriber.subscription_id, delivery.sequence, "recipient_grant_revision_changed")
                    .await.map_err(|error| format!("withhold stale observer copy: {error}"))?;
                continue;
            }
            let action = actions.action_receipt(&delivery.action_id).await
                .map_err(|error| format!("read observer action lineage: {error}"))?
                .ok_or_else(|| "observer delivery has no durable causal action".to_string())?;
            let claimant = Uuid::new_v4().to_string();
            let claim = actions.claim_observer_delivery(
                &subscriber.subscription_id, delivery.sequence, &claimant, &delivery.grant_revision,
            ).await.map_err(|error| format!("claim observer copy: {error}"))?;
            if !matches!(claim, ObserverDeliveryClaim::Acquired(_)) {
                continue;
            }
            let projection = actions.released_observer_projection(
                &subscriber.subscription_id, delivery.sequence,
                &subscriber.source_grant_issuer, &subscriber.source_grant_id,
                &disclosure.grant_revision.to_string(), &recipient.grant_revision.to_string(),
            ).await.map_err(|error| format!("release filtered observer projection: {error}"))?;
            let Some(text) = projection.and_then(|projection| projection.text) else {
                actions.mark_observer_uncertain(&subscriber.subscription_id, delivery.sequence, &claimant)
                    .await.map_err(|error| format!("mark observer projection uncertain: {error}"))?;
                continue;
            };
            let target = ObserverTarget {
                subscription_id: subscriber.subscription_id.clone(),
                uar_workspace_id: subscriber.uar_workspace_id.clone(),
                source_grant_issuer: subscriber.source_grant_issuer.clone(),
                source_grant_id: subscriber.source_grant_id.clone(),
            };
            let envelope = match observer_envelope(
                config, &target, &source, &delivery, &action, &recipient.policy_revision, &text,
            ) {
                Ok(envelope) => envelope,
                Err(error) => {
                    actions.mark_observer_uncertain(&subscriber.subscription_id, delivery.sequence, &claimant)
                        .await.map_err(|failure| format!("mark invalid observer lineage uncertain: {failure}"))?;
                    return Err(error);
                }
            };
            if let Err(error) = publish_to_fabric(config, &target, &envelope).await {
                actions.mark_observer_uncertain(&subscriber.subscription_id, delivery.sequence, &claimant)
                    .await.map_err(|err| format!("mark Fabric publication uncertain: {err}"))?;
                return Err(error);
            }
            actions.complete_observer_delivery(&subscriber.subscription_id, delivery.sequence, &claimant)
                .await.map_err(|error| format!("complete observer Fabric publication: {error}"))?;
        }
    }
    Ok(())
}


mod control;
pub use control::{cancel_channel_execution, control_capability, detach_channel_observation};

mod transport;
pub use transport::publish_to_fabric;
#[cfg(feature = "uar-driver")]
pub use transport::{change_uar_subscription, create_uar_subscription};
#[cfg(all(feature = "uar-driver", feature = "surreal-backend"))]
pub use transport::consume_fabric_to_uar;
