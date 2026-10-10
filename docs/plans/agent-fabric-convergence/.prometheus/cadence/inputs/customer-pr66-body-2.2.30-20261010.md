# Corrective customer runtime release

Fresh ordinary UAR input after a tool-free cancellation and runtime restart previously returned HTTP 404. The packaged 2.2.29 operation now passes. Standalone durable-agent approvals retain their real admission owner and expose the appropriate runtime decision channel with exact challenge checks.

An actual undecided-read restart also exposed that a missing process-local event stream masked otherwise durable approval/effect history. The narrow 2.2.30 reader repair handles only that authenticated, scoped, retained terminal-run 404 and displays the existing stream-gap state. Approval decisions and native authority remain unchanged.

Sources: application aef2ec2cda68605efab9dddf33b46e726e752c2d; UAR 308aea46ff26e7f61340281bb51f67ebe5351569. The completed native payload is reused.

Evidence: actual 2.2.29 native and Mac ARM64 packaging passed, and ordinary fresh follow-up after cancellation/restart passed. The actual 2.2.30 Mac ARM64 build, DMG mount/install/signature/Gatekeeper/payload checks also passed. Its packaged pending-approval operation passed all four checks: a genuine undecided read, owned runtime restart, retention of the same cancelled command without replay, and readable durable history with an unresolvable old challenge and zero successful effects. The prior 2.2.29 history-reader failure is retained.

The public 2.2.30 Apple Silicon installer is building with release notarization. Windows x64/ARM64 and Intel publication remain pending. A synthetic represented read reached the correct approval channel but expired without a human decision; no represented-read pass is claimed.

No intermediate unit suites or review loops ran. Final native Windows operation and operator acceptance remain pending. Local signing/Gatekeeper results do not claim public notarization; the public Mac job uses the release signing/notarization flow.

