# Modelo de segurança do atualizador

## Proteções

- Builds de desenvolvimento não contatam o updater.
- Builds Windows empacotados usam o feed público fixo `Anceryx/Anceryx-App`.
- O renderer não fornece URL de feed nem chama operações privilegiadas.
- Consultas simultâneas são agrupadas; download e instalação exigem consentimento explícito.
- Downgrades são desativados depois da configuração do canal, pois o setter de canal do `electron-updater` reativa essa opção.
- SemVer, canal, nome/tamanho/hash do instalador NSIS são validados antes de liberar o download pela interface.
- Erros de atualização não bloqueiam o uso normal; notas são limitadas e sanitizadas.
- Tokens de publicação e credenciais de assinatura não ficam no cliente.

Clientes estáveis acompanham releases estáveis. Clientes `beta` acompanham betas compatíveis e uma versão estável mais nova; não recebem `alpha` ou `rc`. `rc` é um fluxo de QA manual. A publicação depende de workflow manual, ambiente protegido, aprovação humana e assinatura Authenticode verificada.

## Limitações e requisitos de publicação

O hash SHA-512 do manifesto e o blockmap detectam corrupção, mas não substituem assinatura de código. O Electron Updater verifica por padrão a assinatura do executável de atualização NSIS em Windows; o build de publicação exige assinatura e valida o subject configurado. O certificado e sua cadeia ainda precisam ser revisados e testados num Windows real. Não declarar o atualizador confiável em produção antes dessa validação.

Instalação e atualização não removem `app.getPath('userData')` nem mudam os locais atuais. O armazenamento SafeStorage, sessões e preferências precisam ser confirmados em QA de instalação sobre versão existente. A `0.15.0` usa um feed anterior sem redirecionamento; a primeira instalação na nova origem é manual.
