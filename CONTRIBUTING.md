# Contributing to Anceryx

Thank you for your interest in improving the Anceryx desktop client. Contributions are welcome for bug fixes, accessibility and usability improvements, themes, documentation, and new client features.

## Before opening an issue

- Search existing issues for a related report.
- Describe the expected behavior and what happened, with clear reproduction steps where possible.
- Include the client version and operating system when relevant.
- Do not include credentials, personal data, private messages, production records, or exploitable vulnerability details. Follow [SECURITY.md](SECURITY.md) for security reports.

## Pull requests

1. Fork the public client repository and create a focused branch.
2. Keep the change scoped and follow existing React, TypeScript, Electron, and shared-contract patterns.
3. Do not add backend/API code, secrets, `.env` files, production data, generated output, or third-party material without its required notices and license review.
4. Run relevant checks. For most changes, run `npm run typecheck`, `npm run build`, and targeted test scripts listed in `package.json`.
5. Review `git diff --check` and confirm the diff contains only intended files.
6. Open a pull request with a concise summary, motivation, test results, and screenshots for visual changes where useful.

## Commit messages and version history

Use a short, descriptive commit subject in the Conventional Commits style, such as `fix(profile): preserve avatar crop` or `docs(readme): clarify setup`. Keep each commit focused. Do not create release tags or publish binaries from a contribution branch. Maintainers update `CHANGELOG.md` and choose release versions after reviewing the changes. The changelog must describe only implemented and validated behavior; planned work belongs in an issue or roadmap.

Escreva o assunto do commit de forma curta e descritiva, seguindo o padrão Conventional Commits, por exemplo: `fix(profile): preserve avatar crop` ou `docs(readme): clarify setup`. Mantenha cada commit focado. Não crie tags de versão nem publique binários em uma branch de contribuição. Os mantenedores atualizam o `CHANGELOG.md` e definem as versões após revisar as alterações. O changelog deve descrever apenas comportamentos implementados e validados; trabalho planejado deve ficar em uma issue ou no roadmap.

## Documentation and translations

The repository maintains a Portuguese (Brazil) README in `README.md` and an English version in `README.en.md`. Whenever one README changes, update the other in the same pull request so both versions remain equivalent in structure and information. Translation corrections and wording improvements in either language are welcome.

The client integrates with a private API. Changes must not assume access to private backend source, expose private service details, or move authentication, authorization, privacy, moderation, or billing authority into the client.

## Review and contribution terms

By intentionally submitting a contribution for inclusion in this project, you agree that it is submitted under the Apache License 2.0, as described in section 5 of that license, without additional terms. You retain ownership of your contribution; no copyright assignment or separate broad license grant is required by this guide. Submit only material that you have the right to contribute under Apache 2.0. Identify third-party code and retain its required notices and license terms.

Do not include official Anceryx artwork in a contribution unless its use is permitted by [ASSETS_LICENSE.md](ASSETS_LICENSE.md). Contributions proposing changes to protected assets may include the material needed for review and a pull request under that policy. A pull request is not required: you may use, modify, and distribute code under Apache 2.0 without sending changes to Anceryx.

## License and independent projects

The client code is licensed under [Apache License 2.0](LICENSE) (`Apache-2.0`). Forks and independent applications may use, modify, and redistribute that code, including commercially, subject to Apache 2.0. Keep the license and applicable notices, and mark modified files prominently when distributing them. The license does not grant rights to the Anceryx name, trademarks, official artwork, private API, or infrastructure. See [ASSETS_LICENSE.md](ASSETS_LICENSE.md) for the separate asset policy.
