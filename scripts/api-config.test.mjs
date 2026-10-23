import assert from 'node:assert/strict'
import test from 'node:test'
import { resolveApiBaseUrl } from '../src/renderer/services/apiConfig.ts'

test('keeps normal development and production API targets unchanged', () => {
  assert.equal(resolveApiBaseUrl(undefined, false), 'http://localhost:3000')
  assert.equal(resolveApiBaseUrl(undefined, true), 'https://admin-anceryx.site')
  assert.equal(resolveApiBaseUrl(undefined, true, 'web'), 'https://api.anceryx.site')
  assert.equal(resolveApiBaseUrl('https://api.anceryx.site', true, 'web'), 'https://api.anceryx.site')
  assert.throws(() => resolveApiBaseUrl('https://admin-anceryx.site', true, 'web'), /API HTTPS oficial/)
  assert.throws(() => resolveApiBaseUrl('https://api.anceryx.site', true, 'electron'), /API HTTPS oficial/)
})

test('does not allow loopback overrides in a normal production build', () => {
  assert.throws(() => resolveApiBaseUrl('http://127.0.0.1:3000', true), /API HTTPS oficial/)
})

test('localizes invalid API configuration without weakening the production origin guard', () => {
  assert.throws(() => resolveApiBaseUrl('not a URL', false), /endereço da API da Anceryx é inválido/)
  assert.throws(() => resolveApiBaseUrl('file:///tmp/api', false), /protocolo do endereço da API da Anceryx é inválido/)
  assert.throws(() => resolveApiBaseUrl('https://example.invalid', true), /API HTTPS oficial/)
})
