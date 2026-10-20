# Dependency audit evidence

Validation was performed without `npm audit fix --force` or arbitrary
overrides. The React Router and Electron/build-tool updates were applied
individually and validated with the Electron build and security smokes.

## Current resolved versions

- `react-router-dom`: `7.18.4`
- `react-router`: `7.18.4`
- `electron`: `44.7.0`
- `electron-builder`: `26.17.0`
- `electron-updater`: `6.8.9`
- `electron-vite`: `5.0.0`
- `vite`: `7.3.7`
- `tailwindcss`: `4.3.3`
- root package: `0.13.2-alpha.1` (current reference)
- exported snapshot package: `0.12.0-alpha.1`

## Results

License findings are classified technically, not approved legally. Recognized
`MPL-2.0` metadata such as `lightningcss` is reported as `review`, while
unknown expressions and unapproved copyleft remain blocking findings.

Na auditoria local de 2026-10-10, os dois apontamentos eram
`lightningcss@1.32.0` e `lightningcss-win32-x64-msvc@1.32.0`, ambos declarados
como MPL-2.0. O segundo é o binário opcional específico do Windows x64. Ambos
fazem parte da cadeia de build do Tailwind/PostCSS; o pacote Electron inclui
`out/**/*`, e não `node_modules`. Isso reduz a probabilidade de esses pacotes
serem distribuídos no instalador, mas não substitui a inspeção do pacote
construído, dos avisos e dos arquivos gerados. Mantenha a revisão MPL aberta
até essa conferência; o auditor sinaliza a classificação para revisão e não
declara infração nem aprovação jurídica.

On the earlier full-install validation rerun, the root install reported:

- `npm audit`: `0 vulnerabilities`
- `npm audit --omit=dev`: `0 vulnerabilities`

An intermediate audit index returned eight moderate builder-chain findings
before the final dependency metadata refresh. That result was rechecked with
both the human-readable and JSON audit commands; neither reports a remaining
advisory now. The original 25-alert report therefore ended at zero critical,
zero high, zero moderate, and zero total findings without a force fix or an
arbitrary override.

A auditoria de licenças anterior da versão `0.13.0-alpha.1` está desatualizada.
Execute novamente `npm run audit:licenses` com o lockfile atual e revise o
artefato empacotado antes de qualquer distribuição.
