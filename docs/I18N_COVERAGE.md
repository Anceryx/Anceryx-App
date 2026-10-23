# Relatório de cobertura de internacionalização

> Estimativa automatizada de rótulos estáticos declarados em JSX e chamadas `t()`/`translate()`. Textos dinâmicos do servidor, mensagens montadas em arrays/objetos fora dos campos reconhecidos e strings em código imperativo não entram na métrica. Este percentual é uma medida parcial, não cobertura total de toda a interface.

- Chamadas de tradução detectadas: **302**.
- Strings visíveis fixas detectadas: **1227**.
- Cobertura medida neste subconjunto: **19.8%**.
- Catálogos exigidos: pt-BR, en-US e es-ES; paridade, placeholders e chaves vazias são verificados por `npm run test:i18n-catalog`.

| Módulo | Chamadas traduzidas | Strings fixas detectadas | Cobertura medida |
| --- | ---: | ---: | ---: |
| `components/calls/CallControls.tsx` | 0 | 2 | 0.0% |
| `components/calls/CallOverlay.tsx` | 0 | 13 | 0.0% |
| `components/calls/DeviceSelector.tsx` | 0 | 11 | 0.0% |
| `components/calls/MiniCallCard.tsx` | 0 | 19 | 0.0% |
| `components/ErrorBoundary.tsx` | 3 | 0 | 100.0% |
| `components/layout/AchievementToast.tsx` | 0 | 6 | 0.0% |
| `components/layout/NotificationCenter.tsx` | 32 | 0 | 100.0% |
| `components/layout/NotificationToast.tsx` | 0 | 2 | 0.0% |
| `components/layout/RealtimeConnectionNotice.tsx` | 1 | 0 | 100.0% |
| `components/layout/ReleaseNotesModal.tsx` | 0 | 2 | 0.0% |
| `components/layout/TitleBar.tsx` | 6 | 2 | 75.0% |
| `components/layout/UpdateModal.tsx` | 0 | 8 | 0.0% |
| `components/messages/ConversationHeader.tsx` | 0 | 6 | 0.0% |
| `components/messages/EmptyConversation.tsx` | 0 | 3 | 0.0% |
| `components/messages/ExpressionPicker.tsx` | 0 | 11 | 0.0% |
| `components/messages/MessageBubble.tsx` | 0 | 2 | 0.0% |
| `components/messages/MessageComposer.tsx` | 0 | 10 | 0.0% |
| `components/messages/MessageImageViewer.tsx` | 0 | 3 | 0.0% |
| `components/messages/SharedPostPreview.tsx` | 0 | 1 | 0.0% |
| `components/messages/StickerPicker.tsx` | 0 | 6 | 0.0% |
| `components/messages/TypingIndicator.tsx` | 0 | 1 | 0.0% |
| `components/settings/sections/CobrancaSection.tsx` | 0 | 9 | 0.0% |
| `components/settings/sections/ConexoesLoginSection.tsx` | 0 | 10 | 0.0% |
| `components/settings/sections/ContaSection.tsx` | 0 | 10 | 0.0% |
| `components/settings/sections/DadosPrivacidadeSection.tsx` | 0 | 18 | 0.0% |
| `components/settings/sections/ExperienciaSection.tsx` | 72 | 8 | 90.0% |
| `components/settings/sections/NotificacoesSection.tsx` | 0 | 21 | 0.0% |
| `components/settings/sections/PerfilSection.tsx` | 0 | 17 | 0.0% |
| `components/settings/sections/SegurancaSection.tsx` | 0 | 58 | 0.0% |
| `components/settings/sections/SessoesDispositivosSection.tsx` | 0 | 8 | 0.0% |
| `components/settings/sections/SobreSection.tsx` | 0 | 12 | 0.0% |
| `components/settings/sections/UltimosLoginsSection.tsx` | 0 | 6 | 0.0% |
| `components/settings/sections/VozSection.tsx` | 0 | 23 | 0.0% |
| `components/settings/SettingsModal.tsx` | 3 | 3 | 50.0% |
| `components/settings/SettingsNav.tsx` | 2 | 5 | 28.6% |
| `components/social/CommunityForumChannel.tsx` | 0 | 33 | 0.0% |
| `components/social/CommunityManagementModal.tsx` | 0 | 5 | 0.0% |
| `components/social/CommunityVoiceActionButtons.tsx` | 0 | 3 | 0.0% |
| `components/social/CommunityWorkspaceModal.tsx` | 0 | 386 | 0.0% |
| `components/social/CreateForumModal.tsx` | 0 | 43 | 0.0% |
| `components/social/ForumCard.tsx` | 0 | 5 | 0.0% |
| `components/social/ForumDetailModal.tsx` | 0 | 8 | 0.0% |
| `components/social/ForumManagementModal.tsx` | 0 | 102 | 0.0% |
| `components/social/PostCard.tsx` | 0 | 25 | 0.0% |
| `components/social/PostDetailModal.tsx` | 0 | 16 | 0.0% |
| `components/social/ProfileMenu.tsx` | 0 | 9 | 0.0% |
| `components/social/SetStatusModal.tsx` | 0 | 16 | 0.0% |
| `components/social/UserProfileModal.tsx` | 0 | 43 | 0.0% |
| `components/ui/EmojiPicker.tsx` | 0 | 3 | 0.0% |
| `components/ui/ImageCropModal.tsx` | 0 | 9 | 0.0% |
| `components/ui/MediaAttachment.tsx` | 12 | 0 | 100.0% |
| `components/ui/Modal.tsx` | 1 | 0 | 100.0% |
| `components/ui/Spinner.tsx` | 1 | 0 | 100.0% |
| `hooks/usePersistentDraft.ts` | 1 | 0 | 100.0% |
| `image-crop-visual-test.tsx` | 0 | 5 | 0.0% |
| `lib/billingData.ts` | 0 | 3 | 0.0% |
| `lib/releaseNotes.ts` | 0 | 1 | 0.0% |
| `pages/AmigosPage.tsx` | 0 | 10 | 0.0% |
| `pages/BillingResultPage.tsx` | 0 | 1 | 0.0% |
| `pages/CobrancaPage.tsx` | 0 | 17 | 0.0% |
| `pages/DashboardPage.tsx` | 20 | 4 | 83.3% |
| `pages/ExplorePage.tsx` | 71 | 12 | 85.5% |
| `pages/FeedPage.tsx` | 0 | 31 | 0.0% |
| `pages/ForunsPage.tsx` | 0 | 12 | 0.0% |
| `pages/LoginPage.tsx` | 29 | 3 | 90.6% |
| `pages/MensagensPage.tsx` | 12 | 27 | 30.8% |
| `pages/NotificationsPage.tsx` | 11 | 12 | 47.8% |
| `pages/PerfilPage.tsx` | 0 | 48 | 0.0% |
| `pages/RegisterPage.tsx` | 25 | 2 | 92.6% |
| `pages/SavedPostsPage.tsx` | 0 | 7 | 0.0% |
| `pages/WebOAuthCallbackPage.tsx` | 0 | 3 | 0.0% |
| `router/WebDeepLinkPage.tsx` | 0 | 1 | 0.0% |
| `utils/communityVoiceControls.ts` | 0 | 6 | 0.0% |
