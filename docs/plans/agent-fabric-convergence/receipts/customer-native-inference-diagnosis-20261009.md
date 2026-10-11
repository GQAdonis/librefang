# Public 2.2.25 native inference: observed failure diagnosis

Date: 2026-10-09. Owner: boss-core desktop/providers. This is preparation and diagnosis, not passing operation evidence.

## Fixed candidate and operation

- Boss source: `35eff8c8c40555a4a464ee03b7305bcc4949666b`.
- Public ASAR: `333d6396efd74fd3a9c0dabeaaa191d0b23ed53628a9e618338a055622bd2a1c`.
- Native UAR: `31c2449c2c2d36a8335e406bf1dde67b28dc328e2560e3ce71f45985ef664716`.
- Failed operation: `.prometheus/cadence/artifacts/customer-public-mac-2.2.25/work-inference-892cad76-a589-4fb0-881c-1693e2446adf/evidence.json`.
- Read-only diagnosis inspected only the assistant message belonging to each recorded isolated session. It did not print auth configuration, full message rows, stacks, credentials, or unrelated conversations; it modified neither database.

## Codex: incompatible selected model

The operation admitted the `pi` runtime, selected `openai-codex::gpt-5.4-mini`, streamed two chunks, and persisted an assistant error with that exact provider/model identity. Its persisted error was:

> The 'gpt-5.4-mini' model is not supported when using Codex with a ChatGPT account.

The provider returned HTTP 400. The structured failure names the provider layer and is not retryable. This establishes a subscription/model incompatibility, not an expired-token finding or a reason to substitute API billing.

The exact public installer's `Contents/Resources/provider-registry/provider-models.json` contains the `openai-codex` model override `gpt-6-1-sol` with literal API model ID `gpt-6.1-sol`. The original user's database, opened read-only, already enables `openai-codex::gpt-6.1-sol`. The failed-only driver may therefore request that known catalog model explicitly. The existing imported mini model otherwise wins the driver's persisted-row selection.

The runner now accepts `--execute --routes codex`; root owns the sole application-operation slot. Set `BOSS_CUSTOMER_CODEX_MODEL` to `openai-codex::gpt-6.1-sol` for this affected-only operation. The scenario still resolves/imports the exact existing catalog model through supported application routes. It does not invent a model, change the real profile, bypass subscription authorization, or reuse the gateway.

## Claude: actual authentication unavailable

The operation admitted `claude-code`, selected `claude-code::claude-fable-5`, streamed six chunks, and persisted this runtime error:

> Not logged in · Please run /login

The structured failure reason is `auth`, source layer `runtime`, and not retryable. `oauth.check_external_login` returned true because the existing Mac implementation checks only that the base `Claude Code-credentials` Keychain item exists. Its source explicitly describes this as a best-effort presence hint; it does not validate a usable subscription login.

Current [Claude credential documentation](https://code.claude.com/docs/en/authentication) says a configured `CLAUDE_CONFIG_DIR` also keys the macOS Keychain entry to that directory, and that Keychain write failures may create a private credentials-file fallback. Current [troubleshooting documentation](https://code.claude.com/docs/en/troubleshoot-install) identifies missing/expired saved login as a reason to sign in again. Context7 fetched these primary sources during diagnosis.

No `CLAUDE_CONFIG_DIR` assignment was found in this process or literal assignments in `.bash_profile`, `.bashrc`, `.zprofile`, or `.zshrc`. That does **not** prove every shell/environment setting is absent; it prevents claiming a directory mismatch as the observed root cause. The operation establishes that the bundled runtime cannot authenticate using the currently available saved login. Token expiry, credential-store contents, and whether a renewed login repairs it remain unconfirmed.

The exact bundled native CLI's `auth --help` and `auth status --help` documented the read-only `auth status --json` command. That command was run without forced credentials against both the public installer's bundled SDK binary and the current shell's Claude binary. Both returned exit 1, `loggedIn: false`, `authMethod: none`, and `/Users/gqadonis/.claude` as their configuration directory. Only those non-secret fields were retained. This confirms that native sign-in is unavailable to both binaries in the same native environment; it does not establish a Boss-only environment defect.

Leave Claude qualification pending until its real native subscription login is usable. Interactive native sign-in is needed. Do not repeat the same known authentication failure, switch to API-key billing, or present gateway inference as Claude subscription evidence. Model choice is not the demonstrated cause of this attempt.

## Narrow evidence-driver changes

The scenario now records a whitelist of the two observed safe persisted error messages, numeric status, structured reason/layer, retryability, and a digest of the original message. Unknown message text, stacks, error objects, and credentials remain withheld. This addresses the observed loss of error information in the first evidence receipt.

The runner adds explicit failed-route selection so Codex can be operated independently while Claude authentication remains pending. Existing passing UAR evidence stays linked against matching public source and binary hashes; UAR is not repeated. The separate `customer-native-inference-failure-diagnosis-20261009.json` receipt records the safe persisted errors and read-only CLI status. No production source, package, dependency, build, suite, or new application launch was changed/performed by this diagnosis work.

## Later evidence and corrected attribution

The preceding diagnosis is retained as the initial observation, not the current disposition. Subsequent read-only comparison after the operator confirmed sign-in isolated the launch environment: preserving the existing `USER` alone restored authenticated native CLI status; `LOGNAME` or `SHELL` alone did not. The earlier flag-specific suspicion was confounded by the missing identity and was rejected. See [post-login diagnosis](customer-native-inference-post-login-diagnosis-20261009.json).

The affected-only public operations now pass independently: [Codex operation](customer-public-mac-2.2.25-codex-inference-20261009-operation.json) streamed six chunks through `pi` with `gpt-6.1-sol`; [Claude operation](customer-public-mac-2.2.25-claude-inference-20261009-operation.json) streamed ten chunks through `claude-code` with `claude-fable-5`. Both persisted their exact requested replies and model identities. Prior failures remain preserved. UAR was not repeated, credentials were not copied to fix Claude, and no application auth implementation was altered. The two matching full/mini Cadence launcher corrections preserve only `USER`. This does not qualify cancellation, follow-up or native Windows operations.
