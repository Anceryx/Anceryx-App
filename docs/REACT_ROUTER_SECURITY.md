# React Router security review

## Dependency decision

The root application was upgraded from `react-router-dom` 6.30.6 to
`react-router-dom` 7.18.4. This also updates `react-router` to 7.18.4 and
removes the v6 `@remix-run/router` dependency. React Router v7 supports React
18 and Node 20, which matches the Electron client toolchain.

## Advisories reviewed

- `GHSA-wrjc-x8rr-h8h6` / `CVE-2026-53669`: moderate open redirect through
  backslash handling in `Link` and `useNavigate`; patched in 7.18.0. The
  previous 6.30.6 dependency was in the affected range.
- `GHSA-337j-9hxr-rhxg` / `CVE-2026-53666`: moderate constructor injection in
  SSR error hydration; patched in 7.18.0. Anceryx does not use SSR,
  `hydrateRoot`, Framework Mode, or manual SSR hydration, so this attack path
  is not present in the Electron renderer.

## Application review

Anceryx uses `createHashRouter` and `RouterProvider` in Data Mode. It does not
use `BrowserRouter`, `HashRouter`, `MemoryRouter`, `createBrowserRouter`, SSR,
or hydration APIs. Navigation targets are internal constants (`/login`,
`/register`, `/app`, and the billing result route); no attacker-controlled
string is passed to `navigate` or a router link.

External navigation is independent of React Router. The preload and main
process allow only HTTPS URLs on the explicit Anceryx, Stripe, and Google
host allowlists. Electron `will-navigate` blocks non-local navigation and
`setWindowOpenHandler` denies renderer-created windows. Dangerous schemes and
invalid URLs are rejected.

## Validation policy

The v7 migration is intentionally limited to the dependency and lockfile.
Nenhuma refatoração de rotas, autenticação, faturamento, Electron, React ou Vite foi
required. React Router v8 was not considered because it would be unrelated to
this fix and has a newer runtime baseline.

## Audit result

The React Router advisories are absent after the upgrade. `npm audit
--omit=dev` reports zero vulnerabilities. The current full root audit reports
25 findings (8 moderate, 16 high, 1 critical) in the existing Electron,
electron-builder, Vite, Tailwind, and build-tool dependency chain. Those are
separate from the two React Router advisories and were not changed with
overrides or a blind major upgrade in this focused fix; they remain a separate
dependency-hardening task before a production desktop release.
