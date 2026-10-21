import assert from 'node:assert/strict'
import { messages, translate, translatePlural } from '../src/renderer/i18nCatalog.ts'

const locales = ['pt-BR', 'en-US', 'es-ES']
const baseline = Object.keys(messages['pt-BR']).sort()
for (const locale of locales) {
  assert.deepEqual(Object.keys(messages[locale]).sort(), baseline, `${locale} must have the same translation keys`)
  for (const [key, value] of Object.entries(messages[locale])) {
    assert.equal(typeof value, 'string', `${locale}.${key} must be text`)
    assert.ok(value.trim().length > 0, `${locale}.${key} must not be empty`)
    assert.ok(value.length <= 240, `${locale}.${key} is too long for a compact interface string`)
    for (const match of value.matchAll(/\{([^}]+)\}/g)) assert.ok(['count', 'name', 'premium', 'resolution'].includes(match[1]), `${locale}.${key} has an unsupported interpolation placeholder`)
  }
}

for (const locale of locales) {
  const template = messages[locale]['messages.typing']
  assert.equal(translate('messages.typing', locale, { name: 'Ana' }), template.replace('{name}', 'Ana'))
  assert.ok(translatePlural('common.unreadCount', locale, 1).includes('1'))
  assert.ok(translatePlural('common.unreadCount', locale, 2).includes('2'))
  assert.notEqual(translatePlural('common.unreadCount', locale, 1), translatePlural('common.unreadCount', locale, 2))
}
assert.equal(translate('common.missing.key', 'en-US'), messages['en-US']['common.translationUnavailable'])

console.log(`i18n catalog tests passed (${baseline.length} keys in each of ${locales.length} locales, interpolation, fallback and plural forms)`)
