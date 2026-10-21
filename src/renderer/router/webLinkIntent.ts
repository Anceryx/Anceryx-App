import type { SidebarSection } from '@/types/index'

export type WebLinkIntent =
  | { type: 'post'; id: string; section: SidebarSection }
  | { type: 'forum'; id: string; section: SidebarSection }
  | { type: 'profile'; username: string; section: SidebarSection }
  | { type: 'invite'; token: string; section: SidebarSection }

export function resolveWebLinkIntent(kind: string | undefined, value: string | undefined): WebLinkIntent | null {
  if (!value || value.length > 512 || value.includes('\\')) return null
  if (kind === 'posts') return { type: 'post', id: value, section: 'feed' }
  if (kind === 'foruns') return { type: 'forum', id: value, section: 'foruns' }
  if (kind === 'perfil' || kind === 'profile') return { type: 'profile', username: value.replace(/^@/, ''), section: 'feed' }
  if (kind === 'invite') return { type: 'invite', token: value, section: 'foruns' }
  return null
}
