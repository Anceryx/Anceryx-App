# Atualizações do Electron

## Estado da versão 0.17.1

O cliente contém um verificador Ed25519 independente, executado no processo principal. O manifest é obtido por HTTPS e sua assinatura é validada antes de iniciar qualquer download do instalador. A assinatura cobre versão, canal, notas, URL e nome do instalador, tamanho e SHA-512. O cliente também valida o tamanho e o hash do arquivo durante o download.

O atualizador continua desativado: a chave pública oficial está fixada em `src/main/updater/updateTrust.ts`, mas `UPDATE_MANIFEST_SIGNATURE_VERIFICATION_ENABLED` permanece `false`. Assim, o aplicativo não faz chamadas de atualização. O secret privado deve ficar restrito ao Environment protegido `public-release`; workflows de QA não o recebem. A ativação depende da QA do instalador e de alteração revisada. O workflow protegido confere a correspondência do par antes de assinar o manifest e falha antes da publicação se houver divergência.

O cliente não usa `electron-updater`; essa dependência foi removida para evitar uma segunda rota de download que não passe pelo verificador. Não há download automático nem instalação silenciosa. Quando habilitado futuramente, o usuário inicia o download e abre o NSIS para confirmar a instalação.

## Manifest e publicação

O asset `update-manifest.json` usa JSON canônico com chaves ordenadas e uma assinatura Ed25519 sobre todos os campos exceto `signature`. A URL do instalador precisa corresponder exatamente ao repositório e à tag do release. O manifest é baixado primeiro; somente depois de verificado o cliente solicita o instalador, seguindo apenas redirecionamentos HTTPS para `github.com` ou `release-assets.githubusercontent.com`, com limite de tamanho e quantidade de redirecionamentos.

O workflow manual `publish-windows-release.yml` exige que o tag corresponda à versão `0.17.1`, que a chave privada do Environment protegido corresponda à chave pública fixada no cliente e que a verificação esteja explicitamente habilitada. Ele assina e verifica o manifest, confere o instalador e gera checksums. O workflow manual `updater-security-windows.yml` valida o cliente e gera somente artifact temporário, sem receber a chave privada. Esta alteração local não executou workflows nem publicou assets.

## Instalações existentes

A primeira atualização automática, quando autorizada, deve ser testada sobre a instalação `0.17.0` em Windows isolado. Confirme que `app.getPath('userData')`, SafeStorage, sessões, preferências e anexos continuam presentes. Não desinstale nem apague dados durante o teste. Até a aprovação, instale manualmente somente uma versão aprovada nas Releases oficiais.

Consulte o [modelo de segurança](UPDATE_SECURITY_MODEL.md), o [checklist de QA](UPDATE_QA_CHECKLIST.md), o [gerenciamento de chaves](UPDATE_KEY_MANAGEMENT.md) e o [pipeline Windows](WINDOWS_RELEASE_PIPELINE.md).
