export type CommunityModerationAction = 'warning' | 'timeout' | 'kick' | 'ban'

export interface CommunityModerationPermissions {
  canWarn: boolean
  canTimeout: boolean
  canKick: boolean
  canBan: boolean
}

export function getAvailableCommunityModerationActions(permissions: CommunityModerationPermissions): CommunityModerationAction[] {
  return [
    ...(permissions.canWarn ? ['warning' as const] : []),
    ...(permissions.canTimeout ? ['timeout' as const] : []),
    ...(permissions.canKick ? ['kick' as const] : []),
    ...(permissions.canBan ? ['ban' as const] : []),
  ]
}

export function resolveCommunityModerationAction(
  selected: CommunityModerationAction,
  available: CommunityModerationAction[],
): CommunityModerationAction | null {
  return available.includes(selected) ? selected : available[0] ?? null
}

export function canLoadCommunityModerationHistory(canViewModerationCases: boolean): boolean {
  return canViewModerationCases
}

export function shouldShowCommunityModerationPanel(canViewAuditLog: boolean, hasModerationActions: boolean): boolean {
  return canViewAuditLog || hasModerationActions
}
