# Sansaba SSR candidate provenance

- Source repository: `git@github.com:GQAdonis/librefang.git`
- Baseline source SHA:
  `0493da782a5b6a716d3acbdbfa3112524a0a25bf`
- License: MIT.
- Build input: repository `Dockerfile`, `linux/amd64`, daemon features
  `telemetry,surreal-backend,uar-driver`.
- Candidate image: `ghcr.io/gqadonis/bossfang`.
- Candidate source SHA and digest: populated after the candidate workflow.
- Persistence: one embedded SurrealDB store on a 10 Gi `managed-csi` PVC.
- Secret contract: existing `bossfang-runtime` Secret with
  `BOSSFANG_VAULT_KEY` and `BOSSFANG_UAR_CLIENT_TOKEN`.
- UAR contract: internal
  `http://uar.uar.svc.cluster.local:1906`, API `v1`, capabilities
  `openai.chat.completions`, `ag-ui.stream.agui_spec`, and `a2ui.registry`.

The overlay intentionally omits the GKE Gateway, HTTP Basic Auth
SecurityPolicy, GKE StorageClass, external SurrealDB, and direct public route.
The Sansaba BFF is the only allowed ingress and resolves the verified
application session before proxying an allowlisted operator path.
