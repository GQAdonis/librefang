-- Forward-only metadata needed to recheck Gate before unsealing a recipient's
-- filtered text. Pre-existing deliveries remain without a digest and require
-- manual reconciliation rather than an inferred authorization.
DEFINE FIELD IF NOT EXISTS projection_sha256 ON channel_observer_deliveries TYPE option<string>;
DEFINE FIELD IF NOT EXISTS classification ON channel_observer_deliveries TYPE option<string>;
DEFINE FIELD IF NOT EXISTS observer_instance_id ON channel_observer_subscriptions TYPE option<string>;
