# Change C-001 — Make `uar-driver` genuinely opt-in

**Phase:** phase-10-uar-sidecar-availability
**Status:** SPECCED
**Depends on:** nothing — ships independently, first
**Files to touch:** `crates/librefang-kernel/Cargo.toml`, `CLAUDE.md`

## Why

`CLAUDE.md` documents `uar-driver` as *"off by default, opt-in."* **It is not.**
`crates/librefang-kernel/Cargo.toml:16` requests it unconditionally:

```toml
librefang-runtime = { path = "../librefang-runtime", features = ["uar-driver"] }
```

Cargo unions features across the graph and `librefang-cli` → `librefang-kernel` is not
feature-gated, so **every** shipped binary compiles UAR in, with no way to turn it off.

Two consequences this change removes:

1. **The surrealdb lockstep pin applies to every build.** `cargo tree -i surrealdb` shows
   `universal-agent-runtime` pins `=3.2.1` (**exact, rigid**) while `surreal-memory` pins
   `3.2.0` (**caret, flexible**). UAR is the *sole* rigid constraint. Un-forcing it means
   librefang can bump surrealdb without a coordinated three-repo change.
2. **Every build compiles UAR's whole transitive tree** (`liter-llm`, `burn`, `tonic`,
   `mimalloc`) plus a `build.rs` that fetches `models.dev` over the network and builds a
   pnpm frontend.

This is the cheapest, highest-leverage change in the phase and is independent of the
sidecar work.

## Scope

- Drop the unconditional `features = ["uar-driver"]` from the `librefang-runtime`
  dependency in `librefang-kernel/Cargo.toml`.
- Correct the `CLAUDE.md` claim so it matches reality.

**Out of scope:** deleting `UarDriver` or the `universal-agent-runtime` dependency. Per
decision D-2 the code stays in-tree, unbuilt, for one release.

## Tasks

1. Remove `features = ["uar-driver"]` from `librefang-kernel/Cargo.toml:16`.
2. Confirm nothing else force-enables it: `grep -rn 'uar-driver' crates/*/Cargo.toml`.
   The feature must appear only as (a) its definition in `librefang-llm-drivers`,
   (b) the forwarding entry in `librefang-runtime`, and (c) explicit opt-in sites.
3. Update `CLAUDE.md` — the "off by default, opt-in" line becomes true only after task 1;
   state plainly that the Docker image opts in explicitly via
   `--features telemetry,surreal-backend,uar-driver` (`Dockerfile:178`).
4. Leave `Dockerfile:178` alone. It opts in explicitly, so behaviour of the shipped image
   is unchanged by this task.

## Acceptance criteria

- `cargo tree -i surrealdb` **no longer lists `universal-agent-runtime`** in a default
  workspace build.
- `cargo tree -e features -p librefang-kernel | grep uar-driver` returns nothing.
- `cargo check --workspace --lib` clean (UAR not compiled).
- `cargo check -p librefang-llm-drivers --features uar-driver` still clean (the opt-in path
  keeps working).
- The Docker build (`--features …,uar-driver`) still compiles UAR in — behaviour of the
  released image is unchanged.

## Verification

```bash
cargo check --workspace --lib
cargo check -p librefang-llm-drivers --features uar-driver
cargo tree -i surrealdb            # universal-agent-runtime must be absent by default
python3 scripts/enforce-branding.py --check
```

Record the default-build wall-clock before and after. The expected win is large; if it is
not, say so rather than claiming it.
