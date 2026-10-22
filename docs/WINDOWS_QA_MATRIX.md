# Matriz de QA manual — Anceryx Windows

Este roteiro prepara a validação da versão de QA no Electron Windows. Todos os itens começam como **Pendente**; marque-os como aprovados somente depois de executar no aplicativo instalado e registrar versão, build, resolução, escala do Windows e resultado. Os testes automatizados não substituem esta validação.

## Mensagens e mídias

| Cenário | Procedimento | Resultado esperado | Estado |
|---|---|---|---|
| Enviar e receber mensagem | Usar duas contas e enviar mensagens em ambos os sentidos. | Cada mensagem aparece uma vez, na conversa correta e em ordem. | Pendente |
| Carregamento sob demanda | Abrir Mensagens com várias conversas; depois abrir conversas diferentes. | A tela inicial carrega metadados; o histórico só é solicitado ao abrir cada conversa. | Pendente |
| Histórico antigo | Percorrer o início do histórico de uma DM com mais de 50 mensagens. | Com API atualizada, buscar páginas de 50 sem lacunas ou duplicações; com API anterior, o cliente informa que o recurso ainda não está disponível e não envia o parâmetro novo. | Pendente — API local e QA Windows |
| Reconexão | Interromper e restaurar a rede durante uma conversa. | O WebSocket reconecta; mensagens recebidas após a reconexão não aparecem duplicadas. | Pendente |
| Imagens e GIFs | Enviar imagem e GIF em DM e publicação. | Prévia, upload, persistência e abertura funcionam sem repetição do envio. | Pendente |
| Vídeo MP4 privado | Testar a mesma mídia em publicação e DM, registrando status, MIME, Range e eventos do elemento de vídeo. | Resposta autorizada 200/206 com bytes válidos e reprodução até o fim. | Pendente — QA Electron |
| Variantes MP4 | Comparar H.264 High + HE-AACv2, H.264 + AAC-LC e H.264 sem áudio. | Registrar cada variante separadamente; não inferir compatibilidade pelo codec de áudio. | Pendente — QA Electron |
| Figurinhas e embeds | Enviar figurinha e links compartilhados; abrir e fechar os previews. | Conteúdo preservado e modais sem overflow ou bloqueio de interação. | Pendente |
| Rascunhos cifrados | Salvar textos em DM, canal, tópico/resposta e Feed; fechar e reabrir o app e entrar com outra conta Anceryx. Descartar e enviar um texto. | O texto volta no mesmo usuário/contexto, não aparece em outra conta, apaga após envio/descarte e não inclui mídia temporária. | Smoke entre processos Electron aprovado; QA visual do aplicativo pendente |

## Pesquisa, descoberta e links compartilhados (implementação local 0.17.0)

Os endpoints novos de pesquisa e descoberta estão somente na API local. Em uma API anterior, o cliente deve indicar que o recurso ainda não está disponível; essa resposta não significa ausência permanente de suporte. A pesquisa de hashtags filtra publicações retornadas pela pesquisa de posts; não existe endpoint dedicado de hashtags.

| Cenário | Procedimento | Resultado esperado | Estado |
|---|---|---|---|
| Pesquisa de publicações | Pesquisar termo presente em conteúdo antigo, além do feed já carregado; avançar duas páginas. | Resultados vêm do endpoint, seguem ordem estável e não repetem itens. | Pendente — cliente e API locais |
| Privacidade na busca | Repetir a pesquisa com publicações de conta privada, visibilidade restrita, bloqueios e publicação excluída. | Nenhum conteúdo inacessível aparece, inclusive em snippets ou páginas seguintes. | Pendente — integração PostgreSQL e QA |
| Pessoas | Pesquisar nomes/usuários, avançar páginas e repetir com bloqueios entre as contas. | Apenas perfis autorizados; paginação sem duplicações. | Pendente |
| Fóruns e tags | Pesquisar por nome, descrição, tag e categoria; avançar páginas; incluir um Fórum privado. | Resultados públicos/acessíveis correspondem ao termo; Fórum privado não aparece para quem não tem acesso. | Pendente |
| Descoberta de Fóruns | Conferir paginação independente de recentes, destaques e sugestões, além das tags com Fóruns públicos, privados e excluídos. | Nenhum privado/excluído aparece; ranking usa tópicos/membros, sugestões usam tags e cada seção informa `hasMore` sem apresentar total parcial como global. | Integração PostgreSQL descartável com 125 Fóruns aprovada; QA visual Windows continua necessário |
| Hashtags | Pesquisar uma hashtag incluindo `#` e abrir a publicação encontrada. | Publicações acessíveis são pesquisadas pelo endpoint de posts, filtradas pela hashtag e paginadas com o mesmo cursor. | Implementação local; API não publicada e QA Windows pendente |
| Busca global e mensagens comunitárias | Pesquisar canais e mensagens; testar membro, canal privado, cargo autorizado/negado, sem `readHistory`, conteúdo moderado e abrir resultado antigo. | API não retorna canais inacessíveis nem DMs; o resultado abre a comunidade, canal e contexto da mensagem. | Implementação local; API não publicada e QA Windows pendente |
| Link de publicação | Copiar `anceryx://post/{id}`; abrir com o app fechado e aberto. Repetir com ID inválido. | App abre a publicação válida; destino inválido é ignorado com segurança. | Teste automatizado de validação aprovado; QA Windows pendente |
| Link de perfil e Fórum | Copiar os links pelo menu e abrir com o aplicativo instalado, conectado e desconectado. | Perfil/Fórum válido abre; conteúdo privado mantém a autorização da API. | Teste automatizado de parser aprovado; QA Windows pendente |
| Convite existente | Copiar e abrir `anceryx://invite/{token}` válido, expirado e malformado. | Fluxo atual continua preservado; token inválido não navega nem expõe dados. | Pendente |
| Inicialização, autenticação e deep link | Abrir links de post, perfil e Fórum com o app fechado, aberto e na tela de login; concluir autenticação após receber o link. | O app abre/ganha foco e entrega o destino uma única vez após a interface autenticada estar pronta; destino removido, privado ou inválido não revela conteúdo. | Parser automatizado aprovado; ciclo instalado e entrega após autenticação pendentes |
| Idioma e rede | Alterar idioma durante a pesquisa; simular desconexão e recuperar a rede. | Labels atualizam; erros e tentativas não deixam resultados antigos como se fossem atuais. | Pendente |

