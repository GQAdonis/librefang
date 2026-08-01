# Convergence decisions: C-URT-002

- Keep the OpenRaft/redb control plane; repair identity input and migration semantics rather than replacing it.
- Canonical phase IDs encode ancestry (`parent::child`) while projections retain local slugs.
- Treat annotations only after an exact leading status token; never accept prefix near-matches.
- Make the focused project explicit in both daemon environment and cwd.
- Do not apply migration until recoverable backups and the integrated binaries exist.
- Normalize `ordered_changes` when canonical `changes` is missing or empty; derive migration summaries from normalized phases, not pre-normalization heuristics.
- Do not export a global static `PROMETHEUS_CONTROL_TOKEN_FILE`; token identity is project-scoped and derived from `.prometheus/project.json`.
