# Current Waypoint

**Active path:** phase-10-uar-sidecar-availability
**Change:** none — child spike exited
**Updated:** 2026-07-31 by kbd-child-exit

## Where we are

The sidecar-supervision-design-spike completed C-SPK-001 and exited back to the parent. It retained the UAR HTTP/process boundary, made supervision policy deterministic at the readiness boundary, and left the upstream UAR retained-listener/READY race as an explicit dependency.

## Next step

```text
/kbd-status
```
