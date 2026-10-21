# Anceryx — relatório de preparação Apache 2.0

**Data:** 20/10/2026
**Repositório:** `Anceryx/Anceryx-App`
**Estado:** migração sincronizada em `main`; repositório continua privado.

## Proveniência e direitos

- A análise do repositório histórico privado `Anceryx/Anceryx-App-antigo` encontrou 290 commits em `main`. Foram registrados 273 commits por `Daniel Oliveira <danieloliveiradev26@gmail.com>` e 9 por `Oliveira` com o mesmo endereço; os 4 commits de `Anceryx <anceryxapp@gmail.com>` e seus merges correspondem a contribuições de código de Daniel. Os 4 commits de `dependabot[bot]` são atualizações de dependências. Não foram encontrados coautores externos no histórico inspecionado; identidades de commit são evidência de proveniência, não prova jurídica isolada de titularidade.
- Os arquivos de código-fonte e scripts examinados são atribuídos no histórico a Daniel. Não foram encontrados arquivos de código de terceiros incorporados ou cabeçalhos de copyright/SPDX externos nos caminhos de código examinados. Dependências continuam sob suas próprias licenças. Não foi encontrada contribuição externa de código que impeça a relicença. O histórico integral permanece somente no repositório privado antigo.
- O proprietário autorizou expressamente a publicação dos assets da Anceryx sobre os quais detém direitos, incluindo Kaoli, emojis, badges, ícones, banners e identidade visual. A autorização não afirma direitos desconhecidos de terceiros.
- Os 60 arquivos gráficos foram revisados: 51 PNGs por inspeção visual e metadados; 9 SVGs por estrutura e referências. Não houve indício concreto de marca, material ou origem incompatível de terceiros. 59 dos arquivos aparecem no histórico antigo e o banner `.github/assets/anceryx-banner.png` não; a autorização expressa cobre os direitos controlados sobre ele. Não se exigiu histórico individual de criação para cada asset. Nenhum asset foi removido ou modificado.

## Licença e documentação

- `LICENSE` contém o texto oficial integral Apache License 2.0; SPDX `Apache-2.0` consta em `package.json` e `package-lock.json`.
- `NOTICE`, `CONTRIBUTING.md`, `README.md`, `README.en.md`, `CHANGELOG.md` e documentação de licenças foram revisados. O código Apache 2.0 não contém restrições comerciais ou concorrenciais adicionais. A licença não concede direitos gerais sobre a marca Anceryx.
- `ASSETS_LICENSE.md` mantém os assets sob política separada, limitada aos direitos efetivamente controlados pela Anceryx. Direitos de terceiros não são relicenciados.
- `npm run audit:licenses` analisou 384 pacotes e sinalizou 2 itens de revisão técnica/jurídica relacionados a `lightningcss` e sua variante Windows. `caniuse-lite` tem atribuição CC-BY-4.0 registrada. Notices exatos de Electron/Chromium/Node para futuro artefato distribuído ainda dependem da inspeção desse artefato.

## Validações

- `npm run test:license-audit`: passou (2/2); precisou de execução fora do sandbox após `spawn EPERM` no runner restrito.
- `npm audit --omit=dev --audit-level=moderate`: 0 vulnerabilidades de produção. Auditoria anterior identificou 8 moderadas somente na árvore de desenvolvimento, na cadeia usada por `electron-builder`; não foi aplicada correção forçada.
- `gitleaks dir --redact=100 --no-banner .`: sem vazamentos encontrados.
- `git diff --check`: passou. Inventário da política confere com 60 assets.
- Validações anteriores deste clone: `npm ci`, typecheck, build, testes direcionados da CI e verificação de links/exportação passaram. O build gerou 360 registros de licenças; exportação allowlist produziu 241 arquivos.
- O conector GitHub não encontrou workflow runs nem status checks associados ao commit novo. Portanto, CI, secret scan e license compliance hospedados não estão comprovados como executados.

## GitHub e sincronização

- Branch `main`; os quatro commits originais foram preservados e enviados sem reescrita, seguidos de um quinto commit que registra a autorização e a revisão dos assets:
  - `436a3f5 docs(license): adopt Apache License 2.0`
  - `c2a7492 docs(brand): separate artwork usage rights`
  - `0c3f04f docs(contributing): align contributions with Apache 2.0`
  - `71fce58 docs(readme): document open source policy`
  - `03fd2af docs(brand): record owner authorization and asset review`
- Push normal concluído: `main` avançou de `ab6686b92f8718c5163d2b339d4118d61a57c0fc` para `03fd2afea61bff9ce0241d83d3d6c2670e0904f6`. A API GitHub reconheceu o commit enviado.
- A visibilidade foi confirmada como `private`. A tag `v0.15.0` permaneceu no objeto `ece96ecf9ac74b970ae54003297352200dbe9182` na verificação imediatamente anterior ao push. Nenhuma Release foi alterada. O estado específico da Release Draft não pôde ser confirmado pela integração.
- Nenhum deploy, migração de banco, alteração de API, mudança de tag ou publicação de Release foi feito. Não houve mudança para visibilidade pública.

## Conclusão e pendências

**Existe impedimento concreto identificado para publicar o código-fonte da Anceryx sob Apache 2.0?** Não foi identificado impedimento concreto após a revisão do histórico, das contribuições e dos arquivos de código examinados. A abertura pública está tecnicamente preparada, sujeita à decisão do proprietário e às suas responsabilidades jurídicas. Esta conclusão não representa parecer jurídico nem prova de direitos desconhecidos de terceiros.

Pendências técnicas específicas: revisar os dois itens de `lightningcss` no relatório de licenças e verificar os notices do artefato Electron/Chromium/Node quando houver pacote de distribuição. O estado da Release Draft permanece não confirmado; ela não foi modificada. A visibilidade pública permanece pendente de decisão do proprietário.
