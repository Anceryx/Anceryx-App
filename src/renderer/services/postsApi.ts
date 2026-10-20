import { apiRequest } from '@/services/apiClient'
import type { RealtimeCommentDto, RealtimePostDto } from '@/services/realtimeClient'

export const postsApi = {
  announcements: () => apiRequest<{ campaigns: Array<{ id: string; title: string | null; content: string; bannerTitle: string | null; bannerDescription: string | null; bannerImageUrl: string | null; accentColor: string; ctaLabel: string | null; ctaUrl: string | null }> }>('/home/official-announcements'),
  feed: (cursor?: string, scope: 'for-you' | 'following' = 'for-you') => {
    const query = new URLSearchParams({ scope })
    if (cursor) query.set('cursor', cursor)
    return apiRequest<{ posts: RealtimePostDto[]; nextCursor: string | null }>(`/feed?${query.toString()}`)
  },
  get: (postId: string) => apiRequest<{ post: RealtimePostDto }>(`/posts/${postId}`),
  create: (content: string, mediaAssetId?: string) => apiRequest<{ post: RealtimePostDto }>('/posts', {
    method: 'POST', body: JSON.stringify({ content, ...(mediaAssetId ? { mediaAssetId } : {}) }),
  }),
  update: (postId: string, content: string) => apiRequest<{ post: RealtimePostDto }>(`/posts/${postId}`, { method: 'PATCH', body: JSON.stringify({ content }) }),
  remove: (postId: string) => apiRequest(`/posts/${postId}`, { method: 'DELETE' }),
  report: (postId: string, reason: 'spam' | 'harassment' | 'violence_or_threat' | 'inappropriate_content' | 'personal_information' | 'scam_or_fraud' | 'other', details?: string) => apiRequest(`/posts/${postId}/report`, { method: 'POST', body: JSON.stringify({ reason, details }) }),
  like: (postId: string) => apiRequest<{ post: RealtimePostDto }>(`/posts/${postId}/like`, { method: 'POST' }),
  unlike: (postId: string) => apiRequest<{ post: RealtimePostDto }>(`/posts/${postId}/like`, { method: 'DELETE' }),
  save: (postId: string) => apiRequest<{ saved: boolean }>(`/posts/${postId}/save`, { method: 'POST' }),
  unsave: (postId: string) => apiRequest<{ saved: boolean }>(`/posts/${postId}/save`, { method: 'DELETE' }),
  saved: (offset = 0, limit = 50) => apiRequest<{ posts: RealtimePostDto[] }>(`/posts/saved?limit=${limit}&offset=${offset}`),
  pin: (postId: string) => apiRequest<{ pinnedPostId: string }>(`/posts/${postId}/pin`, { method: 'POST' }),
  unpin: (postId: string) => apiRequest<{ pinnedPostId: null }>(`/posts/${postId}/pin`, { method: 'DELETE' }),
  profilePosts: (userId: string, limit = 50, offset = 0) => apiRequest<{ pinnedPostId: string | null; postCount: number; posts: RealtimePostDto[] }>(`/users/${userId}/posts?limit=${limit}&offset=${offset}`),
  listComments: (postId: string) => apiRequest<{ comments: RealtimeCommentDto[] }>(`/posts/${postId}/comments`),
  comment: (postId: string, content: string) => apiRequest<{ comment: RealtimeCommentDto }>(`/posts/${postId}/comments`, { method: 'POST', body: JSON.stringify({ content }) }),
  updateComment: (commentId: string, content: string) => apiRequest<{ comment: RealtimeCommentDto }>(`/comments/${commentId}`, { method: 'PATCH', body: JSON.stringify({ content }) }),
  removeComment: (commentId: string) => apiRequest(`/comments/${commentId}`, { method: 'DELETE' }),
}
