---
type: concept
source_count: 1
confidence: high
last_updated: 2026-05-03
tags:
  - librefang
  - security
  - defense-in-depth
  - rbac
  - wasm
---

# LibreFang Security Architecture

LibreFang implements a 16-layer defense-in-depth security model spanning capability enforcement, sandboxing, audit logging, supply-chain protection, network safety, rate limiting, and multi-factor authentication. Each layer is implemented in a specific crate and addresses a distinct threat category.

## Key Points

- 16 security systems are implemented across multiple crates, providing defense-in-depth against threats ranging from prompt injection to supply-chain attacks ([[librefang-docs-deep-crawl]], extracted)
- Capability-based security uses a Capability enum in librefang-types with glob-style matching (exact, *, prefix, suffix, middle patterns) and validate_capability_inheritance() to prevent privilege escalation at agent spawn ([[librefang-docs-deep-crawl]], extracted)
- WASM dual metering (librefang-runtime) uses fuel metering (1M instructions default) plus epoch interruption (30-second timeout via watchdog thread) to prevent infinite loops and CPU DoS ([[librefang-docs-deep-crawl]], extracted)
- Merkle audit trail (librefang-runtime) maintains a SHA256 hash chain over 12 action types: ToolInvoke, CapabilityCheck, AgentSpawn, AgentKill, AgentMessage, MemoryAccess, FileAccess, NetworkAccess, ShellExec, AuthAttempt, WireConnect, ConfigChange ([[librefang-docs-deep-crawl]], extracted)
- Taint tracking (librefang-types) uses 5 labels — ExternalNetwork, UserInput, Pii, Secret, UntrustedAgent — with propagation rules enforced at sinks: shell_exec blocks External/Untrusted/UserInput; net_fetch blocks Secret/Pii; agent_message blocks Secret ([[librefang-docs-deep-crawl]], extracted)
- Ed25519 manifest signing (librefang-types) computes SHA256(manifest) signed with ed25519-dalek and stores it in a SignedManifest envelope with a 64-byte signature, 32-byte public key, content_hash, and signer_id to prevent supply-chain attacks ([[librefang-docs-deep-crawl]], extracted)
- SSRF protection (librefang-runtime) blocks localhost, 169.254.169.254 (GCP metadata), and private IP ranges 10/8, 172.16/12, 192.168/16, 169.254/16, fc00::/7, fe80::/10 with DNS resolution checking for all resolved IPs; an ssrf_allowed_hosts allowlist exists in config but cloud metadata endpoints are always blocked ([[librefang-docs-deep-crawl]], extracted)
- Secret zeroization uses Zeroizing<String> for API keys in memory; subprocess sandbox calls env_clear() then re-adds only PATH, HOME, TMPDIR, TMP, TEMP, LANG, LC_ALL, TERM plus Windows-specific vars, with no shell invocation (Command::new + args) ([[librefang-docs-deep-crawl]], extracted)
- OFP mutual auth (librefang-wire) uses HMAC-SHA256 authentication on every peer connection ([[librefang-docs-deep-crawl]], extracted)
- GCRA rate limiter (librefang-api) operates at 500 tokens/minute/IP with operation-specific costs: health=1, GET agents=2, GET usage=3, GET audit=5, POST agent=50, POST message=30, POST workflow run=100 ([[librefang-docs-deep-crawl]], extracted)
- Path traversal prevention uses a two-phase check (..) plus canonicalize, with the capability check performed BEFORE path resolution ([[librefang-docs-deep-crawl]], extracted)
- Prompt injection scanner (librefang-skills) detects override patterns ("ignore previous instructions"), exfiltration patterns ("send to http"), and shell references ("rm -rf", "sudo") ([[librefang-docs-deep-crawl]], extracted)
- LoopGuard (librefang-runtime) detects stuck agent tool loops using SHA256-based tool repeat detection: warn at 3 repeats, block at 5, circuit-break at 30 ([[librefang-docs-deep-crawl]], extracted)
- TOTP second-factor (librefang-kernel) uses RFC 6238 (SHA-1, 6 digits, 30s step, ±1 window) with configurable grace period (default 300s, max 3600s) stored in AES-256-GCM vault; enrollment via /api/approvals/totp/setup + confirm ([[librefang-docs-deep-crawl]], extracted)
- Dashboard authentication uses optional username/password with vault-backed storage, constant-time comparison, and HMAC session tokens (no server-side sessions) ([[librefang-docs-deep-crawl]], extracted)

## The 16 Security Layers

| # | Layer | Crate | Threat Addressed |
|---|---|---|---|
| 1 | Capability-Based Security | librefang-types | Unauthorized agent actions |
| 2 | WASM Dual Metering | librefang-runtime | Infinite loops, CPU DoS |
| 3 | Merkle Audit Trail | librefang-runtime | Tampered audit logs |
| 4 | Taint Tracking | librefang-types | Prompt injection, data exfiltration |
| 5 | Ed25519 Manifest Signing | librefang-types | Supply-chain attacks |
| 6 | SSRF Protection | librefang-runtime | Server-side request forgery |
| 7 | Secret Zeroization | runtime + channels | Memory forensics, key leakage |
| 8 | OFP Mutual Auth | librefang-wire | Unauthorized peer connections |
| 9 | Security Headers | librefang-api | XSS, clickjacking, MIME sniffing |
| 10 | GCRA Rate Limiter | librefang-api | API abuse, DoS |
| 11 | Path Traversal Prevention | librefang-runtime | Directory traversal |
| 12 | Subprocess Sandbox | librefang-runtime | Secret leakage via child processes |
| 13 | Prompt Injection Scanner | librefang-skills | Malicious skill prompts |
| 14 | Loop Guard | librefang-runtime | Stuck agent tool loops |
| 15 | Session Repair | librefang-runtime | Corrupted LLM conversation history |
| 16 | Health Endpoint Redaction | librefang-api | Information leakage |
| 17 | TOTP Second-Factor | librefang-kernel | Compromised channel self-approval |

*(Note: documentation titles the system as "16 layers" but enumerates 17 distinct items.)* (inferred)

## Connections

- Capability enforcement is a core feature of [[librefang]] — every agent action is checked against its declared capabilities
- WASM sandboxing relates to [[librefang-skill-system]] — skills run inside the WASM sandbox
- The Merkle audit chain covers actions from [[tool-use]], agent messaging via [[agent-to-agent-protocol]], and peer connections via [[librefang-wire-protocol]]
- Prompt injection scanner is part of [[librefang-skill-system]]'s security pipeline
- GCRA rate limiter protects the [[librefang-channel-system]] and REST API

## Sources

- [[librefang-docs-deep-crawl]]

## See Also

- [[librefang]]
- [[librefang-skill-system]]
- [[librefang-wire-protocol]]
- [[librefang-channel-system]]
- [[tool-use]]
- [[agentic-loop]]
