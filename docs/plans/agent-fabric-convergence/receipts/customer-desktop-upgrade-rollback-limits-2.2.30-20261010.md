# Desktop upgrade evidence and rollback limits

Recorded 2026-10-10. Documentation-only inspection of frozen Boss source `aef2ec2cda68605efab9dddf33b46e726e752c2d`, whose `package.json` identifies **2.2.30**. No application, updater, restore, migration, downgrade, build or suite was operated for this note. No profile data was modified. This document changes no completion or qualification counter.

## Supported source contracts

- `src/main/services/AppUpdaterService.ts:99–112,203–216,252–281,411–414`: packaged builds use their generated update configuration; automatic installation on quit is disabled. Installation is initiated through the existing explicit `quitAndInstall` action. Normal update checks and both read-only availability/release-note queries explicitly set `allowDowngrade = false`. Windows portable builds do not perform update checks. This is source evidence of update policy, **not** an operated automatic-update pass.
- `src/main/data/db/DbService.ts:135–176` initializes the database, runs the bundled migrations and seeders. `src/main/data/db/applyMigrations.ts` applies forward Drizzle migrations and the custom SQL statements; it does not define reverse migrations.
- `src/main/data/db/restore/appliedChain.ts` reads the database's actual applied migration sequence. `src/main/data/db/restore/restorePromotion.ts:279–295` admits a restore journal only when that sequence is a prefix of the installed application's bundled sequence, comparing migration timestamps and hashes item by item. An ahead-of-code chain or a fork fails this **restore admission**. This is not a claim that every ordinary startup rejects an ahead-of-code database.
- Restore promotion's pre-commit recovery restores its own transaction state. It is not a general application downgrade, UAR database downgrade, or reversal of external effects. Replacing a binary does not undo the approved GitHub issue #63.

**Unsupported:** in-place application downgrade against a profile already opened or migrated by a newer release; reverse SQLite/UAR schema migration; recovery of every subsystem by copying only one database file. The customer closeout should disclose these limits rather than implement new rollback machinery or claim a downgrade pass.

A retained pre-upgrade **disposable** profile snapshot paired with its exact original installer could support a separate bounded recovery experiment. Such an experiment has not been performed here. Do not present it as a supported product restore procedure or open the user's migrated live profile with older code.

## Actual retained upgrade operation

[The public 2.2.25 feedback recovery receipt](customer-public-mac-2.2.25-feedback-recovery-20261009-operation.json), SHA-256 `7a932c143c6f84b747a2fc49ad462109aeffb932b76cff076cf1409c959201b3`, records a successful intentional whole-application replacement and reopening of the same isolated retained profile:

- Started `2026-10-09T22:33:22.418Z`; finished `2026-10-09T22:34:24.835Z`.
- Prior operated Boss source `e4addba828f4b0f67caef1bdd49925f1f9c767f2`, UAR `6b2ad902c82a17c5f0b44759e1f7c38c90265e89`.
- Replacement Boss source `35eff8c8c40555a4a464ee03b7305bcc4949666b`, UAR `60b5922e3e11dd73bfd8a47e5bc28f3c16332889`, public version 2.2.25.
- Exact installer SHA-256 `deb59913074f3644daf1c2b2ab54db8f2e4c83be3f4d13f2ee5bf4c054a4d721`; installation receipt SHA-256 `9bdf9246fb5faf72cc62c148c2ec9ea3e3a9582aea13c78fef1c6b01afb77e69`.
- The retained approved draft, dispatch, confirmed effect and real [issue #63](https://github.com/Prometheus-AGS/the-boss/issues/63) remained identical. Effect identity `3df1f737-61a3-4429-be23-868461965999` and dispatch `623e64bf-2fc8-47b2-be95-ad7261241559` were unchanged; before/after effect lists contained that single effect. No new effect intent or duplicate issue publication occurred.

This proves the named manual replacement/reopening and feedback-effect preservation subset at its recorded source. It does **not** prove updater download/install behavior, arbitrary migration compatibility, native Windows upgrade, downgrade, or final 2.2.30 installed acceptance.

## Source applicability to the current freeze

Bounded Git object inspection found these paths identical between public Boss `35eff8c8` and frozen `aef2ec2c`:

| Relevant path | Identical blob/tree |
|---|---|
| `src/main/services/AppUpdaterService.ts` | `bc5a8fba7abfbb51f97ab0236d2aaeb8f040246e` |
| `src/main/data/db` | `e0e311a97f92e0849888dd78b8bcb2d1428efc1e` |
| `src/main/core/preboot/v2MigrationGate.ts` | `4aff49cf762d38a3539bf2c4c536c3fd1eccd24a` |
| `migrations/sqlite-drizzle` | `77d64d8a05659d3f86c1632723cc3a767e3f3ddc` |
| `src/main/ai/runtime/uar/uarFeedbackGithub.ts` | `7b06c86160e6323c312e6e0882f266b140447752` |

These equal objects support retaining the applicable desktop database/update-policy and feedback dispatch evidence. They do not certify changed UAR persistence, pending-approval recovery, every application store, or a new installer's bytes. Original receipts retain their original sources and outcomes.

For closeout, preserve this existing passing upgrade/reopen subset, record in-place downgrade as unsupported, and keep the final candidate's installation, native operation and operator acceptance separate. No additional destructive rollback operation or duplicate GitHub write is required by this note.
