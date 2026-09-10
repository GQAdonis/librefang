#!/usr/bin/env bash
# Regression test for the `.kbd-orchestrator/` exception in
# .claude/hooks/forbid-main-worktree.sh.
#
# The hook refuses Edit/Write whose target lives in the librefang MAIN
# worktree, because source edits there collide with the user's other
# sessions on the shared target/ dir. KBD orchestrator state is the one
# documented exception: `.gitattributes` pins `.kbd-orchestrator/**` to
# `merge=ours` so every clone keeps its own copy, which only works if the
# files can actually be written in the main tree.
#
# Strategy: build throwaway git repos whose basename ends in `librefang`
# (the hook only arms inside `*/librefang`), then feed the hook the
# PreToolUse JSON protocol on stdin and assert the exit code.
#
#   exit 2 = denied, exit 0 = allowed.
#
# Cases:
#   1. Write to .kbd-orchestrator/project.json in MAIN     -> allowed (the fix)
#   2. Write to crates/foo.rs in MAIN                      -> denied (guard intact)
#   3. Write to a path merely CONTAINING the segment       -> denied (no glob leak)
#   4. Write to .kbd-orchestrator/ in a LINKED worktree    -> allowed (unchanged)

set -euo pipefail

REPO_ROOT="$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
HOOK="$REPO_ROOT/.claude/hooks/forbid-main-worktree.sh"
test -x "$HOOK" || chmod +x "$HOOK"

# Resolve symlinks in the temp root. On macOS `mktemp -d` hands back
# /var/folders/... while /var is a symlink to /private/var. The hook derives
# $repo_root via `cd … && pwd -P`, which resolves that symlink, so an
# unresolved path here would never match the hook's own comparisons and the
# test would fail on macOS while passing on Linux.
WORK="$(cd "$(mktemp -d)" && pwd -P)"
trap 'rm -rf "$WORK"' EXIT

# The hook arms only when the repo root matches `*/librefang`.
MAIN="$WORK/librefang"
mkdir -p "$MAIN"
git -C "$MAIN" init -q
git -C "$MAIN" config user.email test@librefang.local
git -C "$MAIN" config user.name test
git -C "$MAIN" config commit.gpgsign false
mkdir -p "$MAIN/.kbd-orchestrator" "$MAIN/crates"

# A linked worktree, to prove the exception didn't disturb the normal path.
git -C "$MAIN" commit -q --allow-empty -m init
LINKED="$WORK/librefang-feature"
git -C "$MAIN" worktree add -q -b feature "$LINKED" >/dev/null 2>&1
mkdir -p "$LINKED/.kbd-orchestrator"

fail=0

# run_case <description> <expected-rc> <cwd> <file_path>
run_case() {
    local desc="$1" want="$2" cwd="$3" fp="$4"
    local payload rc
    payload="$(python3 -c '
import json, sys
print(json.dumps({
    "cwd": sys.argv[1],
    "tool_name": "Write",
    "tool_input": {"file_path": sys.argv[2]},
}))' "$cwd" "$fp")"

    set +e
    printf '%s' "$payload" | "$HOOK" >/dev/null 2>&1
    rc=$?
    set -e

    if [ "$rc" -ne "$want" ]; then
        echo "FAIL: $desc" >&2
        echo "      path:     $fp" >&2
        echo "      expected: exit $want, got exit $rc" >&2
        fail=1
    else
        echo "PASS: $desc"
    fi
}

# 1. The fix: orchestrator state is writable in the main worktree.
run_case "main worktree .kbd-orchestrator/ write is allowed" \
    0 "$MAIN" "$MAIN/.kbd-orchestrator/project.json"

# 2. The guard still bites for ordinary source files in the main worktree.
run_case "main worktree source write is still refused" \
    2 "$MAIN" "$MAIN/crates/foo.rs"

# 3. The exception is anchored at the repo root, so a path that merely
#    contains the segment must NOT be allowed through.
#
#    The directory has to exist for this to test what it claims: the hook
#    resolves the target's dirname via `cd`, and a nonexistent dir makes
#    detect_git yield nothing, so the hook exits 0 (allow) before ever
#    reaching the exception glob — a false pass that hides a glob leak.
mkdir -p "$MAIN/crates/.kbd-orchestrator"
run_case "path merely containing .kbd-orchestrator is still refused" \
    2 "$MAIN" "$MAIN/crates/.kbd-orchestrator/evil.rs"

# 4. Linked worktrees were always allowed; confirm that is untouched.
run_case "linked worktree write is allowed" \
    0 "$LINKED" "$LINKED/.kbd-orchestrator/project.json"

if [ "$fail" -ne 0 ]; then
    echo "forbid-main-worktree KBD exception: FAILED" >&2
    exit 1
fi

echo "forbid-main-worktree KBD exception: all cases passed"
