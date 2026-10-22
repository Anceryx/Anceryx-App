import assert from 'node:assert/strict'
import test from 'node:test'
import { normalizeForumListResponse } from '../src/renderer/utils/forumListCompatibility.ts'

test('normalizes the legacy array response without advertising pagination', () => {
  const forums = [{ id: 'legacy-forum' }]
  assert.deepEqual(normalizeForumListResponse(forums), { forums, nextOffset: null })
})

test('preserves paginated responses from the updated API', () => {
  const forums = [{ id: 'paged-forum' }]
  assert.deepEqual(normalizeForumListResponse({ forums, nextOffset: 20 }), { forums, nextOffset: 20 })
})

test('normalizes a missing optional cursor to the end of the list', () => {
  assert.deepEqual(normalizeForumListResponse({ forums: [] }), { forums: [], nextOffset: null })
})
