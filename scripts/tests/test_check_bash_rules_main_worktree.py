#!/usr/bin/env python3
"""Corpus test for `git-mutation-main` in `.claude/hooks/lib/check-bash-rules.py`.

The rule keeps agent sessions from mutating the main worktree.
Its one allowed mutation is a fast-forward of main to `origin/main` (`git pull --ff-only`), which is only safe in an exact form: git lets a later `--ff`, `--no-ff`, `-s ours` or `--squash` override `--ff-only`, and a positional ref would fast-forward main onto an arbitrary branch.
The corpus also pins the tokenizer fixes that stop a newline, a comment, a glued operator (`git commit;ls`), command substitution or a global option (`git -c k=v commit`) from hiding a mutation.
"""

from __future__ import annotations

import os
import subprocess
import sys

# scripts/tests/<this file> -> repo root is three levels up.
REPO_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
LIB = os.path.join(REPO_ROOT, ".claude", "hooks", "lib", "check-bash-rules.py")
MAIN = "/home/dev/librefang"

ALLOWED = [
    "git pull --ff-only",
    "git pull --ff-only origin",
    "git pull --ff-only origin main",
    "git pull -q --ff-only origin main",
    "git pull --ff-only --prune",
    f"git -C {MAIN} pull --ff-only",
    "git pull --ff-only && git log -1",
    "git pull --ff-only 2>&1 | tail -3",
    "git pull --ff-only >/tmp/pull.log 2>&1",
    "git pull --ff-only < /dev/null",
    "git fetch origin",
    "git status; git log",
    "git log --oneline;git status",
    "git diff|cat",
    "git branch -D spent-feature",
    "echo 'git commit'",
    "grep -n 'a;b # c' notes.txt",
]

BLOCKED = [
    # Plain and rebase pulls.
    "git pull",
    "git pull --rebase",
    "git pull origin main",
    # Flags that defeat --ff-only.
    "git pull --ff-only --no-ff",
    "git pull --ff-only --ff",
    "git pull --ff-only -s ours",
    "git pull --ff-only --strategy=ours",
    "git pull --ff-only -X theirs",
    "git pull --ff-only --squash",
    "git pull --ff-only --autostash",
    "git pull --ff-only --commit",
    # Fast-forwarding main onto something other than origin/main.
    "git pull --ff-only origin feat",
    "git pull --ff-only . origin/feat",
    "git pull --ff-only upstream main",
    "git pull --ff-only $REMOTE",
    "git pull --ff-only > /tmp/x feat",
    "git pull --ff-only $(echo --no-ff)",
    "git -c pull.ff=false pull --ff-only",
    # --ff-only belonging to a different command.
    "git pull; echo --ff-only",
    "git pull\necho --ff-only",
    "git pull # --ff-only",
    "git pull\ngit -C /tmp/wt pull --ff-only",
    # Other mutations, including ones a glued operator, substitution or global option used to hide.
    "git commit -m x",
    "git commit;ls",
    "git commit&&ls",
    "git commit|cat",
    "git commit; ls",
    "echo a#; git commit",
    "x $(git commit -m a) y",
    "`git commit`",
    "(git commit)",
    "git -c user.name=x commit -m y",
    "git --no-pager commit -m y",
    "git stash pop;",
    "git fetch origin && git pull --ff-only; git merge foo",
    "git pull --ff-only && git switch x",
    "git reset --hard;ls",
]


def check(cmd: str) -> str:
    proc = subprocess.run(
        [sys.executable, LIB, "--rules", "git-mutation-main", "--cwd", MAIN, "--main-root", MAIN, "--kind", "main"],
        input=cmd,
        capture_output=True,
        text=True,
        check=True,
    )
    return proc.stdout.strip()


def main() -> int:
    failures = []
    for cmd in ALLOWED:
        msg = check(cmd)
        if msg:
            failures.append(f"expected ALLOWED, got blocked: {cmd!r} -> {msg}")
    for cmd in BLOCKED:
        if not check(cmd):
            failures.append(f"expected BLOCKED, got allowed: {cmd!r}")
    if failures:
        print("\n".join(failures))
        return 1
    print(f"OK: test_check_bash_rules_main_worktree.py ({len(ALLOWED)} allowed, {len(BLOCKED)} blocked)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
