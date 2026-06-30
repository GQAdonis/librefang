#!/usr/bin/env python3
"""
test_enforce_branding.py — Unit tests for the prose-mode logic added in M4
of the BossFang rebrand-completion roadmap.

Covers:
- Word-boundary regex (LibreFangKernel stays intact; bare LibreFang flips)
- Fenced code blocks (``` and ~~~) are skipped
- Inline code spans (`…`) are skipped
- TSX files have no fence/inline awareness — flipped unconditionally
- Multi-paragraph content with mixed prose / code / fences
- Idempotency (running twice changes nothing on the second pass)

Run from the repo root:
    python3 scripts/test_enforce_branding.py
"""

from __future__ import annotations

import importlib.util
import sys
import unittest
from pathlib import Path

# The script is named with a hyphen so it can't be imported by name. Load
# it directly from its file path.
_THIS_DIR = Path(__file__).resolve().parent
_SCRIPT_PATH = _THIS_DIR / "enforce-branding.py"
_SPEC = importlib.util.spec_from_file_location("enforce_branding", _SCRIPT_PATH)
assert _SPEC is not None and _SPEC.loader is not None
eb = importlib.util.module_from_spec(_SPEC)
sys.modules["enforce_branding"] = eb
_SPEC.loader.exec_module(eb)


class ProseReplacementTests(unittest.TestCase):
    def test_bare_libre_fang_flips_in_prose(self) -> None:
        self.assertEqual(
            eb.replace_prose_in_mdx("# LibreFang Docs\n"),
            "# BossFang Docs\n",
        )

    def test_layer_internal_struct_names_preserved(self) -> None:
        # Word-bounded \bLibreFang\b must not match LibreFangKernel etc.
        text = "Boots via LibreFangKernel; errors raise LibreFangError or LibreFangConfig.\n"
        self.assertEqual(eb.replace_prose_in_mdx(text), text)

    def test_inline_code_skipped(self) -> None:
        # The product-name reference inside backticks is preserved; the
        # prose reference outside is flipped.
        before = "The string `\"LibreFang Agent OS\"` shown by LibreFang.\n"
        after = "The string `\"LibreFang Agent OS\"` shown by BossFang.\n"
        self.assertEqual(eb.replace_prose_in_mdx(before), after)

    def test_fenced_code_block_skipped(self) -> None:
        # Triple-backtick fence with TOML — contents must not be touched.
        before = (
            "Configure LibreFang via TOML:\n"
            "\n"
            "```toml\n"
            'name = "LibreFang Agent OS"\n'
            "```\n"
            "\n"
            "LibreFang reads this on startup.\n"
        )
        after = (
            "Configure BossFang via TOML:\n"
            "\n"
            "```toml\n"
            'name = "LibreFang Agent OS"\n'  # untouched inside fence
            "```\n"
            "\n"
            "BossFang reads this on startup.\n"
        )
        self.assertEqual(eb.replace_prose_in_mdx(before), after)

    def test_tilde_fence_skipped(self) -> None:
        # ~~~ is also a valid Markdown fence marker.
        before = "Prose LibreFang.\n~~~\nfenced LibreFang\n~~~\nPost LibreFang.\n"
        after = "Prose BossFang.\n~~~\nfenced LibreFang\n~~~\nPost BossFang.\n"
        self.assertEqual(eb.replace_prose_in_mdx(before), after)

    def test_mixed_fence_markers_dont_close_each_other(self) -> None:
        # A ~~~ fence is not closed by a ``` line — and vice versa. This
        # protects against snippets that include the other marker.
        before = (
            "~~~\n"
            "LibreFang in tilde fence — ``` is not the close marker.\n"
            "~~~\n"
            "Prose LibreFang here.\n"
        )
        after = (
            "~~~\n"
            "LibreFang in tilde fence — ``` is not the close marker.\n"
            "~~~\n"
            "Prose BossFang here.\n"
        )
        self.assertEqual(eb.replace_prose_in_mdx(before), after)

    def test_indented_fence_recognised(self) -> None:
        # Fences inside list items are indented; the regex tolerates
        # leading whitespace.
        before = "- Item:\n   ```\n   LibreFang inside\n   ```\n   LibreFang outside\n"
        # The "outside" line is at the indent level — it's still prose,
        # so it flips. "inside" the fence stays.
        after = "- Item:\n   ```\n   LibreFang inside\n   ```\n   BossFang outside\n"
        self.assertEqual(eb.replace_prose_in_mdx(before), after)

    def test_idempotent(self) -> None:
        once = eb.replace_prose_in_mdx("LibreFang and `LibreFangKernel` examples.\n")
        twice = eb.replace_prose_in_mdx(once)
        self.assertEqual(once, twice)
        self.assertEqual(once, "BossFang and `LibreFangKernel` examples.\n")

    def test_tsx_unconditional_replacement(self) -> None:
        # No fence/inline-code awareness for TSX — straight regex replace.
        before = 'export const TITLE = "LibreFang Docs";\n'
        after = 'export const TITLE = "BossFang Docs";\n'
        self.assertEqual(eb.replace_prose_in_tsx(before), after)

    def test_tsx_preserves_struct_names(self) -> None:
        before = "import { LibreFangError } from '@librefang/sdk';\n"
        self.assertEqual(eb.replace_prose_in_tsx(before), before)


