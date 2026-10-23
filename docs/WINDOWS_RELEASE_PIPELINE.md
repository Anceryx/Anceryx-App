# Pipeline de artefatos e publicação Windows

## Builds de revisão

O workflow `windows-release.yml` é manual e gera artifacts temporários com `--publish never`; não cria Releases nem envia arquivos ao servidor de atualizações. A identidade permanece `Anceryx.exe`, `appId: io.anceryx.app`, e o NSIS é `Anceryx-Setup-<versão>.exe`.

## Publicação controlada

`.github/workflows/publish-windows-release.yml` exige execução manual, tag revisada, confirmação exata, `ANCERYX_PUBLIC_RELEASE_ENABLED=true` e ambiente protegido `public-release`. A tag deve corresponder ao pacote `0.17.1` e estar alcançável desde `main`. O job de build também usa esse Environment para que a chave privada de assinatura não fique disponível em secrets gerais do repositório.

Antes de compilar, o workflow exige a chave Ed25519 privada em `ANCERYX_UPDATE_MANIFEST_PRIVATE_KEY`, confere sua correspondência com a chave pública compilada no cliente e verifica que o flag de assinatura está habilitado. A ausência de qualquer requisito interrompe a execução. Após o build NSIS, o fluxo gera `update-manifest.json`, verifica assinatura, tamanho e SHA-512, e calcula `SHA256SUMS.txt`. O job que publica conserva as permissões restritas existentes.

O código desta preparação mantém o updater desativado, embora a chave pública oficial já esteja fixada no cliente. A validação Windows manual usa chaves de teste efêmeras e não recebe o secret de produção. O workflow de publicação confere a chave protegida, mas só deve ser executado após autorização explícita; o cliente só poderá ser ativado em commit revisado após a QA do instalador. Não execute o workflow de publicação durante o QA.

## QA e distribuição

O instalador permanece sem Authenticode. Builds de QA são privadas/temporárias e não equivalem a Releases. Valide instalação limpa e sobre a `0.17.0`, abertura e cancelamento do NSIS, SafeStorage, sessão, preferências, anexos, recuperação e desinstalação em Windows isolado. A CI não comprova preservação dos dados do usuário nem atualizações reais.
