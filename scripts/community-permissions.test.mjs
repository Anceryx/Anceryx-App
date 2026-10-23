import test from 'node:test'
import assert from 'node:assert/strict'
import { communityPermissionLabel, getEffectiveCommunityPermissions } from '../src/renderer/utils/communityPermissions.ts'

const role = (id, permissions, position = 1) => ({ id, name: id, color: '#123456', position, mentionable: false, displaySeparately: false, permissions })
const member = (userId, baseRole = 'member', roles = []) => ({ userId, role: baseRole, roles })

test('combines base and assigned permissions without duplicates', () => {
  const permissions = getEffectiveCommunityPermissions(member('u1', 'moderator', [role('reviewer', ['manageRoles', 'viewAuditLog'])]), 'owner')
  assert.ok(permissions.includes('warnMembers'))
  assert.ok(permissions.includes('manageRoles'))
  assert.equal(permissions.filter((permission) => permission === 'viewAuditLog').length, 1)
})

test('grants only administrator to owner and handles members with no custom roles', () => {
  assert.deepEqual(getEffectiveCommunityPermissions(member('owner', 'owner'), 'owner'), ['administrator'])
  assert.ok(getEffectiveCommunityPermissions(member('plain'), 'owner').includes('sendMessages'))
})

test('shows Portuguese permission labels while preserving unknown API values', () => {
  assert.equal(communityPermissionLabel('manageChannels'), 'Gerenciar canais')
  assert.equal(communityPermissionLabel('futurePermission'), 'futurePermission')
  assert.equal(communityPermissionLabel('manageChannels', (key) => key === 'workspacePermission.manageChannels' ? 'Manage channels' : key), 'Manage channels')
})
