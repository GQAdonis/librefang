---
type: research-report
title: UAR durable team architecture evidence
verification_status: partial
feynman_grade: null
date: 2026-09-26
---

# Findings

The existing UAR kernel is the appropriate execution foundation. Durable team identity should outlive bounded runs while authority is refreshed for each activation. The source proves persisted thread records but also in-memory message enqueue and terminal-root cancellation; persistence alone must not be described as resumable teams [L-UAR].

Compiler output retains a full descriptor IR, but compile-and-register converts it into an AgentArtifact whose skill policy retains IDs only. That difference explains why schema acceptance is weaker than runtime fidelity. Fixing the conversion and effective binding is part of definitions work [L-UAR].

Codex separates a root-local control plane from a global thread manager and separates queue-only messages from triggering work. These are reusable design patterns; they are not an enterprise task board or portable Cedar authority [L-CODEX].

Claude demonstrates shared task coordination and direct communication, while documenting recovery/nesting constraints. OpenCode contributes delegation permissions and configurable agents. Kimi contributes declarative child references and isolated resumable instances, while restricting child nesting. None of these documents proves the exact UAR durability/authority guarantees [W-CLAUDE, W-OPENCODE, W-KIMI].

AG-UI already has subagent lifecycle and CUSTOM extensibility. A2UI is a separate declarative surface protocol. UAR's approved v0.9.1 profile must not silently become the upstream v1.0 example returned by a documentation search [W-AGUI, L-UAR, W-A2UI]. A2A's current released specification is v1.0.1, whereas UAR's RC-labelled structures retain older fields. The new team facade needs an explicit versioned mapping, not a conformance claim derived from comments [W-A2A, L-UAR].

# Recommendation

Build a durable collaboration domain above existing admitted turns, with a single task owner, explicit effect uncertainty, and protocol projections of the same records. Keep Boss and skill packs as consumers. Scope initial implementation to both local product stories and preserve federation as a later profile.

# Limits

No harness execution, application build or integration test was run. Web documentation is a retrieved snapshot, not a release certification. Code evidence is revision-bound. Firecrawl discovery succeeded for Claude/OpenCode/AG-UI; Kimi discovery returned DNS failure, so its official page was retrieved through web fallback. No claim is made that every known harness was exhaustively evaluated. Independent proposal review remains a separate receipt.
