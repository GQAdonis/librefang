use super::*;
use std::time::Duration;
#[cfg(feature = "uar-driver")]
use futures::StreamExt;

fn client() -> Result<reqwest::Client, String> {
    reqwest::Client::builder()
        .timeout(Duration::from_secs(10))
        .build()
        .map_err(|error| format!("observer transport client: {error}"))
}

#[cfg(feature = "uar-driver")]
pub async fn create_uar_subscription(
    observer_instance_id: &str,
    source: &librefang_channels::channel_route::ChannelScope,
    recipient_grant_issuer: &str,
    recipient_grant_id: &str,
) -> Result<String, String> {
    let (endpoint, bearer) = librefang_llm_drivers::drivers::uar::supervised_channel_binding()
        .ok_or_else(|| "UAR sidecar endpoint or host credential is unavailable".to_string())?;
    let body = json!({
        "observerInstanceId": observer_instance_id,
        "source": {
            "provider": source.provider,
            "account": source.account,
            "workspace": source.workspace,
            "room": source.room,
            "thread": source.thread,
            "sender": source.sender,
        },
        "grantIssuer": recipient_grant_issuer,
        "grantId": recipient_grant_id,
    });
    let response = client()?
        .post(format!("{endpoint}/api/uar/channel-observers/v1/subscriptions"))
        .bearer_auth(bearer.as_str())
        .header("x-uar-workspace-id", &source.workspace)
        .json(&body)
        .send().await
        .map_err(|error| format!("create UAR observer subscription: {error}"))?;
    if !response.status().is_success() {
        return Err(format!("UAR observer subscription refused ({})", response.status()));
    }
    let record: Value = response.json().await
        .map_err(|_| "UAR observer subscription returned invalid JSON".to_string())?;
    record["subscriptionId"].as_str().filter(|id| !id.is_empty())
        .map(str::to_string)
        .ok_or_else(|| "UAR observer subscription omitted its ID".to_string())
}

/// Publish the canonical profile inside Fabric's existing v1 event envelope.
/// The Fabric offset is a transport position, not UAR's subscriber cursor.
pub async fn publish_to_fabric(
    config: &ObserverTransportConfig,
    target: &ObserverTarget,
    payload: &Value,
) -> Result<(), String> {
    let occurrence_id = payload["source"]["occurrence_id"]
        .as_str()
        .ok_or_else(|| "observer source occurrence is absent".to_string())?;
    let delivery_id = payload["delivery"]["delivery_id"]
        .as_str()
        .ok_or_else(|| "observer delivery ID is absent".to_string())?;
    let event_id = Uuid::new_v5(&Uuid::NAMESPACE_URL, delivery_id.as_bytes());
    let event = json!({
        "id": event_id,
        "channel": {
            "id": config.fabric_channel_id,
            "tenant_id": config.tenant_id,
            "path": format!("channel/observers/{}", target.subscription_id),
        },
        "offset": 0,
        "kind": {"custom": PROFILE},
        "payload": payload,
        "timestamp": chrono::Utc::now(),
        "correlation_id": occurrence_id,
    });
    let response = client()?
        .post(format!("{}/v1/publish", config.fabric_url))
        .bearer_auth(&config.fabric_bearer)
        .json(&event)
        .send()
        .await
        .map_err(|error| format!("Fabric observer publish failed: {error}"))?;
    if !response.status().is_success() {
        return Err(format!("Fabric observer publish refused ({})", response.status()));
    }
    Ok(())
}

/// Deliver a Fabric profile to the authenticated UAR host ingress. UAR keeps
/// its own immutable delivery receipt and independently rechecks Gate's
/// recipient-delivery authority before any observer receives the copy.
#[cfg(feature = "uar-driver")]
pub async fn deliver_to_uar(
    target: &ObserverTarget,
    payload: &Value,
) -> Result<UarDeliveryStatus, String> {
    let (endpoint, bearer) = librefang_llm_drivers::drivers::uar::supervised_channel_binding()
        .ok_or_else(|| "UAR sidecar endpoint or host credential is unavailable".to_string())?;
    let response = client()?
        .post(format!(
            "{endpoint}/api/uar/channel-observers/v1/subscriptions/{}/deliveries",
            target.subscription_id,
        ))
        .bearer_auth(bearer.as_str())
        .header("x-uar-workspace-id", &target.uar_workspace_id)
        .json(payload)
        .send()
        .await
        .map_err(|error| format!("UAR observer delivery failed: {error}"))?;
    if !response.status().is_success() {
        return Err(format!("UAR observer delivery refused ({})", response.status()));
    }
    let entry: Value = response.json().await
        .map_err(|_| "UAR observer delivery returned invalid JSON".to_string())?;
    if entry["deliveryId"] != payload["delivery"]["delivery_id"] {
        return Err("UAR observer delivery receipt did not match the source copy".into());
    }
    match entry["status"].as_str() {
        Some("admitted") => Ok(UarDeliveryStatus::Admitted),
        Some("acknowledged") => Ok(UarDeliveryStatus::Acknowledged),
        Some("withheld") => Ok(UarDeliveryStatus::Withheld),
        Some("uncertain") => Ok(UarDeliveryStatus::Uncertain),
        Some("pending_authority") => Ok(UarDeliveryStatus::PendingAuthority),
        _ => Err("UAR observer delivery returned an unknown state".into()),
    }
}

