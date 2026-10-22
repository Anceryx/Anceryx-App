import { apiRequest } from '@/services/apiClient'

export interface DirectMessageDto {
  messageId: string
  conversationId: string
  sender: {
    id: string
    publicUserId: string
    username: string
    displayName: string
    avatarUrl: string | null
  }
  text: string
  contentType: 'text' | 'gif' | 'sticker'
  stickerKey: string | null
  media: {
    assetId: string | null
    url: string
    mimeType: string
    sizeBytes: number | null
    metadata: Record<string, unknown> | null
  } | null
  replyTo: { messageId: string; sender: { id: string; displayName: string; username: string; avatarUrl: string | null } | null; excerpt: string | null; deleted: boolean } | null
  createdAt: string
}

export interface DirectConversationDto {
  conversationId: string
  participantIds: [string, string]
  participants: Array<{ id: string; publicUserId: string; username: string; displayName: string; avatarUrl: string | null }>
  updatedAt: string
  lastMessage: DirectMessageDto | null
}

export class MessagesApiError extends Error {
  constructor(message: string, readonly status = 0) {
    super(message)
    this.name = 'MessagesApiError'
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  return apiRequest<T>(path, init)
}

export const messagesApi = {
  openConversation: (recipientUserId: string) => request<{ conversation: DirectConversationDto }>('/dm/conversations', { method: 'POST', body: JSON.stringify({ recipientUserId }) }),
  listConversations: () => request<{ conversations: DirectConversationDto[] }>('/dm/conversations'),
  listMessages: (conversationId: string, options: { limit?: number; before?: string } = {}) => {
    const query = new URLSearchParams({ limit: String(options.limit ?? 50) })
    if (options.before) query.set('before', options.before)
    return request<{ messages: DirectMessageDto[]; nextCursor?: string | null }>(`/dm/conversations/${conversationId}/messages?${query.toString()}`)
  },
  createMessage: (input: { recipientUserId: string; text: string; contentType?: 'text' | 'gif' | 'sticker'; stickerKey?: string; mediaAssetId?: string; externalMedia?: { provider: 'klipy'; slug: string; url: string; mimeType: 'image/gif'; metadata?: { title?: string; width?: number; height?: number; previewUrl?: string } }; clientMessageId?: string; replyToMessageId?: string }) =>
    request<{ message: DirectMessageDto; clientMessageId: string | null }>('/dm/messages', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  reportMessage: (messageId: string, input: { reason: 'spam' | 'harassment' | 'inappropriate_content' | 'scam_or_fraud' | 'violence_or_threat' | 'personal_information' | 'other'; details?: string }) =>
    request<{ report: { id: string } }>(`/dm/messages/${encodeURIComponent(messageId)}/report`, { method: 'POST', body: JSON.stringify(input) }),
}
