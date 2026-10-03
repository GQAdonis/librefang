# Delivery Cadence pipeline: source assessment

Date: 2026-09-30. Scope: read-only source and distribution inspection; no production edits, builds, or test suites. Delegated responsibility follows the selected `bossfang-stewards` delivery-optimizer's read-only bottleneck role; the KBD lead explicitly assigned this assessment artifact instead of its usual observations directory. Native Claude role metadata was inspected, not claimed as a separate Claude invocation.

## Baselines and distribution drift

The active project uses the linked full-pack source, not the original full-pack checkout or the globally installed Codex copy. These are different versions. HEAD alone does not describe dirty source bytes.

| Location | HEAD | Branch | Skill version | Shared payload observation |
| --- | --- | --- | --- | --- |
| `/Users/gqadonis/Projects/prometheus/worktrees/afc-c03-full-pack` | `1ddcc8b21b05f26aa89aa5e19776c86e5b854c96` | `codex/afc-c03-team-authoring` | 1.1.2 | 31 files; skill directory clean; unrelated nested proxy dirty |
| `/Users/gqadonis/Projects/prometheus/prometheus-skill-pack` | `80ac9d38296063063e5b7f77ffab3050eed4a826` | `codex/delivery-cadence-recovery` | 1.1.0 | 31 files; `scripts/boss-launch.mjs` locally modified; other unrelated changes |
| `/Users/gqadonis/Projects/prometheus/prometheus-skills-mini` | `068c2484ddfa29f74449991f46324861911dc7a1` | `codex/delivery-cadence-recovery` | 1.1.0 | 31 files; `scripts/boss-launch.mjs` locally modified; other unrelated changes |
| `/Users/gqadonis/.codex/skills/delivery-cadence` | Installed payload, no repository revision asserted | — | 1.1.1 | 32 files including `.prometheus-generation` |

SHA-256 inventory digests below hash sorted `[relativePath, fileSHA256]` pairs, including all directory files. They are read-only inventory evidence, not runtime validation:

- Linked full source: `c3404d6551e8e3cc151542299869f93faaaed3f9f0f1028d1170292942ebd61b`.
- Original full and original mini are byte-identical to one another: `dc68b99f0947741e12d8b7f625135352acd05bfa3af797d29c83f17f81b72acb`.
- Installed Codex including its generation marker: `eb97c12d5b0680ed8c40019339fc68567b0173440cec8d305915432ae4442da1`.

Original full/mini differ from linked full in `SKILL.md`, `references/adapters.md`, `references/boss-profile.md`, `references/profile.md`, `scripts/boss-launch.mjs`, and `scripts/lib/checkpoints.mjs`. Installed Codex differs in `SKILL.md`, `references/profile.md`, `scripts/lib/checkpoints.mjs`, plus the generation marker. Do not overwrite dirty original copies or accidentally promote an older payload. Select one linked implementation baseline, reconcile these changes deliberately, then distribute identical shared bytes.

For the source references below, `S` means `/Users/gqadonis/Projects/prometheus/worktrees/afc-c03-full-pack/skills/process/delivery-cadence`; `F` means that full repository root; `M` means `/Users/gqadonis/Projects/prometheus/prometheus-skills-mini`.

## Proven bottlenecks and preserved strengths

