# Native release cache scope recovery

This records an observed release-operation correction, not application code, qualification credit or a new delivery.

At 03:51 UTC, GitHub's cache API listed Windows x64/ARM64 native caches under `refs/heads/codex/customer-coordinator-delegation-identity` (approximately 1.96/1.94 GB). The new `boss-native-build-2.2.29-308aea46` tag had zero caches. Runs 38021552203 and 38020133092 used that tag, while the previous native producer38016664693 used the branch.

The official [actions/cache contract](https://github.com/actions/cache/blob/main/README.md) scopes caches by key, version and branch. Its [feature-branch guidance](https://github.com/actions/cache/blob/main/tips-and-workarounds.md#use-cache-across-feature-branches) explicitly rules out cross-feature-branch reuse. The default-branch cache is shared, but the observed completed caches were on the feature branch. A successful restore step alone does not prove a cache hit.

The lead requested cancellation of the tag-scoped Windows runs and dispatched replacements on that existing branch:

| Platform | Replacement native run | Exact workflow source |
|---|---|---|
| Windows x64 | 38022082007 | 8119fd7c83248cdf0d0cde4496cb33c569761a71 |
| Windows ARM64 | 38022084018 | 8119fd7c83248cdf0d0cde4496cb33c569761a71 |

Both producers retain UAR308aea46ff26e7f61340281bb51f67ebe5351569. The workflow source differs from the immutable installer sourceaef2ec2cda68605efab9dddf33b46e726e752c2d solely through the reviewed main merge of release metadata; their native source definitions match.

Packaging must run on that same branch after a successful native build and exact-cache save, with the exact source assertion. The separate warm-native publisher requires producer8119fd7c83248cdf0d0cde4496cb33c569761a71 and verifies executable, DLL/model/policy closure and downloaded public bytes before installer admission. The old publisher remains preserved for its own producer824fa5ed40999830196b6c5125faf2ebcf6a8ce4.

Cancellation was also requested for redundant tag-scoped Mac ARM64 native run38019878840 after the actual local native build and its complete public payload passed checksum/download/closure verification. Public Mac installer38021122789 remains active and uses that completed local payload. Its artifact retains its actual source and signing/notarization evidence.

These requests do not prove terminal cancellation, cache restoration, replacement build success, packaging, publication or installed acceptance. Read the actual jobs and receipts before advancing. The existing clock, fifteen delivery count, old failures and publication obligations are untouched.

## Subsequent observed progress

At 04:02 UTC, the Windows x64 replacement had completed the cache-restore step at 03:58:17 UTC and entered native compilation. The step conclusion alone is not an exact-cache-hit receipt. Windows ARM64 was restoring its cache. The old producer's Mac Intel native job completed compilation and its cache save; a new Intel repair producer, run38022665581, was therefore dispatched on the same branch at workflow source8119fd7c83248cdf0d0cde4496cb33c569761a71, retaining repaired UAR308aea46. Its outcome remains pending.

The public Apple Silicon installer run38021122789 had reached its actual signing/notarization and DMG/ZIP packaging path. Live logs include the custom `Notarized app` message, but final signature/notarization and downloadable bytes still require the completed installer manifest and public artifact receipt. Local signing evidence does not substitute for that public receipt.

Automatic PR/main CI had started unit/renderer suites despite the operator's boundary policy. The lead did not manually invoke those suites and does not use them as qualification evidence. Cancellation was requested for owned superseded runs38021763537,38004056095,38003361131 and38003339139, then for merge-triggered run38021802875. The first replacement-head PR run38021763537 was observed terminal cancelled. Other terminal outcomes must be read from GitHub; no zero-run claim or retrospective cost measurement is made. Actual native and installer jobs remain active.
