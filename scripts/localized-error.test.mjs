import assert from 'node:assert/strict'

const storage = new Map()
globalThis.localStorage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, String(value)),
  removeItem: (key) => storage.delete(key),
}
const [{ useUIStore }, { LocalizedUiError }, { translate }] = await Promise.all([
  import('../src/renderer/store/uiStore.ts'),
  import('../src/renderer/utils/localizedError.ts'),
  import('../src/renderer/i18nCatalog.ts'),
])

const previousLocale = useUIStore.getState().locale
try {
  const error = new LocalizedUiError('__i18n:auth.invalidCredentials')
  useUIStore.getState().setLocale('pt-BR')
  assert.equal(error.message, translate('auth.invalidCredentials', 'pt-BR'))
  useUIStore.getState().setLocale('en-US')
  assert.equal(error.message, translate('auth.invalidCredentials', 'en-US'))
  useUIStore.getState().setLocale('es-ES')
  assert.equal(error.message, translate('auth.invalidCredentials', 'es-ES'))
  assert.equal(new LocalizedUiError('Unrecognized server response').message, 'Unrecognized server response')
} finally {
  useUIStore.getState().setLocale(previousLocale)
}

console.log('localized error tests passed (dynamic locale updates and preservation of free text)')
