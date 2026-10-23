# Relatório de cobertura de internacionalização

> Estimativa automatizada de rótulos estáticos declarados em JSX e chamadas `t()`/`translate()`. Textos dinâmicos do servidor, mensagens montadas em arrays/objetos fora dos campos reconhecidos e strings em código imperativo não entram na métrica. Este percentual é uma medida parcial, não cobertura total de toda a interface.

- Chamadas de tradução detectadas: **2164**.
- Strings visíveis fixas detectadas: **128**.
- Cobertura medida neste subconjunto: **94.4%**.
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
| `components/messages/ExpressionPicker.tsx` | 17 | 3 | 85.0% |
| `components/messages/MessageBubble.tsx` | 2 | 1 | 66.7% |
| `components/messages/MessageComposer.tsx` | 11 | 0 | 100.0% |
| `components/messages/MessageImageViewer.tsx` | 4 | 0 | 100.0% |
| `components/messages/SharedPostPreview.tsx` | 0 | 1 | 0.0% |
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
| `components/settings/sections/SobreSection.tsx` | 18 | 1 | 94.7% |
| `components/settings/sections/UltimosLoginsSection.tsx` | 15 | 0 | 100.0% |
| `components/settings/sections/VozSection.tsx` | 27 | 3 | 90.0% |
| `components/settings/SettingsModal.tsx` | 7 | 0 | 100.0% |
| `components/settings/SettingsNav.tsx` | 5 | 2 | 71.4% |
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
| `lib/billingData.ts` | 0 | 3 | 0.0% |
| `lib/releaseNotes.ts` | 0 | 1 | 0.0% |
| `pages/AmigosPage.tsx` | 16 | 1 | 94.1% |
| `pages/BillingResultPage.tsx` | 8 | 0 | 100.0% |
| `pages/CobrancaPage.tsx` | 20 | 1 | 95.2% |
| `pages/DashboardPage.tsx` | 20 | 4 | 83.3% |
| `pages/ExplorePage.tsx` | 73 | 12 | 85.9% |
| `pages/FeedPage.tsx` | 40 | 4 | 90.9% |
| `pages/ForunsPage.tsx` | 20 | 0 | 100.0% |
| `pages/LoginPage.tsx` | 29 | 4 | 87.9% |
| `pages/MensagensPage.tsx` | 49 | 2 | 96.1% |
| `pages/NotificationsPage.tsx` | 32 | 0 | 100.0% |
| `pages/PerfilPage.tsx` | 53 | 11 | 82.8% |
| `pages/RegisterPage.tsx` | 25 | 2 | 92.6% |
| `pages/SavedPostsPage.tsx` | 11 | 0 | 100.0% |
| `pages/WebOAuthCallbackPage.tsx` | 0 | 3 | 0.0% |
| `router/WebDeepLinkPage.tsx` | 0 | 1 | 0.0% |
| `utils/communityMemberGroups.ts` | 5 | 0 | 100.0% |
| `utils/communityVoiceControls.ts` | 0 | 6 | 0.0% |

## Revisão manual dos módulos trabalhados

- `components/social/CreateForumModal.tsx`: os três itens detectados (`*`, `*`, `#`) são símbolos obrigatórios e marcadores visuais. Os textos do fluxo e os modelos iniciais são localizados. Campos do usuário e erros livres da API permanecem originais.
- `components/social/ForumDetailModal.tsx`: nomes e descrições do fórum são conteúdo dinâmico; o item fixo residual é pontuação de apresentação.
- `pages/ExplorePage.tsx`: os 12 itens detectados são separadores e marcadores (`·`, `@`, `#`) associados a nomes ou conteúdo de publicações. Fallbacks de mídia, pesquisa, categorias e estados têm tradução.
- `pages/FeedPage.tsx`: os quatro itens são `@`, `•` e aspas tipográficas usados como marcadores; notificações, erros genéricos e mensagens de validação são localizados. Erros livres recebidos de serviços permanecem inalterados.
- `components/social/PostDetailModal.tsx`: os quatro itens restantes são os marcadores `@` e `·` exibidos junto a nomes/identificadores; controles e estado de nova tentativa são localizados. O conteúdo de publicações e comentários permanece intacto.

## Módulos ainda na fila

O relatório estático não determina sozinho se cada literal restante é interface, conteúdo do usuário, identificador técnico ou símbolo. A revisão deve continuar pelos módulos com contagens residuais na tabela, priorizando `PerfilPage.tsx`, `DashboardPage.tsx`, `ForumManagementModal.tsx`, `UserProfileModal.tsx`, `CommunityWorkspaceModal.tsx`, componentes de mensagens e chamadas, e as telas de autenticação. O percentual geral é uma estimativa parcial e não prova tradução total.
| `utils/validators.ts` | 11 | 0 | 100.0% |
