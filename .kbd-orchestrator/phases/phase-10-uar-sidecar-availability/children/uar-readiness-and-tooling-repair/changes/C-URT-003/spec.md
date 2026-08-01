# C-URT-003 — restore kernel-handle all-target certification

## Intent

Bring `KernelHandleStub` into exact conformance with the current `KnowledgeGraph` trait without changing production behavior.

## Scope

- `crates/librefang-kernel-handle/src/test_stub.rs`

## Requirements

1. `knowledge_add_entity` accepts ignored `agent_id: &str` and `peer_id: Option<&str>`.
2. `knowledge_add_relation` accepts ignored `agent_id: &str` and `peer_id: Option<&str>`.
3. `knowledge_query` accepts ignored `peer_id: Option<&str>`.
4. Existing unavailable/empty stub behavior remains unchanged.
5. Focused feature clippy and full workspace all-target clippy pass with `-D warnings`.

## Non-goals

- No production knowledge-graph change.
- No new in-memory graph behavior in the stub.
- No unrelated kernel-handle cleanup.

## Rollback

Revert the signature-only fixture commit.
