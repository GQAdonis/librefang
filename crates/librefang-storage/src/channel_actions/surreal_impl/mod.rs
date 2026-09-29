use super::*;
use serde::de::DeserializeOwned;
use surrealdb::{engine::any::Any, Surreal};

mod actions;
mod echoes;
mod observers;

const ROOTS: &str = "channel_causal_roots";
const ACTIONS: &str = "channel_causal_actions";
const ECHOES: &str = "channel_provider_echoes";
const SUBSCRIPTIONS: &str = "channel_observer_subscriptions";
const DELIVERIES: &str = "channel_observer_deliveries";
const PROJECTIONS: &str = "channel_observer_projections";
const OCCURRENCES: &str = "channel_source_occurrences";

/// SurrealDB-backed causal actions and independent observer queues.
#[derive(Clone)]
pub struct ChannelActionStore {
    db: Surreal<Any>,
}

impl ChannelActionStore {
    /// Open a store after operational migrations through version 47 are applied.
    pub async fn open(session: &SurrealSession) -> StorageResult<Self> {
        Ok(Self {
            db: session.clone_db().await?,
        })
    }

    async fn read<T: DeserializeOwned>(&self, table: &str, id: &str) -> StorageResult<Option<T>> {
        let row: Option<serde_json::Value> = self.db.select((table, id)).await.map_err(db_error)?;
        row.map(decode).transpose()
    }
}

fn validate_digest(value: &str, name: &str) -> StorageResult<()> {
    if value.len() != 64 || !value.bytes().all(|c| c.is_ascii_hexdigit()) {
        return Err(StorageError::InvalidConfig(format!(
            "{name} must be a SHA-256 hex digest"
        )));
    }
    Ok(())
}

fn required(value: &str, name: &str) -> StorageResult<()> {
    if value.is_empty() {
        return Err(StorageError::InvalidConfig(format!("{name} is required")));
    }
    Ok(())
}

fn now() -> String {
    chrono::Utc::now().to_rfc3339()
}

fn decode<T: DeserializeOwned>(row: serde_json::Value) -> StorageResult<T> {
    serde_json::from_value(row)
        .map_err(|e| StorageError::Backend(format!("malformed channel action row: {e}")))
}

fn encode<T: Serialize>(value: T) -> StorageResult<serde_json::Value> {
    serde_json::to_value(value)
        .map_err(|e| StorageError::Backend(format!("channel action encoding failed: {e}")))
}

fn db_error(error: surrealdb::Error) -> StorageError {
    StorageError::Backend(error.to_string())
}

fn record_key(kind: &str, identity: &str) -> String {
    digest_parts(&[kind, identity])
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
struct CausalRoot {
    root_occurrence_id: String,
    policy_revision: String,
    max_depth: u8,
    max_fanout: u8,
    fanout_used: u8,
    recorded_at: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
struct StoredObserverProjection {
    delivery_id: String,
    source_grant_issuer: String,
    source_grant_id: String,
    source_grant_revision: String,
    classification: String,
    text: Option<String>,
    recorded_at: String,
}

fn action_record_id(action_id: &str) -> &str {
    action_id
}

fn subscription_record_id(subscription_id: &str) -> String {
    record_key("channel-observer-subscription-v1", subscription_id)
}

fn delivery_record_id(subscription_id: &str, occurrence_id: &str) -> String {
    digest_parts(&[
        "channel-observer-delivery-v1",
        subscription_id,
        occurrence_id,
    ])
}
