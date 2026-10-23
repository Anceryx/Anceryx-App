# Relatório de cobertura de internacionalização

> Estimativa automatizada de rótulos estáticos declarados em JSX e chamadas `t()`/`translate()`. Textos dinâmicos do servidor, mensagens montadas em arrays/objetos fora dos campos reconhecidos e strings em código imperativo não entram na métrica. Este percentual é uma medida parcial, não cobertura total de toda a interface.

- Chamadas de tradução detectadas: **2216**.
- Strings visíveis fixas detectadas: **100**.
- Cobertura medida neste subconjunto: **95.7%**.
- Catálogos exigidos: pt-BR, en-US e es-ES; paridade, placeholders e chaves vazias são verificados por `npm run test:i18n-catalog`.

| Módulo | Chamadas traduzidas | Strings fixas detectadas | Cobertura medida |
| --- | ---: | ---: | ---: |
| `components/calls/CallControls.tsx` | 15 | 0 | 100.0% |
| `components/calls/CallOverlay.tsx` | 25 | 0 | 100.0% |
| `components/calls/DeviceSelector.tsx` | 22 | 0 | 100.0% |
| `components/calls/MiniCallCard.tsx` | 36 | 2 | 94.7% |
| `components/ErrorBoundary.tsx` | 3 | 0 | 100.0% |
| `components/layout/AchievementToast.tsx` | 6 | 0 | 100.0% |
| `components/layout/NotificationCenter.tsx` | 32 | 0 | 100.0% |
| `components/layout/NotificationToast.tsx` | 2 | 0 | 100.0% |
| `components/layout/RealtimeConnectionNotice.tsx` | 1 | 0 | 100.0% |
| `components/layout/ReleaseNotesModal.tsx` | 5 | 0 | 100.0% |
| `components/layout/TitleBar.tsx` | 6 | 2 | 75.0% |
| `components/layout/UpdateModal.tsx` | 15 | 0 | 100.0% |
| `components/messages/CallHistoryMessage.tsx` | 7 | 0 | 100.0% |
| `components/messages/ConversationHeader.tsx` | 9 | 1 | 90.0% |
| `components/messages/EmptyConversation.tsx` | 3 | 0 | 100.0% |
| `components/messages/ExpressionPicker.tsx` | 19 | 1 | 95.0% |
| `components/messages/MessageBubble.tsx` | 3 | 0 | 100.0% |
| `components/messages/MessageComposer.tsx` | 11 | 0 | 100.0% |
| `components/messages/MessageImageViewer.tsx` | 4 | 0 | 100.0% |
| `components/messages/SharedPostPreview.tsx` | 3 | 0 | 100.0% |
| `components/messages/StickerPicker.tsx` | 7 | 1 | 87.5% |
| `components/messages/TypingIndicator.tsx` | 1 | 0 | 100.0% |
| `components/settings/sections/CobrancaSection.tsx` | 21 | 0 | 100.0% |
| `components/settings/sections/ConexoesLoginSection.tsx` | 21 | 1 | 95.5% |
| `components/settings/sections/ContaSection.tsx` | 14 | 0 | 100.0% |
| `components/settings/sections/DadosPrivacidadeSection.tsx` | 20 | 1 | 95.2% |
| `components/settings/sections/ExperienciaSection.tsx` | 73 | 4 | 94.8% |
| `components/settings/sections/NotificacoesSection.tsx` | 24 | 0 | 100.0% |
| `components/settings/sections/PerfilSection.tsx` | 19 | 1 | 95.0% |
| `components/settings/sections/SegurancaSection.tsx` | 79 | 0 | 100.0% |
| `components/settings/sections/SessoesDispositivosSection.tsx` | 15 | 0 | 100.0% |
| `components/settings/sections/SobreSection.tsx` | 19 | 1 | 95.0% |
| `components/settings/sections/UltimosLoginsSection.tsx` | 15 | 0 | 100.0% |
| `components/settings/sections/VozSection.tsx` | 30 | 0 | 100.0% |
| `components/settings/SettingsModal.tsx` | 7 | 0 | 100.0% |
| `components/settings/SettingsNav.tsx` | 6 | 1 | 85.7% |
| `components/social/CommunityForumChannel.tsx` | 38 | 4 | 90.5% |
| `components/social/CommunityManagementModal.tsx` | 7 | 0 | 100.0% |
| `components/social/CommunityVoiceActionButtons.tsx` | 14 | 0 | 100.0% |
| `components/social/CommunityWorkspaceModal.tsx` | 672 | 19 | 97.3% |
| `components/social/CreateForumModal.tsx` | 50 | 3 | 94.3% |
| `components/social/ForumCard.tsx` | 6 | 2 | 75.0% |
| `components/social/ForumDetailModal.tsx` | 11 | 1 | 91.7% |
| `components/social/ForumManagementModal.tsx` | 147 | 3 | 98.0% |
| `components/social/PostCard.tsx` | 44 | 2 | 95.7% |
| `components/social/PostDetailModal.tsx` | 17 | 4 | 81.0% |
| `components/social/ProfileMenu.tsx` | 27 | 1 | 96.4% |
| `components/social/SetStatusModal.tsx` | 19 | 0 | 100.0% |
| `components/social/StatusBubble.tsx` | 1 | 0 | 100.0% |
| `components/social/UserProfileModal.tsx` | 79 | 5 | 94.0% |
| `components/ui/Avatar.tsx` | 1 | 0 | 100.0% |
| `components/ui/Badge.tsx` | 1 | 0 | 100.0% |
| `components/ui/EmojiPicker.tsx` | 5 | 0 | 100.0% |
| `components/ui/ImageCropModal.tsx` | 11 | 0 | 100.0% |
| `components/ui/MediaAttachment.tsx` | 12 | 0 | 100.0% |
| `components/ui/Modal.tsx` | 1 | 0 | 100.0% |
| `components/ui/Spinner.tsx` | 1 | 0 | 100.0% |
| `hooks/usePersistentDraft.ts` | 1 | 0 | 100.0% |
| `image-crop-visual-test.tsx` | 0 | 5 | 0.0% |
| `pages/AmigosPage.tsx` | 16 | 1 | 94.1% |
| `pages/BillingResultPage.tsx` | 8 | 0 | 100.0% |
| `pages/CobrancaPage.tsx` | 21 | 1 | 95.5% |
| `pages/DashboardPage.tsx` | 20 | 4 | 83.3% |
| `pages/ExplorePage.tsx` | 73 | 12 | 85.9% |
| `pages/FeedPage.tsx` | 40 | 4 | 90.9% |
| `pages/ForunsPage.tsx` | 20 | 0 | 100.0% |
| `pages/LoginPage.tsx` | 30 | 3 | 90.9% |
| `pages/MensagensPage.tsx` | 50 | 1 | 98.0% |
| `pages/NotificationsPage.tsx` | 32 | 0 | 100.0% |
| `pages/PerfilPage.tsx` | 86 | 2 | 97.7% |
| `pages/RegisterPage.tsx` | 26 | 1 | 96.3% |
| `pages/SavedPostsPage.tsx` | 11 | 0 | 100.0% |
| `pages/WebOAuthCallbackPage.tsx` | 3 | 0 | 100.0% |
| `router/WebDeepLinkPage.tsx` | 1 | 0 | 100.0% |
| `utils/communityMemberGroups.ts` | 5 | 0 | 100.0% |
| `utils/communityVoiceControls.ts` | 0 | 6 | 0.0% |
| `utils/validators.ts` | 11 | 0 | 100.0% |

