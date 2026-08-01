# Sansaba SSR candidate provenance

- Source repository: `git@github.com:GQAdonis/librefang.git`
- Baseline source SHA:
  `0493da782a5b6a716d3acbdbfa3112524a0a25bf`
- License: MIT.
- Build input: repository `Dockerfile.ssr`, `linux/amd64`, daemon features
  `telemetry,surreal-backend,uar-driver`.
- Candidate image: `ghcr.io/gqadonis/bossfang`.
- Candidate source SHA:
  `b033879998ebfb6fec39676770d906abd12f417a`
- Candidate OCI index digest:
  `sha256:f691ce37eb4a59710130fbcbe42d8027bc1ae8f5debb3181bc073b23ec4861cf`
- Candidate `linux/amd64` manifest digest:
  `sha256:b7c221324f33cd4f1331d11beedc068883737d4b919ea4981fe076370ca67de6`
- Publishing workflow:
  `https://github.com/GQAdonis/librefang/actions/runs/30548500122`
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