class AuditTests(unittest.TestCase):
    def test_audit_finds_prose_hit(self) -> None:
        self.assertEqual(
            eb.audit_prose_in_mdx("Header about LibreFang.\n"),
            ["LibreFang"],
        )

    def test_audit_skips_fenced_block(self) -> None:
        text = "```\nLibreFang in fence\n```\n"
        self.assertEqual(eb.audit_prose_in_mdx(text), [])

    def test_audit_skips_inline_code(self) -> None:
        text = "Inline `LibreFangKernel` only — no prose hit.\n"
        # \bLibreFang\b doesn't match inside LibreFangKernel anyway, but
        # also: inline code is skipped, so even bare LibreFang here would
        # not register.
        self.assertEqual(eb.audit_prose_in_mdx(text), [])

    def test_audit_inline_code_with_bare_libre_fang(self) -> None:
        # Bare LibreFang inside inline code is INTENTIONALLY not flagged —
        # those references document UI strings and are addressed in a
        # follow-up PR (or by changing the inline-code skipping rule
        # later).
        text = "The banner reads `LibreFang Agent OS`.\n"
        self.assertEqual(eb.audit_prose_in_mdx(text), [])


class DashboardProseTests(unittest.TestCase):
    """Tests for the Pass 3 dashboard prose scope (M8 of rebrand-cleanup).

    Dashboard .ts/.tsx files use replace_prose_in_tsx() — no fence/inline-code
    awareness needed (TypeScript has no Markdown syntax).
    """

    def test_dashboard_jsx_string_literal_flipped(self) -> None:
        # JSX-embedded string like the skillHubs.ts registry description.
        before = '      "Official LibreFang registry — curated hands, agents, MCP, providers, plugins.",\n'
        after  = '      "Official BossFang registry — curated hands, agents, MCP, providers, plugins.",\n'
        self.assertEqual(eb.replace_prose_in_tsx(before), after)

    def test_dashboard_jsx_comment_flipped(self) -> None:
        # Inline TS/TSX comment like SkillsPage.tsx line 1578.
        before = "  // FangHub is the LibreFang first-party registry — local cache, cheap\n"
        after  = "  // FangHub is the BossFang first-party registry — local cache, cheap\n"
        self.assertEqual(eb.replace_prose_in_tsx(before), after)

    def test_dashboard_multi_occurrence_per_line(self) -> None:
        # Multiple occurrences on one line all get replaced.
        before = 'const msg = "LibreFang mobile: open LibreFang and scan";\n'
        after  = 'const msg = "BossFang mobile: open BossFang and scan";\n'
        self.assertEqual(eb.replace_prose_in_tsx(before), after)

    def test_dashboard_preserves_layer_internal_in_tsx(self) -> None:
        # LibreFangError / LibreFangKernel in TS source must not be touched.
        before = "import type { LibreFangError } from '../types/LibreFangConfig';\n"
        self.assertEqual(eb.replace_prose_in_tsx(before), before)

    def test_dashboard_audit_detects_prose_hit(self) -> None:
        # audit_prose_in_tsx (called via audit_prose_file for .tsx) finds bare LibreFang.
        tsx_content = 'const label = "LibreFang role";\n'
        hits = eb.audit_prose_in_tsx(tsx_content)
        self.assertEqual(hits, ["LibreFang"])

    def test_dashboard_audit_silent_on_layer_internal(self) -> None:
        # Layer Internal symbols in TSX must not trigger the audit.
        tsx_content = "// uses LibreFangKernel underneath\n"
        self.assertEqual(eb.audit_prose_in_tsx(tsx_content), [])

    def test_dashboard_idempotent(self) -> None:
        once  = eb.replace_prose_in_tsx('const x = "LibreFang mobile app";\n')
        twice = eb.replace_prose_in_tsx(once)
        self.assertEqual(once, twice)
        self.assertEqual(once, 'const x = "BossFang mobile app";\n')


