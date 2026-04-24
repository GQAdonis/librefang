<p align="center">
  <img src="docs/branding/boss-libre.png" width="160" alt="BossFang Logo" />
</p>

<h1 align="center">BossFang</h1>
<h3 align="center">Libre Agent Operating System — Free as in Freedom</h3>

<p align="center">
  Open-source Agent OS built in Rust. 14 crates. 2,100+ tests. Zero clippy warnings.
</p>

<p align="center">
  <a href="README.md">English</a> | <a href="i18n/README.zh.md">中文</a> | <a href="i18n/README.ja.md">日本語</a> | <a href="i18n/README.ko.md">한국어</a> | <a href="i18n/README.es.md">Español</a> | <a href="i18n/README.de.md">Deutsch</a> | <a href="i18n/README.pl.md">Polski</a>
</p>

<p align="center">
  <a href="https://librefang.ai/">Website</a> &bull;
  <a href="https://docs.librefang.ai">Docs</a> &bull;
  <a href="CONTRIBUTING.md">Contributing</a> &bull;
  <a href="https://discord.gg/DzTYqAZZmc">Discord</a>
</p>

<p align="center">
  <a href="https://github.com/librefang/librefang/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/librefang/librefang/ci.yml?style=flat-square&label=CI" alt="CI" /></a>
  <img src="https://img.shields.io/badge/language-Rust-orange?style=flat-square" alt="Rust" />
  <img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" alt="MIT" />
  <img src="https://img.shields.io/github/stars/librefang/librefang?style=flat-square" alt="Stars" />
  <img src="https://img.shields.io/github/v/release/librefang/librefang?style=flat-square" alt="Latest Release" />
  <a href="https://discord.gg/DzTYqAZZmc"><img src="https://img.shields.io/discord/1481633471507071129?style=flat-square&logo=discord&label=Discord" alt="Discord" /></a>
  <a href="https://deepwiki.com/librefang/librefang"><img src="https://deepwiki.com/badge.svg" alt="Ask DeepWiki"></a>
</p>

---

## What is LibreFang?

LibreFang is an **Agent Operating System** — a full platform for running autonomous AI agents, built from scratch in Rust. Not a chatbot framework, not a Python wrapper.

Traditional agent frameworks wait for you to type something. LibreFang runs **agents that work for you** — on schedules, 24/7, monitoring targets, generating leads, managing social media, and reporting to your dashboard.

