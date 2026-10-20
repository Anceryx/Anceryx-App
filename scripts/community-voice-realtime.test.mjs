import test from 'node:test'
import assert from 'node:assert/strict'
import {
  normalizeCommunityVoicePayload,
  removeCommunityVoiceParticipant,
  upsertCommunityVoiceParticipant,
} from '../src/renderer/utils/communityVoiceRealtime.ts'

const envelope = (overrides = {}) => ({
  communityId: 'community-1',
  channelId: 'channel-1',
  state: {
    communityId: 'community-1',
    channelId: 'channel-1',
    userId: 'user-1',
    selfMuted: false,
    selfDeafened: false,
    serverMuted: false,
    serverDeafened: false,
    joinedAt: '2026-10-13T12:00:00.000Z',
    user: { id: 'user-1', username: 'qa-user', displayName: 'Usuário QA', avatarUrl: null },
  },
  ...overrides,
})

test('normalizes the backend voice event envelope into its participant state', () => {
  const participant = normalizeCommunityVoicePayload(envelope())
  assert.equal(participant?.userId, 'user-1')
  assert.equal(participant?.user.displayName, 'Usuário QA')
  assert.equal(participant?.joinedAt, '2026-10-13T12:00:00.000Z')
})

test('rejects incomplete or inconsistent voice events for authoritative state refresh', () => {
  assert.equal(normalizeCommunityVoicePayload(null), null)
  assert.equal(normalizeCommunityVoicePayload({ communityId: 'community-1', channelId: 'channel-1' }), null)
  assert.equal(normalizeCommunityVoicePayload(envelope({ channelId: 'other-channel' })), null)
  assert.equal(normalizeCommunityVoicePayload(envelope({ state: { ...envelope().state, user: undefined } })), null)
})

test('upserts reconnects without duplicate participants and removes members on leave', () => {
  const first = normalizeCommunityVoicePayload(envelope())
  const reconnected = normalizeCommunityVoicePayload(envelope({
    state: { ...envelope().state, joinedAt: '2026-10-13T12:05:00.000Z', selfMuted: true },
  }))
  assert.ok(first)
  assert.ok(reconnected)

  const joined = upsertCommunityVoiceParticipant([], first)
  const updated = upsertCommunityVoiceParticipant(joined, reconnected)
  assert.equal(updated.length, 1)
  assert.equal(updated[0].selfMuted, true)
  assert.equal(updated[0].joinedAt, '2026-10-13T12:05:00.000Z')
  assert.deepEqual(removeCommunityVoiceParticipant(updated, 'user-1'), [])
})
