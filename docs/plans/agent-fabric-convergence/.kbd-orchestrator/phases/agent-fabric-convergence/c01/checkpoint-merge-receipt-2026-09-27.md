# C01 checkpoint merge receipt — 27 September 2026

Mini [PR #8](https://github.com/Prometheus-AGS/prometheus-skills-mini/pull/8) merged as `f38a98a6ed064f9e5b8b9837e8b91781af570d22`. It contains the read-only KBD help correction, the Windows long-path checkout correction and both archived OpenSpec records.

BossFang [PR #130](https://github.com/GQAdonis/librefang/pull/130) merged as `04a8a278d62e3c833da3906c5d32e2b734e14d15`. It contains the merged I1 baseline refresh, the P1 checkpoint reconciliation and the two repository-policy corrections.

These merges make the recovery and checkpoint records authoritative on both default branches. They do not satisfy `D-UAR-P1`: installed Windows x64 acceptance must still confirm UAR launch, effective-port reporting and fallback from occupied port 1906. C01.2 therefore remains open.
