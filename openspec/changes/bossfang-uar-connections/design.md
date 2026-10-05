# Connection architecture

The connection manager probes a configured endpoint but holds no child process, stdin, executable resolver, restart task, or UAR provisioning environment. Saved enabled/command/restart/storage fields remain readable; a missing endpoint is an actionable migration diagnostic and never triggers a launch. Legacy lifecycle routes become connection aliases with no process effects.

Owner POST /api/uar/connect can privately provide a typed selected instance and bearer; optional body omission uses saved references. Status includes identity, endpoint, admitted binding and compatibility diagnostics, never bearer. Disconnect invalidates the published binding; reconnect revalidates it. A supplied bearer is only process-local and must be replaced after expiry; local host issues a restricted delegation grant, external endpoints use authenticated bearer/JWT. No client asserted principal is forwarded.

Instance ownership is relative to BossFang: always external/borrowed. Remote capability ownership belongs to the remote supervisor and is not used to fabricate a BossFang ownership claim. Existing exact identity/profile/roles/capabilities/workspace/admission receipt and runtime epoch checks remain. Endpoint policy is loopback HTTP or HTTPS without userinfo/query/fragment; redirect credentials must not cross endpoint authority.

Native model discovery uses the models credential role and admitted UAR models endpoint rather than changing provider credentials. Discovery/compatibility are scoped read operations, not administration authority. Model completion needs its explicit grant operation.

## Actual diagnostic branch

Owner POST `/api/uar/diagnostics/delegation` accepts `{workspaceId,providerId,model,bossTaskId?}`. The native helper authors a current UAR AgentArtifact with an explicit no-tools/no-skills/no-MCP/no-memory run policy and selected exact registry provider/model. Normal pending projection, admission, uncertainty reconciliation, ownership, placement, runtime epoch and compare-and-swap control flow are reused. No compiler/catalog installation or dummy deployment binding is involved. Only this authored branch omits bindingId; ordinary bound routes remain strict. Persisted `definitionMode` is `inline_diagnostic`; historical missing values deserialize as `bound`. Empty targetBindingId explicitly denotes no installed binding. Definition digest records authored source, not UAR expanded/stamped native content revision; UAR owns canonical native hashing.

Observation forwards existing public full-harness SSE into cursor events: `agui.message.delta` uses `data.delta.text`; `agui.done` uses nullable `data.usage` fields input_tokens/output_tokens/total_tokens/cost_usd_estimate/model. Success additionally requires lookup state `completed`. Cancellation settlement remains separate. Disconnect/exit never cancels UAR tasks. Credentials stay private; selected workspace headers scope grant operations and caller principal headers are never emitted.

## Source-only boundary

The subprocess supervisor and obsolete bundled-UAR resolver assertions are removed. Docker no longer copies UAR binary/model assets. Saved launch/storage fields remain readable migration data; existing UAR storage is neither deleted nor provisioned on connection. Native dashboard layout is preserved with connection actions and five locale translations. No dependency upgrades, tests, compiler, native build, review or runtime acceptance occurred during source implementation. Parent owns complete package and actual operation gate.
