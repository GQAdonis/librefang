---
type: concept
source_count: 1
confidence: high
last_updated: 2026-05-03
tags:
  - librefang
  - channels
  - messaging
  - adapters
---

# LibreFang Channel System

The LibreFang channel system provides 44 platform adapters that route external messages to agents, format agent responses for each platform, enforce DM/group policies, and rate-limit channel traffic. All adapters implement the ChannelAdapter trait defined in the librefang-channels crate.

## Key Points

- 44 channel adapters ship with LibreFang, spanning platforms including Telegram, Discord, Slack, Email, Webhooks, WeChat, and others across 4 implementation waves ([[librefang-docs-deep-crawl]], extracted)
- All adapters implement the ChannelAdapter trait in the librefang-channels crate ([[librefang-docs-deep-crawl]], extracted)
- The AgentRouter and BridgeManager coordinate message routing between channels and agents ([[librefang-docs-deep-crawl]], extracted)
- A dedicated Formatter converts Markdown to platform-native formats: TelegramHTML, SlackMrkdwn, and PlainText ([[librefang-docs-deep-crawl]], extracted)
- ChannelOverrides allow per-channel behavioral customization; DM/GroupPolicy enforces message handling rules for direct messages vs. group channels ([[librefang-docs-deep-crawl]], extracted)
- ChannelRateLimiter applies channel-level rate limiting independent of the API-level GCRA rate limiter ([[librefang-docs-deep-crawl]], extracted)
- Thread support and chat commands are built in; chat commands include /models, /providers, /new, /compact, /model, /stop, /usage, /think ([[librefang-docs-deep-crawl]], extracted)
- The channel_send built-in tool allows agents to programmatically send messages to channels ([[librefang-docs-deep-crawl]], extracted)

## Connections

- The channel system is a core component of [[librefang]] implemented in the librefang-channels crate
- Channel rate limiting relates to [[librefang-security-architecture]] — the ChannelRateLimiter works alongside the API-level GCRA limiter
- Agents receive channel messages and respond via [[agentic-loop]]
- The channel_send tool is one of the 60 built-in tools in [[tool-use]]

## Sources

- [[librefang-docs-deep-crawl]]

## See Also

- [[librefang]]
- [[librefang-security-architecture]]
- [[agentic-loop]]
- [[tool-use]]
