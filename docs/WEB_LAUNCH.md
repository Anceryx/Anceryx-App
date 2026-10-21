# Preparação do lançamento Web e Windows

## Estado nesta revisão

- O repositório do site institucional identificado foi `oliveiradev1/anceryx-site` (HTML/CSS/JavaScript), em `anceryx-site`, commit base `d5e8d3238cd48b74601a36f61323f783988de169`. A home agora mostra o CTA Web desativado “Em breve”, encaminha Windows à página informativa e apresenta os estados das três plataformas. Nenhum download público foi anunciado. A alteração é local, sem QA visual ou publicação.
- O cliente tem uma configuração Vercel dedicada à build Web: `npm ci`, `npm run build:web`, saída `web-dist`, Node.js 22 (`package.json` e `.nvmrc`) e fallback para `index.html`. Configure um projeto Vercel separado para este repositório e associe `app.anceryx.site` somente depois de concluir o QA.
- Configure `VITE_ANCERYX_API_URL=https://api.anceryx.site` nas variáveis Production do projeto Web. É uma URL pública, não um segredo. Não há variável privada `VITE_`.
- Builds Preview podem ser gerados, mas a API ainda aceita uma única origem Web exata (`WEB_APP_ORIGIN`). Login, cookies e OAuth em previews não estão aprovados nem garantidos. Não exponha links de Preview como produto.
- O site ainda não tem URL pública estável de instalador aprovada. A página `/download` permanece informativa; não publique um link de Artifact temporário.

## API e cookies Web

`app.anceryx.site` e `admin-anceryx.site` são sites registráveis diferentes. O cookie host-only criado em `admin-anceryx.site` é cross-site quando chamado pelo app Web e pode ser bloqueado em políticas de cookies de terceiros. A estratégia recomendada é servir a API também em `api.anceryx.site`, mantendo `admin-anceryx.site` para os clientes existentes. Sob HTTPS, `app.anceryx.site` e `api.anceryx.site` são same-site; o cookie permanece host-only de `api.anceryx.site`, com `HttpOnly`, `Secure` e `SameSite=Lax`.

O código da API já exige origem exata e não precisa compartilhar o cookie com o domínio do site. A documentação do SquareCloud descreve associação de domínio próprio, mas não confirma se a conta atual aceita um segundo domínio para a mesma aplicação; isso precisa ser confirmado no painel sem remover o host atual. Se a plataforma não permitir os dois hosts, a alternativa é um proxy de mesma origem no Vercel, sujeito a QA de WebSocket, uploads, Range/streaming e cookies. Não trocar para `SameSite=None` como contorno para bloqueio de cookies de terceiros. Antes de habilitar login Web em produção, configurar e verificar na SquareCloud:

```text
WEB_APP_ORIGIN=https://app.anceryx.site
CORS_ORIGINS=<origens atuais preservadas>,https://app.anceryx.site
WEB_GOOGLE_REDIRECT_URI=https://api.anceryx.site/auth/google/web/callback
GOOGLE_REDIRECT_URI=https://admin-anceryx.site/auth/google/callback
APP_PUBLIC_URL=https://admin-anceryx.site
```

Não substitua o callback desktop. O alias `api.anceryx.site`, TLS, `/health` e o CORS real precisam ser confirmados antes de publicar o cliente Web. Isto exige configuração de domínio no painel SquareCloud; nenhum registro DNS, variável remota ou deploy foi alterado aqui.

## Google OAuth

O backend constrói os callbacks no servidor, valida `state`, `nonce` e PKCE e troca o código na API. O endereço `https://anceryx.site/auth/google/callback` não é servido pela implementação atual e não deve permanecer como callback ativo.

| Fluxo e ambiente | Origem JavaScript autorizada | Redirect URI exato | Cliente OAuth | Rota responsável | Configuração |
|---|---|---|---|---|---|
| Electron, produção e builds desktop atuais | Não aplicável; o OAuth abre no navegador do sistema | `https://admin-anceryx.site/auth/google/callback` | `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` atuais no backend; tipo e URI registrados precisam ser confirmados no Console | API `/auth/google/callback` | `GOOGLE_REDIRECT_URI`; preservar no cliente OAuth atual |
| Web, produção proposta | Nenhuma; a autorização começa por requisição à API, sem Google Identity Services no navegador | `https://api.anceryx.site/auth/google/web/callback` | Mesmo cliente configurado em `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` no backend; confirmar tipo e registro no Console | API `/auth/google/web/callback` | `WEB_GOOGLE_REDIRECT_URI`; cadastrar somente após o alias API ser comprovado |

Os dois fluxos usam `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` no backend, salvo decisão posterior de separar clientes OAuth. Não é possível confirmar a configuração atual do Google Cloud sem acesso ao Console. O Google exige correspondência exata do redirect URI.

## DNS e Vercel

A consulta DNS local encontrou `nebula.dns-parking.com` e `aurora.dns-parking.com` como nameservers de `anceryx.site`, e `www` aponta para um alvo Vercel. Portanto, a zona autoritativa observada é administrada pela Hostinger; confirme novamente no momento da alteração. Não altere `www`, o domínio raiz ou `admin-anceryx.site` para esta implantação.

Para `app.anceryx.site`, adicione apenas o registro e a verificação TXT exibidos pelo projeto/domínio no painel Vercel. Para `api.anceryx.site`, adicione no SquareCloud o subdomínio e use exatamente o CNAME e os TXT que o painel fornecer. Os destinos de validação são específicos e não devem ser inferidos dos registros de `www` ou de outros serviços. Verifique o certificado HTTPS antes de habilitar cookies.

## Distribuição Windows

O workflow `.github/workflows/windows-release.yml` é manual (`workflow_dispatch`), instala Node.js 22, valida a origem, compila NSIS sem publicar e disponibiliza um Artifact de revisão por três dias. Isso não cria uma URL permanente para o público nem uma Release oficial. A distribuição pública estável proposta é uma Release aprovada no repositório `Anceryx/Updates`; o URL exato do asset depende da existência/visibilidade do repositório, do nome do instalador que passar no QA e da publicação aprovada. Não inventar antecipadamente uma URL `/latest/download/...`. O site não deve anunciar um instalador até haver um arquivo aprovado e distribuído por URL HTTPS estável.

Para QA, execute manualmente o workflow apenas depois de publicar/revisar o commit escolhido. Teste assinatura/aviso de editor, SHA-256, instalação, login, atualização e desinstalação. Nenhum instalador foi gerado nesta tarefa.

## Ordem segura

1. Fazer QA visual desktop/mobile da home alterada e revisar o commit local do site antes de publicar. Manter Web “Em breve” e Windows apontado à página informativa até existir instalador aprovado.
2. Criar o projeto Vercel separado para `Anceryx-App`, configurar domínio, Node.js 22, build e URL pública da API; validar rewrite e cabeçalhos na resposta real.
3. Configurar `api.anceryx.site` na SquareCloud e confirmar DNS, TLS e saúde sem remover `admin-anceryx.site`.
4. Configurar a origem/CORS e os callbacks OAuth na API e no Google Cloud. Fazer deploy controlado e testar a sessão com bloqueio de cookies de terceiros.
5. Fazer QA Web real, incluindo login, MFA, OAuth, logout, rotas diretas, mídia, uploads, realtime, chamadas e mobile. Habilitar o CTA Web apenas após aprovação.
6. Gerar Artifact Windows por workflow manual, executar QA e definir distribuição permanente antes de alterar o CTA de download.

Sem QA de navegadores reais e confirmação das configurações externas, a Web não está pronta para divulgação pública.