class LocaleProseTests(unittest.TestCase):
    """Tests for the Pass 4 locale prose scope.

    Locale .json files use LOCALE_NAME_RE — a separator-aware boundary that
    flips the PascalCase product name in i18n prose while leaving lowercase
    identifiers, URLs, package names, and the vnd.librefang.* media type
    untouched.
    """

    @staticmethod
    def _flip(text: str) -> str:
        return eb.LOCALE_NAME_RE.sub("BossFang", text)

    def test_product_name_in_prose_flips(self) -> None:
        before = '"help": "Agents this LibreFang instance runs."'
        after = '"help": "Agents this BossFang instance runs."'
        self.assertEqual(self._flip(before), after)

    def test_sentence_ending_period_flips(self) -> None:
        # A trailing '.' is prose punctuation, not an identifier dot.
        self.assertEqual(self._flip("point at this LibreFang."), "point at this BossFang.")
        self.assertEqual(self._flip('cap on LibreFang.\\n bullet'), 'cap on BossFang.\\n bullet')

    def test_lowercase_paths_and_crates_preserved(self) -> None:
        # Product name is PascalCase; every identifier-shaped reference is
        # lowercase, so the PascalCase anchor never touches them.
        for text in (
            "SQLite in `~/.librefang/`. Backups too.",
            "resolved from ~/.librefang/plugins/<name>",
            "Emit x-librefang-agent/session headers",
            "the librefang-api crate",
            "import from @librefang/sdk",
            "see github.com/librefang for issues",
            "media type application/vnd.librefang.agent+json",
        ):
            self.assertEqual(self._flip(text), text)

    def test_pascalcase_glued_to_separator_preserved(self) -> None:
        # Defense-in-depth: a PascalCase token fused to an identifier
        # separator is NOT a standalone product-name reference.
        for text in (
            "LibreFang/agent-os repo",
            "LibreFang-mobile package",
            "the LibreFang_SDK symbol",
            "vnd.LibreFang.agent media type",
        ):
            self.assertEqual(self._flip(text), text)

    def test_layer_internal_struct_names_preserved(self) -> None:
        # A trailing word char (the K / E) keeps the lookahead from matching,
        # so LibreFangKernel / LibreFangError are left intact.
        text = "Boots via LibreFangKernel; raises LibreFangError."
        self.assertEqual(self._flip(text), text)

    def test_locale_idempotent(self) -> None:
        once = self._flip("Open the LibreFang mobile app.")
        twice = self._flip(once)
        self.assertEqual(once, twice)
        self.assertEqual(once, "Open the BossFang mobile app.")

    def test_enforce_and_audit_locale_file(self) -> None:
        import json
        import tempfile

        with tempfile.TemporaryDirectory() as tmpdir:
            f = Path(tmpdir) / "en.json"
            f.write_text(
                json.dumps(
                    {
                        "help": "This LibreFang instance lives in ~/.librefang/.",
                        "dev": "Open the LibreFang mobile app.",
                    }
                ),
                encoding="utf-8",
            )

            # Audit flags the prose hits before the fix.
            self.assertEqual(eb.audit_locale_file(f), ["LibreFang"])

            # Enforce flips the product name, leaves ~/.librefang/ path intact.
            self.assertTrue(eb.enforce_locale_file(f))
            data = json.loads(f.read_text(encoding="utf-8"))
            self.assertIn("This BossFang instance lives in ~/.librefang/.", data["help"])
            self.assertEqual(data["dev"], "Open the BossFang mobile app.")

            # Idempotent: a second pass changes nothing and audit is clean.
            self.assertFalse(eb.enforce_locale_file(f))
            self.assertEqual(eb.audit_locale_file(f), [])


