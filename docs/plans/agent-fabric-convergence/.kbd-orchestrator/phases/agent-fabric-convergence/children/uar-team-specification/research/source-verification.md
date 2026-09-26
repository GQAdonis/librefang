# Source verification record

This is source inspection, not runtime certification. Local source hashes and revisions are retained in sources/local-source-receipts.json. Public retrieval status and content hashes are in sources/retrieval.json. Firecrawl discovery and Context7 outputs are retained separately. No unperformed research-driver or Feynman grade is claimed.

Codex residency.rs distinguishes loaded subagent residency from active execution. Its RAII reservation rolls back pending slots, materializes rollout history before unloading and avoids eviction with pending mailbox items. execution.rs separately tracks active turns. control/spawn plus send_message/followup_task expose root lineage, context-fork options and queue versus trigger. These are patterns to adapt; their existence does not prove persistent UAR inbox transactions or fair owner scheduling.

UAR source claims G01–G10 are scoped to named files and immutable revisions. Protocol mapping is a proposal. AG-UI current documentation is a retrieved snapshot; freeze matching schema fixtures during publication and require client capability negotiation. A2UI v0.9.1 is UAR's own profile; the upstream 0.9 family reference is not proof of patch-level identity. A2A release 1.0.1 is distinct from wire version 1.0.

Confidence: high for named source paths and documented statements; unresolved for installed behavior, database transaction guarantees under the selected backend and unmeasured performance targets. These remain implementation gates.
