# Registro de alterações


Este arquivo registra versões preparadas a partir do histórico disponível no repositório. O snapshot independente não importa o histórico privado anterior; por isso, esta versão registra a linha de base do código-fonte e não atribui mudanças específicas a commits antigos.

## [0.15.0] — linha de base do código-fonte

- Identifica a versão do cliente contida neste snapshot independente.
- Não inclui instalador nem artefatos binários de distribuição.
- A publicação de binários e a ativação do fluxo de atualização exigem revisão e aprovação próprias.

## [0.15.1] — preparação local (não publicada)
- O recorte de banners usa as dimensões do elemento carregado, mantém o quadro visível em telas menores e impede aplicar antes de validar a imagem e a exportação.
- A política de mídia do Electron permite HTTPS, e o diagnóstico registra eventos do player, status, MIME, tamanho, disposição, Range e falhas de rede sem guardar URLs ou tickets. Reprodução MP4 real no Windows continua pendente de QA.
- A criação de Fórum aguarda 1,1 s entre uploads simples consecutivos e mantém uploads já concluídos para evitar reenvio; respostas 429 do Blob não são repetidas automaticamente.
- Fóruns participados abrem em uma área integrada ao aplicativo, restauram o último canal acessível e preservam a sessão de voz ao alternar entre módulos. O painel separa organização, cargos/permissões e convites.
- A criação de Fórum mantém uploads bem-sucedidos para evitar reenvio e oferece continuar sem a imagem opcional cujo envio falhou. O player registra estado de rede e decodificação para distinguir melhor falhas de reprodução.
- Correções locais de interface: mensagens da comunidade agora usam avatares, emojis e figurinhas existentes; mensagens consecutivas são agrupadas, participantes de voz mostram avatar e estado de áudio, e janelas sobrepostas respeitam a barra de título do Windows.

- Prepara o cliente e o lockfile para a versão `0.15.1`, com `electron-builder` `26.18.0` e `electron-updater` `6.8.11` estáveis.
- Mantém o atualizador integrado desativado. Os erros de assinatura inválida/ausente e de integridade passam a ter mensagens específicas, sem expor detalhes internos.
- Atualiza os casos de segurança do atualizador para a nova versão base; a verificação criptográfica real de manifests e a atualização em Windows continuam pendentes.

### Comunidades

- A criação de fóruns oferece modelos iniciais, revisão de categorias e canais, finalidade e visibilidade; o fórum e sua estrutura inicial são enviados em uma única operação.
- O canal de publicações agora lista tópicos reais, permite criar, abrir, editar e excluir publicações próprias e responder a tópicos existentes.
- A tela inicial do fórum usa uma única ação para entrar/abrir a comunidade; o gerenciamento permanece dentro da experiência da comunidade.
- Canais podem ser recolhidos, e participantes de voz aparecem junto ao canal correspondente. A área de voz mostra participantes, estado do microfone e transmissões ativas.
- A organização da comunidade permite reordenar categorias e canais; ao escolher a herança da categoria, o cliente confirma antes de limpar permissões específicas do canal.
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
