# Third-party notices inventory

This is a technical preparation inventory based on installed package metadata, package.json, and the committed lockfile. It is not a substitute for a release-time, lockfile-complete notice report. The expanded dependency summary is in [the dependency license inventory](third-party-license-inventory.md). Transitive dependencies and Electron/Chromium/Node distribution notices must be regenerated and reviewed before publication.

## Direct runtime dependencies

| Package | Version | Declared license | Classification |
| --- | --- | --- | --- |
| lucide-react | 0.414.0 | ISC | Permissive |
| react | 18.3.1 | MIT | Permissive |
| react-dom | 18.3.1 | MIT | Permissive |
| react-router-dom | 7.18.4 | MIT | Permissive |
| zustand | 4.5.7 | MIT | Permissive |

## License review note

`lightningcss@1.32.0` and the optional `lightningcss-win32-x64-msvc@1.32.0` package declare MPL-2.0. They are transitive development dependencies in the Tailwind PostCSS build chain; no project patches were found. Upstream source: [lightningcss v1.32.0](https://github.com/parcel-bundler/lightningcss/tree/v1.32.0). See the [Mozilla MPL 2.0 FAQ](https://www.mozilla.org/en-US/MPL/2.0/FAQ/). Preserve applicable notices and verify the exact packaged artifact and any source-availability obligations before distribution. This is a technical notice, not legal approval.

The current lockfile path is `@tailwindcss/postcss` → `@tailwindcss/node` → `lightningcss` → the optional Windows binary; Vite also declares Lightning CSS as an optional development peer. `npm ls --omit=dev lightningcss lightningcss-win32-x64-msvc` confirms neither package is in the installed production dependency tree. The app build uses Lightning CSS during Tailwind CSS processing, but the generated client output contains no Lightning CSS package files; the generated License Center JSON does include package/license records. The [electron-builder v26 contents documentation](https://www.electron.build/v26/docs/contents/) states that development dependencies are excluded from packaged applications and only production dependencies are included. No final Windows installer/ASAR was available for inspection in this audit, so the actual release artifact remains unverified. This evidence supports a build-time classification; it is not a legal conclusion about all source or binary distribution obligations.

## Direct build and development dependencies

| Package | Version | Declared license | Classification |
| --- | --- | --- | --- |
| @types/node | 20.19.43 | MIT | Development |
| @types/react | 18.3.31 | MIT | Development |
| @types/react-dom | 18.3.7 | MIT | Development |
| @vitejs/plugin-react | 4.7.0 | MIT | Development |
| electron | 44.7.0 | MIT | Development/runtime distribution review |
| electron-builder | 26.17.0 | MIT | Development |
| electron-vite | 5.0.0 | MIT | Development |
| postcss | 8.5.29 | MIT | Development |
| tailwindcss | 4.3.3 | MIT | Development |
| typescript | 5.9.3 | Apache-2.0 | Development |
| vite | 7.3.7 | MIT | Development |

No SSPL, BUSL, or LGPL package was identified among these direct dependencies. An installed-metadata scan found four no-license package manifests, all test fixtures under resolve/test/resolver, and zero unknown-license manifests among the actual dependency packages inspected. caniuse-lite carries CC-BY-4.0 metadata and requires attribution review. Do not remove upstream copyright or license notices.