| Finding | Actual source behavior | Evidence |
| --- | --- | --- |
| Publication globally blocks new development | `admission` rejects ordinary `start` whenever `publicationDue`; only an evidenced corrective exception bypasses it. | `S/scripts/lib/engine.mjs:31–38,104–113` |
| A local build also blocks cadence mutations | The entire mutating command executes within `withLock`. `checkpoint` awaits the child process before returning. `withLock` releases only after that action completes. Read-only status/report remain available, but activity, child hooks, and new work records cannot mutate concurrently. | `S/scripts/lib/engine.mjs:154–157,291–325`; `S/scripts/lib/storage.mjs:21–50`; `S/scripts/lib/checkpoints.mjs:152–176` |
| One active iteration is a separate restriction | Even after removing the publication check, `activeIterationId` disallows another `start` until `finalize` clears it. | `S/scripts/lib/engine.mjs:32,55–62,125–130` |
| Frozen delivery evidence already exists | `ready` captures source fingerprints; build and successful finish reject changed sources. Build, launch, and actual newly delivered feature operation are separate requirements. | `S/scripts/lib/engine.mjs:132–151,181–194`; `S/scripts/lib/checkpoints.mjs:16–40,112–129,163–166`; `S/scripts/lib/delivery-contract.mjs:20–38` |
| Source identity is checkout-bound | Capture resolves the repository's current absolute path/HEAD and hashes tracked changes plus untracked files, excluding cadence state only when nested. It is not a materialized immutable checkout or content store. | `S/scripts/lib/checkpoints.mjs:16–40` |
| Publication assumes the newest successful delivery | When due, a receipt for an earlier frozen release is rejected once a newer local delivery succeeds. Status also selects the newest successful iteration. This defeats independent publication unless revised. | `S/scripts/lib/engine.mjs:269–275`; `S/scripts/lib/delivery-contract.mjs:76–85` |
| Global debt cannot distinguish queued release obligations | A successful publication sets one boolean false and resets its next threshold relative to the *current* successful count. Recovery of outstanding publication hooks does the same. In a pipeline, an older publication could erase a newer obligation. | `S/scripts/lib/engine.mjs:245–250,260–282` |
| Ordinary idempotent retry is safer than an unconditional clear | `dispatch` returns cached successful command results before executing. The dangerous recovery branches above matter for interrupted/unresolved commands and hooks; do not claim every repeated completed command clears debt. | `S/scripts/lib/engine.mjs:303–305` |
| Publication receipt quality is useful | Exact source references, local artifact hashes/sizes, configured platform URLs, website links and metadata are required. Installed acceptance is separately configurable. Preserve these distinctions. | `S/scripts/lib/checkpoints.mjs:42–89`; `S/scripts/lib/delivery-contract.mjs:48–73` |
| No first-class release job exists | Publications are recorded after outcome, not claimed as pending jobs with a frozen candidate, owner, or per-platform progress. One metadata/site publisher is an instruction, not a cross-process publication lease. | `S/scripts/lib/engine.mjs:260–284`; `S/references/adapters.md:15,21` |
| Meaningful outcome is named, not independently proven by task count | `normalizedScope` requires a user-visible outcome; delivery requires a matching feature-operation run. The engine has no empty-diff release suppression or explicit release-note selection contract. | `S/scripts/lib/profile.mjs:58–68`; `S/scripts/lib/delivery-contract.mjs:6–38` |
| Iteration duration does not stop execution | Status exposes a deadline; the skill tells the harness to stop new scope, but `budgetReason` only enforces hard total run/iteration limits. There is no automatic 90/120/150-minute scope control. | `S/scripts/lib/engine.mjs:295–296`; `S/scripts/lib/profile.mjs:71–75`; `S/SKILL.md` |

## Successful external build receipts cannot currently be imported

The current CLI has `checkpoint`, `observe`, `history`, and `publication`, but no checkpoint adoption/import action (`S/scripts/cadence.mjs:20`). `checkpoint` always enters `runCheckpoint`; it cannot accept an already-completed external process receipt. `observe` imports timing or reopened IDs only (`engine.mjs:159–174`); `finish.artifacts` hashes existing files but does not supply required checkpoint evidence (`engine.mjs:185–194,218`). Publication can import its own completed receipt, but this is a separate kind of evidence.

Therefore a successful direct package build may still be rerun merely because cadence lacks its own checkpoint record. The parent lead supplied an observed 14:33 repeat-build reason for this occurrence; this audit establishes the absent seam from source, not an independent replay of that historical build.

Minimal repair: support adoption of an already-completed build/run attempt into the **same frozen candidate contract**, with actual command/args/cwd, exit status, timestamps, source identities, artifact digests, and launch/feature-operation identity as applicable. Missing historical information stays unknown and cannot satisfy a gate. Never forge a fresh run or treat artifact existence alone as execution evidence. Record adopted provenance and command identity so a recovered attempt is not dispatched twice.

## Work-ahead while partial or full builds run

Simply removing `publicationDue` admission is insufficient. There are three separate design choices:

1. **Public release in flight:** a successful local delivery can leave an immutable publication candidate while the next normal iteration starts. Bind publication debt to candidate/delivery sequence, not whatever happens to be latest at completion.
2. **Local checkpoint in flight:** retain the current unfinished delivery and its KBD leaf. Permit a small, explicit future-work assignment on an isolated checkout under the same lead. This is work-ahead, not a second successful delivery, another canonical phase owner, or permission to build incomplete functionality. Record planned outcome, owner, dependency classification, starting revisions and worktree separately. Account its real time; promotion must not reset the clock to hide waiting.
3. **Failure or resource conflict:** suspend work dependent on the failed candidate; repair its observed error before promoting/accepting later delivery. Independent code editing can continue where the approved contract permits it, but only one writer uses a shared build output. Resource limits remain visible harness responsibilities until an actual resource lease is implemented.

