---
type: concept
source_count: 1
confidence: high
last_updated: 2026-05-03
tags:
  - librefang
  - a2a
  - inter-agent
  - protocol
---

# Agent-to-Agent Protocol (A2A)

The Agent-to-Agent (A2A) protocol is LibreFang's standard for inter-agent communication and task delegation. It exposes a set of well-known HTTP endpoints that allow external agents or other LibreFang instances to discover, send tasks to, and cancel tasks on a running agent. A2A is distinct from the peer-to-peer OFP wire protocol used between LibreFang daemon instances.

## Key Points

- A2A is implemented in librefang-runtime and exposed via librefang-api alongside the standard REST API ([[librefang-docs-deep-crawl]], extracted)
- The protocol defines four canonical endpoints: /.well-known/agent.json (discovery), /a2a/tasks/send (submit a task), /a2a/tasks/{id} (retrieve task status), /a2a/tasks/{id}/cancel (cancel a running task) ([[librefang-docs-deep-crawl]], extracted)
- Three built-in tools expose A2A to agents: a2a_discover, a2a_send, and canvas_present ([[librefang-docs-deep-crawl]], extracted)
- A2A is used internally by multi-agent Hands for coordinator-to-subordinate communication ([[librefang-docs-deep-crawl]], extracted)
- The inter-agent call depth is capped at MAX_AGENT_CALL_DEPTH = 5 to prevent runaway recursive invocation ([[librefang-docs-deep-crawl]], extracted)

## Connections

- A2A is a core protocol of [[librefang]] enabling multi-agent architectures
- It is complementary to [[librefang-wire-protocol]] (OFP), which handles daemon-to-daemon peer connections rather than task delegation
- [[librefang-hands]] multi-agent workflows rely on A2A for internal coordination
- The depth limit (5) is enforced by the [[agentic-loop]] stability systems
- A2A tools (a2a_discover, a2a_send, canvas_present) are part of [[tool-use]]
- A2A complements [[model-context-protocol]] — MCP handles tool/context sharing while A2A handles task delegation

## Sources

- [[librefang-docs-deep-crawl]]

## See Also

- [[librefang]]
- [[librefang-wire-protocol]]
- [[librefang-hands]]
- [[model-context-protocol]]
- [[agentic-loop]]
- [[tool-use]]
