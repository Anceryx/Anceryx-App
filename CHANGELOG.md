# Registro de alterações

Este arquivo registra versões preparadas a partir do histórico disponível no repositório. O snapshot independente não importa o histórico privado anterior; por isso, esta versão registra a linha de base do código-fonte e não atribui mudanças específicas a commits antigos.

## [0.15.0] — linha de base do código-fonte

- Identifica a versão do cliente contida neste snapshot independente.
- Não inclui instalador nem artefatos binários de distribuição.
- A publicação de binários e a ativação do fluxo de atualização exigem revisão e aprovação próprias.

## Próxima versão

### Comunidades

- O canal de publicações agora lista tópicos reais, permite criar, abrir, editar e excluir publicações próprias e responder a tópicos existentes.
- A tela inicial do fórum usa uma única ação para entrar/abrir a comunidade; o gerenciamento permanece dentro da experiência da comunidade.
- Canais podem ser recolhidos, e participantes de voz aparecem junto ao canal correspondente. A área de voz mostra participantes, estado do microfone e transmissões ativas.
- O compartilhamento de tela no Electron permite escolher uma janela ou tela. A transmissão inclui vídeo; áudio do sistema não está habilitado.

### Aplicativo

- A interface de licenças foi removida das Configurações. Os avisos e ferramentas de conformidade continuam no pacote e no processo de build.
- A interface informa que atualizações automáticas estão pausadas por segurança enquanto os manifests não tiverem verificação criptográfica habilitada.

### Distribuição Windows

- Builds de revisão permanecem sem assinatura Authenticode e são armazenadas como artifacts temporários, sem publicação de Release.
- O atualizador integrado fica pausado até a verificação de manifests Ed25519 estar disponível e habilitada no cliente.
- O workflow de publicação falha fechado sem versões estáveis compatíveis e o secret protegido da chave de assinatura do manifest.

### Licenciamento

- O código-fonte do cliente passa a ser licenciado sob Apache License 2.0 (`Apache-2.0`) nos commits desta mudança. A tag `v0.15.0` permanece como snapshot anterior à alteração.
- Os assets oficiais permanecem sob política separada. O proprietário autorizou a publicação dos direitos controlados pela Anceryx; a revisão dos 60 arquivos não encontrou indicadores concretos de conteúdo de terceiros.

Correções e recursos serão registrados aqui quando forem implementados e validados. Itens apenas planejados não devem ser descritos como disponíveis.
