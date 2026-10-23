import test from 'node:test'
import assert from 'node:assert/strict'
import { getCommunityMemberRoleLabels, groupCommunityMembersByRole } from '../src/renderer/utils/communityMemberGroups.ts'

function member(userId, role = 'member', roles = []) {
  return { userId, role, roles }
}

test('keeps every member in role groups larger than 30 without duplicates', () => {
  const role = { id: 'role-1', name: 'Equipe', position: 10 }
  const members = Array.from({ length: 41 }, (_, index) => member(`user-${index}`, 'member', [role]))
  const groups = groupCommunityMembersByRole(members)
  const groupedMembers = groups.flatMap((group) => group.members)

  assert.equal(groups[0].members.length, 41)
  assert.deepEqual(groupedMembers.map(({ userId }) => userId).sort(), members.map(({ userId }) => userId).sort())
  assert.equal(new Set(groupedMembers.map(({ userId }) => userId)).size, members.length)
})

test('separates base-role groups from custom roles with the same display name', () => {
  const members = [
    member('regular-member'),
    member('custom-role-member', 'member', [{ id: 'role-members', name: 'Membros', position: 1 }]),
    member('moderator', 'moderator'),
    member('owner', 'owner'),
  ]
  const groups = groupCommunityMembersByRole(members)

  assert.equal(groups.length, 4)
  assert.equal(groups.find((group) => group.key === 'base:member')?.members[0].userId, 'regular-member')
  assert.equal(groups.find((group) => group.key === 'role:role-members')?.members[0].userId, 'custom-role-member')
})

test('lists the base role and every custom role in the member card labels', () => {
  const user = member('multi-role', 'moderator', [
    { id: 'role-1', name: 'Equipe', position: 1 },
    { id: 'role-2', name: 'Revisor', position: 2 },
  ])

  assert.deepEqual(getCommunityMemberRoleLabels(user), ['Moderador', 'Equipe', 'Revisor'])
  assert.deepEqual(getCommunityMemberRoleLabels(user, (key) => ({ 'forumManage.role.moderator': 'Moderator' })[key] ?? key), ['Moderator', 'Equipe', 'Revisor'])
})
