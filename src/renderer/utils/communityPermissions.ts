import type { CommunityMemberDto, CommunityRoleDto } from '@/services/communityApi'
import type { TranslationKey } from '@/i18nCatalog'

const COMMUNITY_PERMISSION_TRANSLATION_KEYS: Record<string, TranslationKey> = {
  manageCommunity: 'workspacePermission.manageCommunity',
  viewChannel: 'workspacePermission.viewChannel',
  sendMessages: 'workspacePermission.sendMessages',
  readHistory: 'workspacePermission.readHistory',
  createTopics: 'workspacePermission.createTopics',
  manageTopics: 'workspacePermission.manageTopics',
  manageChannels: 'workspacePermission.manageChannels',
  manageRoles: 'workspacePermission.manageRoles',
  manageMessages: 'workspacePermission.manageMessages',
  manageNicknames: 'workspacePermission.manageNicknames',
  manageInvites: 'workspacePermission.manageInvites',
  manageEvents: 'workspacePermission.manageEvents',
  kickMembers: 'workspacePermission.kickMembers',
  banMembers: 'workspacePermission.banMembers',
  timeoutMembers: 'workspacePermission.timeoutMembers',
  attachFiles: 'workspacePermission.attachFiles',
  embedLinks: 'workspacePermission.embedLinks',
  mentionEveryone: 'workspacePermission.mentionEveryone',
  addReactions: 'workspacePermission.addReactions',
  useExternalEmojis: 'workspacePermission.useExternalEmojis',
  connect: 'workspacePermission.connect',
  speak: 'workspacePermission.speak',
  muteMembers: 'workspacePermission.muteMembers',
  deafenMembers: 'workspacePermission.deafenMembers',
  moveMembers: 'workspacePermission.moveMembers',
  viewAuditLog: 'workspacePermission.viewAuditLog',
}

export const COMMUNITY_PERMISSION_LABELS: Record<string, string> = {
  administrator: 'Administrador',
  manageCommunity: 'Gerenciar comunidade',
  manageRoles: 'Gerenciar cargos',
  manageChannels: 'Gerenciar canais',
  viewAuditLog: 'Consultar auditoria',
  manageReports: 'Gerenciar denúncias',
  manageInvites: 'Gerenciar convites',
  manageEvents: 'Gerenciar eventos',
  kickMembers: 'Expulsar membros',
  banMembers: 'Banir membros',
  timeoutMembers: 'Restringir membros',
  warnMembers: 'Advertir membros',
  manageNicknames: 'Gerenciar apelidos',
  viewChannel: 'Ver canais',
  sendMessages: 'Enviar mensagens',
  manageMessages: 'Gerenciar mensagens',
  createTopics: 'Criar tópicos',
  manageTopics: 'Gerenciar tópicos',
  attachFiles: 'Anexar arquivos',
  embedLinks: 'Incorporar links',
  readHistory: 'Ler histórico',
  mentionEveryone: 'Mencionar todos',
  addReactions: 'Adicionar reações',
  useExternalEmojis: 'Usar emojis externos',
  connect: 'Conectar à voz',
  speak: 'Falar em canais de voz',
  muteMembers: 'Silenciar membros',
  deafenMembers: 'Desativar áudio de membros',
  moveMembers: 'Mover membros entre canais',
}

const DEFAULT_MEMBER_PERMISSIONS = ['viewChannel', 'sendMessages', 'createTopics', 'attachFiles', 'readHistory', 'addReactions', 'useExternalEmojis', 'connect', 'speak']
const MODERATOR_PERMISSIONS = [...DEFAULT_MEMBER_PERMISSIONS, 'manageMessages', 'manageTopics', 'manageReports', 'kickMembers', 'timeoutMembers', 'warnMembers', 'muteMembers', 'deafenMembers', 'moveMembers', 'manageInvites', 'manageEvents', 'viewAuditLog']

export function getEffectiveCommunityPermissions(member: Pick<CommunityMemberDto, 'userId' | 'role' | 'roles'>, ownerUserId: string): string[] {
  if (member.userId === ownerUserId || member.role === 'owner') return ['administrator']
  const base = member.role === 'moderator' ? MODERATOR_PERMISSIONS : DEFAULT_MEMBER_PERMISSIONS
  return [...new Set([...base, ...member.roles.flatMap((role: CommunityRoleDto) => role.permissions)])]
}

export function communityPermissionLabel(permission: string, translate?: (key: TranslationKey) => string): string {
  const key = COMMUNITY_PERMISSION_TRANSLATION_KEYS[permission]
  if (key && translate) return translate(key)
  return COMMUNITY_PERMISSION_LABELS[permission] ?? permission
}