## Revisão manual das superfícies priorizadas

- `components/social/CreateForumModal.tsx`: os três itens fixos são símbolos `*`, `*` e `#` usados em campos obrigatórios e marcadores visuais. Modelos iniciais e interface usam o catálogo; campos e tags do usuário não são traduzidos.
- `components/social/ForumDetailModal.tsx`: o resíduo é pontuação visual. Nomes e descrições dos fóruns permanecem como conteúdo fornecido por seus autores.
- `pages/ExplorePage.tsx`: os 12 itens são separadores e símbolos `·`, `@` e `#`; fallback de mídia, estados, pesquisa, categorias e paginação têm chaves. Conteúdos e nomes sociais permanecem originais.
- `pages/FeedPage.tsx`: os quatro itens residuais são `@`, `•` e aspas de apresentação. Notificações, erros genéricos e validações de upload usam traduções. Mensagens de erro livres de serviços são preservadas.
- `components/social/PostDetailModal.tsx`: os quatro resíduos são marcadores `@` e `·` ao lado de nomes/identificadores; ações e estado de nova tentativa são localizados. Posts e comentários permanecem intactos.
- `pages/PerfilPage.tsx`: os dois itens residuais são `@` antes do nome de usuário. Erros locais, estados, badges, fóruns, imagens e listas usam chaves; nomes, biografias, descrições e status fornecidos por usuários permanecem no idioma original. A busca respeita a localidade ativa.
- `components/messages/SharedPostPreview.tsx`: autoria, carregamento e indisponibilidade da prévia usam o catálogo; o conteúdo do post não é traduzido.
- `components/messages/ExpressionPicker.tsx` e `MessageBubble.tsx`: a atribuição do provedor KLIPY e o rótulo acessível do botão GIF são localizados; títulos e conteúdo de GIFs continuam intactos.
- `pages/MensagensPage.tsx`: a atribuição de GIFs nas conversas usa a mesma tradução do seletor e da bolha de mensagem.
- `components/settings/sections/VozSection.tsx` e `SettingsNav.tsx`: os controles de teste de áudio e o rótulo da versão do aplicativo acompanham o idioma.
- `pages/LoginPage.tsx` e `RegisterPage.tsx`: a conjunção entre os links de termos e privacidade é localizada para preservar a gramática nos três idiomas.
- `pages/WebOAuthCallbackPage.tsx` e `router/WebDeepLinkPage.tsx`: erros/estados do retorno OAuth e a abertura de links internos usam o catálogo. Esses componentes de compatibilidade não reativam o produto web.
- `services/authApi.ts`: erros de autenticação para códigos conhecidos agora retornam chaves localizáveis; erros desconhecidos continuam com mensagem genérica segura e a resposta livre da API não é interpretada nem traduzida.
- `pages/LoginPage.tsx` e `pages/RegisterPage.tsx`: estados locais de configuração e abertura do acesso Google usam chaves do catálogo junto com os demais erros de autenticação.
- `services/apiClient.ts`, `services/mediaApi.ts`, `services/realtimeClient.ts` e `services/webrtc/*`: mensagens próprias do cliente para falhas de conexão, upload, mídia, tela e voz usam erros que consultam o idioma ativo no momento da leitura. Mensagens livres recebidas da API continuam preservadas.
- `services/apiConfig.ts`: erros locais de URL, protocolo e exigência de HTTPS em produção usam o catálogo; a lista de origens permitidas permanece a mesma.
- `components/layout/UpdateModal.tsx`: os estados de atualização, os canais stable/beta e falhas seguras são localizados no renderer; textos de notas de versão fornecidos junto com a versão mantêm o idioma original do publicador.

