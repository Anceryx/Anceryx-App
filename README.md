<p align="center">
  <img src=".github/assets/anceryx-banner.png" alt="Anceryx" width="100%" />
</p>

🇧🇷 **Português (Brasil)** | [🇺🇸 English](README.en.md)

# Anceryx

Uma plataforma social em desenvolvimento, reunindo experiências de comunidade em um aplicativo para desktop.

## Sobre o projeto

Este repositório contém o aplicativo cliente da Anceryx, desenvolvido com Electron, React e TypeScript. Ele oferece uma interface desktop para interações sociais e comunidades. A disponibilidade de cada recurso depende da versão do cliente e dos serviços oficiais em operação.

## Funcionalidades

- Feed social, Explorar e perfis
- Mensagens diretas e interfaces de chamadas
- Fóruns com espaço de comunidade integrado e canais organizados
- Temas, experiências premium, insígnias e conquistas
- Aplicativo desktop construído com Electron

Essas áreas fazem parte do produto em desenvolvimento. A lista não significa que todos os recursos estejam disponíveis em todos os ambientes.

No aplicativo Electron, textos não enviados de DMs, canais, tópicos e publicações podem ser recuperados após reabrir o cliente. Eles são armazenados localmente em arquivo cifrado pelo `safeStorage`, separados por conta e contexto, com limite de 500 rascunhos e retenção de 30 dias. Anexos, previews temporários e sincronização entre dispositivos não fazem parte desse armazenamento.

## Tecnologias

- Electron
- React e TypeScript
- Vite com electron-vite
- Integração HTTP e WebSocket com a API oficial da Anceryx

## Estrutura do repositório

| Diretório | Conteúdo |
| --- | --- |
| `src/main/` | Processo principal do Electron, janelas e integração desktop |
| `src/preload/` | Ponte controlada entre o Electron e a interface |
| `src/renderer/` | Interface do aplicativo em React |
| `src/shared/` | Tipos e contratos compartilhados pelo cliente |
| `resources/` | Recursos usados no empacotamento do aplicativo |
| `scripts/` | Verificações e utilitários de desenvolvimento |
| `docs/` | Documentação do cliente, licenças e distribuição |

A API, o banco de dados e a infraestrutura de produção não fazem parte deste repositório. Eles permanecem privados e são operados separadamente.

## Situação do desenvolvimento

A Anceryx está em desenvolvimento ativo. O código deste repositório corresponde ao cliente; ele não comprova que cada funcionalidade esteja concluída, disponível publicamente ou pronta para produção.

## Executar localmente

Requisitos: Node.js 22 e npm.

```sh
npm ci
npm run dev
```

Durante o desenvolvimento, o cliente usa `http://localhost:3000` por padrão. O arquivo `.env.example` aponta para a API oficial. Defina `VITE_ANCERYX_API_URL` conforme o ambiente desejado; nunca coloque segredos em variáveis `VITE_*`. O repositório privado da API não é necessário para instalar ou compilar o cliente.

Verificações úteis:

```sh
npm run typecheck
npm run build
npm run test:api-config
npm run test:connection-config
npm run test:update-security
npm run test:community-workspace-layout
npm run test:encoding
```

## Instalação e atualizações

O repositório está em preparação para distribuição; a Release `v0.15.0` não contém instalador. Consulte [instalação e atualizações do Windows](docs/INSTALLATION.md). Builds de revisão são artifacts temporários, não Releases. O atualizador integrado está pausado até que o cliente possa verificar manifests assinados com Ed25519; atualizações serão manuais nesse período. A migração de instalações antigas exige baixar a versão aprovada na página Releases e instalar sobre a versão atual, após QA de preservação dos dados.

## Contribuições

Contribuições por Issues e Pull Requests são bem-vindas. Consulte [CONTRIBUTING.md](CONTRIBUTING.md) para conhecer o processo, os padrões de qualidade e os termos aplicáveis às contribuições. Ao atualizar este README, atualize também o [README em inglês](README.en.md) na mesma alteração.

## Segurança

Para relatar uma vulnerabilidade, siga as orientações de divulgação responsável em [SECURITY.md](SECURITY.md). Este repositório cobre o cliente; a API e a infraestrutura privada têm escopo separado.

## Licença e propriedade

**Código-fonte do cliente:** licenciado sob a Apache License 2.0 (SPDX: `Apache-2.0`). Dentro do escopo dessa licença, é permitido estudar, modificar, redistribuir e usar comercialmente o código, inclusive em projetos independentes e concorrentes, desde que as condições da licença sejam cumpridas. A licença não exige que alterações sejam enviadas ao projeto oficial.

**Marca e assets oficiais:** não são licenciados sob Apache 2.0. O proprietário autorizou a publicação dos assets da Anceryx sobre os quais possui direitos, sujeitos à [política separada de assets](ASSETS_LICENSE.md) e ao [inventário da marca](docs/brand/brand-assets.md). A revisão dos arquivos não encontrou indicadores concretos de conteúdo de terceiros; essa autorização não se estende a direitos de terceiros que a Anceryx não detenha.

**API, banco de dados e infraestrutura:** permanecem privados e fora deste repositório. **Dependências de terceiros:** mantêm suas próprias licenças e avisos. Consulte os [avisos de terceiros](docs/legal/third-party-notices.md) e as [notas de licenciamento](docs/legal/licensing-notes.md). A Apache 2.0 não concede direitos sobre a marca Anceryx nem implica que um derivado seja um produto ou serviço oficial.

## Links oficiais

- [Site da Anceryx](https://www.anceryx.site)
- [Organização Anceryx no GitHub](https://github.com/Anceryx)
- [Documentação do escopo deste repositório](docs/project/public-repository-scope.md)
