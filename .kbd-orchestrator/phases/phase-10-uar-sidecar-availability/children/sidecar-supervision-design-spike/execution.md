# EXECUTION: sidecar-supervision-design-spike

Project: BossFang
Date: 2026-07-31
Selected backend: native-tool
Dispatched to: Codex (self)
Backend rationale: One bounded two-file Rust correction in an existing worktree; no separate spec backend or agent handoff is needed.
Backend entrypoint: `/kbd-execute sidecar-supervision-design-spike C-SPK-001`
OpenSpec available: YES; deliberately not selected because phase-10 is pinned to native-kbd.
Source plan: `plan.md`

## Execution scope

- C-SPK-001: make supervision policy deterministic at the readiness boundary.

## Dispatch contract

- C-SPK-001 → Codex (self)
  - Model class: medium
  - Concrete model: inherited current Codex model; project registry has no local medium model, so current frontier execution is retained rather than silently downgrading.
  - Model rationale: two files, one existing module boundary, and no new dependency or subsystem.
  - Progress projection: `progress.json`
  - Change spec: `changes/C-SPK-001/change.md`

## Approval gates

- None. Source writes are explicitly allowed by `scope.json`.

## Fallback conditions

- Fall back to a dedicated OpenSpec follow-up only if implementation requires a third source module, public API change outside `librefang-channels`, or upstream UAR modification.

## Verification requirements

- All commands and acceptance criteria in `plan.md`.
- Artifact-refiner and diff adversarial gates are skipped by their documented heuristic because the change modifies fewer than three source files; artifact-stage adversarial reviews remain recorded.

## Progress ledger

- [DONE] C-SPK-001 — Codex

## Outputs

- Deterministic policy contract and tests in `crates/librefang-channels/src/sidecar.rs`.
- Focused UAR adapter/test correction in `crates/librefang-channels/src/uar_sidecar.rs`.

## Blockers

- Canonical typed KBD transitions are unavailable: after local migration initialized the runtime, the configured control plane returned `404 unknown KBD project`. The migration was restored from its automatic backup; the supported legacy child ledger records C-SPK-001 complete and child exit restored the parent at 5/8.
- Full-workspace clippy reproduced the already-confirmed unchanged `crates/librefang-kernel-handle/src/test_stub.rs` origin/main mismatch. Both that file and `knowledge_graph.rs` are byte-for-byte unchanged from `origin/main` at `ad3b34b16b248db999db6760a70ec3067e494a23`; scoped changed-crate clippy passed.

## Reflection handoff

Compare the previous process/wall-clock retry-cap test with the new in-memory contract; record whether ready uptime is measured at the correct semantic boundary and whether repeated process tests remain stable.

## Execution ready
