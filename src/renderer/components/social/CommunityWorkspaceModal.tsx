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

function moderationEffectLabel(effect: string): string {
  switch (effect) {
    case 'recorded_warning': return 'Advertência registrada'
    case 'timeout': return 'Silenciamento temporário'
    case 'membership_removed': return 'Remoção da participação'
    case 'ban': return 'Banimento'
    case 'reversed': return 'Revertido'
    default: return 'Efeito registrado'
  }
}

function withResolvedMessageMedia(message: CommunityMessageDto): CommunityMessageDto {
  return message.mediaUrl ? { ...message, mediaUrl: mediaApi.resolvePublicUrl(message.mediaUrl) } : message
}

const AUDIT_FIELD_LABELS: Record<string, string> = {
  name: 'Nome', color: 'Cor', position: 'Posição', mentionable: 'Menções', displaySeparately: 'Exibição separada',
  permissions: 'Permissões', categoryId: 'Categoria', type: 'Tipo', isPrivate: 'Canal privado', isAnnouncement: 'Canal de avisos',
  ageRestricted: 'Restrição etária', slowmodeSeconds: 'Intervalo entre mensagens', userLimit: 'Limite de participantes',
  mode: 'Exibição da lista de membros', roleIds: 'Cargos revisores', allow: 'Permissões permitidas', deny: 'Permissões negadas',
}

function formatAuditValue(value: CommunityAuditValue): string {
  if (value === null) return 'Nenhum'
  if (typeof value === 'boolean') return value ? 'Sim' : 'Não'
  if (Array.isArray(value)) return value.length ? value.join(', ') : 'Nenhum'
  return String(value)
}

function getAuditChanges(details: CommunityAuditLogDto['details']): CommunityAuditChange[] {
  const changes = details.changes
  return Array.isArray(changes) ? changes as CommunityAuditChange[] : []
}

