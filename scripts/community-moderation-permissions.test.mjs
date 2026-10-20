import test from 'node:test'
import assert from 'node:assert/strict'
import {
  canLoadCommunityModerationHistory,
  getAvailableCommunityModerationActions,
  resolveCommunityModerationAction,
  shouldShowCommunityModerationPanel,
} from '../src/renderer/utils/communityModerationPermissions.ts'

test('selects the first authorized action when the previous selection is no longer allowed', () => {
  const available = getAvailableCommunityModerationActions({ canWarn: false, canTimeout: false, canKick: true, canBan: false })

  assert.deepEqual(available, ['kick'])
  assert.equal(resolveCommunityModerationAction('warning', available), 'kick')
  assert.equal(resolveCommunityModerationAction('warning', []), null)
})

test('loads the moderation case history only with viewAuditLog', () => {
  assert.equal(canLoadCommunityModerationHistory(false), false)
  assert.equal(canLoadCommunityModerationHistory(true), true)
})

test('shows the compact moderation panel for every action permission and for audit access', () => {
  for (const permission of [
    { canWarn: true, canTimeout: false, canKick: false, canBan: false },
    { canWarn: false, canTimeout: true, canKick: false, canBan: false },
    { canWarn: false, canTimeout: false, canKick: true, canBan: false },
    { canWarn: false, canTimeout: false, canKick: false, canBan: true },
  ]) {
    assert.equal(shouldShowCommunityModerationPanel(false, getAvailableCommunityModerationActions(permission).length > 0), true)
  }

  assert.equal(shouldShowCommunityModerationPanel(true, false), true)
  assert.equal(shouldShowCommunityModerationPanel(false, false), false)
})
