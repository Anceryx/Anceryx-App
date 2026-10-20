import test from 'node:test'
import assert from 'node:assert/strict'
import { resolveThemeForRender, isPremiumTheme } from '../src/renderer/lib/theme.ts'
import { hasAnceryxPlus } from '../src/renderer/lib/premium.ts'

const storage = new Map()
globalThis.localStorage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, String(value)),
  removeItem: (key) => storage.delete(key),
}
const { useUIStore } = await import('../src/renderer/store/uiStore.ts')

test('mantém as quatro opções e não altera os temas gratuitos', () => {
  assert.deepEqual(['dark', 'light', 'autumn', 'rose-moon'].map((theme) => isPremiumTheme(theme)), [false, false, true, true])
  for (const theme of ['dark', 'light']) {
    assert.equal(resolveThemeForRender(theme, 'authenticated', false, false), theme)
    assert.equal(resolveThemeForRender(theme, 'unauthenticated', false, false), theme)
  }
})

test('não aplica temas premium até validar o entitlement da sessão atual', () => {
  for (const theme of ['autumn', 'rose-moon']) {
    assert.equal(resolveThemeForRender(theme, 'idle', false, true), 'dark')
    assert.equal(resolveThemeForRender(theme, 'hydrating', false, true), 'dark')
    assert.equal(resolveThemeForRender(theme, 'authenticated', false, true), 'dark')
    assert.equal(resolveThemeForRender(theme, 'authenticated', true, false), 'dark')
    assert.equal(resolveThemeForRender(theme, 'unauthenticated', true, true), 'dark')
    assert.equal(resolveThemeForRender(theme, 'authenticated', true, true), theme)
  }
})

test('mantém a elegibilidade comercial limitada aos estados ativos já existentes', () => {
  assert.equal(hasAnceryxPlus({ plan: 'monthly', status: 'active' }), true)
  assert.equal(hasAnceryxPlus({ plan: 'yearly', status: 'trialing' }), true)
  for (const status of ['inactive', 'past_due', 'canceled', 'unpaid']) {
    assert.equal(hasAnceryxPlus({ plan: 'monthly', status }), false)
  }
})

test('persiste a seleção das quatro opções para a próxima inicialização', async () => {
  for (const theme of ['dark', 'light', 'autumn', 'rose-moon']) {
    useUIStore.getState().setTheme(theme)
    assert.equal(JSON.parse(storage.get('anceryx-ui')).state.theme, theme)
  }
  const freshStore = await import(`../src/renderer/store/uiStore.ts?reload=${Date.now()}`)
  assert.equal(freshStore.useUIStore.getState().theme, 'rose-moon')
})
