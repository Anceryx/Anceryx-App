import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const stored = new Map()
globalThis.localStorage = {
  getItem: (key) => stored.get(key) ?? null,
  setItem: (key, value) => stored.set(key, String(value)),
  removeItem: (key) => stored.delete(key),
}

const [{ useUIStore }, { translate, messages }] = await Promise.all([
  import('../src/renderer/store/uiStore.ts'),
  import('../src/renderer/i18nCatalog.ts'),
])

const state = useUIStore.getState()
state.openPost('post-preserved')
state.setLocale('en-US')
assert.equal(useUIStore.getState().locale, 'en-US')
assert.equal(useUIStore.getState().pendingPostId, 'post-preserved')
assert.match(translate('auth.submitLogin', useUIStore.getState().locale), /Sign in/)
assert.equal(JSON.parse(stored.get('anceryx-ui')).state.locale, 'en-US')

useUIStore.getState().setLocale('es-ES')
assert.match(translate('nav.primary', useUIStore.getState().locale), /Navegación/)
assert.equal(JSON.parse(stored.get('anceryx-ui')).state.locale, 'es-ES')
assert.match(translate('auth.recoverySent', 'pt-BR'), /redefinir sua senha/)
assert.equal(translate('auth.submitLogin', 'en-US'), 'Sign in')
assert.equal(translate('post.delete', 'en-US'), 'Delete post')
assert.equal(translate('status.title', 'es-ES'), 'Definir tu estado')
assert.equal(translate('calls.shareScreen', 'en-US'), 'Share screen')
assert.equal(translate('settings.backToCategories', 'es-ES'), 'Volver a las categorías de configuración')
assert.equal(translate('messages.composePlaceholder', 'en-US'), 'Write a message…')
assert.equal(translate('messages.send', 'es-ES'), 'Enviar mensaje')
assert.equal(translate('forums.join', 'en-US'), 'Join')

for (const locale of ['pt-BR', 'en-US', 'es-ES']) {
  assert.ok(messages[locale]['auth.welcome'])
  assert.ok(messages[locale]['nav.primary'])
  assert.equal((messages[locale]['notifications.unreadCount'].match(/\{count\}/g) ?? []).length, 1)
  for (const key of ['post.delete', 'status.title', 'calls.shareScreen', 'settings.backToCategories', 'messages.composePlaceholder', 'messages.send', 'forums.join']) assert.ok(messages[locale][key], `${locale}.${key} must be localized`)
}

const [postCard, postDetail, messagesPage, statusBubble, imageViewer, callHistory, voiceSettings, friendsPage, imageCrop, savedPosts, forumsPage, updateModal, releaseNotes, billingSettings, communityVoice, managementModal, expressionPicker, accountSettings, loginConnections, sessionsSettings, securitySettings] = await Promise.all([
  readFile(new URL('../src/renderer/components/social/PostCard.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/renderer/components/social/PostDetailModal.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/renderer/pages/MensagensPage.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/renderer/components/social/StatusBubble.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/renderer/components/messages/MessageImageViewer.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/renderer/components/messages/CallHistoryMessage.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/renderer/components/settings/sections/VozSection.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/renderer/pages/AmigosPage.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/renderer/components/ui/ImageCropModal.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/renderer/pages/SavedPostsPage.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/renderer/pages/ForunsPage.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/renderer/components/layout/UpdateModal.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/renderer/components/layout/ReleaseNotesModal.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/renderer/components/settings/sections/CobrancaSection.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/renderer/components/social/CommunityVoiceActionButtons.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/renderer/components/social/CommunityManagementModal.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/renderer/components/messages/ExpressionPicker.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/renderer/components/settings/sections/ContaSection.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/renderer/components/settings/sections/ConexoesLoginSection.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/renderer/components/settings/sections/SessoesDispositivosSection.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/renderer/components/settings/sections/SegurancaSection.tsx', import.meta.url), 'utf8'),
])
assert.match(postCard, /renderContent\(post\.content\)/, 'post content must remain user-authored text')
assert.match(postDetail, /renderAnceryxText\(comment\.content\)/, 'comment content must remain user-authored text')
assert.match(messagesPage, /message\.content/, 'private message content must remain untouched by UI localization')
assert.match(postCard, /useTranslation\(\)/, 'post actions must react to locale changes')
assert.match(statusBubble, /status\.text/, 'custom status text must remain user-authored content')
assert.match(statusBubble, /common\.statusWithValue/, 'status accessibility label must use localized UI text')
assert.match(imageViewer, /messages\.imageViewer/, 'image viewer UI must use the active locale')
assert.match(callHistory, /calls\.historyCompleted/, 'system call history labels must use the active locale')
assert.match(voiceSettings, /settings\.voice\.inputDevice/, 'voice settings controls must use the active locale')
assert.match(friendsPage, /friends\.noFollowing/, 'friend list empty states must use the active locale')
assert.match(imageCrop, /imageCrop\.gifNotice/, 'crop notices must use the active locale')
assert.match(savedPosts, /savedPosts\.emptyHint/, 'saved post empty states must use the active locale')
assert.match(forumsPage, /forumsPage\.noSearchResults/, 'forum discovery states must use the active locale')
assert.match(updateModal, /updates\.securityPaused/, 'updater security status must use the active locale')
assert.match(releaseNotes, /releaseNotes\.gifTitle/, 'release notes must use the active locale')
assert.match(billingSettings, /billing\.paymentMethod/, 'billing settings must use the active locale')
assert.match(communityVoice, /useTranslation\(\)/, 'community voice controls must use the active locale')
assert.match(managementModal, /forums\.managementPanel/, 'community management chrome must use the active locale')
assert.match(expressionPicker, /emojiCategory\.activities/, 'emoji category labels must use the active locale')
assert.match(accountSettings, /account\.displayName/, 'account settings must use the active locale')
assert.match(loginConnections, /loginConnections\.googleNotConfigured/, 'login connections must use the active locale')
assert.match(sessionsSettings, /sessions\.details/, 'session metadata labels must use the active locale')
assert.match(securitySettings, /security\.secretIssuer/, 'authenticator setup details must use the active locale')
assert.match(securitySettings, /security\.recoveryInstructions/, 'recovery-code instructions must use the active locale')
for (const locale of ['pt-BR', 'en-US', 'es-ES']) {
  for (const key of ['achievement.new', 'messages.openImage', 'messages.closeImage', 'messages.imageViewer', 'messages.insertEmoji', 'messages.sendSticker', 'common.statusWithValue', 'common.premium', 'calls.historyCompleted', 'settings.voice.inputDevice', 'settings.voice.outputUnsupported', 'friends.followers', 'friends.noFollowing', 'imageCrop.area', 'imageCrop.openFailed', 'savedPosts.title', 'savedPosts.loadMoreFailed', 'forumsPage.search', 'forumsPage.noSearchResults', 'updates.securityPaused', 'releaseNotes.gifKlipy', 'billing.manageSubscription', 'billing.paymentMethod', 'communityVoice.leaveChannel', 'forums.managementTitle', 'emojiCategory.flags', 'account.description', 'loginConnections.googleNotConfigured', 'sessions.revokeOthersFailed', 'sessions.details', 'security.secretIssuer', 'security.recoveryInstructions']) assert.ok(messages[locale][key], `${locale}.${key} must be localized`)
}

console.log('Global i18n state tests passed (dynamic locale, persisted preference, auth/navigation/social catalog parity and user-content preservation).')
