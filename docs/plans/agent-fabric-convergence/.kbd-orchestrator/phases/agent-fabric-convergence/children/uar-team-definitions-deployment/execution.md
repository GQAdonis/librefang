# Execution — UAR team definitions, maintenance, and deployment

## Delivered production boundary

I1 now defines and installs immutable UAR collaboration packages without introducing another execution loop. The UAR owns canonical `AgentDefinition`, `TeamDefinition`, `WorkflowDefinition`, `PackageManifest`, catalog receipts and private deployment bindings. REST and MCP administration expose preflight, install and status operations. Legacy agent projections remain available. Team activation remains explicitly unavailable until I2 durable local teams.

The mini and full skill packs now ask the team-authoring, maintenance and deployment questions required by the approved draft, generate the same exact-byte package format, create immutable replacement versions, preview binding migration, discover authenticated binding ownership, and refuse activation when the I2 capability is absent. Both generated Claude and Codex distributions were rebuilt from the same sources.

## SurrealDB 3.3.0 convergence

The operator-directed dependency amendment is complete. UAR, Compass and surreal-memory use the exact SurrealDB 3.3.0 client family. Managed service assets and The Boss payload metadata pin `surrealdb/surrealdb:v3.3.0@sha256:681c6c22c287421b5c7d99e0fde79b6e0d32c36c1ddeaab2762a1661cb04cd20`. Migration guidance records that first 3.3 access upgrades a 3.2 datastore and rollback requires a pre-upgrade export.

Compass dependency policy carries exact BUSL-1.1 exceptions for the 28 SurrealDB 3.3.0 crates. `object_store 0.13.2` prevents resolving the patched `quick-xml` line, so only RUSTSEC-2026-0194 and RUSTSEC-2026-0195 are temporarily excepted. The exception records that Compass's remote Surreal transport does not construct the affected object-store cloud XML parser and must be removed when the SurrealDB dependency graph permits the patched object-store release.

## Final integration and build evidence

The single creator-to-UAR gate passed against a live authenticated UAR using a SurrealDB 3.3.0 datastore. It exercised capability discovery, exact package preflight/install/status, durable binding preflight/install/status, unknown-capability refusal, legacy projection compatibility and explicit I2 activation refusal. The installed package digest was `sha256:b18c0c1e75b3281a42a8f4e2f7005f6547f228aa95a03949c16d86f30ce60b30`; the durable binding reached revision 1. Evidence is preserved in the archived mini OpenSpec change at `openspec/changes/archive/2026-09-26-agent-team-uar-deployment/evidence/integration-gate-result.json`.

The locked UAR production build completed after the 3.3.0 lockfile change. The Compass release build completed with `--features surreal-remote`, including JSON and SQLite support, SurrealDB 3.3.0 and rmcp 3.4.0. The resulting macOS ARM64 binary reports `compass 0.3.29`, is 177 MB, and has SHA-256 `d17d3dcb02235d9646b307cc08c942877cb5cbc1c043c7edbbd40b1ffc37bf9b`.

The UAR, mini and full-pack OpenSpec changes passed their completed-change verification and were archived. No per-edit or unit-test loop ran. CI reruns are limited to failures exposed by the publication boundary.

## Published changes

- UAR: commits `a8ba422223ee082116cc3691cea90e096c23e97c` and `676f995c73dc7dacdce71c929ffac88ac3618bb0`; PR https://github.com/Prometheus-AGS/universal-agent-runtime/pull/304
- Mini: commits `76ababa463066474ddbfa6917be5ae2b100de78a`, `28c008db4298457b6dd0c6b9eae29c5b9ecf7f12`, and `8fafd44fb2e02a6120c0d4dbb7ef7e21b88be42e`; PR https://github.com/Prometheus-AGS/prometheus-skills-mini/pull/7
- Full skill system: commits `79cd048d7837fea274c0718949670a1b8b11b237` and `1fa2eaa32084059f90866d8fa08744ef2f1b37e6`; PR https://github.com/Prometheus-AGS/prometheus-skill-system/pull/104
- Compass: commits `4f063137222e7bfd9d880d9ba445271a8d2aa7a1`, `1ec2441aeb533405989c0b9c2e4d08746cc8bdd7`, and `40c9bfff`; PR https://github.com/GQAdonis/compass/pull/9
- surreal-memory-server: commit `137780252700cd59630d18b8e42f11d033538c1e`; PR https://github.com/Prometheus-AGS/surreal-memory-server/pull/28
- The Boss: commit `7e95983bf5bee223c43a7b11f1bbf7c8fddbd636`; PR https://github.com/Prometheus-AGS/the-boss/pull/10

The Boss's description gate passes. Its remaining locale and legacy Cherry branding failures reproduce on base `main` and do not overlap this two-file image-pin change. Mini's known Windows path-length and stale context-bootstrap assertion failures likewise predate this scoped payload work. These baseline failures were recorded without expanding I1.
