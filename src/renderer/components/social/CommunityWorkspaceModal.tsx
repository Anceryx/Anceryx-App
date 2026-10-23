import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  Hash,
  Loader2,
  MonitorUp,
  MessageSquare,
  Mic,
  MicOff,
  PhoneOff,
  Plus,
  RefreshCw,
  Reply,
  Send,
  Shield,
  Smile,
  Volume2,
  VolumeX,
  X,
  Home,
  MessageCircle,
  Compass,
  Users,
  User,
  CalendarDays,
  Copy,
  Pencil,
  Trash2,
  Settings,
  Check,
  Flag,
  ChevronDown,
  LogOut,
  CalendarPlus,
  Copy as CopyIcon,
  Share2,
} from 'lucide-react'
import { Button, Input } from '@/components/ui/index'
import { Avatar } from '@/components/ui/index'
import { MediaAttachment } from '@/components/ui/MediaAttachment'
import UserProfileModal from './UserProfileModal'
import type { SidebarSection } from '@/types/index'
import type { Forum } from '@/types/index'
import { useAuthStore } from '@/store/authStore'
import { useUIStore } from '@/store/uiStore'
import { useTranslation } from '@/i18n'
import type { TranslationKey } from '@/i18nCatalog'
import {
  communityApi,
  type CommunityChannelDto,
  type CommunityChannelType,
  type CommunityBanDto,
  type CommunityMemberDto,
  type CommunityEventDto,
  type CommunityInviteDto,
  type CommunityMessageDto,
  type CommunityModerationCaseDto,
  type CommunityModerationCaseDetailDto,
  type CommunityModerationCaseFilters,
  type CommunityAuditLogDto,
  type CommunityModerationSummaryDto,
  type CommunityMessageReportDto,
  type CommunityMessageReportStatus,
  type CommunityAuditChange,
  type CommunityAuditValue,
  type CommunityAuditLogFilters,
  type CommunityModerationAppealDto,
  type CommunityStateDto,
} from '@/services/communityApi'
import { communityVoiceClient } from '@/services/webrtc/communityVoiceClient'
import { realtimeClient } from '@/services/realtimeClient'
import { formatDate, formatDateTime, formatTimestamp } from '@/utils/formatters'
import { normalizeCommunityVoicePayload, removeCommunityVoiceParticipant, upsertCommunityVoiceParticipant } from '@/utils/communityVoiceRealtime'
import { getCommunityMemberRoleLabels, groupCommunityMembersByRole } from '@/utils/communityMemberGroups'
import { canLoadCommunityModerationHistory, getAvailableCommunityModerationActions, resolveCommunityModerationAction, shouldShowCommunityModerationPanel, type CommunityModerationAction } from '@/utils/communityModerationPermissions'
import { mediaApi } from '@/services/mediaApi'
import MessageComposer from '@/components/messages/MessageComposer'
import { usePersistentDraft } from '@/hooks/usePersistentDraft'
import type { KlipyGif } from '@/services/klipyApi'
import { isSafeKlipyMediaUrl, registerKlipyShare } from '@/services/klipyApi'
import { getKaoliSticker, type KaoliStickerKey } from '@/lib/kaoliStickers'
import { renderAnceryxText } from '@/lib/anceryxEmojis'
import { ApiError } from '@/services/apiClient'
import ForumManagementModal, { type ForumManagementTab } from './ForumManagementModal'
import CommunityForumChannel from './CommunityForumChannel'
import CommunityManagementModal, { type CommunityManagementSection } from './CommunityManagementModal'
import CommunityVoiceActionButtons from './CommunityVoiceActionButtons'
import { communityPermissionLabel, getEffectiveCommunityPermissions } from '@/utils/communityPermissions'
import { forumApi } from '@/services/forumApi'

interface CommunityWorkspaceModalProps {
  communityId: string
  forum?: Forum
  presentation?: 'modal' | 'embedded'
  onClose: () => void
  onForumDeleted?: () => void
  onNavigateGlobal?: (section: SidebarSection) => void
}

const CHANNEL_ICONS: Record<CommunityChannelType, React.ReactNode> = {
  text: <Hash size={14} />,
  forum: <MessageSquare size={14} />,
  voice: <Volume2 size={14} />,
}

const PERMISSIONS = [
  'manageCommunity',
  'viewChannel',
  'sendMessages',
  'readHistory',
  'createTopics',
  'manageTopics',
  'manageChannels',
  'manageRoles',
  'manageMessages',
  'manageNicknames',
  'manageInvites',
  'manageEvents',
  'kickMembers',
  'banMembers',
  'timeoutMembers',
  'attachFiles',
  'embedLinks',
  'mentionEveryone',
  'addReactions',
  'useExternalEmojis',
  'connect',
  'speak',
  'muteMembers',
  'deafenMembers',
  'moveMembers',
  'viewAuditLog',
]

function moderationEffectLabel(effect: string, t: (key: TranslationKey) => string): string {
  switch (effect) {
    case 'recorded_warning': return t('workspaceUi.effectWarning')
    case 'timeout': return t('workspaceUi.effectTimeout')
    case 'membership_removed': return t('workspaceUi.effectRemoval')
    case 'ban': return t('workspaceUi.caseBan')
    case 'reversed': return t('workspaceUi.effectReversed')
    default: return t('workspaceUi.effectRecorded')
  }
}

function withResolvedMessageMedia(message: CommunityMessageDto): CommunityMessageDto {
  return message.mediaUrl ? { ...message, mediaUrl: mediaApi.resolvePublicUrl(message.mediaUrl) } : message
}

const AUDIT_FIELD_KEYS: Record<string, TranslationKey> = {
  name: 'workspaceUi.auditField.name', color: 'workspaceUi.auditField.color', position: 'workspaceUi.auditField.position',
  mentionable: 'workspaceUi.auditField.mentionable', displaySeparately: 'workspaceUi.auditField.displaySeparately',
  permissions: 'workspaceUi.auditField.permissions', categoryId: 'workspaceUi.auditField.category', type: 'workspaceUi.auditField.type',
  isPrivate: 'workspaceUi.auditField.privateChannel', isAnnouncement: 'workspaceUi.auditField.announcementChannel',
  ageRestricted: 'workspaceUi.auditField.ageRestricted', slowmodeSeconds: 'workspaceUi.auditField.slowmode',
  userLimit: 'workspaceUi.auditField.userLimit', mode: 'workspaceUi.auditField.memberDisplay',
  roleIds: 'workspaceUi.auditField.reviewerRoles', allow: 'workspaceUi.auditField.allowedPermissions', deny: 'workspaceUi.auditField.deniedPermissions',
}

function formatAuditValue(value: CommunityAuditValue, t: (key: TranslationKey) => string): string {
  if (value === null) return t('workspaceUi.none')
  if (typeof value === 'boolean') return value ? t('workspaceUi.yes') : t('workspaceUi.no')
  if (Array.isArray(value)) return value.length ? value.join(', ') : t('workspaceUi.none')
  return String(value)
}

function getAuditChanges(details: CommunityAuditLogDto['details']): CommunityAuditChange[] {
  const changes = details.changes
  return Array.isArray(changes) ? changes as CommunityAuditChange[] : []
}

