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

Depois de validar a chave pública e fixá-la em `src/main/updater/updateTrust.ts`, configure `ANCERYX_UPDATE_MANIFEST_PRIVATE_KEY` como **Environment Secret** no GitHub Environment `public-release`. Se ela estiver cadastrada como secret geral do repositório, cadastre-a primeiro no Environment e remova a cópia do escopo do repositório. Não use variável pública, arquivo no repositório ou argumento de linha de comando. Somente os jobs explicitamente associados ao Environment protegido recebem o secret. O workflow de publicação confere a correspondência e falha antes de gerar o instalador se o secret estiver ausente ou divergente; os workflows de QA e PR não recebem a chave privada.

A chave pública oficial já está incorporada. O flag `UPDATE_MANIFEST_SIGNATURE_VERIFICATION_ENABLED` permanece `false` até os testes e o build Windows de QA passarem e o proprietário aprovar uma alteração revisada para ativá-lo. A chave privada de produção nunca deve ser usada em builds/testes de QA; eles criam chaves efêmeras e as removem ao terminar. O workflow de publicação confere matematicamente o par antes de gerar manifest assinado e falha sem publicar se as chaves divergirem.

## Validação Windows

O workflow manual `Updater security Windows validation` usa Node 22, executa a instalação limpa de dependências, typecheck, build, testes de segurança e armazenamento seguro, auditoria de licenças/dependências e compilação NSIS com `--publish never`. Ele usa somente chaves efêmeras dos testes, não recebe o secret de produção, não publica Release e guarda somente um instalador temporário para QA como artifact com retenção de cinco dias.
