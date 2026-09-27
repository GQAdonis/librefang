# C04 acceptance receipt

`afc-c04-replaceable-service-instances-and-placement` passed its completed-phase boundary on 2026-09-27.

The accepted source checkpoints are UAR `33d817a95d21e81fff5b0ee504975edfadd84b91`, The Boss `1e9c0a43f1312f4ec024cd9d4e224afca2318cf6`, and Librefang `0208eaa348aecfb4ad2b63b5f6b88e089fac02bd`. The Boss commit is signed. UAR is unsigned because the configured GPG identity has no secret key on this host; its repository hooks passed before the unsigned commit was created.

The final gate compiled the UAR server-full sidecar, built The Boss production application, checked Librefang's affected crates and dashboard, validated and archived all three OpenSpec changes, and exercised a real authenticated UAR create followed by exact-instance reattachment. The resume response returned the admitted effective binding for `c04-reattach-gate`.

The bounded adversarial re-review found no remaining critical issue. It retained two warnings: Librefang's explicit administration endpoint compatibility fallback, and UAR's flattened placement-error diagnostics. Neither warning weakens placement admission.

The operator separately reported that the released Windows installation opens and its UAR sidecar is active on preferred port `1906`. That observation is retained as installed baseline evidence and is not represented as proof that these later C04 commits were installed on Windows.