For local work-ahead, freeze the build's actual checkout and output paths. A fingerprint is evidence, not isolation: continuing edits in the same checkout correctly invalidates the candidate. A distinct worktree with shared target/output directories is also insufficient. Reconcile dependent work-ahead after a failed-candidate repair rather than silently incorporating a different base.

Split short state transactions from long process/hook execution. Claim an attempt under lock; release the state lock; run under an explicit resource/job ownership record; reacquire and reload current state to append the result. Keeping the old in-memory state and writing it after releasing a lock would lose concurrent updates. This is a bounded state/receipt extension, not a new daemon or agent scheduler.

## Child and hook recovery to preserve

- Child stacks are attached to a single iteration, with one active leaf and continuous parent clock (`S/scripts/lib/children.mjs:30–76`). Failed/cancelled children block return; successful return requires canonical parent restoration, phase completion, required approvals and criterion evidence (`:109–143`). Preserve this authority and do not treat work-ahead assignments as parallel KBD children.
- The mini KBD adapter returns idle when no active iteration exists (`M/lib/cadence-adapters/kbd.mjs:39–53`). This is relevant to a cadence-repair child entered between deliveries with publication outstanding. Record it as canonical phase work without retroactively reopening a finalized delivery. Adapter exceptions are currently collapsed to degraded status (`:61–64`), so the reporting contract should keep missed reconciliation visible.
- Hooks use event/handler/revision identities; known success is retained, interrupted effects become unknown, non-idempotent unknown effects are not automatically retried (`S/scripts/lib/hooks.mjs:11–57`). Required failures are separate from implementation results (`:60–69`). Preserve these identities when shortening global lock duration; external effects need their own ownership claim.
- Existing persistence appends sequenced state events and atomically writes snapshots; interrupted tails are preserved on explicit recovery (`S/scripts/lib/storage.mjs:54–87`). Migrate rather than rewrite history or manufacture missing candidate records as completed.

## Minimal implementation surfaces for later planning

| Surface | Bounded change to consider |
| --- | --- |
| `scripts/lib/engine.mjs` | Separate work admission from publication debt; add bounded work-ahead claim/promote semantics, candidate-specific publication claim/result, completion sequencing and recovery. |
| `scripts/lib/checkpoints.mjs`, `storage.mjs` | Short transaction/long operation separation, owned checkpoint/resource attempts, receipt adoption, frozen-checkout provenance. |
| `scripts/lib/delivery-contract.mjs`, `report.mjs` | Candidate-specific pending platform/site obligations; meaningful release outcome and transparent build/development overlap, no false delivery credit. |
| `scripts/lib/profile.mjs`, `lifecycle.mjs`, JSON schemas | Opt-in bounded pipeline/WIP policy, compatible migration, honest unknown legacy state; preserve 120 minutes and every-two-successful-deliveries settings. |
| `children.mjs`, `hooks.mjs`, pack adapters | Change only seams affected by concurrency and candidate ownership; preserve canonical authority, permissions, idempotency and uncertain-effects behavior. |
| Skill and adapter references | Remove global publication-wait instruction; document separate local delivery/publication/work-ahead states, dependency repair and resource ownership. |
| Full-to-mini/distribution | Copy identical shared bytes, update checksum inventory and generated plugin payloads, reconcile old installed copies without overwriting edits. |

The existing full-to-mini copier preflights destination bytes against its recorded ownership digests and refuses differing local files (`S/scripts/sync-mini.mjs:24–41`). The full global installer already targets Codex, Claude, Kimi, MiniMax, Zed/shared agents and OpenCode and includes adapter dependencies (`F/scripts/distribute-delivery-cadence.mjs:41–56,86–105,171–205`). It refuses unmanaged/differing payloads and creates recoverable backups (`:108–162`). Preserve that machinery rather than replace it. Distribution docs explicitly distinguish copied availability from native harness operation (`F/docs/delivery-cadence-distribution.md:43`).

## Assessment conclusion

There is a concrete architectural coupling in the current small engine, not evidence that two-hour intervals are intrinsically wrong. Pipeline publication safely requires candidate-bound obligations; local-build work-ahead additionally requires checkout isolation and shorter transaction locks. A mere documentation change or deletion of the admission check will not satisfy the request.

The bounded repair should retain one KBD owner and one unfinished local delivery, permit explicitly recorded independent assignments during its build, and separately publish frozen successful candidates. No evidence here establishes that this will increase velocity by a particular amount. Measure blocked development time, repeated-build avoidance, local delivery lead time, publication age and delivered capabilities after implementation. Keep completed-build/actual-operation gates; do not introduce intermediate suites.
