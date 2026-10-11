Windows x64 and ARM64 application packages need the corrected UAR payload already used by the current Mac ARM64 candidate. Pin both Windows platforms to source 1522f17944aec1e1a7db5eab3b647e732fc1a07f and import their immutable public release records.

Both archives were downloaded from GitHub Releases, checked against the recorded SHA-256 and size, and every manifest file and PE architecture was verified through the existing production integrity checker. Windows x64 published automatically; ARM64 reused its successful native job artifact after the queued publisher was cancelled. No native Windows execution is claimed.

The 2.2.26 application source retains the earlier completed fixes. The separately pushed coordinator instruction correction is excluded and will use a new version. Existing Mac artifacts and all unrelated pins remain unchanged.
