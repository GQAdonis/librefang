# Tasks

These are delivery groups for the initiative, not ready-to-dispatch product assignments. Before applying a product group, expand it into bounded tasks in the affected repository's own OpenSpec/KBD root and record file claims, checkpoint and acceptance links. The initiative keeps the group pending until all child evidence passes. C01 only produces coordination documents.

## 1. Authoritative business data and offline commands

- [ ] 1.1 Adopt accepted production-readiness changes; document route-specific auth/RLS and cursor/tombstone semantics. Verify with a linked contract/source receipt and the applicable acceptance scenarios in design.md; record exact revisions and outcomes. Initiative task: C11.1.
- [ ] 1.2 Persist pending command atomically with local state; preserve idempotency through Forge transaction and authoritative result lookup. Verify with a linked contract/source receipt and the applicable acceptance scenarios in design.md; record exact revisions and outcomes. Initiative task: C11.2.
- [ ] 1.3 Publish committed outbox/CDC facts and rebuild scoped read models with deletion/revocation and explicit retention-gap resnapshot. Verify with a linked contract/source receipt and the applicable acceptance scenarios in design.md; record exact revisions and outcomes. Initiative task: C11.3.
