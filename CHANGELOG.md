# Registro de alterações
- O workspace comunitário agora localiza controles, moderação, recursos, convites, canais, mensagens, eventos e voz em pt-BR, inglês e espanhol. Permissões, conteúdo enviado por membros e mensagens de erro livres da API permanecem preservados.
- O modal de publicações do Fórum também localiza seus controles e estados, mantendo títulos, respostas e conteúdo dos membros no idioma original.
- O modal de detalhes do Fórum agora localiza ações, contadores, descrição acessível e estados nos três idiomas; nomes e descrições do fórum continuam sendo conteúdo original.
- A criação de fóruns localiza os modelos iniciais, configurações, validações, upload de imagens e controles em português, inglês e espanhol. Os campos digitados e erros livres da API continuam preservados.
- A descoberta do Explore localiza os rótulos de fallback de mídia e mantém a página inicial, pesquisa contextual, filtros e conteúdo público existente.
- O feed localiza notificações de interação e mensagens genéricas de falha; a validação de upload reaproveita mensagens localizadas sem substituir erros específicos da API. O detalhe da publicação localiza o estado de nova tentativa.
- O perfil próprio localiza mensagens de conta, imagens, badges, fóruns públicos e listas; nomes, biografias, status e descrições de membros permanecem no idioma de origem. A busca de conexões agora respeita a região ativa.
- As prévias de publicações compartilhadas e os rótulos acessíveis de GIFs agora acompanham o idioma ativo; a atribuição da KLIPY é localizada e o título do GIF permanece como conteúdo original.
- Os controles de teste de áudio, a identificação da versão nas configurações e a ligação localizada entre os termos e a política de privacidade agora acompanham o idioma ativo. A atribuição da KLIPY nas mensagens também usa o catálogo.
- Os estados dos fluxos de retorno OAuth e abertura de links internos também acompanham o idioma ativo nas três localidades.
- Os erros de autenticação com códigos conhecidos agora são armazenados como chaves e renderizados conforme o idioma atual; respostas livres inesperadas do servidor continuam sem tradução arbitrária.

# Em desenvolvimento

- As seções de privacidade, notificações, perfil, atualizações e histórico de login, além das páginas de cobrança, agora acompanham o idioma ativo em português, inglês e espanhol. Textos livres do servidor e conteúdo de notas de versão continuam intactos.
- O gerenciamento de fóruns agora localiza moderação, filtros, configurações, ações e confirmações. A janela de perfil também localiza detalhes de cargos, conquistas e estados das listas, preservando nomes, descrições, motivos e justificativas enviados por membros ou pelo servidor.
- A seção de segurança da conta agora usa as traduções existentes também nos fluxos de configuração do autenticador e dos códigos de recuperação; o nome premium dos temas acompanha o idioma nas descrições acessíveis.
- Os rótulos acessíveis do gerenciamento de fóruns e das conquistas no perfil também foram localizados, incluindo descrições de ingresso e decisão.
- O canal de publicações da comunidade agora localiza controles, estados vazios e mensagens de erro genéricas nos três idiomas; títulos, respostas, conteúdo e nomes de membros continuam intactos.
- A área inicial de moderação do workspace localiza filtros de denúncias e rótulos de ações em pt-BR, inglês e espanhol, preservando mensagens, motivos e conteúdo fornecido por membros.
- O modal de perfil passou a localizar os principais estados, navegação, ações, listas, recursos de moderação e metadados de data; nomes, biografias, nomes de Fóruns e justificativas livres permanecem intactos. As abas e rótulos de cargos do gerenciamento de Fóruns agora acompanham o idioma ativo.
- A área do perfil agora localiza navegação, cabeçalho, estatísticas e edição de perfil; nomes, biografias, badges e status personalizados continuam sendo conteúdo de usuário.
- A seção de segurança localiza a verificação de e-mail, senha e etapas principais da configuração de autenticação em duas etapas. Mensagens de erro livres da API permanecem sem tradução automática.
- A área de mensagens diretas localiza busca, estados vazios, acessibilidade, chamadas, envio de denúncias e textos do próprio aplicativo, mantendo intactos o conteúdo das mensagens e os erros dinâmicos recebidos da API.

## Internacionalização — chamadas e componentes compartilhados

