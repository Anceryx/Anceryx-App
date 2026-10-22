import assert from 'node:assert/strict'
import test from 'node:test'
import { updateDirectMessageCache } from '../src/renderer/utils/directMessageCache.ts'
import { getDirectMessageGroupPosition } from '../src/renderer/utils/directMessagePresentation.ts'

function message(messageId, createdAt, conversationId = 'conversation-a') {
  return { messageId, conversationId, createdAt }
}

test('deduplicates messages and orders events by creation time', () => {
  const cache = updateDirectMessageCache({}, 'conversation-a', [
    message('later', '2026-10-21T10:02:00.000Z'),
    message('earlier', '2026-10-21T10:01:00.000Z'),
  ])
  const next = updateDirectMessageCache(cache, 'conversation-a', [message('later', '2026-10-21T10:02:00.000Z')])
  assert.deepEqual(next['conversation-a'].map((item) => item.messageId), ['earlier', 'later'])
})

test('bounds cached history and the number of conversations', () => {
  let cache = {}
  for (let index = 0; index < 10; index += 1) {
    cache = updateDirectMessageCache(cache, `conversation-${index}`, Array.from({ length: 505 }, (_, item) =>
      message(`${index}-${item}`, new Date(Date.parse('2026-10-21T10:00:00.000Z') + item * 1000).toISOString(), `conversation-${index}`),
    ))
  }
  assert.equal(Object.keys(cache).length, 8)
  assert.deepEqual(Object.keys(cache), Array.from({ length: 8 }, (_, index) => `conversation-${index + 2}`))
  assert.equal(cache['conversation-9'].length, 500)
  assert.equal(cache['conversation-9'][0].messageId, '9-5')
})

test('a new conversation enters the cache without dropping messages from another key', () => {
  const original = { 'conversation-a': [message('a', '2026-10-21T10:00:00.000Z')] }
  const next = updateDirectMessageCache(original, 'conversation-b', [message('b', '2026-10-21T10:00:00.000Z', 'conversation-b')])
  assert.equal(original['conversation-a'].length, 1)
  assert.deepEqual(Object.keys(next), ['conversation-a', 'conversation-b'])
})

test('message presentation groups consecutive messages and adds a date boundary', () => {
  const messages = [
    { sender: { id: 'a' }, createdAt: '2026-10-21T23:58:00' },
    { sender: { id: 'a' }, createdAt: '2026-10-21T23:59:00' },
    { sender: { id: 'a' }, createdAt: '2026-10-22T00:01:00' },
    { sender: { id: 'b' }, createdAt: '2026-10-22T00:02:00' },
  ]
  assert.deepEqual(getDirectMessageGroupPosition(messages, 0), { showDate: true, startsGroup: true, endsGroup: false })
  assert.deepEqual(getDirectMessageGroupPosition(messages, 1), { showDate: false, startsGroup: false, endsGroup: true })
  assert.deepEqual(getDirectMessageGroupPosition(messages, 2), { showDate: true, startsGroup: true, endsGroup: true })
  assert.deepEqual(getDirectMessageGroupPosition(messages, 3), { showDate: false, startsGroup: true, endsGroup: true })
})

test('message presentation starts a new group when the gap exceeds five minutes', () => {
  const messages = [
    { sender: { id: 'a' }, createdAt: '2026-10-21T10:00:00.000Z' },
    { sender: { id: 'a' }, createdAt: '2026-10-21T10:05:01.000Z' },
  ]
  assert.equal(getDirectMessageGroupPosition(messages, 1).startsGroup, true)
  assert.equal(getDirectMessageGroupPosition(messages, 0).endsGroup, true)
})
