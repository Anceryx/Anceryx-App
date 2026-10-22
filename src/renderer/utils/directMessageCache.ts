import type { DirectMessageDto } from '@/services/messagesApi'

const MAX_CACHED_CONVERSATIONS = 8
export const MAX_CACHED_MESSAGES_PER_CONVERSATION = 500

export type DirectMessageCache = Record<string, DirectMessageDto[]>

export function updateDirectMessageCache(
  cache: DirectMessageCache,
  conversationId: string,
  incoming: DirectMessageDto[],
): DirectMessageCache {
  const merged = new Map<string, DirectMessageDto>()
  for (const message of [...(cache[conversationId] ?? []), ...incoming]) {
    merged.set(message.messageId, message)
  }

  const messages = [...merged.values()]
    .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt) || a.messageId.localeCompare(b.messageId))
    .slice(-MAX_CACHED_MESSAGES_PER_CONVERSATION)
  const next = { ...cache }
  delete next[conversationId]
  next[conversationId] = messages

  const retainedIds = Object.keys(next).slice(-MAX_CACHED_CONVERSATIONS)
  return Object.fromEntries(retainedIds.map((id) => [id, next[id]]))
}
