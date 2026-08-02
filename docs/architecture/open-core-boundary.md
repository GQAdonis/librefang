# BossFang Open-Core Boundary

> **Status**: decision doc.
> No code changes here.
> This is the one-page boundary that gates upstream contribution: what BossFang contributes to LibreFang, what it keeps, and why.
>
> It complements the three-layer principle in [`bossfang-rebrand-completion.md`](./bossfang-rebrand-completion.md), which governs *naming*.
> This document governs *code ownership*.

## 1. The rule in one line

**Contribute the plumbing, keep the porcelain.**

Everything that is undifferentiated infrastructure — trait seams, storage backends, migrators — goes upstream.
Everything that expresses the commercial thesis — multi-tenant isolation, namespace provisioning, orchestration, governance, billing — stays downstream.

The boundary is drawn so a LibreFang maintainer can review and merge the upstream slice without ever seeing the proprietary slice, and without asking BossFang to detangle anything in public review.

## 2. What goes upstream

| Surface | Where it lives | Why it is safe to give away |
|---|---|---|
| Storage trait seam — `SurrealSession`, `SurrealConnectionPool`, `shared_pool` | [`librefang-storage/src/pool.rs`](../../crates/librefang-storage/src/pool.rs) | An abstraction is not a moat. The seam is also where merge conflicts concentrate, so upstreaming it *reduces* recurring cost. |
| `StorageBackendKind`, `StorageConfig` | [`librefang-storage/src/config.rs`](../../crates/librefang-storage/src/config.rs) | Backend-agnostic wiring; no commercial content. |
| Embedded SurrealDB backend (`surreal-backend` feature) | `librefang-storage` | Table stakes. It preserves LibreFang's single-binary story, which is what the maintainers actually asked for. |
| Legacy SQLite backend (`sqlite-backend` feature) | `librefang-storage` | Already upstream's own model; BossFang only made it optional. |
| Operational SQLite → SurrealDB migrator | [`librefang-storage/src/migrate/`](../../crates/librefang-storage/src/migrate/), [`migrations/`](../../crates/librefang-storage/src/migrations/) | Operational tables only. Useful to every LibreFang user; differentiating for none. |

### PR sequencing

Small, independently mergeable PRs — not one mega-PR.
This matches LibreFang's merge-first culture and lets the remote path stay downstream without appearing to withhold.

1. **PR 1** — trait seam + `StorageBackendKind::Embedded`, SQLite retained as default, SurrealDB embedded behind a feature.
   Least controversial, most obviously beneficial.
2. **PR 2** — the migrator, with receipts.
3. **PR 3** *(optional, later)* — the remote path, **only** if upstream explicitly asks for it.

Engage in-issue before opening PR 1.
Maintainers commit to responding within 7 days.

## 3. What stays proprietary

| Surface | Where it lives | Why it stays |
|---|---|---|
| Remote / multi-tenant path — `RemoteSurrealConfig`, `SurrealConnectionPool::open_remote` | [`config.rs`](../../crates/librefang-storage/src/config.rs), [`pool.rs`](../../crates/librefang-storage/src/pool.rs) | **This is the moat.** Multi-tenant namespace/database isolation is what Prometheus sells. |
| Namespace provisioning — `provision_uar_namespace`, `ProvisionReceipt` | [`librefang-storage/src/provision.rs`](../../crates/librefang-storage/src/provision.rs) | Tenant-onboarding machinery; the commercial substrate's control plane. |
| UAR integration — `librefang-uar-spec`, the `uar` LLM driver | [`crates/librefang-uar-spec/`](../../crates/librefang-uar-spec/), [`drivers/uar.rs`](../../crates/librefang-llm-drivers/src/drivers/uar.rs) | BossFang-exclusive. See §6. |
| PSP orchestration, Prometheus Fabric governance, billing / entitlement | Outside this repo | Never upstream. Billing is the item that converts everything else into revenue. |

**Do not upstream the remote path even if asked as a merge condition.**
If a maintainer makes it a condition, decline and carry the seam downstream.
The reason is the moat, not their appetite.

## 4. Why the licence makes this the right cut

LibreFang is **MIT-only**.
A single [`LICENSE`](../../LICENSE) file: *"MIT License, Copyright (c) 2024 LibreFang Contributors."*
There is no `LICENSE-APACHE`.
Apache-2.0 appears in this repo only inside the third-party dependency allow-list in [`deny.toml`](../../deny.toml) and the corresponding note in [`CONTRIBUTING.md`](../../CONTRIBUTING.md) — that is a list of licences BossFang *accepts from dependencies*, never a statement about LibreFang's own licence.

Three consequences follow, and they are the whole argument for this boundary:

- **No patent grant flows in either direction.**
  MIT is silent on patents; Apache-2.0 §3 is the licence with the express grant.
  Any defensive patent posture for Prometheus customers lives in BossFang's own distribution and contracts, not upstream.
- **Anything contributed can be taken proprietary by anyone** — including a future commercial LibreFang or a competitor.
  Acceptable for the storage plumbing, which is undifferentiated.
  Unacceptable for multi-tenant isolation.
