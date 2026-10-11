---
type: concept
source_count: 1
confidence: high
last_updated: 2026-05-03
tags:
  - librefang
  - skills
  - plugins
  - security
---

# LibreFang Skill System

The LibreFang skill system bundles 60 reusable, compiled-in agent skills covering programming languages, cloud platforms, databases, frameworks, and domain expertise. Skills are compiled into the binary via include_str! and undergo a multi-stage security pipeline before execution. The system also supports user-installed skills from FangHub and ClawHub marketplaces.

## Key Points

- 60 skills are compiled into the librefang-skills crate using include_str!, making them available in every LibreFang deployment without additional installation ([[librefang-docs-deep-crawl]], extracted)
- Skills support four runtime types: Python, Node.js, WASM, and PromptOnly ([[librefang-docs-deep-crawl]], extracted)
- The security pipeline applies SHA256 verification, a prompt injection scanner, trust boundary markers, and subprocess env_clear() sandboxing to every skill execution ([[librefang-docs-deep-crawl]], extracted)
- FangHub and ClawHub are skill marketplaces; FangHubClient and ClawHubClient are implemented in librefang-skills ([[librefang-docs-deep-crawl]], extracted)
- A SkillVerifier with SHA256 validates skill integrity before execution ([[librefang-docs-deep-crawl]], extracted)
- A SKILL.md parser provides 21 OpenClaw tool compatibility mappings for migrated skills ([[librefang-docs-deep-crawl]], extracted)
- The prompt injection scanner detects override patterns, exfiltration patterns, and shell references as part of skill security ([[librefang-docs-deep-crawl]], extracted)
- Skills are managed via CLI commands: skill install, skill list, skill search, skill create ([[librefang-docs-deep-crawl]], extracted)

## Connections

- The skill system is a core feature of [[librefang]] — bundled in the librefang-skills crate
- Skill execution security is layer 13 of [[librefang-security-architecture]] (prompt injection scanner) and shares the subprocess sandbox (layer 12)
- WASM-type skills run inside the WASM sandbox described in [[librefang-security-architecture]] (layer 2)
- Skills extend agent capabilities beyond the 60 built-in tools in [[tool-use]]

## Sources

- [[librefang-docs-deep-crawl]]

## See Also

- [[librefang]]
- [[librefang-security-architecture]]
- [[tool-use]]
- [[agentic-loop]]
