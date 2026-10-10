Adds usable controls for represented UAR execution: submit a turn to a durable instance, inspect its actual scoped run output, and decide its pending native approval. Applied grant identity, revision and authority are visible. Ownership checks bind each request to the exact workspace, instance, command and run; existing runs and portable definitions retain their boundaries.

The public 2.2.25 representation journey exposed rejected grant attachment and missing turn/output controls. The corresponding UAR repair is [PR #367](https://github.com/Prometheus-AGS/universal-agent-runtime/pull/367). This branch pins that corrected runtime at `1522f17944aec1e1a7db5eab3b647e732fc1a07f` and advances the application to 2.2.26. Updated mini/full payload pins include the Claude launch-environment repair. All thirteen locale catalogs contain the added labels; shared IPC contracts remain typed and scoped.

Also preserves the earlier external operation-driver correction: compare the complete UI-normalized optional skill reference rather than its raw catalog default. Generated OpenSpec 1.14.1 Kimi/OpenCode instructions and current main release metadata remain incorporated.

Validation: the failures were observed in the installed public 2.2.25 application. The complete corrective native build is in progress; the actual local Mac ARM64 installer build and affected packaged operations follow it. No unit, per-edit or broad test suites ran. Passing historical Codex, Claude, mixed-team, dashboard and feedback receipts retain their actual source revisions; they are not relabeled as 2.2.26 acceptance. Native Windows operation and final operator acceptance remain pending.

Unrelated `build/payload-2.2.25/` and `resources/convergence-supported-profile.json` files are preserved outside this change.

```release-note
Adds durable UAR turn, output and approval controls and packages corrected representation grants, persisted native-tool startup settings and team resilience configuration.
```
