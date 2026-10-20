import type { CallHistoryEntry } from './calls'
export interface MessageImageAttachment { assetId?: string; url: string; previewUrl?: string; mimeType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif' | 'video/mp4'; sizeBytes: number; name: string }
export interface TextMessage { id: string; backendMessageId?: string; conversationId?: string; fromUserId: string; toUserId: string; content: string; createdAt: Date; image?: MessageImageAttachment; stickerKey?: string; type?: 'text' | 'gif' | 'sticker' }
export interface CallMessage { id: string; fromUserId: string; toUserId: string; type: 'call'; createdAt: Date; callEntry: CallHistoryEntry }
export type ChatMessage = TextMessage | CallMessage
