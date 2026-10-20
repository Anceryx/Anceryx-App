# Revisão antes da distribuição

Status: **distribuição externa pendente de revisão**.

Esta lista registra verificações técnicas e decisões que ainda exigem evidência ou aprovação do responsável. Ela não é aconselhamento jurídico nem licença de redistribuição.

## Código e dependências

- [ ] Revisar a licença escolhida, os direitos sobre marcas e assets e os avisos de terceiros.
- [ ] Gerar os avisos a partir do lockfile e do artefato exatos da versão candidata.
- [ ] Registrar commit, hashes dos lockfiles, versões de ferramentas, comandos de build e manifesto do artefato.
- [ ] Validar o cliente em ambiente limpo, sem acesso ao repositório privado da API.
- [ ] Testar inicialização, instalação, atualização e armazenamento seguro no Windows.

## Segurança e privacidade

- [ ] Auditar o histórico Git completo e todas as referências destinadas à publicação.
- [ ] Confirmar que `.env` reais, credenciais, chaves, certificados privados, logs, backups e dados de usuários foram excluídos.
- [ ] Confirmar que a API, configuração de produção e operações administrativas permanecem privadas.
- [ ] Rever o pacote final e os artefatos de CI para verificar que não incorporam segredos.

## Pendências atuais

- A licença e a redistribuição de assets ainda exigem decisão humana.
- A revisão integral do histórico e das referências locais é necessária antes de qualquer publicação.
- Instalação, atualização, assinatura e QA funcional em Windows precisam de evidência específica para a versão candidata.
- Nenhum push, mudança de visibilidade ou distribuição é autorizado por esta preparação.
