import assert from 'node:assert/strict'

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

for (const locale of ['pt-BR', 'en-US', 'es-ES']) {
  assert.ok(messages[locale]['auth.welcome'])
  assert.ok(messages[locale]['nav.primary'])
  assert.equal((messages[locale]['notifications.unreadCount'].match(/\{count\}/g) ?? []).length, 1)
}

console.log('Global i18n state tests passed (dynamic locale, persisted preference, auth and navigation catalog parity).')
