import assert from 'node:assert/strict'
import test from 'node:test'
import { classifyLicenseExpression, parseLicenseExpression } from './license-policy.mjs'

test('recognizes SPDX AND, OR and WITH expressions', () => {
  assert.equal(parseLicenseExpression('MIT OR Apache-2.0').recognized, true)
  assert.equal(parseLicenseExpression('GPL-3.0-only WITH Classpath-exception-2.0').recognized, true)
  assert.equal(classifyLicenseExpression('MIT OR Apache-2.0').review, 'permissive')
  assert.equal(classifyLicenseExpression('GPL-3.0-only WITH Classpath-exception-2.0').review, 'copyleft')
})

test('unknown and non-SPDX expressions remain unknown', () => {
  assert.equal(classifyLicenseExpression('SEE LICENSE IN LICENSE.txt').review, 'unknown')
  assert.equal(classifyLicenseExpression('').review, 'unknown')
  assert.equal(classifyLicenseExpression('WTFPL OR ISC').review, 'permissive')
  assert.equal(classifyLicenseExpression('BlueOak-1.0.0').review, 'permissive')
  assert.equal(classifyLicenseExpression('MPL-2.0').review, 'review')
})
