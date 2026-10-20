export function getAvatarInitials(name?: string | null): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  return `${parts[0][0]}${parts.length > 1 ? parts[1][0] : ''}`.toUpperCase()
}

export function resolveAvatarName(profileName?: string | null, accountName?: string | null, username?: string | null): string {
  return [profileName, accountName, username].find((value) => typeof value === 'string' && value.trim())?.trim() ?? 'Anceryx'
}
