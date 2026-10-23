# Modelo de segurança do atualizador

## Estado atual

- O atualizador integrado está desativado no cliente empacotado. A consulta, o download e a instalação automáticos ficam bloqueados até o aplicativo verificar criptograficamente o manifest de atualização com uma chave pública confiável.
- O cliente preparado para `0.17.0` usa `electron-builder` 26.18.0 e `electron-updater` 6.8.11. Nessas versões estáveis, o hash SHA-512 protege a integridade do arquivo em relação ao manifest recebido, mas não autentica a origem do próprio manifest.
- Builds sem certificado Authenticode são permitidos para revisão. O app não exige assinatura de código para verificar o executável; essa configuração não substitui a verificação criptográfica do manifest.
- O renderer não fornece URL de feed nem chama operações privilegiadas. Tokens de publicação e a chave privada de assinatura não ficam no cliente.
- A mensagem no aplicativo instrui a instalação manual apenas de versões publicadas nas Releases oficiais da Anceryx.

## Requisitos para reativar o atualizador

Antes de habilitá-lo, o projeto precisa adotar versões estáveis compatíveis do builder e do updater com assinatura Ed25519 de manifests, incorporar uma chave pública confiável ao aplicativo, manter a chave privada somente em secret protegido e validar a assinatura antes de aceitar qualquer metadado. A ativação também exige testes de regressão para assinatura ausente, inválida e válida, além de QA da instalação e atualização em Windows.

O workflow de publicação falha fechado enquanto a assinatura nativa de manifests não estiver disponível em versões estáveis e o secret `ANCERYX_UPDATE_MANIFEST_PRIVATE_KEY` não estiver configurado. O nome do secret é mapeado para `ELECTRON_BUILDER_UPDATE_SIGN_KEY`; a documentação do builder especifica uma chave privada Ed25519 em PEM PKCS#8. Não use versões alpha nem gere ou invente uma chave para contornar esse bloqueio. Mesmo após essas condições, o flag de execução do atualizador deve ser alterado explicitamente no cliente e validado antes de publicar uma versão.

## Integridade e preservação de dados

SemVer, canal, nome, tamanho e SHA-512 do instalador são verificações adicionais de integridade, não autenticação da origem. O blockmap auxilia atualizações diferenciais e também não autentica a origem. Não habilite o atualizador com base somente nesses campos.

A instalação não deve remover `app.getPath('userData')` nem alterar os caminhos atuais. SafeStorage, sessões, preferências, anexos, instalação sobre uma versão anterior, recuperação e desinstalação ainda precisam de QA em Windows real. A transição de instalações antigas para o feed atual é manual; o histórico de builds antigos não está integralmente disponível neste repositório.
