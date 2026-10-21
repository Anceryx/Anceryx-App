import type { ForumMemberRole } from '@/types/social'
import { apiRequest } from '@/services/apiClient'

type ForumVisibility = 'public' | 'private'
type TopicFlag = 'isPinned' | 'isLocked' | 'isResolved'

export interface ApiForumTag {
  id: string
  forumId: string
  name: string
  slug: string
}

export interface ApiForumMember {
  forumId: string
  userId: string
  role: ForumMemberRole
  joinedAt: string
  user: {
    id: string
    username: string
    displayName: string
    avatarUrl: string | null
  }
}

export interface ApiForumTopic {
  id: string
  forumId: string
  authorUserId: string
  title: string
  content: string
  isPinned: boolean
  isLocked: boolean
  isResolved: boolean
  createdAt: string
  author?: { id: string; displayName: string; avatarUrl: string | null }
  replyCount?: number
}

export interface ApiForumReply {
  id: string
  topicId: string
  authorUserId: string
  content: string
  createdAt: string
  author: { id: string; displayName: string; avatarUrl: string | null }
}

export interface ApiForumReport {
  id: string
  targetType: 'forum_topic' | 'forum_reply' | 'post' | 'post_comment' | 'user'
  targetId: string
  targetForumId: string | null
  reason: string
  details: string | null
  evidence: string[]
  status: 'pending' | 'reviewing' | 'resolved' | 'dismissed'
  resolutionNote: string | null
  reviewedAt: string | null
  createdAt: string
}

export interface ApiForum {
  id: string
  name: string
  description: string
  visibility: ForumVisibility
  iconUrl: string | null
  bannerUrl: string | null
  ownerUserId: string
  createdAt: string
  owner: { id: string; username: string; displayName: string; avatarUrl: string | null }
  memberCount: number
  topicCount: number
  tags: ApiForumTag[]
  viewerMembership: boolean
  viewerForumRole: ForumMemberRole | null
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  return apiRequest<T>(path, init)
}

function flagPath(flag: TopicFlag): 'pin' | 'lock' | 'resolve' {
  if (flag === 'isPinned') return 'pin'
  if (flag === 'isLocked') return 'lock'
  return 'resolve'
}

export const forumApi = {
  listForums: (query = '') => request<{ forums: ApiForum[] }>(`/forums${query ? `?q=${encodeURIComponent(query)}` : ''}`),
  profileForums: (userId: string, limit = 50, offset = 0) => request<{ forums: ApiForum[]; totalCount: number }>(`/users/${encodeURIComponent(userId)}/forums?limit=${limit}&offset=${offset}`),
  getForum: (forumId: string) => request<{ forum: ApiForum }>(`/forums/${forumId}`),
  createForum: (input: { name: string; description: string; visibility: ForumVisibility; iconUrl?: string | null; bannerUrl?: string | null; tags?: string[]; structure?: { categories: Array<{ name: string; channels: Array<{ name: string; type: 'text' | 'voice' }> }> } }) => request<{ forum: ApiForum }>('/forums', { method: 'POST', body: JSON.stringify(input) }),
  joinForum: (forumId: string) => request(`/forums/${forumId}/join`, { method: 'POST' }),
  leaveForum: (forumId: string) => request(`/forums/${forumId}/members/me`, { method: 'DELETE' }),
  listMembers: (forumId: string) =>
    request<{ members: ApiForumMember[] }>(`/forums/${forumId}/members`),

  updateForum: (forumId: string, input: { name?: string; description?: string; visibility?: ForumVisibility; iconUrl?: string | null; bannerUrl?: string | null }) =>
    request<{ forum: unknown }>(`/forums/${forumId}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),

  updateMemberRole: (forumId: string, userId: string, role: Exclude<ForumMemberRole, 'owner'>) =>
    request<{ member: { forumId: string; userId: string; role: Exclude<ForumMemberRole, 'owner'>; joinedAt: string } }>(`/forums/${forumId}/members/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    }),

  removeMember: (forumId: string, userId: string) =>
    request<{ status: 'ok' }>(`/forums/${forumId}/members/${userId}`, { method: 'DELETE' }),

  listTags: (forumId: string) =>
    request<{ tags: ApiForumTag[] }>(`/forums/${forumId}/tags`),

  createTag: (forumId: string, name: string) =>
    request<{ tag: ApiForumTag }>(`/forums/${forumId}/tags`, {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),

  deleteTag: (forumId: string, tagId: string) =>
    request<{ status: 'ok' }>(`/forums/${forumId}/tags/${tagId}`, { method: 'DELETE' }),

  listTopics: (forumId: string) =>
    request<{ topics: ApiForumTopic[] }>(`/forums/${forumId}/topics`),

  createTopic: (forumId: string, input: { title: string; content: string }) =>
    request<{ topic: ApiForumTopic }>(`/forums/${forumId}/topics`, { method: 'POST', body: JSON.stringify({ ...input, tagIds: [] }) }),

  getTopic: (forumId: string, topicId: string) =>
    request<{ topic: ApiForumTopic }>(`/forums/${forumId}/topics/${topicId}`),

  updateTopic: (forumId: string, topicId: string, input: { title?: string; content?: string }) =>
    request<{ topic: ApiForumTopic }>(`/forums/${forumId}/topics/${topicId}`, { method: 'PATCH', body: JSON.stringify(input) }),

  listReplies: (forumId: string, topicId: string) =>
    request<{ replies: ApiForumReply[] }>(`/forums/${forumId}/topics/${topicId}/replies`),

  createReply: (forumId: string, topicId: string, content: string) =>
    request<{ reply: ApiForumReply }>(`/forums/${forumId}/topics/${topicId}/replies`, { method: 'POST', body: JSON.stringify({ content }) }),

  deleteTopic: (forumId: string, topicId: string) =>
    request<{ status: 'ok' }>(`/forums/${forumId}/topics/${topicId}`, { method: 'DELETE' }),

  setTopicFlag: (forumId: string, topicId: string, flag: TopicFlag, value: boolean) =>
    request<{ status: 'ok' }>(`/forums/${forumId}/topics/${topicId}/${flagPath(flag)}`, { method: value ? 'POST' : 'DELETE' }),

  listReports: (forumId: string, filters: { status?: ApiForumReport['status']; targetType?: ApiForumReport['targetType']; createdAfter?: string; createdBefore?: string; limit?: number; offset?: number } = {}) => {
    const query = new URLSearchParams({ forumId })
    for (const [key, value] of Object.entries(filters)) if (value !== undefined) query.set(key, String(value))
    return request<{ reports: ApiForumReport[] }>(`/moderation/reports?${query.toString()}`)
  },

  reviewReport: (reportId: string, input: { status: Extract<ApiForumReport['status'], 'reviewing' | 'resolved' | 'dismissed'>; resolutionNote?: string }) =>
    request<{ report: ApiForumReport }>(`/moderation/reports/${reportId}`, { method: 'PATCH', body: JSON.stringify(input) }),
}
