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
- Forums and community spaces
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

During development, the client defaults to `http://localhost:3000`. The `.env.example` file points to the official API. Set `VITE_ANCERYX_API_URL` for the environment you intend to use; never put secrets in `VITE_*` variables. The private API repository is not required to install or build the client.

Useful checks:

```sh
npm run typecheck
npm run build
npm run test:api-config
npm run test:connection-config
npm run test:update-security
npm run test:encoding
```

## Installation and updates

This repository is being prepared for distribution; this workflow has not published an official installer. See [Windows installation and updates](docs/INSTALLATION.en.md). Review builds are not Releases. Existing `0.15.0` installations still point to the old feed and will need a manual installation of the first release published in `Anceryx/Anceryx-App`; NSIS installation will be validated to preserve local data before that transition.

## Contributing

Contributions through Issues and Pull Requests are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for the process, quality expectations, and contribution terms. When updating this README, update the [Portuguese version](README.md) in the same change.

## Security

To report a vulnerability, follow the responsible disclosure guidance in [SECURITY.md](SECURITY.md). This repository covers the client; the private API and infrastructure have a separate scope.

## License and ownership

The client source is available under a custom *source-available* license. You may study it and use it to prepare contributions within the limits of [LICENSE](LICENSE). There is no general permission for commercial use or for redistributing your own application versions or binaries. The API and production infrastructure remain private. The Anceryx brand, Kaoli mascot, and other visual identity assets are reserved. See the [third-party notices](docs/legal/third-party-notices.md) and [brand asset notes](docs/brand/brand-assets.md) as well.

## Official links

- [Anceryx website](https://www.anceryx.site)
- [Anceryx GitHub organization](https://github.com/Anceryx)
- [Repository scope documentation](docs/project/public-repository-scope.md)