class LocaleStorageTests(unittest.TestCase):
    """Tests for the Pass 4 storage-substrate rewrite (SQLite -> SurrealDB).

    BossFang defaults to SurrealDB; upstream prose calls the default store
    SQLite. replace_locale_content() flips the proper-noun in user-visible
    prose but skips any line that declares a *sqlite* config-field key — those
    labels name the retained legacy `legacy_sqlite_path` backend field.
    """

    def test_generic_storage_prose_flips(self) -> None:
        before = '    "help": "Storage is SQLite in `~/.librefang/`. Backups too.",'
        after = '    "help": "Storage is SurrealDB in `~/.librefang/`. Backups too.",'
        self.assertEqual(eb.replace_locale_content(before), after)

    def test_sqlite_under_non_sqlite_key_flips(self) -> None:
        before = '    "budget_help": "Spend totals are persisted in SQLite; kept for audit.",'
        after = '    "budget_help": "Spend totals are persisted in SurrealDB; kept for audit.",'
        self.assertEqual(eb.replace_locale_content(before), after)

    def test_legacy_field_label_line_preserved(self) -> None:
        # Line declares a *sqlite* key — the legacy backend field label. The
        # SQLite token in its value must survive untouched.
        for line in (
            '    "fld_sqlite_path": "SQLite Path",',
            '    "desc_sqlite_path": "Path to the SQLite database file for memory storage",',
            '    "fld_sqlite_path": "SQLite 路径",',  # zh — skip is key-based, language-independent
            '    "desc_sqlite_path": "Шлях до файлу бази даних SQLite",',  # uk
        ):
            self.assertEqual(eb.replace_locale_content(line), line)

    def test_product_name_and_sqlite_on_same_line(self) -> None:
        before = '    "x": "This LibreFang instance stores in SQLite.",'
        after = '    "x": "This BossFang instance stores in SurrealDB.",'
        self.assertEqual(eb.replace_locale_content(before), after)

    def test_storage_idempotent(self) -> None:
        once = eb.replace_locale_content('"k": "data lives in SQLite."')
        twice = eb.replace_locale_content(once)
        self.assertEqual(once, twice)
        self.assertEqual(once, '"k": "data lives in SurrealDB."')

    def test_audit_flags_generic_sqlite_but_not_legacy_label(self) -> None:
        content = (
            '    "help": "Storage is SQLite here.",\n'
            '    "fld_sqlite_path": "SQLite Path",\n'
        )
        # Only the generic prose SQLite is flagged; the legacy-key line is skipped.
        self.assertEqual(eb.audit_locale_content(content), ["SQLite"])

    def test_enforce_locale_file_preserves_legacy_label(self) -> None:
        import json
        import tempfile

        with tempfile.TemporaryDirectory() as tmpdir:
            f = Path(tmpdir) / "en.json"
            # indent=2 → one key per line, mirroring the real catalog format
            # the key-aware skip relies on.
            f.write_text(
                json.dumps(
                    {
                        "memory": {"help": "Storage is SQLite in ~/.librefang/."},
                        "config": {"fld_sqlite_path": "SQLite Path"},
                    },
                    indent=2,
                ),
                encoding="utf-8",
            )

            self.assertEqual(eb.audit_locale_file(f), ["SQLite"])  # only the generic one
            self.assertTrue(eb.enforce_locale_file(f))

            data = json.loads(f.read_text(encoding="utf-8"))
            self.assertEqual(data["memory"]["help"], "Storage is SurrealDB in ~/.librefang/.")
            self.assertEqual(data["config"]["fld_sqlite_path"], "SQLite Path")  # legacy intact

            self.assertFalse(eb.enforce_locale_file(f))  # idempotent
            self.assertEqual(eb.audit_locale_file(f), [])


class FileLevelTests(unittest.TestCase):
    def test_enforce_color_file_does_not_touch_docs_prose(self) -> None:
        # Use a tempdir to confirm the color pass does NOT scan docs/.
        import tempfile

        with tempfile.TemporaryDirectory() as tmpdir:
            tmp = Path(tmpdir)
            mdx = tmp / "page.mdx"
            mdx.write_text("LibreFang docs\n", encoding="utf-8")

            # enforce_color_file only handles color tokens — confirms the
            # dispatch by extension wouldn't be invoked on .mdx as a color
            # file (the main loop scopes .mdx to PROSE_SCAN_DIRS).
            changed = eb.enforce_color_file(mdx)
            self.assertFalse(changed)
            self.assertEqual(mdx.read_text(encoding="utf-8"), "LibreFang docs\n")


if __name__ == "__main__":
    unittest.main()