> LibreFang is a community fork of [`RightNow-AI/openfang`](https://github.com/RightNow-AI/openfang) with open governance and a merge-first PR policy. See [GOVERNANCE.md](GOVERNANCE.md) for details.

<p align="center">
  <img src="public/assets/dashboard.png" width="800" alt="LibreFang Dashboard" />
</p>

## Quick Start

```bash
# Install (Linux/macOS/WSL)
curl -fsSL https://librefang.ai/install.sh | sh

# Or install via Cargo
cargo install --git https://github.com/librefang/librefang librefang-cli

# Start — auto-initializes on first run, dashboard at http://localhost:4545
librefang start

# Or run the setup wizard manually for interactive provider selection
# librefang init
```

<details>
<summary><strong>Homebrew</strong></summary>

```bash
brew tap librefang/tap
brew install librefang              # CLI (stable)
brew install --cask librefang       # Desktop (stable)
# Beta/RC channels also available:
# brew install librefang-beta       # or librefang-rc
# brew install --cask librefang-rc  # or librefang-beta
```

</details>

<details>
<summary><strong>Docker</strong></summary>

```bash
docker run -p 4545:4545 ghcr.io/librefang/librefang
```

</details>

<details>
<summary><strong>Cloud Deploy</strong></summary>

[![Deploy Hub](https://img.shields.io/badge/Deploy%20Hub-000?style=for-the-badge&logo=rocket)](https://deploy.librefang.ai) [![Fly.io](https://img.shields.io/badge/Fly.io-purple?style=for-the-badge&logo=fly.io)](https://deploy.librefang.ai) [![Render](https://img.shields.io/badge/Render-46E3B7?style=for-the-badge&logo=render)](https://render.com/deploy?repo=https://github.com/librefang/librefang) [![Railway](https://img.shields.io/badge/Railway-0B0D0E?style=for-the-badge&logo=railway)](https://railway.app/template/librefang) [![GCP](https://img.shields.io/badge/GCP-4285F4?style=for-the-badge&logo=googlecloud)](deploy/gcp/README.md)

</details>

## Hands: Agents That Work for You

**Hands** are pre-built autonomous capability packages that run independently, on schedules, without prompting. 14 bundled:

| Hand | What It Does |
|------|-------------|
| **Researcher** | Deep research — multi-source, credibility scoring (CRAAP), cited reports |
| **Collector** | OSINT monitoring — change detection, sentiment tracking, knowledge graph |
| **Predictor** | Superforecasting — calibrated predictions with confidence intervals |
| **Strategist** | Strategy analysis — market research, competitive intel, business planning |
| **Analytics** | Data analytics — collection, analysis, visualization, automated reporting |
| **Trader** | Market intelligence — multi-signal analysis, risk management, portfolio analytics |
| **Lead** | Prospect discovery — web research, scoring, dedup, qualified lead delivery |
| **Twitter** | Autonomous X/Twitter — content creation, scheduling, approval queue |
| **Reddit** | Reddit manager — subreddit monitoring, posting, engagement tracking |
| **LinkedIn** | LinkedIn manager — content creation, networking, professional engagement |
| **Clip** | YouTube to vertical shorts — cuts best moments, captions, voice-over |
| **Browser** | Web automation — Playwright-based, mandatory purchase approval gate |
| **API Tester** | API testing — endpoint discovery, validation, load testing, regression detection |
| **DevOps** | DevOps automation — CI/CD, infrastructure monitoring, incident response |

```bash
librefang hand activate researcher   # Starts working immediately
librefang hand status researcher     # Check progress
librefang hand list                  # See all Hands
```

Build your own: define a `HAND.toml` + system prompt + `SKILL.md`. [Guide](https://docs.librefang.ai/agent/skills)

## Architecture

14 Rust crates, modular kernel design.

```
librefang-kernel      Orchestration, workflows, metering, RBAC, scheduler, budget
librefang-runtime     Agent loop, 3 LLM drivers, 53 tools, WASM sandbox, MCP, A2A
librefang-api         140+ REST/WS/SSE endpoints, OpenAI-compatible API, dashboard
librefang-channels    40 messaging adapters with rate limiting, DM/group policies
librefang-memory      SQLite persistence, vector embeddings, sessions, compaction
librefang-storage     SurrealDB 3.0 connection pool, migrations, DDL provisioning
librefang-types       Core types, taint tracking, Ed25519 signing, model catalog
librefang-skills      60 bundled skills, SKILL.md parser, FangHub marketplace
librefang-hands       14 autonomous Hands, HAND.toml parser, lifecycle management
librefang-extensions  25 MCP templates, AES-256-GCM vault, OAuth2 PKCE
librefang-wire        OFP P2P protocol, HMAC-SHA256 mutual auth
librefang-cli         CLI, daemon management, TUI dashboard, MCP server mode
librefang-desktop     Tauri 2.0 native app (tray, notifications, shortcuts)
librefang-migrate     OpenClaw, LangChain, AutoGPT migration engine
xtask                 Build automation
```

---

## SurrealDB Storage Backend

LibreFang now supports **SurrealDB 3.0** as a fully wired, production-ready storage backend for agent persistence, audit trails, and TOTP lockout — in addition to the embedded SQLite substrate used for sessions, knowledge graphs, and semantic search.

### What changed

The `surrealdb-storage-swap` work completed the following across 15 files:

| Area | What Was Done |
|------|---------------|
| **Kernel boot** | `boot_with_config` now opens a `SurrealConnectionPool`, runs idempotent DDL migrations, and wires all three Surreal backends — agent registry, audit store, and TOTP lockout — before the first agent spawns. |
| **Agent registry** | New `agent_store: Arc<dyn MemoryBackend>` kernel field routes agent CRUD to `SurrealMemoryBackend` when `surreal-backend` is active, or falls back to the embedded SQLite `MemorySubstrate`. All other memory operations (sessions, knowledge graph, semantic search, usage) remain on SQLite. |
| **Audit trail** | `audit_log` field changed from `Arc<AuditLog>` (concrete SQLite) to `Arc<dyn AuditStore>` trait object. `SurrealAuditStore` is used when the feature is active; the SQLite `AuditLog` is the fallback. The Merkle hash chain anchor is preserved in both paths. |
| **TOTP lockout** | `ApprovalManager` gained a `new_with_surreal` constructor and an optional `Box<dyn TotpLockoutBackend>`. Lockout state persists to `SurrealTotpLockoutBackend` when active; otherwise falls back to the existing SQLite path. |
| **UAR DDL provisioning** | New `librefang_storage::provision_uar_namespace` function — triggered by `POST /api/storage/link-uar` with admin credentials — idempotently creates the namespace, database, and scoped user on a remote SurrealDB instance using root-level credentials read **only** from environment variables (never persisted). |
| **TLS skip-verify** | `tls_skip_verify = true` in config now emits a `tracing::warn!` log so operators know full certificate bypass is not yet wired at the transport layer. |
| **Test isolation** | Relative embedded paths (e.g. `.librefang`) are absolutised against the kernel's `data_dir` at boot, preventing RocksDB LOCK contention between parallel test instances. |
| **Runtime-agnostic helpers** | All `block_on` helpers in the SurrealDB backends now fall back gracefully to a temporary `tokio::runtime::Runtime` when called from a plain `#[test]` thread with no active Tokio context, fixing 15 previously failing kernel tests. |

### Why SurrealDB

| Property | Embedded SQLite (before) | SurrealDB 3.0 (now) |
|----------|--------------------------|---------------------|
| Agent persistence | Single-process only | Shared across processes / nodes |
| Scale | Dev / single-node | Multi-node clusters |
| Query model | SQL | SurrealQL (multi-model: doc, graph, relational) |
| Schema migration | Manual SQL | Idempotent DDL checked by checksum |
| UAR integration | Not supported | Namespaced, scoped-user provisioning |
| Secrets | N/A | Credentials read from env vars only — never written to disk |

### Choosing a backend

The backend is selected at compile time via the `surreal-backend` Cargo feature. When the feature is off, the kernel runs entirely on SQLite (zero new dependencies). When it is on, SurrealDB is activated at boot using the storage config in `~/.librefang/config.toml`.

```toml
# ~/.librefang/config.toml

# --- Embedded (default, no external process needed) ---
[storage]
namespace = "librefang"
database  = "main"

[storage.backend]
kind = "embedded"
path = "/home/user/.librefang/librefang.surreal"

# --- Remote SurrealDB instance ---
[storage]
namespace = "librefang"
database  = "main"

[storage.backend]
kind         = "remote"
url          = "wss://surreal.example.com"
namespace    = "librefang"
database     = "main"
username     = "lf_app"
password_env = "LF_DB_PASS"   # name of env var — password never in config
tls_skip_verify = false        # true emits a warning; never use in production
```

### Linking a Universal Agent Runtime (UAR) instance

`POST /api/storage/link-uar` now performs one-shot DDL provisioning when admin credentials are supplied. The endpoint:

1. Reads `root_password_env` and `app_password_env` values from the environment.
2. Opens a **temporary** root-level SurrealDB connection.
3. Idempotently executes `DEFINE NAMESPACE / DATABASE / USER` DDL.
4. Drops the root connection immediately — credentials are never cached.
5. Writes the application-level remote config to `config.toml`.

```bash
# Set secrets in the environment before calling the endpoint
export SURREAL_ROOT_PASS="my-root-secret"
export SURREAL_UAR_PASS="my-app-secret"

curl -X POST http://localhost:4545/api/storage/link-uar \
  -H "Content-Type: application/json" \
  -d '{
    "remote_url":       "wss://surreal.example.com",
    "namespace":        "uar",
    "app_user":         "uar_app",
    "app_pass_ref":     "SURREAL_UAR_PASS",
    "also_link_memory": true,
    "admin_username":   "root",
    "admin_password_env": "SURREAL_ROOT_PASS"
  }'
```

The response includes `"provisioned": true` when DDL was applied, or `false` when the `surreal-backend` feature is not compiled in.

### Building with the SurrealDB backend

```bash
# Build with embedded SurrealDB support
cargo build --workspace --features surreal-backend

# Run the full test suite (all 478 kernel tests pass)
cargo test --workspace
```

---

## Key Features

**40 Channel Adapters** — Telegram, Discord, Slack, WhatsApp, Signal, Matrix, Email, Teams, Google Chat, Feishu, LINE, Mastodon, Bluesky, and 26 more. [Full list](https://docs.librefang.ai/integrations/channels)

**28 LLM Providers** — Anthropic, Gemini, OpenAI, Groq, DeepSeek, OpenRouter, Ollama, Alibaba Coding Plan, and 20 more. Intelligent routing, automatic fallback, cost tracking. [Details](https://docs.librefang.ai/configuration/providers)

**16 Security Layers** — WASM sandbox, Merkle audit trail, taint tracking, Ed25519 signing, SSRF protection, secret zeroization, and more. [Details](https://docs.librefang.ai/getting-started/comparison#16-security-systems--defense-in-depth)

**OpenAI-Compatible API** — Drop-in `/v1/chat/completions` endpoint. 140+ REST/WS/SSE endpoints. [API Reference](https://docs.librefang.ai/integrations/api)

**Client SDKs** — Full REST client with streaming support.

```javascript
// JavaScript/TypeScript
npm install @librefang/sdk
const { LibreFang } = require("@librefang/sdk");
const client = new LibreFang("http://localhost:4545");
const agent = await client.agents.create({ template: "assistant" });
const reply = await client.agents.message(agent.id, "Hello!");
```

```python
# Python
pip install librefang
from librefang import Client
client = Client("http://localhost:4545")
agent = client.agents.create(template="assistant")
reply = client.agents.message(agent["id"], "Hello!")
```

```rust
// Rust
cargo add librefang
use librefang::LibreFang;
let client = LibreFang::new("http://localhost:4545");
let agent = client.agents().create(CreateAgentRequest { template: Some("assistant".into()), .. }).await?;
```

```go
// Go
go get github.com/librefang/librefang/sdk/go
import "github.com/librefang/librefang/sdk/go"
client := librefang.New("http://localhost:4545")
agent, _ := client.Agents.Create(map[string]interface{}{"template": "assistant"})
```

**MCP Support** — Built-in MCP client and server. Connect to IDEs, extend with custom tools, compose agent pipelines. [Details](https://docs.librefang.ai/integrations/mcp-a2a)

**A2A Protocol** — Google Agent-to-Agent protocol support. Discover, communicate, and delegate tasks across agent systems. [Details](https://docs.librefang.ai/integrations/mcp-a2a)

**Desktop App** — Tauri 2.0 native app with system tray, notifications, and global shortcuts.

**OpenClaw Migration** — `librefang migrate --from openclaw` imports agents, history, skills, and config.

## Development

```bash
cargo build --workspace --lib                            # Build
cargo test --workspace                                   # 2,100+ tests
cargo clippy --workspace --all-targets -- -D warnings    # Zero warnings
cargo fmt --all -- --check                               # Format check

# Build with SurrealDB backend enabled
cargo build --workspace --features surreal-backend
cargo test  --workspace --features surreal-backend
```

## Comparison

See [Comparison](https://docs.librefang.ai/getting-started/comparison#16-security-systems--defense-in-depth) for benchmarks and feature-by-feature comparison vs OpenClaw, ZeroClaw, CrewAI, AutoGen, and LangGraph.

## Links

- [Documentation](https://docs.librefang.ai) &bull; [API Reference](https://docs.librefang.ai/integrations/api) &bull; [Getting Started](https://docs.librefang.ai/getting-started) &bull; [Troubleshooting](https://docs.librefang.ai/operations/troubleshooting)
- [Contributing](CONTRIBUTING.md) &bull; [Governance](GOVERNANCE.md) &bull; [Security](SECURITY.md)
- Discussions: [Q&A](https://github.com/librefang/librefang/discussions/categories/q-a) &bull; [Use Cases](https://github.com/librefang/librefang/discussions/categories/show-and-tell) &bull; [Feature Votes](https://github.com/librefang/librefang/discussions/categories/ideas) &bull; [Announcements](https://github.com/librefang/librefang/discussions/categories/announcements) &bull; [Discord](https://discord.gg/DzTYqAZZmc)

## Contributors

<a href="https://github.com/librefang/librefang/graphs/contributors">
  <img src="web/public/assets/contributors.svg" alt="Contributors" />
</a>

<p align="center">
  We welcome contributions of all kinds — code, docs, translations, bug reports.<br/>
  Check the <a href="CONTRIBUTING.md">Contributing Guide</a> and pick a <a href="https://github.com/librefang/librefang/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22">good first issue</a> to get started!<br/>
  You can also visit the <a href="https://leszek3737.github.io/librefang-WIki/">unofficial wiki</a>, which is updated with helpful information for new contributors.
</p>

<p align="center">
  <a href="https://github.com/librefang/librefang/stargazers">
    <img src="web/public/assets/star-history.svg" alt="Star History" />
  </a>
</p>

---

<p align="center">MIT License</p>
