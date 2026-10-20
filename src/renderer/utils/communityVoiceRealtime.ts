export interface CommunityVoiceParticipant {
  communityId: string
  channelId: string
  userId: string
  selfMuted: boolean
  selfDeafened: boolean
  serverMuted: boolean
  serverDeafened: boolean
  joinedAt: string
  user: { id: string; username: string; displayName: string; avatarUrl: string | null }
}

export interface CommunityVoiceRealtimePayload {
  communityId: string
  channelId: string
  state: Omit<CommunityVoiceParticipant, 'joinedAt'> & { joinedAt: string | Date }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function normalizeCommunityVoicePayload(payload: unknown): CommunityVoiceParticipant | null {
  if (!isRecord(payload) || !isRecord(payload.state)) return null

  const state = payload.state
  const user = state.user
  if (!isRecord(user)) return null
  if (typeof payload.communityId !== 'string' || typeof payload.channelId !== 'string') return null
  if (state.communityId !== payload.communityId || state.channelId !== payload.channelId) return null
  if (typeof state.userId !== 'string' || user.id !== state.userId) return null
  if (typeof user.username !== 'string' || typeof user.displayName !== 'string') return null
  if (user.avatarUrl !== null && typeof user.avatarUrl !== 'string') return null
  if (![state.selfMuted, state.selfDeafened, state.serverMuted, state.serverDeafened].every((value) => typeof value === 'boolean')) return null
  if (!(typeof state.joinedAt === 'string' || state.joinedAt instanceof Date)) return null
  const joinedAt = String(state.joinedAt)
  if (!joinedAt || Number.isNaN(Date.parse(joinedAt))) return null

  return { ...state, joinedAt, user } as CommunityVoiceParticipant
}

export function upsertCommunityVoiceParticipant(
  participants: CommunityVoiceParticipant[],
  next: CommunityVoiceParticipant,
): CommunityVoiceParticipant[] {
  return [...participants.filter((participant) => participant.userId !== next.userId), next]
}

export function removeCommunityVoiceParticipant(
  participants: CommunityVoiceParticipant[],
  userId: string,
): CommunityVoiceParticipant[] {
  return participants.filter((participant) => participant.userId !== userId)
}
