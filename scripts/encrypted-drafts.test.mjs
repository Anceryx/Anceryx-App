import assert from 'node:assert/strict'
import test from 'node:test'
import { createDraftStore } from '../src/main/draftStoreCore.ts'

const userA = '11111111-1111-4111-8111-111111111111'
const userB = '22222222-2222-4222-8222-222222222222'
const resource = '33333333-3333-4333-8333-333333333333'
const transform = (bytes) => Uint8Array.from(bytes, (value) => value ^ 0x5a)
function harness(clock = { value: Date.now() }) {
  let file = null
  const adapter = { read: () => file, write: (bytes) => { file = bytes } }
  const makeStore = () => createDraftStore(adapter, transform, transform, () => clock.value)
  return { store: makeStore(), adapter, makeStore }
}

test('persists drafts by account and scope and removes them after send or discard', () => {
  const { store, makeStore } = harness()
  const dm = { userId: userA, scope: 'dm', resourceId: resource }
  store.save(dm, 'texto privado')
  const reopened = makeStore()
  assert.equal(reopened.get(dm), 'texto privado')
  reopened.save(dm, '')
  assert.equal(store.get(dm), null)
})

test('keeps every supported conversation scope isolated', () => {
  const { store } = harness()
  for (const scope of ['dm', 'forum-channel', 'forum-topic', 'forum-reply', 'post']) {
    const key = { userId: userA, scope, resourceId: resource }
    store.save(key, scope)
    assert.equal(store.get(key), scope)
  }
})

test('isolates accounts and scopes, rejects temporary blob URLs, and deletes drafts', () => {
  const { store, makeStore } = harness()
  const key = { userId: userA, scope: 'dm', resourceId: resource }
  store.save(key, 'texto privado')
  const reopened = makeStore()
  assert.equal(reopened.get(key), 'texto privado')
  assert.equal(reopened.get({ ...key, userId: userB }), null)
  assert.equal(reopened.get({ ...key, scope: 'post' }), null)
  assert.throws(() => store.save(key, 'blob:https://example.invalid/temp'), /inválido/)
  reopened.delete(key)
  assert.equal(store.get(key), null)
})

test('bounds retention, count, and content; storage errors are surfaced', () => {
  const clock = { value: 2_000_000_000_000 }
  const { store } = harness(clock)
  assert.throws(() => store.save({ userId: userA, scope: 'dm', resourceId: resource }, 'x'.repeat(22_001)), /inválido/)
  let oldestResourceId = ''
  let newestResourceId = ''
  for (let index = 0; index < 510; index += 1) {
    const resourceId = `${String(index + 1).padStart(8, '0')}-3333-4333-8333-333333333333`
    if (index === 0) oldestResourceId = resourceId
    newestResourceId = resourceId
    store.save({ userId: userA, scope: 'post', resourceId }, 'draft')
    clock.value += 1
  }
  assert.equal(store.get({ userId: userA, scope: 'post', resourceId: oldestResourceId }), null)
  assert.equal(store.get({ userId: userA, scope: 'post', resourceId: newestResourceId }), 'draft')
  const broken = createDraftStore({ read: () => null, write: () => { throw new Error('disk full') } }, (bytes) => bytes, (bytes) => bytes)
  assert.throws(() => broken.save({ userId: userA, scope: 'dm', resourceId: resource }, 'draft'), /disk full/)
})

test('expires drafts after the configured retention window', () => {
  const clock = { value: 2_000_000_000_000 }
  const { store } = harness(clock)
  const key = { userId: userA, scope: 'dm', resourceId: resource }
  store.save(key, 'temporary text')
  clock.value += 31 * 24 * 60 * 60 * 1000
  assert.equal(store.get(key), null)
})
