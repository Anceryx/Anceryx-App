# Public repository scope

This repository contains the Anceryx desktop client: the Electron main and preload processes, React interface, client-side shared contracts, build configuration, required client assets, and project documentation.

The Anceryx API, backend source, database, migrations, billing authority, administration tools, deployment configuration, infrastructure, credentials, and production data remain private and are not part of this repository or the client license.

The client communicates with the separately operated official Anceryx API. The server remains authoritative for authentication, authorization, privacy, moderation, billing, privileges, and revocation. Client code and API endpoint references do not grant access to private services.

The client code is licensed under Apache License 2.0 (`Apache-2.0`). This permits use, modification, commercial use, and redistribution of the code and derivatives subject to its conditions; it does not require upstream contributions. The root license does not automatically cover the official brand and artwork files listed in [ASSETS_LICENSE.md](../../ASSETS_LICENSE.md) and [brand asset inventory](../brand/brand-assets.md). Third-party dependencies and materials retain their own terms. The API, database, and infrastructure remain private. See [licensing notes](../legal/licensing-notes.md) and the [distribution checklist](../legal/public-distribution-checklist.md).

Public source availability does not mean that an official release, hosted feature, or platform build is production-ready. Check current release information and documentation for the state of each capability.
