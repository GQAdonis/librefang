# C02 governed-effect source receipt

**Captured:** 2026-09-27 UTC  
**Scope:** source and contract lineage only; no product conformance claim.

## Exact source inputs

| Input | Revision / contract | Disposition |
|---|---|---|
| Agent Fabric C01 | `afc.convergence-contract.v1` / `1.0.0`; initiative commit `0417937410d38e77fcba3ddb770c20458ad52758` at capture | Accepted normative predecessor. |
| C01 identity vocabulary | `afc.identity-state-action.v1` / `1.0.0` | Accepted identity, authority, state and action vocabulary. C02 supplies the effect state machine C01 reserved for this phase. |
| Universal Agent Runtime | `852b0657adf2792aa6ed755e5c4540573b685795` | Exact fresh C02 implementation baseline. Product conformance is not inferred from the source revision. |
| Flint Gate | `0edb945f1d73bd8567b90ab6640fbbd0cf1a00c0` | Exact fresh C02 provider baseline. D-GATE remains pending. |
| D-UAR-P1 | `the-boss.uar.sidecar/1`; C01 acceptance receipt | Accepted host/runtime boundary. Windows x64 installation worked and packaged UAR was active on port 1906. |

## Evidence limits retained

- Windows occupied-port fallback was not observed. Apple Silicon separately observed preferred port 1906 advancing to 1907.
- D-UAR-P1 accepts the P1 launch, ownership and installed runtime boundary. It does not prove C02 governance behavior.
- Flint Gate remains an observed provider candidate. The shared Gate-backed `governed` profile cannot claim conformance until UAR and Gate implement and demonstrate `afc.governed-effect/1` through D-GATE.
- The explicit trusted-host `constrained-local` profile does not satisfy D-GATE and cannot be reported as Gate enforcement.
- No tests, builds or product verification were run to produce this receipt.

## Contract lineage

The C02 contract consumes:

1. `../c01/convergence-contract-v1.json` for cross-repository ownership and version dimensions;
2. `../c01/identity-state-action-vocabulary-v1.json` for stable identity classes, command semantics and C01 authority boundaries;
3. `../c01/p1-acceptance-receipt-2026-09-27.json` for the accepted `the-boss.uar.sidecar/1` checkpoint; and
4. the C02 plan scope for direct, managed, embedded and proxied effect admission.

The resulting `afc.governed-effect/1` contract is an implementation input. It does not modify generated KBD state, complete C02 tasks, certify either repository, or authorize publication.
