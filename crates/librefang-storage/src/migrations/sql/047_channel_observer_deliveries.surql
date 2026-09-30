-- C08.2 BossFang-only independent observer subscription and delivery cursors.
-- Each queued copy is paired with a causal action in the same transaction.
-- This is metadata-only; content disclosure stays behind Gate authority.

DEFINE TABLE IF NOT EXISTS channel_observer_subscriptions SCHEMAFULL;
DEFINE FIELD IF NOT EXISTS subscription_id ON channel_observer_subscriptions TYPE string;
DEFINE FIELD IF NOT EXISTS subscriber_id ON channel_observer_subscriptions TYPE string;
DEFINE FIELD IF NOT EXISTS uar_workspace_id ON channel_observer_subscriptions TYPE string;
DEFINE FIELD IF NOT EXISTS filter_id ON channel_observer_subscriptions TYPE string;
DEFINE FIELD IF NOT EXISTS source_grant_issuer ON channel_observer_subscriptions TYPE string;
DEFINE FIELD IF NOT EXISTS source_grant_id ON channel_observer_subscriptions TYPE string;
DEFINE FIELD IF NOT EXISTS recipient_grant_issuer ON channel_observer_subscriptions TYPE string;
DEFINE FIELD IF NOT EXISTS recipient_grant_id ON channel_observer_subscriptions TYPE string;
DEFINE FIELD IF NOT EXISTS grant_revision ON channel_observer_subscriptions TYPE string;
DEFINE FIELD IF NOT EXISTS status ON channel_observer_subscriptions TYPE string;
DEFINE FIELD IF NOT EXISTS next_sequence ON channel_observer_subscriptions TYPE int;
DEFINE FIELD IF NOT EXISTS ack_sequence ON channel_observer_subscriptions TYPE int;
DEFINE FIELD IF NOT EXISTS recorded_at ON channel_observer_subscriptions TYPE string;
DEFINE FIELD IF NOT EXISTS updated_at ON channel_observer_subscriptions TYPE string;
DEFINE INDEX IF NOT EXISTS idx_channel_observer_subscriptions_id ON channel_observer_subscriptions FIELDS subscription_id UNIQUE;

DEFINE TABLE IF NOT EXISTS channel_observer_deliveries SCHEMAFULL;
DEFINE FIELD IF NOT EXISTS delivery_id ON channel_observer_deliveries TYPE string;
DEFINE FIELD IF NOT EXISTS subscription_id ON channel_observer_deliveries TYPE string;
DEFINE FIELD IF NOT EXISTS subscriber_id ON channel_observer_deliveries TYPE string;
DEFINE FIELD IF NOT EXISTS occurrence_id ON channel_observer_deliveries TYPE string;
DEFINE FIELD IF NOT EXISTS action_id ON channel_observer_deliveries TYPE string;
DEFINE FIELD IF NOT EXISTS sequence ON channel_observer_deliveries TYPE int;
DEFINE FIELD IF NOT EXISTS grant_revision ON channel_observer_deliveries TYPE string;
DEFINE FIELD IF NOT EXISTS state ON channel_observer_deliveries TYPE string;
DEFINE FIELD IF NOT EXISTS claimant ON channel_observer_deliveries TYPE option<string>;
DEFINE FIELD IF NOT EXISTS withheld_reason ON channel_observer_deliveries TYPE option<string>;
DEFINE FIELD IF NOT EXISTS recorded_at ON channel_observer_deliveries TYPE string;
DEFINE FIELD IF NOT EXISTS updated_at ON channel_observer_deliveries TYPE string;
DEFINE INDEX IF NOT EXISTS idx_channel_observer_deliveries_id ON channel_observer_deliveries FIELDS delivery_id UNIQUE;
DEFINE INDEX IF NOT EXISTS idx_channel_observer_deliveries_sequence ON channel_observer_deliveries FIELDS subscription_id, sequence UNIQUE;
DEFINE INDEX IF NOT EXISTS idx_channel_observer_deliveries_state ON channel_observer_deliveries FIELDS subscription_id, state;

-- Content is stored separately from listable delivery metadata. Only a
-- Gate-filtered per-recipient projection may be written, and release requires
-- current disclosure plus delivery authorization through the trusted API.
DEFINE TABLE IF NOT EXISTS channel_observer_projections SCHEMAFULL;
DEFINE FIELD IF NOT EXISTS delivery_id ON channel_observer_projections TYPE string;
DEFINE FIELD IF NOT EXISTS source_grant_issuer ON channel_observer_projections TYPE string;
DEFINE FIELD IF NOT EXISTS source_grant_id ON channel_observer_projections TYPE string;
DEFINE FIELD IF NOT EXISTS source_grant_revision ON channel_observer_projections TYPE string;
DEFINE FIELD IF NOT EXISTS classification ON channel_observer_projections TYPE string;
DEFINE FIELD IF NOT EXISTS text ON channel_observer_projections TYPE option<string>;
DEFINE FIELD IF NOT EXISTS recorded_at ON channel_observer_projections TYPE string;
DEFINE INDEX IF NOT EXISTS idx_channel_observer_projections_delivery ON channel_observer_projections FIELDS delivery_id UNIQUE;
