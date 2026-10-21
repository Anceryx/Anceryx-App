# Aplicativo Web da Anceryx

## Arquitetura atual

A versão Web é compilada a partir do renderer React/TypeScript existente em `src/renderer`. Ela compartilha páginas, stores, serviços de API, estilos e componentes com o aplicativo Electron. O build Web usa Vite em `vite.web.config.ts`; o build Electron continua usando `electron-vite` e o protocolo `app://anceryx`.

O renderer escolhe `BrowserRouter` para Web e mantém `HashRouter` no desktop. A build estática gera `web-dist/index.html`, os assets e `web-dist/vite.html`, fallback SPA solicitado pela documentação atual da Square Cloud para rotas diretas do Vite.

## Comandos

Na pasta `Anceryx-App`:

```text
npm run dev:web
npm run typecheck:web
npm run build:web
npm run preview:web
```

O build usa `https://admin-anceryx.site` por padrão. `VITE_ANCERYX_API_URL` é uma configuração pública e não deve conter credenciais. O desenvolvimento local usa `http://localhost:3000` quando nenhuma URL é fornecida.

## Rotas web disponíveis

- `/login` e `/register`
- `/auth/callback` para concluir o handoff OAuth Web de uso único
- `/app` e `/app/billing/:result`
- `/posts/:id`
- `/foruns/:id`
- `/perfil/:username` e `/profile/:username`
- `/invite/:token`

Links sociais encaminham para as páginas e estados compartilhados existentes. As rotas protegidas preservam o destino durante login/cadastro; dados privados continuam sob autorização da API. Isso não substitui testes de navegação ponta a ponta com contas reais de QA.

## Sessão Web e configuração necessária na API

O desktop mantém seu refresh token no armazenamento protegido do Electron. No navegador, o refresh token não é gravado em `localStorage`: a API o define em cookie host-only, `HttpOnly`, `Secure` em HTTPS e `SameSite=Lax`. O access token permanece somente em memória no renderer. Requisições de autenticação Web enviam `X-Anceryx-Platform: web`; a API exige `Origin` exatamente igual a `WEB_APP_ORIGIN`, faz rotação do refresh token, encerra a sessão pelo cookie e evita cache das respostas de sessão. O fluxo desktop continua usando o corpo JSON anterior.

Antes de habilitar autenticação Web em produção, configurar na API:

- `WEB_APP_ORIGIN=https://app.anceryx.site`
- `CORS_ORIGINS` com essa origem exata, além das origens existentes e `app://anceryx` necessárias aos clientes atuais
- `WEB_GOOGLE_REDIRECT_URI=https://admin-anceryx.site/auth/google/web/callback`, caso o Google Web seja habilitado
- A mesma callback Web cadastrada no cliente OAuth do Google e a URL oficial existente preservada para o desktop

O backend deste branch implementa os caminhos Web de login, cadastro, MFA, refresh, logout e Google OAuth sem migration. Essas mudanças ainda precisam ser revisadas, publicadas e implantadas; nenhum ambiente remoto foi alterado nesta tarefa.

## Limites e validação pendente

- O build omite controles do atualizador desktop. A captura de tela Web usa a API do navegador; exige HTTPS e gesto explícito. A tela de seleção nativa continua exclusiva do Electron.
- Chamadas, mídia privada, uploads, permissões de navegador, CORS real, autenticação e rotas diretas ainda precisam de QA em navegadores distintos. Não há comprovação de chamada remota funcional nem da correção do MP4 privado.
- A política CSP da build é emitida em meta tag para diretivas compatíveis. `frame-ancestors` e cabeçalhos como `X-Content-Type-Options`, `Referrer-Policy` e `Permissions-Policy` precisam ser configurados como cabeçalhos HTTP no host/CDN e verificados nas respostas; não se deve assumir que arquivos estáticos do Square Cloud aplicam configuração `_headers`.
- Para publicação estática na Square Cloud, enviar o conteúdo de `web-dist` e usar `vite.html` como shell SPA conforme o guia atual do provedor. O domínio personalizado requer configuração no painel e os registros DNS/TXT indicados pelo painel; nenhuma alteração de domínio foi feita.
- Licenças de assets e dependências distribuídas continuam sujeitas à revisão existente do projeto.

## Estado

Esta entrega inicia a arquitetura multiplataforma. Ela não declara a aplicação Web pronta para produção nem cobre integralmente todos os recursos listados na especificação.
