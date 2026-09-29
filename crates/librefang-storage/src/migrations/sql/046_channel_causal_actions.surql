-- C08.3 BossFang-only causal action and provider echo substrate.
-- Root-wide fanout is charged in the same transaction as each action record.
-- No provider payload, credential, or model output is stored here.

DEFINE TABLE IF NOT EXISTS channel_causal_roots SCHEMAFULL;
DEFINE FIELD IF NOT EXISTS root_occurrence_id ON channel_causal_roots TYPE string;
DEFINE FIELD IF NOT EXISTS policy_revision ON channel_causal_roots TYPE string;
DEFINE FIELD IF NOT EXISTS max_depth ON channel_causal_roots TYPE int;
DEFINE FIELD IF NOT EXISTS max_fanout ON channel_causal_roots TYPE int;
DEFINE FIELD IF NOT EXISTS fanout_used ON channel_causal_roots TYPE int;
DEFINE FIELD IF NOT EXISTS recorded_at ON channel_causal_roots TYPE string;
DEFINE INDEX IF NOT EXISTS idx_channel_causal_roots_id ON channel_causal_roots FIELDS root_occurrence_id UNIQUE;

DEFINE TABLE IF NOT EXISTS channel_causal_actions SCHEMAFULL;
DEFINE FIELD IF NOT EXISTS action_id ON channel_causal_actions TYPE string;
DEFINE FIELD IF NOT EXISTS request_hash ON channel_causal_actions TYPE string;
DEFINE FIELD IF NOT EXISTS root_occurrence_id ON channel_causal_actions TYPE string;
DEFINE FIELD IF NOT EXISTS source_occurrence_id ON channel_causal_actions TYPE string;
DEFINE FIELD IF NOT EXISTS parent_action_id ON channel_causal_actions TYPE option<string>;
DEFINE FIELD IF NOT EXISTS route_identity ON channel_causal_actions TYPE string;
DEFINE FIELD IF NOT EXISTS visited_routes ON channel_causal_actions TYPE array<string>;
DEFINE FIELD IF NOT EXISTS depth ON channel_causal_actions TYPE int;
DEFINE FIELD IF NOT EXISTS remaining_depth ON channel_causal_actions TYPE int;
DEFINE FIELD IF NOT EXISTS remaining_fanout ON channel_causal_actions TYPE int;
DEFINE FIELD IF NOT EXISTS kind ON channel_causal_actions TYPE string;
DEFINE FIELD IF NOT EXISTS reply_target ON channel_causal_actions TYPE option<object> FLEXIBLE;
DEFINE FIELD IF NOT EXISTS reply_grant_id ON channel_causal_actions TYPE option<string>;
DEFINE FIELD IF NOT EXISTS reply_grant_revision ON channel_causal_actions TYPE option<string>;
DEFINE FIELD IF NOT EXISTS original_principal ON channel_causal_actions TYPE string;
DEFINE FIELD IF NOT EXISTS actor_id ON channel_causal_actions TYPE string;
DEFINE FIELD IF NOT EXISTS state ON channel_causal_actions TYPE string;
DEFINE FIELD IF NOT EXISTS suppression_reason ON channel_causal_actions TYPE option<string>;
DEFINE FIELD IF NOT EXISTS claimant ON channel_causal_actions TYPE option<string>;
DEFINE FIELD IF NOT EXISTS recorded_at ON channel_causal_actions TYPE string;
DEFINE FIELD IF NOT EXISTS updated_at ON channel_causal_actions TYPE string;
DEFINE INDEX IF NOT EXISTS idx_channel_causal_actions_id ON channel_causal_actions FIELDS action_id UNIQUE;
DEFINE INDEX IF NOT EXISTS idx_channel_causal_actions_root ON channel_causal_actions FIELDS root_occurrence_id;
DEFINE INDEX IF NOT EXISTS idx_channel_causal_actions_state ON channel_causal_actions FIELDS state;

DEFINE TABLE IF NOT EXISTS channel_provider_echoes SCHEMAFULL;
DEFINE FIELD IF NOT EXISTS echo_id ON channel_provider_echoes TYPE string;
DEFINE FIELD IF NOT EXISTS action_id ON channel_provider_echoes TYPE string;
DEFINE FIELD IF NOT EXISTS target ON channel_provider_echoes TYPE object FLEXIBLE;
DEFINE FIELD IF NOT EXISTS native_message_id ON channel_provider_echoes TYPE string;
DEFINE FIELD IF NOT EXISTS recorded_at ON channel_provider_echoes TYPE string;
DEFINE INDEX IF NOT EXISTS idx_channel_provider_echoes_id ON channel_provider_echoes FIELDS echo_id UNIQUE;
