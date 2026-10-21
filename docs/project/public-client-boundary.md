# Public client boundary

This repository contains the Anceryx Electron/React client. The API is maintained in a separate private repository and hosted independently. The client builds without access to private backend source.

The client knows the endpoints and data formats needed to communicate with the API. Those details are not security controls: the server enforces authentication, authorization, privacy, moderation, billing, and privileges.

The client code is licensed under Apache License 2.0 (`Apache-2.0`). This does not open the backend or grant rights to the Anceryx brand or official artwork. Third-party dependencies retain their own licenses. See [licensing notes](../legal/licensing-notes.md), [third-party notices](../legal/third-party-notices.md), and the [asset policy](../../ASSETS_LICENSE.md).
