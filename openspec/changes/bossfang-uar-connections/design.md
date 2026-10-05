# Connection architecture

The connection manager probes a configured endpoint but holds no child process, stdin, executable resolver, restart task, or UAR provisioning environment. Saved enabled/command/restart/storage fields remain readable; a missing endpoint is an actionable migration diagnostic and never triggers a launch. Legacy lifecycle routes become connection aliases with no process effects.

Owner POST /api/uar/connect can privately provide a typed selected instance and bearer; optional body omission uses saved references. Status includes identity, endpoint, admitted binding and compatibility diagnostics, never bearer. Disconnect invalidates the published binding; reconnect revalidates it. A supplied bearer is only process-local and must be replaced after expiry; local host issues a restricted delegation grant, external endpoints use authenticated bearer/JWT. No client asserted principal is forwarded.

Instance ownership is relative to BossFang: always external/borrowed. Remote capability ownership belongs to the remote supervisor and is not used to fabricate a BossFang ownership claim. Existing exact identity/profile/roles/capabilities/workspace/admission receipt and runtime epoch checks remain. Endpoint policy is loopback HTTP or HTTPS without userinfo/query/fragment; redirect credentials must not cross endpoint authority.

Native model discovery uses the models credential role and UAR model-provider endpoint rather than changing provider credentials. Discovery/compatibility are scoped read operations, not administration authority. Model completion needs its explicit grant operation.
