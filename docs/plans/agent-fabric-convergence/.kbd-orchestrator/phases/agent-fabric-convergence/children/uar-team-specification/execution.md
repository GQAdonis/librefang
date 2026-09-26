# Documentation execution

Backend: OpenSpec; canonical KBD synchronization through kbd-apply. Operator decision uts-architecture-approved. Parent owns core documents, KBD and publication; team_spec_schemas owns schemas/examples; team_spec_protocols owns protocols/traces. No production code, migrations, upgrades or builds.

One completed-document validation gate; the approved proposal already received the one bounded independent review. The user-approved single-review limit supersedes generic repeated review requirements. No claims of runtime conformance. Publication through documentation-only PRs; no merge of stale product code.

## Delivery boundary

Official draft published at UAR commit cbf5d560f578069e908faa0ba08b133121241cc5, PR #299. Completed document validation passed; OpenSpec strict validation passed. See publication.json and document-validation.json for exact scope. No application code, committed dependencies, migrations or builds changed.
