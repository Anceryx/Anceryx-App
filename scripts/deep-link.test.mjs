import assert from 'node:assert/strict'
import test from 'node:test'
import { isAppDeepLink, parseAppDeepLink } from '../src/shared/appDeepLink.ts'

test('accepts only supported Anceryx post, forum, and profile destinations', () => {
  assert.deepEqual(parseAppDeepLink('anceryx://post/123e4567-e89b-42d3-a456-426614174000'), { type: 'post', id: '123e4567-e89b-42d3-a456-426614174000' })
  assert.deepEqual(parseAppDeepLink('anceryx://forum/123e4567-e89b-42d3-a456-426614174000'), { type: 'forum', id: '123e4567-e89b-42d3-a456-426614174000' })
  assert.deepEqual(parseAppDeepLink('anceryx://profile/olivera.dev'), { type: 'profile', username: 'olivera.dev' })
})

test('rejects external, malformed, parameterized, and arbitrary destinations', () => {
  for (const value of [
    'https://www.anceryx.site/posts/123e4567-e89b-42d3-a456-426614174000',
    'anceryx://post/not-a-uuid',
    'anceryx://post/123e4567-e89b-42d3-a456-426614174000?next=https://evil.invalid',
    'anceryx://post/123e4567-e89b-42d3-a456-426614174000/extra',
    'anceryx://unknown/123e4567-e89b-42d3-a456-426614174000',
    'anceryx://profile/a',
    'anceryx://profile/user%2fadmin',
    'anceryx://post:444/123e4567-e89b-42d3-a456-426614174000',
  ]) assert.equal(parseAppDeepLink(value), null, value)
})

test('validates deep-link payloads again at the preload boundary', () => {
  assert.equal(isAppDeepLink({ type: 'post', id: '123e4567-e89b-42d3-a456-426614174000' }), true)
  assert.equal(isAppDeepLink({ type: 'post', id: 'x' }), false)
  assert.equal(isAppDeepLink({ type: 'profile', username: 'valid-name' }), true)
  assert.equal(isAppDeepLink({ type: 'profile', username: 'valid/name' }), false)
})
