#!/usr/bin/env bash
# scan-new-schema.sh — Phase 3a of the librefang-upstream-merge skill.
#
# Greps the merge diff for new upstream SQLite schema. Each hit needs
# a matching SurrealDB migration; see references/surrealdb-migrations.md.
#
# Usage:
#   scan-new-schema.sh                 # mid-merge: staged result vs HEAD; otherwise HEAD^..HEAD
#   scan-new-schema.sh <ref>           # diffs <ref>..HEAD (e.g. the pre-merge HEAD)
#
# Exit codes:
#   0 — no new schema (no .surql migration needed)
#   1 — new schema detected; manual review required

set -euo pipefail

# Mid-merge (MERGE_HEAD present, nothing committed yet) `HEAD^..HEAD` is the
# wrong range: it diffs the pre-merge branch against its own parent and reports
# a false "ok". Scan what the merge brings into the fork's tree instead — the
# staged merge result against the pre-merge HEAD.
if [ -z "${1:-}" ] && git rev-parse --quiet --verify MERGE_HEAD >/dev/null 2>&1; then
  base="HEAD"
  range=(--cached HEAD)
  label="staged merge result (index vs pre-merge HEAD)"
else
  base="${1:-HEAD^}"
  range=("$base..HEAD")
  label="$base..HEAD"
fi

if ! git rev-parse --quiet --verify "$base" >/dev/null 2>&1; then
  echo "[scan-new-schema] FAIL: base ref '$base' does not exist" >&2
  exit 1
fi

echo "[scan-new-schema] scanning $label for new SQLite schema..."

# Grep for schema-defining statements in the additions of the diff.
# `git diff --unified=0` keeps context low; `^+` matches added lines.
hits="$(git diff --unified=0 "${range[@]}" -- '*.rs' '*.sql' 2>/dev/null \
  | grep -E '^\+[^+].*(CREATE TABLE|ALTER TABLE|ADD COLUMN|CREATE INDEX|CREATE UNIQUE INDEX)' \
  || true)"

if [ -z "$hits" ]; then
  echo "[scan-new-schema] ok: no new schema detected — zero SurrealDB migrations required"
  exit 0
fi

# Find which files contain the hits.
files="$(git diff --name-only "${range[@]}" -- '*.rs' '*.sql' 2>/dev/null \
  | while read -r f; do
      if git diff --unified=0 "${range[@]}" -- "$f" 2>/dev/null \
         | grep -qE '^\+[^+].*(CREATE TABLE|ALTER TABLE|ADD COLUMN|CREATE INDEX|CREATE UNIQUE INDEX)'; then
        echo "$f"
      fi
    done)"

echo "[scan-new-schema] WARNING: new schema detected in:"
echo "$files" | sed 's/^/  /'
echo
echo "[scan-new-schema] schema statements:"
echo "$hits" | head -50 | sed 's/^/  /'
echo
echo "[scan-new-schema] action required:"
echo "  For each schema change above, add a .surql migration:"
echo "    1. crates/librefang-storage/src/migrations/sql/NNN_<name>.surql"
echo "    2. Register in crates/librefang-storage/src/migrations/mod.rs"
echo "    3. See references/surrealdb-migrations.md for the full playbook"
exit 1
