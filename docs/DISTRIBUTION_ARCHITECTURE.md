# Arquitetura de distribuição

Esta documentação registra a separação técnica do cliente e do serviço. Ela não aprova publicação nem distribuição de binários.

## Limite do cliente

O repositório `Anceryx/Anceryx-App` contém o cliente desktop: processos main/preload do Electron, interface React, contratos consumidos pelo aplicativo, recursos e configuração de build. A API fica no repositório privado `Anceryx/anceryx-api` e não é necessária para instalar dependências, validar ou compilar o cliente.

O cliente usa contratos HTTP e WebSocket autenticados. Autenticação, autorização, cobrança, privilégios, moderação e revogação são decididos pelo backend.

The script `scripts/export-public-client.ps1` can generate an additional snapshot from an explicit allowlist. It does not replace a full Git history audit.

A licença do cliente e os direitos de redistribuição de assets ainda exigem revisão humana. A publicação precisa de autorização específica do proprietário.
