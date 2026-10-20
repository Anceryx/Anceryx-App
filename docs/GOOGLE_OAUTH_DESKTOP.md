# Login Google no Electron

O cliente abre o provedor Google no navegador do sistema e usa Authorization Code com PKCE, `state` e `nonce`. O retorno desktop usa o protocolo registrado `anceryx://oauth/google`; tokens não devem aparecer na URL.

O cliente troca o código de handoff uma única vez pela sessão da API e mantém o token de acesso em memória. O token de renovação fica protegido pelo `safeStorage` do Electron.

No Google Cloud, o URI de callback do serviço é `https://admin-anceryx.site/auth/google/callback`. Segredos e credenciais do cliente Google pertencem somente ao ambiente privado da API; nunca os inclua no `.env.example` do aplicativo nem no build Electron.

O fluxo real ainda precisa de validação em uma versão empacotada do Windows com configuração aprovada. Cancelamento, `state` inválido, expiração e replay devem terminar sem criar uma sessão.
