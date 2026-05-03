---
type: concept
source_count: 1
confidence: high
last_updated: 2026-05-03
tags:
  - librefang
  - ofp
  - wire-protocol
  - peer-to-peer
  - networking
---

# LibreFang Wire Protocol (OFP)

The Open Fang Protocol (OFP) is LibreFang's peer-to-peer wire protocol for communication between LibreFang daemon instances. It uses JSON-framed messages over TCP with HMAC-SHA256 mutual authentication, enabling daemon discovery, peer connections, and message exchange across a network of LibreFang nodes.

## Key Points

- OFP is implemented in the librefang-wire crate with two primary components: PeerNode and PeerRegistry ([[librefang-docs-deep-crawl]], extracted)
- The protocol transmits JSON-framed messages over TCP with HMAC-SHA256 mutual authentication on every connection ([[librefang-docs-deep-crawl]], extracted)
- Maximum message size is 16MB ([[librefang-docs-deep-crawl]], extracted)
- The wire layer itself is plaintext; the documentation recommends deploying behind WireGuard or Tailscale for encryption in production ([[librefang-docs-deep-crawl]], extracted)
- Mutual authentication is enforced — both sides present HMAC-SHA256 credentials before any data exchange ([[librefang-docs-deep-crawl]], extracted)
- OFP peer connections are covered by the Merkle audit trail under the WireConnect action type (see [[librefang-security-architecture]]) ([[librefang-docs-deep-crawl]], extracted)
- The Capability enum includes OFP-specific capabilities: OfpDiscover, OfpConnect, OfpAdvertise — controlling which agents can participate in peer networking ([[librefang-docs-deep-crawl]], extracted)
- The CLI includes a built-in MCP server mode, and the librefang-cli crate is OFP-aware via daemon auto-detect ([[librefang-docs-deep-crawl]], extracted)

## Connections

- OFP is a core protocol of [[librefang]] — distinct from the HTTP-based REST API and A2A endpoints
- OFP is complementary to [[agent-to-agent-protocol]] (A2A): OFP connects daemon instances at the network level; A2A handles task delegation between agents
- OFP mutual auth is security layer 8 in [[librefang-security-architecture]]
- Peer connections require OfpDiscover/OfpConnect/OfpAdvertise capabilities enforced by the capability system in [[librefang-security-architecture]]

## Sources

- [[librefang-docs-deep-crawl]]

## See Also

- [[librefang]]
- [[agent-to-agent-protocol]]
- [[librefang-security-architecture]]
