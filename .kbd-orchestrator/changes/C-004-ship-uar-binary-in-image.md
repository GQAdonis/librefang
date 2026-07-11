# Change C-004 — Ship the UAR binary in the BossFang image and release tarball

**Phase:** phase-10-uar-sidecar-availability
**Status:** SPECCED
**Depends on:** C-002 (UAR must publish `uar-sidecar` first)
**Files to touch:** `Dockerfile`, `.github/workflows/release*.yml`
**Closes:** G-1

## Why

The reported bug in one sentence: **the binary was never in the image.** `Dockerfile:178`
links UAR in-process as a library and the runtime stage copies only
`/usr/local/bin/librefang`. No `universal-agent-runtime` or `uar-sidecar` executable is
ever produced or copied.

C-003 makes librefang look next to its own executable first. This change puts the binary
there, so that lookup succeeds. Together they make `PATH` irrelevant.

## Scope

Adopt UAR's **already-published image** rather than building UAR from source in librefang's
Dockerfile. Building it here would drag UAR's `build.rs` (network `models.dev` fetch + pnpm
frontend) back into librefang's hot build path — exactly the cost the sidecar migration
exists to shed.

## Tasks

1. **Dockerfile** — add a multi-stage copy from the pinned UAR image:
   ```dockerfile
   COPY --from=<uar-image>:<pinned-tag> /usr/local/bin/uar-sidecar /usr/local/bin/uar-sidecar
   ```
   It lands beside `/usr/local/bin/librefang`, so C-003's step-1 (`current_exe()` sibling)
   resolves it with no `PATH` entry.
2. **Runtime assets.** Copy whichever of `/opt/uar/{static,skills,models}` C-002's task 3
   established as actually required. **Copy only what is needed** — do not blanket-copy.
3. **Pin the UAR image by tag**, not `latest`. Record the tag in one place so a bump is a
   single-line change.
4. **Release tarball** — ship `uar-sidecar` alongside the `librefang` binary, the same way
   the Telegram sidecar does (#5936), so `librefang update` installs it into
   `~/.librefang/bin/` (C-003's step-2 fallback). Gate on C-002's cross-platform risk: if
   UAR's non-Linux targets do not build, ship Linux only and **say so** rather than
   shipping a broken tarball.
5. **CI guard.** Add a check asserting `uar-sidecar` is present and executable in the built
   image. Without this, a silent regression in the `COPY` line reintroduces the original
   bug and nobody notices until production.

## Acceptance criteria

- `docker run --rm <bossfang-image> sh -c 'test -x /usr/local/bin/uar-sidecar'` → exit 0.
- The binary sits in the **same directory** as `librefang`, so C-003's first candidate hits.
- Image-size delta is measured and recorded (see risk below).
- CI fails if the binary is missing from the image.

## Risk — image size

Baking UAR's binary plus its model/static assets into the BossFang image grows it, possibly
a lot. **Measure before committing.** If the models directory is large, do not silently
accept a multi-GB image: raise it, and consider a first-run fetch or a shared volume
instead.

Record the actual before/after size in this file when the change lands. Do not skip this
because it is inconvenient.

## Verification

```bash
docker build -t bossfang:c004-test .
docker run --rm bossfang:c004-test sh -c 'test -x /usr/local/bin/uar-sidecar && echo ok'
docker images bossfang:c004-test --format '{{.Size}}'   # compare against the pre-change image
```
