# Open and baseline the KnowMe/dot facade child phase (G3, #156)

## Observed requirement
Operator decision Q9 makes G3 a child phase, planned against the post-sync tree.
D-003 changed G3's premise: UAR owns scheduling, follow-ups and wakes; BossFang owns the facade, the owner-facing task projection and the notification binding.
The assessment's work-package table and the Q3/Q6 recommendations were read on the pre-sync base and must be re-verified (upstream #8526, #8583).

## Scope
Product-manager work, docs and KBD state only:
- create the child phase with goals amended for D-003, excluding the voice, meeting, media and call milestones M1–M5 (#162–#167), and listing `docs/bossfang/knowme-dot/backlog.md` among its inputs
- write a child `baseline.md` that re-verifies WP1–WP6 on the post-sync tree
- inventory every ownerless workflow/task write path (template instantiate, wizard, `/btw`, unauthenticated task creation, and any others found)
- draft the A01–A20 mapping to proposed changes and tests
- add the KnowMe/dot row to `docs/bossfang/feature-ledger.md`

## Boundary
No code. Child-phase assess and plan follow via the KBD skills; #156 stays open until its acceptance rows pass.
