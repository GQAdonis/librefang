# AFC task model dispatch

`model-dispatch.json` covers the 29 remaining canonical AFC task IDs at the 2026-10-03 baseline: C08.2–C08.3 and C10.1–C18.3. C09 is already complete. The older `work-packages.json` status fields are planning snapshots and must not select work. `scripts/model-dispatch.mjs` reads canonical `prometheus kbd status --json`, checks the corresponding OpenSpec checkbox, and refuses a completion mismatch. It does not modify KBD, OpenSpec, Cadence, or any application source.

At every task handoff, from this directory:

```text
node scripts/model-dispatch.mjs resolve --task C10.1 --harness codex
node scripts/model-dispatch.mjs list --harness claude-code
node scripts/model-dispatch.mjs launch --task C10.1 --harness codex --prompt-file /absolute/path/to/reviewed-handoff.md
```

If `--task` is omitted, `resolve` uses KBD's active task. A fresh agent run is required to change models. The handoff must include the exact task scope, owned files, source baseline, dependency checkpoint, KBD/OpenSpec paths, and the completed-delivery integration boundary. Do not feed a task to an already running agent at a different model and call it routed. `--exact-model` launches Codex with the preferred model when a native alternative would not satisfy a model-specific requirement. An operator can use a different model after recording the reason and exact selected ID in the dispatch receipt; a class label alone is insufficient.

| Work class | Preferred Codex model | Claude Code native | OpenCode catalog candidate | Kimi Code native | DeepSeek Harness |
| --- | --- | --- | --- | --- | --- |
| Architecture, authority, ambiguous cross-project decisions | `gpt-6-astra` | `opus` | `github-copilot/gpt-6-astra` | External Codex agent | External Codex agent |
| Complete feature implementation | `gpt-6.1-sol` | `sonnet` | `github-copilot/gpt-6.1-sol` | `kimi-code/k3` | External Codex agent |
| Bounded documentation | `gpt-6-luna` | `haiku` | `github-copilot/gpt-6-luna` | `kimi-code/k3` | External Codex agent |

These are dispatch preferences, not proven quality equivalence or account entitlement. The OpenCode candidates appeared in `opencode models` on 2026-10-03; model listing alone does not establish authentication or inference. The selected CLI may reject a route. Record that failure and re-resolve with `--exact-model`, or use a reviewed alternative; never silently switch. The installed DeepSeek `dsh` entrypoint failed before its own help text because its pnpm version constraint conflicts with the active Corepack pnpm. Until repaired and a real model/tool run is observed, this policy selects an external Codex agent rather than claiming native DeepSeek dispatch. Kimi's configured `k3` alias is a native candidate; high-risk architecture work goes to the external agent. Claude Code supports `--model` and model aliases in agent definitions; the command uses a fresh `--print` run. OpenCode uses `run --model provider/model`; Kimi uses `--model` and `--prompt`. No unsupported per-member DeepSeek flag is assumed.

The local `ai.prometheus.liter-llm-api` macOS LaunchAgent was running at assessment. Its current config serves `gpt-6.1-sol` and several other aliases, but not every preferred model. On macOS, inspect `launchctl list` for that label before depending on the gateway. On other hosts, check that host's managed service. The gateway config must be passed explicitly to `liter-llm api --config <absolute-path>` or `liter-llm mcp --transport stdio --config <absolute-path>`; the normal config path on this Mac is `~/.config/liter-llm/liter-llm-proxy.toml`. Do not copy secrets into this repository or command arguments. A healthy process and `/v1/models` listing are not an inference or tool-use proof.

Use liter-llm's MCP `chat` tool for a bounded delegated reasoning or critic call when the desired served alias is available and the tool's output can be handed back to the owning coding agent. It does **not** replace that agent's file/tool loop. The gateway's OpenAI-compatible chat path must not be assumed to preserve reasoning-model tool calling; the preferred OpenAI models require a verified Responses tool path for that use. If the best model is not native to the current harness, launch the external Codex agent with the reviewed handoff, or use a verified tool-capable provider route. Do not route an entire implementation through gateway chat merely because its model name is listed. A failed or unavailable gateway never changes the required task class or silently advances KBD.

Source documentation checked on 2026-10-03: [OpenAI model selection](https://developers.openai.com/api/docs/models), [Claude Code model configuration](https://github.com/anthropics/claude-code/blob/main/plugins/plugin-dev/skills/command-development/SKILL.md), [OpenCode provider configuration](https://github.com/anomalyco/opencode/blob/dev/packages/web/src/content/docs/providers.mdx), [Kimi CLI options](https://github.com/moonshotai/kimi-code/blob/main/docs/en/reference/kimi-command.md), and [DeepSeek Harness model configuration](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/config-catalog.zh.md). Refresh installed CLI help and model catalogs before changing the bindings.
