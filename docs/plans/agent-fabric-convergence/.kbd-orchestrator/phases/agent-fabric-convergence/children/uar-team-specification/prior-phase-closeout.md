# Prior phase closeout — external dependency

Status: OPEN, installed acceptance pending. This record does not modify the mini shipping journal.

Source: mini .kbd-orchestrator/phases/the-boss-shipping-and-settings/children/uar-working-agent/children/integration-administration/progress.json, revision 931. Task completion 35/37; change completion 0/1; next task 5.3. Both meanings are retained.

Release: v2.2.3, source target and asset identities in release-baseline.json. Published installers exist; their existence does not certify UAR startup, port conflict handling, configuration, workspace isolation or restart.

| Work | Owner | Required evidence | State |
|---|---|---|---|
| Windows x64 installed acceptance | Operator with shipping phase | Exact version/hash; launch; UAR actual endpoint; port 1906 and occupied-port advance; change/restart; both MCPs; services/storage/skills; persistence | Pending |
| Apple Silicon installed acceptance | Operator with shipping phase | Same supported story using exact DMG; application opens; UAR and admin operational | Pending |
| Tasks 5.3/5.5 reconciliation | Shipping phase | Existing publication evidence plus above acceptance through kbd-apply | Pending |
| Cumulative certification and OpenSpec archive | Shipping phase | Real evidence and unresolved defects disposition | Pending |
| Reflection, parent handoff, canonical completion | Shipping phase | C1–C5 receipts and parent restoration | Pending |
| D-UAR-P1 accepted contract receipt | Convergence C01.2 | Pinned accepted UAR/Boss revisions, identity/history/approval/lifecycle contracts | Pending |

Research and draft publication can proceed independently. No implementation admission may treat this document as D-UAR-P1 acceptance. Any failure returns to the shipping phase, not a documentation-only code fix here. Earlier accepted releases do not satisfy the new acceptance automatically.
