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

Anceryx may review, request changes to, decline, or incorporate a submitted contribution. By submitting code, documentation, or other material for inclusion, you represent that you have the right to submit it and grant Anceryx a worldwide, perpetual, irrevocable, non-exclusive, royalty-free license to use, reproduce, modify, create derivative works from, distribute, and sublicense that contribution as incorporated in Anceryx software and its successor versions, in source or binary form. You retain ownership of your contribution. This grant does not give you rights to Anceryx trademarks or other contributors' work.

Do not submit material that you cannot license on these terms. A contribution may be edited for consistency, security, compatibility, or maintenance. This contribution grant should be reviewed by qualified counsel before public launch.

## License

Use of the client source and forks is governed by the custom source-available terms in [LICENSE](LICENSE). Contributions do not change those terms for the project as a whole.
