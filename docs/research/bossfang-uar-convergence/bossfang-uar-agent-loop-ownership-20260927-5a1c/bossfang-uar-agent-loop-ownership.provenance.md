# Provenance: Who should own the agent loop between BossFang and the Universal Agent Runtime, how UAR is offered embedded or remote from BossFang, and how BossFang, UAR, surreal-memory and the-boss stay version-consistent

- **Package:** bossfang-uar-agent-loop-ownership-20260927-5a1c
- **Date:** 2026-09-27T21:05:00Z to 2026-09-27T21:37:53Z
- **Scale:** full
- **Stages planned:** 01 02 03 04 05 06 07 08 09 10
- **Stages completed:** 01 02 03 04 05 06 07 08 09 10
- **Sources consulted:** 83
- **Sources accepted:** 83
- **Sources rejected:** 0 (none rejected)
- **Verification:** PASS WITH NOTES
- **Blocked:** none
- **Adversarial review:** CHANGES REQUESTED (0 CRITICAL, 9 WARNING)
- **Review warnings:**
  - H1 decision 4 vs decision 7: UAR host admission is loopback and launch-token only
  - H2 M5 depends on G4; shipped UAR_IMAGE 2aaeadd9 lacks host run features
  - M-a UAR executor costs omitted
  - M-b double approval gate and five-endpoint admission protocol
  - M-c gateway is a codec change with behaviour change
  - omission: provision_uar_namespace / link-uar vs store separation
  - L-a widen M8 documentation step
  - L-b one sentence per line in ADR and analysis
  - L-c label the two confidence numbers
- **Plan:** plan.md
- **Stage files:** plan.md report.md graph.json citations.json contradictions.json manifest.json index.md checkpoint.json ; sources/ holds 86 file(s)
- **Notes:**
  - Harness-driven run (stage skills executed in-session, not via run-research.sh).
  - surreal-memory MCP unreachable (connection refused); registry and graph on disk only.
  - Feynman gate not run; package stays partial by rule.
  - merge-reviewer ran as the external adversarial review of revision 1 (CHANGES REQUESTED, 0 CRITICAL); revision 2 addresses every finding; re-review pending.

Written by scripts/write-provenance.sh at 2026-09-27T21:40:10Z from checkpoint.json and the package artifacts. A verdict here is only as good as the checkpoint the driver wrote; the driver writes it on every exit path.
