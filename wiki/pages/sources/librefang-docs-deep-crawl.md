---
type: source
title: "LibreFang Documentation Deep Crawl"
author: "LibreFang Project"
date_published: null
date_ingested: 2026-05-03
raw_path: "raw/librefang-docs-deep-crawl.md"
source_url: "https://docs.librefang.ai"
format: md
claim_count: 29
confidence: high
tags:
  - librefang
  - agent-os
  - rust
  - architecture
  - security
---

# LibreFang Documentation Deep Crawl

Official documentation for LibreFang, an open-source Agent Operating System written in Rust. The crawl covers the main page, Getting Started, Architecture, Hands, and Security subpages, providing comprehensive technical coverage of system features, internal architecture, crate layout, and security model.

## Key Claims

- LibreFang is an open-source Agent Operating System written in Rust with 49 LLM drivers, 44 channel adapters, and support for MCP and A2A protocols ([[librefang-docs-deep-crawl]], extracted)
- The system ships 15 built-in Hands covering research, media creation, lead generation, trading, DevOps, and more ([[librefang-docs-deep-crawl]], extracted)
- LibreFang implements 16 distinct security layers including WASM dual metering, Merkle hash chain audit trails, taint tracking, Ed25519 manifest signing, and SSRF protection ([[librefang-docs-deep-crawl]], extracted)
- The Cargo workspace contains 15 crates covering core types, memory, runtime, kernel, API, channels, wire protocol, CLI, desktop, migration, skills, extensions, hands, telemetry, and testing ([[librefang-docs-deep-crawl]], extracted)
- The kernel boots in 14 steps from config loading through SQLite migration, LLM driver init, ModelCatalog (130+ models, 20+ aliases, 49 providers), and RBAC setup ([[librefang-docs-deep-crawl]], extracted)
- The memory substrate has 6 layers: structured KV store, semantic search with vector embeddings, knowledge graph, session manager, task board, and usage/canonical sessions ([[librefang-docs-deep-crawl]], extracted)
- Agent loop stability is enforced by LoopGuard (SHA256-based tool repeat detection: warn@3/block@5/circuit-break@30), 50,000-char tool result truncation, 60-second tool timeout, max 3 continuations, and inter-agent depth limit of 5 ([[librefang-docs-deep-crawl]], extracted)
- The LLM driver abstraction covers 3 concrete drivers (Anthropic, Gemini, OpenAI-compatible) spanning 49 providers with per-agent driver resolution and exponential backoff on 429/529 errors ([[librefang-docs-deep-crawl]], extracted)
- Capability-based security uses a Capability enum with glob-style matching and validate_capability_inheritance() to prevent privilege escalation at agent spawn ([[librefang-docs-deep-crawl]], extracted)
- 44 channel adapters support Telegram, Discord, Slack, Email, Webhooks, and more, with ChannelOverrides, DM/GroupPolicy, Markdown formatter, and channel-level rate limiting ([[librefang-docs-deep-crawl]], extracted)
- The skill system bundles 60 compiled-in skills with SHA256 verification, prompt injection scanning, trust boundary markers, and subprocess env_clear() sandboxing ([[librefang-docs-deep-crawl]], extracted)
- 60 built-in tools span 12 categories: file/patch, web/location, shell/docker, agent ops, memory/knowledge, tasks/events, browser automation (10 tools), process management, media/AI, hands control, scheduling/comms, and A2A/canvas ([[librefang-docs-deep-crawl]], extracted)
- The OFP wire protocol uses JSON-framed TCP with HMAC-SHA256 mutual auth, a 16MB message size limit, and is designed to run behind WireGuard/Tailscale for encryption ([[librefang-docs-deep-crawl]], extracted)
- A2A protocol endpoints: /.well-known/agent.json, /a2a/tasks/send, /a2a/tasks/{id}, /a2a/tasks/{id}/cancel ([[librefang-docs-deep-crawl]], extracted)
- WASM dual metering uses fuel metering (1M instruction default) plus epoch interruption (30-second timeout via watchdog thread) ([[librefang-docs-deep-crawl]], extracted)
- SSRF protection blocks localhost, GCP metadata endpoints, RFC-1918 private IP ranges (10/8, 172.16/12, 192.168/16, 169.254/16) and IPv6 private ranges with DNS resolution checking ([[librefang-docs-deep-crawl]], extracted)
- GCRA rate limiter operates at 500 tokens/minute/IP with operation costs: health=1, GET agents=2, POST agent=50, POST message=30, POST workflow run=100 ([[librefang-docs-deep-crawl]], extracted)
- Taint labels include ExternalNetwork, UserInput, Pii, Secret, UntrustedAgent; sinks enforce propagation rules (shell_exec blocks External/Untrusted/UserInput, net_fetch blocks Secret/Pii) ([[librefang-docs-deep-crawl]], extracted)
- TOTP second-factor uses RFC 6238 (SHA-1, 6 digits, 30s step, ±1 window) with grace period (default 300s, max 3600s) stored in AES-256-GCM vault ([[librefang-docs-deep-crawl]], extracted)
- Block-aware compaction triggers at 80% context window, retaining the 20 most recent messages ([[librefang-docs-deep-crawl]], extracted)
- Installation supports curl script, PowerShell, Homebrew, npm, pip, Cargo, and Docker; config lives at ~/.librefang/ ([[librefang-docs-deep-crawl]], extracted)
- The REST API runs at :4545/api/ with 230+ endpoints, WebSocket at /api/agents/{id}/ws, OpenAI-compatible /v1/chat/completions, and a React+TanStack Router dashboard at :4545/ ([[librefang-docs-deep-crawl]], extracted)
- The desktop app is built with Tauri 2.0, boots the kernel in-process on a background axum thread, and serves the WebView on a random port ([[librefang-docs-deep-crawl]], extracted)
- Web search uses a 4-provider cascade: Tavily → Brave → Perplexity → DuckDuckGo ([[librefang-docs-deep-crawl]], extracted)
- Hands use a HAND.toml manifest format; multi-agent Hands designate a coordinator agent with coordinator=true ([[librefang-docs-deep-crawl]], extracted)
- Ed25519 manifest signing produces a SignedManifest envelope with a 64-byte signature, 32-byte public key, content hash, and signer_id ([[librefang-docs-deep-crawl]], extracted)
- The Merkle audit trail covers 12 action types: ToolInvoke, CapabilityCheck, AgentSpawn, AgentKill, AgentMessage, MemoryAccess, FileAccess, NetworkAccess, ShellExec, AuthAttempt, WireConnect, ConfigChange ([[librefang-docs-deep-crawl]], extracted)
- SDK support spans JavaScript/TypeScript (@librefang/sdk), Python (librefang-sdk), Rust (librefang crate), and Go ([[librefang-docs-deep-crawl]], extracted)
- ModelRouter uses TaskComplexity scoring for automatic model selection across four ModelTier levels: Frontier, Smart, Balanced, Fast ([[librefang-docs-deep-crawl]], extracted)

