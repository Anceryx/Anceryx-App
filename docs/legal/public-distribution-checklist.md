# Public distribution checklist

This checklist is not legal advice. Public release and binary distribution require human review and approval.

- [ ] Review and approve the custom source-available license and contributor grant.
- [ ] Confirm the source license accurately expresses the intended GitHub fork and contribution permissions.
- [ ] Regenerate dependency notices from the exact lockfile and packaged artifact.
- [ ] Review Electron, Chromium, Node.js, native binary, font, icon, and other asset notices.
- [ ] Confirm separate rules for use of the Anceryx name and marks.
- [ ] Approve redistribution rights for Kaoli, mascots, logos, banners, icons, and other artwork.
- [ ] Confirm that secrets, private certificates, credentials, user data, logs, dumps, backups, and private history are absent.
- [ ] Confirm authentication, authorization, administration, billing, entitlement, moderation, and revocation remain server-authoritative.
- [ ] Review update verification, code signing, installer contents, and source-to-binary correspondence.
- [ ] Reproduce and classify all dependency vulnerability reports in the release CI environment.
- [ ] Validate the Windows package and update flow before distribution.

Technical references: [distribution architecture](../DISTRIBUTION_ARCHITECTURE.md), [license inventory](third-party-license-inventory.md), [source/binary correspondence](../SOURCE_BINARY_CORRESPONDENCE.md), and [desktop build](../DESKTOP_BUILD.md).
