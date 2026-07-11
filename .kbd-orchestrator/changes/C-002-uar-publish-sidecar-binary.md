# Change C-002 — [UPSTREAM] Build and publish the `uar-sidecar` binary

**Phase:** phase-10-uar-sidecar-availability
**Status:** SPECCED
**Repo:** `GQAdonis/universal-agent-runtime` — **not librefang**
**Depends on:** nothing
**Blocks:** C-004, C-006, C-007, C-008 (everything that spawns UAR)

## Why

UAR declares two binary targets:

```toml
[[bin]] name = "universal-agent-runtime"   path = "src/main.rs"
[[bin]] name = "uar-sidecar"               path = "src/bin/uar-sidecar.rs"
```

`uar-sidecar` is the one librefang intends to spawn — it is purpose-built for
supervision (binds `127.0.0.1:0`, emits `READY:{port}` on stdout, exits on stdin EOF).

**But it is never built or published.**

- `grep -c uar-sidecar .github/workflows/release.yml` → **0**
- `Dockerfile:225` builds only `--bin universal-agent-runtime`
- the release matrix ships only `universal-agent-runtime-{linux-x64,macos-x64,macos-arm64,windows-x64.exe}`

So the binary librefang plans to execute does not exist as a shipped artifact. This is the
hard blocker for the whole phase: without it there is nothing to `COPY --from`, nothing to
resolve, and nothing to spawn.

## Scope

Additive change to UAR's build + release pipeline. **No UAR source changes** —
`src/bin/uar-sidecar.rs` already exists and works.

## Tasks

1. **Dockerfile** — add `--bin uar-sidecar` to the cargo build (alongside
   `--bin universal-agent-runtime`), and `COPY` the resulting binary into the final image
   next to the server binary (`/usr/local/bin/uar-sidecar`).
2. **release.yml** — add `uar-sidecar` to the release artifact matrix so the binary is
   attached to UAR releases for each target.
3. **Determine the runtime asset set.** The image ships `/opt/uar/{static,skills,models}`
   (`Dockerfile:265-267`). Establish which of these `uar-sidecar` actually needs at run
   time, and document it — this directly determines what C-004 must copy and how much the
   BossFang image grows. **Do not guess; run the binary and find out.**
4. Cut a release / image tag that librefang can pin.

## Acceptance criteria

- The published UAR image contains an executable `uar-sidecar`.
- Running it prints exactly one `READY:<port>` line on stdout and then serves; closing its
  stdin terminates it cleanly with exit 0.
- `GET http://127.0.0.1:<port>/healthz` returns success against the spawned process.
- The runtime asset requirement (task 3) is written down.

## Known risk — do not paper over

UAR's own `release.yml:160` describes the cross-platform prebuilt binaries as
*"an aspirational extra whose toolchain..."* — i.e. the macOS/Windows targets may not build
reliably.

**This does not block the reported bug.** The cloud/Linux path takes the binary from the
container image, not the release matrix. But it *does* gate desktop/local support, so:
verify the non-Linux targets actually produce a working `uar-sidecar` before anyone
promises local support. If they do not, say so and scope v1 to Linux/container.

## Verification

```bash
docker run --rm -it <uar-image>:<tag> sh -c 'command -v uar-sidecar && uar-sidecar' # expect READY:<port>
```
Then, from another shell in the same container, curl `/healthz` on the reported port.
