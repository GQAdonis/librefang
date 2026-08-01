# Convergence decisions: C-URT-001

- Keep UAR as an isolated process supervised over a narrow stdout/HTTP protocol.
- Retain the primary listener rather than reserving a port number and attempting to reclaim it.
- Define readiness as successful application initialization on the retained primary listener; an unavailable optional address-family companion does not invalidate that primary.
- Pin BossFang only to the immutable merged SHA after the registry proves the image and executable sidecar.
