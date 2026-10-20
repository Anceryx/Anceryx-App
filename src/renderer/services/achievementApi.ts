import { apiRequest } from '@/services/apiClient'

export interface PendingAchievement {
  notificationId: string
  badgeId: string
  badgeSlug: string
  badgeName: string
  badgeDescription: string
  badgeIconSvg: string | null
  createdAt: string
}

export const achievementApi = {
  pending: () => apiRequest<{ achievements: PendingAchievement[] }>('/notifications/achievements/pending'),
  complete: (notificationId: string, status: 'presented' | 'dismissed') => apiRequest<{ status: string }>(`/notifications/achievements/${notificationId}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
}
