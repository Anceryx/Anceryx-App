# Dependency adoption policy

This policy applies before adding a new dependency to Anceryx. It does not
approve the current dependency set or replace legal/security review.

1. **Need:** document the user-facing or security-critical functionality and
   why existing platform code cannot provide it.
2. **Maintenance:** check release cadence, supported runtimes, issue response,
   maintainer continuity and whether the project is archived.
3. **Security:** review advisories, vulnerability history, install scripts,
   native code, transitive depth and the project’s security practices.
4. **Provenance:** verify the official package/repository, publisher, source
   history and integrity. Popularity and downloads are signals, never a
   guarantee.
5. **Compatibility:** validate Electron main/preload/renderer boundaries,
   supported OS/architectures, bundle size, performance and security boundaries.
6. **License:** record the SPDX expression, copyright, notices, attribution,
   source obligations and whether it affects the client, backend or
   distribution. Copyleft or unknown licenses require explicit approval.
7. **Supply chain:** inspect lifecycle scripts, native prebuilds, provenance,
   lockfile resolution, maintainers and update behavior. Never add a package
   solely to obtain a convenient feature without this review.
8. **Evidence:** update the inventory, notices and relevant docs; run typecheck,
   build, relevant tests, npm audit, license audit, secret scan and diff checks.

A auditoria de licenças aponta metadados pendentes ou que exigem revisão no conjunto de dependências instalado. Avalie cada apontamento com base no artefato exato antes da distribuição; o relatório automatizado não equivale a aprovação jurídica. Não há exceções de licença específicas de funcionalidades neste documento.
