const MAX_DRAFTS = 100
const MAX_DRAFT_LENGTH = 10_000

export type ConversationDrafts = Map<string, string>

export function saveConversationDraft(drafts: ConversationDrafts, conversationId: string, value: string): void {
  if (!conversationId) return
  const normalized = value.slice(0, MAX_DRAFT_LENGTH)
  drafts.delete(conversationId)
  if (normalized.trim()) drafts.set(conversationId, normalized)
  while (drafts.size > MAX_DRAFTS) drafts.delete(drafts.keys().next().value!)
}

export function getConversationDraft(drafts: ConversationDrafts, conversationId: string): string {
  return drafts.get(conversationId) ?? ''
}
