import { apiRequest } from '@/services/apiClient'

export type CommunityChannelType = 'text' | 'forum' | 'voice'
export type VoiceConnectionState = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'disconnected' | 'permission-denied'

export interface CommunityCategoryDto {
  id: string
  communityId: string
  name: string
  position: number
}

export interface CommunityChannelDto {
  id: string
  communityId: string
  categoryId: string | null
  name: string
  description: string | null
  type: CommunityChannelType
  isPrivate: boolean
  isAnnouncement: boolean
  viewerCanView?: boolean
  position: number
  ageRestricted: boolean
  slowmodeSeconds: number
  userLimit: number | null
}

export interface CommunityRoleDto {
  id: string
  name: string
  color: string
  position: number
  mentionable: boolean
  displaySeparately: boolean
  permissions: string[]
}

export interface CommunityMemberDto {
  userId: string
  role: 'member' | 'moderator' | 'owner'
  joinedAt: string
  user: { id: string; username: string; displayName: string; avatarUrl: string | null }
  roles: CommunityRoleDto[]
  timeout: { expiresAt: string | null; reason: string | null } | null
}

export interface CommunityMessageDto {
  id: string
  communityId: string
  channelId: string
  authorUserId: string
  content: string
  contentType: 'text' | 'gif' | 'sticker'
  stickerKey: string | null
  mediaUrl: string | null
  mediaMimeType?: string | null
  createdAt: string
  author: { id: string; username: string; displayName: string; avatarUrl: string | null }
  replyTo: { messageId: string; author: { id: string; username: string; displayName: string; avatarUrl: string | null } | null; excerpt: string | null; deleted: boolean } | null
}

export interface VoiceStateDto {
  communityId: string
  channelId: string
  userId: string
  selfMuted: boolean
  selfDeafened: boolean
  serverMuted: boolean
  serverDeafened: boolean
  joinedAt: string
  user: { id: string; username: string; displayName: string; avatarUrl: string | null }
}

export interface CommunityEventDto {
  id: string
  communityId: string
  channelId: string | null
  creatorUserId: string
  title: string
  description: string
  startsAt: string
  endsAt: string | null
  status: 'scheduled' | 'cancelled'
  creator: { id: string; displayName: string; username: string; avatarUrl: string | null }
  participants: Array<{ userId: string; reminderMinutes: number; user: { id: string; displayName: string; username: string; avatarUrl: string | null } }>
  viewerHasRsvped: boolean
}

export interface CommunityInviteDto {
  id: string
  communityId: string
  channelId: string | null
  creatorUserId: string | null
  expiresAt: string | null
  maxUses: number | null
  uses: number
  revokedAt: string | null
  createdAt: string
}

export interface CommunityBanDto {
  communityId: string
  userId: string
  actorUserId: string | null
  reason: string | null
  createdAt: string
  revokedAt: string | null
  user: { id: string; username: string; displayName: string; avatarUrl: string | null }
}

export interface CommunityModerationCaseDto {
  id: string
  communityId: string
  targetUserId: string
  actorUserId: string | null
  action: 'warning' | 'timeout' | 'kick' | 'ban'
  reason: string
  description: string | null
  contentReference: string | null
  internalNote?: string | null
  evidence: string[]
  status: 'active' | 'expired' | 'corrected'
  expiresAt: string | null
  correctedByUserId: string | null
  correctedAt: string | null
  correctionNote: string | null
  createdAt: string
  actor: { id: string; username: string; displayName: string; avatarUrl: string | null } | null
  target: { id: string; username: string; displayName: string; avatarUrl: string | null }
}

export interface CommunityModerationTimelineEventDto {
  id: string
  type: 'case_created' | 'appeal_submitted' | 'appeal_claimed' | 'appeal_released' | 'appeal_upheld' | 'appeal_reversed' | 'appeal_cancelled' | 'case_corrected'
  occurredAt: string
  actor: CommunityModerationCaseDto['actor']
  action: CommunityModerationCaseDto['action'] | null
  status: string | null
  note: string | null
  independentReview: boolean | null
  eligibleReviewerCount: number | null
  previousEffect: string | null
  nextEffect: string | null
  closedAppealCount: number | null
}

