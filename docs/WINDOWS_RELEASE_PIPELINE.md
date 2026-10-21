# Pipeline de artefatos e publicação Windows

## Builds de revisão

O workflow `.github/workflows/windows-release.yml` aceita execução manual com uma referência de origem explícita e produz artifacts temporários. Ele compila o instalador NSIS sem certificado Authenticode e usa `--publish never`; não cria Releases nem envia arquivos ao servidor. Os artifacts expiram em três dias. Essa build serve para revisão e teste, não como distribuição oficial.

A identidade do aplicativo é `Anceryx.exe`, com `appId: io.anceryx.app`. O instalador se chama `Anceryx-Setup-<versão>.exe`. O script local `electron:build` já contém `--publish never`; execute `npm run electron:build` sem repetir o argumento.

## Publicação controlada

`.github/workflows/publish-windows-release.yml` requer execução manual, tag revisada, frase de confirmação exata, variável `ANCERYX_PUBLIC_RELEASE_ENABLED=true` e ambiente protegido `public-release`. Ele exige que a tag esteja em `main`, corresponda à versão em `package.json` e ainda não tenha uma Release publicada para ela.

A publicação falha fechada até haver versões estáveis compatíveis de `electron-builder` 27.x e `electron-updater` 7.x e o secret protegido `ANCERYX_UPDATE_MANIFEST_PRIVATE_KEY`. O workflow então deve assinar o manifest Ed25519, confirmar que o cliente embute a chave pública correspondente e verificar versão, instalador, tamanho, SHA-512, blockmap e assinatura do manifest. O executável continua sem assinatura Authenticode. Somente o job final recebe `contents:write` e publica os assets verificados; stable fica como latest e beta/RC como prerelease.

O cliente atualmente mantém o atualizador integrado desativado. A publicação de binários não o habilitará automaticamente: a verificação de assinatura precisa ser implementada e habilitada no cliente, com testes e QA Windows. Não publicar enquanto isso não estiver concluído.

Assets esperados: instalador NSIS, manifest do canal (`latest.yml`, `beta.yml` ou `rc.yml`), blockmap correspondente, `SHA256SUMS.txt` e metadado do canal. A Release `v0.15.0` existente não deve ser alterada por este fluxo; tags e Releases antigas permanecem intactas.

## QA e distribuição sem certificado

O instalador de revisão é unsigned. O SmartScreen pode exibir um aviso; não instrua usuários a ignorar avisos nem apresente esse arquivo como uma versão confiável para distribuição ampla. Teste instalação, atualização manual sobre uma versão anterior, SafeStorage, sessões, preferências, anexos, desinstalação e rollback em ambiente Windows isolado. A CI não comprova esses testes nem a disponibilidade da API.

Consulte as [instruções de instalação](INSTALLATION.md) e o [checklist de QA](UPDATE_QA_CHECKLIST.md).