## Ocorrências restantes e classificação

- `components/calls/MiniCallCard.tsx`: dois literais detectados são blocos CSS de `@keyframes` e classes de animação, sem texto apresentado ao usuário.
- `components/layout/TitleBar.tsx`, `components/messages/ExpressionPicker.tsx`, `components/messages/StickerPicker.tsx`, `components/settings/sections/SobreSection.tsx` e `pages/DashboardPage.tsx`: ocorrências restantes são os nomes próprios Anceryx, Anceryx+ e Kaoli; devem permanecer intactos.
- `components/messages/ConversationHeader.tsx`: hífen é separador visual de identificador, sem conteúdo linguístico.
- `components/settings/sections/ConexoesLoginSection.tsx`: Google é o nome próprio do provedor de autenticação.
- `components/settings/sections/ExperienciaSection.tsx`: `720p`, `1080p` e `Aa` são valores técnicos/ícone tipográfico; Anceryx+ é marca.
- `components/settings/SettingsNav.tsx`: versão numérica e placeholder técnico foram mantidos; o rótulo de produto foi localizado.
- `components/social/CommunityWorkspaceModal.tsx`: `ID`, setas, o nome técnico de ação `community.role.update` e o prefixo do deep link são identificadores, símbolos ou exemplo de filtro, não rótulos de interface.
- `components/social/UserProfileModal.tsx`: `✦` é ícone decorativo acessível como oculto; nomes, biografias e conteúdo do perfil permanecem originais.
- `components/ui/EmojiPicker.tsx`, `pages/ExplorePage.tsx` e `pages/PerfilPage.tsx`: parâmetros dinâmicos/símbolos e marcadores de nomes; os dados recebidos não são traduzidos.
- `image-crop-visual-test.tsx`: textos pertencem ao harness de teste visual e não são incluídos na interface distribuída.
- `lib/billingData.ts` agora mantém somente os identificadores dos planos; o selo popular usa o catálogo. `lib/releaseNotes.ts` mantém chaves de tradução, resolvidas pelo modal.
- `pages/FeedPage.tsx`: resíduos são aspas e marcadores tipográficos ao redor de texto de usuário.
- `utils/communityVoiceControls.ts`: os literais são chaves tipadas do catálogo, consumidas por `t()` no componente de controles de voz.
- `main/updater/*`: mensagens internas ainda chegam no snapshot em português, mas o renderer agora exibe rótulos localizados pelo estado; o texto é usado apenas como marcador interno para identificar a pausa de segurança, sem mostrar a frase original.

## Revisão final dos candidatos estáticos

A execução de 23/10/2026 encontrou 2.216 chamadas de tradução e 100 candidatos fixos (95,7% neste subconjunto). A revisão individual identificou zero frases de interface conhecidas que ainda precisem de uma chave de tradução. Os 100 candidatos restantes são exceções: CSS de animação e separadores visuais em `MiniCallCard.tsx`; marcas e nomes próprios (Anceryx, Anceryx+, Kaoli, Google); pontuação e símbolos de handles, hashtags, datas e contadores; resoluções de vídeo e amostra tipográfica `Aa`; o identificador de ação `community.role.update`, o prefixo `ID:` e o esquema `anceryx://invite/`; as chaves tipadas de `utils/communityVoiceControls.ts`; e os cinco rótulos do harness `image-crop-visual-test.tsx`, que não é importado pela interface distribuída. Textos de nomes, biografias, posts, respostas, motivos, mensagens e notas livres do publicador são conteúdo externo e permanecem no idioma de origem.

Os textos obsoletos de cobrança e release notes foram removidos dos dados não utilizados; a badge de cobrança foi conectada ao catálogo. O teste da comunidade agora verifica a chave traduzida do estado vazio. A métrica automatizada não inspeciona toda expressão/estado renderizado, portanto a conclusão de zero pendências conhecidas baseia-se também nessa inspeção manual e ainda requer QA visual de cada idioma no aplicativo Windows.
