//! The channel boundary's portable identity and durable-route contract.
//!
//! A sidecar-generated UUID is useful for legacy reactions, but is never a
//! provider replay identity. Only messages with a native-ID provenance marker
//! and a complete scope can enter the durable local route profile.

use crate::router::channel_type_to_str;
use crate::types::ChannelMessage;
use serde::{Deserialize, Serialize};

pub const NATIVE_MESSAGE_ID_KEY: &str = "__native_message_id__";
pub const ACCOUNT_KIND_KEY: &str = "__account_kind__";
pub const WEBHOOK_PROFILE_KEY: &str = "__channel_profile__";
pub const WEBHOOK_PROFILE: &str = "signed_webhook_v1";

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AccountKind {
    Native,
    ConfiguredInstance,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ChannelScope {
    pub provider: String,
    pub account: String,
    pub account_kind: AccountKind,
    pub workspace: String,
    pub room: String,
    pub thread: Option<String>,
    pub sender: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct SourceOccurrence {
    pub scope: ChannelScope,
    pub native_message_id: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum RouteOutcome {
    Selected { handler: String },
    Conflict { handlers: Vec<String> },
    Unavailable { reason: String },
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct RouteDecision {
    pub outcome: RouteOutcome,
    pub reason: String,
    pub binding_revision: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct RouteAffinity {
    pub handler: String,
    pub revision: u64,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum DispatchState {
    Ready,
    Claimed,
    Completed,
    Uncertain,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct RouteAdmission {
    pub occurrence_id: String,
    pub route_revision: Option<u64>,
    pub is_new: bool,
    pub outcome: RouteOutcome,
    pub action_id: Option<String>,
    pub dispatch: DispatchState,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum DispatchClaim {
    Acquired,
    AlreadyClaimed,
    Completed,
    Uncertain,
    NotDispatchable,
}

impl SourceOccurrence {
    /// Only the explicitly qualified webhook and Discord guild profiles may
    /// invoke Gate effects and publish observer copies.
    pub fn governed_profile(&self, message: &ChannelMessage) -> bool {
        match self.scope.provider.as_str() {
            "discord" => message.is_group
                && message.metadata.get("guild_id").and_then(serde_json::Value::as_str).is_some(),
            "webhook" => message.metadata.get(WEBHOOK_PROFILE_KEY)
                .and_then(serde_json::Value::as_str) == Some(WEBHOOK_PROFILE),
            _ => false,
        }
    }

    pub fn from_message(message: &ChannelMessage) -> Option<Self> {
        // Legacy webhooks may carry a generated wh-* ID. Even complete caller
        // metadata must not promote that ID into a durable provider identity.
        if channel_type_to_str(&message.channel) == "webhook"
            && message.metadata.get(WEBHOOK_PROFILE_KEY)
                .and_then(serde_json::Value::as_str) != Some(WEBHOOK_PROFILE)
        {
            return None;
        }
        if message
            .metadata
            .get(NATIVE_MESSAGE_ID_KEY)
            .and_then(serde_json::Value::as_bool)
            != Some(true)
        {
            return None;
        }
        let field = |key: &str| {
            message
                .metadata
                .get(key)
                .and_then(serde_json::Value::as_str)
                .map(str::trim)
                .filter(|value| !value.is_empty())
                .map(str::to_string)
        };
        let account = field("account_id")?;
        let workspace = field("workspace_id").or_else(|| field("guild_id"))?;
        let room = field("channel_id").or_else(|| {
            let id = message.sender.platform_id.trim();
            (!id.is_empty()).then(|| id.to_string())
        })?;
        let sender = field(crate::bridge::SENDER_USER_ID_KEY).or_else(|| {
            (!message.is_group).then(|| message.sender.platform_id.trim().to_string())
        })?;
        let native_message_id = message.platform_message_id.trim();
        if sender.is_empty() || native_message_id.is_empty() {
            return None;
        }
        let account_kind = match field(ACCOUNT_KIND_KEY).as_deref() {
            // This profile deliberately uses WEBHOOK_ACCOUNT_ID as the
            // configured bridge account, not a provider-discovered bot ID.
            Some("native" | "configured_instance")
                if channel_type_to_str(&message.channel) == "webhook" => AccountKind::ConfiguredInstance,
            Some("native") => AccountKind::Native,
            Some("configured_instance") => AccountKind::ConfiguredInstance,
            _ => return None,
        };
        Some(Self {
            scope: ChannelScope {
                provider: channel_type_to_str(&message.channel).to_string(),
                account,
                account_kind,
                workspace,
                room,
                thread: message
                    .thread_id
                    .as_deref()
                    .map(str::trim)
                    .filter(|value| !value.is_empty())
                    .map(str::to_string),
                sender,
            },
            native_message_id: native_message_id.to_string(),
        })
    }
}