export interface CommunityModerationAppealHistoryDto {
  id: string
  appellantUserId: string
  statement: string
  additionalInfo: string | null
  evidence: string[]
  status: CommunityModerationAppealDto['status']
  assignedReviewerUserId: string | null
  reviewerUserId: string | null
  decisionNote: string | null
  createdAt: string
  decidedAt: string | null
  appellant: NonNullable<CommunityModerationCaseDto['actor']>
  reviewer: CommunityModerationCaseDto['actor']
  assignedReviewer: CommunityModerationCaseDto['actor']
  eligibleReviewers: NonNullable<CommunityModerationCaseDto['actor']>[]
}

export interface CommunityModerationCaseDetailDto extends CommunityModerationCaseDto {
  appeals: CommunityModerationAppealHistoryDto[]
  timeline: CommunityModerationTimelineEventDto[]
}

export interface CommunityModerationCaseFilters {
  limit?: number
  offset?: number
  targetUserId?: string
  actorUserId?: string
  action?: CommunityModerationCaseDto['action']
  status?: CommunityModerationCaseDto['status']
  createdAfter?: string
  createdBefore?: string
  appealReview?: 'pending' | 'without_eligible_reviewer'
}

export type CommunityAuditValue = string | number | boolean | string[] | null
export type CommunityAuditChange = { field: string; before: CommunityAuditValue; after: CommunityAuditValue }

export interface CommunityAuditLogDto {
  id: string
  actorUserId: string | null
  targetUserId: string | null
  action: string
  details: Record<string, CommunityAuditValue | CommunityAuditChange[]>
  createdAt: string
  actor: { id: string; username: string; displayName: string; avatarUrl: string | null } | null
  target: { id: string; username: string; displayName: string; avatarUrl: string | null } | null
}

export interface CommunityAuditLogFilters {
  limit?: number
  offset?: number
  action?: string
  actorUserId?: string
  targetUserId?: string
  createdAfter?: string
  createdBefore?: string
}

export interface CommunityModerationSummaryDto {
  reports: { pending: number; reviewing: number }
  cases: { resolved: number }
  activeTimeouts: number
  activeBans: number
  appealsPending: number
}

export type CommunityMessageReportStatus = 'pending' | 'reviewing' | 'resolved' | 'dismissed'
export interface CommunityMessageReportDto {
  id: string
  targetId: string
  targetType: 'community_message'
  reason: string
  details: string | null
  evidence: unknown[]
  status: CommunityMessageReportStatus
  reviewedByUserId: string | null
  reviewedAt: string | null
  resolutionNote: string | null
  createdAt: string
  message: { id: string; channelId: string; content: string; author: { id: string; username: string; displayName: string; avatarUrl: string | null } | null; createdAt: string; deletedAt: string | null }
}

export interface CommunityModerationAppealDto {
  id: string
  communityId: string
  moderationCaseId: string
  appellantUserId: string
  statement: string
  additionalInfo: string | null
  evidence: string[]
  status: 'pending' | 'reviewing' | 'upheld' | 'reversed' | 'cancelled' | 'closed_by_correction'
  assignedReviewerUserId: string | null
  claimAvailable: boolean
  reviewerUserId: string | null
  decisionNote: string | null
  decidedAt: string | null
  createdAt: string
  updatedAt: string
  appellant: { id: string; username: string; displayName: string; avatarUrl: string | null }
  reviewer: { id: string; username: string; displayName: string; avatarUrl: string | null } | null
  assignedReviewer: { id: string; username: string; displayName: string; avatarUrl: string | null } | null
  moderationCase: CommunityModerationCaseDto
}

