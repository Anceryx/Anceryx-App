# Atualizações do Electron

## Estado da versão 0.17.1

O cliente contém um verificador Ed25519 independente, executado no processo principal. O manifest é obtido por HTTPS e sua assinatura é validada antes de iniciar qualquer download do instalador. A assinatura cobre versão, canal, notas, URL e nome do instalador, tamanho e SHA-512. O cliente também valida o tamanho e o hash do arquivo durante o download.

O atualizador continua desativado: ainda não há chave pública de produção fixada em `src/main/updater/updateTrust.ts`, e `UPDATE_MANIFEST_SIGNATURE_VERIFICATION_ENABLED` permanece `false`. Sem esses dois requisitos, o aplicativo não faz chamadas de atualização. A configuração de produção não pode ser habilitada até que a chave seja provisionada e revisada, o secret protegido corresponda a ela e a QA do instalador seja aprovada.

O cliente não usa `electron-updater`; essa dependência foi removida para evitar uma segunda rota de download que não passe pelo verificador. Não há download automático nem instalação silenciosa. Quando habilitado futuramente, o usuário inicia o download e abre o NSIS para confirmar a instalação.

## Manifest e publicação

O asset `update-manifest.json` usa JSON canônico com chaves ordenadas e uma assinatura Ed25519 sobre todos os campos exceto `signature`. A URL do instalador precisa corresponder exatamente ao repositório e à tag do release. O manifest é baixado primeiro; somente depois de verificado o cliente solicita o instalador, seguindo apenas redirecionamentos HTTPS para `github.com` ou `release-assets.githubusercontent.com`, com limite de tamanho e quantidade de redirecionamentos.

O workflow manual `publish-windows-release.yml` exige que o tag corresponda à versão `0.17.1`, que a chave privada protegida corresponda à chave pública fixada no cliente e que a verificação esteja explicitamente habilitada. Ele assina e verifica o manifest, confere o instalador e gera checksums. A publicação pública continua protegida pelos controles já existentes do workflow. Este trabalho local não executou o workflow nem publicou assets.

## Instalações existentes

A primeira atualização automática, quando autorizada, deve ser testada sobre a instalação `0.17.0` em Windows isolado. Confirme que `app.getPath('userData')`, SafeStorage, sessões, preferências e anexos continuam presentes. Não desinstale nem apague dados durante o teste. Até a aprovação, instale manualmente somente uma versão aprovada nas Releases oficiais.

Consulte o [modelo de segurança](UPDATE_SECURITY_MODEL.md), o [checklist de QA](UPDATE_QA_CHECKLIST.md) e o [pipeline Windows](WINDOWS_RELEASE_PIPELINE.md).
