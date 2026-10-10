The generated coordinator instructions told agents to copy task IDs when creating new delegated tasks. UAR correctly rejects an existing task ID for a new delegation, so a real reviewed-skill run failed with C15_APPROVAL_DELEGATION_SCOPE_MISMATCH before its approval could proceed.

Clarify that new delegated work needs fresh command and task IDs. Preserve IDs for retries and preserve existing artifact, dependency and wait references. Native approval, authority and conflict checks are unchanged.

Observed evidence: the real packaged 2.2.26 operation reached required reviewed-skill deployment and scope/tamper refusals, then attempted an existing task ID. This change is committed production wiring; its new packaged operation remains pending. No intermediate test suite or verification build was run. The published 2.2.26 artifacts remain immutable; application delivery containing this change uses a new version.
