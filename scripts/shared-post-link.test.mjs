import test from 'node:test'
import assert from 'node:assert/strict'
import { extractSharedPostId } from '../src/renderer/utils/sharedPost.ts'

const id = '02b42776-2587-4a26-b35c-65a9125b7a26'

test('extracts only canonical public Anceryx post links from message text', () => {
  assert.equal(extractSharedPostId(`Confira: https://www.anceryx.site/posts/${id}.`), id)
  assert.equal(extractSharedPostId(`https://www.anceryx.site.evil.test/posts/${id}`), null)
  assert.equal(extractSharedPostId(`https://evil.test/posts/${id}`), null)
  assert.equal(extractSharedPostId(`https://www.anceryx.site/posts/${id}?private=1`), null)
  assert.equal(extractSharedPostId('texto sem publicação'), null)
})