export type OwnCommunityModerationAppealDto = Omit<CommunityModerationAppealDto, 'moderationCase'> & {
  moderationCase: Omit<CommunityModerationCaseDto, 'internalNote'>
}

export interface OwnCommunityModerationCaseDto extends Omit<CommunityModerationCaseDto, 'internalNote'> {
  community: { id: string; name: string }
  appeals: Array<{ id: string; status: CommunityModerationAppealDto['status']; statement: string; additionalInfo: string | null; evidence: string[]; decisionNote: string | null; createdAt: string; decidedAt: string | null }>
}

export interface CommunityStateDto {
  community: { id: string; name: string; description: string; iconUrl: string | null; bannerUrl: string | null; ownerUserId: string; visibility: 'public' | 'private'; memberListMode: 'simple' | 'grouped_roles' }
  viewerMembership: { role: 'member' | 'moderator' | 'owner' } | null
  viewerPermissions: string[]
  categories: CommunityCategoryDto[]
  channels: CommunityChannelDto[]
  roles: CommunityRoleDto[]
  members: CommunityMemberDto[]
  overrides: Array<{ id: string; communityId: string; channelId: string | null; categoryId: string | null; subjectType: 'role' | 'member'; subjectId: string; allow: string[]; deny: string[] }>
  rules: { rules: string[]; requireAcceptance: boolean } | null
  emojis: Array<{ id: string; name: string; mediaAssetId: string }>
  voiceStates: VoiceStateDto[]
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  return apiRequest<T>(path, init)
}

