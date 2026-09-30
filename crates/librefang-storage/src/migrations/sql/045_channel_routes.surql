-- C08.1: one immutable admission per native source occurrence, immutable route
-- revisions, one mutable affinity pointer per normalized conversation, and a
-- separate dispatch receipt. This is BossFang-only; it mirrors no SQLite DDL.
-- Deterministic record IDs are SHA-256 hashes of length-delimited identities.
-- The new replay-safe profile is unavailable on the legacy SQLite backend.

DEFINE TABLE IF NOT EXISTS channel_source_occurrences SCHEMAFULL;
DEFINE FIELD IF NOT EXISTS occurrence_id ON channel_source_occurrences TYPE string;
DEFINE FIELD IF NOT EXISTS scope_key ON channel_source_occurrences TYPE string;
DEFINE FIELD IF NOT EXISTS scope ON channel_source_occurrences TYPE object FLEXIBLE;
DEFINE FIELD IF NOT EXISTS native_message_id ON channel_source_occurrences TYPE string;
DEFINE FIELD IF NOT EXISTS decision ON channel_source_occurrences TYPE object FLEXIBLE;
DEFINE FIELD IF NOT EXISTS route_revision ON channel_source_occurrences TYPE option<int>;
DEFINE FIELD IF NOT EXISTS recorded_at ON channel_source_occurrences TYPE string;
DEFINE INDEX IF NOT EXISTS idx_channel_source_occurrences_identity ON channel_source_occurrences FIELDS occurrence_id UNIQUE;

DEFINE TABLE IF NOT EXISTS channel_route_affinity SCHEMAFULL;
DEFINE FIELD IF NOT EXISTS scope_key ON channel_route_affinity TYPE string;
DEFINE FIELD IF NOT EXISTS scope ON channel_route_affinity TYPE object FLEXIBLE;
DEFINE FIELD IF NOT EXISTS handler ON channel_route_affinity TYPE string;
DEFINE FIELD IF NOT EXISTS revision ON channel_route_affinity TYPE int;
DEFINE FIELD IF NOT EXISTS binding_revision ON channel_route_affinity TYPE option<string>;
DEFINE FIELD IF NOT EXISTS recorded_at ON channel_route_affinity TYPE string;
DEFINE INDEX IF NOT EXISTS idx_channel_route_affinity_scope ON channel_route_affinity FIELDS scope_key UNIQUE;

DEFINE TABLE IF NOT EXISTS channel_route_revisions SCHEMAFULL;
DEFINE FIELD IF NOT EXISTS scope_key ON channel_route_revisions TYPE string;
DEFINE FIELD IF NOT EXISTS revision ON channel_route_revisions TYPE int;
DEFINE FIELD IF NOT EXISTS decision ON channel_route_revisions TYPE object FLEXIBLE;
DEFINE FIELD IF NOT EXISTS recorded_at ON channel_route_revisions TYPE string;
DEFINE INDEX IF NOT EXISTS idx_channel_route_revisions_scope_revision ON channel_route_revisions FIELDS scope_key, revision UNIQUE;

DEFINE TABLE IF NOT EXISTS channel_route_dispatch SCHEMAFULL;
DEFINE FIELD IF NOT EXISTS occurrence_id ON channel_route_dispatch TYPE string;
DEFINE FIELD IF NOT EXISTS scope_key ON channel_route_dispatch TYPE string;
DEFINE FIELD IF NOT EXISTS scope ON channel_route_dispatch TYPE object FLEXIBLE;
DEFINE FIELD IF NOT EXISTS native_message_id ON channel_route_dispatch TYPE string;
DEFINE FIELD IF NOT EXISTS action_id ON channel_route_dispatch TYPE string;
DEFINE FIELD IF NOT EXISTS handler ON channel_route_dispatch TYPE string;
DEFINE FIELD IF NOT EXISTS route_revision ON channel_route_dispatch TYPE int;
DEFINE FIELD IF NOT EXISTS state ON channel_route_dispatch TYPE string;
DEFINE FIELD IF NOT EXISTS claimant ON channel_route_dispatch TYPE option<string>;
DEFINE FIELD IF NOT EXISTS recorded_at ON channel_route_dispatch TYPE string;
DEFINE FIELD IF NOT EXISTS updated_at ON channel_route_dispatch TYPE string;
DEFINE INDEX IF NOT EXISTS idx_channel_route_dispatch_occurrence ON channel_route_dispatch FIELDS occurrence_id UNIQUE;
DEFINE INDEX IF NOT EXISTS idx_channel_route_dispatch_state ON channel_route_dispatch FIELDS state;
