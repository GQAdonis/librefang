//! Gate's channel-effect boundary. The bearer and service identity are read
//! only from the host process, never from channel content or API request data.

use librefang_channels::channel_route::ChannelScope;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::time::Duration;
use uuid::Uuid;

const PROTOCOL: &str = "afc.channel-effect/1";
const CONTRACT: &str = "afc.channel-authority/1";

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ChannelEffectAction {
    SourceDisclosure,
    RecipientDelivery,
    HandlerExecution,
    ScopedReply,
    RouteReassignment,
}

#[derive(Debug, Clone)]
pub struct ChannelEffectInput<'a> {
    pub effect_key: &'a str,
    pub occurrence_id: &'a str,
    pub action: ChannelEffectAction,
    pub scope: &'a ChannelScope,
    pub recipient: &'a str,
    pub handler: &'a str,
    pub route_revision: &'a str,
    pub payload: &'a [u8],
    pub classification: &'a str,
    pub root_occurrence_id: &'a str,
    pub parent_action_id: Option<Uuid>,
    pub route_identity: &'a str,
    pub visited_routes: &'a [String],
    pub remaining_depth: u8,
    pub remaining_fanout: u8,
    pub grant_issuer: &'a str,
    pub grant_id: &'a str,
}

#[derive(Debug, Deserialize)]
struct GateDecision {
    contract: String,
    protocol: String,
    effect_id: Uuid,
    occurrence_id: String,
    action: ChannelEffectAction,
    disposition: String,
    grant_revision: i64,
    policy_revision: String,
}

#[derive(Debug, Clone)]
pub struct ReleasedChannelEffect {
    pub effect_id: Uuid,
    pub grant_revision: i64,
    pub policy_revision: String,
}

fn configured(name: &str) -> Result<String, String> {
    std::env::var(name)
        .ok()
        .filter(|value| !value.trim().is_empty())
        .ok_or_else(|| format!("{name} is not configured"))
}

pub fn configured_for_effects() -> bool {
    [
        "LIBREFANG_CHANNEL_GATE_URL",
        "LIBREFANG_CHANNEL_GATE_TOKEN",
        "LIBREFANG_CHANNEL_GATE_IDENTITY_ISSUER",
        "LIBREFANG_CHANNEL_GATE_IDENTITY_SUBJECT",
        "LIBREFANG_CHANNEL_GATE_IDENTITY_REVISION",
    ]
    .iter()
    .all(|name| std::env::var(name).is_ok_and(|value| !value.trim().is_empty()))
}

/// A Gate release is bound to one deterministic effect. A transport failure
/// after release is uncertain; callers must never blindly release and send
/// again under a new key.
pub async fn release_channel_effect(
    input: &ChannelEffectInput<'_>,
) -> Result<ReleasedChannelEffect, String> {
    let base = configured("LIBREFANG_CHANNEL_GATE_URL")?;
    let base = base.trim_end_matches('/');
    let url = reqwest::Url::parse(base).map_err(|_| "invalid Gate URL".to_string())?;
    let local_http = url.scheme() == "http"
        && matches!(url.host_str(), Some("127.0.0.1" | "localhost" | "[::1]"));
    if url.scheme() != "https" && !local_http {
        return Err("Gate URL must use HTTPS or loopback HTTP".into());
    }
    let token = configured("LIBREFANG_CHANNEL_GATE_TOKEN")?;
    let issuer = configured("LIBREFANG_CHANNEL_GATE_IDENTITY_ISSUER")?;
    let subject = configured("LIBREFANG_CHANNEL_GATE_IDENTITY_SUBJECT")?;
    let identity_revision = configured("LIBREFANG_CHANNEL_GATE_IDENTITY_REVISION")?;
    let effect_id = Uuid::new_v5(&Uuid::NAMESPACE_URL, input.effect_key.as_bytes());
    let payload_sha = hex::encode(Sha256::digest(input.payload));
    let request = serde_json::json!({
        "protocol": PROTOCOL,
        "effect_id": effect_id,
        "occurrence_id": input.occurrence_id,
        "action": input.action,
        "scope": {
            "provider": input.scope.provider,
            "account": input.scope.account,
            "workspace": input.scope.workspace,
            "room": input.scope.room,
            "thread": input.scope.thread,
            "sender": input.scope.sender,
        },
        "recipient": input.recipient,
        "handler": input.handler,
        "route_revision": input.route_revision,
        "payload": {"algorithm": "sha256", "sha256": payload_sha},
        "classification": input.classification,
        "causality": {
            "root_occurrence_id": input.root_occurrence_id,
            "parent_action_id": input.parent_action_id,
            "action_id": effect_id,
            "route_identity": input.route_identity,
            "visited_routes": input.visited_routes,
            "remaining_depth": input.remaining_depth,
            "remaining_fanout": input.remaining_fanout,
        },
        "identity": {
            "issuer": issuer,
            "subject": subject,
            "subject_kind": "service",
            "identity_revision": identity_revision,
            "verified": true,
            "revoked": false,
        },
        "grant_issuer": input.grant_issuer,
        "grant_id": input.grant_id,
    });
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(10))
        .build()
        .map_err(|error| format!("create Gate client: {error}"))?;
    let endpoint = format!("{base}/authority/channels");
    for (stage, expected) in [("evaluate", "eligible"), ("release", "released")] {
        let response = client
            .post(format!("{endpoint}/{stage}"))
            .bearer_auth(&token)
            .json(&request)
            .send()
            .await
            .map_err(|error| format!("Gate channel {stage} request failed: {error}"))?;
        if !response.status().is_success() {
            return Err(format!("Gate channel {stage} refused the effect ({})", response.status()));
        }
        let decision: GateDecision = response
            .json()
            .await
            .map_err(|_| format!("Gate channel {stage} returned an invalid decision"))?;
        if decision.contract != CONTRACT
            || decision.protocol != PROTOCOL
            || decision.effect_id != effect_id
            || decision.occurrence_id != input.occurrence_id
            || std::mem::discriminant(&decision.action) != std::mem::discriminant(&input.action)
            || decision.disposition != expected
        {
            return Err(format!("Gate channel {stage} did not authorize the exact effect"));
        }
        if stage == "release" {
            return Ok(ReleasedChannelEffect {
                effect_id,
                grant_revision: decision.grant_revision,
                policy_revision: decision.policy_revision,
            });
        }
    }
    Err("Gate channel release was not reached".into())
}
