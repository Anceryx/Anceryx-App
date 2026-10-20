# Pipeline de artefatos e publicação Windows

## Builds de revisão

O workflow `.github/workflows/windows-release.yml` valida o cliente e produz artefatos temporários de revisão. Ele compila o aplicativo e o instalador NSIS com `--publish never`; não cria Releases nem envia arquivos ao servidor. Os artifacts de revisão expiram em três dias. O relatório de auditoria de licenças também tem retenção de três dias. Isso vale para novos uploads e não remove artifacts antigos já existentes no GitHub.

A identidade do aplicativo é `Anceryx.exe`, com `appId: io.anceryx.app`. O nome do instalador é `Anceryx-Setup-<versão>.exe`. O script local `electron:build` também usa `--publish never`.

## Publicação controlada

`.github/workflows/publish-windows-release.yml` aceita somente execução manual com tag explícita e frase de confirmação. O workflow permanece inativo enquanto `ANCERYX_PUBLIC_RELEASE_ENABLED` não for `true`. Antes de habilitá-lo, uma revisão humana deve configurar o repositório público, o secret `WIN_CSC_LINK`, o secret `WIN_CSC_KEY_PASSWORD`, a variável `ANCERYX_WINDOWS_PUBLISHER_SUBJECT` e os ambientes protegidos `windows-signing` e `public-release` com revisores obrigatórios. As configurações/credenciais não fazem parte deste commit.

O build valida tag SemVer, correspondência com `package.json`, ancestralidade em `main`, testes, auditoria de licenças e auditorias npm da árvore completa e de produção. Exige assinatura Authenticode válida cujo subject corresponda à variável protegida e confere manifesto, instalador, tamanho, SHA-512 e blockmap. Apenas o job final recebe `contents:write`; verifica visibilidade pública e ausência de Release duplicada antes de anexar os artefatos à tag existente. A tag precisa conter notas revisadas. Stable publica como latest; beta e RC como prerelease.

Assets indispensáveis: instalador NSIS, manifesto do canal (`latest.yml`, `beta.yml` ou `rc.yml`) e blockmap correspondente. Não publicar somente o executável. Para o feed do app, stable usa `latest.yml` e beta usa `beta.yml`. RC permanece um canal de QA manual e não é descoberto pelo cliente beta atual.

## Assinatura e validação

O certificado não pode ser inventado nem colocado no repositório. A publicação depende de certificado válido, segredo protegido, cadeia confiável, verificação de assinatura no Windows, instalação sobre a versão anterior, atualização real, preservação dos dados locais, desinstalação e rollback testados. A execução de CI não comprova esses testes manuais nem a disponibilidade do serviço.

A versão `0.15.0` aponta para o feed anterior. Não há migração automática: a primeira instalação na nova origem será manual. Consulte [instruções de instalação](INSTALLATION.md) e [checklist de QA](UPDATE_QA_CHECKLIST.md).
