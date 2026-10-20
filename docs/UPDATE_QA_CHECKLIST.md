# Windows updater QA checklist

This checklist is intentionally manual for operations that cannot be proven by
the renderer build.

- [ ] Install signed stable `0.15.0` and confirm it points at the retired feed.
- [ ] Install the signed transition build over `0.15.0`; verify `%APPDATA%`, sessions, preferences, and local attachments remain available.
- [ ] Install an older signed Windows NSIS build in an isolated test profile.
- [ ] Confirm the app starts with the update server unavailable.
- [ ] Keep publication tests in a disposable repository/test account until the public repository, signing subject, and protected environments are independently reviewed.
- [ ] Confirm startup and manual checks show stable `latest` or beta `beta.yml` as appropriate.
- [ ] Confirm no-update and connection-error states are non-blocking.
- [ ] Confirm real download percentage and interrupted-download recovery.
- [ ] Confirm notes are plain text and no arbitrary URL opens.
- [ ] Confirm restart/install requires user consent.
- [ ] Confirm the new version starts after installation and local attachments,
      sessions, and preferences remain available.
- [ ] Confirm equal/older versions, malformed versions/manifests, missing installer/hash/blockmap, and wrong-channel artifacts are rejected.
- [ ] Confirm signature, certificate chain, SmartScreen reputation, installer,
      uninstaller, and rollback behavior.
- [ ] Repeat with a stable client and a beta client to verify channel selection.
- [ ] Record artifact hashes, update metadata, logs without secrets, and the
      exact source tag.
- [ ] Confirm RC builds are manual QA only and are not presented as in-app beta updates.

Do not use production accounts, private keys, or personal data for this QA.