## Fóruns

| Cenário | Procedimento | Resultado esperado | Estado |
|---|---|---|---|
| Criar, excluir e recriar | Criar um Fórum de QA, excluir definitivamente e recriar com o mesmo nome. | A exclusão respeita confirmação e permissões; o nome pode ser reutilizado sem revelar o registro removido. | Pendente |
| Canais de texto | Entrar, alternar canais, enviar mensagens e atualizar o histórico. | Mensagens e seleção correspondem ao canal ativo; sem conteúdo duplicado. | Pendente |
| Canais de voz | Entrar, alternar e sair de canais com duas contas. | Participantes e estado persistem e sincronizam após reconexão. | Pendente |
| Membros e cargos | Adicionar/remover membros e atribuir/remover cargos com permissões distintas. | Cada ação autorizada funciona e ações proibidas são recusadas pela API. | Pendente |
| Moderação | Executar ações autorizadas e consultar histórico com uma conta moderadora. | A API aplica autorização e registra a auditoria; interface reflete o resultado. | Pendente |

## Chamadas

| Cenário | Procedimento | Resultado esperado | Estado |
|---|---|---|---|
| Entrada e saída | Fazer chamadas de voz e vídeo entre duas contas. | Estados de chamada e encerramento são coerentes nos dois clientes. | Pendente |
| Microfone e câmera | Alternar cada controle e testar câmera quando disponível. | Estado visual acompanha as tracks reais e a mídia remota. | Pendente |
| Compartilhamento de tela | Iniciar, interromper e alternar entre canais. | A captura termina ao sair e não encerra indevidamente a câmera. | Pendente |
| Dispositivos | Trocar microfone, câmera e saída de áudio quando disponíveis. | O dispositivo selecionado é aplicado ou a indisponibilidade é informada. | Pendente |
| Chat lateral e participantes | Abrir o chat da chamada e testar diferentes quantidades de participantes. | Painel e mosaico permanecem utilizáveis sem cobrir controles essenciais. | Pendente — QA visual |
| Perda de rede | Interromper e restaurar a conexão durante a chamada. | Falha/reconexão aparece claramente, sem participante fantasma ou chamada duplicada. | Pendente |

## Interface, acessibilidade e escalas

Para cada tamanho abaixo, abrir Feed, Explorar, Mensagens, Fóruns, Notificações, Perfil, Configurações e modais relevantes; testar navegação por teclado, foco visível, leitor de tela quando disponível, tema claro/escuro e idiomas configurados.

| Resolução | Escala Windows | Estado |
|---|---|---|
| 1024×768 | 100% e 125%, se disponível | Pendente |
| 1280×720 | 100% e 125%, se disponível | Pendente |
| 1366×768 | 100% e 125%, se disponível | Pendente |
| 1600×900 | 100% e 150%, se disponível | Pendente |
| 1920×1080 | 100% e 150%, se disponível | Pendente |

Registrar cortes, rolagem horizontal, modais fora da tela, áreas clicáveis, texto truncado e falhas em embeds. A validação automatizada de layout não marca estes itens como aprovados.

## Registro de execução

Para cada cenário, registrar: data, versão exibida pelo app, SHA do cliente, Windows, resolução, escala, contas de QA usadas (sem dados pessoais), passos executados, resultado, evidências sanitizadas e defeito aberto. Não incluir tokens, URLs assinadas, conteúdo privado de mensagens ou dados de outros usuários.
