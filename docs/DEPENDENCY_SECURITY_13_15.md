# Dependency security review — 13.15

The ten open Dependabot alerts were inspected through the authenticated
GitHub Security API on 2026-10-09. They are development-scope dependencies,
not runtime production dependencies of the API.

| Alert | Package | Vulnerable range | First patched version | Result |
|---:|---|---|---|---|
| 1 | esbuild | <=0.24.2 | 0.25.0 | Patched reachable versions; Drizzle Kit still carries deprecated @esbuild-kit/core-utils with esbuild~0.18.20, so residual dev-tool risk remains |
| 2 | vite | <=6.4.1 | 6.4.2 | Patched through Vitest 4.1.11 / Vite 8.3.4 |
| 3 | vitest | <3.2.6 | 3.2.6 | Patched; API uses Vitest 4.1.11 |
| 4 | vite | <=6.4.2 | 6.4.3 | Patched through Vite 8.3.4 |
| 5 | launch-editor | advisory reports vite path | 6.4.3 | Patched through Vite 8.3.4; alert package metadata is inconsistent and remains monitored |
| 6 | @vitest/mocker | >=2.1.0, <4.1.11 | 4.1.11 | Patched |
| 7 | vitest | >=2.1.0, <4.1.11 | 4.1.11 | Patched |
| 8 | tinypool | <2.1.2 | 2.1.2 | Patched through Vitest 4.1.11 |
| 9 | tinypool | <=2.1.0 | 2.1.1 | Patched through Vitest 4.1.11 |
| 10 | sprintf-js | <=1.1.3 | none published | Remains open; transitive development-only chain from Electron Builder, no safe patched release exists |

The API lockfile now uses vitest 4.1.11, @vitest/mocker 4.1.11,
tinypool 2.2.0, vite 8.3.4, and esbuild 0.28.2. drizzle-kit was
updated to 0.31.11.

npm audit reports zero vulnerabilities in both projects after installation.
The Dependabot alerts remain open until GitHub rescans the pushed lockfile;
the two residual cases above must not be dismissed as false positives.

Mitigations for unresolved development tooling:

- Vitest UI and development servers are not exposed or enabled in production.
- No untrusted format strings are passed to the Electron Builder toolchain.
- Development dependencies are not shipped as API runtime dependencies.
- Dependabot remains enabled with separate weekly update streams and no
  automatic merge.
