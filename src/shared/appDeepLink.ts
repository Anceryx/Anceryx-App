export type AppDeepLink =
  | { type: 'post'; id: string }
  | { type: 'forum'; id: string }
  | { type: 'profile'; username: string }

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const USERNAME_PATTERN = /^[a-zA-Z0-9_.-]{3,30}$/

export function parseAppDeepLink(rawUrl: string): AppDeepLink | null {
  try {
    const url = new URL(rawUrl)
    if (url.protocol !== 'anceryx:' || url.port || url.username || url.password || url.search || url.hash) return null
    const identifier = url.pathname.slice(1)
    if (!identifier || identifier.includes('/') || decodeURIComponent(identifier) !== identifier) return null
    if ((url.hostname === 'post' || url.hostname === 'forum') && UUID_PATTERN.test(identifier)) {
      return { type: url.hostname, id: identifier.toLowerCase() }
    }
    if (url.hostname === 'profile' && USERNAME_PATTERN.test(identifier)) return { type: 'profile', username: identifier }
    return null
  } catch {
    return null
  }
}

export function isAppDeepLink(value: unknown): value is AppDeepLink {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Record<string, unknown>
  if (candidate.type === 'post' || candidate.type === 'forum') return typeof candidate.id === 'string' && UUID_PATTERN.test(candidate.id)
  return candidate.type === 'profile' && typeof candidate.username === 'string' && USERNAME_PATTERN.test(candidate.username)
}