const CommunityWorkspaceModal: React.FC<CommunityWorkspaceModalProps> = ({ communityId, forum, presentation = 'modal', onClose, onForumDeleted, onNavigateGlobal }) => {
  const t = useTranslation()
  const token = useAuthStore((s) => s.token)
  const currentUserId = useAuthStore((s) => s.user?.id ?? '')
  const currentUserAvatar = useAuthStore((s) => s.user?.avatar)
  const currentUserName = useAuthStore((s) => s.user?.name)
  const addNotification = useUIStore((s) => s.addNotification)
  const [state, setState] = useState<CommunityStateDto | null>(null)
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null)
  const [showCommunityPosts, setShowCommunityPosts] = useState(false)
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set())
  const [messages, setMessages] = useState<CommunityMessageDto[]>([])
  const [events, setEvents] = useState<CommunityEventDto[]>([])
  const [showEvents, setShowEvents] = useState(false)
  const [eventTitle, setEventTitle] = useState('')
  const [eventDescription, setEventDescription] = useState('')
  const [eventStartsAt, setEventStartsAt] = useState('')
  const [editingEventId, setEditingEventId] = useState<string | null>(null)
  const [replyTarget, setReplyTarget] = useState<CommunityMessageDto | null>(null)
  const [messageReportTarget, setMessageReportTarget] = useState<CommunityMessageDto | null>(null)
  const [messageReportChannelId, setMessageReportChannelId] = useState<string | null>(null)
  const [messageReportReason, setMessageReportReason] = useState('spam')
  const [messageReportDetails, setMessageReportDetails] = useState('')
  const [communityReports, setCommunityReports] = useState<CommunityMessageReportDto[]>([])
  const [communityReportsStatus, setCommunityReportsStatus] = useState<CommunityMessageReportStatus | ''>('pending')
  const [communityReportsOffset, setCommunityReportsOffset] = useState(0)
  const [communityReportsHasMore, setCommunityReportsHasMore] = useState(false)
  const [communityReportsLoading, setCommunityReportsLoading] = useState(false)
  const [communityReportsError, setCommunityReportsError] = useState<string | null>(null)
  const [reportDecisionNotes, setReportDecisionNotes] = useState<Record<string, string>>({})
  const [voiceChatOpen, setVoiceChatOpen] = useState(false)
  const [messageFile, setMessageFile] = useState<File | null>(null)
  const [messageFilePreview, setMessageFilePreview] = useState<string | null>(null)
  const [messageUploadProgress, setMessageUploadProgress] = useState(0)
  const messageUploadControllerRef = useRef<AbortController | null>(null)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newChannelCategoryId, setNewChannelCategoryId] = useState('')
  const [newChannelName, setNewChannelName] = useState('')
  const [newChannelType, setNewChannelType] = useState<CommunityChannelType>('text')
  const [newChannelPrivate, setNewChannelPrivate] = useState(false)
  const [newChannelAnnouncement, setNewChannelAnnouncement] = useState(false)
  const [editingCategory, setEditingCategory] = useState<{ id: string; name: string } | null>(null)
  const [editingChannel, setEditingChannel] = useState<CommunityChannelDto | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<{ type: 'category' | 'channel'; id: string; name: string } | null>(null)
  const [accessSubjectType, setAccessSubjectType] = useState<'role' | 'member'>('role')
  const [accessSubjectId, setAccessSubjectId] = useState('')
  const [accessAllowed, setAccessAllowed] = useState(true)
  const [newRoleName, setNewRoleName] = useState('')
  const [newRolePermission, setNewRolePermission] = useState('viewChannel')
  const [newRolePosition, setNewRolePosition] = useState('0')
  const [newRoleDisplaySeparately, setNewRoleDisplaySeparately] = useState(false)
  const [newRoleMentionable, setNewRoleMentionable] = useState(false)
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null)
  const [editingRoleName, setEditingRoleName] = useState('')
  const [editingRoleColor, setEditingRoleColor] = useState('#8b5cf6')
  const [editingRolePermissions, setEditingRolePermissions] = useState<string[]>([])
  const [editingRolePosition, setEditingRolePosition] = useState(0)
  const [editingRoleDisplaySeparately, setEditingRoleDisplaySeparately] = useState(false)
  const [editingRoleMentionable, setEditingRoleMentionable] = useState(false)
  const [roleMemberId, setRoleMemberId] = useState('')
  const [roleToAssign, setRoleToAssign] = useState('')
  const [inviteToken, setInviteToken] = useState<string | null>(null)
  const [inviteExpiryDays, setInviteExpiryDays] = useState('7')
  const [inviteMaxUses, setInviteMaxUses] = useState('')
  const [invites, setInvites] = useState<CommunityInviteDto[]>([])
  const [bans, setBans] = useState<CommunityBanDto[]>([])
  const [moderationCases, setModerationCases] = useState<CommunityModerationCaseDetailDto[]>([])
  const [moderationSummary, setModerationSummary] = useState<CommunityModerationSummaryDto | null>(null)
  const [moderationSummaryLoading, setModerationSummaryLoading] = useState(false)
  const [moderationSummaryError, setModerationSummaryError] = useState<string | null>(null)
  const [moderationFilters, setModerationFilters] = useState<CommunityModerationCaseFilters>({})
  const [activeModerationFilters, setActiveModerationFilters] = useState<CommunityModerationCaseFilters>({})
  const [moderationOffset, setModerationOffset] = useState(0)
  const [moderationHasMore, setModerationHasMore] = useState(false)
  const [moderationLoading, setModerationLoading] = useState(false)
  const [auditEvents, setAuditEvents] = useState<CommunityAuditLogDto[]>([])
  const [auditFilters, setAuditFilters] = useState<CommunityAuditLogFilters>({})
  const [activeAuditFilters, setActiveAuditFilters] = useState<CommunityAuditLogFilters>({})
  const [auditOffset, setAuditOffset] = useState(0)
  const [auditHasMore, setAuditHasMore] = useState(false)
  const [auditLoading, setAuditLoading] = useState(false)
  const [auditError, setAuditError] = useState<string | null>(null)
  const [auditLoaded, setAuditLoaded] = useState(false)
  const [ownModerationCases, setOwnModerationCases] = useState<CommunityModerationCaseDto[]>([])
  const [ownAppeals, setOwnAppeals] = useState<CommunityModerationAppealDto[]>([])
  const [appealQueue, setAppealQueue] = useState<CommunityModerationAppealDto[]>([])
  const [canReviewAppeals, setCanReviewAppeals] = useState(false)
  const [reviewerRoleIds, setReviewerRoleIds] = useState<string[]>([])
  const [appealCaseId, setAppealCaseId] = useState<string | null>(null)
  const [appealStatement, setAppealStatement] = useState('')
  const [appealAdditionalInfo, setAppealAdditionalInfo] = useState('')
  const [appealEvidenceText, setAppealEvidenceText] = useState('')
  const [reviewDecisionNotes, setReviewDecisionNotes] = useState<Record<string, string>>({})
  const [correctionNotes, setCorrectionNotes] = useState<Record<string, string>>({})
  const [moderationTargetId, setModerationTargetId] = useState('')
  const [moderationReason, setModerationReason] = useState('')
  const [warningDescription, setWarningDescription] = useState('')
  const [warningContentReference, setWarningContentReference] = useState('')
  const [warningInternalNote, setWarningInternalNote] = useState('')
  const [moderationAction, setModerationAction] = useState<CommunityModerationAction>('warning')
  const [moderationExpiresAt, setModerationExpiresAt] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [voiceTick, setVoiceTick] = useState(0)
  const [mobileView, setMobileView] = useState<'channels' | 'content' | 'members'>('channels')
  const [selectedMember, setSelectedMember] = useState<CommunityMemberDto | null>(null)
  const [voiceProfileTarget, setVoiceProfileTarget] = useState<{ userId: string; x: number; y: number } | null>(null)
  const [voiceProfileUsername, setVoiceProfileUsername] = useState<string | null>(null)
  const [membersOpen, setMembersOpen] = useState(true)
  const voiceLayoutRef = useRef<{ active: boolean; restoreMembers: boolean }>({ active: false, restoreMembers: true })
  const [managementOpen, setManagementOpen] = useState(false)
  const [forumMenuOpen, setForumMenuOpen] = useState(false)
  const forumMenuRef = useRef<HTMLDivElement>(null)
  const [screenSources, setScreenSources] = useState<Array<{ id: string; name: string; thumbnail: string | null }>>([])
  const [screenPickerOpen, setScreenPickerOpen] = useState(false)
  const [screenPickerLoading, setScreenPickerLoading] = useState(false)
  const [managementSection, setManagementSection] = useState('overview')
  const [appealQueueLoading, setAppealQueueLoading] = useState(false)
  const [appealQueueError, setAppealQueueError] = useState<string | null>(null)
  const [appealQueueLoaded, setAppealQueueLoaded] = useState(false)
  const [bannerFailed, setBannerFailed] = useState(false)
  const [iconFailed, setIconFailed] = useState(false)

  const selectedChannel = useMemo(
    () => state?.channels.find((channel) => channel.id === selectedChannelId) ?? null,
    [selectedChannelId, state?.channels]
  )
  const channelDraft = usePersistentDraft(currentUserId, 'forum-channel', selectedChannel?.id ?? '')
  const messageDraft = channelDraft.value
  const setMessageDraft = channelDraft.setValue
  const groupedMemberEntries = useMemo(() => {
    return groupCommunityMembersByRole(state?.members ?? [], t)
  }, [state?.members, t])
  const viewerPermissions = new Set(state?.viewerPermissions ?? [])
  const isCommunityOwner = state?.community.ownerUserId === currentUserId
  const hasCommunityPermission = (permission: string) => isCommunityOwner || viewerPermissions.has('administrator') || viewerPermissions.has(permission)
  const legacyRole = forum?.members.find((member) => member.userId === currentUserId)?.role ?? (forum?.ownerId === currentUserId ? 'owner' : null)
  const canManageLegacyForum = legacyRole === 'owner' || legacyRole === 'moderator'
  const canManageChannels = hasCommunityPermission('manageChannels')
  const canManageRoles = hasCommunityPermission('manageRoles')
  const canManageInvites = hasCommunityPermission('manageInvites')
  const canManageBans = hasCommunityPermission('banMembers')
  const canKickMembers = hasCommunityPermission('kickMembers')
  const canTimeoutMembers = hasCommunityPermission('timeoutMembers')
  const canWarnMembers = hasCommunityPermission('warnMembers')
  const availableModerationActions = getAvailableCommunityModerationActions({ canWarn: canWarnMembers, canTimeout: canTimeoutMembers, canKick: canKickMembers, canBan: canManageBans })
  const selectedModerationAction = resolveCommunityModerationAction(moderationAction, availableModerationActions)
  const canCreateModerationActions = availableModerationActions.length > 0
  const canViewAuditLog = hasCommunityPermission('viewAuditLog')
  const canManageReports = hasCommunityPermission('manageReports')
  const canViewModerationCases = canViewAuditLog || canCreateModerationActions
  const canViewModerationSummary = canViewModerationCases || canManageReports
  const canManageEvents = hasCommunityPermission('manageEvents')
  const canShowModerationPanel = shouldShowCommunityModerationPanel(canViewAuditLog, canCreateModerationActions)
  const canPostAnnouncement = hasCommunityPermission('manageMessages')
  const canOpenManagement = Boolean(canManageLegacyForum || canManageChannels || canManageRoles || canManageInvites || canManageBans || canCreateModerationActions || canViewAuditLog || canManageReports || isCommunityOwner || ownModerationCases.length > 0 || ownAppeals.length > 0)
  const canViewSelectedChannel = selectedChannel?.viewerCanView ?? true
  useEffect(() => {
    if (!forumMenuOpen) return
    const closeOnOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !forumMenuRef.current?.contains(event.target)) setForumMenuOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setForumMenuOpen(false)
    }
    document.addEventListener('pointerdown', closeOnOutside)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutside)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [forumMenuOpen])
  const openCommunityManagement = (section = 'forum') => {
    setForumMenuOpen(false)
    setManagementSection(section)
    setManagementOpen(true)
  }
  const leaveForum = async () => {
    setForumMenuOpen(false)
    try {
      await forumApi.leaveForum(communityId)
      addNotification(t('workspaceUi.forumLeft'), 'success')
      onClose()
    } catch (reason) {
      addNotification(reason instanceof Error ? reason.message : t('workspaceUi.operationFailed'), 'error')
    }
  }
  const voiceParticipants = state?.voiceStates.filter((item) => item.channelId === selectedChannelId) ?? []
  const viewerInSelectedVoice = voiceParticipants.some((participant) => participant.userId === currentUserId)
  const viewerVoiceState = state?.voiceStates.find((participant) => participant.userId === currentUserId) ?? null
  const viewerVoiceChannel = viewerVoiceState ? state?.channels.find((channel) => channel.id === viewerVoiceState.channelId) ?? null : null
  const viewingConnectedVoice = Boolean(viewerInSelectedVoice && selectedChannel?.type === 'voice')
  const voiceCallLayout = viewingConnectedVoice && !membersOpen
  const membersPanelClassName = voiceCallLayout
    ? 'hidden'
    : mobileView === 'members'
    ? 'titlebar-overlay fixed inset-x-0 bottom-0 top-9 z-[61] overflow-y-auto border-border bg-background-tertiary xl:static xl:inset-auto xl:z-auto xl:block xl:border-l xl:bg-background-tertiary/35'
    : membersOpen
      ? 'hidden xl:block'
      : 'hidden'
  const loadModerationCases = async (offset: number, filters: CommunityModerationCaseFilters = activeModerationFilters) => {
    setModerationLoading(true)
    try {
      const result = await communityApi.listModerationCases(communityId, { ...filters, limit: 20, offset })
      setModerationCases(result.cases)
      setModerationHasMore(result.hasMore)
      setModerationOffset(offset)
    } catch (reason) {
      addNotification(reason instanceof Error ? reason.message : t('workspaceUi.operationFailed'), 'error')
    } finally { setModerationLoading(false) }
  }
  const loadAuditEvents = async (offset: number, filters: CommunityAuditLogFilters = activeAuditFilters) => {
    setAuditLoading(true)
    setAuditError(null)
    try {
      const result = await communityApi.listAuditLogs(communityId, { ...filters, limit: 20, offset })
      setAuditEvents(result.events)
      setAuditHasMore(result.hasMore)
      setAuditOffset(offset)
      setAuditLoaded(true)
    } catch (reason) {
      setAuditError(reason instanceof Error ? reason.message : t('workspaceUi.auditForumLoadError'))
    } finally { setAuditLoading(false) }
  }
  const loadAppealQueue = async () => {
    if (appealQueueLoading) return
    setAppealQueueLoading(true)
    setAppealQueueError(null)
    try {
      const { appeals } = await communityApi.listModerationAppeals(communityId)
      setAppealQueue(appeals)
      setCanReviewAppeals(true)
      setAppealQueueLoaded(true)
    } catch (reason) {
      setAppealQueue([])
      setCanReviewAppeals(false)
      setAppealQueueLoaded(true)
      if (reason instanceof ApiError && reason.status === 403 && reason.code === 'APPEAL_REVIEW_FORBIDDEN') {
        setAppealQueueError(t('workspaceUi.appealReviewerDisabled'))
      } else {
        setAppealQueueError(reason instanceof Error ? reason.message : t('workspaceUi.appealLookupError'))
      }
    } finally { setAppealQueueLoading(false) }
  }
  const applyAuditFilters = () => {
    const filters = { ...auditFilters }
    if (filters.createdAfter) filters.createdAfter = new Date(`${filters.createdAfter}T00:00:00.000Z`).toISOString()
    if (filters.createdBefore) filters.createdBefore = new Date(`${filters.createdBefore}T23:59:59.999Z`).toISOString()
    setActiveAuditFilters(filters)
    void loadAuditEvents(0, filters)
  }
  const applyModerationFilters = () => {
    const filters = { ...moderationFilters }
    if (filters.createdAfter) filters.createdAfter = new Date(`${filters.createdAfter}T00:00:00.000Z`).toISOString()
    if (filters.createdBefore) filters.createdBefore = new Date(`${filters.createdBefore}T23:59:59.999Z`).toISOString()
    setActiveModerationFilters(filters)
    void loadModerationCases(0, filters)
  }
  const bannedMembersSection = <section className="space-y-2">
    <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase text-text-secondary"><Shield size={13} /> {t('workspaceModeration.bannedMembers')}</h3>
    {bans.length === 0 ? <p className="text-xs text-text-secondary">{t('workspaceModeration.noBannedMembers')}</p> : bans.map((ban) => <div key={ban.userId} className="flex items-center justify-between gap-2 rounded-md bg-background-secondary p-2"><div className="min-w-0"><p className="truncate text-xs text-text-primary">{ban.user.displayName}</p><p className="truncate text-[11px] text-text-secondary">{ban.reason || t('workspaceUi.noReasonProvided')}</p></div><button type="button" disabled={busy === `unban:${ban.userId}`} onClick={() => void unbanMember(ban.userId)} className="shrink-0 text-[11px] text-accent disabled:opacity-50">{t('workspaceModeration.unban')}</button></div>)}
  </section>
  const communityMessageReportsSection = <section className="space-y-3 rounded-xl border border-border bg-background-secondary p-3">
    <div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="font-semibold text-text-primary">{t('workspaceModeration.messageReports')}</h2><p className="text-xs text-text-secondary">{t('workspaceModeration.privateChannelNotice')}</p></div><Button size="sm" variant="secondary" loading={communityReportsLoading} onClick={() => void loadCommunityReports(communityReportsOffset)}>{t('workspaceModeration.refresh')}</Button></div>
    <div className="flex flex-wrap gap-2"><label className="text-xs text-text-secondary">{t('workspaceModeration.status')}<select aria-label={t('workspaceUi.filterReportStatus')} value={communityReportsStatus} onChange={(event) => setCommunityReportsStatus(event.target.value as CommunityMessageReportStatus | '')} className="ml-2 rounded-md border border-border bg-background-primary px-2 py-1.5 text-text-primary"><option value="">{t('workspaceModeration.all')}</option><option value="pending">{t('workspaceModeration.pending')}</option><option value="reviewing">{t('workspaceModeration.reviewing')}</option><option value="resolved">{t('workspaceModeration.resolved')}</option><option value="dismissed">{t('workspaceModeration.archived')}</option></select></label></div>
    {communityReportsError && <p role="alert" className="text-xs text-red-300">{communityReportsError}</p>}
    {communityReportsLoading && communityReports.length === 0 ? <p role="status" className="text-xs text-text-secondary">{t('workspaceModeration.loadingReports')}</p> : communityReports.length === 0 ? <p className="rounded-lg border border-border p-4 text-center text-xs text-text-secondary">{t('workspaceModeration.noReports')}</p> : communityReports.map((report) => <article key={report.id} className="space-y-2 rounded-lg border border-border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-medium text-text-primary">{report.reason === 'spam' ? t('workspaceUi.reportSpam') : report.reason === 'harassment' ? t('workspaceUi.reportHarassment') : report.reason === 'inappropriate_content' ? t('workspaceUi.reportInappropriate') : report.reason === 'scam_or_fraud' ? t('workspaceUi.reportFraud') : report.reason === 'violence_or_threat' ? t('workspaceUi.reportThreat') : report.reason === 'personal_information' ? t('workspaceUi.reportPersonalData') : t('workspaceUi.otherReason')} · {report.status === 'pending' ? t('workspaceModeration.pending') : report.status === 'reviewing' ? t('workspaceModeration.reviewing') : report.status === 'resolved' ? t('workspaceModeration.resolved') : t('workspaceModeration.archived')}</p><time className="text-[10px] text-text-secondary">{formatDateTime(new Date(report.createdAt))}</time></div>
      <p className="text-xs text-text-secondary">#{state?.channels.find((channel) => channel.id === report.message.channelId)?.name ?? t('workspaceUi.channelPlaceholder')} {t('workspaceUi.messagePrefix')} {report.message.author?.displayName ?? t('workspaceUi.removedAccount')}</p>
      <p className="whitespace-pre-wrap break-words rounded-md bg-background-primary p-2 text-xs text-text-primary">{report.message.content}</p>
      {report.details && <p className="whitespace-pre-wrap break-words text-xs text-text-secondary">{t('workspaceModeration.details')} {report.details}</p>}
      {report.resolutionNote && <p className="whitespace-pre-wrap break-words text-xs text-text-secondary">{t('workspaceModeration.decisionRecorded')} {report.resolutionNote}</p>}
      {report.status === 'pending' || report.status === 'reviewing' ? <><textarea aria-label={t('workspaceUi.reportReviewNote')} value={reportDecisionNotes[report.id] ?? ''} onChange={(event) => setReportDecisionNotes((current) => ({ ...current, [report.id]: event.target.value.slice(0, 1000) }))} maxLength={1000} rows={2} placeholder={t('workspaceUi.optionalDecisionNote')} className="w-full rounded-md border border-border bg-background-primary p-2 text-xs text-text-primary" /><div className="flex flex-wrap gap-2"><Button size="sm" variant="secondary" disabled={report.status === 'reviewing'} loading={busy === `message-report:${report.id}`} onClick={() => void reviewCommunityReport(report.id, 'reviewing')}>{t('workspaceModeration.takeReview')}</Button><Button size="sm" variant="secondary" loading={busy === `message-report:${report.id}`} onClick={() => void reviewCommunityReport(report.id, 'resolved')}>{t('workspaceModeration.complete')}</Button><Button size="sm" variant="ghost" loading={busy === `message-report:${report.id}`} onClick={() => void reviewCommunityReport(report.id, 'dismissed')}>{t('workspaceModeration.archive')}</Button></div></> : null}
    </article>)}
    <div className="flex items-center justify-between"><Button size="sm" variant="ghost" disabled={communityReportsOffset === 0 || communityReportsLoading} onClick={() => void loadCommunityReports(Math.max(0, communityReportsOffset - 20))}>{t('workspaceModeration.previous')}</Button><span className="text-[10px] text-text-secondary">{communityReports.length ? t('workspaceUi.reportsRange', { start: communityReportsOffset + 1, end: communityReportsOffset + communityReports.length }) : t('workspaceUi.noResults')}</span><Button size="sm" variant="ghost" disabled={!communityReportsHasMore || communityReportsLoading} onClick={() => void loadCommunityReports(communityReportsOffset + 20)}>{t('workspaceModeration.next')}</Button></div>
  </section>
  const moderationActionForm = selectedModerationAction && <div className="space-y-2 rounded-md bg-background-secondary p-2">
    <label className="block space-y-1 text-[10px] text-text-secondary">{t('workspaceModeration.action')}<select aria-label={t('workspaceModeration.moderationAction')} value={selectedModerationAction} onChange={(event) => setModerationAction(event.target.value as CommunityModerationAction)} className="w-full rounded-md border border-border bg-background-primary px-2 py-1.5 text-xs text-text-primary">{availableModerationActions.map((action) => <option key={action} value={action}>{({ warning: t('workspaceUi.caseWarning'), timeout: t('workspaceUi.silenceLabel'), kick: t('workspaceUi.caseKick'), ban: t('workspaceUi.caseBan') })[action]}</option>)}</select></label>
    <select aria-label={t('workspaceModeration.targetMember')} value={moderationTargetId} onChange={(event) => setModerationTargetId(event.target.value)} className="w-full rounded-md border border-border bg-background-primary px-2 py-1.5 text-xs text-text-primary"><option value="">{t('workspaceModeration.selectMember')}</option>{state?.members.filter((member) => member.userId !== currentUserId && member.userId !== state.community.ownerUserId).map((member) => <option key={member.userId} value={member.userId}>{member.user.displayName}</option>)}</select>
    <textarea aria-label={t('workspaceModeration.actionReason')} value={moderationReason} onChange={(event) => setModerationReason(event.target.value.slice(0, 1000))} maxLength={1000} rows={2} placeholder={t('workspaceModeration.reason')} className="w-full resize-y rounded-md border border-border bg-background-primary px-2 py-1.5 text-xs text-text-primary" />
    {selectedModerationAction === 'warning' && <>
      <textarea aria-label={t('workspaceModeration.warningDetails')} value={warningDescription} onChange={(event) => setWarningDescription(event.target.value.slice(0, 2000))} maxLength={2000} rows={2} placeholder={t('workspaceModeration.optionalDetails')} className="w-full resize-y rounded-md border border-border bg-background-primary px-2 py-1.5 text-xs text-text-primary" />
      <Input aria-label={t('workspaceModeration.relatedContentReference')} value={warningContentReference} onChange={(event) => setWarningContentReference(event.target.value.slice(0, 500))} maxLength={500} placeholder={t('workspaceModeration.optionalReference')} />
      <textarea aria-label={t('workspaceModeration.internalNote')} value={warningInternalNote} onChange={(event) => setWarningInternalNote(event.target.value.slice(0, 2000))} maxLength={2000} rows={2} placeholder={t('workspaceModeration.internalNoteHint')} className="w-full resize-y rounded-md border border-border bg-background-primary px-2 py-1.5 text-xs text-text-primary" />
    </>}
    {(selectedModerationAction === 'timeout' || selectedModerationAction === 'ban') && <label className="block space-y-1 text-[10px] text-text-secondary">{t('workspaceModeration.duration')}<input aria-label={t('workspaceModeration.durationLabel')} type="datetime-local" value={moderationExpiresAt} onChange={(event) => setModerationExpiresAt(event.target.value)} className="w-full rounded-md border border-border bg-background-primary px-2 py-1.5 text-xs text-text-primary" /><span className="block">{t('workspaceModeration.noDuration')}</span></label>}
    <Button size="sm" variant="secondary" disabled={!moderationTargetId || !moderationReason.trim()} loading={busy === 'moderation:create'} onClick={() => void applyModerationAction()}>{({ warning: t('workspaceUi.warningAction'), timeout: t('workspaceUi.timeoutAction'), kick: t('workspaceUi.kickAction'), ban: t('workspaceUi.banAction') })[selectedModerationAction]}</Button>
  </div>
  const moderationCasesSection = canViewModerationCases && <section className="space-y-2">
    <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase text-text-secondary"><Shield size={13} /> {t('workspaceModeration.history')}</h3>
    <div className="grid grid-cols-2 gap-2 rounded-md bg-background-secondary p-2">
      <label className="space-y-1 text-[10px] text-text-secondary">{t('workspaceModeration.action')}<select aria-label={t('workspaceModeration.filterAction')} value={moderationFilters.action ?? ''} onChange={(event) => setModerationFilters((current) => ({ ...current, action: (event.target.value || undefined) as CommunityModerationCaseFilters['action'] }))} className="w-full rounded-md border border-border bg-background-primary px-2 py-1.5 text-xs text-text-primary"><option value="">{t('workspaceModeration.all')}</option><option value="warning">{t('workspaceModeration.warning')}</option><option value="timeout">{t('workspaceModeration.timeout')}</option><option value="kick">{t('workspaceModeration.kick')}</option><option value="ban">{t('workspaceModeration.ban')}</option></select></label>
      <label className="space-y-1 text-[10px] text-text-secondary">{t('workspaceModeration.status')}<select aria-label={t('workspaceUi.filterByState')} value={moderationFilters.status ?? ''} onChange={(event) => setModerationFilters((current) => ({ ...current, status: (event.target.value || undefined) as CommunityModerationCaseFilters['status'] }))} className="w-full rounded-md border border-border bg-background-primary px-2 py-1.5 text-xs text-text-primary"><option value="">{t('workspaceModeration.all')}</option><option value="active">{t('workspaceUi.active')}</option><option value="expired">{t('workspaceUi.expired')}</option><option value="corrected">{t('workspaceUi.corrected')}</option></select></label>
      <label className="space-y-1 text-[10px] text-text-secondary">{t('forumManage.role.member')}<select aria-label={t('workspaceUi.filterByMember')} value={moderationFilters.targetUserId ?? ''} onChange={(event) => setModerationFilters((current) => ({ ...current, targetUserId: event.target.value || undefined }))} className="w-full rounded-md border border-border bg-background-primary px-2 py-1.5 text-xs text-text-primary"><option value="">{t('workspaceModeration.all')}</option>{[...(state?.members ?? []).map((member) => ({ id: member.userId, name: member.user.displayName })), ...bans.map((ban) => ({ id: ban.userId, name: ban.user.displayName }))].filter((member, index, all) => all.findIndex((item) => item.id === member.id) === index).map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</select></label>
      <label className="space-y-1 text-[10px] text-text-secondary">{t('forumManage.role.moderator')}<select aria-label={t('workspaceUi.filterByModerator')} value={moderationFilters.actorUserId ?? ''} onChange={(event) => setModerationFilters((current) => ({ ...current, actorUserId: event.target.value || undefined }))} className="w-full rounded-md border border-border bg-background-primary px-2 py-1.5 text-xs text-text-primary"><option value="">{t('workspaceModeration.all')}</option>{state?.members.map((member) => <option key={member.userId} value={member.userId}>{member.user.displayName}</option>)}</select></label>
      <label className="space-y-1 text-[10px] text-text-secondary">{t('workspaceUi.from')}<input aria-label={t('workspaceUi.filterDateFrom')} type="date" value={moderationFilters.createdAfter?.slice(0, 10) ?? ''} onChange={(event) => setModerationFilters((current) => ({ ...current, createdAfter: event.target.value || undefined }))} className="w-full rounded-md border border-border bg-background-primary px-2 py-1.5 text-xs text-text-primary" /></label>
      <label className="space-y-1 text-[10px] text-text-secondary">{t('workspaceUi.until')}<input aria-label={t('workspaceUi.filterDateUntil')} type="date" value={moderationFilters.createdBefore?.slice(0, 10) ?? ''} onChange={(event) => setModerationFilters((current) => ({ ...current, createdBefore: event.target.value || undefined }))} className="w-full rounded-md border border-border bg-background-primary px-2 py-1.5 text-xs text-text-primary" /></label>
      <label className="col-span-2 space-y-1 text-[10px] text-text-secondary">{t('workspaceUi.resources')}<select aria-label={t('workspaceUi.filterByAppeal')} value={moderationFilters.appealReview ?? ''} onChange={(event) => setModerationFilters((current) => ({ ...current, appealReview: (event.target.value || undefined) as CommunityModerationCaseFilters['appealReview'] }))} className="w-full rounded-md border border-border bg-background-primary px-2 py-1.5 text-xs text-text-primary"><option value="">{t('workspaceUi.allCases')}</option><option value="pending">{t('workspaceUi.pendingAppeal')}</option><option value="without_eligible_reviewer">{t('workspaceUi.waitingReviewer')}</option></select></label>
      <Button size="sm" variant="secondary" disabled={moderationLoading} loading={moderationLoading} onClick={applyModerationFilters}>{t('workspaceUi.applyFilters')}</Button>
    </div>
    {moderationCases.length === 0 ? <p className="text-xs text-text-secondary">{t('workspaceUi.noCases')}</p> : moderationCases.map((item) => <article key={item.id} className="rounded-md bg-background-secondary p-2">
      <p className="text-xs font-medium text-text-primary">{item.target.displayName} · {item.action === 'warning' ? t('workspaceUi.caseWarning') : item.action === 'timeout' ? t('workspaceUi.caseTimeout') : item.action === 'kick' ? t('workspaceUi.caseKick') : t('workspaceUi.caseBan')}</p>
      <p className="mt-1 whitespace-pre-wrap break-words text-[11px] text-text-secondary">{item.reason}</p>
      {item.description && <p className="mt-1 whitespace-pre-wrap break-words text-[11px] text-text-secondary">{item.description}</p>}
      {item.contentReference && <p className="mt-1 break-all text-[10px] text-text-secondary">{t('workspaceUi.relatedContent')} {item.contentReference}</p>}
      {item.internalNote && <p className="mt-1 whitespace-pre-wrap break-words rounded border border-border p-2 text-[10px] text-text-secondary">{t('workspaceModeration.internalNote')} {item.internalNote}</p>}
      <p className="mt-1 text-[10px] text-text-secondary">{formatDateTime(new Date(item.createdAt))}</p>
      <details className="mt-1 text-[10px]">
        <summary className="cursor-pointer text-accent">{t('workspaceUi.caseDetails')}</summary>
        <div className="mt-2 space-y-2">
          <section className="rounded bg-background-primary p-2">
            <h4 className="font-semibold text-text-primary">{t('workspaceUi.actionDetails')}</h4>
            <p className="mt-1">ID: <span className="break-all">{item.id}</span></p>
            <p>{t('workspaceUi.responsible')} {item.actor?.displayName ?? t('workspaceUi.accountRemoved')}</p>
            {item.expiresAt ? <p>{t('workspaceUi.expires')} {formatDateTime(new Date(item.expiresAt))}</p> : (item.action === 'timeout' || item.action === 'ban') && <p>{t('workspaceUi.noExpiry')}</p>}
            {item.evidence.length > 0 && <div className="mt-1"><p className="font-medium">{t('workspaceUi.evidence')}</p>{item.evidence.map((entry, index) => <p key={index} className="mt-1 break-all">{entry}</p>)}</div>}
            {item.correctionNote && <p className="mt-1">{t('workspaceUi.correctionRecorded')} {item.correctionNote}</p>}
          </section>
          <section className="rounded bg-background-primary p-2">
            <h4 className="font-semibold text-text-primary">{t('workspaceUi.appealsWithCount', { count: item.appeals.length })}</h4>
            {item.appeals.length === 0 ? <p className="mt-1">{t('workspaceUi.noAppeals')}</p> : item.appeals.map((appeal) => <div key={appeal.id} className="mt-2 border-t border-border pt-2">
              <p className="break-all text-text-secondary">{t('workspaceUi.appealId')} {appeal.id}</p>
              <p className="font-medium">{appeal.appellant.displayName} · {appeal.status === 'pending' ? t('workspaceModeration.pending') : appeal.status === 'reviewing' ? t('workspaceModeration.reviewing') : appeal.status === 'upheld' ? t('workspaceUi.maintained') : appeal.status === 'reversed' ? t('workspaceUi.reversed') : appeal.status === 'closed_by_correction' ? t('workspaceUi.closedByCorrection') : t('workspaceUi.cancelled')}</p>
              <p className="mt-1 whitespace-pre-wrap break-words">{appeal.statement}</p>
              {appeal.additionalInfo && <p className="mt-1 whitespace-pre-wrap break-words">{appeal.additionalInfo}</p>}
              {appeal.evidence.map((entry, index) => <p key={index} className="mt-1 break-all">{t('workspaceUi.evidenceLabel')} {entry}</p>)}
              <p className="mt-1">{t('workspaceUi.reviewer')} {appeal.reviewer?.displayName ?? appeal.assignedReviewer?.displayName ?? (appeal.status === 'pending' ? t('workspaceUi.waitingIndependentReviewer') : t('workspaceUi.unassigned'))}</p>
              <p className="mt-1">{t('workspaceUi.eligibleReviewers')} {appeal.eligibleReviewers.length ? appeal.eligibleReviewers.map((reviewer) => reviewer.displayName).join(', ') : t('workspaceUi.eligibleReviewerNone')}</p>
              {appeal.decisionNote && <p className="mt-1 whitespace-pre-wrap break-words">{t('workspaceUi.reasonLabel')} {appeal.decisionNote}</p>}
              <p className="mt-1">{t('workspaceUi.submittedAt')} {formatDateTime(new Date(appeal.createdAt))}{appeal.decidedAt ? t('workspaceUi.appealDecisionDate', { value: formatDateTime(new Date(appeal.decidedAt)) }) : ''}</p>
            </div>)}
          </section>
          <section className="rounded bg-background-primary p-2">
            <h4 className="font-semibold text-text-primary">{t('workspaceUi.auditTimeline')}</h4>
            {item.timeline.length === 0 ? <p className="mt-1">{t('workspaceUi.noAuditEvents')}</p> : <ol className="mt-1 space-y-2">{item.timeline.map((event) => <li key={event.id} className="border-l border-accent pl-2">
              <p className="font-medium text-text-primary">{event.type === 'case_created' ? t('workspaceUi.caseCreated') : event.type === 'appeal_submitted' ? t('workspaceUi.appealSubmitted') : event.type === 'appeal_claimed' ? t('workspaceUi.appealClaimed') : event.type === 'appeal_released' ? t('workspaceUi.appealReleased') : event.type === 'appeal_upheld' ? t('workspaceUi.appealDenied') : event.type === 'appeal_reversed' ? t('workspaceUi.measureReversed') : event.type === 'appeal_cancelled' ? t('workspaceUi.appealCancelled') : t('workspaceUi.adminCorrection')}</p>
              <p className="break-all">{t('workspaceUi.eventIdLabel')} {event.id}</p>
              <p>{event.actor?.displayName ?? t('workspaceUi.accountRemoved')} · {formatDateTime(new Date(event.occurredAt))}</p>
              {event.status && <p>{t('workspaceUi.statusLabel')} {event.status === 'active' ? t('workspaceUi.active') : event.status === 'pending' ? t('workspaceModeration.pending') : event.status === 'reviewing' ? t('workspaceModeration.reviewing') : event.status === 'upheld' ? t('workspaceUi.maintained') : event.status === 'reversed' ? t('workspaceUi.reversed') : event.status === 'cancelled' ? t('workspaceUi.cancelled') : event.status === 'corrected' ? t('workspaceUi.corrected') : event.status === 'closed_by_correction' ? t('workspaceUi.closedByCorrection') : event.status === 'expired' ? t('workspaceUi.expired') : event.status}</p>}
              {event.action && <p>{t('workspaceUi.actionLabel')} {event.action === 'warning' ? t('workspaceUi.caseWarning') : event.action === 'timeout' ? t('workspaceUi.silenceLabel') : event.action === 'kick' ? t('workspaceUi.caseKick') : t('workspaceUi.caseBan')}</p>}
              {event.note && <p className="whitespace-pre-wrap break-words">{t('workspaceUi.reasonLabel')} {event.note}</p>}
              {event.eligibleReviewerCount !== null && <p>{t('workspaceUi.eligibleAtSubmission')} {event.eligibleReviewerCount}</p>}
              {event.independentReview !== null && <p>{event.independentReview ? t('workspaceUi.reviewIndependent') : t('workspaceUi.noIndependentReview')}</p>}
              {event.previousEffect && event.nextEffect && <p>{t('workspaceUi.effectLabel')} {moderationEffectLabel(event.previousEffect, t)} → {moderationEffectLabel(event.nextEffect, t)}</p>}
              {event.closedAppealCount !== null && <p>{t('workspaceUi.appealsClosed')} {event.closedAppealCount}</p>}
            </li>)}</ol>}
          </section>
        </div>
      </details>
      {state?.community.ownerUserId === currentUserId && item.actorUserId === currentUserId && item.status !== 'corrected' && <details className="mt-2"><summary className="cursor-pointer text-[11px] text-accent">{t('workspaceUi.correctOwnAction')}</summary><p className="mt-1 text-[10px] text-text-secondary">{t('workspaceUi.correctionCaveat')}</p><textarea aria-label={t('workspaceUi.correctionReason')} value={correctionNotes[item.id] ?? ''} onChange={(event) => setCorrectionNotes((current) => ({ ...current, [item.id]: event.target.value.slice(0, 2000) }))} maxLength={2000} rows={2} placeholder={t('workspaceUi.correctionReasonPlaceholder')} className="mt-2 w-full resize-y rounded-md border border-border bg-background-primary px-2 py-1.5 text-xs text-text-primary" /><Button size="sm" variant="secondary" disabled={!correctionNotes[item.id]?.trim()} loading={busy === 'correction:' + item.id} onClick={() => void correctOwnModerationCase(item.id)}>{t('workspaceUi.correctAction')}</Button></details>}
    </article>)}
    <div className="flex items-center justify-between gap-2 text-[10px] text-text-secondary"><Button size="sm" variant="secondary" disabled={moderationOffset === 0 || moderationLoading} onClick={() => void loadModerationCases(Math.max(0, moderationOffset - 20))}>{t('workspaceModeration.previous')}</Button><span>{moderationCases.length ? t('workspaceUi.casesRange', { start: moderationOffset + 1, end: moderationOffset + moderationCases.length }) : t('workspaceUi.noResults')}{moderationLoading ? t('workspaceUi.loadingSuffix') : ''}</span><Button size="sm" variant="secondary" disabled={!moderationHasMore || moderationLoading} onClick={() => void loadModerationCases(moderationOffset + 20)}>{t('workspaceModeration.next')}</Button></div>
  </section>
  const auditLogSection = <section className="space-y-2">
    <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase text-text-secondary"><Shield size={13} /> {t('workspaceUi.auditTitle')}</h3>
    <div className="grid grid-cols-2 gap-2 rounded-md bg-background-secondary p-2">
      <label className="col-span-2 space-y-1 text-[10px] text-text-secondary">{t('workspaceUi.exactAction')}<input aria-label={t('workspaceUi.filterAuditAction')} value={auditFilters.action ?? ''} onChange={(event) => setAuditFilters((current) => ({ ...current, action: event.target.value || undefined }))} placeholder="community.role.update" maxLength={120} className="w-full rounded-md border border-border bg-background-primary px-2 py-1.5 text-xs text-text-primary" /></label>
      <label className="space-y-1 text-[10px] text-text-secondary">{t('workspaceUi.actor')}<select aria-label={t('workspaceUi.filterAuditActor')} value={auditFilters.actorUserId ?? ''} onChange={(event) => setAuditFilters((current) => ({ ...current, actorUserId: event.target.value || undefined }))} className="w-full rounded-md border border-border bg-background-primary px-2 py-1.5 text-xs text-text-primary"><option value="">{t('workspaceModeration.all')}</option>{state?.members.map((member) => <option key={member.userId} value={member.userId}>{member.user.displayName}</option>)}</select></label>
      <label className="space-y-1 text-[10px] text-text-secondary">{t('workspaceUi.affectedMember')}<select aria-label={t('workspaceUi.filterAuditTarget')} value={auditFilters.targetUserId ?? ''} onChange={(event) => setAuditFilters((current) => ({ ...current, targetUserId: event.target.value || undefined }))} className="w-full rounded-md border border-border bg-background-primary px-2 py-1.5 text-xs text-text-primary"><option value="">{t('workspaceModeration.all')}</option>{state?.members.map((member) => <option key={member.userId} value={member.userId}>{member.user.displayName}</option>)}</select></label>
      <label className="space-y-1 text-[10px] text-text-secondary">{t('workspaceUi.from')}<input aria-label={t('workspaceUi.auditDateFrom')} type="date" value={auditFilters.createdAfter?.slice(0, 10) ?? ''} onChange={(event) => setAuditFilters((current) => ({ ...current, createdAfter: event.target.value || undefined }))} className="w-full rounded-md border border-border bg-background-primary px-2 py-1.5 text-xs text-text-primary" /></label>
      <label className="space-y-1 text-[10px] text-text-secondary">{t('workspaceUi.until')}<input aria-label={t('workspaceUi.auditDateUntil')} type="date" value={auditFilters.createdBefore?.slice(0, 10) ?? ''} onChange={(event) => setAuditFilters((current) => ({ ...current, createdBefore: event.target.value || undefined }))} className="w-full rounded-md border border-border bg-background-primary px-2 py-1.5 text-xs text-text-primary" /></label>
      <Button size="sm" variant="secondary" loading={auditLoading} onClick={applyAuditFilters}>{t('workspaceUi.applyFilters')}</Button>
    </div>
    {auditError && <p role="alert" className="text-xs text-red-300">{auditError}</p>}
    {!auditEvents.length && !auditLoading && !auditError && <p className="text-xs text-text-secondary">{auditLoaded ? t('workspaceUi.noEventsForFilters') : t('workspaceUi.loadEventsForAudit')}</p>}
    {auditEvents.map((event) => {
      const changes = getAuditChanges(event.details)
      const metadata = Object.fromEntries(Object.entries(event.details).filter(([key]) => key !== 'changes'))
      return <article key={event.id} className="space-y-2 rounded-md bg-background-secondary p-2 text-[11px] text-text-secondary"><p className="break-all font-medium text-text-primary">{event.action}</p><p>ID: <span className="break-all">{event.id}</span></p><p>{event.actor?.displayName ?? t('workspaceUi.accountRemoved')}{event.target ? ` → ${event.target.displayName}` : ''} · {formatDateTime(new Date(event.createdAt))}</p>{changes.length > 0 && <div className="rounded bg-background-primary p-2"><p className="mb-1 font-semibold text-text-primary">{t('workspaceUi.changes')}</p><ul className="space-y-1">{changes.map((change, index) => <li key={`${change.field}-${index}`} className="break-words"><strong className="text-text-primary">{AUDIT_FIELD_KEYS[change.field] ? t(AUDIT_FIELD_KEYS[change.field]) : change.field}:</strong> {formatAuditValue(change.before, t)} <span aria-label={t('workspaceUi.changedTo')}>→</span> {formatAuditValue(change.after, t)}</li>)}</ul></div>}{Object.keys(metadata).length > 0 && <details className="rounded bg-background-primary p-2"><summary className="cursor-pointer text-text-primary">{t('workspaceUi.otherDetails')}</summary><pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words text-[10px]">{JSON.stringify(metadata, null, 2)}</pre></details>}</article>
    })}
    <div className="flex items-center justify-between gap-2 text-[10px] text-text-secondary"><Button size="sm" variant="secondary" disabled={auditOffset === 0 || auditLoading} onClick={() => void loadAuditEvents(Math.max(0, auditOffset - 20))}>{t('workspaceModeration.previous')}</Button><span>{auditEvents.length ? t('workspaceUi.eventsRange', { start: auditOffset + 1, end: auditOffset + auditEvents.length }) : auditLoading ? t('workspaceUi.loading') : t('workspaceUi.noEventsFound')}</span><Button size="sm" variant="secondary" disabled={!auditHasMore || auditLoading} onClick={() => void loadAuditEvents(auditOffset + 20)}>{t('workspaceModeration.next')}</Button></div>
  </section>

  const refresh = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await communityApi.getState(communityId)
      setState(response.state)
      const availableChannelIds = new Set(response.state.channels.map((channel) => channel.id))
      let lastChannelId: string | null = null
      try {
        const storedChannelId = localStorage.getItem(`anceryx:forum-channel:${communityId}`)
        if (storedChannelId && availableChannelIds.has(storedChannelId)) lastChannelId = storedChannelId
      } catch { /* Storage can be unavailable in restricted desktop profiles. */ }
      setSelectedChannelId((current) => current && availableChannelIds.has(current) ? current : lastChannelId ?? response.state.channels[0]?.id ?? null)
      return response.state
    } catch (err) {
      setError(err instanceof Error ? err.message : t('workspaceUi.operationFailed'))
      return null
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    realtimeClient.connect(token)
  }, [token])

  useEffect(() => {
    void refresh()
  }, [communityId])

  useEffect(() => {
    let active = true
    void Promise.all([communityApi.listOwnModerationCases(communityId), communityApi.listOwnModerationAppeals(communityId)]).then(([caseResult, appealResult]) => {
      if (!active) return
      setOwnModerationCases(caseResult.cases)
      setOwnAppeals(appealResult.appeals)
    }).catch(() => { if (active) { setOwnModerationCases([]); setOwnAppeals([]) } })
  return () => { active = false }
  }, [communityId])

  useEffect(() => {
    if (!state) return
    let active = true
    if (state.community.ownerUserId === currentUserId) void communityApi.getAppealReviewerRoles(communityId).then(({ roleIds }) => { if (active) setReviewerRoleIds(roleIds) }).catch(() => undefined)
    return () => { active = false }
  }, [communityId, currentUserId, state?.community.ownerUserId])

  useEffect(() => {
    if (!canManageInvites) return
    let active = true
    void communityApi.listInvites(communityId).then(({ invites: rows }) => { if (active) setInvites(rows) }).catch((reason) => addNotification(reason instanceof Error ? reason.message : t('workspaceUi.operationFailed'), 'error'))
    return () => { active = false }
  }, [addNotification, communityId, canManageInvites])

  useEffect(() => {
    if (!canManageBans) return
    let active = true
    void communityApi.listBans(communityId).then(({ bans: rows }) => { if (active) setBans(rows) }).catch((reason) => addNotification(reason instanceof Error ? reason.message : t('workspaceUi.operationFailed'), 'error'))
    return () => { active = false }
  }, [addNotification, canManageBans, communityId])

  useEffect(() => {
    if (!canLoadCommunityModerationHistory(canViewModerationCases)) return
    let active = true
    setModerationFilters({})
    setActiveModerationFilters({})
    void communityApi.listModerationCases(communityId, { limit: 20, offset: 0 }).then(({ cases, hasMore }) => { if (active) { setModerationCases(cases); setModerationHasMore(hasMore); setModerationOffset(0) } }).catch((reason) => addNotification(reason instanceof Error ? reason.message : t('workspaceUi.operationFailed'), 'error'))
    return () => { active = false }
  }, [addNotification, canViewModerationCases, communityId])

  useEffect(() => {
    if (!managementOpen || managementSection !== 'moderation' || !canViewModerationSummary) return
    let active = true
    setModerationSummaryLoading(true)
    setModerationSummaryError(null)
    void communityApi.getModerationSummary(communityId)
      .then(({ summary }) => { if (active) setModerationSummary(summary) })
      .catch((reason) => { if (active) setModerationSummaryError(reason instanceof Error ? reason.message : t('workspaceUi.moderationSummaryError')) })
      .finally(() => { if (active) setModerationSummaryLoading(false) })
    return () => { active = false }
  }, [canViewModerationSummary, communityId, managementOpen, managementSection])

  const loadCommunityReports = async (offset = 0, status: CommunityMessageReportStatus | '' = communityReportsStatus) => {
    setCommunityReportsLoading(true)
    setCommunityReportsError(null)
    try {
      const result = await communityApi.listMessageReports(communityId, { limit: 20, offset, status: status || undefined })
      setCommunityReports(result.reports)
      setCommunityReportsHasMore(result.hasMore)
      setCommunityReportsOffset(offset)
    } catch (reason) {
      setCommunityReportsError(reason instanceof Error ? reason.message : t('workspaceUi.reportsLoadError'))
    } finally {
      setCommunityReportsLoading(false)
    }
  }

  useEffect(() => {
    if (!managementOpen || managementSection !== 'reports' || !canManageReports) return
    void loadCommunityReports(0)
  }, [canManageReports, communityId, managementOpen, managementSection, communityReportsStatus])

  const submitMessageReport = async () => {
    if (!messageReportTarget || !messageReportChannelId || busy) return
    if (messageReportReason === 'other' && !messageReportDetails.trim()) return
    setBusy('message-report:create')
    try {
      await communityApi.reportMessage(communityId, messageReportChannelId, messageReportTarget.id, { reason: messageReportReason, details: messageReportDetails.trim() || undefined })
      setMessageReportTarget(null)
      setMessageReportDetails('')
      addNotification(t('workspaceUi.reportSent'), 'success')
    } catch (reason) {
      addNotification(reason instanceof Error ? reason.message : t('workspaceUi.operationFailed'), 'error')
    } finally {
      setBusy(null)
    }
  }

  const reviewCommunityReport = async (reportId: string, status: Extract<CommunityMessageReportStatus, 'reviewing' | 'resolved' | 'dismissed'>) => {
    const note = reportDecisionNotes[reportId]?.trim()
    if (status !== 'reviewing' && !window.confirm(status === 'resolved' ? t('workspaceUi.confirmReportResolved') : t('workspaceUi.confirmReportArchived'))) return
    setBusy(`message-report:${reportId}`)
    try {
      await communityApi.reviewMessageReport(communityId, reportId, { status, resolutionNote: note || undefined })
      await loadCommunityReports(communityReportsOffset)
      addNotification(status === 'reviewing' ? t('workspaceUi.reportClaimed') : status === 'resolved' ? t('workspaceUi.reportClosed') : t('workspaceUi.reportArchived'), 'success')
    } catch (reason) {
      addNotification(reason instanceof Error ? reason.message : t('workspaceUi.operationFailed'), 'error')
    } finally {
      setBusy(null)
    }
  }

  const applyModerationAction = async () => {
    const reason = moderationReason.trim()
    const action = selectedModerationAction
    if (!action || !availableModerationActions.includes(action) || !moderationTargetId || !reason || busy) return
    if (action !== 'warning' && !window.confirm(`Confirmar ${action === 'timeout' ? 'o silenciamento' : action === 'kick' ? 'a expulsão' : 'o banimento'} deste membro?`)) return
    setBusy('moderation:create')
    try {
      const expiresAt = moderationExpiresAt ? new Date(moderationExpiresAt).toISOString() : null
      if (action === 'warning') await communityApi.warnMember(communityId, moderationTargetId, { reason, description: warningDescription.trim() || undefined, contentReference: warningContentReference.trim() || undefined, internalNote: warningInternalNote.trim() || undefined })
      else if (action === 'timeout') await communityApi.timeoutMember(communityId, moderationTargetId, { reason, expiresAt })
      else if (action === 'kick') await communityApi.kickMember(communityId, moderationTargetId, reason)
      else await communityApi.banMember(communityId, moderationTargetId, { reason, expiresAt })
      setModerationReason('')
      setWarningDescription('')
      setWarningContentReference('')
      setWarningInternalNote('')
      setModerationTargetId('')
      setModerationExpiresAt('')
      await refresh()
      if (canViewAuditLog) await loadModerationCases(moderationOffset)
      if (action === 'ban') {
        const { bans: rows } = await communityApi.listBans(communityId)
        setBans(rows)
      }
      addNotification(action === 'warning' ? t('workspaceUi.warningRecorded') : action === 'timeout' ? t('workspaceUi.timeoutApplied') : action === 'kick' ? t('workspaceUi.memberKicked') : t('workspaceUi.memberBanned'), 'success')
    } catch (reason) {
      addNotification(reason instanceof Error ? reason.message : t('workspaceUi.operationFailed'), 'error')
    } finally { setBusy(null) }
  }

  const correctOwnModerationCase = async (caseId: string) => {
    const note = correctionNotes[caseId]?.trim()
    if (!note || busy || !window.confirm(t('workspaceUi.confirmAdministrativeCorrection'))) return
    setBusy(`correction:${caseId}`)
    try {
      await communityApi.correctOwnModerationCase(communityId, caseId, note)
      setCorrectionNotes((current) => ({ ...current, [caseId]: '' }))
      await loadModerationCases(moderationOffset)
      addNotification(t('workspaceUi.correctionSaved'), 'success')
    } catch (reason) {
      addNotification(reason instanceof Error ? reason.message : t('workspaceUi.operationFailed'), 'error')
    } finally { setBusy(null) }
  }

  const updateMemberListMode = async (mode: 'simple' | 'grouped_roles') => {
    if (state?.community.ownerUserId !== currentUserId) return
    setBusy('member-list-mode')
    try {
      await communityApi.updateMemberListMode(communityId, mode)
      await refresh()
      addNotification(t('workspaceUi.memberListUpdated'), 'success')
    } catch (reason) {
      addNotification(reason instanceof Error ? reason.message : t('workspaceUi.operationFailed'), 'error')
    } finally { setBusy(null) }
  }

  const toggleAppealReviewerRole = async (roleId: string, selected: boolean) => {
    if (state?.community.ownerUserId !== currentUserId) return
    const next = selected ? [...new Set([...reviewerRoleIds, roleId])] : reviewerRoleIds.filter((id) => id !== roleId)
    setBusy('appeal-reviewer-roles')
    try {
      const result = await communityApi.setAppealReviewerRoles(communityId, next)
      setReviewerRoleIds(result.roleIds)
      addNotification(t('workspaceUi.moderatorRolesUpdated'), 'success')
    } catch (reason) {
      addNotification(reason instanceof Error ? reason.message : t('workspaceUi.operationFailed'), 'error')
    } finally { setBusy(null) }
  }

  const submitAppeal = async () => {
    if (!appealCaseId || !appealStatement.trim() || busy) return
    setBusy(`appeal:create:${appealCaseId}`)
    try {
      await communityApi.submitModerationAppeal(communityId, { moderationCaseId: appealCaseId, statement: appealStatement.trim(), additionalInfo: appealAdditionalInfo.trim() || undefined, evidence: appealEvidenceText.split(/\r?\n/).map((item) => item.trim()).filter(Boolean).slice(0, 10).map((item) => item.slice(0, 500)) })
      setAppealCaseId(null); setAppealStatement(''); setAppealAdditionalInfo(''); setAppealEvidenceText('')
      setOwnAppeals((await communityApi.listOwnModerationAppeals(communityId)).appeals)
      if (canReviewAppeals) setAppealQueue((await communityApi.listModerationAppeals(communityId)).appeals)
      addNotification(t('workspaceUi.appealSubmittedToast'), 'success')
    } catch (reason) {
      addNotification(reason instanceof Error ? reason.message : t('workspaceUi.operationFailed'), 'error')
    } finally { setBusy(null) }
  }

  const reviewAppeal = async (appealId: string, status: 'upheld' | 'reversed') => {
    const decisionNote = reviewDecisionNotes[appealId]?.trim()
    if (!decisionNote || busy) return
    const label = status === 'reversed' ? 'deferir o recurso e reverter a decisão' : 'indeferir o recurso e manter a decisão'
    if (!window.confirm(`Confirmar: ${label}?`)) return
    setBusy(`appeal:review:${appealId}`)
    try {
      await communityApi.reviewModerationAppeal(communityId, appealId, { status, decisionNote })
      setAppealQueue((await communityApi.listModerationAppeals(communityId)).appeals)
      await loadModerationCases(moderationOffset)
      addNotification(t('workspaceUi.appealDecisionSaved'), 'success')
    } catch (reason) {
      addNotification(reason instanceof Error ? reason.message : t('workspaceUi.operationFailed'), 'error')
    } finally { setBusy(null) }
  }

  const claimAppeal = async (appealId: string) => {
    if (busy) return
    setBusy(`appeal:claim:${appealId}`)
    try {
      await communityApi.claimModerationAppeal(communityId, appealId)
      setAppealQueue((await communityApi.listModerationAppeals(communityId)).appeals)
      await loadModerationCases(moderationOffset)
      addNotification(t('workspaceUi.appealClaimedToast'), 'success')
    } catch (reason) {
      addNotification(reason instanceof Error ? reason.message : t('workspaceUi.operationFailed'), 'error')
    } finally { setBusy(null) }
  }

  const releaseAppeal = async (appealId: string) => {
    if (busy || !window.confirm(t('workspaceUi.confirmReleaseAppeal'))) return
    setBusy(`appeal:release:${appealId}`)
    try {
      await communityApi.releaseModerationAppeal(communityId, appealId)
      setAppealQueue((await communityApi.listModerationAppeals(communityId)).appeals)
      await loadModerationCases(moderationOffset)
      addNotification(t('workspaceUi.appealReleasedToast'), 'success')
    } catch (reason) {
      addNotification(reason instanceof Error ? reason.message : t('workspaceUi.operationFailed'), 'error')
    } finally { setBusy(null) }
  }

  const unbanMember = async (userId: string) => {
    setBusy(`unban:${userId}`)
    try {
      await communityApi.unbanMember(communityId, userId)
      setBans((current) => current.filter((ban) => ban.userId !== userId))
      addNotification(t('workspaceUi.banRemoved'), 'success')
    } catch (reason) {
      addNotification(reason instanceof Error ? reason.message : t('workspaceUi.operationFailed'), 'error')
    } finally {
      setBusy(null)
    }
  }

  const refreshEvents = async () => {
    try { setEvents((await communityApi.listEvents(communityId)).events) }
    catch (reason) { setError(reason instanceof Error ? reason.message : t('workspaceUi.operationFailed')) }
  }
  useEffect(() => { void refreshEvents() }, [communityId])

  const createEvent = async () => {
    if (!eventTitle.trim() || !eventStartsAt || busy) return
    setBusy('event:create')
    try {
      await communityApi.createEvent(communityId, { title: eventTitle.trim(), description: eventDescription.trim(), startsAt: new Date(eventStartsAt).toISOString(), channelId: selectedChannelId })
      setEventTitle(''); setEventDescription(''); setEventStartsAt(''); await refreshEvents()
    } catch (reason) { setError(reason instanceof Error ? reason.message : t('workspaceUi.operationFailed')) }
    finally { setBusy(null) }
  }

  useEffect(() => communityVoiceClient.subscribe(() => setVoiceTick((value) => value + 1)), [])

  useEffect(() => {
    if (viewingConnectedVoice && !voiceLayoutRef.current.active) {
      voiceLayoutRef.current = { active: true, restoreMembers: membersOpen }
      setMembersOpen(false)
      setVoiceChatOpen(true)
      return
    }
    if (!viewingConnectedVoice && voiceLayoutRef.current.active) {
      setVoiceChatOpen(false)
      setMembersOpen(voiceLayoutRef.current.restoreMembers)
      voiceLayoutRef.current.active = false
    }
  }, [viewingConnectedVoice, membersOpen])

  useEffect(() => {
    const unsubMessage = realtimeClient.subscribe('community.message.created', (event) => {
      if (event.payload.communityId !== communityId || event.payload.channelId !== selectedChannelId) return
      const message = withResolvedMessageMedia({ ...event.payload, createdAt: String(event.payload.createdAt) })
      setMessages((items) => items.some((item) => item.id === message.id) ? items : [...items, message])
    })
    const unsubAudit = realtimeClient.subscribe('community.audit.updated', (event) => {
      if (event.payload.communityId === communityId && canViewAuditLog && auditLoaded) void loadAuditEvents(0, activeAuditFilters)
    })
    const upsertVoice = (payload: unknown) => {
      const voiceState = normalizeCommunityVoicePayload(payload)
      if (!voiceState) {
        void communityApi.getState(communityId)
          .then((response) => setState(response.state))
          .catch(() => setError(t('workspaceUi.operationFailed')))
        return
      }
      if (voiceState.communityId !== communityId) return
      setState((current) => current ? {
        ...current,
        voiceStates: upsertCommunityVoiceParticipant(current.voiceStates, voiceState),
      } : current)
    }
    const unsubJoin = realtimeClient.subscribe('voice.user.joined', (event) => upsertVoice(event.payload))
    const unsubState = realtimeClient.subscribe('voice.state.updated', (event) => upsertVoice(event.payload))
    const unsubLeft = realtimeClient.subscribe('voice.user.left', (event) => {
      if (event.payload.communityId !== communityId || !event.payload.userId) return
      communityVoiceClient.removePeer(event.payload.userId)
      setState((current) => current ? {
        ...current,
        voiceStates: removeCommunityVoiceParticipant(current.voiceStates, event.payload.userId),
      } : current)
    })
    return () => {
      unsubMessage()
      unsubAudit()
      unsubJoin()
      unsubState()
      unsubLeft()
    }
  }, [activeAuditFilters, auditLoaded, canViewAuditLog, communityId, selectedChannelId])

  useEffect(() => {
    if (!selectedChannel || (selectedChannel.type !== 'text' && selectedChannel.type !== 'voice')) {
      setMessages([])
      return
    }
    if (!canViewSelectedChannel) {
      setMessages([])
      setError(null)
      return
    }
    let targetMessageId: string | null = null
    try {
      const rawTarget = localStorage.getItem(`anceryx:forum-message:${communityId}`)
      if (rawTarget) {
        const target = JSON.parse(rawTarget) as { channelId?: unknown; messageId?: unknown }
        if (target.channelId === selectedChannel.id && typeof target.messageId === 'string') targetMessageId = target.messageId
      }
    } catch { /* Ignore malformed navigation state and load the latest messages. */ }
    communityApi.listMessages(communityId, selectedChannel.id, targetMessageId ? { around: targetMessageId } : {})
      .then((response) => {
        if (targetMessageId && !response.messages.some((message) => message.id === targetMessageId)) {
          setMessages([])
          setError(t('workspaceUi.oldMessagesHint'))
          try { localStorage.removeItem(`anceryx:forum-message:${communityId}`) } catch { /* Ignore unavailable storage. */ }
          return
        }
        setMessages(response.messages.map(withResolvedMessageMedia))
        if (targetMessageId) window.setTimeout(() => {
          document.getElementById(`community-message-${targetMessageId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
          try { localStorage.removeItem(`anceryx:forum-message:${communityId}`) } catch { /* Navigation remains usable without storage. */ }
        }, 0)
      })
      .catch((err) => setError(err instanceof Error ? err.message : t('workspaceUi.operationFailed')))
  }, [communityId, selectedChannel, canViewSelectedChannel])

  useEffect(() => {
    setVoiceChatOpen(false)
    setReplyTarget(null)
    setMessages([])
    messageUploadControllerRef.current?.abort()
    if (messageFilePreview) URL.revokeObjectURL(messageFilePreview)
    setMessageFile(null)
    setMessageFilePreview(null)
  }, [communityId, selectedChannelId])

  const createMessage = async (input?: { contentType: 'gif' | 'sticker'; stickerKey?: KaoliStickerKey; gif?: KlipyGif }) => {
    const content = input?.contentType === 'sticker' ? input.stickerKey ?? '' : input?.contentType === 'gif' ? input.gif?.title || input.gif?.slug || '' : messageDraft.trim() || (messageFile ? t('workspaceUi.mediaLabel') : '')
    if (!content || !selectedChannel || (selectedChannel.type !== 'text' && selectedChannel.type !== 'voice') || busy === 'message') return
    setBusy('message')
    setMessageUploadProgress(0)
    try {
      let mediaAssetId: string | undefined
      if (messageFile && !input) { const controller = new AbortController(); messageUploadControllerRef.current = controller; mediaAssetId = (await mediaApi.uploadFile('community-message', messageFile, undefined, { communityId, channelId: selectedChannel.id }, { signal: controller.signal, onProgress: (progress) => setMessageUploadProgress(progress.percent) })).id }
      if (input?.contentType === 'gif' && input.gif) {
        if (!isSafeKlipyMediaUrl(input.gif.url)) throw new Error(t('workspaceUi.unsafeGif'))
        const mediaResponse = await fetch(input.gif.url)
        if (!mediaResponse.ok) throw new Error(t('workspaceUi.gifDownloadFailed'))
        const blob = await mediaResponse.blob()
        if (blob.type !== 'image/gif') throw new Error(t('workspaceUi.gifFormatInvalid'))
        const file = new File([blob], `${input.gif.slug.replace(/[^a-z0-9_-]/gi, '-').slice(0, 100) || 'community'}.gif`, { type: 'image/gif' })
        const asset = await mediaApi.uploadFile('community-message', file, { provider: 'klipy', slug: input.gif.slug }, { communityId, channelId: selectedChannel.id })
        mediaAssetId = asset.id
      }
      const response = await communityApi.createMessage(communityId, selectedChannel.id, {
        content,
        contentType: input?.contentType,
        stickerKey: input?.stickerKey,
        mediaAssetId,
        replyToMessageId: replyTarget?.id,
      })
      const message = withResolvedMessageMedia({ ...response.message, createdAt: String(response.message.createdAt) })
      setMessages((items) => items.some((item) => item.id === message.id) ? items : [...items, message])
      if (!input) void channelDraft.discard()
      if (!input && messageFilePreview) URL.revokeObjectURL(messageFilePreview)
      if (!input) { setMessageFile(null); setMessageFilePreview(null) }
      setReplyTarget(null)
      if (input?.contentType === 'gif' && input.gif && currentUserId) {
        void registerKlipyShare(input.gif).catch(() => undefined)
      }
    } catch (err) {
      addNotification(err instanceof Error ? err.message : t('workspaceUi.operationFailed'), 'error')
    } finally {
      messageUploadControllerRef.current = null
      setBusy(null)
    }
  }

  const createCategory = async () => {
    const name = newCategoryName.trim()
    if (!name) return
    setBusy('category')
    try {
      await communityApi.createCategory(communityId, name, state?.categories.length ?? 0)
      setNewCategoryName('')
      await refresh()
    } catch (err) {
      addNotification(err instanceof Error ? err.message : t('workspaceUi.operationFailed'), 'error')
    } finally {
      setBusy(null)
    }
  }

  const saveCategory = async () => {
    if (!editingCategory?.name.trim()) return
    setBusy(`category:${editingCategory.id}`)
    try {
      await communityApi.updateCategory(communityId, editingCategory.id, { name: editingCategory.name.trim() })
      setEditingCategory(null)
      await refresh()
      addNotification(t('workspaceUi.categoryUpdated'), 'success')
    } catch (reason) {
      addNotification(reason instanceof Error ? reason.message : t('workspaceUi.operationFailed'), 'error')
    } finally { setBusy(null) }
  }

  const moveCategory = async (categoryId: string, direction: -1 | 1) => {
    const categories = [...(state?.categories ?? [])].sort((a, b) => a.position - b.position || a.id.localeCompare(b.id))
    const index = categories.findIndex((category) => category.id === categoryId)
    const current = categories[index]
    const targetIndex = index + direction
    if (!current || targetIndex < 0 || targetIndex >= categories.length) return
    ;[categories[index], categories[targetIndex]] = [categories[targetIndex], categories[index]]
    setBusy(`category-order:${categoryId}`)
    try {
      await Promise.all(categories.map((category, position) => communityApi.updateCategory(communityId, category.id, { position })))
      await refresh()
    } catch (reason) {
      addNotification(reason instanceof Error ? reason.message : t('workspaceUi.operationFailed'), 'error')
      await refresh()
    } finally { setBusy(null) }
  }

  const moveChannel = async (channelId: string, direction: -1 | 1) => {
    const channel = state?.channels.find((item) => item.id === channelId)
    if (!channel) return
    const channels = state!.channels.filter((item) => item.categoryId === channel.categoryId).sort((a, b) => a.position - b.position || a.id.localeCompare(b.id))
    const index = channels.findIndex((item) => item.id === channelId)
    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= channels.length) return
    ;[channels[index], channels[targetIndex]] = [channels[targetIndex], channels[index]]
    setBusy(`channel-order:${channelId}`)
    try {
      await Promise.all(channels.map((item, position) => communityApi.updateChannel(communityId, item.id, { position })))
      await refresh()
    } catch (reason) {
      addNotification(reason instanceof Error ? reason.message : t('workspaceUi.operationFailed'), 'error')
      await refresh()
    } finally { setBusy(null) }
  }

  const syncChannelPermissionsFromCategory = async (channel: CommunityChannelDto) => {
    if (!channel.categoryId) return
    const overrides = (state?.overrides ?? []).filter((override) => override.channelId === channel.id && (override.allow.length > 0 || override.deny.length > 0))
    if (!overrides.length) {
      addNotification(t('workspaceUi.inheritsCategory'), 'success')
      return
    }
    if (!window.confirm(`Limpar ${overrides.length} sobrescrita(s) deste canal e voltar a herdar as permissões da categoria?`)) return
    setBusy(`channel-permissions:${channel.id}`)
    try {
      for (const override of overrides) {
        await communityApi.upsertOverride(communityId, {
          channelId: channel.id,
          subjectType: override.subjectType,
          subjectId: override.subjectId,
          allow: [],
          deny: [],
        })
      }
      await refresh()
      addNotification(t('workspaceUi.permissionsSynced'), 'success')
    } catch (reason) {
      await refresh()
      addNotification(reason instanceof Error ? reason.message : t('workspaceUi.operationFailed'), 'error')
    } finally { setBusy(null) }
  }

  const deleteCategory = async (categoryId: string) => {
    setBusy(`category:${categoryId}`)
    try {
      await communityApi.deleteCategory(communityId, categoryId)
      setConfirmDelete(null)
      await refresh()
      addNotification(t('workspaceUi.categoryDeletedChannelsUncategorized'), 'success')
    } catch (reason) {
      addNotification(reason instanceof Error ? reason.message : t('workspaceUi.operationFailed'), 'error')
    } finally { setBusy(null) }
  }

  const createChannel = async () => {
    const name = newChannelName.trim()
    if (!name) return
    setBusy('channel')
    try {
      await communityApi.createChannel(communityId, { name, type: newChannelType, categoryId: newChannelCategoryId || null, isPrivate: newChannelPrivate, isAnnouncement: newChannelType === 'text' && newChannelAnnouncement })
      setNewChannelName('')
      setNewChannelCategoryId('')
      setNewChannelPrivate(false)
      setNewChannelAnnouncement(false)
      await refresh()
    } catch (err) {
      addNotification(err instanceof Error ? err.message : t('workspaceUi.operationFailed'), 'error')
    } finally {
      setBusy(null)
    }
  }

  const saveChannel = async () => {
    if (!editingChannel?.name.trim()) return
    setBusy(`channel:${editingChannel.id}`)
    try {
      await communityApi.updateChannel(communityId, editingChannel.id, {
        name: editingChannel.name.trim(),
        description: editingChannel.description?.trim() || null,
        type: editingChannel.type,
        categoryId: editingChannel.categoryId,
        isPrivate: editingChannel.isPrivate,
        isAnnouncement: editingChannel.type === 'text' && editingChannel.isAnnouncement,
        position: editingChannel.position,
        ageRestricted: editingChannel.ageRestricted,
        slowmodeSeconds: editingChannel.slowmodeSeconds,
        userLimit: editingChannel.userLimit,
      })
      setEditingChannel(null)
      await refresh()
      addNotification(t('workspaceUi.channelUpdated'), 'success')
    } catch (reason) {
      addNotification(reason instanceof Error ? reason.message : t('workspaceUi.operationFailed'), 'error')
    } finally { setBusy(null) }
  }

  const deleteChannel = async (channelId: string) => {
    setBusy(`channel:${channelId}`)
    try {
      await communityApi.deleteChannel(communityId, channelId)
      if (selectedChannelId === channelId) setSelectedChannelId(null)
      setConfirmDelete(null)
      await refresh()
      addNotification(t('workspaceUi.channelDeleted'), 'success')
    } catch (reason) {
      addNotification(reason instanceof Error ? reason.message : t('workspaceUi.operationFailed'), 'error')
    } finally { setBusy(null) }
  }

  const setPrivateChannelAccess = async (channel: CommunityChannelDto) => {
    if (!accessSubjectId) return
    setBusy(`access:${channel.id}`)
    try {
      await communityApi.upsertOverride(communityId, {
        channelId: channel.id,
        subjectType: accessSubjectType,
        subjectId: accessSubjectId,
        allow: accessAllowed ? ['viewChannel'] : [],
        deny: accessAllowed ? [] : ['viewChannel'],
      })
      await refresh()
      addNotification(accessAllowed ? t('workspaceUi.privateAccessGranted') : t('workspaceUi.privateAccessRemoved'), 'success')
    } catch (err) {
      addNotification(err instanceof Error ? err.message : t('workspaceUi.operationFailed'), 'error')
    } finally { setBusy(null) }
  }

  const createRole = async () => {
    const name = newRoleName.trim()
    if (!name) return
    setBusy('role')
    try {
      await communityApi.createRole(communityId, { name, color: '#8b5cf6', permissions: [newRolePermission], position: Number(newRolePosition) || 0, displaySeparately: newRoleDisplaySeparately, mentionable: newRoleMentionable })
      setNewRoleName('')
      await refresh()
    } catch (err) {
      addNotification(err instanceof Error ? err.message : t('workspaceUi.operationFailed'), 'error')
    } finally {
      setBusy(null)
    }
  }

  const beginRoleEdit = (role: NonNullable<CommunityStateDto['roles']>[number]) => {
    setEditingRoleId(role.id)
    setEditingRoleName(role.name)
    setEditingRoleColor(role.color)
    setEditingRolePermissions(role.permissions)
    setEditingRolePosition(role.position)
    setEditingRoleDisplaySeparately(role.displaySeparately)
    setEditingRoleMentionable(role.mentionable)
  }

  const saveRole = async () => {
    if (!editingRoleId || !editingRoleName.trim()) return
    setBusy(`role:${editingRoleId}`)
    try {
      await communityApi.updateRole(communityId, editingRoleId, { name: editingRoleName.trim(), color: editingRoleColor, permissions: editingRolePermissions, position: editingRolePosition, displaySeparately: editingRoleDisplaySeparately, mentionable: editingRoleMentionable })
      setEditingRoleId(null)
      await refresh()
    } catch (reason) {
      addNotification(reason instanceof Error ? reason.message : t('workspaceUi.operationFailed'), 'error')
    } finally { setBusy(null) }
  }

  const deleteRole = async (roleId: string) => {
    const role = state?.roles.find((item) => item.id === roleId)
    if (!role || !window.confirm(`Excluir o cargo "${role.name}"?`)) return
    setBusy(`role:${roleId}`)
    try {
      await communityApi.deleteRole(communityId, roleId)
      if (editingRoleId === roleId) setEditingRoleId(null)
      await refresh()
    } catch (reason) {
      addNotification(reason instanceof Error ? reason.message : t('workspaceUi.operationFailed'), 'error')
    } finally { setBusy(null) }
  }

  const changeMemberRole = async (memberId: string, roleId: string, remove = false) => {
    setBusy(`member-role:${memberId}:${roleId}`)
    try {
      if (remove) await communityApi.removeMemberRole(communityId, memberId, roleId)
      else await communityApi.addMemberRole(communityId, memberId, roleId)
      await refresh()
    } catch (reason) {
      addNotification(reason instanceof Error ? reason.message : t('workspaceUi.operationFailed'), 'error')
    } finally { setBusy(null) }
  }

  const createInvite = async () => {
    setBusy('invite')
    try {
      const expiresAt = inviteExpiryDays ? new Date(Date.now() + Number(inviteExpiryDays) * 86_400_000).toISOString() : null
      const response = await communityApi.createInvite(communityId, { channelId: selectedChannelId, expiresAt, maxUses: inviteMaxUses ? Number(inviteMaxUses) : null })
      setInviteToken(response.invite.token)
      setInvites((await communityApi.listInvites(communityId)).invites)
    } catch (err) {
      addNotification(err instanceof Error ? err.message : t('workspaceUi.operationFailed'), 'error')
    } finally {
      setBusy(null)
    }
  }

  const revokeInvite = async (inviteId: string) => {
    setBusy(`invite:${inviteId}`)
    try {
      await communityApi.revokeInvite(communityId, inviteId)
      setInvites((await communityApi.listInvites(communityId)).invites)
    } catch (reason) { addNotification(reason instanceof Error ? reason.message : t('workspaceUi.operationFailed'), 'error') }
    finally { setBusy(null) }
  }

  const copyInviteLink = async () => {
    if (!inviteToken) return
    try {
      await navigator.clipboard.writeText(`anceryx://invite/${inviteToken}`)
      addNotification(t('workspaceUi.inviteCopied'), 'success')
    } catch { addNotification(t('workspaceUi.operationFailed'), 'error') }
  }

  const joinVoice = async (channel: CommunityChannelDto) => {
    setBusy(`voice:${channel.id}`)
    try {
      await communityVoiceClient.join(communityId, channel.id)
      const refreshed = await refresh()
      const peers = refreshed?.voiceStates.filter((item) => item.channelId === channel.id && item.userId !== currentUserId) ?? []
      await Promise.all(peers.map((peer) => communityVoiceClient.callPeer(peer.userId).catch(() => undefined)))
    } catch (err) {
      addNotification(err instanceof Error ? err.message : t('workspaceUi.operationFailed'), 'error')
    } finally {
      setBusy(null)
    }
  }

  const leaveVoice = async () => {
    setBusy('voice:leave')
    try {
      await communityVoiceClient.leave()
      await refresh()
    } finally {
      setBusy(null)
    }
  }

  const toggleVoiceScreenShare = async () => {
    try {
      if (communityVoiceClient.isScreenSharing) await communityVoiceClient.stopScreenShare()
      else if (window.electronAPI?.screenCapture) {
        setScreenPickerLoading(true)
        const sources = await window.electronAPI.screenCapture.listSources()
        if (!sources.length) throw new Error(t('workspaceUi.noCaptureSources'))
        setScreenSources(sources)
        setScreenPickerOpen(true)
      } else await communityVoiceClient.startScreenShare(30)
    } catch (err) {
      addNotification(err instanceof Error ? err.message : t('workspaceUi.operationFailed'), 'error')
    } finally { setScreenPickerLoading(false) }
  }

  const startScreenShareFromSource = async (sourceId: string) => {
    setScreenPickerLoading(true)
    try {
      await window.electronAPI?.screenCapture.selectSource(sourceId)
      setScreenPickerOpen(false)
      await communityVoiceClient.startScreenShare(30)
    } catch (err) {
      addNotification(err instanceof Error ? err.message : t('workspaceUi.operationFailed'), 'error')
    } finally { setScreenPickerLoading(false) }
  }

  const groupedChannels = useMemo(() => {
    const groups = new Map<string, CommunityChannelDto[]>()
    for (const category of state?.categories ?? []) groups.set(category.id, [])
    groups.set('uncategorized', [])
    for (const channel of state?.channels ?? []) {
      const key = channel.categoryId ?? 'uncategorized'
      groups.set(key, [...(groups.get(key) ?? []), channel])
    }
    return groups
  }, [state])

  const sidebarCategories = useMemo(() => {
    const categories = state?.categories ?? []
    return groupedChannels.get('uncategorized')?.length
      ? [...categories, { id: 'uncategorized', name: t('workspaceUi.noCategory'), communityId, position: 999 }]
      : categories
  }, [communityId, groupedChannels, state?.categories])

  const voiceStatus = communityVoiceClient.status
  const voiceStatusLabel = ({ idle: t('workspaceUi.voiceIdle'), connected: t('workspaceUi.voiceConnectedStatus'), disconnected: t('workspaceUi.voiceIdle'), connecting: t('workspaceUi.voiceConnectingStatus'), reconnecting: t('workspaceUi.voiceReconnectingStatus'), 'permission-denied': t('workspaceUi.voicePermissionDenied') } as const)[voiceStatus]
  void voiceTick

  const managementSections = useMemo<CommunityManagementSection[]>(() => [
    ...(canManageLegacyForum && forum ? [
      { id: 'overview', label: t('forumManage.overview'), group: t('workspaceUi.generalGroup') },
      { id: 'profile', label: t('forumManage.profile'), group: t('workspaceUi.generalGroup') },
      ...(canManageChannels ? [{ id: 'organization', label: t('workspaceUi.channelsCategories'), group: t('workspaceUi.generalGroup') }] : []),
      { id: 'posts', label: t('communityForum.posts'), group: t('workspaceUi.generalGroup') },
      { id: 'members', label: t('workspaceUi.members'), group: t('workspaceUi.peopleAccessGroup') },
      ...(canManageRoles ? [{ id: 'roles', label: t('workspaceUi.rolesPermissions'), group: t('workspaceUi.peopleAccessGroup') }] : []),
      ...(canManageInvites ? [{ id: 'invites', label: t('workspaceUi.invites'), group: t('workspaceUi.peopleAccessGroup') }] : []),
      { id: 'access', label: t('forumManage.access'), group: t('workspaceUi.peopleAccessGroup') },
      { id: 'reports', label: t('workspaceModeration.messageReports'), group: t('workspaceUi.moderationSecurityGroup') },
      { id: 'moderation', label: t('workspaceUi.moderation'), group: t('workspaceUi.moderationSecurityGroup') },
      ...(canOpenManagement ? [{ id: 'appeals', label: t('workspaceUi.resources'), group: t('workspaceUi.moderationSecurityGroup') }] : []),
      ...(canViewAuditLog ? [{ id: 'audit', label: t('workspaceUi.auditLog'), group: t('workspaceUi.moderationSecurityGroup') }] : []),
      ...(isCommunityOwner ? [{ id: 'critical', label: t('workspaceUi.criticalActions'), group: t('workspaceUi.advancedGroup') }] : []),
    ] : []),
    ...(canManageReports && !canManageLegacyForum ? [{ id: 'reports', label: t('workspaceModeration.messageReports'), group: t('workspaceUi.moderationSecurityGroup') }] : []),
    ...(!canManageLegacyForum && canManageChannels ? [{ id: 'organization', label: t('workspaceUi.channelsCategories'), group: t('workspaceUi.generalGroup') }] : []),
    ...(!canManageLegacyForum && canManageRoles ? [{ id: 'roles', label: t('workspaceUi.rolesPermissions'), group: t('workspaceUi.peopleAccessGroup') }] : []),
    ...(!canManageLegacyForum && canManageInvites ? [{ id: 'invites', label: t('workspaceUi.invites'), group: t('workspaceUi.peopleAccessGroup') }] : []),
    ...(!canManageLegacyForum && canOpenManagement && (canCreateModerationActions || canManageBans || canViewModerationCases || canManageReports) ? [{ id: 'moderation', label: t('workspaceUi.moderation'), group: t('workspaceUi.moderationSecurityGroup') }] : []),
    ...(!canManageLegacyForum && canOpenManagement ? [{ id: 'appeals', label: t('workspaceUi.resources'), group: t('workspaceUi.moderationSecurityGroup') }] : []),
    ...(!canManageLegacyForum && canViewAuditLog ? [{ id: 'audit', label: t('workspaceUi.auditLog'), group: t('workspaceUi.moderationSecurityGroup') }] : []),
    ...(isCommunityOwner ? [{ id: 'preferences', label: t('workspaceUi.preferencesTitle'), group: t('workspaceUi.advancedGroup') }] : []),
  ], [canManageLegacyForum, forum, canOpenManagement, canCreateModerationActions, canManageBans, canViewModerationCases, canViewModerationSummary, canViewAuditLog, canManageChannels, canManageRoles, canManageInvites, isCommunityOwner, t])
  const moderationSummaryCards = [
    { label: t('workspaceUi.pendingReports'), value: moderationSummary?.reports.pending, onClick: canManageReports || forum && canManageLegacyForum ? () => setManagementSection('reports') : undefined },
    { label: t('workspaceUi.reportsInReview'), value: moderationSummary?.reports.reviewing, onClick: canManageReports || forum && canManageLegacyForum ? () => setManagementSection('reports') : undefined },
    { label: t('workspaceUi.resolvedCases'), value: moderationSummary?.cases.resolved, onClick: () => { const filters = { status: 'corrected' as const }; setModerationFilters(filters); void loadModerationCases(0, filters) } },
    { label: t('workspaceUi.activeTimeouts'), value: moderationSummary?.activeTimeouts, onClick: () => { const filters = { action: 'timeout' as const, status: 'active' as const }; setModerationFilters(filters); void loadModerationCases(0, filters) } },
    { label: t('workspaceUi.activeBans'), value: moderationSummary?.activeBans, onClick: () => { const filters = { action: 'ban' as const, status: 'active' as const }; setModerationFilters(filters); void loadModerationCases(0, filters) } },
    { label: t('workspaceUi.appealsPending'), value: moderationSummary?.appealsPending, onClick: () => setManagementSection('appeals') },
  ]
  useEffect(() => {
    if (managementOpen && !managementSections.some((section) => section.id === managementSection)) {
      setManagementSection(managementSections[0]?.id ?? 'forum')
    }
  }, [managementOpen, managementSection, managementSections])
  const communityManagementContent = <>

          {managementSection === 'appeals' && (ownModerationCases.length > 0 || ownAppeals.length > 0) && <details className="border-b border-border p-3"><summary className="cursor-pointer list-none text-xs font-semibold uppercase text-text-secondary hover:text-text-primary">{t('workspaceUi.myCases')}</summary><div className="mt-3 space-y-3">
            {ownModerationCases.map((item) => {
              const activeAppeal = ownAppeals.some((appeal) => appeal.moderationCaseId === item.id && ['pending', 'reviewing'].includes(appeal.status))
              return <article key={item.id} className="space-y-2 rounded-md bg-background-secondary p-2"><p className="text-xs font-medium text-text-primary">{item.action === 'warning' ? t('workspaceUi.caseWarning') : item.action === 'timeout' ? t('workspaceUi.temporaryRestriction') : item.action === 'kick' ? t('workspaceUi.caseKick') : t('workspaceUi.caseBan')} · {item.status === 'corrected' ? t('workspaceUi.correctedF') : item.status === 'expired' ? t('workspaceUi.expiredF') : t('workspaceUi.activeF')}</p><p className="whitespace-pre-wrap break-words text-[11px] text-text-secondary">{item.reason}</p><p className="text-[10px] text-text-secondary">{formatDateTime(new Date(item.createdAt))}</p>{item.status !== 'corrected' && !activeAppeal && <button type="button" className="text-xs text-accent hover:underline" onClick={() => setAppealCaseId(appealCaseId === item.id ? null : item.id)}>{t('workspaceUi.appealThisDecision')}</button>}{appealCaseId === item.id && <div className="space-y-2"><textarea aria-label={t('workspaceUi.appealReason')} value={appealStatement} onChange={(event) => setAppealStatement(event.target.value.slice(0, 4000))} maxLength={4000} rows={3} placeholder={t('workspaceUi.appealReasonPlaceholder')} className="w-full rounded-md border border-border bg-background-primary p-2 text-xs text-text-primary" /><textarea aria-label={t('workspaceUi.additionalAppealInfo')} value={appealAdditionalInfo} onChange={(event) => setAppealAdditionalInfo(event.target.value.slice(0, 4000))} maxLength={4000} rows={2} placeholder={t('workspaceUi.optionalInfo')} className="w-full rounded-md border border-border bg-background-primary p-2 text-xs text-text-primary" /><textarea aria-label={t('workspaceUi.evidenceReferences')} value={appealEvidenceText} onChange={(event) => setAppealEvidenceText(event.target.value.slice(0, 5000))} maxLength={5000} rows={2} placeholder={t('workspaceUi.evidenceReferencesPlaceholder')} className="w-full rounded-md border border-border bg-background-primary p-2 text-xs text-text-primary" /><Button size="sm" variant="secondary" disabled={!appealStatement.trim()} loading={busy === `appeal:create:${item.id}`} onClick={() => void submitAppeal()}>{t('workspaceUi.sendAppeal')}</Button></div>}</article>
            })}
            {ownAppeals.map((appeal) => <article key={appeal.id} className="rounded-md border border-border p-2"><p className="text-xs font-medium text-text-primary">{t('workspaceUi.appealLabel')} {appeal.status === 'pending' ? t('workspaceUi.casePendingIndependent') : appeal.status === 'reviewing' ? t('workspaceModeration.reviewing') : appeal.status === 'reversed' ? t('workspaceUi.appealGranted') : appeal.status === 'upheld' ? t('workspaceUi.appealRejected') : appeal.status === 'closed_by_correction' ? t('workspaceUi.appealClosedByCorrection') : t('workspaceUi.cancelled')}</p>{appeal.decisionNote && <p className="mt-1 whitespace-pre-wrap break-words text-[11px] text-text-secondary">{appeal.decisionNote}</p>}</article>)}
          </div></details>}
          {managementSection === 'appeals' && <section className="space-y-2 rounded-md border border-border p-3">
            <h3 className="text-xs font-semibold uppercase text-text-secondary">{t('workspaceUi.appealsReview')}</h3>
            <Button size="sm" variant="secondary" loading={appealQueueLoading} onClick={() => void loadAppealQueue()}>{t('workspaceUi.checkAppeals')}</Button>
            {appealQueueError && <p role="status" className="text-xs text-text-secondary">{appealQueueError}</p>}
            {appealQueueLoaded && canReviewAppeals && <p className="text-xs text-text-secondary">{t('workspaceUi.appealCount', { count: appealQueue.length })}</p>}
          </section>}
          {managementSection === 'appeals' && canReviewAppeals && <details className="border-b border-border p-3">
            <summary className="cursor-pointer list-none text-xs font-semibold uppercase text-text-secondary hover:text-text-primary">{t('workspaceUi.appealsAnalysis')} {appealQueue.filter((appeal) => appeal.status === 'pending' || appeal.status === 'reviewing').length}</summary>
            <div className="mt-3 space-y-3">
              {appealQueue.filter((appeal) => appeal.status === 'pending' || appeal.status === 'reviewing').map((appeal) => {
                const isAssignedReviewer = appeal.assignedReviewerUserId === currentUserId
                const isUnassigned = appeal.claimAvailable
                return <article key={appeal.id} className="space-y-2 rounded-md bg-background-secondary p-2">
                  <p className="text-xs font-medium text-text-primary">{appeal.moderationCase.target.displayName} · {appeal.moderationCase.action === 'warning' ? t('workspaceUi.caseWarning') : appeal.moderationCase.action === 'timeout' ? t('workspaceUi.temporaryRestriction') : appeal.moderationCase.action === 'kick' ? t('workspaceUi.caseKick') : t('workspaceUi.caseBan')}</p>
                  <p className="text-[11px] text-text-secondary">{t('workspaceUi.originalActionLabel')} {appeal.moderationCase.reason}</p>
                  <p className="whitespace-pre-wrap break-words text-xs text-text-primary">{t('workspaceUi.appealLabel')} {appeal.statement}</p>
                  {appeal.additionalInfo && <p className="whitespace-pre-wrap break-words text-[11px] text-text-secondary">{appeal.additionalInfo}</p>}
                  {appeal.evidence.map((entry, index) => <p key={`appeal-${index}`} className="break-all text-[11px] text-text-secondary">{entry}</p>)}
                  {appeal.moderationCase.evidence.map((entry, index) => <p key={`case-${index}`} className="break-all text-[11px] text-text-secondary">{entry}</p>)}
                  <p className="text-[10px] text-text-secondary">{t('workspaceUi.actionResponsible')} {appeal.moderationCase.actor?.displayName ?? t('workspaceUi.accountRemoved')}</p>
                  {isUnassigned && <Button size="sm" variant="secondary" loading={busy === `appeal:claim:${appeal.id}`} onClick={() => void claimAppeal(appeal.id)}>{t('workspaceModeration.takeReview')}</Button>}
                  {!isUnassigned && <p className="text-[10px] text-text-secondary">{t('workspaceUi.assignedReviewer')} {appeal.assignedReviewer?.displayName ?? t('workspaceUi.accountRemoved')}{isAssignedReviewer ? ` (${t('workspaceUi.you')})` : ''}</p>}
                  {isAssignedReviewer && <>
                    <textarea aria-label={t('workspaceUi.decisionReason')} value={reviewDecisionNotes[appeal.id] ?? ''} onChange={(event) => setReviewDecisionNotes((current) => ({ ...current, [appeal.id]: event.target.value.slice(0, 2000) }))} maxLength={2000} rows={2} placeholder={t('workspaceUi.decisionReason')} className="w-full rounded-md border border-border bg-background-primary p-2 text-xs text-text-primary" />
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="secondary" disabled={!reviewDecisionNotes[appeal.id]?.trim()} loading={busy === `appeal:review:${appeal.id}`} onClick={() => void reviewAppeal(appeal.id, 'reversed')}>{t('workspaceUi.approveAndReverse')}</Button>
                      <Button size="sm" variant="secondary" disabled={!reviewDecisionNotes[appeal.id]?.trim()} loading={busy === `appeal:review:${appeal.id}`} onClick={() => void reviewAppeal(appeal.id, 'upheld')}>{t('workspaceUi.denyAndMaintain')}</Button>
                      <Button size="sm" variant="ghost" loading={busy === `appeal:release:${appeal.id}`} onClick={() => void releaseAppeal(appeal.id)}>{t('workspaceUi.releaseForReview')}</Button>
                    </div>
                  </>}
                </article>
              })}
              {appealQueue.every((appeal) => appeal.status !== 'pending' && appeal.status !== 'reviewing') && <p className="text-xs text-text-secondary">{t('workspaceUi.noAppealsPending')}</p>}
            </div>
          </details>}
          {['forum', 'organization', 'roles', 'invites'].includes(managementSection) && canOpenManagement && (
            <div className="space-y-4 border-t border-border p-3">
              <h3 className="text-sm font-semibold text-text-primary">{managementSection === 'organization' ? t('workspaceUi.organization') : managementSection === 'roles' ? t('workspaceUi.managementRoles') : managementSection === 'invites' ? t('workspaceUi.invitations') : t('workspaceUi.managementForum')}</h3>
              <div className="mt-3 space-y-4">
              {managementSection === 'preferences' && state?.community.ownerUserId === currentUserId && <><section className="space-y-2"><h3 className="text-xs font-semibold uppercase text-text-secondary">{t('workspaceUi.reviewerRoles')}</h3><p className="text-xs text-text-secondary">{t('workspaceUi.reviewerRolesHelp')}</p>{state.roles.length === 0 ? <p className="text-xs text-text-secondary">{t('workspaceUi.createRolesBeforeReviewers')}</p> : state.roles.map((role) => <label key={role.id} className="flex items-center gap-2 text-xs text-text-primary"><input type="checkbox" checked={reviewerRoleIds.includes(role.id)} disabled={busy === 'appeal-reviewer-roles'} onChange={(event) => void toggleAppealReviewerRole(role.id, event.target.checked)} />{role.name}</label>)}</section><section className="space-y-2"><h3 className="text-xs font-semibold uppercase text-text-secondary">{t('workspaceUi.memberList')}</h3><p className="text-xs text-text-secondary">{t('workspaceUi.memberListMode')}</p><label className="sr-only" htmlFor="community-member-list-mode">{t('workspaceUi.displayMode')}</label><select id="community-member-list-mode" value={state.community.memberListMode} onChange={(event) => void updateMemberListMode(event.target.value as 'simple' | 'grouped_roles')} disabled={busy === 'member-list-mode'} className="w-full max-w-md rounded-md border border-border bg-background-secondary px-2 py-1.5 text-xs text-text-primary"><option value="simple">{t('workspaceUi.simpleMemberList')}</option><option value="grouped_roles">{t('workspaceUi.memberListGrouped')}</option></select></section></>}
              {canManageChannels && managementSection === 'organization' && <section className="space-y-2">
                <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase text-text-secondary"><Plus size={13} /> {t('workspaceUi.channels')}</h3>
                <Input value={newCategoryName} onChange={(event) => setNewCategoryName(event.target.value)} placeholder={t('workspaceUi.category')} />
                <Button size="sm" variant="secondary" loading={busy === 'category'} onClick={() => void createCategory()}>{t('workspaceUi.createCategory')}</Button>
                {state?.categories.map((category, index, categories) => <div key={category.id} className="flex items-center gap-2 rounded-md border border-border p-2">
                  {editingCategory?.id === category.id ? <><Input aria-label={t('workspaceUi.channelCategoryName')} value={editingCategory.name} onChange={(event) => setEditingCategory({ ...editingCategory, name: event.target.value })} /><Button size="sm" loading={busy === `category:${category.id}`} onClick={() => void saveCategory()} leftIcon={<Check size={13} />}>{t('common.save')}</Button><Button size="sm" variant="ghost" onClick={() => setEditingCategory(null)}>{t('common.cancel')}</Button></> : <><span className="min-w-0 flex-1 truncate text-xs text-text-primary">{category.name}</span><button type="button" aria-label={t('workspaceUi.moveCategoryUp', { name: category.name })} disabled={index === 0 || Boolean(busy)} onClick={() => void moveCategory(category.id, -1)} className="text-text-secondary disabled:opacity-40"><ArrowUp size={13} /></button><button type="button" aria-label={t('workspaceUi.moveCategoryDown', { name: category.name })} disabled={index === categories.length - 1 || Boolean(busy)} onClick={() => void moveCategory(category.id, 1)} className="text-text-secondary disabled:opacity-40"><ArrowDown size={13} /></button><button type="button" aria-label={t('workspaceUi.editCategory', { name: category.name })} onClick={() => setEditingCategory({ id: category.id, name: category.name })} className="text-text-secondary"><Pencil size={13} /></button><button type="button" aria-label={t('workspaceUi.deleteCategory', { name: category.name })} onClick={() => setConfirmDelete({ type: 'category', id: category.id, name: category.name })} className="text-red-300"><Trash2 size={13} /></button></>}
                </div>)}
                <div className="flex gap-2">
                  <input value={newChannelName} onChange={(event) => setNewChannelName(event.target.value)} className="min-w-0 flex-1 rounded-md border border-border bg-background-secondary px-2 py-1.5 text-xs text-text-primary" placeholder={t('workspaceUi.channelPlaceholder')} />
                  <select value={newChannelType} onChange={(event) => setNewChannelType(event.target.value as CommunityChannelType)} className="rounded-md border border-border bg-background-secondary px-2 py-1.5 text-xs text-text-primary">
                    <option value="text">{t('workspaceUi.text')}</option>
                    <option value={t('workspaceUi.forum')}>{t('workspaceUi.forum')}</option>
                    <option value="voice">{t('workspaceUi.voice')}</option>
                  </select>
                </div>
                <label className="block text-xs text-text-secondary">{t('workspaceUi.category')} <select value={newChannelCategoryId} onChange={(event) => setNewChannelCategoryId(event.target.value)} className="mt-1 w-full rounded-md border border-border bg-background-secondary px-2 py-1.5 text-text-primary"><option value="">{t('workspaceUi.noCategory')}</option>{state?.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
                <label className="flex items-center gap-2 text-xs text-text-secondary"><input type="checkbox" checked={newChannelPrivate} onChange={(event) => setNewChannelPrivate(event.target.checked)} />{t('workspaceUi.privateChannel')}</label>
                {newChannelType === 'text' && <label className="flex items-center gap-2 text-xs text-text-secondary"><input type="checkbox" checked={newChannelAnnouncement} onChange={(event) => setNewChannelAnnouncement(event.target.checked)} />{t('workspaceUi.announcementChannel')}</label>}
                <Button size="sm" variant="secondary" loading={busy === 'channel'} onClick={() => void createChannel()}>{t('workspaceUi.createChannel')}</Button>
                {state?.channels.map((channel) => {
                  const siblings = state.channels.filter((item) => item.categoryId === channel.categoryId).sort((a, b) => a.position - b.position || a.id.localeCompare(b.id))
                  const channelIndex = siblings.findIndex((item) => item.id === channel.id)
                  const hasChannelOverrides = state.overrides.some((override) => override.channelId === channel.id && (override.allow.length > 0 || override.deny.length > 0))
                  return <div key={channel.id} className="flex items-center gap-2 rounded-md border border-border p-2">
                  {editingChannel?.id === channel.id ? <div className="grid flex-1 gap-2"><Input aria-label={t('workspaceUi.channelName')} value={editingChannel.name} onChange={(event) => setEditingChannel({ ...editingChannel, name: event.target.value })} /><label className="block text-xs text-text-secondary">{t('workspaceUi.type')} <select value={editingChannel.type} onChange={(event) => setEditingChannel({ ...editingChannel, type: event.target.value as CommunityChannelType })} className="mt-1 w-full rounded-md border border-border bg-background-primary px-2 py-1.5 text-text-primary"><option value="text">{t('workspaceUi.text')}</option><option value={t('workspaceUi.forum')}>{t('workspaceUi.forum')}</option><option value="voice">{t('workspaceUi.voice')}</option></select></label><label className="block text-xs text-text-secondary">{t('workspaceUi.category')} <select value={editingChannel.categoryId ?? ''} onChange={(event) => setEditingChannel({ ...editingChannel, categoryId: event.target.value || null })} className="mt-1 w-full rounded-md border border-border bg-background-primary px-2 py-1.5 text-text-primary"><option value="">{t('workspaceUi.noCategory')}</option>{state?.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label><label className="flex items-center gap-2 text-xs text-text-secondary"><input type="checkbox" checked={editingChannel.isPrivate} onChange={(event) => setEditingChannel({ ...editingChannel, isPrivate: event.target.checked })} />{t('workspaceUi.privateChannel')}</label><label className="flex items-center gap-2 text-xs text-text-secondary"><input type="checkbox" checked={editingChannel.isAnnouncement} onChange={(event) => setEditingChannel({ ...editingChannel, isAnnouncement: event.target.checked })} />{t('workspaceUi.announcementChannel')}</label><div className="flex gap-2"><Button size="sm" loading={busy === `channel:${channel.id}`} onClick={() => void saveChannel()} leftIcon={<Check size={13} />}>{t('common.save')}</Button><Button size="sm" variant="ghost" onClick={() => setEditingChannel(null)}>{t('common.cancel')}</Button></div></div> : <><span className="min-w-0 flex-1 truncate text-xs text-text-primary">#{channel.name}</span><button type="button" aria-label={t('workspaceUi.moveChannelUp', { name: channel.name })} disabled={channelIndex === 0 || Boolean(busy)} onClick={() => void moveChannel(channel.id, -1)} className="text-text-secondary disabled:opacity-40"><ArrowUp size={13} /></button><button type="button" aria-label={t('workspaceUi.moveChannelDown', { name: channel.name })} disabled={channelIndex === siblings.length - 1 || Boolean(busy)} onClick={() => void moveChannel(channel.id, 1)} className="text-text-secondary disabled:opacity-40"><ArrowDown size={13} /></button><button type="button" aria-label={t('workspaceUi.editChannel', { name: channel.name })} onClick={() => setEditingChannel({ ...channel })} className="text-text-secondary"><Pencil size={13} /></button><button type="button" aria-label={t('workspaceUi.deleteChannel', { name: channel.name })} onClick={() => setConfirmDelete({ type: 'channel', id: channel.id, name: channel.name })} className="text-red-300"><Trash2 size={13} /></button>{channel.categoryId && hasChannelOverrides && <button type="button" disabled={Boolean(busy)} onClick={() => void syncChannelPermissionsFromCategory(channel)} className="text-[10px] text-accent disabled:opacity-40">{t('workspaceUi.inheritCategory')}</button>}</>}
                </div>
                })}
                {state?.channels.filter((channel) => channel.isPrivate).map((channel) => <div key={channel.id} className="space-y-2 rounded-md border border-border p-2">
                  <p className="text-xs font-medium text-text-primary">{t('workspaceUi.access')}{channel.name}</p>
                  <select value={accessSubjectType} onChange={(event) => setAccessSubjectType(event.target.value as 'role' | 'member')} className="w-full rounded-md border border-border bg-background-secondary px-2 py-1 text-xs text-text-primary"><option value="role">{t('workspaceUi.role')}</option><option value="member">{t('forumManage.role.member')}</option></select>
                  <select value={accessSubjectId} onChange={(event) => setAccessSubjectId(event.target.value)} className="w-full rounded-md border border-border bg-background-secondary px-2 py-1 text-xs text-text-primary"><option value="">{t('workspaceUi.select')}</option>{(accessSubjectType === 'role' ? state.roles.map((role) => ({ id: role.id, name: role.name })) : state.members.map((member) => ({ id: member.userId, name: member.user.displayName }))).map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select>
                  <select value={accessAllowed ? 'allow' : 'deny'} onChange={(event) => setAccessAllowed(event.target.value === 'allow')} className="w-full rounded-md border border-border bg-background-secondary px-2 py-1 text-xs text-text-primary"><option value="allow">{t('workspaceUi.grantAccess')}</option><option value="deny">{t('workspaceUi.removeAccess')}</option></select>
                  <Button size="sm" variant="secondary" loading={busy === `access:${channel.id}`} onClick={() => void setPrivateChannelAccess(channel)}>{t('workspaceUi.applyPermission')}</Button>
                </div>)}
              </section>}
              {canManageRoles && managementSection === 'roles' && <section className="space-y-2">
                <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase text-text-secondary"><Shield size={13} /> {t('workspaceUi.roles')}</h3>
                <Input value={newRoleName} onChange={(event) => setNewRoleName(event.target.value)} placeholder={t('workspaceUi.role')} />
                <label className="block text-xs text-text-secondary">{t('workspaceUi.position')} <input type="number" value={newRolePosition} onChange={(event) => setNewRolePosition(event.target.value)} className="mt-1 w-full rounded-md border border-border bg-background-secondary px-2 py-1.5 text-text-primary" /></label>
                <label className="flex items-center gap-2 text-xs text-text-secondary"><input type="checkbox" checked={newRoleDisplaySeparately} onChange={(event) => setNewRoleDisplaySeparately(event.target.checked)} />{t('workspaceUi.displaySeparately')}</label>
                <label className="flex items-center gap-2 text-xs text-text-secondary"><input type="checkbox" checked={newRoleMentionable} onChange={(event) => setNewRoleMentionable(event.target.checked)} />{t('workspaceUi.allowMentions')}</label>
                <select value={newRolePermission} onChange={(event) => setNewRolePermission(event.target.value)} className="w-full rounded-md border border-border bg-background-secondary px-2 py-1.5 text-xs text-text-primary">
                  {PERMISSIONS.map((permission) => <option key={permission} value={permission}>{communityPermissionLabel(permission, t)}</option>)}
                </select>
                <Button size="sm" variant="secondary" loading={busy === 'role'} onClick={() => void createRole()}>{t('workspaceUi.createRole')}</Button>
                <div className="space-y-2 border-t border-border pt-2">
                  {state?.roles.map((role) => <div key={role.id} className="space-y-2 rounded-md bg-background-secondary p-2">
                    {editingRoleId === role.id ? <>
                      <Input aria-label={t('workspaceUi.roleName')} value={editingRoleName} onChange={(event) => setEditingRoleName(event.target.value)} />
                      <label className="flex items-center justify-between text-xs text-text-secondary">{t('workspaceUi.color')} <input aria-label={t('workspaceUi.color')} type="color" value={editingRoleColor} onChange={(event) => setEditingRoleColor(event.target.value)} /></label>
                      <label className="block text-xs text-text-secondary">{t('workspaceUi.position')} <input type="number" value={editingRolePosition} onChange={(event) => setEditingRolePosition(Number(event.target.value))} className="mt-1 w-full rounded-md border border-border bg-background-primary px-2 py-1.5 text-text-primary" /></label>
                      <label className="flex items-center gap-2 text-xs text-text-secondary"><input type="checkbox" checked={editingRoleDisplaySeparately} onChange={(event) => setEditingRoleDisplaySeparately(event.target.checked)} />{t('workspaceUi.displaySeparately')}</label>
                      <label className="flex items-center gap-2 text-xs text-text-secondary"><input type="checkbox" checked={editingRoleMentionable} onChange={(event) => setEditingRoleMentionable(event.target.checked)} />{t('workspaceUi.allowMentions')}</label>
                      <div className="grid grid-cols-2 gap-1">{PERMISSIONS.map((permission) => <label key={permission} className="flex items-center gap-1 text-[10px] text-text-secondary"><input type="checkbox" checked={editingRolePermissions.includes(permission)} onChange={(event) => setEditingRolePermissions((current) => event.target.checked ? [...new Set([...current, permission])] : current.filter((item) => item !== permission))} />{communityPermissionLabel(permission, t)}</label>)}</div>
                      <div className="flex gap-2"><Button size="sm" variant="secondary" loading={busy === `role:${role.id}`} onClick={() => void saveRole()}>{t('common.save')}</Button><Button size="sm" variant="ghost" onClick={() => setEditingRoleId(null)}>{t('common.cancel')}</Button></div>
                    </> : <div className="flex items-center justify-between gap-2"><span className="truncate text-xs" style={{ color: role.color }}>{role.name}</span><div className="flex shrink-0 gap-1"><button type="button" aria-label={t('workspaceUi.editRole', { name: role.name })} onClick={() => beginRoleEdit(role)} className="rounded p-1 text-text-secondary hover:text-text-primary"><Pencil size={13} /></button><button type="button" aria-label={t('workspaceUi.deleteRole', { name: role.name })} disabled={busy === `role:${role.id}`} onClick={() => void deleteRole(role.id)} className="rounded p-1 text-red-300 disabled:opacity-50"><Trash2 size={13} /></button></div></div>}
                  </div>)}
                </div>
                <div className="space-y-2 border-t border-border pt-2">
                  <p className="text-xs font-medium text-text-secondary">{t('workspaceUi.assignRoleToMember')}</p>
                  <select aria-label={t('workspaceUi.assignRoleToMember')} value={roleMemberId} onChange={(event) => setRoleMemberId(event.target.value)} className="w-full rounded-md border border-border bg-background-secondary px-2 py-1.5 text-xs text-text-primary"><option value="">{t('workspaceModeration.selectMember')}</option>{state?.members.filter((member) => member.userId !== currentUserId).map((member) => <option key={member.userId} value={member.userId}>{member.user.displayName}</option>)}</select>
                  <select aria-label={t('workspaceUi.selectRole')} value={roleToAssign} onChange={(event) => setRoleToAssign(event.target.value)} className="w-full rounded-md border border-border bg-background-secondary px-2 py-1.5 text-xs text-text-primary"><option value="">{t('workspaceUi.selectRole')}</option>{state?.roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select>
                  <Button size="sm" variant="secondary" disabled={!roleMemberId || !roleToAssign} loading={busy?.startsWith('member-role:') ?? false} onClick={() => void changeMemberRole(roleMemberId, roleToAssign)}>{t('workspaceUi.assignRole')}</Button>
                  {state?.members.filter((member) => member.userId !== state.community.ownerUserId && member.roles.length > 0).map((member) => <div key={member.userId} className="space-y-1 rounded-md bg-background-secondary p-2"><p className="truncate text-xs text-text-primary">{member.user.displayName}</p>{member.roles.map((role) => <div key={role.id} className="flex items-center justify-between gap-2"><span className="truncate text-[11px] text-text-secondary">{role.name}</span><button type="button" disabled={busy === `member-role:${member.userId}:${role.id}`} onClick={() => void changeMemberRole(member.userId, role.id, true)} className="text-[11px] text-red-300 disabled:opacity-50">{t('common.remove')}</button></div>)}</div>)}
                </div>
              </section>}
              {canManageInvites && managementSection === 'invites' && <section className="space-y-2">
                <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase text-text-secondary"><Smile size={13} /> {t('workspaceUi.invites')}</h3>
                <label className="block text-xs text-text-secondary">{t('workspaceUi.expiry')} <select value={inviteExpiryDays} onChange={(event) => setInviteExpiryDays(event.target.value)} className="mt-1 w-full rounded-md border border-border bg-background-secondary px-2 py-1.5 text-text-primary"><option value="1">{t('workspaceUi.oneDay')}</option><option value="7">{t('workspaceUi.sevenDays')}</option><option value="30">{t('workspaceUi.thirtyDays')}</option><option value="">{t('workspaceUi.noExpiryValue')}</option></select></label>
                <label className="block text-xs text-text-secondary">{t('workspaceUi.maxUses')} <input type="number" min={1} max={10000} value={inviteMaxUses} onChange={(event) => setInviteMaxUses(event.target.value)} placeholder={t('workspaceUi.unlimited')} className="mt-1 w-full rounded-md border border-border bg-background-secondary px-2 py-1.5 text-text-primary" /></label>
                <Button size="sm" variant="secondary" loading={busy === 'invite'} onClick={() => void createInvite()}>{t('workspaceUi.createInvite')}</Button>
                {inviteToken && <div className="space-y-2 rounded-md bg-background-secondary p-2"><p className="break-all text-xs text-text-secondary">anceryx://invite/{inviteToken}</p><Button size="sm" variant="ghost" onClick={() => void copyInviteLink()} leftIcon={<Copy size={13} />}>{t('workspaceUi.copyLink')}</Button></div>}
                {invites.map((invite) => <div key={invite.id} className="flex items-center justify-between gap-2 rounded-md bg-background-secondary p-2"><span className="min-w-0 text-[11px] text-text-secondary">{invite.revokedAt ? t('workspaceUi.revoked') : invite.expiresAt && new Date(invite.expiresAt).getTime() <= Date.now() ? t('workspaceUi.expired') : t('workspaceUi.inviteUseCount', { count: invite.uses })}{invite.maxUses ? `/${invite.maxUses}` : ''} · {invite.expiresAt ? formatDate(new Date(invite.expiresAt)) : t('workspaceUi.noExpiryValue')}</span>{!invite.revokedAt && <button type="button" disabled={busy === `invite:${invite.id}`} onClick={() => void revokeInvite(invite.id)} className="shrink-0 text-[11px] text-red-300 disabled:opacity-50">{t('workspaceUi.revoke')}</button>}</div>)}
              </section>}
              {canManageBans && bannedMembersSection}
              {canCreateModerationActions && moderationActionForm}
              {canViewModerationCases && moderationCasesSection}
              {canViewAuditLog && auditLogSection}
              </div>
            </div>
          )}
          {canShowModerationPanel && !canOpenManagement && <details className="border-t border-border p-3"><summary className="cursor-pointer list-none text-xs font-semibold uppercase text-text-secondary hover:text-text-primary">{canCreateModerationActions ? t('workspaceUi.moderationSection') : t('workspaceUi.auditSection')}</summary><div className="mt-3 space-y-4">{canManageBans && bannedMembersSection}{canCreateModerationActions && moderationActionForm}{canViewModerationCases && moderationCasesSection}{canViewAuditLog && !canCreateModerationActions && auditLogSection}</div></details>}


  </>

  return (
    <div
      className={presentation === 'embedded' ? 'h-full min-h-0 w-full min-w-0' : 'motion-backdrop-in fixed inset-x-0 bottom-0 top-[var(--app-titlebar-height)] z-[60] flex bg-background-primary'}
      onClick={(event) => presentation === 'modal' && event.target === event.currentTarget && onClose()}
      role={presentation === 'modal' ? 'dialog' : undefined}
      aria-modal={presentation === 'modal' ? true : undefined}
      aria-label={presentation === 'modal' ? t('workspaceUi.communityDefaultTitle') : undefined}
    >
      <div className={`grid h-full min-h-0 w-full min-w-0 grid-cols-1 overflow-hidden bg-background-secondary ${presentation === 'modal' ? 'motion-surface-in' : ''} ${presentation === 'embedded' ? (voiceCallLayout ? 'md:grid-cols-[240px_minmax(0,1fr)]' : membersOpen ? 'md:grid-cols-[240px_minmax(0,1fr)] xl:grid-cols-[240px_minmax(0,1fr)_260px]' : 'md:grid-cols-[240px_minmax(0,1fr)] xl:grid-cols-[240px_minmax(0,1fr)_44px]') : (voiceCallLayout ? 'md:grid-cols-[64px_240px_minmax(0,1fr)]' : membersOpen ? 'md:grid-cols-[64px_240px_minmax(0,1fr)] xl:grid-cols-[64px_240px_minmax(0,1fr)_260px]' : 'md:grid-cols-[64px_240px_minmax(0,1fr)] xl:grid-cols-[64px_240px_minmax(0,1fr)_44px]')}`}>
        {presentation === 'modal' && <nav className="hidden flex-col items-center gap-2 border-r border-border bg-background-primary py-3 md:flex" aria-label={t('workspaceUi.globalNavigation')}>
          {([
            ['feed', Home, t('workspaceUi.sectionFeed')], ['mensagens', MessageCircle, t('workspaceUi.sectionMessages')], ['explore', Compass, t('workspaceUi.sectionExplore')], ['foruns', Users, t('workspaceUi.sectionForums')], ['perfil', User, t('workspaceUi.sectionProfile')],
          ] as const).map(([section, Icon, label]) => <button key={section} type="button" onClick={() => { onClose(); onNavigateGlobal?.(section) }} className="grid h-10 w-10 place-items-center rounded-xl text-text-secondary transition hover:bg-background-tertiary hover:text-text-primary" aria-label={t('workspaceUi.backToSection', { name: label })} title={label}><Icon size={18} /></button>)}
          <div className="mt-auto flex flex-col items-center gap-2">
            <div className="grid h-10 w-10 place-items-center overflow-hidden rounded-xl border border-border bg-background-tertiary" title={state?.community.name ?? t('workspaceUi.communityDefaultTitle')}>{state?.community.iconUrl && !iconFailed ? <img src={mediaApi.resolvePublicUrl(state.community.iconUrl)} alt="" className="h-full w-full object-cover" onError={() => { console.warn('[media] Community identity image failed to load'); setIconFailed(true) }} /> : <Users size={17} className="text-accent" />}</div>
            <button type="button" onClick={() => { onClose(); onNavigateGlobal?.('perfil') }} aria-label={t('workspaceUi.openFullProfile')}><Avatar src={currentUserAvatar} name={currentUserName} size="sm" /></button>
          </div>
        </nav>}
        <aside className={["flex min-h-0 flex-col overflow-hidden border-border bg-background-tertiary/45 md:flex md:border-r", mobileView === 'channels' ? 'flex' : 'hidden md:flex'].join(' ')}>
          <div className="relative h-16 shrink-0 bg-background-tertiary sm:h-24">
            {state?.community.bannerUrl && !bannerFailed && <img src={mediaApi.resolvePublicUrl(state.community.bannerUrl)} alt="" className="absolute inset-0 h-full w-full object-cover" onError={() => { console.warn('[media] Community banner failed to load'); setBannerFailed(true) }} />}
            <button onClick={onClose} className="absolute right-2 top-2 rounded-md bg-black/50 p-1.5 text-white" aria-label={t('common.close')}>
              <X size={16} />
            </button>
          </div>
          <div className="shrink-0 px-3 py-3">
            <div ref={forumMenuRef} className="relative">
              <button type="button" aria-haspopup="menu" aria-expanded={forumMenuOpen} onClick={() => setForumMenuOpen((open) => !open)} className="flex min-h-10 w-full items-center justify-between gap-2 rounded-lg px-2 text-left text-base font-bold leading-tight text-text-primary hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                <span className="min-w-0 truncate">{state?.community.name ?? t('workspaceUi.forumDefaultTitle')}</span><ChevronDown size={16} className={`shrink-0 transition-transform ${forumMenuOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
              </button>
              {forumMenuOpen && <div role="menu" aria-label={t('workspaceUi.forumActions')} className="absolute left-0 top-full z-[80] mt-1 max-h-[65vh] w-full min-w-52 overflow-y-auto rounded-xl border border-border bg-background-secondary p-1.5 shadow-2xl">
                {canManageInvites && <button role="menuitem" type="button" onClick={() => openCommunityManagement('invites')} className="flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-sm text-text-primary hover:bg-background-tertiary"><Users size={15} />{t('workspaceUi.inviteMembers')}</button>}
                {(canManageLegacyForum || canManageChannels || canManageRoles || canManageInvites || isCommunityOwner) && <button role="menuitem" type="button" onClick={() => openCommunityManagement(canManageLegacyForum ? 'profile' : canManageChannels ? 'organization' : canManageRoles ? 'roles' : canManageInvites ? 'invites' : 'preferences')} className="flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-sm text-text-primary hover:bg-background-tertiary"><Settings size={15} />{t('workspaceUi.forumSettings')}</button>}
                {canManageChannels && <>
                  <button role="menuitem" type="button" onClick={() => openCommunityManagement('organization')} className="flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-sm text-text-primary hover:bg-background-tertiary"><Plus size={15} />{t('workspaceUi.createChannel')}</button>
                  <button role="menuitem" type="button" onClick={() => { setNewCategoryName(''); openCommunityManagement('organization') }} className="flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-sm text-text-primary hover:bg-background-tertiary"><Plus size={15} />{t('workspaceUi.createCategory')}</button>
                </>}
                {hasCommunityPermission('createTopics') && <button role="menuitem" type="button" onClick={() => { setForumMenuOpen(false); setSelectedChannelId(null); setShowCommunityPosts(true); setShowEvents(false); setMobileView('content') }} className="flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-sm text-text-primary hover:bg-background-tertiary"><MessageSquare size={15} />{t('communityForum.createPost')}</button>}
                {canManageEvents && <button role="menuitem" type="button" onClick={() => { setForumMenuOpen(false); setShowEvents(true); setShowCommunityPosts(false); void refreshEvents() }} className="flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-sm text-text-primary hover:bg-background-tertiary"><CalendarPlus size={15} />{t('workspaceUi.createEvent')}</button>}
                <button role="menuitem" type="button" onClick={() => { setForumMenuOpen(false); void navigator.clipboard.writeText(communityId).then(() => addNotification(t('workspaceUi.forumIdCopied'), 'success')).catch(() => addNotification(t('workspaceUi.operationFailed'), 'error')) }} className="flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-sm text-text-primary hover:bg-background-tertiary"><CopyIcon size={15} />{t('workspaceUi.copyForumId')}</button>
                <button role="menuitem" type="button" onClick={() => { setForumMenuOpen(false); void navigator.clipboard.writeText(`anceryx://forum/${communityId}`).then(() => addNotification(t('workspaceUi.appLinkCopied'), 'success')).catch(() => addNotification(t('workspaceUi.operationFailed'), 'error')) }} className="flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-sm text-text-primary hover:bg-background-tertiary"><Share2 size={15} />{t('workspaceUi.shareForum')}</button>
                {state && state.community.ownerUserId !== currentUserId && <><div className="my-1 border-t border-border" /><button role="menuitem" type="button" onClick={() => void leaveForum()} className="flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-sm text-red-300 hover:bg-background-tertiary"><LogOut size={15} />{t('workspaceUi.leaveForum')}</button></>}
              </div>}
            </div>
            {state && <button type="button" onClick={() => { setMembersOpen(true); setMobileView('members') }} className="mt-3 flex min-h-9 w-full items-center justify-center gap-2 rounded-lg border border-border bg-background-secondary px-3 text-sm text-text-primary hover:bg-white/5 md:hidden" aria-label={t('workspaceUi.membersSettings')}><Users size={15} />{t('workspaceUi.membersSettings')}</button>}
          </div>
          {loading ? (
            <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2 text-sm text-text-secondary"><Loader2 size={15} className="animate-spin" /> {t('common.loading')}</div>
          ) : error ? (
            <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2 text-sm text-accent-red">{error}</div>
          ) : (
            <nav className="min-h-0 flex-1 overflow-y-auto px-2 pb-4 anceryx-scroll">
              {sidebarCategories.map((category) => {
                const channels = groupedChannels.get(category.id) ?? []
                if (channels.length === 0) return null
                return (
                  <section key={category.id} className="mb-3">
                    <div className="mb-1 flex items-center gap-1">
                      <button type="button" aria-expanded={!collapsedCategories.has(category.id)} aria-controls={`community-category-${communityId}-${category.id}`} onClick={() => setCollapsedCategories((current) => { const next = new Set(current); if (next.has(category.id)) next.delete(category.id); else next.add(category.id); return next })} className="flex min-h-8 min-w-0 flex-1 items-center justify-between gap-2 rounded px-2 text-left text-[11px] font-semibold uppercase text-text-secondary hover:text-text-primary"><span className="truncate">{category.name}</span><span aria-hidden="true">{collapsedCategories.has(category.id) ? '+' : '−'}</span></button>
                      {canManageChannels && <button type="button" title={t('workspaceUi.createChannelIn', { name: category.name })} aria-label={t('workspaceUi.createChannelIn', { name: category.name })} onClick={() => { setNewChannelCategoryId(category.id === 'uncategorized' ? '' : category.id); openCommunityManagement('organization') }} className="grid h-8 w-8 shrink-0 place-items-center rounded text-text-secondary hover:bg-background-secondary hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"><Plus size={14} /></button>}
                    </div>
                    <div id={`community-category-${communityId}-${category.id}`} hidden={collapsedCategories.has(category.id)} className="flex flex-col gap-1">
                      {channels.map((channel) => (
                        <React.Fragment key={channel.id}><button
                          onClick={() => { setSelectedChannelId(channel.id); try { localStorage.setItem(`anceryx:forum-channel:${communityId}`, channel.id) } catch { /* Keep navigation working when storage is unavailable. */ } setShowCommunityPosts(false); setMobileView('content') }}
                          aria-current={selectedChannelId === channel.id ? 'page' : undefined}
                          className={[
                            'motion-control flex min-h-10 min-w-0 items-center justify-between gap-2 rounded-lg border border-transparent px-2.5 text-left text-sm transition-colors',
                            selectedChannelId === channel.id ? 'border-accent/30 bg-accent/15 font-semibold text-text-primary shadow-sm shadow-accent/10' : 'text-text-secondary hover:border-border/70 hover:bg-background-secondary/70 hover:text-text-primary',
                          ].join(' ')}
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            {CHANNEL_ICONS[channel.type]}
                            <span className="truncate">{channel.type === 'forum' ? t('workspaceUi.publications') : channel.name}</span>
                          </span>
                          {channel.type === 'voice' && (
                            <span className="shrink-0 rounded-full bg-background-primary/50 px-2 py-0.5 text-[10px] tabular-nums text-text-secondary" aria-label={t('workspaceUi.connectedParticipantCount', { count: state?.voiceStates.filter((item) => item.channelId === channel.id).length ?? 0 })}>
                              {state?.voiceStates.filter((item) => item.channelId === channel.id).length ?? 0}
                            </span>
                          )}
                        </button>
                        {channel.type === 'voice' && (state?.voiceStates.filter((item) => item.channelId === channel.id) ?? []).length > 0 && <div className="ml-6 flex flex-col gap-1 pb-1">{state?.voiceStates.filter((item) => item.channelId === channel.id).slice(0, 3).map((voice) => <button key={voice.userId} type="button" onClick={(event) => { event.stopPropagation(); const rect = event.currentTarget.getBoundingClientRect(); setVoiceProfileTarget({ userId: voice.userId, x: rect.left, y: rect.bottom }) }} className="flex min-h-8 min-w-0 items-center gap-2 rounded-md px-1 text-left text-[11px] text-text-secondary hover:bg-background-tertiary hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" aria-label={t('workspaceUi.openProfileFor', { name: voice.user.displayName })}><Avatar src={voice.user.avatarUrl} name={voice.user.displayName} size="xs" /><span className="min-w-0 truncate">{voice.user.displayName}{voice.selfMuted || voice.serverMuted ? ' · microfone mudo' : ''}</span></button>)}{(state?.voiceStates.filter((item) => item.channelId === channel.id).length ?? 0) > 3 && <span className="pl-1 text-[10px] text-text-secondary">+{(state?.voiceStates.filter((item) => item.channelId === channel.id).length ?? 0) - 3} {t('workspaceUi.people')}</span>}</div>}</React.Fragment>
                      ))}
                    </div>
                  </section>
                )
              })}
              {!state?.channels.some((channel) => channel.type === 'forum') && <button type="button" onClick={() => { setSelectedChannelId(null); setShowCommunityPosts(true); setMobileView('content') }} className={`mt-2 flex min-h-9 w-full items-center gap-2 rounded-md px-2 text-left text-sm ${showCommunityPosts ? 'bg-accent text-white' : 'text-text-secondary hover:bg-white/5 hover:text-text-primary'}`}><MessageSquare size={14} /><span>{t('communityForum.posts')}</span></button>}
            </nav>
          )}
          {viewerVoiceState && <section className="sticky bottom-0 border-t border-border bg-background-primary p-3 shadow-[0_-8px_20px_rgba(0,0,0,0.15)]" aria-label={t('workspaceUi.persistentVoiceControls')}><div className="mb-2 flex items-center justify-between gap-2"><button type="button" onClick={() => { setSelectedChannelId(viewerVoiceState.channelId); setShowCommunityPosts(false); setShowEvents(false); setMobileView('content') }} className="min-w-0 text-left"><span className="block text-[10px] font-semibold uppercase tracking-wide text-emerald-300">{t('workspaceUi.connectedVoice')}</span><span className="block truncate text-sm font-semibold text-text-primary">{viewerVoiceChannel?.name ?? t('workspaceUi.voiceChannel')}</span></button><span className="shrink-0 text-[10px] text-text-secondary">{voiceStatusLabel}</span></div><CommunityVoiceActionButtons muted={communityVoiceClient.muted} deafened={communityVoiceClient.deafened} sharingScreen={communityVoiceClient.isScreenSharing} screenPickerLoading={screenPickerLoading} leaving={busy === 'voice:leave'} onToggleMuted={() => void communityVoiceClient.setMuted(!communityVoiceClient.muted)} onToggleDeafened={() => void communityVoiceClient.setDeafened(!communityVoiceClient.deafened)} onToggleScreenShare={() => void toggleVoiceScreenShare()} onLeave={() => void leaveVoice()} /></section>}
        </aside>

        <main className={["motion-view-forward min-h-0 min-w-0 flex-col overflow-hidden md:motion-view-in", mobileView === 'content' ? 'flex' : 'hidden md:flex'].join(' ')}>
          <header className="flex min-h-14 items-center justify-between border-b border-border px-4">
            <div className="flex min-w-0 items-center gap-2">
              <button type="button" onClick={() => setMobileView('channels')} className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-text-secondary hover:bg-white/10 md:hidden" aria-label={t('workspaceUi.backToChannels')}><ArrowLeft size={18} /></button>
              {showCommunityPosts ? <MessageSquare size={16} /> : selectedChannel ? CHANNEL_ICONS[selectedChannel.type] : <Hash size={16} />}
              <div className="min-w-0">
                <h3 className="truncate text-sm font-semibold text-text-primary">{showCommunityPosts ? t('workspaceUi.publications') : selectedChannel?.name ?? t('workspaceUi.selectChannel')}</h3>
                {selectedChannel?.description && <p className="truncate text-xs text-text-secondary">{selectedChannel.description}</p>}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {selectedChannel?.type === 'voice' && canViewSelectedChannel && <Button variant={voiceChatOpen ? 'secondary' : 'ghost'} size="sm" onClick={() => { setVoiceChatOpen((open) => !open); if (!voiceChatOpen) setMembersOpen(false) }} leftIcon={<MessageCircle size={14} />} aria-pressed={voiceChatOpen}>{t('workspaceUi.chat')}</Button>}
              <button type="button" onClick={() => { setVoiceChatOpen(false); setMembersOpen(true); setMobileView('members') }} className={`grid h-9 w-9 place-items-center rounded-lg text-text-secondary hover:bg-white/10 ${viewingConnectedVoice ? '' : 'xl:hidden'}`} aria-label={t('workspaceUi.showMembers')} title={t('workspaceUi.showMembers')}><Users size={16} /></button>
              <Button variant="ghost" size="sm" onClick={() => void refresh()} leftIcon={<RefreshCw size={14} />}>{t('workspaceModeration.refresh')}</Button>
              <Button variant={showEvents ? 'secondary' : 'ghost'} size="sm" onClick={() => { setShowEvents((value) => !value); if (!showEvents) void refreshEvents() }} leftIcon={<CalendarDays size={14} />}>{t('workspaceUi.events')}</Button>
            </div>
          </header>

          {showEvents ? (
            <section className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
              {canManageEvents && <form className="space-y-2 rounded-xl border border-border bg-background-primary p-4" onSubmit={(event) => { event.preventDefault(); void createEvent() }}>
                <h4 className="font-semibold text-text-primary">{t('workspaceUi.createEvent')}</h4>
                <Input value={eventTitle} onChange={(event) => setEventTitle(event.target.value)} maxLength={120} placeholder={t('workspaceUi.eventTitle')} aria-label={t('workspaceUi.eventTitle')} />
                <Input value={eventDescription} onChange={(event) => setEventDescription(event.target.value)} maxLength={4000} placeholder={t('workspaceUi.eventDescription')} aria-label={t('workspaceUi.eventDescription')} />
                <label className="block text-xs text-text-secondary">{t('workspaceUi.dateTime')} <input required type="datetime-local" value={eventStartsAt} onChange={(event) => setEventStartsAt(event.target.value)} className="mt-1 block rounded-lg border border-border bg-background-secondary p-2 text-text-primary" /></label>
                <Button type="submit" loading={busy === 'event:create'}>{t('workspaceUi.publishEvent')}</Button>
              </form>}
              {events.map((item) => <article key={item.id} className="rounded-xl border border-border bg-background-primary p-4">
                <div className="flex flex-wrap items-start justify-between gap-2"><div><h4 className="font-semibold text-text-primary">{item.title}</h4><p className="text-xs text-text-secondary">{t('workspaceUi.by')} {item.creator.displayName} · {formatDateTime(new Date(item.startsAt))}</p></div>{item.status === 'cancelled' ? <span className="text-xs text-text-secondary">{t('workspaceUi.cancelled')}</span> : new Date(item.startsAt).getTime() <= Date.now() ? <span className="text-xs text-text-secondary">{t('common.done')}</span> : null}</div>
                {item.description && <p className="mt-2 whitespace-pre-wrap text-sm text-text-secondary">{item.description}</p>}
                <p className="mt-2 text-xs text-text-secondary">{item.participants.length} {t('workspaceUi.participants')}{item.participants.length ? `: ${item.participants.map((person) => person.user.displayName).join(', ')}` : ''}</p>
                {editingEventId === item.id && <form className="mt-3 space-y-2 border-t border-border pt-3" onSubmit={async (event) => { event.preventDefault(); setBusy(`event:${item.id}`); try { await communityApi.updateEvent(communityId, item.id, { title: eventTitle.trim(), description: eventDescription.trim(), startsAt: new Date(eventStartsAt).toISOString() }); setEditingEventId(null); await refreshEvents() } catch (reason) { setError(reason instanceof Error ? reason.message : t('workspaceUi.operationFailed')) } finally { setBusy(null) } }}><Input value={eventTitle} onChange={(event) => setEventTitle(event.target.value)} maxLength={120} aria-label={t('workspaceUi.eventTitle')} /><Input value={eventDescription} onChange={(event) => setEventDescription(event.target.value)} maxLength={4000} aria-label={t('workspaceUi.eventDescription')} /><input required type="datetime-local" value={eventStartsAt} onChange={(event) => setEventStartsAt(event.target.value)} className="rounded-lg border border-border bg-background-secondary p-2 text-sm text-text-primary" /><Button type="submit" size="sm" loading={busy === `event:${item.id}`}>{t('workspaceUi.saveChanges')}</Button><Button type="button" size="sm" variant="ghost" onClick={() => setEditingEventId(null)}>{t('workspaceUi.cancelEdit')}</Button></form>}
                {item.status === 'scheduled' && new Date(item.startsAt).getTime() > Date.now() && <div className="mt-3 flex flex-wrap items-center gap-2"><Button size="sm" variant={item.viewerHasRsvped ? 'secondary' : 'primary'} onClick={async () => { try { if (item.viewerHasRsvped) await communityApi.cancelRsvp(communityId, item.id); else await communityApi.rsvpEvent(communityId, item.id, 15); await refreshEvents() } catch (reason) { setError(reason instanceof Error ? reason.message : t('workspaceUi.operationFailed')) }}}>{item.viewerHasRsvped ? t('workspaceUi.cancelPresence') : t('workspaceUi.confirmPresence')}</Button>{item.viewerHasRsvped && <label className="text-xs text-text-secondary">{t('workspaceUi.reminder')} <select value={item.participants.find((person) => person.userId === currentUserId)?.reminderMinutes ?? 15} onChange={async (event) => { try { await communityApi.rsvpEvent(communityId, item.id, Number(event.target.value)); await refreshEvents() } catch (reason) { setError(reason instanceof Error ? reason.message : t('workspaceUi.operationFailed')) } }} className="ml-1 rounded border border-border bg-background-secondary p-1"><option value={0}>{t('workspaceUi.disabled')}</option><option value={15}>{t('workspaceUi.reminder15')}</option><option value={60}>{t('workspaceUi.reminderHour')}</option><option value={1440}>{t('workspaceUi.oneDay')}</option></select></label>}{(canManageEvents || item.creatorUserId === currentUserId) && <><Button size="sm" variant="ghost" onClick={() => { setEditingEventId(item.id); setEventTitle(item.title); setEventDescription(item.description); setEventStartsAt(new Date(new Date(item.startsAt).getTime() - new Date(item.startsAt).getTimezoneOffset() * 60_000).toISOString().slice(0, 16)) }}>{t('common.edit')}</Button><Button size="sm" variant="danger" onClick={async () => { try { await communityApi.cancelEvent(communityId, item.id); await refreshEvents() } catch (reason) { setError(reason instanceof Error ? reason.message : t('workspaceUi.operationFailed')) } }}>{t('workspaceUi.cancelEvent')}</Button></>}</div>}
              </article>)}
              {events.length === 0 && <p className="py-8 text-center text-sm text-text-secondary">{t('workspaceUi.noEvents')}</p>}
            </section>
          ) : showCommunityPosts ? (
            <CommunityForumChannel forumId={communityId} currentUserId={currentUserId} canCreateTopics={hasCommunityPermission('createTopics')} />
          ) : selectedChannel?.isPrivate && !canViewSelectedChannel ? (
            <section className="flex flex-1 items-center justify-center p-6 text-center text-sm text-text-secondary">{t('workspaceUi.privateAccess')}</section>
          ) : selectedChannel?.type === 'voice' ? (
            <section className="flex min-h-0 min-w-0 flex-1 gap-2 overflow-hidden p-2 sm:gap-3 sm:p-3">
            <div className={`${voiceChatOpen ? 'hidden md:flex' : 'flex'} min-h-0 min-w-0 flex-1 flex-col items-center gap-3 overflow-y-auto overscroll-contain p-2 text-center sm:gap-4`}>
              <Volume2 size={36} className="text-accent" />
              <div>
                <h4 className="text-lg font-semibold text-text-primary">{selectedChannel.name}</h4>
                <p className="text-sm text-text-secondary">{voiceParticipants.length} {t('workspaceUi.connected')}</p>
              </div>
              <div className="grid w-full flex-none content-start grid-cols-[repeat(auto-fit,minmax(min(100%,15rem),1fr))] gap-2 sm:gap-3" aria-label={t('workspaceUi.connectedParticipants')}>
                {voiceParticipants.map((participant) => {
                  const isSelf = participant.userId === currentUserId
                  const isSharing = isSelf ? communityVoiceClient.isScreenSharing : communityVoiceClient.getRemoteScreenShares().some((share) => share.userId === participant.userId)
                  const speaking = isSelf ? communityVoiceClient.isLocallySpeaking : false
                  return <button key={participant.userId} type="button" onClick={(event) => { const rect = event.currentTarget.getBoundingClientRect(); setVoiceProfileTarget({ userId: participant.userId, x: rect.left, y: rect.bottom }) }} className={`flex min-w-0 items-center justify-between gap-3 rounded-2xl border bg-background-primary p-4 text-left transition ${speaking ? 'border-emerald-400 ring-2 ring-emerald-400/30' : 'border-border hover:border-accent/50'} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent`} aria-label={t('workspaceUi.openProfileFor', { name: participant.user.displayName })}>
                    <div className="flex min-w-0 items-center gap-3"><Avatar src={participant.user.avatarUrl} name={participant.user.displayName} size="md" /><div className="min-w-0"><p className="truncate text-sm font-semibold text-text-primary">{participant.user.displayName}{isSelf ? ` (${t('workspaceUi.you')})` : ''}</p><p className="truncate text-[11px] text-text-secondary">{participant.selfDeafened || participant.serverDeafened ? t('workspaceUi.audioDisabled') : participant.selfMuted || participant.serverMuted ? t('workspaceUi.microphoneMuted') : t('workspaceUi.microphoneActive')}{speaking ? ` · ${t('workspaceUi.speaking')}` : ''}</p></div></div>
                    {isSharing && <span className="shrink-0 rounded-full bg-red-500/15 px-2 py-1 text-[10px] font-semibold text-red-200">{t('workspaceUi.broadcasting')}</span>}
                  </button>
                })}
                {voiceParticipants.length === 0 && <p className="col-span-full rounded-xl border border-dashed border-border p-5 text-sm text-text-secondary">{t('workspaceUi.nobodyInVoice')}</p>}
              </div>
              {!viewerInSelectedVoice && <div className="flex flex-wrap justify-center gap-2"><Button onClick={() => void joinVoice(selectedChannel)} loading={busy === `voice:${selectedChannel.id}`} leftIcon={<Mic size={15} />}>{t('workspaceUi.joinVoice')}</Button></div>}
              {communityVoiceClient.isScreenSharing && communityVoiceClient.getLocalScreenShare() && <figure className="w-full max-w-5xl flex-none overflow-hidden rounded-xl border border-accent/40 bg-background-secondary text-left"><figcaption className="border-b border-border px-3 py-2 text-xs font-semibold text-text-primary">{t('workspaceUi.yourBroadcast')}</figcaption><video ref={(element) => { const stream = communityVoiceClient.getLocalScreenShare(); if (element && stream && element.srcObject !== stream) element.srcObject = stream }} autoPlay muted playsInline className="aspect-video max-h-[min(55vh,720px)] w-full bg-black object-contain" aria-label={t('workspaceUi.screenPreview')} /></figure>}
              {communityVoiceClient.getRemoteScreenShares().filter((share) => voiceParticipants.some((participant) => participant.userId === share.userId)).map((share) => <figure key={share.userId} className="w-full max-w-3xl flex-none overflow-hidden rounded-lg border border-border bg-background-secondary text-left">
                <figcaption className="border-b border-border px-3 py-2 text-xs font-medium text-text-primary">{t('workspaceUi.sharedBy')} {voiceParticipants.find((participant) => participant.userId === share.userId)?.user.displayName ?? 'participante'}</figcaption>
                <video ref={(element) => { if (element && element.srcObject !== share.stream) element.srcObject = share.stream }} autoPlay playsInline className="aspect-video max-h-[min(55vh,720px)] w-full bg-black object-contain" aria-label={t('workspaceUi.screenSharedBy', { name: voiceParticipants.find((participant) => participant.userId === share.userId)?.user.displayName ?? t('workspaceUi.participants') })} />
              </figure>)}
            </div>
            {voiceChatOpen && <aside className="flex min-h-0 w-full min-w-0 flex-col border-l border-border bg-background-primary/60 p-2 sm:p-3 md:w-[min(22rem,38vw)] md:max-w-[38vw] md:shrink-0" aria-label={t('workspaceUi.channelChat', { name: selectedChannel.name })}><header className="mb-2 flex shrink-0 items-center justify-between gap-2 border-b border-border pb-2"><div className="min-w-0"><h4 className="text-sm font-semibold text-text-primary">{t('workspaceUi.voiceChat')}</h4><p className="truncate text-[11px] text-text-secondary">{selectedChannel.name}</p></div><button type="button" onClick={() => setVoiceChatOpen(false)} className="shrink-0 rounded p-1 text-text-secondary hover:bg-background-tertiary" aria-label={t('workspaceUi.closeChat')}><X size={15} /></button></header>{selectedChannel.viewerCanReadHistory === false ? <p className="py-6 text-center text-xs text-text-secondary">{t('workspaceUi.historyDenied')}</p> : <><div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain py-2">{messages.length ? messages.map((message) => <article key={message.id} className="min-w-0"><div className="flex items-baseline gap-2"><strong className="truncate text-xs text-text-primary">{message.author.displayName}</strong><time className="shrink-0 text-[10px] text-text-secondary">{formatTimestamp(new Date(message.createdAt))}</time><button type="button" onClick={() => setReplyTarget(message)} className="rounded p-1 text-text-secondary hover:bg-background-tertiary" aria-label={t('workspaceUi.replyMessage')}><Reply size={12} /></button>{message.author.id !== currentUserId && <button type="button" onClick={() => { setMessageReportTarget(message); setMessageReportChannelId(selectedChannel.id); setMessageReportReason('spam'); setMessageReportDetails('') }} className="rounded p-1 text-text-secondary hover:bg-background-tertiary" aria-label={t('workspaceUi.reportMessage')}><Flag size={12} /></button>}</div>{message.replyTo && <p className="mt-1 truncate border-l-2 border-accent pl-2 text-[10px] text-text-secondary">{message.replyTo.author?.displayName ?? t('forumManage.role.member')}: {message.replyTo.excerpt ?? ''}</p>}{message.contentType === 'sticker' ? <img src={getKaoliSticker(message.stickerKey)?.asset} alt={t('workspaceUi.sticker')} className="mt-1 h-24 w-24 object-contain" /> : <><p className="whitespace-pre-wrap break-words text-xs text-text-secondary">{renderAnceryxText(message.content)}</p>{message.mediaUrl && <MediaAttachment src={message.mediaUrl} mimeType={message.mediaMimeType ?? (message.mediaUrl.toLowerCase().split('?')[0].endsWith('.mp4') ? 'video/mp4' : 'image/gif')} privateMedia alt={t('workspaceUi.voiceChatMedia')} className="mt-1 block h-auto max-h-48 max-w-full rounded-lg" />}</>}</article>) : <p className="py-6 text-center text-xs text-text-secondary">{t('workspaceUi.noMessages')}</p>}</div>{replyTarget && <div className="border-t border-border py-2 text-[11px] text-text-secondary">{t('workspaceUi.replyingTo')} {replyTarget.author.displayName}<button type="button" className="ml-2 underline" onClick={() => setReplyTarget(null)}>{t('common.cancel')}</button></div>}{selectedChannel.viewerCanSendMessages === false ? <p className="border-t border-border pt-2 text-xs text-text-secondary">{t('workspaceUi.readOnlyChannel')}</p> : <MessageComposer value={messageDraft} onChange={setMessageDraft} onSend={() => void createMessage()} disabled={busy === 'message' || loading} imagePreview={messageFile && messageFilePreview ? { url: messageFilePreview, previewUrl: messageFilePreview, mimeType: messageFile.type as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' | 'video/mp4', sizeBytes: messageFile.size, name: messageFile.name } : null} imageLoading={busy === 'message' && Boolean(messageFile)} imageProgress={messageUploadProgress} onCancelUpload={() => messageUploadControllerRef.current?.abort()} onPickImage={async (file) => { if (!file || !selectedChannel) return; if (selectedChannel.viewerCanAttachFiles === false) { addNotification(t('workspaceUi.filePermissionDenied'), 'error'); return } if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4'].includes(file.type)) { addNotification(t('workspaceUi.fileTypesAllowed'), 'error'); return } try { const max = await mediaApi.getUploadLimit('community-message', { communityId, channelId: selectedChannel.id }); if (file.size > max) { addNotification(t('workspaceUi.fileTooLarge', { value: Math.floor(max / 1_000_000) }), 'error'); return } if (messageFilePreview) URL.revokeObjectURL(messageFilePreview); setMessageFile(file); setMessageFilePreview(URL.createObjectURL(file)) } catch (error) { addNotification(error instanceof Error ? error.message : t('workspaceUi.operationFailed'), 'error') } }} onRemoveImage={() => { messageUploadControllerRef.current?.abort(); if (messageFilePreview) URL.revokeObjectURL(messageFilePreview); setMessageFile(null); setMessageFilePreview(null) }} onPickGif={(gif) => void createMessage({ contentType: 'gif', gif })} onPickSticker={(stickerKey) => void createMessage({ contentType: 'sticker', stickerKey })} />}</>}</aside>}
            </section>
          ) : selectedChannel?.type === 'forum' ? (
            <CommunityForumChannel forumId={communityId} currentUserId={currentUserId} canCreateTopics={hasCommunityPermission('createTopics')} />
          ) : (
            <section className="flex min-h-0 flex-1 flex-col">
              <div className="flex-1 overflow-y-auto px-4 py-4">
                {messages.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-text-secondary">{t('workspaceUi.noMessagesShort')}</div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {messages.map((message, index) => {
                      const previous = messages[index - 1]
                      const grouped = previous?.author.id === message.author.id && new Date(message.createdAt).getTime() - new Date(previous.createdAt).getTime() < 5 * 60_000
                      const sticker = message.contentType === 'sticker' ? getKaoliSticker(message.stickerKey) : undefined
                      return <article id={`community-message-${message.id}`} key={message.id} className="flex gap-3">
                        {grouped ? <div className="w-9 shrink-0" /> : <Avatar src={message.author.avatarUrl} name={message.author.displayName} size="sm" />}
                        <div className="min-w-0">
                          {message.replyTo && <button type="button" onClick={() => document.getElementById(`community-message-${message.replyTo!.messageId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })} className="mb-1 block max-w-full truncate border-l-2 border-accent pl-2 text-left text-xs text-text-secondary">{message.replyTo.deleted ? t('workspaceUi.deletedMessage') : `${message.replyTo.author?.displayName ?? t('workspaceUi.unknownUser')}: ${message.replyTo.excerpt ?? ''}`}</button>}
                          <div className="flex flex-wrap items-baseline gap-2">
                            {grouped ? <span className="sr-only">{message.author.displayName}</span> : <strong className="text-sm text-text-primary">{message.author.displayName}</strong>}
                            <span className="text-[11px] text-text-secondary">{formatTimestamp(new Date(message.createdAt))}</span><button type="button" onClick={() => setReplyTarget(message)} className="rounded p-1 text-text-secondary hover:bg-background-tertiary hover:text-text-primary" aria-label={t('workspaceUi.replyMessage')} title={t('workspaceUi.replyMessage')}><Reply size={13} /></button>{message.author.id !== currentUserId && <button type="button" onClick={() => { setMessageReportTarget(message); setMessageReportChannelId(selectedChannel?.id ?? null); setMessageReportReason('spam'); setMessageReportDetails('') }} className="rounded p-1 text-text-secondary hover:bg-background-tertiary hover:text-text-primary" aria-label={t('workspaceUi.reportMessage')} title={t('workspaceUi.reportMessage')}><Flag size={13} /></button>}
                          </div>
                          {message.contentType === 'sticker' ? sticker ? <img src={sticker.asset} alt={sticker.name} className="h-32 w-32 object-contain" draggable={false} /> : <p className="text-sm text-text-secondary">{t('workspaceUi.stickerUnavailable')}</p> : <><p className="whitespace-pre-wrap break-words text-sm text-text-secondary">{renderAnceryxText(message.content)}</p>{message.mediaUrl && <MediaAttachment src={message.mediaUrl} mimeType={message.mediaMimeType ?? (message.mediaUrl.toLowerCase().split('?')[0].endsWith('.mp4') ? 'video/mp4' : 'image/gif')} privateMedia alt={t('workspaceUi.messageMedia')} className="mt-2 max-h-64 max-w-full rounded-lg" />}</>}
                        </div>
                      </article>
                    })}
                  </div>
                )}
              </div>
              {replyTarget && <div className="flex items-center gap-2 border-l-2 border-accent bg-background-secondary px-3 py-2 text-xs text-text-secondary"><span className="min-w-0 flex-1 truncate">{t('workspaceUi.replyingTo')} {replyTarget.author.displayName}: {replyTarget.content || (replyTarget.contentType === 'sticker' ? t('workspaceUi.sticker') : t('workspaceUi.attachment'))}</span><button type="button" onClick={() => setReplyTarget(null)} aria-label={t('workspaceUi.cancelReply')}><X size={14} /></button></div>}
              {selectedChannel?.isAnnouncement && !canPostAnnouncement ? <p className="rounded-lg border border-border p-3 text-xs text-text-secondary">{t('workspaceUi.announcementRestricted')}</p> : <MessageComposer
                value={messageDraft}
                onChange={setMessageDraft}
                onDraftBlur={() => { void channelDraft.persist() }}
                onDiscardDraft={() => { void channelDraft.discard() }}
                onSend={() => void createMessage()}
                disabled={busy === 'message' || loading}
                imagePreview={messageFile && messageFilePreview ? { url: messageFilePreview, previewUrl: messageFilePreview, mimeType: messageFile.type as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' | 'video/mp4', sizeBytes: messageFile.size, name: messageFile.name } : null}
                imageLoading={busy === 'message' && Boolean(messageFile)}
                imageProgress={messageUploadProgress}
                onCancelUpload={() => messageUploadControllerRef.current?.abort()}
                onPickImage={async (file) => {
                  if (!file || !selectedChannel) return
                  if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4'].includes(file.type)) { addNotification(t('workspaceUi.fileTypesAllowed'), 'error'); return }
                  try {
                    const max = await mediaApi.getUploadLimit('community-message', { communityId, channelId: selectedChannel.id })
                    if (file.size > max) { addNotification(t('workspaceUi.fileTooLarge', { value: Math.floor(max / 1_000_000) }), 'error'); return }
                    if (messageFilePreview) URL.revokeObjectURL(messageFilePreview)
                    setMessageFile(file)
                    setMessageFilePreview(URL.createObjectURL(file))
                  } catch (error) { addNotification(error instanceof Error ? error.message : t('workspaceUi.operationFailed'), 'error') }
                }}
                onRemoveImage={() => { messageUploadControllerRef.current?.abort(); if (messageFilePreview) URL.revokeObjectURL(messageFilePreview); setMessageFile(null); setMessageFilePreview(null) }}
                onPickGif={(gif) => void createMessage({ contentType: 'gif', gif })}
                onPickSticker={(stickerKey) => void createMessage({ contentType: 'sticker', stickerKey })}
              />}
            </section>
          )}
          {viewerVoiceState && <section className="sticky bottom-0 z-20 border-t border-border bg-background-primary/95 p-2 backdrop-blur md:hidden" aria-label={t('workspaceUi.voiceControls')}><div className="mb-1 flex items-center justify-between gap-2"><span className="truncate text-xs font-semibold text-text-primary">{t('workspaceUi.voicePrefix')} {viewerVoiceChannel?.name ?? t('workspaceUi.connectedLabel')}</span><span className="text-[10px] text-text-secondary">{voiceStatusLabel}</span></div><CommunityVoiceActionButtons compact muted={communityVoiceClient.muted} deafened={communityVoiceClient.deafened} sharingScreen={communityVoiceClient.isScreenSharing} screenPickerLoading={screenPickerLoading} leaving={busy === 'voice:leave'} onToggleMuted={() => void communityVoiceClient.setMuted(!communityVoiceClient.muted)} onToggleDeafened={() => void communityVoiceClient.setDeafened(!communityVoiceClient.deafened)} onToggleScreenShare={() => void toggleVoiceScreenShare()} onLeave={() => void leaveVoice()} /></section>}
        </main>

        <aside className={`${membersPanelClassName} overflow-y-auto`}>
          <div className="border-b border-border p-3">
            <button type="button" onClick={() => { setMembersOpen(false); setMobileView('content') }} className="text-xs font-semibold uppercase text-text-secondary hover:text-text-primary">{t('workspaceUi.members')} <span className="ml-1 normal-case">{mobileView === 'members' ? t('workspaceUi.backToContent') : t('workspaceUi.hideMembers')}</span></button>
            {state?.community.memberListMode === 'grouped_roles' ? groupedMemberEntries.map((group) => <section key={group.key} className="mt-3 first:mt-2"><h3 className="mb-1 truncate text-[10px] font-semibold uppercase tracking-wide text-text-secondary">{group.label} · {group.members.length}</h3><div className="flex flex-col gap-1.5">{group.members.map((member) => (
                <button key={member.userId} type="button" onClick={() => setSelectedMember(member)} className="flex items-center gap-2 rounded-lg p-1 text-left hover:bg-white/5">
                  <Avatar src={member.user.avatarUrl} name={member.user.displayName} size="xs" />
                  <div className="min-w-0">
                    <p className="truncate text-sm text-text-primary">{member.user.displayName}</p>
                    <p className="truncate text-[11px] text-text-secondary">{getCommunityMemberRoleLabels(member, t).join(' · ') || t('forumManage.role.member')}</p>
                  </div>
                </button>
              ))}</div></section>) : <div className="mt-2 flex flex-col gap-2">{(state?.members ?? []).map((member) => (
                <button key={member.userId} type="button" onClick={() => setSelectedMember(member)} className="flex items-center gap-2 rounded-lg p-1 text-left hover:bg-white/5"><Avatar src={member.user.avatarUrl} name={member.user.displayName} size="xs" /><div className="min-w-0"><p className="truncate text-sm text-text-primary">{member.user.displayName}</p><p className="truncate text-[11px] text-text-secondary">{getCommunityMemberRoleLabels(member, t).join(' · ') || t('forumManage.role.member')}</p></div></button>
              ))}</div>}
          </div>
        </aside>
        {!membersOpen && !viewingConnectedVoice && <button type="button" onClick={() => setMembersOpen(true)} className="hidden place-items-center border-l border-border text-text-secondary hover:text-text-primary xl:grid" aria-label={t('workspaceUi.showMembers')} title={t('workspaceUi.showMembers')}><Users size={17} /></button>}
      </div>
      {screenPickerOpen && <div className="titlebar-overlay fixed inset-x-0 bottom-0 top-9 z-[90] flex items-center justify-center bg-black/75 p-4" role="dialog" aria-modal="true" aria-label={t('workspaceUi.shareScreen')}><section className="w-full max-w-2xl rounded-2xl border border-border bg-background-secondary p-5 shadow-2xl"><div className="flex items-start justify-between gap-3"><div><h2 className="text-lg font-semibold text-text-primary">{t('workspaceUi.shareScreen')}</h2><p className="mt-1 text-sm text-text-secondary">{t('workspaceUi.screenShareHelp')}</p></div><button type="button" onClick={() => setScreenPickerOpen(false)} aria-label={t('workspaceUi.closeSelector')} className="rounded-md p-2 text-text-secondary hover:bg-background-tertiary"><X size={16} /></button></div><div className="mt-4 grid max-h-[55vh] grid-cols-1 gap-3 overflow-y-auto sm:grid-cols-2">{screenSources.map((source) => <button key={source.id} type="button" disabled={screenPickerLoading} onClick={() => void startScreenShareFromSource(source.id)} className="overflow-hidden rounded-xl border border-border bg-background-primary text-left transition hover:border-accent/60 disabled:opacity-60">{source.thumbnail ? <img src={source.thumbnail} alt="" className="aspect-video w-full bg-black object-contain" /> : <div className="grid aspect-video place-items-center bg-background-tertiary"><MonitorUp size={26} className="text-text-secondary" /></div>}<span className="block truncate px-3 py-2 text-sm font-medium text-text-primary">{source.name}</span></button>)}</div><div className="mt-4 flex justify-end"><Button variant="ghost" onClick={() => setScreenPickerOpen(false)}>{t('common.cancel')}</Button></div></section></div>}
      {managementOpen && <CommunityManagementModal communityName={state?.community.name ?? forum?.name ?? t('workspaceUi.communityDefaultTitle')} sections={managementSections} activeSection={managementSection} onSelectSection={setManagementSection} onClose={() => setManagementOpen(false)}>
        {managementSection === 'reports' && canManageReports ? communityMessageReportsSection : ['overview', 'profile', 'access', 'critical', 'posts', 'members', 'reports'].includes(managementSection) && forum && canManageLegacyForum ? <ForumManagementModal forum={forum} onClose={() => setManagementOpen(false)} onForumDeleted={onForumDeleted} presentation="embedded" initialTab={(managementSection === 'reports' ? 'moderation' : managementSection) as ForumManagementTab} /> : managementSection === 'moderation' ? <div className="space-y-4">
          <div><h2 className="text-xl font-semibold text-text-primary">{t('workspaceUi.moderation')}</h2><p className="mt-1 text-sm text-text-secondary">{t('workspaceUi.moderationHelp')}</p></div>
          {moderationSummaryError && <p role="alert" className="text-sm text-red-300">{moderationSummaryError}</p>}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-label={t('workspaceUi.moderationSummary')}>
            {moderationSummaryCards.map((card) => <button key={card.label} type="button" disabled={!card.onClick || moderationSummaryLoading} onClick={card.onClick} className="rounded-xl border border-border bg-background-secondary p-4 text-left transition-colors enabled:hover:border-accent/60 disabled:cursor-default"><span className="block text-xs text-text-secondary">{card.label}</span><span className="mt-1 block text-2xl font-semibold text-text-primary">{moderationSummaryLoading ? '…' : card.value?.toLocaleString('pt-BR') ?? '—'}</span></button>)}
          </div>
          <div className="flex flex-wrap gap-2" role="group" aria-label={t('workspaceUi.moderationTools')}>
            {([{ label: t('forumManage.overview'), action: undefined }, { label: t('workspaceUi.moderationWarnings'), action: 'warning' }, { label: t('workspaceUi.moderationTimeouts'), action: 'timeout' }, { label: t('workspaceUi.moderationKicks'), action: 'kick' }, { label: t('workspaceUi.moderationBans'), action: 'ban' }] as const).map((item) => <button key={item.label} type="button" onClick={() => { setModerationFilters(item.action ? { action: item.action } : {}); void loadModerationCases(0, item.action ? { action: item.action } : {}) }} className="rounded-lg border border-border px-3 py-2 text-sm text-text-secondary hover:bg-background-secondary hover:text-text-primary">{item.label}</button>)}
            <button type="button" onClick={() => { setModerationFilters({}); void loadModerationCases(0, {}) }} className="rounded-lg border border-border px-3 py-2 text-sm text-text-secondary hover:bg-background-secondary hover:text-text-primary">{t('workspaceUi.moderationHistory')}</button>
          </div>
          {canManageReports && <Button size="sm" variant="secondary" leftIcon={<Flag size={14} />} onClick={() => setManagementSection('reports')}>{t('workspaceModeration.messageReports')}</Button>}
          {canCreateModerationActions && moderationActionForm}
          {canManageBans && bannedMembersSection}
          {canViewModerationCases && moderationCasesSection}
        </div> : managementSection === 'appeals' ? <div className="space-y-4">
          <div><h2 className="text-xl font-semibold text-text-primary">{t('workspaceUi.resources')}</h2><p className="mt-1 text-sm text-text-secondary">{t('workspaceUi.appealHelp')}</p></div>
          {communityManagementContent}
        </div> : managementSection === 'audit' ? <div className="space-y-4"><h2 className="text-xl font-semibold text-text-primary">{t('workspaceUi.auditLog')}</h2>{auditLogSection}</div> : <div className="space-y-4">
          <div><h2 className="text-xl font-semibold text-text-primary">{managementSection === 'preferences' ? t('workspaceUi.preferencesTitle') : t('workspaceUi.managementTitle')}</h2><p className="mt-1 text-sm text-text-secondary">{managementSection === 'preferences' ? t('workspaceUi.preferencesDescription') : t('workspaceUi.managementDescription')}</p></div>
          {communityManagementContent}
        </div>}
      </CommunityManagementModal>}
      {messageReportTarget && <div className="titlebar-overlay fixed inset-x-0 bottom-0 top-9 z-[85] grid place-items-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-labelledby="community-message-report-title" onKeyDown={(event) => { if (event.key === 'Escape' && busy !== 'message-report:create') setMessageReportTarget(null) }}><form className="w-full max-w-md space-y-4 rounded-xl border border-border bg-background-secondary p-5" onSubmit={(event) => { event.preventDefault(); void submitMessageReport() }}><div><h2 id="community-message-report-title" className="font-semibold text-text-primary">{t('workspaceUi.reportMessage')}</h2><p className="mt-1 line-clamp-3 break-words text-xs text-text-secondary">{messageReportTarget.content || (messageReportTarget.contentType === 'sticker' ? t('workspaceUi.sticker') : t('workspaceUi.attachment'))}</p></div><label className="block text-xs text-text-secondary">{t('messages.reportReason')}<select value={messageReportReason} onChange={(event) => setMessageReportReason(event.target.value)} className="mt-1 w-full rounded-md border border-border bg-background-primary px-3 py-2 text-sm text-text-primary"><option value="spam">{t('workspaceUi.reportSpam')}</option><option value="harassment">{t('workspaceUi.reportHarassment')}</option><option value="inappropriate_content">{t('workspaceUi.reportInappropriate')}</option><option value="scam_or_fraud">{t('workspaceUi.reportFraud')}</option><option value="violence_or_threat">{t('workspaceUi.reportThreat')}</option><option value="personal_information">{t('workspaceUi.reportPersonalData')}</option><option value="other">{t('workspaceUi.other')}</option></select></label><label className="block text-xs text-text-secondary">{t('workspaceModeration.details')} {messageReportReason === 'other' ? t('workspaceUi.required') : t('workspaceUi.optional')}<textarea value={messageReportDetails} onChange={(event) => setMessageReportDetails(event.target.value.slice(0, 1000))} maxLength={1000} rows={3} className="mt-1 w-full rounded-md border border-border bg-background-primary p-2 text-sm text-text-primary" /></label><div className="flex justify-end gap-2"><Button type="button" variant="ghost" disabled={busy === 'message-report:create'} onClick={() => setMessageReportTarget(null)}>{t('common.cancel')}</Button><Button type="submit" loading={busy === 'message-report:create'} disabled={!messageReportChannelId || messageReportReason === 'other' && !messageReportDetails.trim()}>{t('workspaceUi.sendReport')}</Button></div></form></div>}
      {confirmDelete && <div className="titlebar-overlay fixed inset-x-0 bottom-0 top-9 z-[90] grid place-items-center bg-black/70 p-4" role="alertdialog" aria-modal="true" aria-label={t('workspaceUi.confirmDelete')}><div className="w-full max-w-sm space-y-4 rounded-xl border border-border bg-background-secondary p-5"><h2 className="font-semibold text-text-primary">{t('common.delete')} {confirmDelete.type === 'category' ? 'categoria' : t('workspaceUi.channelPlaceholder')}?</h2><p className="text-sm text-text-secondary">{confirmDelete.name}</p><div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setConfirmDelete(null)}>{t('common.cancel')}</Button><Button variant="danger" loading={busy === `${confirmDelete.type}:${confirmDelete.id}`} onClick={() => void (confirmDelete.type === 'category' ? deleteCategory(confirmDelete.id) : deleteChannel(confirmDelete.id))}>{t('common.delete')}</Button></div></div></div>}
      {voiceProfileTarget && (() => {
        const participant = voiceParticipants.find((item) => item.userId === voiceProfileTarget.userId)
        if (!participant) return null
        const member = state?.members.find((item) => item.userId === participant.userId)
        const left = Math.max(8, Math.min(voiceProfileTarget.x, window.innerWidth - 296))
        const top = Math.max(8, Math.min(voiceProfileTarget.y, window.innerHeight - 220))
        return <div className="titlebar-overlay fixed inset-0 z-[70]" role="presentation" onMouseDown={() => setVoiceProfileTarget(null)} onKeyDown={(event) => { if (event.key === 'Escape') setVoiceProfileTarget(null) }}><section role="dialog" aria-label={t('workspaceUi.profileOf', { name: participant.user.displayName })} className="absolute w-72 rounded-2xl border border-border bg-background-secondary p-4 text-left shadow-2xl" style={{ left, top }} onMouseDown={(event) => event.stopPropagation()}><div className="flex items-center gap-3"><Avatar src={participant.user.avatarUrl} name={participant.user.displayName} size="lg" /><div className="min-w-0"><h3 className="truncate text-sm font-semibold text-text-primary">{participant.user.displayName}</h3><p className="truncate text-xs text-text-secondary">@{participant.user.username}</p></div></div><div className="mt-3 flex flex-wrap gap-1">{member?.roles.map((role) => <span key={role.id} className="rounded-full border border-border px-2 py-0.5 text-[10px] text-text-secondary">{role.name}</span>)}{member && <span className="rounded-full border border-border px-2 py-0.5 text-[10px] text-text-secondary">{member.role === 'owner' ? t('workspaceUi.ownerRole') : member.role === 'moderator' ? t('workspaceUi.moderatorRole') : t('workspaceUi.memberRole')}</span>}</div><button type="button" onClick={() => { setVoiceProfileUsername(participant.user.username); setVoiceProfileTarget(null) }} className="mt-4 min-h-9 w-full rounded-lg bg-accent px-3 text-sm font-medium text-white hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">{t('workspaceUi.openFullProfile')}</button></section></div>
      })()}
      {selectedMember && state && <UserProfileModal username={selectedMember.user.username} communityContext={{ forumName: state.community.name, joinedAt: selectedMember.joinedAt, memberRole: selectedMember.role, roles: selectedMember.roles }} isOpen onClose={() => setSelectedMember(null)} />}
      {voiceProfileUsername && <UserProfileModal username={voiceProfileUsername} isOpen onClose={() => setVoiceProfileUsername(null)} />}
    </div>
  )
}

export default CommunityWorkspaceModal
