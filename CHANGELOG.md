# Registro de alterações

## Ajustes locais — 22/10/2026

- A barra de título do Electron agora aparece também no login e no cadastro, sem duplicação no Dashboard; o build web mantém a barra oculta.
- Modais, gavetas e sobreposições respeitam a altura da barra de título, e o modal de configurações se ajusta ao espaço vertical disponível.
- Os handlers IPC da janela são registrados uma vez e resolvem a janela pelo remetente validado.
- Todos os canais IPC do renderer verificam a origem e o frame principal antes de operar, incluindo tokens de sessão e comandos do atualizador.

Este arquivo registra versões preparadas a partir do histórico disponível no repositório. O snapshot independente não importa o histórico privado anterior; por isso, esta versão registra a linha de base do código-fonte e não atribui mudanças específicas a commits antigos.

## [0.15.0] — linha de base do código-fonte

- Identifica a versão do cliente contida neste snapshot independente.
- Não inclui instalador nem artefatos binários de distribuição.
- A publicação de binários e a ativação do fluxo de atualização exigem revisão e aprovação próprias.

## [0.15.1] — preparação local (não publicada)
- O `.env.example` usa a API local para desenvolvimento; builds empacotados continuam limitados à API oficial de produção.
- O sino de notificações agora tem uma faixa reservada no layout do Dashboard, separada dos controles das telas Feed, DMs e Fóruns.
- Separadores de data em DMs deixam de ficar sticky, evitando que se sobreponham às mensagens durante a rolagem.
- A URL de desenvolvimento do renderer só é considerada em builds não empacotados, preservando webSecurity, CSP, navegação, carregamento local e menu de produção.
- O chat lateral de voz agora reserva largura previsível, mantém a área de mensagens rolável e usa controles compactos acessíveis; cartões de participantes e prévias de compartilhamento se ajustam à janela.
- A navegação do workspace destaca o canal selecionado, expõe a relação entre categorias expansíveis e seus canais e apresenta a quantidade de participantes conectados em canais de voz.
- Mensagens agrupam mensagens consecutivas, mostram separadores de data, avatares e horários com adaptação para janelas estreitas; a tela ganhou estados de carregamento e erro mais claros.
- Explore apresenta publicações em grade responsiva com miniaturas de imagens, cartões específicos para vídeo e conteúdo sem mídia. Notificações separam itens lidos e não lidos e agrupam visualmente por data.
- A conexão em tempo real agora ignora eventos de sockets substituídos, usa reconexão com backoff e jitter e detecta heartbeat sem resposta; a interface informa conexão, reconexão e indisponibilidade.
- Mensagens carregam o histórico apenas ao abrir uma conversa, deduplicam eventos fora de ordem e limitam o cache local. A paginação antiga só é oferecida quando a API responde com `nextCursor`; servidores anteriores continuam usando o histórico legado.
- A matriz de QA Windows registra cenários pendentes de execução no aplicativo instalado; testes automatizados não contam como aprovação manual.
- O Explore ganhou uma interface responsiva para publicações carregadas, pesquisa de pessoas e descoberta de Fóruns usando rotas já existentes; a busca de publicações permanece limitada ao feed carregado.
- Rascunhos de DMs, mensagens de canais, tópicos/respostas de Fóruns e publicações usam armazenamento local cifrado pelo `safeStorage` do Electron, separados por conta e contexto; há retenção e limites, limpeza após envio ou descarte e aviso quando o armazenamento falha. O smoke real entre dois processos Electron 44.7.0 passou; a restauração visual no aplicativo instalado segue na matriz de QA.
- O recorte de banners usa as dimensões do elemento carregado, mantém o quadro visível em telas menores e impede aplicar antes de validar a imagem e a exportação.
- A política de mídia do Electron permite somente a API e os CDNs autorizados, e o diagnóstico registra eventos do player, status, MIME, tamanho, disposição, Range e falhas de rede sem guardar URLs ou tickets. Reprodução MP4 real no Windows continua pendente de QA.
- A criação de Fórum aguarda 1,1 s entre uploads simples consecutivos e mantém uploads já concluídos para evitar reenvio; respostas 429 do Blob não são repetidas automaticamente.
- Fóruns participados abrem em uma área integrada ao aplicativo, restauram o último canal acessível e preservam a sessão de voz ao alternar entre módulos. O painel separa organização, cargos/permissões e convites.
- A criação de Fórum mantém uploads bem-sucedidos para evitar reenvio e oferece continuar sem a imagem opcional cujo envio falhou. O player registra estado de rede e decodificação para distinguir melhor falhas de reprodução.
- Correções locais de interface: mensagens da comunidade agora usam avatares, emojis e figurinhas existentes; mensagens consecutivas são agrupadas, participantes de voz mostram avatar e estado de áudio, e janelas sobrepostas respeitam a barra de título do Windows.
- Vídeos MP4 privados em DMs tentam uma única reprodução alternativa com ticket novo e download limitado a 25 MB; erros de permissão, limite temporário, rede, formato e tamanho têm mensagens distintas. A causa da falha observada ainda depende de coleta real no Electron Windows.

