#!/usr/bin/env bash
# audit-tauri-desktop.sh — Phase 3c of the librefang-upstream-merge skill.
#
# Verifies that the four Tauri configs, the minisign pubkey, the macOS CLI code-signing identifiers and the Play package name survived the merge unchanged.
# See references/tauri-desktop-checklist.md for fixes when a check fails.
#
# Exit codes:
#   0 — all checks pass
#   1 — one or more checks failed; specifics on stderr

set -euo pipefail

toplevel="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
desktop="$toplevel/crates/librefang-desktop"

fail_count=0

fail() { echo "[tauri-audit] FAIL: $*" >&2; fail_count=$(( fail_count + 1 )); }
ok()   { echo "[tauri-audit] ok:   $*"; }

# Sanity check: the desktop crate must exist.
if [ ! -d "$desktop" ]; then
  fail "$desktop missing — is this a librefang fork worktree?"
  exit 1
fi

# Helper: extract a JSON top-level key value (Python avoids a jq dep).
json_field() {
  local file="$1" key="$2"
  python3 -c "import json,sys; print(json.load(open('$file')).get('$key',''))" 2>/dev/null
}

# 1a. tauri.conf.json — productName
val="$(json_field "$desktop/tauri.conf.json" productName)"
if [ "$val" = "BossFang" ]; then
  ok "tauri.conf.json productName = BossFang"
else
  fail "tauri.conf.json productName = '$val' (expected 'BossFang')"
fi

# 1b. tauri.conf.json — identifier
val="$(json_field "$desktop/tauri.conf.json" identifier)"
if [ "$val" = "ai.bossfang.desktop" ]; then
  ok "tauri.conf.json identifier = ai.bossfang.desktop"
else
  fail "tauri.conf.json identifier = '$val' (expected 'ai.bossfang.desktop')"
fi

# Upstream #6283 consolidated the desktop updater plugin config INTO
# tauri.conf.json and deleted the standalone tauri.desktop.conf.json. The
# updater endpoint + pubkey now live under tauri.conf.json `plugins.updater`,
# so checks 2b/2c read from there. (Identifier is already covered by 1b.)
UPDATER_CONF="$desktop/tauri.conf.json"
if [ -f "$desktop/tauri.desktop.conf.json" ]; then
  # Legacy split layout still present — prefer it for back-compat.
  UPDATER_CONF="$desktop/tauri.desktop.conf.json"
fi

# 2b. updater endpoint host (consolidated into tauri.conf.json since #6283)
endpoint="$(python3 -c "
import json
d=json.load(open('$UPDATER_CONF'))
print(d.get('plugins',{}).get('updater',{}).get('endpoints',[''])[0])
" 2>/dev/null)"
case "$endpoint" in
  https://github.com/GQAdonis/librefang/*) ok "updater endpoint → $endpoint" ;;
  '') fail "updater endpoint missing or unreadable in $(basename "$UPDATER_CONF")" ;;
  *) fail "updater endpoint → $endpoint (expected github.com/GQAdonis/librefang/...)" ;;
esac

# 2c. updater pubkey key ID
pubkey_b64="$(python3 -c "
import json
d=json.load(open('$UPDATER_CONF'))
print(d.get('plugins',{}).get('updater',{}).get('pubkey',''))
" 2>/dev/null)"
if [ -n "$pubkey_b64" ]; then
  decoded="$(echo "$pubkey_b64" | base64 -d 2>/dev/null | head -1 || true)"
  case "$decoded" in
    *E329A6B2863F1707*) ok "Tauri minisign key ID = E329A6B2863F1707 (BossFang)" ;;
    *BC91908BD3F1520D*) fail "Tauri minisign key ID is BC91908BD3F1520D (UPSTREAM key — must rotate to BossFang E329A6B2863F1707)" ;;
    *) fail "Tauri minisign key ID unrecognised: '$decoded'" ;;
  esac
else
  fail "Tauri pubkey field missing or empty"
fi

# 3. tauri.ios.conf.json — identifier
if [ -f "$desktop/tauri.ios.conf.json" ]; then
  val="$(json_field "$desktop/tauri.ios.conf.json" identifier)"
  if [ "$val" = "ai.bossfang.app" ]; then
    ok "tauri.ios.conf.json identifier = ai.bossfang.app"
  else
    fail "tauri.ios.conf.json identifier = '$val' (expected 'ai.bossfang.app')"
  fi
fi

