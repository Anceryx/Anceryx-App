import assert from 'node:assert/strict'
import test from 'node:test'
import { resolveApiBaseUrl } from '../src/renderer/services/apiConfig.ts'

test('keeps normal development and production API targets unchanged', () => {
  assert.equal(resolveApiBaseUrl(undefined, false), 'http://localhost:3000')
  assert.equal(resolveApiBaseUrl(undefined, true), 'https://admin-anceryx.site')
})

test('does not allow loopback overrides in a normal production build', () => {
  assert.throws(() => resolveApiBaseUrl('http://127.0.0.1:3000', true), /API HTTPS oficial/)
})
