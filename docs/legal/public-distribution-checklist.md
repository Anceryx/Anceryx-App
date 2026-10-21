# Public distribution checklist

This checklist is not legal advice. Public release and binary distribution require human review and approval.

- [x] Review code provenance and record the owner's authority to license Anceryx-controlled code under Apache License 2.0. The private history shows client-source changes attributed to Daniel Oliveira; no independent outside code contributor was found.
- [ ] Confirm the Apache 2.0 code scope and exclusions are clearly identified.
- [ ] Confirm `NOTICE` requirements for the exact source and packaged artifact; retain all third-party notices regardless of the result.
- [ ] Regenerate dependency notices from the exact lockfile and packaged artifact.
- [ ] Review Electron, Chromium, Node.js, native binary, font, icon, and other asset notices.
- [ ] Confirm separate rules for use of the Anceryx name and marks.
- [x] Review the 60-file artwork inventory and record the owner's authorization for rights held by Anceryx. The reviewed history/metadata showed no concrete third-party indicators; revisit only if specific contrary provenance or license evidence appears.
- [ ] Confirm that secrets, private certificates, credentials, user data, logs, dumps, backups, and private history are absent.
- [ ] Confirm authentication, authorization, administration, billing, entitlement, moderation, and revocation remain server-authoritative.
- [ ] Review update verification, code signing, installer contents, and source-to-binary correspondence.
- [ ] Reproduce and classify all dependency vulnerability reports in the release CI environment.
- [ ] Validate the Windows package and update flow before distribution.

Technical references: [distribution architecture](../DISTRIBUTION_ARCHITECTURE.md), [license inventory](third-party-license-inventory.md), [source/binary correspondence](../SOURCE_BINARY_CORRESPONDENCE.md), and [desktop build](../DESKTOP_BUILD.md).