# 4. tauri.android.conf.json — identifier
if [ -f "$desktop/tauri.android.conf.json" ]; then
  val="$(json_field "$desktop/tauri.android.conf.json" identifier)"
  if [ "$val" = "ai.bossfang.app" ]; then
    ok "tauri.android.conf.json identifier = ai.bossfang.app"
  else
    fail "tauri.android.conf.json identifier = '$val' (expected 'ai.bossfang.app')"
  fi
fi

# 5. Icons — confirm files are present (size > 0). We can't easily verify
# they're the BossFang artwork without a hash baseline, but we can spot
# upstream overwriting them with a 0-byte / placeholder.
for icon in icon.png icon.ico 32x32.png 128x128.png "128x128@2x.png"; do
  path="$desktop/icons/$icon"
  if [ ! -f "$path" ]; then
    fail "icons/$icon missing"
    continue
  fi
  size="$(stat -f%z "$path" 2>/dev/null || stat -c%s "$path" 2>/dev/null || echo 0)"
  if [ "$size" -lt 100 ]; then
    fail "icons/$icon suspiciously small ($size bytes) — verify it's the BossFang artwork"
  else
    ok "icons/$icon present (${size} bytes)"
  fi
done

# 6. macOS CLI code-signing identity. The release workflows sign the CLI and the Telegram sidecar under `ai.bossfang.*`, and upstream's release-safety test (#8234) asserts its own `ai.librefang.*` identifiers.
# A sync takes that test as-is, so it fails CI on the fork until its expectation table is flipped (2026-09-27 sync).
# Check both sides: the workflows must sign BossFang identifiers, and the test must expect them.
workflows="$toplevel/.github/workflows"
sign_hits="$(grep -hoE '^[[:space:]]*sign .* ai\.[a-z]+\.[a-z-]+[[:space:]]*$' "$workflows/release.yml" "$workflows/release-cli.yml" 2>/dev/null | awk '{print $NF}' | sort -u || true)"
if [ -z "$sign_hits" ]; then
  fail "no macOS codesign identifiers found in release.yml / release-cli.yml"
elif echo "$sign_hits" | grep -qv '^ai\.bossfang\.'; then
  fail "release workflows sign non-BossFang identifiers: $(echo "$sign_hits" | grep -v '^ai\.bossfang\.' | tr '\n' ' ')"
else
  ok "release workflows sign only ai.bossfang.* ($(echo "$sign_hits" | tr '\n' ' '))"
fi
# The Play upload's packageName must be the Android bundle identifier, or every upload is rejected (and silently, since the step is continue-on-error).
# Accept either the derived form (read from tauri.android.conf.json in the play_gate step) or a literal equal to that identifier.
android_id="$(json_field "$desktop/tauri.android.conf.json" identifier)"
play_pkg="$(grep -E '^[[:space:]]*packageName:' "$workflows/release.yml" 2>/dev/null | head -1 | sed -E 's/^[[:space:]]*packageName:[[:space:]]*//; s/[[:space:]]+$//' || true)"
case "$play_pkg" in
  '') fail "release.yml Play upload has no packageName" ;;
  *steps.play_gate.outputs.package_name*)
    if grep -qF 'jq -r .identifier crates/librefang-desktop/tauri.android.conf.json' "$workflows/release.yml"; then
      ok "release.yml Play packageName derived from tauri.android.conf.json ($android_id)"
    else
      fail "release.yml Play packageName uses play_gate output but play_gate no longer reads tauri.android.conf.json"
    fi ;;
  "$android_id") ok "release.yml Play packageName = $android_id" ;;
  *) fail "release.yml Play packageName = '$play_pkg' (expected '$android_id' from tauri.android.conf.json, preferably derived)" ;;
esac
safety_test="$toplevel/scripts/tests/test_release_tag_workflow_safety.py"
if [ -f "$safety_test" ]; then
  if grep -qE '"ai\.librefang\.' "$safety_test"; then
    fail "$(basename "$safety_test") still expects ai.librefang.* identifiers — flip its expectation table to ai.bossfang.*"
  elif python3 "$safety_test" >/dev/null 2>&1; then
    ok "$(basename "$safety_test") passes"
  else
    fail "$(basename "$safety_test") fails — run it directly for the message"
  fi
fi

echo
if [ "$fail_count" -eq 0 ]; then
  echo "[tauri-audit] all checks passed"
  exit 0
else
  echo "[tauri-audit] $fail_count check(s) failed — see references/tauri-desktop-checklist.md for fixes"
  exit 1
fi
