# Gerenciamento da chave de assinatura de atualizações

A chave de produção deve ser criada pelo proprietário em uma máquina confiável. Não gere a chave de produção em CI, neste ambiente de trabalho ou durante a preparação de um Release.

## Gerar e conferir um par

Com Node.js 22, execute a partir da raiz do repositório:

```powershell
node scripts/manage-update-keypair.mjs generate
node scripts/manage-update-keypair.mjs verify .private-update-keys/ANCERYX_UPDATE_MANIFEST_PRIVATE_KEY.pem .private-update-keys/ANCERYX_UPDATE_MANIFEST_PUBLIC_KEY.pem
```

A ferramenta grava uma chave privada PKCS#8 e uma chave pública SPKI no diretório `.private-update-keys/`, que é ignorado pelo Git. Ela confere matematicamente o par antes de gravar, recusa sobrescrever arquivos e nunca imprime o conteúdo da chave privada. Para gerar outro par, escolha um diretório novo e protegido.

No Windows, mantenha o diretório em um perfil de usuário protegido por ACL e limite o acesso à conta do proprietário. Guarde também uma cópia offline criptografada em um gerenciador de segredos ou mídia segura. Não envie a chave privada por email, chat, issue, commit ou artifact. A chave pública não é secreta, mas deve ser revisada antes de incorporá-la ao aplicativo.

## Configurar GitHub Actions

Depois de validar a chave pública e fixá-la em `src/main/updater/updateTrust.ts`, configure no repositório GitHub o secret de Actions `ANCERYX_UPDATE_MANIFEST_PRIVATE_KEY`, colando o conteúdo do PEM privado multilinha. Não use variável pública, arquivo no repositório ou argumento de linha de comando. O workflow confere que a chave do secret corresponde à chave pública compilada e falha antes de gerar o instalador se o secret estiver ausente ou divergente.

A ativação exige ainda alterar `UPDATE_MANIFEST_SIGNATURE_VERIFICATION_ENABLED` para `true` somente após aprovação do QA Windows. A chave privada de produção nunca deve ser usada nos testes; os testes criam chaves efêmeras e as removem ao terminar.

## Validação Windows

O workflow manual `Updater security Windows validation` usa Node 22, executa a instalação limpa de dependências, typecheck, build, testes de segurança e armazenamento seguro, auditoria de licenças/dependências e compilação NSIS com `--publish never`. Ele não requer o secret de assinatura nem publica Release; guarda somente um instalador temporário para QA como artifact com retenção de cinco dias.