export const communityApi = {
  listMyModerationHistory: () => request<{ cases: OwnCommunityModerationCaseDto[] }>('/me/community-moderation-cases'),
  submitMyModerationAppeal: (caseId: string, input: { statement: string; additionalInfo?: string; evidence?: string[] }) => request<{ appeal: { id: string; status: CommunityModerationAppealDto['status'] }; eligibleReviewerCount: number }>(`/me/community-moderation-cases/${caseId}/appeals`, { method: 'POST', body: JSON.stringify({ evidence: [], ...input }) }),
  getState: (communityId: string) => request<{ state: CommunityStateDto }>(`/communities/${communityId}`),
  updateMemberListMode: (communityId: string, mode: 'simple' | 'grouped_roles') => request<{ memberListMode: 'simple' | 'grouped_roles' }>(`/communities/${communityId}/settings/member-list`, { method: 'PATCH', body: JSON.stringify({ mode }) }),
  listEvents: (communityId: string) => request<{ events: CommunityEventDto[] }>(`/communities/${communityId}/events`),
  createEvent: (communityId: string, input: { title: string; description: string; startsAt: string; channelId?: string | null }) => request<{ event: CommunityEventDto }>(`/communities/${communityId}/events`, { method: 'POST', body: JSON.stringify(input) }),
  updateEvent: (communityId: string, eventId: string, input: { title: string; description: string; startsAt: string }) => request<{ event: CommunityEventDto }>(`/communities/${communityId}/events/${eventId}`, { method: 'PATCH', body: JSON.stringify(input) }),
  cancelEvent: (communityId: string, eventId: string) => request<{ status: 'ok' }>(`/communities/${communityId}/events/${eventId}`, { method: 'DELETE' }),
  rsvpEvent: (communityId: string, eventId: string, reminderMinutes: number) => request<{ event: CommunityEventDto }>(`/communities/${communityId}/events/${eventId}/rsvp`, { method: 'PUT', body: JSON.stringify({ reminderMinutes }) }),
  cancelRsvp: (communityId: string, eventId: string) => request<{ event: CommunityEventDto }>(`/communities/${communityId}/events/${eventId}/rsvp`, { method: 'DELETE' }),
  listMessages: (communityId: string, channelId: string) => request<{ messages: CommunityMessageDto[] }>(`/communities/${communityId}/channels/${channelId}/messages`),
  createMessage: (communityId: string, channelId: string, input: { content: string; contentType?: 'text' | 'gif' | 'sticker'; stickerKey?: string; mediaAssetId?: string; replyToMessageId?: string }) => request<{ message: CommunityMessageDto }>(`/communities/${communityId}/channels/${channelId}/messages`, { method: 'POST', body: JSON.stringify(input) }),
  createCategory: (communityId: string, name: string, position = 0) => request<{ category: CommunityCategoryDto }>(`/communities/${communityId}/categories`, { method: 'POST', body: JSON.stringify({ name, position }) }),
  updateCategory: (communityId: string, categoryId: string, input: Partial<Pick<CommunityCategoryDto, 'name' | 'position'>>) => request<{ category: CommunityCategoryDto }>(`/communities/${communityId}/categories/${categoryId}`, { method: 'PATCH', body: JSON.stringify(input) }),
  deleteCategory: (communityId: string, categoryId: string) => request<{ status: 'ok' }>(`/communities/${communityId}/categories/${categoryId}`, { method: 'DELETE' }),
  createChannel: (communityId: string, input: { name: string; type: CommunityChannelType; categoryId?: string | null; description?: string | null; position?: number; userLimit?: number | null; isPrivate?: boolean; isAnnouncement?: boolean; ageRestricted?: boolean; slowmodeSeconds?: number }) => request<{ channel: CommunityChannelDto }>(`/communities/${communityId}/channels`, { method: 'POST', body: JSON.stringify({ position: 0, ageRestricted: false, slowmodeSeconds: 0, ...input }) }),
  updateChannel: (communityId: string, channelId: string, input: Partial<Omit<CommunityChannelDto, 'id' | 'communityId' | 'viewerCanView'>>) => request<{ channel: CommunityChannelDto }>(`/communities/${communityId}/channels/${channelId}`, { method: 'PATCH', body: JSON.stringify(input) }),
  deleteChannel: (communityId: string, channelId: string) => request<{ status: 'ok' }>(`/communities/${communityId}/channels/${channelId}`, { method: 'DELETE' }),
  upsertOverride: (communityId: string, input: { channelId: string; subjectType: 'role' | 'member'; subjectId: string; allow: string[]; deny: string[] }) => request<{ override: CommunityStateDto['overrides'][number] }>(`/communities/${communityId}/permission-overrides`, { method: 'POST', body: JSON.stringify(input) }),
  createRole: (communityId: string, input: { name: string; color: string; permissions: string[]; position?: number; mentionable?: boolean; displaySeparately?: boolean }) => request<{ role: CommunityRoleDto }>(`/communities/${communityId}/roles`, { method: 'POST', body: JSON.stringify({ position: 0, mentionable: false, displaySeparately: false, ...input }) }),
  updateRole: (communityId: string, roleId: string, input: Partial<Pick<CommunityRoleDto, 'name' | 'color' | 'permissions' | 'position' | 'mentionable' | 'displaySeparately'>>) => request<{ role: CommunityRoleDto }>(`/communities/${communityId}/roles/${roleId}`, { method: 'PATCH', body: JSON.stringify(input) }),
  deleteRole: (communityId: string, roleId: string) => request<{ status: 'ok' }>(`/communities/${communityId}/roles/${roleId}`, { method: 'DELETE' }),
  addMemberRole: (communityId: string, userId: string, roleId: string) => request<{ status: 'ok' }>(`/communities/${communityId}/members/${userId}/roles`, { method: 'POST', body: JSON.stringify({ roleId }) }),
  removeMemberRole: (communityId: string, userId: string, roleId: string) => request<{ status: 'ok' }>(`/communities/${communityId}/members/${userId}/roles/${roleId}`, { method: 'DELETE' }),
  createInvite: (communityId: string, input: { channelId?: string | null; expiresAt?: string | null; maxUses?: number | null } = {}) => request<{ invite: { invite: { id: string }; token: string } }>(`/communities/${communityId}/invites`, { method: 'POST', body: JSON.stringify(input) }),
  joinByInvite: (token: string) => request<{ joined: { communityId: string; channelId: string | null } }>(`/community-invites/${encodeURIComponent(token)}/join`, { method: 'POST' }),
  listInvites: (communityId: string) => request<{ invites: CommunityInviteDto[] }>(`/communities/${communityId}/invites`),
  revokeInvite: (communityId: string, inviteId: string) => request<{ status: 'ok' }>(`/communities/${communityId}/invites/${inviteId}`, { method: 'DELETE' }),
  listBans: (communityId: string) => request<{ bans: CommunityBanDto[] }>(`/communities/${communityId}/bans`),
  unbanMember: (communityId: string, userId: string) => request<{ status: 'ok' }>(`/communities/${communityId}/bans/${userId}`, { method: 'DELETE' }),
  getModerationSummary: (communityId: string) => request<{ summary: CommunityModerationSummaryDto }>(`/communities/${communityId}/moderation/summary`),
  reportMessage: (communityId: string, channelId: string, messageId: string, input: { reason: string; details?: string }) => request<{ report: { id: string; status: CommunityMessageReportStatus; createdAt: string } }>(`/communities/${communityId}/channels/${channelId}/messages/${messageId}/reports`, { method: 'POST', body: JSON.stringify(input) }),
  listMessageReports: (communityId: string, filters: { limit?: number; offset?: number; status?: CommunityMessageReportStatus } = {}) => {
    const query = new URLSearchParams()
    for (const [key, value] of Object.entries(filters)) if (value !== undefined) query.set(key, String(value))
    return request<{ reports: CommunityMessageReportDto[]; hasMore: boolean }>(`/communities/${communityId}/moderation/message-reports?${query.toString()}`)
  },
  reviewMessageReport: (communityId: string, reportId: string, input: { status: Extract<CommunityMessageReportStatus, 'reviewing' | 'resolved' | 'dismissed'>; resolutionNote?: string }) => request<{ report: CommunityMessageReportDto }>(`/communities/${communityId}/moderation/message-reports/${reportId}`, { method: 'PATCH', body: JSON.stringify(input) }),
  listModerationCases: (communityId: string, filters: CommunityModerationCaseFilters = {}) => {
    const query = new URLSearchParams()
    for (const [key, value] of Object.entries(filters)) if (value !== undefined && value !== '') query.set(key, String(value))
    const queryString = query.toString()
    return request<{ cases: CommunityModerationCaseDetailDto[]; hasMore: boolean }>(`/communities/${communityId}/moderation/cases${queryString ? `?${queryString}` : ''}`)
  },
  listAuditLogs: (communityId: string, filters: CommunityAuditLogFilters = {}) => {
    const query = new URLSearchParams()
    for (const [key, value] of Object.entries(filters)) if (value !== undefined && value !== '') query.set(key, String(value))
    const queryString = query.toString()
    return request<{ events: CommunityAuditLogDto[]; hasMore: boolean }>(`/communities/${communityId}/audit-logs${queryString ? `?${queryString}` : ''}`)
  },
  warnMember: (communityId: string, userId: string, input: { reason: string; description?: string; contentReference?: string; internalNote?: string }) => request<{ moderationCase: CommunityModerationCaseDto }>(`/communities/${communityId}/members/${userId}/warnings`, { method: 'POST', body: JSON.stringify({ ...input, evidence: [] }) }),
  timeoutMember: (communityId: string, userId: string, input: { reason: string; expiresAt?: string | null }) => request<{ moderationCase: CommunityModerationCaseDto }>(`/communities/${communityId}/members/${userId}/timeout`, { method: 'POST', body: JSON.stringify({ ...input, evidence: [] }) }),
  kickMember: (communityId: string, userId: string, reason: string) => request<{ moderationCase: CommunityModerationCaseDto }>(`/communities/${communityId}/members/${userId}/kick`, { method: 'POST', body: JSON.stringify({ reason, evidence: [] }) }),
  banMember: (communityId: string, userId: string, input: { reason: string; expiresAt?: string | null }) => request<{ moderationCase: CommunityModerationCaseDto }>(`/communities/${communityId}/members/${userId}/ban`, { method: 'POST', body: JSON.stringify({ ...input, evidence: [] }) }),
  listOwnModerationCases: (communityId: string) => request<{ cases: CommunityModerationCaseDto[] }>(`/communities/${communityId}/me/moderation-cases`),
  listOwnModerationAppeals: (communityId: string) => request<{ appeals: OwnCommunityModerationAppealDto[] }>(`/communities/${communityId}/me/moderation/appeals`),
  submitModerationAppeal: (communityId: string, input: { moderationCaseId: string; statement: string; additionalInfo?: string; evidence?: string[] }) => request<{ appeal: CommunityModerationAppealDto; eligibleReviewerCount: number }>(`/communities/${communityId}/moderation/appeals`, { method: 'POST', body: JSON.stringify({ evidence: [], ...input }) }),
  listModerationAppeals: (communityId: string) => request<{ appeals: CommunityModerationAppealDto[] }>(`/communities/${communityId}/moderation/appeals`),
  claimModerationAppeal: (communityId: string, appealId: string) => request<{ appeal: CommunityModerationAppealDto }>(`/communities/${communityId}/moderation/appeals/${appealId}/claim`, { method: 'POST' }),
  releaseModerationAppeal: (communityId: string, appealId: string) => request<{ appeal: CommunityModerationAppealDto }>(`/communities/${communityId}/moderation/appeals/${appealId}/claim`, { method: 'DELETE' }),
  reviewModerationAppeal: (communityId: string, appealId: string, input: { status: 'upheld' | 'reversed'; decisionNote: string }) => request<{ appeal: CommunityModerationAppealDto }>(`/communities/${communityId}/moderation/appeals/${appealId}/review`, { method: 'POST', body: JSON.stringify(input) }),
  correctOwnModerationCase: (communityId: string, caseId: string, note: string) => request<{ moderationCase: CommunityModerationCaseDto }>(`/communities/${communityId}/moderation/cases/${caseId}/correction`, { method: 'POST', body: JSON.stringify({ note }) }),
  getAppealReviewerRoles: (communityId: string) => request<{ roleIds: string[] }>(`/communities/${communityId}/appeal-reviewer-roles`),
  setAppealReviewerRoles: (communityId: string, roleIds: string[]) => request<{ roleIds: string[] }>(`/communities/${communityId}/appeal-reviewer-roles`, { method: 'PUT', body: JSON.stringify({ roleIds }) }),
  acceptRules: (communityId: string) => request<{ status: 'ok' }>(`/communities/${communityId}/rules/accept`, { method: 'POST' }),
  joinVoice: (communityId: string, channelId: string, input: { selfMuted?: boolean; selfDeafened?: boolean }) => request<{ voiceState: VoiceStateDto }>(`/communities/${communityId}/channels/${channelId}/voice/join`, { method: 'POST', body: JSON.stringify(input) }),
  leaveVoice: (communityId: string) => request<{ voiceState: VoiceStateDto | null }>(`/communities/${communityId}/voice/leave`, { method: 'POST' }),
  updateVoiceMe: (communityId: string, input: { selfMuted?: boolean; selfDeafened?: boolean }) => request<{ voiceState: VoiceStateDto | null }>(`/communities/${communityId}/voice/me`, { method: 'PATCH', body: JSON.stringify(input) }),
  moderateVoice: (communityId: string, userId: string, input: { serverMuted?: boolean; serverDeafened?: boolean; channelId?: string; disconnect?: boolean }) => request<{ voiceState: VoiceStateDto | null }>(`/communities/${communityId}/voice/${userId}`, { method: 'PATCH', body: JSON.stringify(input) }),
  getWebrtcConfig: () => request<{ iceServers: RTCIceServer[] }>('/webrtc/config'),
}
