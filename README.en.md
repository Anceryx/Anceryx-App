<p align="center">
  <img src=".github/assets/anceryx-banner.png" alt="Anceryx" width="100%" />
</p>

[🇧🇷 Português (Brasil)](README.md) | 🇺🇸 **English**

# Anceryx

A social platform in active development, bringing community experiences together in a desktop application.

## About the project

This repository contains the Anceryx client application, built with Electron, React, and TypeScript. It provides a desktop interface for social interactions and communities. Feature availability depends on the client version and the official services in operation.

## Features

- Social feed, Explore, and profiles
- Direct messaging and call interfaces
- Forums with an integrated community workspace and organized channels
- Themes, premium experiences, badges, and achievements
- A desktop application built with Electron

These are areas of a product in development. This list does not mean every feature is available in every environment.

## Technology

- Electron
- React and TypeScript
- Vite with electron-vite
- HTTP and WebSocket integration with the official Anceryx API

## Repository structure

| Directory | Contents |
| --- | --- |
| `src/main/` | Electron main process, windows, and desktop integration |
| `src/preload/` | Controlled bridge between Electron and the interface |
| `src/renderer/` | React application interface |
| `src/shared/` | Client-side shared types and contracts |
| `resources/` | Resources used to package the application |
| `scripts/` | Development checks and utilities |
| `docs/` | Client, licensing, and distribution documentation |

The API, database, and production infrastructure are not part of this repository. They remain private and are operated separately.

## Development status

Anceryx is under active development. This repository contains the client; it does not mean every feature is complete, publicly available, or production-ready.

## Run locally

Requirements: Node.js 22 and npm.

```sh
npm ci
npm run dev
```

During development, the client defaults to `http://localhost:3000`. To configure the local environment explicitly, copy `.env.example` to `.env`; the example keeps the local API active and the official URL commented out. To point development at the official API, switch the two `VITE_ANCERYX_API_URL` lines in `.env` so only the desired URL is active. Vite does not load `.env.example` directly.

Electron production builds default to `https://admin-anceryx.site`, independently of `.env.example`, and reject nonofficial hosts or HTTP. Never put secrets in `VITE_*` variables. The private API repository is not required to install or build the client.

Useful checks:

```sh
npm run typecheck
npm run build
npm run test:api-config
npm run test:connection-config
npm run test:update-security
npm run test:community-workspace-layout
npm run test:encoding
```

## Installation and updates

The client is locally prepared as version `0.17.1`. See [Windows installation and updates](docs/INSTALLATION.en.md). Review builds are temporary artifacts, not Releases. The in-app updater now has an independent Ed25519 verifier but remains disabled until the production public key is pinned in the client and the publishing flow and Windows QA are approved. Install updates manually from official Releases while those checks are pending.

## Contributing

Contributions through Issues and Pull Requests are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for the process, quality expectations, and contribution terms. When updating this README, update the [Portuguese version](README.md) in the same change.

## Security

To report a vulnerability, follow the responsible disclosure guidance in [SECURITY.md](SECURITY.md). This repository covers the client; the private API and infrastructure have a separate scope.

## License and ownership

**Client source code:** licensed under the Apache License 2.0 (SPDX: `Apache-2.0`). Within the license scope, you may study, modify, redistribute, and use the code commercially, including in independent and competing projects, provided you meet the license conditions. The license does not require changes to be submitted to the official project.

**Official brand and assets:** are not licensed under Apache 2.0. The owner has authorized publication of Anceryx assets to the extent Anceryx holds the relevant rights, subject to the [separate asset policy](ASSETS_LICENSE.md) and [brand inventory](docs/brand/brand-assets.md). Review of the files found no concrete indicators of third-party material; this authorization does not extend to rights Anceryx does not hold.

**API, database, and infrastructure:** remain private and outside this repository. **Third-party dependencies:** retain their own licenses and notices. See the [third-party notices](docs/legal/third-party-notices.md) and [licensing notes](docs/legal/licensing-notes.md). Apache 2.0 grants no rights to the Anceryx brand and does not imply that a derivative is an official Anceryx product or service.

## Official links

- [Anceryx website](https://www.anceryx.site)
- [Anceryx GitHub organization](https://github.com/Anceryx)
- [Repository scope documentation](docs/project/public-repository-scope.md)
