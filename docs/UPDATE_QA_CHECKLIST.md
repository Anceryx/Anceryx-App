# Checklist de QA do instalador e atualizador Windows

O cliente atual mantém o atualizador integrado desativado até verificar manifests Ed25519 assinados. Execute estes testes em ambiente isolado, sem dados pessoais ou contas de produção.

- [ ] Gerar uma build de revisão manual a partir da tag selecionada e confirmar versão e SHA do código-fonte.
- [ ] Confirmar que o instalador é unsigned e que o processo não tenta publicar uma Release.
- [ ] Instalar e iniciar o NSIS em um perfil de teste; confirmar que o SmartScreen é apresentado normalmente e que nenhuma instrução orienta ignorá-lo.
- [ ] Instalar sobre uma versão anterior em ambiente isolado e confirmar que `%APPDATA%`, SafeStorage, sessões, preferências e anexos permanecem acessíveis.
- [ ] Confirmar que o app inicia e funciona sem conexão ao feed de atualização.
- [ ] Confirmar que consultas, download e instalação pelo atualizador integrado ficam desativados no cliente atual até o QA do Windows ser aprovado e a flag de verificação ser habilitada em alteração revisada.
- [ ] Confirmar que os testes de assinatura usam apenas pares efêmeros; a chave privada de produção não deve ser enviada ao workflow de QA.
- [ ] Confirmar que o workflow protegido de publicação valida a correspondência do secret com a chave pública antes de assinar qualquer manifest; a execução não deve imprimir o secret.
- [ ] Com o updater ainda desativado, confirmar que manifest válido é aceito pelo verificador e que manifest ausente, adulterado ou assinado por chave não confiável é rejeitado.
- [ ] Validar seleção de canal stable/beta e rejeição de downgrade, versão igual, SemVer inválido e canal incompatível.
- [ ] Testar recuperação após interrupção, consentimento explícito para reinício/instalação, notas como texto simples e bloqueio de URLs arbitrárias.
- [ ] Testar instalação, desinstalação e rollback; preservar dados locais em todos os casos.
- [ ] Registrar hashes dos artifacts, tag e resultado sem incluir segredos ou dados pessoais.

Não publique a Release `v0.15.0` nem altere sua tag durante estes testes. A Release existente não contém instalador. Builds de revisão são temporárias e não devem ser distribuídas como versões oficiais.
