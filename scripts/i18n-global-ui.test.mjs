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

const [postCard, postDetail, messagesPage] = await Promise.all([
  readFile(new URL('../src/renderer/components/social/PostCard.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/renderer/components/social/PostDetailModal.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/renderer/pages/MensagensPage.tsx', import.meta.url), 'utf8'),
])
assert.match(postCard, /renderContent\(post\.content\)/, 'post content must remain user-authored text')
assert.match(postDetail, /renderAnceryxText\(comment\.content\)/, 'comment content must remain user-authored text')
assert.match(messagesPage, /message\.content/, 'private message content must remain untouched by UI localization')
assert.match(postCard, /useTranslation\(\)/, 'post actions must react to locale changes')

console.log('Global i18n state tests passed (dynamic locale, persisted preference, auth/navigation/social catalog parity and user-content preservation).')