- Localizados em português, inglês e espanhol os estados e controles do cartão de chamada, o histórico de chamadas, os indicadores de presença e os seletores de emojis e figurinhas.
- Os avisos de conquistas e os rótulos acessíveis do visualizador de imagens acompanham o idioma ativo; nomes de conquistas, figurinhas e conteúdos recebidos permanecem intactos.
- A seção de voz das configurações agora localiza controles de dispositivos, volumes, permissões e testes de áudio.
- O seletor de recorte de imagens localiza instruções, mensagens de erro, zoom e ações sem substituir o título fornecido pelo fluxo que o abriu.
- A página de publicações salvas e a lista de pessoas seguidas localizam estados vazios, busca, ações e carregamento sem traduzir conteúdo dos membros.
- A página de descoberta de fóruns localiza busca, abas, estados vazios, convites e notificações geradas pelo aplicativo.
- As notas de versão e os estados da janela de atualização agora usam o catálogo; mensagens dinâmicas de erro do processo principal continuam sendo exibidas sem interpretação arbitrária.
- A área de cobrança localiza informações do plano e do portal do Stripe e formata a data de renovação conforme a preferência regional selecionada.
- Os controles de voz comunitária e a estrutura reutilizável do modal de gerenciamento de fóruns também acompanham o idioma, preservando os rótulos de seções enviados por seus chamadores.
- As categorias dos emojis Unicode e os rótulos de acessibilidade de emojis e figurinhas agora são localizados sem traduzir os nomes das figurinhas.
- As seções de conta e conexões de login localizam os campos, ações e estados do Google, mantendo intactas as mensagens livres do servidor e formatando datas na região escolhida.
- A lista de sessões e dispositivos agora localiza seus estados e ações e formata horários conforme a região, preservando os nomes de dispositivo e método informados pelo servidor.

## Internacionalização — autenticação e navegação global

- Adicionadas 96 chaves de interface em português brasileiro, inglês e espanhol para autenticação, recuperação de senha, MFA, navegação e componentes compartilhados.
- A preferência de idioma agora atualiza `document.documentElement.lang` imediatamente e permanece salva neste dispositivo.
- O ErrorBoundary, notificações globais e rótulos da navegação acompanham a troca de idioma sem reiniciar o aplicativo.

## Internacionalização — Feed e ações sociais

- O Feed, os cartões e detalhes de publicações, comentários, denúncias, bloqueios e status personalizados agora usam o catálogo nos três idiomas.
- Conteúdos escritos pelos usuários, incluindo publicações, comentários, nomes e status, continuam no idioma original.
- O relatório de cobertura inclui as novas chamadas de tradução; a métrica automatizada continua sendo parcial.
- Os controles e a sobreposição de chamadas, a seleção de dispositivos e rótulos da navegação de configurações também acompanham o idioma ativo.
- A tela de notificações localiza ações, estados vazios e falhas padrão; textos dinâmicos recebidos da API permanecem intactos.
- O compositor e o estado vazio de conversas localizam anexos, envio e acessibilidade sem alterar o texto digitado ou recebido nas mensagens.
- O cartão de fórum localiza seus rótulos e formata contagens conforme o idioma, mantendo nomes, descrições e tags definidos pelos membros.
- A auditoria de cobertura passou a contar texto estático em expressões JSX e templates de atributos/objetos; seu relatório continua identificando uma amostra parcial.

## Internacionalização — chamadas e navegação de configurações

- Os controles de chamada, a sobreposição e a seleção de dispositivos de áudio/vídeo agora usam o catálogo pt-BR, en-US e es-ES.
- A navegação de configurações e os controles de navegação móvel usam rótulos localizados; as seções internas ainda precisam de cobertura.

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
- O Explore abre em descoberta com publicações e fóruns; a busca só é executada após confirmação e revela então as categorias de resultados.
- O `.env.example` usa a API local para desenvolvimento; builds empacotados continuam limitados à API oficial de produção.
- O sino de notificações agora tem uma faixa reservada no layout do Dashboard, separada dos controles das telas Feed, DMs e Fóruns.
- Separadores de data em DMs deixam de ficar sticky, evitando que se sobreponham às mensagens durante a rolagem.
- A URL de desenvolvimento do renderer só é considerada em builds não empacotados, preservando webSecurity, CSP, navegação, carregamento local e menu de produção.
- A CSP passa a ter uma única política no HTML, com `connect-src` limitado às APIs, aos hosts de mídia necessários e às origens Klipy usadas para baixar GIFs.
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
