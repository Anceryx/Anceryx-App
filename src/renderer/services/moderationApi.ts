import { apiRequest } from './apiClient'

export interface ModerationNotice {
  id: string
  contentType: string
  contentId: string
  severity: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  message: string
  createdAt: string
  readAt: string | null
  expiresAt: string | null
}

export const moderationApi = {
  listNotices: () => apiRequest<{ notices: ModerationNotice[] }>('/moderation/notices?limit=50&offset=0'),
  markNoticeRead: (noticeId: string) => apiRequest<{ status: 'ok' }>(`/moderation/notices/${noticeId}/read`, { method: 'POST' }),
  listActions: () => apiRequest<{ actions: Array<{ id: string; actionType: string; status: string; reason: string; startsAt: string; expiresAt: string | null }> }>('/moderation/actions'),
}
