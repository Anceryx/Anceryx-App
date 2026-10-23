import type { TranslationKey } from '@/i18nCatalog'

type Translate = (key: TranslationKey) => string

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

export function getCommunityMemberRoleLabels(member: GroupableCommunityMember, translate?: Translate): string[] {
  return [
    ...(member.role === 'owner' ? [translate ? translate('forumManage.role.owner') : 'Proprietário'] : member.role === 'moderator' ? [translate ? translate('forumManage.role.moderator') : 'Moderador'] : []),
    ...member.roles.map((role) => role.name),
  ]
}

export function groupCommunityMembersByRole<T extends GroupableCommunityMember>(members: readonly T[], translate?: Translate): CommunityMemberRoleGroup<T>[] {
  const groups = new Map<string, CommunityMemberRoleGroup<T>>()

  for (const member of members) {
    const topRole = [...member.roles].sort((a, b) => b.position - a.position)[0]
    const key = member.role === 'owner'
      ? 'base:owner'
      : topRole
        ? `role:${topRole.id}`
        : `base:${member.role}`
    const label = member.role === 'owner'
      ? translate ? translate('forumManage.role.owner') : 'Proprietário'
      : topRole?.name ?? (member.role === 'moderator' ? translate ? translate('workspaceUi.moderators') : 'Moderadores' : translate ? translate('workspaceUi.members') : 'Membros')
    const position = member.role === 'owner' ? Number.MAX_SAFE_INTEGER : topRole?.position ?? -1
    const group = groups.get(key) ?? { key, label, position, members: [] }
    group.members.push(member)
    groups.set(key, group)
  }

  return [...groups.values()].sort((a, b) => b.position - a.position || a.label.localeCompare(b.label))
}