- Prepara o cliente e o lockfile para a versão `0.15.1`, com `electron-builder` `26.18.0` e `electron-updater` `6.8.11` estáveis.
- Mantém o atualizador integrado desativado. Os erros de assinatura inválida/ausente e de integridade passam a ter mensagens específicas, sem expor detalhes internos.
- Atualiza os casos de segurança do atualizador para a nova versão base; a verificação criptográfica real de manifests e a atualização em Windows continuam pendentes.

### Pesquisa e compartilhamento (implementação local)

- O Explore consulta publicações acessíveis no endpoint paginado do backend; nas APIs anteriores, informa que a pesquisa completa não está disponível em vez de filtrar resultados carregados e apresentá-los como globais.
- A pesquisa de pessoas e Fóruns no Explore carrega páginas adicionais; a busca de Fóruns na API também considera descrição, tags e categorias de canais.
- A lista de Fóruns continua aceitando a resposta legada em array da API anterior; nesse modo, os resultados são exibidos sem paginação.
- Links copiados de publicações, perfis e Fóruns usam o protocolo Windows `anceryx://`, validado no processo principal e no preload. A API local inclui paginação e autorização de visibilidade para pesquisa de publicações; ainda não publicada.
- A API local adiciona pesquisa paginada de canais e mensagens comunitárias com autorização por participação, cargos, `viewChannel`/`readHistory` e moderação; a navegação abre o canal e tenta centralizar a mensagem. A descoberta local de Fóruns usa tags e métricas reais. Esses endpoints ainda dependem da implantação coordenada da API; 404 nas versões antigas é informado como recurso indisponível. QA real do protocolo no Electron Windows continua pendente.

### Comunidades

- A criação de fóruns oferece modelos iniciais, revisão de categorias e canais, finalidade e visibilidade; o fórum e sua estrutura inicial são enviados em uma única operação.
- O canal de publicações agora lista tópicos reais, permite criar, abrir, editar e excluir publicações próprias e responder a tópicos existentes.
- A tela inicial do fórum usa uma única ação para entrar/abrir a comunidade; o gerenciamento permanece dentro da experiência da comunidade.
- Canais podem ser recolhidos, e participantes de voz aparecem junto ao canal correspondente. A área de voz mostra participantes, estado do microfone e transmissões ativas.
- A organização da comunidade permite reordenar categorias e canais; ao escolher a herança da categoria, o cliente confirma antes de limpar permissões específicas do canal.
- O compartilhamento de tela no Electron permite escolher uma janela ou tela. A transmissão inclui vídeo; áudio do sistema não está habilitado.

### Aplicativo

- Inicia a preparação de uma build Web independente do Electron, com configuração Vercel e rotas SPA. O acesso público continua bloqueado até a configuração da API, DNS e QA em navegador.
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