- **No CLA and no DCO** means maintainers hold no relicensing lever.
  They cannot unilaterally relicense contributed code under restrictive terms later.
  This protects BossFang from a rug-pull on the code it upstreams, and is a point *in favour* of contributing the plumbing.

Governance is lightweight merge-first: one maintainer approval plus green CI.
Low friction, but also low protection and quick to shift — do not over-invest in the relationship as though it were a mature foundation project.

## 5. Naming and binary identity

**Decision: no rename while BossFang tracks upstream.**
The binary stays `librefang`, the crates stay `librefang-*`, the config dir stays `~/.librefang/`.

This is the *code-ownership* corollary of the Internal layer in [`bossfang-rebrand-completion.md`](./bossfang-rebrand-completion.md).

**Why.** A binary name is an operator surface — what you type in a shell, what the Dockerfile invokes, what CI calls.
It is not the brand.
The public identity is Prometheus Fabric's runtime tier with "The Boss" as the product on top, so renaming the binary buys no brand equity while paying a permanent merge tax.

**Measured cost, this repo.**
The rename surface is precisely where upstream churns hardest:

| Surface | Files referencing the name | Upstream commits, last 6 months |
|---|---|---|
| `.github/workflows/` | 25 | **400** |
| `crates/librefang-cli/Cargo.toml` (declares `[[bin]] name = "librefang"`) | 1 | **47** |
| `docs/src/` | 136 | — |
| Hardcoded `target/{release,debug}/librefang` invocations | 39 | — |

Every renamed identifier becomes a hand-resolved conflict on the fastest-moving part of the tree, forever.

**This is not a difficulty problem.**
There is no `argv[0]` self-reference and no process-name matching in daemon discovery; the `"librefang"` strings in `main.rs` are clap test fixtures.
`~/.librefang/` is already decoupled via the `BOSSFANG_HOME` / `LIBREFANG_HOME` alias pair.
The rename is mechanically cheap and strategically expensive.

**Trigger conditions to revisit** — any one of:

1. BossFang stops merging from upstream (the fork becomes a hard fork).
2. External users appear who type `librefang` and are confused.
3. The name must carry commercial trademark weight.

None hold today: the fork merged 44 upstream commits in June 2026 and is actively planning to contribute upstream, which deepens the relationship rather than severing it.

**When a rename is eventually warranted**, follow the sequence already specified in `CLAUDE.md` §2d: rename only after upstream tracking stops, ship deprecated `pub use` shims for one minor cycle, and dual-accept old config paths and headers through a deprecation window.

## 6. UAR is two things, not one

Treating them as one obscures the boundary.

- **`librefang-uar-spec`** — a `.uar.md` Markdown parser plus bidirectional `AgentArtifact` ↔ `AgentManifest` translator.
  Zero network dependencies; its own docs note it works *"without requiring a running UAR instance."*
  It is a **file-format reader**, structurally like a YAML parser.
  Consumed by [`manifest_helpers.rs`](../../crates/librefang-kernel/src/kernel/manifest_helpers.rs) and [`routes/uar.rs`](../../crates/librefang-api/src/routes/uar.rs).
- **The `uar` LLM driver** — an HTTP + SSE client against a supervised sidecar's OpenAI-compatible surface, giving `provider/model` addressing across ~142 providers.

**Neither is compiled into the workspace as an agent runtime.**
`universal-agent-runtime` is not a workspace dependency; `uar-driver` is an empty feature (`uar-driver = []`) that gates the HTTP driver only.
UAR already runs out-of-process.

This matters for the boundary: the "two agent operating systems in one address space" risk does not apply to what this repo integrates.
The driver occupies the same slot as the anthropic / openai / gemini drivers — it is a model gateway, not a peer OS.
It does not load skills, own memory, manage agent lifecycle, or sandbox.

Both stay proprietary.
`librefang-uar-spec` is kept permanently — it has no sidecar and no operational cost, and there is no service to "connect to instead" of a file-format parser.
The driver's long-term value is re-evaluated once the `uar-sidecar-availability` work concludes and supplies real operational-cost evidence.

## 7. Known deviations to close before remote deployment

Recorded here so the boundary doc is honest about the state of the proprietary slice.

- **The pool signs in as SurrealDB `root` when the configured username is `root`.**
  [`pool.rs`](../../crates/librefang-storage/src/pool.rs) branches on `remote.username == "root"` and uses `surrealdb::opt::auth::Root`; any other username takes the namespace-scoped path.
  The in-code comment states BossFang deployments commonly point `[storage.backend]` at the root user.
  SurrealDB's own guidance is to *"create users at the lowest level possible and with the minimum role."*
  Provisioning already creates an `EDITOR` user at namespace level — nothing forces normal operation to use it.
  **Rule: production `storage.backend` must not run as root.**
  Root-credentialed access stays confined to one-shot provisioning DDL.
- **`tls_skip_verify` is inert and misleadingly named.**
  When set, [`pool.rs`](../../crates/librefang-storage/src/pool.rs) emits a `tracing::warn` and proceeds with TLS verification *enabled*.
  The SurrealDB 3.0 SDK exposes no certificate bypass without vendoring the transport crate, so the field records intent it cannot honour.
  Either rename it to state that, or make setting it a hard error.
  Do not ship a remote deployment while a config field implies a bypass that does not exist.
