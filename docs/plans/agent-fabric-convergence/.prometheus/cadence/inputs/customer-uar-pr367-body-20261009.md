Representation grant creation currently rejects its authenticated issuer because it compares a raw principal with an encoded storage-owner key. Keep those identities separate and attach private, scoped grant revisions to durable instances. Turns and effects revalidate current authority, including revocation and offboarding; portable definitions retain no credentials or grants.

Two related defects observed during actual customer qualification are also corrected:

- Saved native-tool settings were persisted but ignored when startup registered tools. Hydrate the existing configuration from the initialized settings manager before registration, preserving defaults and disabled categories.
- Team runs captured resilience policy at server startup even though settings advertise next-turn application. Resolve the current persisted policy at admitted turn creation, using the same resolver as ordinary execution and preserving per-agent overrides and existing defaults.

The desktop counterpart is [The Boss PR #65](https://github.com/Prometheus-AGS/the-boss/pull/65), with typed instance-turn submission, scoped run output and actual native approval controls.

Validation: grant rejection (HTTP 422) and team provider-opening timeout were recorded through the public 2.2.25 application. Final source `1522f17944aec1e1a7db5eab3b647e732fc1a07f` is compiling in the actual local and four native platform payload builds. The combined Mac installer and affected packaged operations remain pending. No intermediate suites or standalone verification builds ran. The timeout category does not establish which specific deadline expired; this change does not widen defaults.

Security boundaries: authenticated principal versus storage-owner identity, workspace/instance ownership, private authority persistence, and current authority at effects. Existing schemas, scheduling and portable definitions retain their roles. Unrelated `pnpm-lock.yaml` changes are preserved and excluded.
