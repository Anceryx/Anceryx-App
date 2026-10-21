# Instalação e atualizações do Windows

Ainda não há instalador oficial anexado à Release `v0.15.0`. Artifacts de CI são temporários, expiram em três dias e servem somente para revisão; não os trate como Releases oficiais.

Quando uma versão oficial estiver aprovada, baixe o instalador NSIS apenas pela página Releases de `Anceryx/Anceryx-App` e confira as notas e a versão. Para uma instalação existente, execute o instalador sobre a instalação atual e mantenha os dados do aplicativo. Não desinstale nem remova `%APPDATA%` durante a transição.

## Primeira atualização após a mudança do feed

Instalações antigas podem usar um feed que não está representado por completo neste repositório; não presuma que detectarão a nova origem. A transição exige baixar e executar manualmente o instalador oficial aprovado sobre a instalação atual. Não desinstale nem remova `%APPDATA%`.

O atualizador integrado está desativado no cliente até existir suporte estável à verificação de manifests Ed25519 e uma chave pública confiável incorporada ao aplicativo. Versões estáveis, beta e RC não são verificadas automaticamente neste momento. Quando habilitado após revisão e QA, stable usará `latest`, beta usará `beta.yml` e RC continuará restrito ao QA manual.

Veja também [o modelo de segurança](UPDATE_SECURITY_MODEL.md), [o checklist de QA](UPDATE_QA_CHECKLIST.md) e [o pipeline de artefatos](WINDOWS_RELEASE_PIPELINE.md).
