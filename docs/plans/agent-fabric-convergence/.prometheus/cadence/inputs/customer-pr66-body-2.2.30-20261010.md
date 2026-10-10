# Corrective customer runtime release

Fresh ordinary UAR input after a tool-free cancellation and runtime restart previously returned HTTP 404. The packaged 2.2.29 operation now passes. Standalone durable-agent approvals retain their real admission owner and expose the appropriate runtime decision channel with exact challenge checks.

An actual undecided-read restart also exposed that a missing process-local event stream masked otherwise durable approval/effect history. The narrow 2.2.30 reader repair handles only that authenticated, scoped, retained terminal-run 404 and displays the existing stream-gap state. Approval decisions and native authority remain unchanged.

Sources: application aef2ec2cda68605efab9dddf33b46e726e752c2d; UAR 308aea46ff26e7f61340281bb51f67ebe5351569. The completed native payload is reused.

Evidence: actual 2.2.29 native and Mac ARM64 packaging, DMG mount/install/signature/Gatekeeper/payload integrity passed; ordinary fresh follow-up passed; undecided restart retained the same cancelled command without replay. Historical reader qualification is pending the actual 2.2.30 package, whose local build and public Mac installer job are running. A synthetic represented read reached the correct approval channel but expired without a human decision; no pass is claimed.

No intermediate unit suites or review loops ran. Final native Windows operation and operator acceptance remain pending. Local signing/Gatekeeper results do not claim public notarization; the public Mac job uses the release signing/notarization flow.

