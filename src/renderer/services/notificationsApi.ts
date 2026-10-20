import { apiRequest } from '@/services/apiClient'

export interface NotificationDto {
  id: string
  recipientUserId: string
  actorUserId: string
  type: 'post.comment' | 'post.reaction' | 'forum.reply' | 'post.created' | 'follow.new' | 'follow.request' | 'follow.accepted' | 'forum.event_reminder' | 'forum.moderation.case' | 'forum.appeal' | 'badge.awarded'
  resourceId: string
  createdAt: string
  readAt: string | null
  actor: { id: string; username: string; displayName: string; avatarUrl: string | null }
}

export const notificationsApi = {
  list: (limit = 50, offset = 0) => apiRequest<{ notifications: NotificationDto[]; unreadCount: number }>(`/notifications?limit=${limit}&offset=${offset}`),
  markRead: (id: string) => apiRequest<{ status: 'read' | 'unchanged' }>(`/notifications/${id}/read`, { method: 'PATCH' }),
  markAllRead: () => apiRequest<{ updatedCount: number }>('/notifications/read-all', { method: 'POST' }),
}
