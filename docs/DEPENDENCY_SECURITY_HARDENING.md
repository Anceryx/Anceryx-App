# Dependency and Electron Security Hardening

## Scope

This document records the 13.11-F2 dependency review for the Electron root.
It covers the distributed desktop runtime, the build toolchain, and the
boundary between development-only tooling and the production API package.

No `npm audit fix --force`, arbitrary override, audit suppression, or
unrelated major dependency migration was used.

## Audit result

The starting report contained 25 findings: 1 critical, 16 high, and 8
moderate. After targeted updates and a final metadata refresh, the current
root audit reports:

- Critical: 0
- High: 0
- Moderate: 0
- `npm audit --omit=dev`: 0

An intermediate audit response reported eight moderate findings in the
electron-builder download/logging chain. The human-readable and JSON audits
were rerun after the final install and both now report zero findings. No
force fix, arbitrary override, or downgrade was used.

The direct toolchain versions are now:

- Electron `44.7.0`
- electron-builder `26.17.0`
- electron-updater `6.8.9`
- electron-vite `5.0.0`
- Vite `7.3.7`
- Tailwind `4.3.3` with `@tailwindcss/postcss`
- React Router `7.18.4`

The Tailwind v4 migration uses the official PostCSS plugin and preserves the
existing project config through the `@config` directive. No application
feature behavior was changed by the migration.

## Electron security review

The main window keeps the existing defensive boundary:

- `contextIsolation: true`
- `nodeIntegration: false`
- `sandbox: true`
- restrictive CSP in the main process
- local navigation only for `will-navigate`
- new windows denied by default
- external navigation limited to explicit HTTPS host allowlists
- renderer-to-main external URL validation repeated in the main process
- secrets retained through Electron safeStorage, not renderer storage

The built runtime is pinned to Electron `44.7.0` in the root lockfile. A
Windows installer smoke remains environment-blocked by the existing
`winCodeSign` symlink requirement; that is separate from the runtime version
and must be cleared before claiming Windows beta packaging readiness.

## Residual risks and next actions

- Run the signed Windows installer smoke on a packaging-capable Windows host.
- Keep production builds isolated from untrusted project inputs and restrict
  access to the package-builder environment.
- Treat a clean audit as evidence for the scanned dependency graph, not as a
  guarantee that no vulnerability exists.
