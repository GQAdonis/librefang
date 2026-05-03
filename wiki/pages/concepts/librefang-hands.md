---
type: concept
source_count: 1
confidence: high
last_updated: 2026-05-03
tags:
  - librefang
  - hands
  - multi-agent
  - automation
---

# LibreFang Hands

Hands are specialized, pre-built agent workflows bundled with [[librefang]] that provide domain-specific automation capabilities. Each Hand encapsulates one or more agents configured for a particular task domain. Multi-agent Hands designate a coordinator agent (coordinator=true in HAND.toml) that orchestrates subordinate agents.

## Key Points

- LibreFang ships 15 built-in Hands covering research, media creation, OSINT, lead generation, trading, DevOps, social media management, and more ([[librefang-docs-deep-crawl]], extracted)
- Hands are declared in HAND.toml manifests with fields: id, version, name, description, category, icon, tools, `[[requires]]`, `[[settings]]`, and `[agent]` or `[agents.*]` sections ([[librefang-docs-deep-crawl]], extracted)
- Multi-agent Hands use coordinator=true to designate the lead agent that orchestrates subordinates ([[librefang-docs-deep-crawl]], extracted)
- Hand lifecycle states: Active, Paused, Error, Inactive ([[librefang-docs-deep-crawl]], extracted)
- Hands are controlled via REST API: GET /api/hands, POST /api/hands/{id}/activate, GET/PUT /api/hands/{id}/settings, POST /api/hands/instances/{id}/pause, DELETE /api/hands/instances/{id}, POST /api/hands/instances/{id}/message ([[librefang-docs-deep-crawl]], extracted)
- The Browser Hand includes a mandatory purchase approval gate before any buy action executes ([[librefang-docs-deep-crawl]], extracted)

## The 15 Built-in Hands

| Hand | Type | Domain |
|---|---|---|
| Clip | Multi-agent | YouTube download, clipping, subtitle generation |
| Creator | Multi-agent | AI media studio — image, video, music, speech |
| Lead | Multi-agent | Daily lead discovery, enrichment, 0-100 scoring, deduplication |
| Collector | Multi-agent | OSINT intelligence collection, change detection, knowledge graph |
| Predictor | Single-agent | Superforecasting engine, confidence intervals, contrarian patterns |
| Researcher | Multi-agent | Deep autonomous research, CRAAP credibility assessment, APA citation |
| Twitter | Multi-agent | Autonomous X/Twitter account management, content formats, approval queue |
| Browser | Single-agent | Web automation via Playwright, mandatory purchase approval gate |
| Analytics | Multi-agent | Business analytics, KPI tracking, automated reporting |
| ApiTester | Single-agent | Automated API testing, contract validation, regression detection |
| DevOps | Multi-agent | CI/CD monitoring, deployment automation, infrastructure alerts |
| LinkedIn | Multi-agent | LinkedIn profile monitoring, outreach automation |
| Reddit | Multi-agent | Reddit community monitoring, post scheduling, sentiment tracking |
| Strategist | Multi-agent | Strategic analysis, competitive intelligence, scenario planning |
| Trader | Multi-agent | Market data monitoring, signal generation, portfolio tracking |

## Connections

- Hands are a feature of [[librefang]] — they are bundled in the librefang-hands crate
- Hand agents are controlled via 4 dedicated built-in tools: hand_list, hand_activate, hand_status, hand_deactivate (see [[tool-use]])
- Hands use the same [[agentic-loop]] infrastructure as regular agents
- Multi-agent Hands coordinate via [[agent-to-agent-protocol]] internally

## Sources

- [[librefang-docs-deep-crawl]]

## See Also

- [[librefang]]
- [[agent-to-agent-protocol]]
- [[agentic-loop]]
- [[tool-use]]