const CommunityWorkspaceModal: React.FC<CommunityWorkspaceModalProps> = ({ communityId, forum, presentation = 'modal', onClose, onForumDeleted, onNavigateGlobal }) => {
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
    return groupCommunityMembersByRole(state?.members ?? [])
  }, [state?.members])
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
      addNotification('Você saiu do Fórum.', 'success')
      onClose()
    } catch (reason) {
      addNotification(reason instanceof Error ? reason.message : 'Não foi possível sair do Fórum.', 'error')
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
      addNotification(reason instanceof Error ? reason.message : 'Não foi possível carregar o histórico de moderação.', 'error')
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
      setAuditError(reason instanceof Error ? reason.message : 'Não foi possível carregar a auditoria do fórum.')
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
        setAppealQueueError('Seu cargo não está habilitado para revisar recursos. Um proprietário pode configurar os cargos revisores no gerenciamento do Fórum.')
      } else {
        setAppealQueueError(reason instanceof Error ? reason.message : 'Não foi possível consultar os recursos agora.')
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
    <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase text-text-secondary"><Shield size={13} /> Membros banidos</h3>
    {bans.length === 0 ? <p className="text-xs text-text-secondary">Nenhum membro banido.</p> : bans.map((ban) => <div key={ban.userId} className="flex items-center justify-between gap-2 rounded-md bg-background-secondary p-2"><div className="min-w-0"><p className="truncate text-xs text-text-primary">{ban.user.displayName}</p><p className="truncate text-[11px] text-text-secondary">{ban.reason || 'Sem motivo informado'}</p></div><button type="button" disabled={busy === `unban:${ban.userId}`} onClick={() => void unbanMember(ban.userId)} className="shrink-0 text-[11px] text-accent disabled:opacity-50">Desbanir</button></div>)}
  </section>
  const communityMessageReportsSection = <section className="space-y-3 rounded-xl border border-border bg-background-secondary p-3">
    <div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="font-semibold text-text-primary">Denúncias de mensagens</h2><p className="text-xs text-text-secondary">A fila respeita as permissões de acesso aos canais privados.</p></div><Button size="sm" variant="secondary" loading={communityReportsLoading} onClick={() => void loadCommunityReports(communityReportsOffset)}>Atualizar</Button></div>
    <div className="flex flex-wrap gap-2"><label className="text-xs text-text-secondary">Situação<select aria-label="Filtrar denúncias por situação" value={communityReportsStatus} onChange={(event) => setCommunityReportsStatus(event.target.value as CommunityMessageReportStatus | '')} className="ml-2 rounded-md border border-border bg-background-primary px-2 py-1.5 text-text-primary"><option value="">Todas</option><option value="pending">Pendentes</option><option value="reviewing">Em análise</option><option value="resolved">Concluídas</option><option value="dismissed">Arquivadas</option></select></label></div>
    {communityReportsError && <p role="alert" className="text-xs text-red-300">{communityReportsError}</p>}
    {communityReportsLoading && communityReports.length === 0 ? <p role="status" className="text-xs text-text-secondary">Carregando denúncias…</p> : communityReports.length === 0 ? <p className="rounded-lg border border-border p-4 text-center text-xs text-text-secondary">Não há denúncias para este filtro.</p> : communityReports.map((report) => <article key={report.id} className="space-y-2 rounded-lg border border-border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-medium text-text-primary">{report.reason === 'spam' ? 'Spam' : report.reason === 'harassment' ? 'Assédio' : report.reason === 'inappropriate_content' ? 'Conteúdo inadequado' : report.reason === 'scam_or_fraud' ? 'Golpe ou fraude' : report.reason === 'violence_or_threat' ? 'Violência ou ameaça' : report.reason === 'personal_information' ? 'Exposição de dados pessoais' : 'Outro motivo'} · {report.status === 'pending' ? 'Pendente' : report.status === 'reviewing' ? 'Em análise' : report.status === 'resolved' ? 'Concluída' : 'Arquivada'}</p><time className="text-[10px] text-text-secondary">{formatDateTime(new Date(report.createdAt))}</time></div>
      <p className="text-xs text-text-secondary">#{state?.channels.find((channel) => channel.id === report.message.channelId)?.name ?? 'canal'} · Mensagem de {report.message.author?.displayName ?? 'conta removida'}</p>
      <p className="whitespace-pre-wrap break-words rounded-md bg-background-primary p-2 text-xs text-text-primary">{report.message.content}</p>
      {report.details && <p className="whitespace-pre-wrap break-words text-xs text-text-secondary">Detalhes: {report.details}</p>}
      {report.resolutionNote && <p className="whitespace-pre-wrap break-words text-xs text-text-secondary">Registro da decisão: {report.resolutionNote}</p>}
      {report.status === 'pending' || report.status === 'reviewing' ? <><textarea aria-label="Observação da análise da denúncia" value={reportDecisionNotes[report.id] ?? ''} onChange={(event) => setReportDecisionNotes((current) => ({ ...current, [report.id]: event.target.value.slice(0, 1000) }))} maxLength={1000} rows={2} placeholder="Observação da decisão (opcional)" className="w-full rounded-md border border-border bg-background-primary p-2 text-xs text-text-primary" /><div className="flex flex-wrap gap-2"><Button size="sm" variant="secondary" disabled={report.status === 'reviewing'} loading={busy === `message-report:${report.id}`} onClick={() => void reviewCommunityReport(report.id, 'reviewing')}>Assumir análise</Button><Button size="sm" variant="secondary" loading={busy === `message-report:${report.id}`} onClick={() => void reviewCommunityReport(report.id, 'resolved')}>Concluir</Button><Button size="sm" variant="ghost" loading={busy === `message-report:${report.id}`} onClick={() => void reviewCommunityReport(report.id, 'dismissed')}>Arquivar</Button></div></> : null}
    </article>)}
    <div className="flex items-center justify-between"><Button size="sm" variant="ghost" disabled={communityReportsOffset === 0 || communityReportsLoading} onClick={() => void loadCommunityReports(Math.max(0, communityReportsOffset - 20))}>Anterior</Button><span className="text-[10px] text-text-secondary">{communityReports.length ? `Denúncias ${communityReportsOffset + 1}–${communityReportsOffset + communityReports.length}` : 'Sem resultados'}</span><Button size="sm" variant="ghost" disabled={!communityReportsHasMore || communityReportsLoading} onClick={() => void loadCommunityReports(communityReportsOffset + 20)}>Próxima</Button></div>
  </section>
  const moderationActionForm = selectedModerationAction && <div className="space-y-2 rounded-md bg-background-secondary p-2">
    <label className="block space-y-1 text-[10px] text-text-secondary">Ação<select aria-label="Ação de moderação" value={selectedModerationAction} onChange={(event) => setModerationAction(event.target.value as CommunityModerationAction)} className="w-full rounded-md border border-border bg-background-primary px-2 py-1.5 text-xs text-text-primary">{availableModerationActions.map((action) => <option key={action} value={action}>{({ warning: 'Advertência', timeout: 'Silenciamento', kick: 'Expulsão', ban: 'Banimento' })[action]}</option>)}</select></label>
    <select aria-label="Membro alvo da moderação" value={moderationTargetId} onChange={(event) => setModerationTargetId(event.target.value)} className="w-full rounded-md border border-border bg-background-primary px-2 py-1.5 text-xs text-text-primary"><option value="">Selecionar membro</option>{state?.members.filter((member) => member.userId !== currentUserId && member.userId !== state.community.ownerUserId).map((member) => <option key={member.userId} value={member.userId}>{member.user.displayName}</option>)}</select>
    <textarea aria-label="Motivo da ação de moderação" value={moderationReason} onChange={(event) => setModerationReason(event.target.value.slice(0, 1000))} maxLength={1000} rows={2} placeholder="Motivo da ação" className="w-full resize-y rounded-md border border-border bg-background-primary px-2 py-1.5 text-xs text-text-primary" />
    {selectedModerationAction === 'warning' && <>
      <textarea aria-label="Descrição complementar da advertência" value={warningDescription} onChange={(event) => setWarningDescription(event.target.value.slice(0, 2000))} maxLength={2000} rows={2} placeholder="Descrição complementar (opcional)" className="w-full resize-y rounded-md border border-border bg-background-primary px-2 py-1.5 text-xs text-text-primary" />
      <Input aria-label="Referência ao conteúdo relacionado" value={warningContentReference} onChange={(event) => setWarningContentReference(event.target.value.slice(0, 500))} maxLength={500} placeholder="Referência ao conteúdo (opcional)" />
      <textarea aria-label="Observação interna da moderação" value={warningInternalNote} onChange={(event) => setWarningInternalNote(event.target.value.slice(0, 2000))} maxLength={2000} rows={2} placeholder="Observação interna — visível apenas à moderação" className="w-full resize-y rounded-md border border-border bg-background-primary px-2 py-1.5 text-xs text-text-primary" />
    </>}
    {(selectedModerationAction === 'timeout' || selectedModerationAction === 'ban') && <label className="block space-y-1 text-[10px] text-text-secondary">Prazo (opcional)<input aria-label="Prazo da moderação" type="datetime-local" value={moderationExpiresAt} onChange={(event) => setModerationExpiresAt(event.target.value)} className="w-full rounded-md border border-border bg-background-primary px-2 py-1.5 text-xs text-text-primary" /><span className="block">Deixe vazio para não definir prazo.</span></label>}
    <Button size="sm" variant="secondary" disabled={!moderationTargetId || !moderationReason.trim()} loading={busy === 'moderation:create'} onClick={() => void applyModerationAction()}>{({ warning: 'Registrar advertência', timeout: 'Aplicar silenciamento', kick: 'Expulsar membro', ban: 'Banir membro' })[selectedModerationAction]}</Button>
  </div>
  const moderationCasesSection = canViewModerationCases && <section className="space-y-2">
    <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase text-text-secondary"><Shield size={13} /> Histórico de moderação</h3>
    <div className="grid grid-cols-2 gap-2 rounded-md bg-background-secondary p-2">
      <label className="space-y-1 text-[10px] text-text-secondary">Ação<select aria-label="Filtrar por ação" value={moderationFilters.action ?? ''} onChange={(event) => setModerationFilters((current) => ({ ...current, action: (event.target.value || undefined) as CommunityModerationCaseFilters['action'] }))} className="w-full rounded-md border border-border bg-background-primary px-2 py-1.5 text-xs text-text-primary"><option value="">Todas</option><option value="warning">Advertência</option><option value="timeout">Silenciamento</option><option value="kick">Expulsão</option><option value="ban">Banimento</option></select></label>
      <label className="space-y-1 text-[10px] text-text-secondary">Estado<select aria-label="Filtrar por estado" value={moderationFilters.status ?? ''} onChange={(event) => setModerationFilters((current) => ({ ...current, status: (event.target.value || undefined) as CommunityModerationCaseFilters['status'] }))} className="w-full rounded-md border border-border bg-background-primary px-2 py-1.5 text-xs text-text-primary"><option value="">Todos</option><option value="active">Ativo</option><option value="expired">Expirado</option><option value="corrected">Corrigido</option></select></label>
      <label className="space-y-1 text-[10px] text-text-secondary">Membro<select aria-label="Filtrar por membro" value={moderationFilters.targetUserId ?? ''} onChange={(event) => setModerationFilters((current) => ({ ...current, targetUserId: event.target.value || undefined }))} className="w-full rounded-md border border-border bg-background-primary px-2 py-1.5 text-xs text-text-primary"><option value="">Todos</option>{[...(state?.members ?? []).map((member) => ({ id: member.userId, name: member.user.displayName })), ...bans.map((ban) => ({ id: ban.userId, name: ban.user.displayName }))].filter((member, index, all) => all.findIndex((item) => item.id === member.id) === index).map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</select></label>
      <label className="space-y-1 text-[10px] text-text-secondary">Moderador<select aria-label="Filtrar por moderador" value={moderationFilters.actorUserId ?? ''} onChange={(event) => setModerationFilters((current) => ({ ...current, actorUserId: event.target.value || undefined }))} className="w-full rounded-md border border-border bg-background-primary px-2 py-1.5 text-xs text-text-primary"><option value="">Todos</option>{state?.members.map((member) => <option key={member.userId} value={member.userId}>{member.user.displayName}</option>)}</select></label>
      <label className="space-y-1 text-[10px] text-text-secondary">A partir de<input aria-label="Filtrar data inicial" type="date" value={moderationFilters.createdAfter?.slice(0, 10) ?? ''} onChange={(event) => setModerationFilters((current) => ({ ...current, createdAfter: event.target.value || undefined }))} className="w-full rounded-md border border-border bg-background-primary px-2 py-1.5 text-xs text-text-primary" /></label>
      <label className="space-y-1 text-[10px] text-text-secondary">Até<input aria-label="Filtrar data final" type="date" value={moderationFilters.createdBefore?.slice(0, 10) ?? ''} onChange={(event) => setModerationFilters((current) => ({ ...current, createdBefore: event.target.value || undefined }))} className="w-full rounded-md border border-border bg-background-primary px-2 py-1.5 text-xs text-text-primary" /></label>
      <label className="col-span-2 space-y-1 text-[10px] text-text-secondary">Recursos<select aria-label="Filtrar por recursos" value={moderationFilters.appealReview ?? ''} onChange={(event) => setModerationFilters((current) => ({ ...current, appealReview: (event.target.value || undefined) as CommunityModerationCaseFilters['appealReview'] }))} className="w-full rounded-md border border-border bg-background-primary px-2 py-1.5 text-xs text-text-primary"><option value="">Todos os casos</option><option value="pending">Com recurso pendente</option><option value="without_eligible_reviewer">Aguardando revisor elegível</option></select></label>
      <Button size="sm" variant="secondary" disabled={moderationLoading} loading={moderationLoading} onClick={applyModerationFilters}>Aplicar filtros</Button>
    </div>
    {moderationCases.length === 0 ? <p className="text-xs text-text-secondary">Nenhum caso encontrado com esses filtros.</p> : moderationCases.map((item) => <article key={item.id} className="rounded-md bg-background-secondary p-2">
      <p className="text-xs font-medium text-text-primary">{item.target.displayName} · {item.action === 'warning' ? 'Advertência' : item.action === 'timeout' ? 'Silenciamento temporário' : item.action === 'kick' ? 'Expulsão' : 'Banimento'}</p>
      <p className="mt-1 whitespace-pre-wrap break-words text-[11px] text-text-secondary">{item.reason}</p>
      {item.description && <p className="mt-1 whitespace-pre-wrap break-words text-[11px] text-text-secondary">{item.description}</p>}
      {item.contentReference && <p className="mt-1 break-all text-[10px] text-text-secondary">Conteúdo relacionado: {item.contentReference}</p>}
      {item.internalNote && <p className="mt-1 whitespace-pre-wrap break-words rounded border border-border p-2 text-[10px] text-text-secondary">Observação interna: {item.internalNote}</p>}
      <p className="mt-1 text-[10px] text-text-secondary">{formatDateTime(new Date(item.createdAt))}</p>
      <details className="mt-1 text-[10px]">
        <summary className="cursor-pointer text-accent">Detalhes, recursos e linha do tempo</summary>
        <div className="mt-2 space-y-2">
          <section className="rounded bg-background-primary p-2">
            <h4 className="font-semibold text-text-primary">Dados da medida</h4>
            <p className="mt-1">ID: <span className="break-all">{item.id}</span></p>
            <p>Responsável: {item.actor?.displayName ?? 'Conta removida'}</p>
            {item.expiresAt ? <p>Expira em: {formatDateTime(new Date(item.expiresAt))}</p> : (item.action === 'timeout' || item.action === 'ban') && <p>Sem prazo predeterminado</p>}
            {item.evidence.length > 0 && <div className="mt-1"><p className="font-medium">Evidências</p>{item.evidence.map((entry, index) => <p key={index} className="mt-1 break-all">{entry}</p>)}</div>}
            {item.correctionNote && <p className="mt-1">Correção registrada: {item.correctionNote}</p>}
          </section>
          <section className="rounded bg-background-primary p-2">
            <h4 className="font-semibold text-text-primary">Recursos ({item.appeals.length})</h4>
            {item.appeals.length === 0 ? <p className="mt-1">Nenhum recurso enviado.</p> : item.appeals.map((appeal) => <div key={appeal.id} className="mt-2 border-t border-border pt-2">
              <p className="break-all text-text-secondary">ID do recurso: {appeal.id}</p>
              <p className="font-medium">{appeal.appellant.displayName} · {appeal.status === 'pending' ? 'Pendente' : appeal.status === 'reviewing' ? 'Em análise' : appeal.status === 'upheld' ? 'Mantido' : appeal.status === 'reversed' ? 'Revertido' : appeal.status === 'closed_by_correction' ? 'Encerrado após correção' : 'Cancelado'}</p>
              <p className="mt-1 whitespace-pre-wrap break-words">{appeal.statement}</p>
              {appeal.additionalInfo && <p className="mt-1 whitespace-pre-wrap break-words">{appeal.additionalInfo}</p>}
              {appeal.evidence.map((entry, index) => <p key={index} className="mt-1 break-all">Evidência: {entry}</p>)}
              <p className="mt-1">Revisor: {appeal.reviewer?.displayName ?? appeal.assignedReviewer?.displayName ?? (appeal.status === 'pending' ? 'Aguardando revisor independente' : 'Não atribuído')}</p>
              <p className="mt-1">Revisores elegíveis atualmente: {appeal.eligibleReviewers.length ? appeal.eligibleReviewers.map((reviewer) => reviewer.displayName).join(', ') : 'Nenhum revisor elegível configurado'}</p>
              {appeal.decisionNote && <p className="mt-1 whitespace-pre-wrap break-words">Justificativa: {appeal.decisionNote}</p>}
              <p className="mt-1">Enviado em {formatDateTime(new Date(appeal.createdAt))}{appeal.decidedAt ? ' · Decidido em ' + formatDateTime(new Date(appeal.decidedAt)) : ''}</p>
            </div>)}
          </section>
          <section className="rounded bg-background-primary p-2">
            <h4 className="font-semibold text-text-primary">Linha do tempo de auditoria</h4>
            {item.timeline.length === 0 ? <p className="mt-1">Nenhum evento de auditoria disponível.</p> : <ol className="mt-1 space-y-2">{item.timeline.map((event) => <li key={event.id} className="border-l border-accent pl-2">
              <p className="font-medium text-text-primary">{event.type === 'case_created' ? 'Medida registrada' : event.type === 'appeal_submitted' ? 'Recurso enviado' : event.type === 'appeal_claimed' ? 'Recurso assumido para análise' : event.type === 'appeal_released' ? 'Recurso liberado para análise' : event.type === 'appeal_upheld' ? 'Recurso indeferido' : event.type === 'appeal_reversed' ? 'Medida revertida após recurso' : event.type === 'appeal_cancelled' ? 'Recurso cancelado' : 'Correção administrativa'}</p>
              <p className="break-all">ID do evento: {event.id}</p>
              <p>{event.actor?.displayName ?? 'Conta removida'} · {formatDateTime(new Date(event.occurredAt))}</p>
              {event.status && <p>Situação: {event.status === 'active' ? 'Ativo' : event.status === 'pending' ? 'Pendente' : event.status === 'reviewing' ? 'Em análise' : event.status === 'upheld' ? 'Mantido' : event.status === 'reversed' ? 'Revertido' : event.status === 'cancelled' ? 'Cancelado' : event.status === 'corrected' ? 'Corrigido' : event.status === 'closed_by_correction' ? 'Encerrado após correção' : event.status === 'expired' ? 'Expirado' : event.status}</p>}
              {event.action && <p>Ação: {event.action === 'warning' ? 'Advertência' : event.action === 'timeout' ? 'Silenciamento' : event.action === 'kick' ? 'Expulsão' : 'Banimento'}</p>}
              {event.note && <p className="whitespace-pre-wrap break-words">Justificativa: {event.note}</p>}
              {event.eligibleReviewerCount !== null && <p>Revisores elegíveis no envio: {event.eligibleReviewerCount}</p>}
              {event.independentReview !== null && <p>{event.independentReview ? 'Revisão independente' : 'Sem revisão independente'}</p>}
              {event.previousEffect && event.nextEffect && <p>Efeito: {moderationEffectLabel(event.previousEffect)} → {moderationEffectLabel(event.nextEffect)}</p>}
              {event.closedAppealCount !== null && <p>Recursos encerrados pela correção: {event.closedAppealCount}</p>}
            </li>)}</ol>}
          </section>
        </div>
      </details>
      {state?.community.ownerUserId === currentUserId && item.actorUserId === currentUserId && item.status !== 'corrected' && <details className="mt-2"><summary className="cursor-pointer text-[11px] text-accent">Correção administrativa pelo proprietário</summary><p className="mt-1 text-[10px] text-text-secondary">Esta operação corrige uma ação própria e não substitui revisão independente.</p><textarea aria-label="Motivo da correção administrativa" value={correctionNotes[item.id] ?? ''} onChange={(event) => setCorrectionNotes((current) => ({ ...current, [item.id]: event.target.value.slice(0, 2000) }))} maxLength={2000} rows={2} placeholder="Registre o motivo da correção" className="mt-2 w-full resize-y rounded-md border border-border bg-background-primary px-2 py-1.5 text-xs text-text-primary" /><Button size="sm" variant="secondary" disabled={!correctionNotes[item.id]?.trim()} loading={busy === 'correction:' + item.id} onClick={() => void correctOwnModerationCase(item.id)}>Corrigir ação</Button></details>}
    </article>)}
    <div className="flex items-center justify-between gap-2 text-[10px] text-text-secondary"><Button size="sm" variant="secondary" disabled={moderationOffset === 0 || moderationLoading} onClick={() => void loadModerationCases(Math.max(0, moderationOffset - 20))}>Anterior</Button><span>{moderationCases.length ? `Casos ${moderationOffset + 1}–${moderationOffset + moderationCases.length}` : 'Sem resultados'}{moderationLoading ? ' · Carregando…' : ''}</span><Button size="sm" variant="secondary" disabled={!moderationHasMore || moderationLoading} onClick={() => void loadModerationCases(moderationOffset + 20)}>Próxima</Button></div>
  </section>
  const auditLogSection = <section className="space-y-2">
    <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase text-text-secondary"><Shield size={13} /> Auditoria do fórum</h3>
    <div className="grid grid-cols-2 gap-2 rounded-md bg-background-secondary p-2">
      <label className="col-span-2 space-y-1 text-[10px] text-text-secondary">Ação exata<input aria-label="Filtrar ação da auditoria" value={auditFilters.action ?? ''} onChange={(event) => setAuditFilters((current) => ({ ...current, action: event.target.value || undefined }))} placeholder="community.role.update" maxLength={120} className="w-full rounded-md border border-border bg-background-primary px-2 py-1.5 text-xs text-text-primary" /></label>
      <label className="space-y-1 text-[10px] text-text-secondary">Responsável<select aria-label="Filtrar responsável da auditoria" value={auditFilters.actorUserId ?? ''} onChange={(event) => setAuditFilters((current) => ({ ...current, actorUserId: event.target.value || undefined }))} className="w-full rounded-md border border-border bg-background-primary px-2 py-1.5 text-xs text-text-primary"><option value="">Todos</option>{state?.members.map((member) => <option key={member.userId} value={member.userId}>{member.user.displayName}</option>)}</select></label>
      <label className="space-y-1 text-[10px] text-text-secondary">Membro afetado<select aria-label="Filtrar membro afetado na auditoria" value={auditFilters.targetUserId ?? ''} onChange={(event) => setAuditFilters((current) => ({ ...current, targetUserId: event.target.value || undefined }))} className="w-full rounded-md border border-border bg-background-primary px-2 py-1.5 text-xs text-text-primary"><option value="">Todos</option>{state?.members.map((member) => <option key={member.userId} value={member.userId}>{member.user.displayName}</option>)}</select></label>
      <label className="space-y-1 text-[10px] text-text-secondary">A partir de<input aria-label="Data inicial da auditoria" type="date" value={auditFilters.createdAfter?.slice(0, 10) ?? ''} onChange={(event) => setAuditFilters((current) => ({ ...current, createdAfter: event.target.value || undefined }))} className="w-full rounded-md border border-border bg-background-primary px-2 py-1.5 text-xs text-text-primary" /></label>
      <label className="space-y-1 text-[10px] text-text-secondary">Até<input aria-label="Data final da auditoria" type="date" value={auditFilters.createdBefore?.slice(0, 10) ?? ''} onChange={(event) => setAuditFilters((current) => ({ ...current, createdBefore: event.target.value || undefined }))} className="w-full rounded-md border border-border bg-background-primary px-2 py-1.5 text-xs text-text-primary" /></label>
      <Button size="sm" variant="secondary" loading={auditLoading} onClick={applyAuditFilters}>Aplicar filtros</Button>
    </div>
    {auditError && <p role="alert" className="text-xs text-red-300">{auditError}</p>}
    {!auditEvents.length && !auditLoading && !auditError && <p className="text-xs text-text-secondary">{auditLoaded ? 'Nenhum evento encontrado para esses filtros.' : 'Carregue os eventos para consultar a auditoria.'}</p>}
    {auditEvents.map((event) => {
      const changes = getAuditChanges(event.details)
      const metadata = Object.fromEntries(Object.entries(event.details).filter(([key]) => key !== 'changes'))
      return <article key={event.id} className="space-y-2 rounded-md bg-background-secondary p-2 text-[11px] text-text-secondary"><p className="break-all font-medium text-text-primary">{event.action}</p><p>ID: <span className="break-all">{event.id}</span></p><p>{event.actor?.displayName ?? 'Conta removida'}{event.target ? ` → ${event.target.displayName}` : ''} · {formatDateTime(new Date(event.createdAt))}</p>{changes.length > 0 && <div className="rounded bg-background-primary p-2"><p className="mb-1 font-semibold text-text-primary">Alterações</p><ul className="space-y-1">{changes.map((change, index) => <li key={`${change.field}-${index}`} className="break-words"><strong className="text-text-primary">{AUDIT_FIELD_LABELS[change.field] ?? change.field}:</strong> {formatAuditValue(change.before)} <span aria-label="alterado para">→</span> {formatAuditValue(change.after)}</li>)}</ul></div>}{Object.keys(metadata).length > 0 && <details className="rounded bg-background-primary p-2"><summary className="cursor-pointer text-text-primary">Outros detalhes permitidos</summary><pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words text-[10px]">{JSON.stringify(metadata, null, 2)}</pre></details>}</article>
    })}
    <div className="flex items-center justify-between gap-2 text-[10px] text-text-secondary"><Button size="sm" variant="secondary" disabled={auditOffset === 0 || auditLoading} onClick={() => void loadAuditEvents(Math.max(0, auditOffset - 20))}>Anterior</Button><span>{auditEvents.length ? `Eventos ${auditOffset + 1}–${auditOffset + auditEvents.length}` : auditLoading ? 'Carregando…' : 'Sem eventos'}</span><Button size="sm" variant="secondary" disabled={!auditHasMore || auditLoading} onClick={() => void loadAuditEvents(auditOffset + 20)}>Próxima</Button></div>
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
      setError(err instanceof Error ? err.message : 'Não foi possível abrir o fórum.')
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
    void communityApi.listInvites(communityId).then(({ invites: rows }) => { if (active) setInvites(rows) }).catch((reason) => addNotification(reason instanceof Error ? reason.message : 'Não foi possível carregar os convites.', 'error'))
    return () => { active = false }
  }, [addNotification, communityId, canManageInvites])

  useEffect(() => {
    if (!canManageBans) return
    let active = true
    void communityApi.listBans(communityId).then(({ bans: rows }) => { if (active) setBans(rows) }).catch((reason) => addNotification(reason instanceof Error ? reason.message : 'Não foi possível carregar os banimentos.', 'error'))
    return () => { active = false }
  }, [addNotification, canManageBans, communityId])

  useEffect(() => {
    if (!canLoadCommunityModerationHistory(canViewModerationCases)) return
    let active = true
    setModerationFilters({})
    setActiveModerationFilters({})
    void communityApi.listModerationCases(communityId, { limit: 20, offset: 0 }).then(({ cases, hasMore }) => { if (active) { setModerationCases(cases); setModerationHasMore(hasMore); setModerationOffset(0) } }).catch((reason) => addNotification(reason instanceof Error ? reason.message : 'Não foi possível carregar o histórico de moderação.', 'error'))
    return () => { active = false }
  }, [addNotification, canViewModerationCases, communityId])

  useEffect(() => {
    if (!managementOpen || managementSection !== 'moderation' || !canViewModerationSummary) return
    let active = true
    setModerationSummaryLoading(true)
    setModerationSummaryError(null)
    void communityApi.getModerationSummary(communityId)
      .then(({ summary }) => { if (active) setModerationSummary(summary) })
      .catch((reason) => { if (active) setModerationSummaryError(reason instanceof Error ? reason.message : 'Não foi possível carregar o resumo da moderação.') })
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
      setCommunityReportsError(reason instanceof Error ? reason.message : 'Não foi possível carregar as denúncias deste fórum.')
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
      addNotification('Denúncia enviada à moderação deste fórum.', 'success')
    } catch (reason) {
      addNotification(reason instanceof Error ? reason.message : 'Não foi possível enviar a denúncia.', 'error')
    } finally {
      setBusy(null)
    }
  }

  const reviewCommunityReport = async (reportId: string, status: Extract<CommunityMessageReportStatus, 'reviewing' | 'resolved' | 'dismissed'>) => {
    const note = reportDecisionNotes[reportId]?.trim()
    if (status !== 'reviewing' && !window.confirm(status === 'resolved' ? 'Encerrar esta denúncia como analisada?' : 'Arquivar esta denúncia?')) return
    setBusy(`message-report:${reportId}`)
    try {
      await communityApi.reviewMessageReport(communityId, reportId, { status, resolutionNote: note || undefined })
      await loadCommunityReports(communityReportsOffset)
      addNotification(status === 'reviewing' ? 'Denúncia assumida para análise.' : status === 'resolved' ? 'Denúncia encerrada.' : 'Denúncia arquivada.', 'success')
    } catch (reason) {
      addNotification(reason instanceof Error ? reason.message : 'Não foi possível atualizar a denúncia.', 'error')
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
      addNotification(action === 'warning' ? 'Advertência registrada.' : action === 'timeout' ? 'Silenciamento aplicado.' : action === 'kick' ? 'Membro expulso.' : 'Membro banido.', 'success')
    } catch (reason) {
      addNotification(reason instanceof Error ? reason.message : 'Não foi possível aplicar a ação de moderação.', 'error')
    } finally { setBusy(null) }
  }

  const correctOwnModerationCase = async (caseId: string) => {
    const note = correctionNotes[caseId]?.trim()
    if (!note || busy || !window.confirm('Confirmar a correção administrativa desta ação? O motivo ficará registrado na auditoria.')) return
    setBusy(`correction:${caseId}`)
    try {
      await communityApi.correctOwnModerationCase(communityId, caseId, note)
      setCorrectionNotes((current) => ({ ...current, [caseId]: '' }))
      await loadModerationCases(moderationOffset)
      addNotification('Correção administrativa registrada.', 'success')
    } catch (reason) {
      addNotification(reason instanceof Error ? reason.message : 'Não foi possível corrigir a ação.', 'error')
    } finally { setBusy(null) }
  }

  const updateMemberListMode = async (mode: 'simple' | 'grouped_roles') => {
    if (state?.community.ownerUserId !== currentUserId) return
    setBusy('member-list-mode')
    try {
      await communityApi.updateMemberListMode(communityId, mode)
      await refresh()
      addNotification('Exibição da lista de membros atualizada.', 'success')
    } catch (reason) {
      addNotification(reason instanceof Error ? reason.message : 'Não foi possível atualizar a lista de membros.', 'error')
    } finally { setBusy(null) }
  }

  const toggleAppealReviewerRole = async (roleId: string, selected: boolean) => {
    if (state?.community.ownerUserId !== currentUserId) return
    const next = selected ? [...new Set([...reviewerRoleIds, roleId])] : reviewerRoleIds.filter((id) => id !== roleId)
    setBusy('appeal-reviewer-roles')
    try {
      const result = await communityApi.setAppealReviewerRoles(communityId, next)
      setReviewerRoleIds(result.roleIds)
      addNotification('Cargos revisores atualizados.', 'success')
    } catch (reason) {
      addNotification(reason instanceof Error ? reason.message : 'Não foi possível atualizar os cargos revisores.', 'error')
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
      addNotification('Recurso enviado e aguardando revisão independente.', 'success')
    } catch (reason) {
      addNotification(reason instanceof Error ? reason.message : 'Não foi possível enviar o recurso.', 'error')
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
      addNotification('Decisão do recurso registrada.', 'success')
    } catch (reason) {
      addNotification(reason instanceof Error ? reason.message : 'Não foi possível revisar o recurso.', 'error')
    } finally { setBusy(null) }
  }

  const claimAppeal = async (appealId: string) => {
    if (busy) return
    setBusy(`appeal:claim:${appealId}`)
    try {
      await communityApi.claimModerationAppeal(communityId, appealId)
      setAppealQueue((await communityApi.listModerationAppeals(communityId)).appeals)
      await loadModerationCases(moderationOffset)
      addNotification('Recurso assumido para análise.', 'success')
    } catch (reason) {
      addNotification(reason instanceof Error ? reason.message : 'Não foi possível assumir o recurso.', 'error')
    } finally { setBusy(null) }
  }

  const releaseAppeal = async (appealId: string) => {
    if (busy || !window.confirm('Liberar este recurso para outro revisor?')) return
    setBusy(`appeal:release:${appealId}`)
    try {
      await communityApi.releaseModerationAppeal(communityId, appealId)
      setAppealQueue((await communityApi.listModerationAppeals(communityId)).appeals)
      await loadModerationCases(moderationOffset)
      addNotification('Recurso liberado para outro revisor.', 'success')
    } catch (reason) {
      addNotification(reason instanceof Error ? reason.message : 'Não foi possível liberar o recurso.', 'error')
    } finally { setBusy(null) }
  }

  const unbanMember = async (userId: string) => {
    setBusy(`unban:${userId}`)
    try {
      await communityApi.unbanMember(communityId, userId)
      setBans((current) => current.filter((ban) => ban.userId !== userId))
      addNotification('Banimento removido.', 'success')
    } catch (reason) {
      addNotification(reason instanceof Error ? reason.message : 'Não foi possível remover o banimento.', 'error')
    } finally {
      setBusy(null)
    }
  }

  const refreshEvents = async () => {
    try { setEvents((await communityApi.listEvents(communityId)).events) }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível carregar os eventos.') }
  }
  useEffect(() => { void refreshEvents() }, [communityId])

  const createEvent = async () => {
    if (!eventTitle.trim() || !eventStartsAt || busy) return
    setBusy('event:create')
    try {
      await communityApi.createEvent(communityId, { title: eventTitle.trim(), description: eventDescription.trim(), startsAt: new Date(eventStartsAt).toISOString(), channelId: selectedChannelId })
      setEventTitle(''); setEventDescription(''); setEventStartsAt(''); await refreshEvents()
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível criar o evento.') }
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
          .catch(() => setError('Não foi possível sincronizar os participantes do canal de voz.'))
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
          setError('A navegação até mensagens antigas depende da versão atualizada da API.')
          try { localStorage.removeItem(`anceryx:forum-message:${communityId}`) } catch { /* Ignore unavailable storage. */ }
          return
        }
        setMessages(response.messages.map(withResolvedMessageMedia))
        if (targetMessageId) window.setTimeout(() => {
          document.getElementById(`community-message-${targetMessageId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
          try { localStorage.removeItem(`anceryx:forum-message:${communityId}`) } catch { /* Navigation remains usable without storage. */ }
        }, 0)
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Não foi possível carregar as mensagens.'))
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
    const content = input?.contentType === 'sticker' ? input.stickerKey ?? '' : input?.contentType === 'gif' ? input.gif?.title || input.gif?.slug || '' : messageDraft.trim() || (messageFile ? 'Mídia' : '')
    if (!content || !selectedChannel || (selectedChannel.type !== 'text' && selectedChannel.type !== 'voice') || busy === 'message') return
    setBusy('message')
    setMessageUploadProgress(0)
    try {
      let mediaAssetId: string | undefined
      if (messageFile && !input) { const controller = new AbortController(); messageUploadControllerRef.current = controller; mediaAssetId = (await mediaApi.uploadFile('community-message', messageFile, undefined, { communityId, channelId: selectedChannel.id }, { signal: controller.signal, onProgress: (progress) => setMessageUploadProgress(progress.percent) })).id }
      if (input?.contentType === 'gif' && input.gif) {
        if (!isSafeKlipyMediaUrl(input.gif.url)) throw new Error('Este GIF não possui uma origem segura.')
        const mediaResponse = await fetch(input.gif.url)
        if (!mediaResponse.ok) throw new Error('Não foi possível baixar o GIF selecionado.')
        const blob = await mediaResponse.blob()
        if (blob.type !== 'image/gif') throw new Error('A KLIPY não retornou um arquivo GIF compatível.')
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
      addNotification(err instanceof Error ? err.message : 'Falha ao enviar mensagem.', 'error')
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
      addNotification(err instanceof Error ? err.message : 'Falha ao criar categoria.', 'error')
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
      addNotification('Categoria atualizada.', 'success')
    } catch (reason) {
      addNotification(reason instanceof Error ? reason.message : 'Não foi possível atualizar a categoria.', 'error')
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
      addNotification(reason instanceof Error ? reason.message : 'Não foi possível reordenar as categorias.', 'error')
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
      addNotification(reason instanceof Error ? reason.message : 'Não foi possível reordenar os canais.', 'error')
      await refresh()
    } finally { setBusy(null) }
  }

  const syncChannelPermissionsFromCategory = async (channel: CommunityChannelDto) => {
    if (!channel.categoryId) return
    const overrides = (state?.overrides ?? []).filter((override) => override.channelId === channel.id && (override.allow.length > 0 || override.deny.length > 0))
    if (!overrides.length) {
      addNotification('Este canal já herda as permissões da categoria.', 'success')
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
      addNotification('Permissões sincronizadas com a categoria.', 'success')
    } catch (reason) {
      await refresh()
      addNotification(reason instanceof Error ? reason.message : 'Não foi possível sincronizar as permissões.', 'error')
    } finally { setBusy(null) }
  }

  const deleteCategory = async (categoryId: string) => {
    setBusy(`category:${categoryId}`)
    try {
      await communityApi.deleteCategory(communityId, categoryId)
      setConfirmDelete(null)
      await refresh()
      addNotification('Categoria excluída. Os canais vinculados permanecem sem categoria.', 'success')
    } catch (reason) {
      addNotification(reason instanceof Error ? reason.message : 'Não foi possível excluir a categoria.', 'error')
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
      addNotification(err instanceof Error ? err.message : 'Falha ao criar canal.', 'error')
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
      addNotification('Canal atualizado.', 'success')
    } catch (reason) {
      addNotification(reason instanceof Error ? reason.message : 'Não foi possível atualizar o canal.', 'error')
    } finally { setBusy(null) }
  }

  const deleteChannel = async (channelId: string) => {
    setBusy(`channel:${channelId}`)
    try {
      await communityApi.deleteChannel(communityId, channelId)
      if (selectedChannelId === channelId) setSelectedChannelId(null)
      setConfirmDelete(null)
      await refresh()
      addNotification('Canal excluído.', 'success')
    } catch (reason) {
      addNotification(reason instanceof Error ? reason.message : 'Não foi possível excluir o canal.', 'error')
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
      addNotification(accessAllowed ? 'Acesso ao canal privado concedido.' : 'Acesso ao canal privado removido.', 'success')
    } catch (err) {
      addNotification(err instanceof Error ? err.message : 'Não foi possível atualizar o acesso ao canal.', 'error')
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
      addNotification(err instanceof Error ? err.message : 'Falha ao criar cargo.', 'error')
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
      addNotification(reason instanceof Error ? reason.message : 'Não foi possível atualizar o cargo.', 'error')
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
      addNotification(reason instanceof Error ? reason.message : 'Não foi possível excluir o cargo.', 'error')
    } finally { setBusy(null) }
  }

  const changeMemberRole = async (memberId: string, roleId: string, remove = false) => {
    setBusy(`member-role:${memberId}:${roleId}`)
    try {
      if (remove) await communityApi.removeMemberRole(communityId, memberId, roleId)
      else await communityApi.addMemberRole(communityId, memberId, roleId)
      await refresh()
    } catch (reason) {
      addNotification(reason instanceof Error ? reason.message : 'Não foi possível atualizar o cargo do membro.', 'error')
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
      addNotification(err instanceof Error ? err.message : 'Falha ao criar convite.', 'error')
    } finally {
      setBusy(null)
    }
  }

  const revokeInvite = async (inviteId: string) => {
    setBusy(`invite:${inviteId}`)
    try {
      await communityApi.revokeInvite(communityId, inviteId)
      setInvites((await communityApi.listInvites(communityId)).invites)
    } catch (reason) { addNotification(reason instanceof Error ? reason.message : 'Não foi possível revogar o convite.', 'error') }
    finally { setBusy(null) }
  }

  const copyInviteLink = async () => {
    if (!inviteToken) return
    try {
      await navigator.clipboard.writeText(`anceryx://invite/${inviteToken}`)
      addNotification('Link do convite copiado.', 'success')
    } catch { addNotification('Não foi possível copiar o link do convite.', 'error') }
  }

  const joinVoice = async (channel: CommunityChannelDto) => {
    setBusy(`voice:${channel.id}`)
    try {
      await communityVoiceClient.join(communityId, channel.id)
      const refreshed = await refresh()
      const peers = refreshed?.voiceStates.filter((item) => item.channelId === channel.id && item.userId !== currentUserId) ?? []
      await Promise.all(peers.map((peer) => communityVoiceClient.callPeer(peer.userId).catch(() => undefined)))
    } catch (err) {
      addNotification(err instanceof Error ? err.message : 'Falha ao entrar no canal de voz.', 'error')
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
        if (!sources.length) throw new Error('Nenhuma tela ou janela disponível para captura.')
        setScreenSources(sources)
        setScreenPickerOpen(true)
      } else await communityVoiceClient.startScreenShare(30)
    } catch (err) {
      addNotification(err instanceof Error ? err.message : 'Não foi possível compartilhar a tela.', 'error')
    } finally { setScreenPickerLoading(false) }
  }

  const startScreenShareFromSource = async (sourceId: string) => {
    setScreenPickerLoading(true)
    try {
      await window.electronAPI?.screenCapture.selectSource(sourceId)
      setScreenPickerOpen(false)
      await communityVoiceClient.startScreenShare(30)
    } catch (err) {
      addNotification(err instanceof Error ? err.message : 'Não foi possível iniciar a transmissão.', 'error')
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
      ? [...categories, { id: 'uncategorized', name: 'Sem categoria', communityId, position: 999 }]
      : categories
  }, [communityId, groupedChannels, state?.categories])

  const voiceStatus = communityVoiceClient.status
  const voiceStatusLabel = ({ idle: 'Desconectado', connected: 'Conectado', disconnected: 'Desconectado', connecting: 'Conectando', reconnecting: 'Reconectando', 'permission-denied': 'Permissão do microfone negada' } as const)[voiceStatus]
  void voiceTick

  const managementSections = useMemo<CommunityManagementSection[]>(() => [
    ...(canManageLegacyForum && forum ? [
      { id: 'overview', label: 'Visão geral', group: 'Geral' },
      { id: 'profile', label: 'Perfil do Fórum', group: 'Geral' },
      ...(canManageChannels ? [{ id: 'organization', label: 'Canais e categorias', group: 'Geral' }] : []),
      { id: 'posts', label: 'Publicações', group: 'Geral' },
      { id: 'members', label: 'Membros', group: 'Pessoas e acesso' },
      ...(canManageRoles ? [{ id: 'roles', label: 'Cargos e permissões', group: 'Pessoas e acesso' }] : []),
      ...(canManageInvites ? [{ id: 'invites', label: 'Convites', group: 'Pessoas e acesso' }] : []),
      { id: 'access', label: 'Acesso e visibilidade', group: 'Pessoas e acesso' },
      { id: 'reports', label: 'Denúncias', group: 'Moderação e segurança' },
      { id: 'moderation', label: 'Moderação', group: 'Moderação e segurança' },
      ...(canOpenManagement ? [{ id: 'appeals', label: 'Recursos', group: 'Moderação e segurança' }] : []),
      ...(canViewAuditLog ? [{ id: 'audit', label: 'Auditoria', group: 'Moderação e segurança' }] : []),
      ...(isCommunityOwner ? [{ id: 'critical', label: 'Propriedade e ações críticas', group: 'Avançado' }] : []),
    ] : []),
    ...(canManageReports && !canManageLegacyForum ? [{ id: 'reports', label: 'Denúncias', group: 'Moderação e segurança' }] : []),
    ...(!canManageLegacyForum && canManageChannels ? [{ id: 'organization', label: 'Canais e categorias', group: 'Geral' }] : []),
    ...(!canManageLegacyForum && canManageRoles ? [{ id: 'roles', label: 'Cargos e permissões', group: 'Pessoas e acesso' }] : []),
    ...(!canManageLegacyForum && canManageInvites ? [{ id: 'invites', label: 'Convites', group: 'Pessoas e acesso' }] : []),
    ...(!canManageLegacyForum && canOpenManagement && (canCreateModerationActions || canManageBans || canViewModerationCases || canManageReports) ? [{ id: 'moderation', label: 'Moderação', group: 'Moderação e segurança' }] : []),
    ...(!canManageLegacyForum && canOpenManagement ? [{ id: 'appeals', label: 'Recursos', group: 'Moderação e segurança' }] : []),
    ...(!canManageLegacyForum && canViewAuditLog ? [{ id: 'audit', label: 'Auditoria', group: 'Moderação e segurança' }] : []),
    ...(isCommunityOwner ? [{ id: 'preferences', label: 'Preferências do Fórum', group: 'Avançado' }] : []),
  ], [canManageLegacyForum, forum, canOpenManagement, canCreateModerationActions, canManageBans, canViewModerationCases, canViewModerationSummary, canViewAuditLog, canManageChannels, canManageRoles, canManageInvites, isCommunityOwner])
  const moderationSummaryCards = [
    { label: 'Denúncias pendentes', value: moderationSummary?.reports.pending, onClick: canManageReports || forum && canManageLegacyForum ? () => setManagementSection('reports') : undefined },
    { label: 'Denúncias em análise', value: moderationSummary?.reports.reviewing, onClick: canManageReports || forum && canManageLegacyForum ? () => setManagementSection('reports') : undefined },
    { label: 'Casos resolvidos', value: moderationSummary?.cases.resolved, onClick: () => { const filters = { status: 'corrected' as const }; setModerationFilters(filters); void loadModerationCases(0, filters) } },
    { label: 'Restrições ativas', value: moderationSummary?.activeTimeouts, onClick: () => { const filters = { action: 'timeout' as const, status: 'active' as const }; setModerationFilters(filters); void loadModerationCases(0, filters) } },
    { label: 'Banimentos ativos', value: moderationSummary?.activeBans, onClick: () => { const filters = { action: 'ban' as const, status: 'active' as const }; setModerationFilters(filters); void loadModerationCases(0, filters) } },
    { label: 'Recursos aguardando revisão', value: moderationSummary?.appealsPending, onClick: () => setManagementSection('appeals') },
  ]
  useEffect(() => {
    if (managementOpen && !managementSections.some((section) => section.id === managementSection)) {
      setManagementSection(managementSections[0]?.id ?? 'forum')
    }
  }, [managementOpen, managementSection, managementSections])
  const communityManagementContent = <>

          {managementSection === 'appeals' && (ownModerationCases.length > 0 || ownAppeals.length > 0) && <details className="border-b border-border p-3"><summary className="cursor-pointer list-none text-xs font-semibold uppercase text-text-secondary hover:text-text-primary">Minhas punições e recursos</summary><div className="mt-3 space-y-3">
            {ownModerationCases.map((item) => {
              const activeAppeal = ownAppeals.some((appeal) => appeal.moderationCaseId === item.id && ['pending', 'reviewing'].includes(appeal.status))
              return <article key={item.id} className="space-y-2 rounded-md bg-background-secondary p-2"><p className="text-xs font-medium text-text-primary">{item.action === 'warning' ? 'Advertência' : item.action === 'timeout' ? 'Restrição temporária' : item.action === 'kick' ? 'Expulsão' : 'Banimento'} · {item.status === 'corrected' ? 'Corrigida' : item.status === 'expired' ? 'Expirada' : 'Ativa'}</p><p className="whitespace-pre-wrap break-words text-[11px] text-text-secondary">{item.reason}</p><p className="text-[10px] text-text-secondary">{formatDateTime(new Date(item.createdAt))}</p>{item.status !== 'corrected' && !activeAppeal && <button type="button" className="text-xs text-accent hover:underline" onClick={() => setAppealCaseId(appealCaseId === item.id ? null : item.id)}>Recorrer desta decisão</button>}{appealCaseId === item.id && <div className="space-y-2"><textarea aria-label="Justificativa do recurso" value={appealStatement} onChange={(event) => setAppealStatement(event.target.value.slice(0, 4000))} maxLength={4000} rows={3} placeholder="Explique por que deseja recorrer" className="w-full rounded-md border border-border bg-background-primary p-2 text-xs text-text-primary" /><textarea aria-label="Informações adicionais do recurso" value={appealAdditionalInfo} onChange={(event) => setAppealAdditionalInfo(event.target.value.slice(0, 4000))} maxLength={4000} rows={2} placeholder="Informações adicionais (opcional)" className="w-full rounded-md border border-border bg-background-primary p-2 text-xs text-text-primary" /><textarea aria-label={'Refer\u00eancias de evid\u00eancia do recurso'} value={appealEvidenceText} onChange={(event) => setAppealEvidenceText(event.target.value.slice(0, 5000))} maxLength={5000} rows={2} placeholder={'Refer\u00eancias de evid\u00eancia, uma por linha (opcional)'} className="w-full rounded-md border border-border bg-background-primary p-2 text-xs text-text-primary" /><Button size="sm" variant="secondary" disabled={!appealStatement.trim()} loading={busy === `appeal:create:${item.id}`} onClick={() => void submitAppeal()}>Enviar recurso</Button></div>}</article>
            })}
            {ownAppeals.map((appeal) => <article key={appeal.id} className="rounded-md border border-border p-2"><p className="text-xs font-medium text-text-primary">Recurso · {appeal.status === 'pending' ? 'Pendente — aguardando revisor independente' : appeal.status === 'reviewing' ? 'Em análise' : appeal.status === 'reversed' ? 'Deferido' : appeal.status === 'upheld' ? 'Indeferido' : appeal.status === 'closed_by_correction' ? 'Encerrado por correção administrativa' : 'Cancelado'}</p>{appeal.decisionNote && <p className="mt-1 whitespace-pre-wrap break-words text-[11px] text-text-secondary">{appeal.decisionNote}</p>}</article>)}
          </div></details>}
          {managementSection === 'appeals' && <section className="space-y-2 rounded-md border border-border p-3">
            <h3 className="text-xs font-semibold uppercase text-text-secondary">Recursos para revisão</h3>
            <Button size="sm" variant="secondary" loading={appealQueueLoading} onClick={() => void loadAppealQueue()}>Consultar recursos</Button>
            {appealQueueError && <p role="status" className="text-xs text-text-secondary">{appealQueueError}</p>}
            {appealQueueLoaded && canReviewAppeals && <p className="text-xs text-text-secondary">{appealQueue.length} recurso(s) carregado(s).</p>}
          </section>}
          {managementSection === 'appeals' && canReviewAppeals && <details className="border-b border-border p-3">
            <summary className="cursor-pointer list-none text-xs font-semibold uppercase text-text-secondary hover:text-text-primary">Recursos para análise · {appealQueue.filter((appeal) => appeal.status === 'pending' || appeal.status === 'reviewing').length}</summary>
            <div className="mt-3 space-y-3">
              {appealQueue.filter((appeal) => appeal.status === 'pending' || appeal.status === 'reviewing').map((appeal) => {
                const isAssignedReviewer = appeal.assignedReviewerUserId === currentUserId
                const isUnassigned = appeal.claimAvailable
                return <article key={appeal.id} className="space-y-2 rounded-md bg-background-secondary p-2">
                  <p className="text-xs font-medium text-text-primary">{appeal.moderationCase.target.displayName} · {appeal.moderationCase.action === 'warning' ? 'Advertência' : appeal.moderationCase.action === 'timeout' ? 'Restrição' : appeal.moderationCase.action === 'kick' ? 'Expulsão' : 'Banimento'}</p>
                  <p className="text-[11px] text-text-secondary">Ação original: {appeal.moderationCase.reason}</p>
                  <p className="whitespace-pre-wrap break-words text-xs text-text-primary">Recurso: {appeal.statement}</p>
                  {appeal.additionalInfo && <p className="whitespace-pre-wrap break-words text-[11px] text-text-secondary">{appeal.additionalInfo}</p>}
                  {appeal.evidence.map((entry, index) => <p key={`appeal-${index}`} className="break-all text-[11px] text-text-secondary">{entry}</p>)}
                  {appeal.moderationCase.evidence.map((entry, index) => <p key={`case-${index}`} className="break-all text-[11px] text-text-secondary">{entry}</p>)}
                  <p className="text-[10px] text-text-secondary">Responsável pela ação: {appeal.moderationCase.actor?.displayName ?? 'Conta removida'}</p>
                  {isUnassigned && <Button size="sm" variant="secondary" loading={busy === `appeal:claim:${appeal.id}`} onClick={() => void claimAppeal(appeal.id)}>Assumir análise</Button>}
                  {!isUnassigned && <p className="text-[10px] text-text-secondary">Revisor responsável: {appeal.assignedReviewer?.displayName ?? 'Conta removida'}{isAssignedReviewer ? ' (você)' : ''}</p>}
                  {isAssignedReviewer && <>
                    <textarea aria-label="Justificativa da decisão" value={reviewDecisionNotes[appeal.id] ?? ''} onChange={(event) => setReviewDecisionNotes((current) => ({ ...current, [appeal.id]: event.target.value.slice(0, 2000) }))} maxLength={2000} rows={2} placeholder="Justificativa da decisão" className="w-full rounded-md border border-border bg-background-primary p-2 text-xs text-text-primary" />
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="secondary" disabled={!reviewDecisionNotes[appeal.id]?.trim()} loading={busy === `appeal:review:${appeal.id}`} onClick={() => void reviewAppeal(appeal.id, 'reversed')}>Deferir e reverter</Button>
                      <Button size="sm" variant="secondary" disabled={!reviewDecisionNotes[appeal.id]?.trim()} loading={busy === `appeal:review:${appeal.id}`} onClick={() => void reviewAppeal(appeal.id, 'upheld')}>Indeferir e manter</Button>
                      <Button size="sm" variant="ghost" loading={busy === `appeal:release:${appeal.id}`} onClick={() => void releaseAppeal(appeal.id)}>Liberar recurso</Button>
                    </div>
                  </>}
                </article>
              })}
              {appealQueue.every((appeal) => appeal.status !== 'pending' && appeal.status !== 'reviewing') && <p className="text-xs text-text-secondary">Nenhum recurso aguardando análise.</p>}
            </div>
          </details>}
          {['forum', 'organization', 'roles', 'invites'].includes(managementSection) && canOpenManagement && (
            <div className="space-y-4 border-t border-border p-3">
              <h3 className="text-sm font-semibold text-text-primary">{managementSection === 'organization' ? 'Organização' : managementSection === 'roles' ? 'Cargos e permissões' : managementSection === 'invites' ? 'Convites' : 'Gerenciar Fórum'}</h3>
              <div className="mt-3 space-y-4">
              {managementSection === 'preferences' && state?.community.ownerUserId === currentUserId && <><section className="space-y-2"><h3 className="text-xs font-semibold uppercase text-text-secondary">Cargos revisores de recursos</h3><p className="text-xs text-text-secondary">Escolha quais cargos podem revisar recursos com independência.</p>{state.roles.length === 0 ? <p className="text-xs text-text-secondary">Crie cargos antes de configurar revisores.</p> : state.roles.map((role) => <label key={role.id} className="flex items-center gap-2 text-xs text-text-primary"><input type="checkbox" checked={reviewerRoleIds.includes(role.id)} disabled={busy === 'appeal-reviewer-roles'} onChange={(event) => void toggleAppealReviewerRole(role.id, event.target.checked)} />{role.name}</label>)}</section><section className="space-y-2"><h3 className="text-xs font-semibold uppercase text-text-secondary">Lista de membros</h3><p className="text-xs text-text-secondary">Escolha como os membros aparecem na lateral do Fórum.</p><label className="sr-only" htmlFor="community-member-list-mode">Modo de exibição</label><select id="community-member-list-mode" value={state.community.memberListMode} onChange={(event) => void updateMemberListMode(event.target.value as 'simple' | 'grouped_roles')} disabled={busy === 'member-list-mode'} className="w-full max-w-md rounded-md border border-border bg-background-secondary px-2 py-1.5 text-xs text-text-primary"><option value="simple">Lista simples</option><option value="grouped_roles">Agrupada por cargos</option></select></section></>}
              {canManageChannels && managementSection === 'organization' && <section className="space-y-2">
                <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase text-text-secondary"><Plus size={13} /> Canais</h3>
                <Input value={newCategoryName} onChange={(event) => setNewCategoryName(event.target.value)} placeholder="Categoria" />
                <Button size="sm" variant="secondary" loading={busy === 'category'} onClick={() => void createCategory()}>Criar categoria</Button>
                {state?.categories.map((category, index, categories) => <div key={category.id} className="flex items-center gap-2 rounded-md border border-border p-2">
                  {editingCategory?.id === category.id ? <><Input aria-label="Nome da categoria" value={editingCategory.name} onChange={(event) => setEditingCategory({ ...editingCategory, name: event.target.value })} /><Button size="sm" loading={busy === `category:${category.id}`} onClick={() => void saveCategory()} leftIcon={<Check size={13} />}>Salvar</Button><Button size="sm" variant="ghost" onClick={() => setEditingCategory(null)}>Cancelar</Button></> : <><span className="min-w-0 flex-1 truncate text-xs text-text-primary">{category.name}</span><button type="button" aria-label={`Mover categoria ${category.name} para cima`} disabled={index === 0 || Boolean(busy)} onClick={() => void moveCategory(category.id, -1)} className="text-text-secondary disabled:opacity-40"><ArrowUp size={13} /></button><button type="button" aria-label={`Mover categoria ${category.name} para baixo`} disabled={index === categories.length - 1 || Boolean(busy)} onClick={() => void moveCategory(category.id, 1)} className="text-text-secondary disabled:opacity-40"><ArrowDown size={13} /></button><button type="button" aria-label={`Editar categoria ${category.name}`} onClick={() => setEditingCategory({ id: category.id, name: category.name })} className="text-text-secondary"><Pencil size={13} /></button><button type="button" aria-label={`Excluir categoria ${category.name}`} onClick={() => setConfirmDelete({ type: 'category', id: category.id, name: category.name })} className="text-red-300"><Trash2 size={13} /></button></>}
                </div>)}
                <div className="flex gap-2">
                  <input value={newChannelName} onChange={(event) => setNewChannelName(event.target.value)} className="min-w-0 flex-1 rounded-md border border-border bg-background-secondary px-2 py-1.5 text-xs text-text-primary" placeholder="Canal" />
                  <select value={newChannelType} onChange={(event) => setNewChannelType(event.target.value as CommunityChannelType)} className="rounded-md border border-border bg-background-secondary px-2 py-1.5 text-xs text-text-primary">
                    <option value="text">texto</option>
                    <option value="forum">forum</option>
                    <option value="voice">voz</option>
                  </select>
                </div>
                <label className="block text-xs text-text-secondary">Categoria <select value={newChannelCategoryId} onChange={(event) => setNewChannelCategoryId(event.target.value)} className="mt-1 w-full rounded-md border border-border bg-background-secondary px-2 py-1.5 text-text-primary"><option value="">Sem categoria</option>{state?.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
                <label className="flex items-center gap-2 text-xs text-text-secondary"><input type="checkbox" checked={newChannelPrivate} onChange={(event) => setNewChannelPrivate(event.target.checked)} />Canal privado</label>
                {newChannelType === 'text' && <label className="flex items-center gap-2 text-xs text-text-secondary"><input type="checkbox" checked={newChannelAnnouncement} onChange={(event) => setNewChannelAnnouncement(event.target.checked)} />Canal de avisos</label>}
                <Button size="sm" variant="secondary" loading={busy === 'channel'} onClick={() => void createChannel()}>Criar canal</Button>
                {state?.channels.map((channel) => {
                  const siblings = state.channels.filter((item) => item.categoryId === channel.categoryId).sort((a, b) => a.position - b.position || a.id.localeCompare(b.id))
                  const channelIndex = siblings.findIndex((item) => item.id === channel.id)
                  const hasChannelOverrides = state.overrides.some((override) => override.channelId === channel.id && (override.allow.length > 0 || override.deny.length > 0))
                  return <div key={channel.id} className="flex items-center gap-2 rounded-md border border-border p-2">
                  {editingChannel?.id === channel.id ? <div className="grid flex-1 gap-2"><Input aria-label="Nome do canal" value={editingChannel.name} onChange={(event) => setEditingChannel({ ...editingChannel, name: event.target.value })} /><label className="block text-xs text-text-secondary">Tipo <select value={editingChannel.type} onChange={(event) => setEditingChannel({ ...editingChannel, type: event.target.value as CommunityChannelType })} className="mt-1 w-full rounded-md border border-border bg-background-primary px-2 py-1.5 text-text-primary"><option value="text">Texto</option><option value="forum">Fórum</option><option value="voice">Voz</option></select></label><label className="block text-xs text-text-secondary">Categoria <select value={editingChannel.categoryId ?? ''} onChange={(event) => setEditingChannel({ ...editingChannel, categoryId: event.target.value || null })} className="mt-1 w-full rounded-md border border-border bg-background-primary px-2 py-1.5 text-text-primary"><option value="">Sem categoria</option>{state?.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label><label className="flex items-center gap-2 text-xs text-text-secondary"><input type="checkbox" checked={editingChannel.isPrivate} onChange={(event) => setEditingChannel({ ...editingChannel, isPrivate: event.target.checked })} />Canal privado</label><label className="flex items-center gap-2 text-xs text-text-secondary"><input type="checkbox" checked={editingChannel.isAnnouncement} onChange={(event) => setEditingChannel({ ...editingChannel, isAnnouncement: event.target.checked })} />Canal de avisos</label><div className="flex gap-2"><Button size="sm" loading={busy === `channel:${channel.id}`} onClick={() => void saveChannel()} leftIcon={<Check size={13} />}>Salvar</Button><Button size="sm" variant="ghost" onClick={() => setEditingChannel(null)}>Cancelar</Button></div></div> : <><span className="min-w-0 flex-1 truncate text-xs text-text-primary">#{channel.name}</span><button type="button" aria-label={`Mover canal ${channel.name} para cima`} disabled={channelIndex === 0 || Boolean(busy)} onClick={() => void moveChannel(channel.id, -1)} className="text-text-secondary disabled:opacity-40"><ArrowUp size={13} /></button><button type="button" aria-label={`Mover canal ${channel.name} para baixo`} disabled={channelIndex === siblings.length - 1 || Boolean(busy)} onClick={() => void moveChannel(channel.id, 1)} className="text-text-secondary disabled:opacity-40"><ArrowDown size={13} /></button><button type="button" aria-label={`Editar canal ${channel.name}`} onClick={() => setEditingChannel({ ...channel })} className="text-text-secondary"><Pencil size={13} /></button><button type="button" aria-label={`Excluir canal ${channel.name}`} onClick={() => setConfirmDelete({ type: 'channel', id: channel.id, name: channel.name })} className="text-red-300"><Trash2 size={13} /></button>{channel.categoryId && hasChannelOverrides && <button type="button" disabled={Boolean(busy)} onClick={() => void syncChannelPermissionsFromCategory(channel)} className="text-[10px] text-accent disabled:opacity-40">Herdar permissões da categoria</button>}</>}
                </div>
                })}
                {state?.channels.filter((channel) => channel.isPrivate).map((channel) => <div key={channel.id} className="space-y-2 rounded-md border border-border p-2">
                  <p className="text-xs font-medium text-text-primary">Acesso · #{channel.name}</p>
                  <select value={accessSubjectType} onChange={(event) => setAccessSubjectType(event.target.value as 'role' | 'member')} className="w-full rounded-md border border-border bg-background-secondary px-2 py-1 text-xs text-text-primary"><option value="role">Cargo</option><option value="member">Membro</option></select>
                  <select value={accessSubjectId} onChange={(event) => setAccessSubjectId(event.target.value)} className="w-full rounded-md border border-border bg-background-secondary px-2 py-1 text-xs text-text-primary"><option value="">Selecione</option>{(accessSubjectType === 'role' ? state.roles.map((role) => ({ id: role.id, name: role.name })) : state.members.map((member) => ({ id: member.userId, name: member.user.displayName }))).map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select>
                  <select value={accessAllowed ? 'allow' : 'deny'} onChange={(event) => setAccessAllowed(event.target.value === 'allow')} className="w-full rounded-md border border-border bg-background-secondary px-2 py-1 text-xs text-text-primary"><option value="allow">Conceder acesso</option><option value="deny">Remover acesso</option></select>
                  <Button size="sm" variant="secondary" loading={busy === `access:${channel.id}`} onClick={() => void setPrivateChannelAccess(channel)}>Aplicar permissão</Button>
                </div>)}
              </section>}
              {canManageRoles && managementSection === 'roles' && <section className="space-y-2">
                <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase text-text-secondary"><Shield size={13} /> Cargos</h3>
                <Input value={newRoleName} onChange={(event) => setNewRoleName(event.target.value)} placeholder="Cargo" />
                <label className="block text-xs text-text-secondary">Posi o <input type="number" value={newRolePosition} onChange={(event) => setNewRolePosition(event.target.value)} className="mt-1 w-full rounded-md border border-border bg-background-secondary px-2 py-1.5 text-text-primary" /></label>
                <label className="flex items-center gap-2 text-xs text-text-secondary"><input type="checkbox" checked={newRoleDisplaySeparately} onChange={(event) => setNewRoleDisplaySeparately(event.target.checked)} />Exibir separadamente</label>
                <label className="flex items-center gap-2 text-xs text-text-secondary"><input type="checkbox" checked={newRoleMentionable} onChange={(event) => setNewRoleMentionable(event.target.checked)} />Permitir men es</label>
                <select value={newRolePermission} onChange={(event) => setNewRolePermission(event.target.value)} className="w-full rounded-md border border-border bg-background-secondary px-2 py-1.5 text-xs text-text-primary">
                  {PERMISSIONS.map((permission) => <option key={permission} value={permission}>{communityPermissionLabel(permission)}</option>)}
                </select>
                <Button size="sm" variant="secondary" loading={busy === 'role'} onClick={() => void createRole()}>Criar cargo</Button>
                <div className="space-y-2 border-t border-border pt-2">
                  {state?.roles.map((role) => <div key={role.id} className="space-y-2 rounded-md bg-background-secondary p-2">
                    {editingRoleId === role.id ? <>
                      <Input aria-label="Nome do cargo" value={editingRoleName} onChange={(event) => setEditingRoleName(event.target.value)} />
                      <label className="flex items-center justify-between text-xs text-text-secondary">Cor <input aria-label="Cor do cargo" type="color" value={editingRoleColor} onChange={(event) => setEditingRoleColor(event.target.value)} /></label>
                      <label className="block text-xs text-text-secondary">Posi o <input type="number" value={editingRolePosition} onChange={(event) => setEditingRolePosition(Number(event.target.value))} className="mt-1 w-full rounded-md border border-border bg-background-primary px-2 py-1.5 text-text-primary" /></label>
                      <label className="flex items-center gap-2 text-xs text-text-secondary"><input type="checkbox" checked={editingRoleDisplaySeparately} onChange={(event) => setEditingRoleDisplaySeparately(event.target.checked)} />Exibir separadamente</label>
                      <label className="flex items-center gap-2 text-xs text-text-secondary"><input type="checkbox" checked={editingRoleMentionable} onChange={(event) => setEditingRoleMentionable(event.target.checked)} />Permitir men es</label>
                      <div className="grid grid-cols-2 gap-1">{PERMISSIONS.map((permission) => <label key={permission} className="flex items-center gap-1 text-[10px] text-text-secondary"><input type="checkbox" checked={editingRolePermissions.includes(permission)} onChange={(event) => setEditingRolePermissions((current) => event.target.checked ? [...new Set([...current, permission])] : current.filter((item) => item !== permission))} />{communityPermissionLabel(permission)}</label>)}</div>
                      <div className="flex gap-2"><Button size="sm" variant="secondary" loading={busy === `role:${role.id}`} onClick={() => void saveRole()}>Salvar</Button><Button size="sm" variant="ghost" onClick={() => setEditingRoleId(null)}>Cancelar</Button></div>
                    </> : <div className="flex items-center justify-between gap-2"><span className="truncate text-xs" style={{ color: role.color }}>{role.name}</span><div className="flex shrink-0 gap-1"><button type="button" aria-label={`Editar cargo ${role.name}`} onClick={() => beginRoleEdit(role)} className="rounded p-1 text-text-secondary hover:text-text-primary"><Pencil size={13} /></button><button type="button" aria-label={`Excluir cargo ${role.name}`} disabled={busy === `role:${role.id}`} onClick={() => void deleteRole(role.id)} className="rounded p-1 text-red-300 disabled:opacity-50"><Trash2 size={13} /></button></div></div>}
                  </div>)}
                </div>
                <div className="space-y-2 border-t border-border pt-2">
                  <p className="text-xs font-medium text-text-secondary">Atribuir cargo a um membro</p>
                  <select aria-label="Membro para atribuir cargo" value={roleMemberId} onChange={(event) => setRoleMemberId(event.target.value)} className="w-full rounded-md border border-border bg-background-secondary px-2 py-1.5 text-xs text-text-primary"><option value="">Selecionar membro</option>{state?.members.filter((member) => member.userId !== currentUserId).map((member) => <option key={member.userId} value={member.userId}>{member.user.displayName}</option>)}</select>
                  <select aria-label="Cargo para atribuir" value={roleToAssign} onChange={(event) => setRoleToAssign(event.target.value)} className="w-full rounded-md border border-border bg-background-secondary px-2 py-1.5 text-xs text-text-primary"><option value="">Selecionar cargo</option>{state?.roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select>
                  <Button size="sm" variant="secondary" disabled={!roleMemberId || !roleToAssign} loading={busy?.startsWith('member-role:') ?? false} onClick={() => void changeMemberRole(roleMemberId, roleToAssign)}>Atribuir cargo</Button>
                  {state?.members.filter((member) => member.userId !== state.community.ownerUserId && member.roles.length > 0).map((member) => <div key={member.userId} className="space-y-1 rounded-md bg-background-secondary p-2"><p className="truncate text-xs text-text-primary">{member.user.displayName}</p>{member.roles.map((role) => <div key={role.id} className="flex items-center justify-between gap-2"><span className="truncate text-[11px] text-text-secondary">{role.name}</span><button type="button" disabled={busy === `member-role:${member.userId}:${role.id}`} onClick={() => void changeMemberRole(member.userId, role.id, true)} className="text-[11px] text-red-300 disabled:opacity-50">Remover</button></div>)}</div>)}
                </div>
              </section>}
              {canManageInvites && managementSection === 'invites' && <section className="space-y-2">
                <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase text-text-secondary"><Smile size={13} /> Convites</h3>
                <label className="block text-xs text-text-secondary">Validade <select value={inviteExpiryDays} onChange={(event) => setInviteExpiryDays(event.target.value)} className="mt-1 w-full rounded-md border border-border bg-background-secondary px-2 py-1.5 text-text-primary"><option value="1">1 dia</option><option value="7">7 dias</option><option value="30">30 dias</option><option value="">Sem validade</option></select></label>
                <label className="block text-xs text-text-secondary">Limite de usos <input type="number" min={1} max={10000} value={inviteMaxUses} onChange={(event) => setInviteMaxUses(event.target.value)} placeholder="Ilimitado" className="mt-1 w-full rounded-md border border-border bg-background-secondary px-2 py-1.5 text-text-primary" /></label>
                <Button size="sm" variant="secondary" loading={busy === 'invite'} onClick={() => void createInvite()}>Criar convite</Button>
                {inviteToken && <div className="space-y-2 rounded-md bg-background-secondary p-2"><p className="break-all text-xs text-text-secondary">anceryx://invite/{inviteToken}</p><Button size="sm" variant="ghost" onClick={() => void copyInviteLink()} leftIcon={<Copy size={13} />}>Copiar link</Button></div>}
                {invites.map((invite) => <div key={invite.id} className="flex items-center justify-between gap-2 rounded-md bg-background-secondary p-2"><span className="min-w-0 text-[11px] text-text-secondary">{invite.revokedAt ? 'Revogado' : invite.expiresAt && new Date(invite.expiresAt).getTime() <= Date.now() ? 'Expirado' : `${invite.uses}${invite.maxUses ? `/${invite.maxUses}` : ''} usos`} · {invite.expiresAt ? formatDate(new Date(invite.expiresAt)) : 'Sem validade'}</span>{!invite.revokedAt && <button type="button" disabled={busy === `invite:${invite.id}`} onClick={() => void revokeInvite(invite.id)} className="shrink-0 text-[11px] text-red-300 disabled:opacity-50">Revogar</button>}</div>)}
              </section>}
              {canManageBans && bannedMembersSection}
              {canCreateModerationActions && moderationActionForm}
              {canViewModerationCases && moderationCasesSection}
              {canViewAuditLog && auditLogSection}
              </div>
            </div>
          )}
          {canShowModerationPanel && !canOpenManagement && <details className="border-t border-border p-3"><summary className="cursor-pointer list-none text-xs font-semibold uppercase text-text-secondary hover:text-text-primary">{canCreateModerationActions ? 'Moderação' : 'Auditoria'}</summary><div className="mt-3 space-y-4">{canManageBans && bannedMembersSection}{canCreateModerationActions && moderationActionForm}{canViewModerationCases && moderationCasesSection}{canViewAuditLog && !canCreateModerationActions && auditLogSection}</div></details>}


  </>

  return (
    <div
      className={presentation === 'embedded' ? 'h-full min-h-0 w-full min-w-0' : 'motion-backdrop-in fixed inset-x-0 bottom-0 top-[var(--app-titlebar-height)] z-[60] flex bg-background-primary'}
      onClick={(event) => presentation === 'modal' && event.target === event.currentTarget && onClose()}
      role={presentation === 'modal' ? 'dialog' : undefined}
      aria-modal={presentation === 'modal' ? true : undefined}
      aria-label={presentation === 'modal' ? 'Comunidade' : undefined}
    >
      <div className={`grid h-full min-h-0 w-full min-w-0 grid-cols-1 overflow-hidden bg-background-secondary ${presentation === 'modal' ? 'motion-surface-in' : ''} ${presentation === 'embedded' ? (voiceCallLayout ? 'md:grid-cols-[240px_minmax(0,1fr)]' : membersOpen ? 'md:grid-cols-[240px_minmax(0,1fr)] xl:grid-cols-[240px_minmax(0,1fr)_260px]' : 'md:grid-cols-[240px_minmax(0,1fr)] xl:grid-cols-[240px_minmax(0,1fr)_44px]') : (voiceCallLayout ? 'md:grid-cols-[64px_240px_minmax(0,1fr)]' : membersOpen ? 'md:grid-cols-[64px_240px_minmax(0,1fr)] xl:grid-cols-[64px_240px_minmax(0,1fr)_260px]' : 'md:grid-cols-[64px_240px_minmax(0,1fr)] xl:grid-cols-[64px_240px_minmax(0,1fr)_44px]')}`}>
        {presentation === 'modal' && <nav className="hidden flex-col items-center gap-2 border-r border-border bg-background-primary py-3 md:flex" aria-label="Navegação do aplicativo">
          {([
            ['feed', Home, 'Home'], ['mensagens', MessageCircle, 'Mensagens'], ['explore', Compass, 'Explore'], ['foruns', Users, 'Fóruns'], ['perfil', User, 'Perfil'],
          ] as const).map(([section, Icon, label]) => <button key={section} type="button" onClick={() => { onClose(); onNavigateGlobal?.(section) }} className="grid h-10 w-10 place-items-center rounded-xl text-text-secondary transition hover:bg-background-tertiary hover:text-text-primary" aria-label={`Voltar para ${label}`} title={label}><Icon size={18} /></button>)}
          <div className="mt-auto flex flex-col items-center gap-2">
            <div className="grid h-10 w-10 place-items-center overflow-hidden rounded-xl border border-border bg-background-tertiary" title={state?.community.name ?? 'Comunidade'}>{state?.community.iconUrl && !iconFailed ? <img src={mediaApi.resolvePublicUrl(state.community.iconUrl)} alt="" className="h-full w-full object-cover" onError={() => { console.warn('[media] Community identity image failed to load'); setIconFailed(true) }} /> : <Users size={17} className="text-accent" />}</div>
            <button type="button" onClick={() => { onClose(); onNavigateGlobal?.('perfil') }} aria-label="Abrir meu perfil"><Avatar src={currentUserAvatar} name={currentUserName} size="sm" /></button>
          </div>
        </nav>}
        <aside className={["flex min-h-0 flex-col overflow-hidden border-border bg-background-tertiary/45 md:flex md:border-r", mobileView === 'channels' ? 'flex' : 'hidden md:flex'].join(' ')}>
          <div className="relative h-16 shrink-0 bg-background-tertiary sm:h-24">
            {state?.community.bannerUrl && !bannerFailed && <img src={mediaApi.resolvePublicUrl(state.community.bannerUrl)} alt="" className="absolute inset-0 h-full w-full object-cover" onError={() => { console.warn('[media] Community banner failed to load'); setBannerFailed(true) }} />}
            <button onClick={onClose} className="absolute right-2 top-2 rounded-md bg-black/50 p-1.5 text-white" aria-label="Fechar">
              <X size={16} />
            </button>
          </div>
          <div className="shrink-0 px-3 py-3">
            <div ref={forumMenuRef} className="relative">
              <button type="button" aria-haspopup="menu" aria-expanded={forumMenuOpen} onClick={() => setForumMenuOpen((open) => !open)} className="flex min-h-10 w-full items-center justify-between gap-2 rounded-lg px-2 text-left text-base font-bold leading-tight text-text-primary hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                <span className="min-w-0 truncate">{state?.community.name ?? 'Fórum'}</span><ChevronDown size={16} className={`shrink-0 transition-transform ${forumMenuOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
              </button>
              {forumMenuOpen && <div role="menu" aria-label="Ações do Fórum" className="absolute left-0 top-full z-[80] mt-1 max-h-[65vh] w-full min-w-52 overflow-y-auto rounded-xl border border-border bg-background-secondary p-1.5 shadow-2xl">
                {canManageInvites && <button role="menuitem" type="button" onClick={() => openCommunityManagement('invites')} className="flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-sm text-text-primary hover:bg-background-tertiary"><Users size={15} />Convidar membros</button>}
                {(canManageLegacyForum || canManageChannels || canManageRoles || canManageInvites || isCommunityOwner) && <button role="menuitem" type="button" onClick={() => openCommunityManagement(canManageLegacyForum ? 'profile' : canManageChannels ? 'organization' : canManageRoles ? 'roles' : canManageInvites ? 'invites' : 'preferences')} className="flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-sm text-text-primary hover:bg-background-tertiary"><Settings size={15} />Configurações do Fórum</button>}
                {canManageChannels && <>
                  <button role="menuitem" type="button" onClick={() => openCommunityManagement('organization')} className="flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-sm text-text-primary hover:bg-background-tertiary"><Plus size={15} />Criar canal</button>
                  <button role="menuitem" type="button" onClick={() => { setNewCategoryName(''); openCommunityManagement('organization') }} className="flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-sm text-text-primary hover:bg-background-tertiary"><Plus size={15} />Criar categoria</button>
                </>}
                {hasCommunityPermission('createTopics') && <button role="menuitem" type="button" onClick={() => { setForumMenuOpen(false); setSelectedChannelId(null); setShowCommunityPosts(true); setShowEvents(false); setMobileView('content') }} className="flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-sm text-text-primary hover:bg-background-tertiary"><MessageSquare size={15} />Criar publicação</button>}
                {canManageEvents && <button role="menuitem" type="button" onClick={() => { setForumMenuOpen(false); setShowEvents(true); setShowCommunityPosts(false); void refreshEvents() }} className="flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-sm text-text-primary hover:bg-background-tertiary"><CalendarPlus size={15} />Criar evento</button>}
                <button role="menuitem" type="button" onClick={() => { setForumMenuOpen(false); void navigator.clipboard.writeText(communityId).then(() => addNotification('ID do Fórum copiado.', 'success')).catch(() => addNotification('Não foi possível copiar o ID do Fórum.', 'error')) }} className="flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-sm text-text-primary hover:bg-background-tertiary"><CopyIcon size={15} />Copiar ID do Fórum</button>
                <button role="menuitem" type="button" onClick={() => { setForumMenuOpen(false); void navigator.clipboard.writeText(`anceryx://forum/${communityId}`).then(() => addNotification('Link do aplicativo copiado.', 'success')).catch(() => addNotification('Não foi possível copiar o link.', 'error')) }} className="flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-sm text-text-primary hover:bg-background-tertiary"><Share2 size={15} />Compartilhar Fórum</button>
                {state && state.community.ownerUserId !== currentUserId && <><div className="my-1 border-t border-border" /><button role="menuitem" type="button" onClick={() => void leaveForum()} className="flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-sm text-red-300 hover:bg-background-tertiary"><LogOut size={15} />Sair do Fórum</button></>}
              </div>}
            </div>
            {state && <button type="button" onClick={() => { setMembersOpen(true); setMobileView('members') }} className="mt-3 flex min-h-9 w-full items-center justify-center gap-2 rounded-lg border border-border bg-background-secondary px-3 text-sm text-text-primary hover:bg-white/5 md:hidden" aria-label="Abrir membros e configurações do Fórum"><Users size={15} />Membros e configurações</button>}
          </div>
          {loading ? (
            <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2 text-sm text-text-secondary"><Loader2 size={15} className="animate-spin" /> Carregando</div>
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
                      {canManageChannels && <button type="button" title={`Criar canal em ${category.name}`} aria-label={`Criar canal em ${category.name}`} onClick={() => { setNewChannelCategoryId(category.id === 'uncategorized' ? '' : category.id); openCommunityManagement('organization') }} className="grid h-8 w-8 shrink-0 place-items-center rounded text-text-secondary hover:bg-background-secondary hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"><Plus size={14} /></button>}
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
                            <span className="truncate">{channel.type === 'forum' ? 'Publicações' : channel.name}</span>
                          </span>
                          {channel.type === 'voice' && (
                            <span className="shrink-0 rounded-full bg-background-primary/50 px-2 py-0.5 text-[10px] tabular-nums text-text-secondary" aria-label={`${state?.voiceStates.filter((item) => item.channelId === channel.id).length ?? 0} participantes conectados`}>
                              {state?.voiceStates.filter((item) => item.channelId === channel.id).length ?? 0}
                            </span>
                          )}
                        </button>
                        {channel.type === 'voice' && (state?.voiceStates.filter((item) => item.channelId === channel.id) ?? []).length > 0 && <div className="ml-6 flex flex-col gap-1 pb-1">{state?.voiceStates.filter((item) => item.channelId === channel.id).slice(0, 3).map((voice) => <button key={voice.userId} type="button" onClick={(event) => { event.stopPropagation(); const rect = event.currentTarget.getBoundingClientRect(); setVoiceProfileTarget({ userId: voice.userId, x: rect.left, y: rect.bottom }) }} className="flex min-h-8 min-w-0 items-center gap-2 rounded-md px-1 text-left text-[11px] text-text-secondary hover:bg-background-tertiary hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" aria-label={`Abrir perfil de ${voice.user.displayName}`}><Avatar src={voice.user.avatarUrl} name={voice.user.displayName} size="xs" /><span className="min-w-0 truncate">{voice.user.displayName}{voice.selfMuted || voice.serverMuted ? ' · microfone mudo' : ''}</span></button>)}{(state?.voiceStates.filter((item) => item.channelId === channel.id).length ?? 0) > 3 && <span className="pl-1 text-[10px] text-text-secondary">+{(state?.voiceStates.filter((item) => item.channelId === channel.id).length ?? 0) - 3} pessoas</span>}</div>}</React.Fragment>
                      ))}
                    </div>
                  </section>
                )
              })}
              {!state?.channels.some((channel) => channel.type === 'forum') && <button type="button" onClick={() => { setSelectedChannelId(null); setShowCommunityPosts(true); setMobileView('content') }} className={`mt-2 flex min-h-9 w-full items-center gap-2 rounded-md px-2 text-left text-sm ${showCommunityPosts ? 'bg-accent text-white' : 'text-text-secondary hover:bg-white/5 hover:text-text-primary'}`}><MessageSquare size={14} /><span>Publicações</span></button>}
            </nav>
          )}
          {viewerVoiceState && <section className="sticky bottom-0 border-t border-border bg-background-primary p-3 shadow-[0_-8px_20px_rgba(0,0,0,0.15)]" aria-label="Controles persistentes de voz"><div className="mb-2 flex items-center justify-between gap-2"><button type="button" onClick={() => { setSelectedChannelId(viewerVoiceState.channelId); setShowCommunityPosts(false); setShowEvents(false); setMobileView('content') }} className="min-w-0 text-left"><span className="block text-[10px] font-semibold uppercase tracking-wide text-emerald-300">Conectado à voz</span><span className="block truncate text-sm font-semibold text-text-primary">{viewerVoiceChannel?.name ?? 'Canal de voz'}</span></button><span className="shrink-0 text-[10px] text-text-secondary">{voiceStatusLabel}</span></div><CommunityVoiceActionButtons muted={communityVoiceClient.muted} deafened={communityVoiceClient.deafened} sharingScreen={communityVoiceClient.isScreenSharing} screenPickerLoading={screenPickerLoading} leaving={busy === 'voice:leave'} onToggleMuted={() => void communityVoiceClient.setMuted(!communityVoiceClient.muted)} onToggleDeafened={() => void communityVoiceClient.setDeafened(!communityVoiceClient.deafened)} onToggleScreenShare={() => void toggleVoiceScreenShare()} onLeave={() => void leaveVoice()} /></section>}
        </aside>

        <main className={["motion-view-forward min-h-0 min-w-0 flex-col overflow-hidden md:motion-view-in", mobileView === 'content' ? 'flex' : 'hidden md:flex'].join(' ')}>
          <header className="flex min-h-14 items-center justify-between border-b border-border px-4">
            <div className="flex min-w-0 items-center gap-2">
              <button type="button" onClick={() => setMobileView('channels')} className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-text-secondary hover:bg-white/10 md:hidden" aria-label="Voltar para canais"><ArrowLeft size={18} /></button>
              {showCommunityPosts ? <MessageSquare size={16} /> : selectedChannel ? CHANNEL_ICONS[selectedChannel.type] : <Hash size={16} />}
              <div className="min-w-0">
                <h3 className="truncate text-sm font-semibold text-text-primary">{showCommunityPosts ? 'Publicações' : selectedChannel?.name ?? 'Selecione um canal'}</h3>
                {selectedChannel?.description && <p className="truncate text-xs text-text-secondary">{selectedChannel.description}</p>}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {selectedChannel?.type === 'voice' && canViewSelectedChannel && <Button variant={voiceChatOpen ? 'secondary' : 'ghost'} size="sm" onClick={() => { setVoiceChatOpen((open) => !open); if (!voiceChatOpen) setMembersOpen(false) }} leftIcon={<MessageCircle size={14} />} aria-pressed={voiceChatOpen}>Chat</Button>}
              <button type="button" onClick={() => { setVoiceChatOpen(false); setMembersOpen(true); setMobileView('members') }} className={`grid h-9 w-9 place-items-center rounded-lg text-text-secondary hover:bg-white/10 ${viewingConnectedVoice ? '' : 'xl:hidden'}`} aria-label="Mostrar membros" title="Mostrar membros"><Users size={16} /></button>
              <Button variant="ghost" size="sm" onClick={() => void refresh()} leftIcon={<RefreshCw size={14} />}>Atualizar</Button>
              <Button variant={showEvents ? 'secondary' : 'ghost'} size="sm" onClick={() => { setShowEvents((value) => !value); if (!showEvents) void refreshEvents() }} leftIcon={<CalendarDays size={14} />}>Eventos</Button>
            </div>
          </header>

          {showEvents ? (
            <section className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
              {canManageEvents && <form className="space-y-2 rounded-xl border border-border bg-background-primary p-4" onSubmit={(event) => { event.preventDefault(); void createEvent() }}>
                <h4 className="font-semibold text-text-primary">Criar evento</h4>
                <Input value={eventTitle} onChange={(event) => setEventTitle(event.target.value)} maxLength={120} placeholder="Título" aria-label="Título do evento" />
                <Input value={eventDescription} onChange={(event) => setEventDescription(event.target.value)} maxLength={4000} placeholder="Descrição" aria-label="Descrição do evento" />
                <label className="block text-xs text-text-secondary">Data e horário <input required type="datetime-local" value={eventStartsAt} onChange={(event) => setEventStartsAt(event.target.value)} className="mt-1 block rounded-lg border border-border bg-background-secondary p-2 text-text-primary" /></label>
                <Button type="submit" loading={busy === 'event:create'}>Publicar evento</Button>
              </form>}
              {events.map((item) => <article key={item.id} className="rounded-xl border border-border bg-background-primary p-4">
                <div className="flex flex-wrap items-start justify-between gap-2"><div><h4 className="font-semibold text-text-primary">{item.title}</h4><p className="text-xs text-text-secondary">Por {item.creator.displayName} · {formatDateTime(new Date(item.startsAt))}</p></div>{item.status === 'cancelled' ? <span className="text-xs text-text-secondary">Cancelado</span> : new Date(item.startsAt).getTime() <= Date.now() ? <span className="text-xs text-text-secondary">Concluído</span> : null}</div>
                {item.description && <p className="mt-2 whitespace-pre-wrap text-sm text-text-secondary">{item.description}</p>}
                <p className="mt-2 text-xs text-text-secondary">{item.participants.length} participante(s){item.participants.length ? `: ${item.participants.map((person) => person.user.displayName).join(', ')}` : ''}</p>
                {editingEventId === item.id && <form className="mt-3 space-y-2 border-t border-border pt-3" onSubmit={async (event) => { event.preventDefault(); setBusy(`event:${item.id}`); try { await communityApi.updateEvent(communityId, item.id, { title: eventTitle.trim(), description: eventDescription.trim(), startsAt: new Date(eventStartsAt).toISOString() }); setEditingEventId(null); await refreshEvents() } catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível editar o evento.') } finally { setBusy(null) } }}><Input value={eventTitle} onChange={(event) => setEventTitle(event.target.value)} maxLength={120} aria-label="Título do evento" /><Input value={eventDescription} onChange={(event) => setEventDescription(event.target.value)} maxLength={4000} aria-label="Descrição do evento" /><input required type="datetime-local" value={eventStartsAt} onChange={(event) => setEventStartsAt(event.target.value)} className="rounded-lg border border-border bg-background-secondary p-2 text-sm text-text-primary" /><Button type="submit" size="sm" loading={busy === `event:${item.id}`}>Salvar alterações</Button><Button type="button" size="sm" variant="ghost" onClick={() => setEditingEventId(null)}>Cancelar edição</Button></form>}
                {item.status === 'scheduled' && new Date(item.startsAt).getTime() > Date.now() && <div className="mt-3 flex flex-wrap items-center gap-2"><Button size="sm" variant={item.viewerHasRsvped ? 'secondary' : 'primary'} onClick={async () => { try { if (item.viewerHasRsvped) await communityApi.cancelRsvp(communityId, item.id); else await communityApi.rsvpEvent(communityId, item.id, 15); await refreshEvents() } catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível atualizar sua presença.') }}}>{item.viewerHasRsvped ? 'Cancelar presença' : 'Confirmar presença'}</Button>{item.viewerHasRsvped && <label className="text-xs text-text-secondary">Lembrete <select value={item.participants.find((person) => person.userId === currentUserId)?.reminderMinutes ?? 15} onChange={async (event) => { try { await communityApi.rsvpEvent(communityId, item.id, Number(event.target.value)); await refreshEvents() } catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível atualizar o lembrete.') } }} className="ml-1 rounded border border-border bg-background-secondary p-1"><option value={0}>Desativado</option><option value={15}>15 min</option><option value={60}>1 hora</option><option value={1440}>1 dia</option></select></label>}{(canManageEvents || item.creatorUserId === currentUserId) && <><Button size="sm" variant="ghost" onClick={() => { setEditingEventId(item.id); setEventTitle(item.title); setEventDescription(item.description); setEventStartsAt(new Date(new Date(item.startsAt).getTime() - new Date(item.startsAt).getTimezoneOffset() * 60_000).toISOString().slice(0, 16)) }}>Editar</Button><Button size="sm" variant="danger" onClick={async () => { try { await communityApi.cancelEvent(communityId, item.id); await refreshEvents() } catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível cancelar o evento.') } }}>Cancelar evento</Button></>}</div>}
              </article>)}
              {events.length === 0 && <p className="py-8 text-center text-sm text-text-secondary">Ainda não há eventos neste fórum.</p>}
            </section>
          ) : showCommunityPosts ? (
            <CommunityForumChannel forumId={communityId} currentUserId={currentUserId} canCreateTopics={hasCommunityPermission('createTopics')} />
          ) : selectedChannel?.isPrivate && !canViewSelectedChannel ? (
            <section className="flex flex-1 items-center justify-center p-6 text-center text-sm text-text-secondary">Este canal é privado. Peça acesso a um administrador do fórum.</section>
          ) : selectedChannel?.type === 'voice' ? (
            <section className="flex min-h-0 min-w-0 flex-1 gap-2 overflow-hidden p-2 sm:gap-3 sm:p-3">
            <div className={`${voiceChatOpen ? 'hidden md:flex' : 'flex'} min-h-0 min-w-0 flex-1 flex-col items-center gap-3 overflow-y-auto overscroll-contain p-2 text-center sm:gap-4`}>
              <Volume2 size={36} className="text-accent" />
              <div>
                <h4 className="text-lg font-semibold text-text-primary">{selectedChannel.name}</h4>
                <p className="text-sm text-text-secondary">{voiceParticipants.length} conectado(s)</p>
              </div>
              <div className="grid w-full flex-none content-start grid-cols-[repeat(auto-fit,minmax(min(100%,15rem),1fr))] gap-2 sm:gap-3" aria-label="Participantes no canal de voz">
                {voiceParticipants.map((participant) => {
                  const isSelf = participant.userId === currentUserId
                  const isSharing = isSelf ? communityVoiceClient.isScreenSharing : communityVoiceClient.getRemoteScreenShares().some((share) => share.userId === participant.userId)
                  const speaking = isSelf ? communityVoiceClient.isLocallySpeaking : false
                  return <button key={participant.userId} type="button" onClick={(event) => { const rect = event.currentTarget.getBoundingClientRect(); setVoiceProfileTarget({ userId: participant.userId, x: rect.left, y: rect.bottom }) }} className={`flex min-w-0 items-center justify-between gap-3 rounded-2xl border bg-background-primary p-4 text-left transition ${speaking ? 'border-emerald-400 ring-2 ring-emerald-400/30' : 'border-border hover:border-accent/50'} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent`} aria-label={`Abrir perfil de ${participant.user.displayName}`}>
                    <div className="flex min-w-0 items-center gap-3"><Avatar src={participant.user.avatarUrl} name={participant.user.displayName} size="md" /><div className="min-w-0"><p className="truncate text-sm font-semibold text-text-primary">{participant.user.displayName}{isSelf ? ' (você)' : ''}</p><p className="truncate text-[11px] text-text-secondary">{participant.selfDeafened || participant.serverDeafened ? 'Áudio desativado' : participant.selfMuted || participant.serverMuted ? 'Microfone mudo' : 'Microfone ativo'}{speaking ? ' · Falando' : ''}</p></div></div>
                    {isSharing && <span className="shrink-0 rounded-full bg-red-500/15 px-2 py-1 text-[10px] font-semibold text-red-200">Transmitindo</span>}
                  </button>
                })}
                {voiceParticipants.length === 0 && <p className="col-span-full rounded-xl border border-dashed border-border p-5 text-sm text-text-secondary">Ninguém está conectado a este canal. Entre para iniciar a conversa.</p>}
              </div>
              {!viewerInSelectedVoice && <div className="flex flex-wrap justify-center gap-2"><Button onClick={() => void joinVoice(selectedChannel)} loading={busy === `voice:${selectedChannel.id}`} leftIcon={<Mic size={15} />}>Entrar no canal</Button></div>}
              {communityVoiceClient.isScreenSharing && communityVoiceClient.getLocalScreenShare() && <figure className="w-full max-w-5xl flex-none overflow-hidden rounded-xl border border-accent/40 bg-background-secondary text-left"><figcaption className="border-b border-border px-3 py-2 text-xs font-semibold text-text-primary">Sua transmissão</figcaption><video ref={(element) => { const stream = communityVoiceClient.getLocalScreenShare(); if (element && stream && element.srcObject !== stream) element.srcObject = stream }} autoPlay muted playsInline className="aspect-video max-h-[min(55vh,720px)] w-full bg-black object-contain" aria-label="Prévia da sua transmissão de tela" /></figure>}
              {communityVoiceClient.getRemoteScreenShares().filter((share) => voiceParticipants.some((participant) => participant.userId === share.userId)).map((share) => <figure key={share.userId} className="w-full max-w-3xl flex-none overflow-hidden rounded-lg border border-border bg-background-secondary text-left">
                <figcaption className="border-b border-border px-3 py-2 text-xs font-medium text-text-primary">Tela compartilhada por {voiceParticipants.find((participant) => participant.userId === share.userId)?.user.displayName ?? 'participante'}</figcaption>
                <video ref={(element) => { if (element && element.srcObject !== share.stream) element.srcObject = share.stream }} autoPlay playsInline className="aspect-video max-h-[min(55vh,720px)] w-full bg-black object-contain" aria-label={`Tela compartilhada por ${voiceParticipants.find((participant) => participant.userId === share.userId)?.user.displayName ?? 'participante'}`} />
              </figure>)}
            </div>
            {voiceChatOpen && <aside className="flex min-h-0 w-full min-w-0 flex-col border-l border-border bg-background-primary/60 p-2 sm:p-3 md:w-[min(22rem,38vw)] md:max-w-[38vw] md:shrink-0" aria-label={`Chat do canal ${selectedChannel.name}`}><header className="mb-2 flex shrink-0 items-center justify-between gap-2 border-b border-border pb-2"><div className="min-w-0"><h4 className="text-sm font-semibold text-text-primary">Chat de voz</h4><p className="truncate text-[11px] text-text-secondary">{selectedChannel.name}</p></div><button type="button" onClick={() => setVoiceChatOpen(false)} className="shrink-0 rounded p-1 text-text-secondary hover:bg-background-tertiary" aria-label="Fechar chat"><X size={15} /></button></header>{selectedChannel.viewerCanReadHistory === false ? <p className="py-6 text-center text-xs text-text-secondary">Você não tem permissão para ler o histórico deste canal.</p> : <><div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain py-2">{messages.length ? messages.map((message) => <article key={message.id} className="min-w-0"><div className="flex items-baseline gap-2"><strong className="truncate text-xs text-text-primary">{message.author.displayName}</strong><time className="shrink-0 text-[10px] text-text-secondary">{formatTimestamp(new Date(message.createdAt))}</time><button type="button" onClick={() => setReplyTarget(message)} className="rounded p-1 text-text-secondary hover:bg-background-tertiary" aria-label="Responder mensagem"><Reply size={12} /></button>{message.author.id !== currentUserId && <button type="button" onClick={() => { setMessageReportTarget(message); setMessageReportChannelId(selectedChannel.id); setMessageReportReason('spam'); setMessageReportDetails('') }} className="rounded p-1 text-text-secondary hover:bg-background-tertiary" aria-label="Denunciar mensagem"><Flag size={12} /></button>}</div>{message.replyTo && <p className="mt-1 truncate border-l-2 border-accent pl-2 text-[10px] text-text-secondary">{message.replyTo.author?.displayName ?? 'Membro'}: {message.replyTo.excerpt ?? ''}</p>}{message.contentType === 'sticker' ? <img src={getKaoliSticker(message.stickerKey)?.asset} alt="Figurinha" className="mt-1 h-24 w-24 object-contain" /> : <><p className="whitespace-pre-wrap break-words text-xs text-text-secondary">{renderAnceryxText(message.content)}</p>{message.mediaUrl && <MediaAttachment src={message.mediaUrl} mimeType={message.mediaMimeType ?? (message.mediaUrl.toLowerCase().split('?')[0].endsWith('.mp4') ? 'video/mp4' : 'image/gif')} privateMedia alt="Mídia do chat de voz" className="mt-1 block h-auto max-h-48 max-w-full rounded-lg" />}</>}</article>) : <p className="py-6 text-center text-xs text-text-secondary">Ainda não há mensagens neste canal.</p>}</div>{replyTarget && <div className="border-t border-border py-2 text-[11px] text-text-secondary">Respondendo a {replyTarget.author.displayName}<button type="button" className="ml-2 underline" onClick={() => setReplyTarget(null)}>Cancelar</button></div>}{selectedChannel.viewerCanSendMessages === false ? <p className="border-t border-border pt-2 text-xs text-text-secondary">Você pode ler o histórico, mas não enviar mensagens.</p> : <MessageComposer value={messageDraft} onChange={setMessageDraft} onSend={() => void createMessage()} disabled={busy === 'message' || loading} imagePreview={messageFile && messageFilePreview ? { url: messageFilePreview, previewUrl: messageFilePreview, mimeType: messageFile.type as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' | 'video/mp4', sizeBytes: messageFile.size, name: messageFile.name } : null} imageLoading={busy === 'message' && Boolean(messageFile)} imageProgress={messageUploadProgress} onCancelUpload={() => messageUploadControllerRef.current?.abort()} onPickImage={async (file) => { if (!file || !selectedChannel) return; if (selectedChannel.viewerCanAttachFiles === false) { addNotification('Você não tem permissão para anexar arquivos neste canal.', 'error'); return } if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4'].includes(file.type)) { addNotification('Escolha JPEG, PNG, GIF, WEBP ou MP4.', 'error'); return } try { const max = await mediaApi.getUploadLimit('community-message', { communityId, channelId: selectedChannel.id }); if (file.size > max) { addNotification('O arquivo ultrapassa o limite de ' + Math.floor(max / 1_000_000) + ' MB da sua conta.', 'error'); return } if (messageFilePreview) URL.revokeObjectURL(messageFilePreview); setMessageFile(file); setMessageFilePreview(URL.createObjectURL(file)) } catch (error) { addNotification(error instanceof Error ? error.message : 'Não foi possível verificar o limite de envio.', 'error') } }} onRemoveImage={() => { messageUploadControllerRef.current?.abort(); if (messageFilePreview) URL.revokeObjectURL(messageFilePreview); setMessageFile(null); setMessageFilePreview(null) }} onPickGif={(gif) => void createMessage({ contentType: 'gif', gif })} onPickSticker={(stickerKey) => void createMessage({ contentType: 'sticker', stickerKey })} />}</>}</aside>}
            </section>
          ) : selectedChannel?.type === 'forum' ? (
            <CommunityForumChannel forumId={communityId} currentUserId={currentUserId} canCreateTopics={hasCommunityPermission('createTopics')} />
          ) : (
            <section className="flex min-h-0 flex-1 flex-col">
              <div className="flex-1 overflow-y-auto px-4 py-4">
                {messages.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-text-secondary">Nenhuma mensagem ainda.</div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {messages.map((message, index) => {
                      const previous = messages[index - 1]
                      const grouped = previous?.author.id === message.author.id && new Date(message.createdAt).getTime() - new Date(previous.createdAt).getTime() < 5 * 60_000
                      const sticker = message.contentType === 'sticker' ? getKaoliSticker(message.stickerKey) : undefined
                      return <article id={`community-message-${message.id}`} key={message.id} className="flex gap-3">
                        {grouped ? <div className="w-9 shrink-0" /> : <Avatar src={message.author.avatarUrl} name={message.author.displayName} size="sm" />}
                        <div className="min-w-0">
                          {message.replyTo && <button type="button" onClick={() => document.getElementById(`community-message-${message.replyTo!.messageId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })} className="mb-1 block max-w-full truncate border-l-2 border-accent pl-2 text-left text-xs text-text-secondary">{message.replyTo.deleted ? 'Mensagem excluída' : `${message.replyTo.author?.displayName ?? 'Usuário'}: ${message.replyTo.excerpt ?? ''}`}</button>}
                          <div className="flex flex-wrap items-baseline gap-2">
                            {grouped ? <span className="sr-only">{message.author.displayName}</span> : <strong className="text-sm text-text-primary">{message.author.displayName}</strong>}
                            <span className="text-[11px] text-text-secondary">{formatTimestamp(new Date(message.createdAt))}</span><button type="button" onClick={() => setReplyTarget(message)} className="rounded p-1 text-text-secondary hover:bg-background-tertiary hover:text-text-primary" aria-label="Responder mensagem" title="Responder"><Reply size={13} /></button>{message.author.id !== currentUserId && <button type="button" onClick={() => { setMessageReportTarget(message); setMessageReportChannelId(selectedChannel?.id ?? null); setMessageReportReason('spam'); setMessageReportDetails('') }} className="rounded p-1 text-text-secondary hover:bg-background-tertiary hover:text-text-primary" aria-label="Denunciar mensagem" title="Denunciar mensagem"><Flag size={13} /></button>}
                          </div>
                          {message.contentType === 'sticker' ? sticker ? <img src={sticker.asset} alt={sticker.name} className="h-32 w-32 object-contain" draggable={false} /> : <p className="text-sm text-text-secondary">Figurinha indisponível</p> : <><p className="whitespace-pre-wrap break-words text-sm text-text-secondary">{renderAnceryxText(message.content)}</p>{message.mediaUrl && <MediaAttachment src={message.mediaUrl} mimeType={message.mediaMimeType ?? (message.mediaUrl.toLowerCase().split('?')[0].endsWith('.mp4') ? 'video/mp4' : 'image/gif')} privateMedia alt="Mídia da mensagem" className="mt-2 max-h-64 max-w-full rounded-lg" />}</>}
                        </div>
                      </article>
                    })}
                  </div>
                )}
              </div>
              {replyTarget && <div className="flex items-center gap-2 border-l-2 border-accent bg-background-secondary px-3 py-2 text-xs text-text-secondary"><span className="min-w-0 flex-1 truncate">Respondendo a {replyTarget.author.displayName}: {replyTarget.content || (replyTarget.contentType === 'sticker' ? 'Figurinha' : 'Anexo')}</span><button type="button" onClick={() => setReplyTarget(null)} aria-label="Cancelar resposta"><X size={14} /></button></div>}
              {selectedChannel?.isAnnouncement && !canPostAnnouncement ? <p className="rounded-lg border border-border p-3 text-xs text-text-secondary">Somente cargos autorizados podem publicar neste canal de avisos.</p> : <MessageComposer
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
                  if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4'].includes(file.type)) { addNotification('Escolha JPEG, PNG, GIF, WEBP ou MP4.', 'error'); return }
                  try {
                    const max = await mediaApi.getUploadLimit('community-message', { communityId, channelId: selectedChannel.id })
                    if (file.size > max) { addNotification('O arquivo ultrapassa o limite de ' + Math.floor(max / 1_000_000) + ' MB da sua conta.', 'error'); return }
                    if (messageFilePreview) URL.revokeObjectURL(messageFilePreview)
                    setMessageFile(file)
                    setMessageFilePreview(URL.createObjectURL(file))
                  } catch (error) { addNotification(error instanceof Error ? error.message : 'Não foi possível verificar o limite de envio.', 'error') }
                }}
                onRemoveImage={() => { messageUploadControllerRef.current?.abort(); if (messageFilePreview) URL.revokeObjectURL(messageFilePreview); setMessageFile(null); setMessageFilePreview(null) }}
                onPickGif={(gif) => void createMessage({ contentType: 'gif', gif })}
                onPickSticker={(stickerKey) => void createMessage({ contentType: 'sticker', stickerKey })}
              />}
            </section>
          )}
          {viewerVoiceState && <section className="sticky bottom-0 z-20 border-t border-border bg-background-primary/95 p-2 backdrop-blur md:hidden" aria-label="Controles de voz"><div className="mb-1 flex items-center justify-between gap-2"><span className="truncate text-xs font-semibold text-text-primary">Voz · {viewerVoiceChannel?.name ?? 'Conectado'}</span><span className="text-[10px] text-text-secondary">{voiceStatusLabel}</span></div><CommunityVoiceActionButtons compact muted={communityVoiceClient.muted} deafened={communityVoiceClient.deafened} sharingScreen={communityVoiceClient.isScreenSharing} screenPickerLoading={screenPickerLoading} leaving={busy === 'voice:leave'} onToggleMuted={() => void communityVoiceClient.setMuted(!communityVoiceClient.muted)} onToggleDeafened={() => void communityVoiceClient.setDeafened(!communityVoiceClient.deafened)} onToggleScreenShare={() => void toggleVoiceScreenShare()} onLeave={() => void leaveVoice()} /></section>}
        </main>

        <aside className={`${membersPanelClassName} overflow-y-auto`}>
          <div className="border-b border-border p-3">
            <button type="button" onClick={() => { setMembersOpen(false); setMobileView('content') }} className="text-xs font-semibold uppercase text-text-secondary hover:text-text-primary">Membros <span className="ml-1 normal-case">{mobileView === 'members' ? 'Voltar ao conteúdo' : 'Ocultar'}</span></button>
            {state?.community.memberListMode === 'grouped_roles' ? groupedMemberEntries.map((group) => <section key={group.key} className="mt-3 first:mt-2"><h3 className="mb-1 truncate text-[10px] font-semibold uppercase tracking-wide text-text-secondary">{group.label} · {group.members.length}</h3><div className="flex flex-col gap-1.5">{group.members.map((member) => (
                <button key={member.userId} type="button" onClick={() => setSelectedMember(member)} className="flex items-center gap-2 rounded-lg p-1 text-left hover:bg-white/5">
                  <Avatar src={member.user.avatarUrl} name={member.user.displayName} size="xs" />
                  <div className="min-w-0">
                    <p className="truncate text-sm text-text-primary">{member.user.displayName}</p>
                    <p className="truncate text-[11px] text-text-secondary">{getCommunityMemberRoleLabels(member).join(' · ') || 'Membro'}</p>
                  </div>
                </button>
              ))}</div></section>) : <div className="mt-2 flex flex-col gap-2">{(state?.members ?? []).map((member) => (
                <button key={member.userId} type="button" onClick={() => setSelectedMember(member)} className="flex items-center gap-2 rounded-lg p-1 text-left hover:bg-white/5"><Avatar src={member.user.avatarUrl} name={member.user.displayName} size="xs" /><div className="min-w-0"><p className="truncate text-sm text-text-primary">{member.user.displayName}</p><p className="truncate text-[11px] text-text-secondary">{getCommunityMemberRoleLabels(member).join(' · ') || 'Membro'}</p></div></button>
              ))}</div>}
          </div>
        </aside>
        {!membersOpen && !viewingConnectedVoice && <button type="button" onClick={() => setMembersOpen(true)} className="hidden place-items-center border-l border-border text-text-secondary hover:text-text-primary xl:grid" aria-label="Mostrar membros" title="Mostrar membros"><Users size={17} /></button>}
      </div>
      {screenPickerOpen && <div className="titlebar-overlay fixed inset-x-0 bottom-0 top-9 z-[90] flex items-center justify-center bg-black/75 p-4" role="dialog" aria-modal="true" aria-label="Escolher o que compartilhar"><section className="w-full max-w-2xl rounded-2xl border border-border bg-background-secondary p-5 shadow-2xl"><div className="flex items-start justify-between gap-3"><div><h2 className="text-lg font-semibold text-text-primary">Compartilhar tela</h2><p className="mt-1 text-sm text-text-secondary">Escolha uma tela ou janela. O compartilhamento transmite vídeo; o áudio do sistema não está habilitado.</p></div><button type="button" onClick={() => setScreenPickerOpen(false)} aria-label="Fechar seletor" className="rounded-md p-2 text-text-secondary hover:bg-background-tertiary"><X size={16} /></button></div><div className="mt-4 grid max-h-[55vh] grid-cols-1 gap-3 overflow-y-auto sm:grid-cols-2">{screenSources.map((source) => <button key={source.id} type="button" disabled={screenPickerLoading} onClick={() => void startScreenShareFromSource(source.id)} className="overflow-hidden rounded-xl border border-border bg-background-primary text-left transition hover:border-accent/60 disabled:opacity-60">{source.thumbnail ? <img src={source.thumbnail} alt="" className="aspect-video w-full bg-black object-contain" /> : <div className="grid aspect-video place-items-center bg-background-tertiary"><MonitorUp size={26} className="text-text-secondary" /></div>}<span className="block truncate px-3 py-2 text-sm font-medium text-text-primary">{source.name}</span></button>)}</div><div className="mt-4 flex justify-end"><Button variant="ghost" onClick={() => setScreenPickerOpen(false)}>Cancelar</Button></div></section></div>}
      {managementOpen && <CommunityManagementModal communityName={state?.community.name ?? forum?.name ?? 'Comunidade'} sections={managementSections} activeSection={managementSection} onSelectSection={setManagementSection} onClose={() => setManagementOpen(false)}>
        {managementSection === 'reports' && canManageReports ? communityMessageReportsSection : ['overview', 'profile', 'access', 'critical', 'posts', 'members', 'reports'].includes(managementSection) && forum && canManageLegacyForum ? <ForumManagementModal forum={forum} onClose={() => setManagementOpen(false)} onForumDeleted={onForumDeleted} presentation="embedded" initialTab={(managementSection === 'reports' ? 'moderation' : managementSection) as ForumManagementTab} /> : managementSection === 'moderation' ? <div className="space-y-4">
          <div><h2 className="text-xl font-semibold text-text-primary">Moderação</h2><p className="mt-1 text-sm text-text-secondary">Aplique medidas e consulte o histórico disciplinar deste fórum.</p></div>
          {moderationSummaryError && <p role="alert" className="text-sm text-red-300">{moderationSummaryError}</p>}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-label="Resumo da moderação">
            {moderationSummaryCards.map((card) => <button key={card.label} type="button" disabled={!card.onClick || moderationSummaryLoading} onClick={card.onClick} className="rounded-xl border border-border bg-background-secondary p-4 text-left transition-colors enabled:hover:border-accent/60 disabled:cursor-default"><span className="block text-xs text-text-secondary">{card.label}</span><span className="mt-1 block text-2xl font-semibold text-text-primary">{moderationSummaryLoading ? '…' : card.value?.toLocaleString('pt-BR') ?? '—'}</span></button>)}
          </div>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Ferramentas de moderação">
            {([{ label: 'Visão geral', action: undefined }, { label: 'Advertências', action: 'warning' }, { label: 'Restrições', action: 'timeout' }, { label: 'Expulsões', action: 'kick' }, { label: 'Banimentos', action: 'ban' }] as const).map((item) => <button key={item.label} type="button" onClick={() => { setModerationFilters(item.action ? { action: item.action } : {}); void loadModerationCases(0, item.action ? { action: item.action } : {}) }} className="rounded-lg border border-border px-3 py-2 text-sm text-text-secondary hover:bg-background-secondary hover:text-text-primary">{item.label}</button>)}
            <button type="button" onClick={() => { setModerationFilters({}); void loadModerationCases(0, {}) }} className="rounded-lg border border-border px-3 py-2 text-sm text-text-secondary hover:bg-background-secondary hover:text-text-primary">Histórico disciplinar</button>
          </div>
          {canManageReports && <Button size="sm" variant="secondary" leftIcon={<Flag size={14} />} onClick={() => setManagementSection('reports')}>Denúncias de mensagens</Button>}
          {canCreateModerationActions && moderationActionForm}
          {canManageBans && bannedMembersSection}
          {canViewModerationCases && moderationCasesSection}
        </div> : managementSection === 'appeals' ? <div className="space-y-4">
          <div><h2 className="text-xl font-semibold text-text-primary">Recursos</h2><p className="mt-1 text-sm text-text-secondary">Acompanhe recursos próprios e revise as solicitações de forma independente.</p></div>
          {communityManagementContent}
        </div> : managementSection === 'audit' ? <div className="space-y-4"><h2 className="text-xl font-semibold text-text-primary">Registro de auditoria</h2>{auditLogSection}</div> : <div className="space-y-4">
          <div><h2 className="text-xl font-semibold text-text-primary">{managementSection === 'preferences' ? 'Preferências do Fórum' : 'Canais, cargos e convites'}</h2><p className="mt-1 text-sm text-text-secondary">{managementSection === 'preferences' ? 'Ajuste como os membros aparecem e quem pode revisar recursos.' : 'Organize o acesso, os canais e as pessoas do Fórum.'}</p></div>
          {communityManagementContent}
        </div>}
      </CommunityManagementModal>}
      {messageReportTarget && <div className="titlebar-overlay fixed inset-x-0 bottom-0 top-9 z-[85] grid place-items-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-labelledby="community-message-report-title" onKeyDown={(event) => { if (event.key === 'Escape' && busy !== 'message-report:create') setMessageReportTarget(null) }}><form className="w-full max-w-md space-y-4 rounded-xl border border-border bg-background-secondary p-5" onSubmit={(event) => { event.preventDefault(); void submitMessageReport() }}><div><h2 id="community-message-report-title" className="font-semibold text-text-primary">Denunciar mensagem</h2><p className="mt-1 line-clamp-3 break-words text-xs text-text-secondary">{messageReportTarget.content || (messageReportTarget.contentType === 'sticker' ? 'Figurinha' : 'Anexo')}</p></div><label className="block text-xs text-text-secondary">Motivo<select value={messageReportReason} onChange={(event) => setMessageReportReason(event.target.value)} className="mt-1 w-full rounded-md border border-border bg-background-primary px-3 py-2 text-sm text-text-primary"><option value="spam">Spam</option><option value="harassment">Assédio</option><option value="inappropriate_content">Conteúdo inadequado</option><option value="scam_or_fraud">Golpe ou fraude</option><option value="violence_or_threat">Violência ou ameaça</option><option value="personal_information">Exposição de dados pessoais</option><option value="other">Outro</option></select></label><label className="block text-xs text-text-secondary">Detalhes {messageReportReason === 'other' ? '(obrigatórios)' : '(opcionais)'}<textarea value={messageReportDetails} onChange={(event) => setMessageReportDetails(event.target.value.slice(0, 1000))} maxLength={1000} rows={3} className="mt-1 w-full rounded-md border border-border bg-background-primary p-2 text-sm text-text-primary" /></label><div className="flex justify-end gap-2"><Button type="button" variant="ghost" disabled={busy === 'message-report:create'} onClick={() => setMessageReportTarget(null)}>Cancelar</Button><Button type="submit" loading={busy === 'message-report:create'} disabled={!messageReportChannelId || messageReportReason === 'other' && !messageReportDetails.trim()}>Enviar denúncia</Button></div></form></div>}
      {confirmDelete && <div className="titlebar-overlay fixed inset-x-0 bottom-0 top-9 z-[90] grid place-items-center bg-black/70 p-4" role="alertdialog" aria-modal="true" aria-label="Confirmar exclusão"><div className="w-full max-w-sm space-y-4 rounded-xl border border-border bg-background-secondary p-5"><h2 className="font-semibold text-text-primary">Excluir {confirmDelete.type === 'category' ? 'categoria' : 'canal'}?</h2><p className="text-sm text-text-secondary">{confirmDelete.name}</p><div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setConfirmDelete(null)}>Cancelar</Button><Button variant="danger" loading={busy === `${confirmDelete.type}:${confirmDelete.id}`} onClick={() => void (confirmDelete.type === 'category' ? deleteCategory(confirmDelete.id) : deleteChannel(confirmDelete.id))}>Excluir</Button></div></div></div>}
      {voiceProfileTarget && (() => {
        const participant = voiceParticipants.find((item) => item.userId === voiceProfileTarget.userId)
        if (!participant) return null
        const member = state?.members.find((item) => item.userId === participant.userId)
        const left = Math.max(8, Math.min(voiceProfileTarget.x, window.innerWidth - 296))
        const top = Math.max(8, Math.min(voiceProfileTarget.y, window.innerHeight - 220))
        return <div className="fixed inset-0 z-[70]" role="presentation" onMouseDown={() => setVoiceProfileTarget(null)} onKeyDown={(event) => { if (event.key === 'Escape') setVoiceProfileTarget(null) }}><section role="dialog" aria-label={`Perfil de ${participant.user.displayName}`} className="absolute w-72 rounded-2xl border border-border bg-background-secondary p-4 text-left shadow-2xl" style={{ left, top }} onMouseDown={(event) => event.stopPropagation()}><div className="flex items-center gap-3"><Avatar src={participant.user.avatarUrl} name={participant.user.displayName} size="lg" /><div className="min-w-0"><h3 className="truncate text-sm font-semibold text-text-primary">{participant.user.displayName}</h3><p className="truncate text-xs text-text-secondary">@{participant.user.username}</p></div></div><div className="mt-3 flex flex-wrap gap-1">{member?.roles.map((role) => <span key={role.id} className="rounded-full border border-border px-2 py-0.5 text-[10px] text-text-secondary">{role.name}</span>)}{member && <span className="rounded-full border border-border px-2 py-0.5 text-[10px] text-text-secondary">{member.role === 'owner' ? 'Proprietário' : member.role === 'moderator' ? 'Moderador' : 'Membro'}</span>}</div><button type="button" onClick={() => { setVoiceProfileUsername(participant.user.username); setVoiceProfileTarget(null) }} className="mt-4 min-h-9 w-full rounded-lg bg-accent px-3 text-sm font-medium text-white hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">Abrir perfil completo</button></section></div>
      })()}
      {selectedMember && state && <UserProfileModal username={selectedMember.user.username} communityContext={{ forumName: state.community.name, joinedAt: selectedMember.joinedAt, memberRole: selectedMember.role, roles: selectedMember.roles }} isOpen onClose={() => setSelectedMember(null)} />}
      {voiceProfileUsername && <UserProfileModal username={voiceProfileUsername} isOpen onClose={() => setVoiceProfileUsername(null)} />}
    </div>
  )
}

export default CommunityWorkspaceModal