#[cfg(feature = "uar-driver")]
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum UarDeliveryStatus {
    PendingAuthority,
    Admitted,
    Withheld,
    Uncertain,
    Acknowledged,
}

#[cfg(feature = "uar-driver")]
async fn acknowledge_uar(target: &ObserverTarget, delivery_id: &str) -> Result<(), String> {
    let (endpoint, bearer) = librefang_llm_drivers::drivers::uar::supervised_channel_binding()
        .ok_or_else(|| "UAR sidecar endpoint or host credential is unavailable".to_string())?;
    let list: Value = client()?
        .get(format!("{endpoint}/api/uar/channel-observers/v1/subscriptions"))
        .bearer_auth(bearer.as_str())
        .header("x-uar-workspace-id", &target.uar_workspace_id)
        .send().await
        .map_err(|error| format!("read UAR observer cursor: {error}"))?
        .json().await
        .map_err(|_| "UAR observer subscription list is invalid".to_string())?;
    let revision = list.as_array()
        .and_then(|rows| rows.iter().find(|row| row["subscriptionId"] == target.subscription_id))
        .and_then(|row| row["revision"].as_u64())
        .ok_or_else(|| "UAR observer subscription revision is unavailable".to_string())?;
    let response = client()?
        .post(format!(
            "{endpoint}/api/uar/channel-observers/v1/subscriptions/{}/deliveries/{delivery_id}/acknowledge",
            target.subscription_id,
        ))
        .bearer_auth(bearer.as_str())
        .header("x-uar-workspace-id", &target.uar_workspace_id)
        .json(&json!({"expectedRevision": revision}))
        .send().await
        .map_err(|error| format!("acknowledge UAR observer delivery: {error}"))?;
    if !response.status().is_success() {
        return Err(format!("UAR observer acknowledgement refused ({})", response.status()));
    }
    let entry: Value = response.json().await
        .map_err(|_| "UAR observer acknowledgement returned invalid JSON".to_string())?;
    if entry["deliveryId"] != delivery_id || entry["status"] != "acknowledged" {
        return Err("UAR observer acknowledgement did not match the delivery".into());
    }
    Ok(())
}

#[cfg(feature = "uar-driver")]
pub async fn change_uar_subscription(
    target: &ObserverTarget,
    action: &str,
) -> Result<(), String> {
    if action != "pause" && action != "revoke" {
        return Err("unsupported UAR observer status action".into());
    }
    let (endpoint, bearer) = librefang_llm_drivers::drivers::uar::supervised_channel_binding()
        .ok_or_else(|| "UAR sidecar endpoint or host credential is unavailable".to_string())?;
    let list: Value = client()?
        .get(format!("{endpoint}/api/uar/channel-observers/v1/subscriptions"))
        .bearer_auth(bearer.as_str())
        .header("x-uar-workspace-id", &target.uar_workspace_id)
        .send().await
        .map_err(|error| format!("read UAR observer subscription: {error}"))?
        .json().await
        .map_err(|_| "UAR observer subscription list is invalid".to_string())?;
    let revision = list.as_array()
        .and_then(|rows| rows.iter().find(|row| row["subscriptionId"] == target.subscription_id))
        .and_then(|row| row["revision"].as_u64())
        .ok_or_else(|| "UAR observer subscription revision is unavailable".to_string())?;
    let response = client()?
        .post(format!(
            "{endpoint}/api/uar/channel-observers/v1/subscriptions/{}/{}",
            target.subscription_id, action,
        ))
        .bearer_auth(bearer.as_str())
        .header("x-uar-workspace-id", &target.uar_workspace_id)
        .json(&json!({"expectedRevision": revision}))
        .send().await
        .map_err(|error| format!("change UAR observer subscription: {error}"))?;
    if !response.status().is_success() {
        return Err(format!("UAR observer {action} refused ({})", response.status()));
    }
    Ok(())
}