## Entities Mentioned

- [[librefang]] — primary subject; open-source Agent OS in Rust
- [[anthropic]] — one of 49 LLM providers; native AnthropicDriver in librefang-runtime
- [[model-context-protocol]] — MCP client/server implemented in librefang-runtime
- Wasmtime — WASM runtime used for the WASM sandbox (below threshold)
- Tauri — framework for the desktop application (below threshold)
- Playwright — browser automation engine used by the Browser hand and browser tools (below threshold)
- ElevenLabs — TTS provider in the MediaDriver (below threshold)
- MiniMax — image/video/music provider in the MediaDriver (below threshold)
- Fly.io, Railway, Render — one-click cloud deployment targets (below threshold)

## Concepts Covered

- [[librefang-hands]] — 15 built-in specialized multi-agent workflows
- [[librefang-security-architecture]] — 16-layer defense-in-depth security model
- [[librefang-channel-system]] — 44 channel adapters with formatting, rate limiting, and routing
- [[librefang-skill-system]] — 60 compiled-in skills with a security pipeline
- [[agent-to-agent-protocol]] — A2A inter-agent communication protocol
- [[librefang-wire-protocol]] — OFP JSON/TCP peer protocol with HMAC-SHA256 mutual auth
- [[agentic-loop]] — agent loop with LoopGuard, session repair, and block-aware compaction
- [[sessions]] — session management including canonical sessions (schema v5)
- [[tool-use]] — 60 built-in tools across 12 categories
- [[mcp-integration]] — MCP client (stdio/SSE) and server (exposes all 60 tools)
- [[hooks]] — trigger and event system for agent invocation

## Assessment

This source is official LibreFang project documentation, making it authoritative for the system's design intent, feature set, and architecture. Confidence is high: the documentation names specific crate boundaries, algorithm parameters (WASM fuel limits, GCRA token costs), RFC references (RFC 6238 for TOTP), and exact enum variants, consistent with engineering-grade specification writing. No independent verification of live system behavior is available from this source alone; some counts (e.g., "49 providers") should be treated as self-reported by the project.
