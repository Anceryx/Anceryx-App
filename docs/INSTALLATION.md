# Instalação e atualizações do Windows

Ainda não há instalador oficial publicado pelo fluxo de revisão. Não baixe executáveis de artifacts de CI como se fossem releases oficiais.

Quando uma versão oficial estiver aprovada, baixe o instalador NSIS apenas pela página Releases de `Anceryx/Anceryx-App` e confira as notas e a versão. Para uma instalação existente, execute o instalador sobre a instalação atual e mantenha os dados do aplicativo. Não desinstale nem remova `%APPDATA%` durante a transição.

## Primeira atualização após a mudança do feed

A versão `0.15.0` aponta para o feed antigo e não conseguirá detectar a nova origem automaticamente. A primeira versão recomendada para transição é `0.15.1` estável. A atualização inicial exige download e execução manual do instalador oficial; futuras versões poderão usar o atualizador integrado, após QA assinado em Windows.

Versões estáveis usam o canal `latest`; versões `beta` usam `beta.yml`. Releases `rc` são apenas QA manual. O aplicativo verifica atualizações após 10 segundos e a cada seis horas, sem download automático. A pessoa usuária escolhe quando baixar e reiniciar para instalar.

Veja também [o modelo de segurança](UPDATE_SECURITY_MODEL.md), [o checklist de QA](UPDATE_QA_CHECKLIST.md) e [o pipeline de artefatos](WINDOWS_RELEASE_PIPELINE.md).
