# Atualizações do Electron

Status: o atualizador integrado está desativado no cliente até que haja verificação confiável de manifests assinados.

O feed configurado aponta para Releases públicos de `Anceryx/Anceryx-App`; o aplicativo não contém token nem URL de feed privado. Porém, o cliente atual usa `electron-builder` 26.x e `electron-updater` 6.x, que não verificam a assinatura Ed25519 do manifest. Por isso, a consulta, o download e a instalação permanecem bloqueados. SHA-512 e blockmap detectam inconsistências no arquivo, mas não autenticam o manifest.

Para reativar o fluxo, será necessário adotar versões estáveis compatíveis do builder e updater, configurar a chave pública confiável incorporada ao aplicativo, armazenar a chave privada em secret protegido e validar a assinatura do manifest antes de qualquer ação. O workflow `.github/workflows/publish-windows-release.yml` falha fechado até essas dependências e o secret `ANCERYX_UPDATE_MANIFEST_PRIVATE_KEY` estarem configurados. O flag de execução no cliente também precisará ser habilitado explicitamente após os testes.

## Transição de instalações existentes

Não é possível provar, usando somente este clone, a origem de todos os instaladores antigos. A transição para uma versão aprovada deverá ser feita manualmente, instalando o NSIS sobre a instalação existente e confirmando em Windows que `app.getPath('userData')`, SafeStorage, sessões e preferências são preservados. Não desinstale nem apague dados locais durante a transição.

Consulte o [modelo de segurança](UPDATE_SECURITY_MODEL.md), o [checklist de QA](UPDATE_QA_CHECKLIST.md) e o [pipeline de distribuição](WINDOWS_RELEASE_PIPELINE.md).