/// Consume Fabric's durable channel from the beginning. Fabric offsets are
/// deliberately not used as subscriber cursors: UAR's immutable delivery ID
/// and the storage receipt suppress replays after disconnect or restart.
#[cfg(all(feature = "uar-driver", feature = "surreal-backend"))]
pub async fn consume_fabric_to_uar(
    config: &ObserverTransportConfig,
    storage: &librefang_storage::StorageConfig,
) -> Result<(), String> {
    use std::collections::{BTreeMap, HashMap};
    use tokio_tungstenite::tungstenite::client::IntoClientRequest;
    use tokio_tungstenite::tungstenite::http::HeaderValue;

    let session = librefang_storage::shared_pool().open(storage).await
        .map_err(|error| format!("open observer replay storage: {error}"))?;
    let actions = librefang_storage::channel_actions::ChannelActionStore::open(&session).await
        .map_err(|error| format!("open observer replay queue: {error}"))?;
    let mut buffered: HashMap<String, BTreeMap<u64, Value>> = HashMap::new();

    let mut ws_url = reqwest::Url::parse(&config.fabric_url)
        .map_err(|_| "Fabric URL is invalid".to_string())?;
    let ws_scheme = if ws_url.scheme() == "https" { "wss" } else { "ws" };
    ws_url.set_scheme(ws_scheme)
        .map_err(|_| "Fabric websocket scheme is invalid".to_string())?;
    ws_url.set_path("/ws/v1/subscribe");
    ws_url.set_query(Some(&format!("channel={}", config.fabric_channel_id)));
    let mut request = ws_url.as_str().into_client_request()
        .map_err(|_| "Fabric websocket request is invalid".to_string())?;
    let bearer = HeaderValue::from_str(&format!("Bearer {}", config.fabric_bearer))
        .map_err(|_| "Fabric bearer contains invalid HTTP header characters".to_string())?;
    request.headers_mut().insert("Authorization", bearer);
    let (mut stream, _) = tokio_tungstenite::connect_async(request)
        .await
        .map_err(|error| format!("Fabric observer subscription failed: {error}"))?;
    while let Some(frame) = stream.next().await {
        let frame = frame.map_err(|error| format!("Fabric observer stream failed: {error}"))?;
        if !frame.is_text() {
            continue;
        }
        let event: Value = serde_json::from_str(frame.to_text()
            .map_err(|_| "Fabric observer event is not UTF-8".to_string())?)
            .map_err(|_| "Fabric observer event is not JSON".to_string())?;
        let payload = &event["payload"];
        if payload["profile"] != PROFILE
            || event["channel"]["id"] != config.fabric_channel_id.to_string()
            || event["channel"]["tenant_id"] != config.tenant_id.to_string()
            || payload["source"]["tenant_id"] != config.tenant_id.to_string()
            || event["correlation_id"] != payload["source"]["occurrence_id"]
        {
            continue;
        }
        let Some(subscriber_id) = payload["delivery"]["subscriber_id"].as_str() else {
            continue;
        };
        let Some(sequence) = payload["delivery"]["subscriber_cursor_id"]
            .as_str()
            .and_then(|value| value.strip_prefix(&format!("{subscriber_id}:")))
            .and_then(|value| value.parse::<u64>().ok())
        else {
            continue;
        };
        let Some(subscription) = actions.get_observer_subscription(subscriber_id).await
            .map_err(|error| format!("read observer subscription: {error}"))?
        else {
            continue;
        };
        if subscription.subscriber_id != subscriber_id
            || subscription.status != librefang_storage::channel_actions::ObserverStatus::Active
        {
            continue;
        }
        let current_cursor = actions.observer_cursor(subscriber_id).await
            .map_err(|error| format!("read observer delivery cursor: {error}"))?;
        if sequence <= current_cursor.ack_sequence {
            continue;
        }
        buffered.entry(subscriber_id.to_string()).or_default().insert(sequence, payload.clone());
        let target = ObserverTarget {
            subscription_id: subscriber_id.to_string(),
            uar_workspace_id: subscription.uar_workspace_id,
            source_grant_issuer: subscription.source_grant_issuer,
            source_grant_id: subscription.source_grant_id,
        };
        loop {
            let cursor = actions.observer_cursor(subscriber_id).await
                .map_err(|error| format!("read observer delivery cursor: {error}"))?;
            let next = cursor.ack_sequence + 1;
            let Some(candidate) = buffered.get_mut(subscriber_id).and_then(|items| items.remove(&next)) else {
                break;
            };
            let receipts = actions.observer_deliveries_after_cursor(subscriber_id, 1000).await
                .map_err(|error| format!("read observer delivery receipt: {error}"))?;
            let Some(receipt) = receipts.into_iter().find(|receipt| receipt.sequence == next
                && candidate["delivery"]["delivery_id"] == receipt.delivery_id)
            else {
                continue;
            };
            if receipt.state != librefang_storage::channel_actions::ObserverDeliveryState::Delivered {
                buffered.entry(subscriber_id.to_string()).or_default().insert(next, candidate);
                break;
            }
            match deliver_to_uar(&target, &candidate).await? {
                UarDeliveryStatus::Admitted => acknowledge_uar(&target, &receipt.delivery_id).await?,
                UarDeliveryStatus::Acknowledged => {},
                UarDeliveryStatus::PendingAuthority | UarDeliveryStatus::Withheld | UarDeliveryStatus::Uncertain => {
                    buffered.entry(subscriber_id.to_string()).or_default().insert(next, candidate);
                    return Err(format!("UAR observer delivery {} requires operator reconciliation", receipt.delivery_id));
                }
            }
            actions.ack_observer_delivery(subscriber_id, next).await
                .map_err(|error| format!("advance observer subscriber cursor: {error}"))?;
        }
    }
    Err("Fabric observer subscription closed".into())
}
