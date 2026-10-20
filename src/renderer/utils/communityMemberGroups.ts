export interface GroupableCommunityMember {
  userId: string
  role: 'member' | 'moderator' | 'owner'
  roles: Array<{ id: string; name: string; position: number }>
}

export interface CommunityMemberRoleGroup<T extends GroupableCommunityMember = GroupableCommunityMember> {
  key: string
  label: string
  position: number
  members: T[]
}

export function getCommunityMemberRoleLabels(member: GroupableCommunityMember): string[] {
  return [
    ...(member.role === 'owner' ? ['Proprietário'] : member.role === 'moderator' ? ['Moderador'] : []),
    ...member.roles.map((role) => role.name),
  ]
}

export function groupCommunityMembersByRole<T extends GroupableCommunityMember>(members: readonly T[]): CommunityMemberRoleGroup<T>[] {
  const groups = new Map<string, CommunityMemberRoleGroup<T>>()

  for (const member of members) {
    const topRole = [...member.roles].sort((a, b) => b.position - a.position)[0]
    const key = member.role === 'owner'
      ? 'base:owner'
      : topRole
        ? `role:${topRole.id}`
        : `base:${member.role}`
    const label = member.role === 'owner'
      ? 'Proprietário'
      : topRole?.name ?? (member.role === 'moderator' ? 'Moderadores' : 'Membros')
    const position = member.role === 'owner' ? Number.MAX_SAFE_INTEGER : topRole?.position ?? -1
    const group = groups.get(key) ?? { key, label, position, members: [] }
    group.members.push(member)
    groups.set(key, group)
  }

  return [...groups.values()].sort((a, b) => b.position - a.position || a.label.localeCompare(b.label, 'pt-BR'))
}
