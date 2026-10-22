import { apiRequest } from '@/services/apiClient'

export interface PublicProfileDto {
  id: string
  publicUserId: string
  username: string
  displayName: string
  bio: string
  avatarUrl: string | null
  bannerUrl: string | null
  bannerColor: string
  customStatus: { text: string; expiresAt: string | null } | null
  badges: Array<BadgeAchievementDto>
  achievements: Array<BadgeAchievementDto>
  badgeDisplayMode: 'all' | 'selected'
  featuredBadgeSlugs: string[]
  createdAt: string
  followersCount: number
  followingCount: number
  viewerIsFollowing: boolean
  profileVisibility: 'public' | 'private'
  viewerFollowRequestPending: boolean
  isOfficial?: boolean
}

export interface BadgeAchievementDto {
  id: string
  slug: string
  name: string
  description: string
  iconKey: string
  displayOrder: number
  category: string
  grantMode: string
  isOfficial: boolean
  iconUrl: string | null
  createdAt: string
  earnedAt: string | null
  color?: string
}

export type DmPrivacy = 'anyone' | 'following' | 'followers' | 'friends_of_friends' | 'nobody'
type MyProfileDto = PublicProfileDto & { email: string; role: string; postsVisibility: string; forumsVisibility: string; dmPrivacy: DmPrivacy }

export interface FriendRequestDto {
  id: string
  requesterUserId: string
  addresseeUserId: string
  status: 'pending' | 'accepted' | 'rejected'
  createdAt: string
  user: PublicProfileDto
}

export interface BlockedUserDto {
  id: string
  username: string
  displayName: string
  avatarUrl: string | null
  blockedAt: string
}

export const socialApi = {
  me: () => apiRequest<{ user: MyProfileDto }>('/users/me'),
  updateMe: (input: Record<string, unknown>) => apiRequest<{ user: MyProfileDto }>('/users/me', { method: 'PATCH', body: JSON.stringify(input) }),
  updateBadgePreferences: (mode: 'all' | 'selected', selectedSlugs: string[]) => apiRequest('/users/me/badges', { method: 'PATCH', body: JSON.stringify({ mode, selectedSlugs }) }),
  setStatus: (text: string, expiresAt: string | null) => apiRequest('/users/me/status', { method: 'PUT', body: JSON.stringify({ text, expiresAt }) }),
  clearStatus: () => apiRequest('/users/me/status', { method: 'DELETE' }),
  searchUsers: (query: string, limit = 20, offset = 0) => {
    const params = new URLSearchParams({ q: query, limit: String(limit), offset: String(offset) })
    return apiRequest<{ users: PublicProfileDto[]; nextOffset?: number | null }>(`/users/search?${params.toString()}`)
  },
  getUser: (username: string) => apiRequest<{ user: PublicProfileDto }>(`/users/${encodeURIComponent(username)}`),
  listFriends: () => apiRequest<{ friends: PublicProfileDto[] }>('/friends'),
  listIncomingRequests: () => apiRequest<{ requests: FriendRequestDto[] }>('/friends/requests/incoming'),
  listOutgoingRequests: () => apiRequest<{ requests: FriendRequestDto[] }>('/friends/requests/outgoing'),
  sendFriendRequest: (userId: string) => apiRequest('/friends/requests', { method: 'POST', body: JSON.stringify({ userId }) }),
  acceptFriendRequest: (id: string) => apiRequest(`/friends/requests/${id}/accept`, { method: 'POST' }),
  rejectFriendRequest: (id: string) => apiRequest(`/friends/requests/${id}/reject`, { method: 'POST' }),
  cancelFriendRequest: (id: string) => apiRequest(`/friends/requests/${id}`, { method: 'DELETE' }),
  removeFriend: (userId: string) => apiRequest(`/friends/${userId}`, { method: 'DELETE' }),
  follow: (userId: string) => apiRequest<{ status: 'following' | 'requested' }>(`/users/${userId}/follow`, { method: 'POST' }),
  unfollow: (userId: string) => apiRequest(`/users/${userId}/follow`, { method: 'DELETE' }),
  incomingFollowRequests: () => apiRequest<{ requests: Array<{ requesterUserId: string; createdAt: string; user: PublicProfileDto }> }>('/users/me/follow-requests/incoming'),
  acceptFollowRequest: (requesterId: string) => apiRequest(`/users/me/follow-requests/${requesterId}/accept`, { method: 'POST' }),
  rejectFollowRequest: (requesterId: string) => apiRequest(`/users/me/follow-requests/${requesterId}/reject`, { method: 'POST' }),
  block: (userId: string) => apiRequest(`/blocks/${userId}`, { method: 'POST' }),
  unblock: (userId: string) => apiRequest(`/blocks/${userId}`, { method: 'DELETE' }),
  blocks: (limit = 50, offset = 0) => apiRequest<{ blocks: BlockedUserDto[] }>(`/blocks?limit=${limit}&offset=${offset}`),
  report: (userId: string, reason: string, details?: string) => apiRequest(`/users/${userId}/report`, { method: 'POST', body: JSON.stringify({ reason, ...(details?.trim() ? { details: details.trim() } : {}) }) }),
  followers: (userId: string, limit = 50, offset = 0) => apiRequest<{ users: PublicProfileDto[] }>(`/users/${userId}/followers?limit=${limit}&offset=${offset}`),
  following: (userId: string, limit = 50, offset = 0) => apiRequest<{ users: PublicProfileDto[] }>(`/users/${userId}/following?limit=${limit}&offset=${offset}`),
}
