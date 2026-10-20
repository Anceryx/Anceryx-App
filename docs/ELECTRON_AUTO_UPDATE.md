# Atualizações automáticas do Electron

Status: implementação local preparada; a publicação continua desativada até a migração pública e as aprovações necessárias.

O cliente Windows empacotado consulta Releases públicos de `Anceryx/Anceryx-App`. O aplicativo não contém token nem URL de feed privado. Desenvolvimento e builds fora do Windows não iniciam o updater. O canal é derivado estritamente do SemVer do cliente: versões estáveis usam `latest`; versões `-beta.N` usam `beta`. Versões `-rc.N` são candidatas de QA manual e não recebem atualizações automáticas pelo canal beta.

- A consulta começa após 10 segundos e se repete a cada seis horas.
- `autoDownload` e `autoInstallOnAppQuit` permanecem desativados.
- Download e reinício para instalar exigem ação explícita da pessoa usuária.
- Downgrade, versão igual, SemVer inválido, canal incompatível e metadados sem instalador NSIS íntegro são rejeitados.
- Falhas de rede não bloqueiam login, navegação nem inicialização.
- Notas são limitadas e exibidas como texto simples.
- A configuração local de build usa `--publish never`; o fluxo de revisão não publica Releases.

O GitHub Provider do `electron-updater` seleciona `latest.yml` para stable e `beta.yml` para beta. Releases precisam conter o instalador `Anceryx-Setup-<versão>.exe`, o manifesto correto e o `.blockmap` correspondente. Uma release RC usa `rc.yml` para QA manual. Não publique apenas o `.exe`.

A configuração manual em `.github/workflows/publish-windows-release.yml` está inativa até `ANCERYX_PUBLIC_RELEASE_ENABLED=true`, repositório público, secrets de assinatura, subject do certificado e ambientes protegidos `windows-signing` e `public-release` estarem configurados e revisados. A versão do tag precisa corresponder a `package.json`; o workflow verifica ancestralidade em `main`, assinatura Authenticode, subject, manifesto, tamanho, SHA-512 e blockmap antes de criar a Release. O job que publica é o único com `contents:write`.

## Transição das instalações 0.15.0

A versão `0.15.0` já distribuída foi construída com o repositório de atualização anterior, que não está mais disponível. Ela não recebe redirecionamento automático para este feed. A primeira versão de transição recomendada é `0.15.1` estável, sem alterar `package.json` antes da aprovação da publicação. Será necessário instalar manualmente o NSIS oficial dessa versão. O `appId` permanece `io.anceryx.app` e o caminho de dados do usuário não é limpo pelo updater; ainda é obrigatório validar por QA Windows que a instalação sobre a versão anterior preserva dados e preferências. Não desinstale nem apague dados locais durante a transição.

Assinatura, cadeia confiável, SmartScreen, instalação, atualização real, rollback, migração do feed antigo e disponibilidade dos serviços ainda exigem evidência em Windows. Consulte [o checklist de QA](UPDATE_QA_CHECKLIST.md) e [o pipeline de distribuição](WINDOWS_RELEASE_PIPELINE.md).
