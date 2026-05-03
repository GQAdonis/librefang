---
type: entity
entity_kind: tool
aliases:
  - "LibreFang"
  - "librefang"
source_count: 1
confidence: high
last_updated: 2026-05-03
tags:
  - agent-os
  - rust
  - open-source
  - self-hostable
---

# LibreFang

LibreFang is an open-source Agent Operating System written in Rust that provides full lifecycle management for AI agents — from creation and scheduling to communication and deployment — with 49 LLM drivers, 44 channel adapters, and support for the Model Context Protocol and Agent-to-Agent (A2A) collaboration protocols.

## Key Facts

- Written in Rust; organized as a Cargo workspace with 15 crates ([[librefang-docs-deep-crawl]], extracted)
- Ships 49 LLM drivers covering providers including Anthropic, OpenAI, Gemini, Groq, DeepSeek, Mistral, Ollama, Azure, and Bedrock ([[librefang-docs-deep-crawl]], extracted)
- Ships 44 channel adapters supporting Telegram, Discord, Slack, Email, Webhooks, WeChat, and more ([[librefang-docs-deep-crawl]], extracted)
- Ships 15 built-in Hands (specialized multi-agent workflows) and 60 built-in tools across 12 categories ([[librefang-docs-deep-crawl]], extracted)
- Implements 16 security layers including WASM sandboxing, Merkle audit chain, taint tracking, Ed25519 manifest signing, SSRF protection, and GCRA rate limiting ([[librefang-docs-deep-crawl]], extracted)
- REST API at :4545/api/ with 230+ endpoints; WebSocket support; OpenAI-compatible /v1/chat/completions ([[librefang-docs-deep-crawl]], extracted)
- React + TanStack Router/Query dashboard served at :4545/ ([[librefang-docs-deep-crawl]], extracted)
- Config lives at ~/.librefang/; SQLite is the primary persistence substrate (schema v5 migrations) ([[librefang-docs-deep-crawl]], extracted)
- Kernel boots in 14 steps; ModelCatalog contains 130+ built-in models with 20+ aliases across 49 providers ([[librefang-docs-deep-crawl]], extracted)
- ModelRouter uses TaskComplexity scoring to route between four ModelTier levels: Frontier, Smart, Balanced, Fast ([[librefang-docs-deep-crawl]], extracted)
- Agent loop stability enforced by LoopGuard (SHA256 tool repeat detection), session repair, block-aware compaction (triggers at 80% context window, retains 20 most recent messages), and an inter-agent call depth limit of 5 ([[librefang-docs-deep-crawl]], extracted)
- Memory substrate has 6 layers: KV store, semantic search (vector embeddings), knowledge graph, session manager, task board, and canonical sessions ([[librefang-docs-deep-crawl]], extracted)
- Installation via curl, PowerShell, Homebrew, npm, pip, Cargo, or Docker; one-click cloud deployment for Fly.io, Railway, Render, GCP (Terraform), and Linux systemd ([[librefang-docs-deep-crawl]], extracted)
- SDK support: JavaScript/TypeScript (@librefang/sdk), Python (librefang-sdk), Rust (librefang crate), Go ([[librefang-docs-deep-crawl]], extracted)
- Desktop app built with Tauri 2.0, boots kernel in-process ([[librefang-docs-deep-crawl]], extracted)
- 100% open source, self-hostable ([[librefang-docs-deep-crawl]], extracted)

## Crate Map

| Crate | Role |
|---|---|
| librefang-types | Shared types, taint tracking, Ed25519 signing, model catalog types |
| librefang-memory | SQLite substrate: KV, semantic search, knowledge graph, sessions, task board |
| librefang-runtime | Agent loop, LLM drivers, 60 tools, WASM sandbox, MCP, A2A, browser automation |
| librefang-kernel | Central coordinator: AgentRegistry, EventBus, WorkflowEngine, AuthManager, etc. |
| librefang-api | Axum 0.8 HTTP server, 230+ endpoints, REST/WS/SSE, React dashboard |
| librefang-channels | 44 channel adapters, formatter, rate limiter, bridge manager |
| librefang-wire | OFP peer-to-peer protocol (JSON/TCP, HMAC-SHA256) |
| librefang-cli | Clap-based CLI; all commands; built-in MCP server mode |
| librefang-desktop | Tauri 2.0 desktop app |
| librefang-skills | 60 bundled skills, FangHub/ClawHub clients, skill verifier |
| librefang-extensions | Credential vault, OAuth2 PKCE, MCP setup helpers |
| librefang-hands | 15 hand agents from registry |
| librefang-telemetry | OpenTelemetry metrics and traces |
| librefang-migrate | Migration from OpenClaw and OpenFang |
| librefang-testing | Test utilities |

## Relationships

- Implements [[model-context-protocol]] — MCP client (stdio/SSE) and server (exposes 60 tools)
- Integrates [[anthropic]] — native AnthropicDriver in librefang-runtime
- Implements [[agent-to-agent-protocol]] — A2A endpoints for inter-agent collaboration
- Uses [[librefang-wire-protocol]] — OFP for peer-to-peer daemon communication
- Provides [[librefang-hands]] — 15 specialized multi-agent workflow agents
- Protected by [[librefang-security-architecture]] — 16-layer defense-in-depth model
- Routes messages via [[librefang-channel-system]] — 44 channel adapters
- Executes [[librefang-skill-system]] — 60 compiled-in skills

## Mentioned In

- [[librefang-docs-deep-crawl]]

## See Also

- [[librefang-hands]]
- [[librefang-security-architecture]]
- [[librefang-channel-system]]
- [[librefang-skill-system]]
- [[agent-to-agent-protocol]]
- [[librefang-wire-protocol]]
- [[agentic-loop]]
- [[mcp-integration]]
- [[tool-use]]
