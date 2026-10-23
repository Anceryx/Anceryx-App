import React, { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  Hash,
  Lock,
  Pin,
  Settings,
  Shield,
  Trash2,
  Unlock,
  Users,
  X,
  ImagePlus,
} from 'lucide-react'
import type { Forum, ForumMemberRole } from '@/types/index'
import {
  ActionRow,
  Button,
  ContentSectionCard,
  SectionHeader,
  StatCard,
  ImageCropModal,
  Input,
} from '@/components/ui/index'
import { useAuthStore } from '@/store/authStore'
import { useSocialStore } from '@/store/socialStore'
import { useUIStore } from '@/store/uiStore'
import { dataUrlToBlob } from '@/utils/media'
import {
  forumApi,
  type ApiForumMember,
  type ApiForumReport,
  type ApiForumTag,
  type ApiForumTopic,
} from '@/services/forumApi'
import { Avatar } from '@/components/ui/index'
import { formatTimestamp } from '@/utils/formatters'
import { mediaApi } from '@/services/mediaApi'
import { communityApi } from '@/services/communityApi'
import { useTranslation, type TranslationKey } from '@/i18n'

export type ForumManagementTab = 'overview' | 'posts' | 'members' | 'moderation' | 'profile' | 'access' | 'critical' | 'settings'
type TopicFlag = 'isPinned' | 'isLocked' | 'isResolved'

interface ForumManagementModalProps {
  forum: Forum
  onClose: () => void
  onForumDeleted?: () => void
  presentation?: 'modal' | 'embedded'
  initialTab?: ForumManagementTab
}

const TABS: { id: ForumManagementTab; labelKey: TranslationKey; icon: React.ReactNode }[] = [
  { id: 'overview', labelKey: 'forumManage.overview', icon: <Shield size={15} /> },
  { id: 'posts', labelKey: 'forumManage.posts', icon: <FileText size={15} /> },
  { id: 'members', labelKey: 'forumManage.members', icon: <Users size={15} /> },
  { id: 'moderation', labelKey: 'forumManage.moderation', icon: <AlertTriangle size={15} /> },
  { id: 'profile', labelKey: 'forumManage.profile', icon: <Settings size={15} /> },
  { id: 'access', labelKey: 'forumManage.access', icon: <Unlock size={15} /> },
  { id: 'critical', labelKey: 'forumManage.critical', icon: <Trash2 size={15} /> },
]

function roleLabelKey(role: ForumMemberRole): TranslationKey {
  if (role === 'owner') return 'forumManage.role.owner'
  if (role === 'moderator') return 'forumManage.role.moderator'
  return 'forumManage.role.member'
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function reportStatusKey(status: ApiForumReport['status'] | 'open'): TranslationKey {
  if (status === 'pending') return 'forumManage.status.pending'
  if (status === 'reviewing') return 'forumManage.status.reviewing'
  if (status === 'resolved') return 'forumManage.status.resolved'
  if (status === 'dismissed') return 'forumManage.status.dismissed'
  return 'forumManage.status.open'
}

const ForumManagementModal: React.FC<ForumManagementModalProps> = ({ forum, onClose, onForumDeleted, presentation = 'modal', initialTab = 'overview' }) => {
  const t = useTranslation()
  const locale = useUIStore((state) => state.locale)
  const currentUserId = useAuthStore((s) => s.user?.id ?? '')
  const addNotification = useUIStore((s) => s.addNotification)
  const {
    updateForum,
    toggleForumJoin,
    updateForumTags,
    setForumMemberRole,
    removeForumMember,
    removeForum,
    setForumTopicFlag,
    profiles,
  } = useSocialStore((s) => ({
    updateForum: s.updateForum,
    toggleForumJoin: s.toggleForumJoin,
    updateForumTags: s.updateForumTags,
    setForumMemberRole: s.setForumMemberRole,
    removeForumMember: s.removeForumMember,
    removeForum: s.removeForum,
    setForumTopicFlag: s.setForumTopicFlag,
    profiles: s.profiles,
  }))
  const getProfile = (userId: string) => profiles[userId] ? { displayName: profiles[userId].displayName, handle: profiles[userId].username } : { displayName: t('forumManage.unknownUser'), handle: userId }

  const [activeTab, setActiveTab] = useState<ForumManagementTab>(initialTab)
  const [confirmRemoveUserId, setConfirmRemoveUserId] = useState<string | null>(null)
  const [deleteConfirmation, setDeleteConfirmation] = useState('')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [tagInput, setTagInput] = useState('')
  const [pendingAction, setPendingAction] = useState<string | null>(null)
  const [apiError, setApiError] = useState<string | null>(null)
  const [remoteMembers, setRemoteMembers] = useState<ApiForumMember[] | null>(null)
  const [remoteTags, setRemoteTags] = useState<ApiForumTag[] | null>(null)
  const [remoteTopics, setRemoteTopics] = useState<ApiForumTopic[] | null>(null)
  const [remoteReports, setRemoteReports] = useState<ApiForumReport[] | null>(null)
  const [reportStatusFilter, setReportStatusFilter] = useState<ApiForumReport['status'] | ''>('')
  const [reportTypeFilter, setReportTypeFilter] = useState<ApiForumReport['targetType'] | ''>('')
  const [reportCreatedAfter, setReportCreatedAfter] = useState('')
  const [reportCreatedBefore, setReportCreatedBefore] = useState('')
  const [reportResolutionNotes, setReportResolutionNotes] = useState<Record<string, string>>({})
  const [reportLoading, setReportLoading] = useState(false)
  const [reportHasMore, setReportHasMore] = useState(false)
  const [reportOffset, setReportOffset] = useState(0)
  const [settingsDraft, setSettingsDraft] = useState({
    name: forum.name,
    description: forum.description,
    visibility: forum.visibility,
  })
  const [imageBusy, setImageBusy] = useState<'icon' | 'banner' | null>(null)
  const [cropSource, setCropSource] = useState<string | null>(null)
  const [cropFile, setCropFile] = useState<File | null>(null)
  const [cropTarget, setCropTarget] = useState<'icon' | 'banner'>('icon')
  const iconInputRef = React.useRef<HTMLInputElement>(null)
  const bannerInputRef = React.useRef<HTMLInputElement>(null)
  useEffect(() => () => { if (cropSource) URL.revokeObjectURL(cropSource) }, [cropSource])

  const backendReady = isUuid(forum.id)
  const displayedMembers = remoteMembers ?? forum.members
  const displayedTags = remoteTags?.map((tag) => tag.name) ?? forum.tags
  const displayedTopics = remoteTopics ?? forum.topics
  const displayedReports = remoteReports ?? []
  const currentRole = displayedMembers.find((member) => member.userId === currentUserId)?.role
      forum.members.find((member) => member.userId === currentUserId)?.role
      null
  const canManage = currentRole === 'owner' || currentRole === 'moderator'
  const isOwner = currentRole === 'owner'
  const pendingReports = displayedReports.filter((report) => report.status === 'pending' || report.status === 'reviewing')
  const sortedMembers = useMemo(
    () => [...displayedMembers].sort((a, b) => a.role.localeCompare(b.role) || new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime()),
    [displayedMembers]
  )

  const loadRemoteState = async () => {
    if (!backendReady) {
      setApiError(t('forumManage.error.unsynced'))
      return
    }
    setPendingAction('refresh')
    setApiError(null)
    try {
      const [members, tags, topics] = await Promise.all([
        forumApi.listMembers(forum.id),
        forumApi.listTags(forum.id),
        forumApi.listTopics(forum.id),
      ])
      setRemoteMembers(members.members)
      setRemoteTags(tags.tags)
      setRemoteTopics(topics.topics)
    } catch (error) {
      setApiError(error instanceof Error ? error.message : t('forumManage.error.load'))
    } finally {
      setPendingAction(null)
    }
  }

  useEffect(() => {
    void loadRemoteState()
  }, [forum.id])

  useEffect(() => setActiveTab(initialTab), [initialTab])

  const loadReportPage = async (offset = 0, append = false) => {
    if (!backendReady) return
    setReportLoading(true)
    setApiError(null)
    try {
      const createdAfter = reportCreatedAfter ? new Date(`${reportCreatedAfter}T00:00:00.000Z`).toISOString() : undefined
      const createdBefore = reportCreatedBefore ? new Date(`${reportCreatedBefore}T23:59:59.999Z`).toISOString() : undefined
      const { reports } = await forumApi.listReports(forum.id, { status: reportStatusFilter || undefined, targetType: reportTypeFilter || undefined, createdAfter, createdBefore, limit: 20, offset })
      setRemoteReports((current) => append ? [...(current ?? []), ...reports] : reports)
      setReportOffset(offset + reports.length)
      setReportHasMore(reports.length === 20)
    } catch (error) {
      setApiError(error instanceof Error ? error.message : t('forumManage.error.loadReports'))
    } finally { setReportLoading(false) }
  }

  useEffect(() => {
    if (activeTab === 'moderation') void loadReportPage(0)
  }, [activeTab, forum.id, reportStatusFilter, reportTypeFilter, reportCreatedAfter, reportCreatedBefore])

  const reviewReport = async (reportId: string, status: 'reviewing' | 'resolved' | 'dismissed') => {
    setPendingAction(`report:${reportId}`)
    setApiError(null)
    try {
      await forumApi.reviewReport(reportId, { status, resolutionNote: reportResolutionNotes[reportId]?.trim() || undefined })
      addNotification(status === 'reviewing' ? t('forumManage.notice.reportReviewing') : status === 'resolved' ? t('forumManage.notice.reportResolved') : t('forumManage.notice.reportDismissed'), 'success')
      await loadReportPage(0)
    } catch (error) {
      const message = error instanceof Error ? error.message : t('forumManage.error.reviewReport')
      setApiError(message)
      addNotification(message, 'error')
    } finally { setPendingAction(null) }
  }

  const runBackendAction = async (action: string, successMessage: string, operation: () => Promise<void>) => {
    if (!backendReady) {
      setApiError(t('forumManage.error.actionNotReady'))
      return
    }
    setPendingAction(action)
    setApiError(null)
    try {
      await operation()
      addNotification(successMessage, 'success')
    } catch (error) {
      const message = error instanceof Error ? error.message : t('forumManage.error.action')
      setApiError(message)
      addNotification(message, 'error')
    } finally {
      setPendingAction(null)
    }
  }

  if (!canManage) return null

  const promote = (userId: string) => {
    void runBackendAction(`promote:${userId}`, t('forumManage.notice.memberPromoted'), async () => {
      await forumApi.updateMemberRole(forum.id, userId, 'moderator')
      setForumMemberRole(forum.id, currentUserId, userId, 'moderator')
      await loadRemoteState()
    })
  }

  const demote = (userId: string) => {
    void runBackendAction(`demote:${userId}`, t('forumManage.notice.memberDemoted'), async () => {
      await forumApi.updateMemberRole(forum.id, userId, 'member')
      setForumMemberRole(forum.id, currentUserId, userId, 'member')
      await loadRemoteState()
    })
  }

  const remove = () => {
    if (!confirmRemoveUserId) return
    const userId = confirmRemoveUserId
    void runBackendAction(`remove:${userId}`, t('forumManage.notice.memberRemoved'), async () => {
      await forumApi.removeMember(forum.id, userId)
      removeForumMember(forum.id, currentUserId, userId)
      setConfirmRemoveUserId(null)
      await loadRemoteState()
    })
  }

  const addTag = () => {
    const next = tagInput.trim().replace(/^#/, '')
    if (!next || displayedTags.includes(next)) {
      setTagInput('')
      return
    }
    void runBackendAction('tag:add', t('forumManage.notice.tagAdded'), async () => {
      await forumApi.createTag(forum.id, next)
      updateForumTags(forum.id, [...displayedTags, next])
      setTagInput('')
      await loadRemoteState()
    })
  }

  const removeTag = (tag: string) => {
    void runBackendAction(`tag:remove:${tag}`, t('forumManage.notice.tagRemoved'), async () => {
      const remoteTag = remoteTags?.find((item) => item.name === tag || item.slug === tag)
      const tagId = remoteTag?.id ?? (await forumApi.listTags(forum.id)).tags.find((item) => item.name === tag || item.slug === tag)?.id
      if (!tagId) throw new Error(t('forumManage.error.tagUnavailable'))
      await forumApi.deleteTag(forum.id, tagId)
      updateForumTags(forum.id, displayedTags.filter((item) => item !== tag))
      await loadRemoteState()
    })
  }

  const saveSettings = () => {
    void runBackendAction('settings:save', t('forumManage.notice.settingsSaved'), async () => {
      await forumApi.updateForum(forum.id, settingsDraft)
      updateForum(forum.id, settingsDraft)
      await loadRemoteState()
    })
  }

  const leaveForum = () => {
    if (!forum.isJoined || currentRole === 'owner' || !window.confirm(t('forumManage.confirm.leave'))) return
    void runBackendAction('forum:leave', t('forumManage.notice.leftForum'), async () => {
      await toggleForumJoin(forum.id)
      onClose()
    })
  }

  const deleteForum = () => {
    if (!isOwner || deleteConfirmation !== forum.name) return
    void runBackendAction('forum:delete', t('forumManage.notice.forumDeleted'), async () => {
      await communityApi.deleteCommunity(forum.id, forum.name)
      removeForum(forum.id)
      setDeleteDialogOpen(false)
      onClose()
      onForumDeleted?.()
    })
  }

  const deleteConfirmationDialog = deleteDialogOpen && <div className="titlebar-overlay fixed inset-x-0 bottom-0 top-9 z-[90] grid place-items-center bg-black/75 p-4" role="alertdialog" aria-modal="true" aria-labelledby="forum-delete-title" aria-describedby="forum-delete-description"><form className="w-full max-w-md space-y-4 rounded-xl border border-border bg-background-secondary p-5 shadow-2xl" onSubmit={(event) => { event.preventDefault(); deleteForum() }}><div><h2 id="forum-delete-title" className="text-lg font-semibold text-text-primary">{t('forumManage.delete.title')}</h2><p id="forum-delete-description" className="mt-2 text-sm text-text-secondary">{t('forumManage.delete.description')}</p><p className="mt-3 rounded-md bg-background-tertiary p-2 text-sm font-semibold text-text-primary">{forum.name}</p></div><label className="block text-sm text-text-secondary">{t('forumManage.delete.confirmLabel')}<Input autoFocus value={deleteConfirmation} onChange={(event) => setDeleteConfirmation(event.target.value)} className="mt-1" /></label>{apiError && <p role="alert" className="text-sm text-red-300">{apiError}</p>}<div className="flex justify-end gap-2"><Button type="button" variant="ghost" disabled={pendingAction === 'forum:delete'} onClick={() => { setDeleteDialogOpen(false); setDeleteConfirmation('') }}>{t('common.cancel')}</Button><Button type="submit" variant="danger" loading={pendingAction === 'forum:delete'} disabled={deleteConfirmation !== forum.name}>{t('forumManage.delete.title')}</Button></div></form></div>

  const uploadIdentityImage = async (target: 'icon' | 'banner', file?: File) => {
    if (!file || !isOwner) return
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) { setApiError(t('forumManage.error.imageType')); return }
    if (file.size > 15 * 1024 * 1024) { setApiError(t('forumManage.error.imageSize')); return }
    if (cropSource) URL.revokeObjectURL(cropSource)
    setCropFile(file); setCropTarget(target); setCropSource(URL.createObjectURL(file)); setApiError(null)
  }

  const applyIdentityCrop = async (dataUrl: string) => {
    if (!cropFile || !cropSource) return
    const source = cropSource
    const target = cropTarget
    const original = cropFile
    setCropSource(null); setCropFile(null); URL.revokeObjectURL(source)
    setImageBusy(target); setApiError(null)
    try {
      const blob = dataUrlToBlob(dataUrl)
      const extension = blob.type === 'image/webp' ? 'webp' : 'png'
      const file = new File([blob], `${original.name.replace(/\.[^.]+$/, '')}-crop.${extension}`, { type: blob.type || 'image/png' })
      const asset = await mediaApi.uploadFile(target === 'icon' ? 'forum-icon' : 'forum-banner', file)
      const patch = target === 'icon' ? { iconUrl: asset.publicUrl } : { bannerUrl: asset.publicUrl }
      await forumApi.updateForum(forum.id, patch)
      updateForum(forum.id, target === 'icon' ? { iconImage: asset.publicUrl } : { bannerImage: asset.publicUrl })
      addNotification(target === 'icon' ? t('forumManage.notice.iconUpdated') : t('forumManage.notice.bannerUpdated'), 'success')
    } catch (error) {
      const message = error instanceof Error ? error.message : t('forumManage.error.imageUpload')
      setApiError(message)
      addNotification(message, 'error')
    } finally {
      setImageBusy(null)
    }
  }

  const toggleTopicFlag = (topicId: string, flag: TopicFlag, value: boolean) => {
    void runBackendAction(`${flag}:${topicId}`, t('forumManage.notice.topicUpdated'), async () => {
      await forumApi.setTopicFlag(forum.id, topicId, flag, value)
      setForumTopicFlag(forum.id, topicId, flag, value)
      await loadRemoteState()
    })
  }

  const renderOverview = () => (
    <div className="space-y-5">
      <SectionHeader eyebrow="Comunidade" title={forum.name} description={forum.description} />
      <div className="grid grid-cols-4 gap-3 max-[900px]:grid-cols-2">
        <StatCard label={t('forumManage.visibility')} value={forum.visibility === 'public' ? t('forumManage.public') : t('forumManage.private')} />
        <StatCard label={t('forumManage.members')} value={displayedMembers.length.toLocaleString(locale)} />
        <StatCard label={t('forumManage.topicsPosts')} value={displayedTopics.length.toLocaleString(locale)} />
        <StatCard label={t('forumManage.pendingReports')} value={pendingReports.length} />
      </div>
      <ContentSectionCard>
        <div className="grid grid-cols-2 gap-4 max-[760px]:grid-cols-1">
          <ActionRow title={t('forumManage.owner')} description={getProfile(forum.ownerId).displayName} />
          <ActionRow title={t('forumManage.createdAt')} description={formatTimestamp(forum.createdAt)} />
          <ActionRow title={t('forumManage.tags')} description={displayedTags.length ? displayedTags.map((tag) => `#${tag}`).join(', ') : t('forumManage.noTags')} />
          <ActionRow title={t('forumManage.yourRole')} description={currentRole ? t(roleLabelKey(currentRole)) : t('forumManage.noMembership')} />
        </div>
      </ContentSectionCard>
    </div>
  )

  const renderPosts = () => (
    <div className="space-y-5">
      <SectionHeader title={t('forumManage.postsAndTopics')} description={t('forumManage.postsDescription')} />
      {displayedTopics.length === 0 ? (
        <ContentSectionCard className="text-center text-sm text-text-secondary">
          {t('forumManage.noTopics')}
        </ContentSectionCard>
      ) : (
        <div className="space-y-3">
          {displayedTopics.map((topic) => (
            <ContentSectionCard key={topic.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-semibold text-text-primary">{topic.title}</h3>
                  <p className="mt-1 text-sm text-text-secondary line-clamp-2">{topic.content}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    {topic.isPinned && <span className="rounded-full bg-accent/15 px-2 py-0.5 text-accent">{t('forumManage.pinned')}</span>}
                    {topic.isLocked && <span className="rounded-full bg-yellow-500/15 px-2 py-0.5 text-yellow-300">{t('forumManage.locked')}</span>}
                    {topic.isResolved && <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-emerald-400">{t('forumManage.resolved')}</span>}
                  </div>
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  <Button size="sm" variant="secondary" loading={pendingAction === `isPinned:${topic.id}`} leftIcon={<Pin size={13} />} onClick={() => toggleTopicFlag(topic.id, 'isPinned', !topic.isPinned)}>
                    {topic.isPinned ? t('forumManage.unpin') : t('forumManage.pin')}
                  </Button>
                  <Button size="sm" variant="secondary" loading={pendingAction === `isLocked:${topic.id}`} leftIcon={topic.isLocked ? <Unlock size={13} /> : <Lock size={13} />} onClick={() => toggleTopicFlag(topic.id, 'isLocked', !topic.isLocked)}>
                    {topic.isLocked ? t('forumManage.unlock') : t('forumManage.lock')}
                  </Button>
                  <Button size="sm" variant="secondary" loading={pendingAction === `isResolved:${topic.id}`} leftIcon={<CheckCircle2 size={13} />} onClick={() => toggleTopicFlag(topic.id, 'isResolved', !topic.isResolved)}>
                    {topic.isResolved ? t('forumManage.markUnresolved') : t('forumManage.markResolved')}
                  </Button>
                </div>
              </div>
            </ContentSectionCard>
          ))}
        </div>
      )}
    </div>
  )

  const renderMembers = () => (
    <div className="space-y-5">
      <SectionHeader title={t('forumManage.members')} description={t('forumManage.membersDescription')} />
      <div className="space-y-3">
        {sortedMembers.map((member) => {
          const apiUser = 'user' in member ? member.user : null
          const profile = apiUser ? { displayName: apiUser.displayName, handle: apiUser.username } : getProfile(member.userId)
          const protectedOwner = member.role === 'owner'
          const self = member.userId === currentUserId
          return (
            <ActionRow
              key={member.userId}
              icon={<Avatar name={profile.displayName} src={apiUser?.avatarUrl ?? null} size="sm" />}
              title={profile.displayName}
              description={t('forumManage.memberJoined', { handle: profile.handle, time: formatTimestamp(new Date(member.joinedAt)) })}
              meta={<span className="rounded-full border border-border bg-background-tertiary px-2 py-0.5">{t(roleLabelKey(member.role))}</span>}
              action={
                <div className="flex flex-wrap justify-end gap-2">
                  <Button size="sm" variant="secondary" loading={pendingAction === `promote:${member.userId}`} disabled={!isOwner || protectedOwner || self || member.role === 'moderator'} onClick={() => promote(member.userId)}>
                    {t('forumManage.promote')}
                  </Button>
                  <Button size="sm" variant="secondary" loading={pendingAction === `demote:${member.userId}`} disabled={!isOwner || protectedOwner || self || member.role !== 'moderator'} onClick={() => demote(member.userId)}>
                    {t('forumManage.demote')}
                  </Button>
                  <Button size="sm" variant="danger" loading={pendingAction === `remove:${member.userId}`} disabled={!isOwner || protectedOwner || self} onClick={() => setConfirmRemoveUserId(member.userId)}>
                    {t('forumManage.remove')}
                  </Button>
                </div>
              }
            />
          )
        })}
      </div>
    </div>
  )

  const renderModeration = () => (
    <div className="space-y-5">
      <SectionHeader title={t('forumManage.reports')} description={t('forumManage.reportsDescription')} />
      <div className="grid gap-3 rounded-xl border border-border bg-background-secondary p-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-xs text-text-secondary">{t('forumManage.reportStatus')}<select aria-label={t('forumManage.filterReportStatus')} value={reportStatusFilter} onChange={(event) => setReportStatusFilter(event.target.value as typeof reportStatusFilter)} className="mt-1 w-full rounded-lg border border-border bg-background-primary px-3 py-2 text-sm text-text-primary"><option value="">{t('forumManage.allFem')}</option><option value="pending">{t('forumManage.status.pending')}</option><option value="reviewing">{t('forumManage.status.reviewing')}</option><option value="resolved">{t('forumManage.status.resolved')}</option><option value="dismissed">{t('forumManage.status.dismissed')}</option></select></label>
        <label className="text-xs text-text-secondary">{t('forumManage.reportType')}<select aria-label={t('forumManage.filterReportType')} value={reportTypeFilter} onChange={(event) => setReportTypeFilter(event.target.value as typeof reportTypeFilter)} className="mt-1 w-full rounded-lg border border-border bg-background-primary px-3 py-2 text-sm text-text-primary"><option value="">{t('forumManage.allMasc')}</option><option value="forum_topic">{t('forumManage.target.topic')}</option><option value="forum_reply">{t('forumManage.target.reply')}</option><option value="post">{t('forumManage.target.post')}</option><option value="post_comment">{t('forumManage.target.comment')}</option><option value="user">{t('forumManage.target.member')}</option></select></label>
        <label className="text-xs text-text-secondary">{t('forumManage.from')}<input aria-label={t('forumManage.filterFrom')} type="date" value={reportCreatedAfter} onChange={(event) => setReportCreatedAfter(event.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background-primary px-3 py-2 text-sm text-text-primary" /></label>
        <label className="text-xs text-text-secondary">{t('forumManage.to')}<input aria-label={t('forumManage.filterTo')} type="date" value={reportCreatedBefore} onChange={(event) => setReportCreatedBefore(event.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background-primary px-3 py-2 text-sm text-text-primary" /></label>
      </div>
      {apiError && activeTab === 'moderation' && <p role="alert" className="text-sm text-red-300">{apiError}</p>}
      {reportLoading && <p role="status" className="text-sm text-text-secondary">{t('forumManage.loadingReports')}</p>}
      {!reportLoading && displayedReports.length === 0 ? (
        <ContentSectionCard className="text-center text-sm text-text-secondary">
          {t('forumManage.noReports')}
        </ContentSectionCard>
      ) : (
        <div className="space-y-3">
          {displayedReports.map((report) => (
            <article key={report.id} className="space-y-3 rounded-xl border border-border bg-background-secondary p-4">
              <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><h3 className="break-all text-sm font-semibold text-text-primary">{report.targetType === 'forum_topic' ? 'Tópico' : report.targetType === 'forum_reply' ? 'Resposta' : report.targetType === 'post' ? 'Publicação' : report.targetType === 'post_comment' ? 'Comentário' : 'Membro'} · {report.targetId}</h3><p className="mt-1 text-xs text-text-secondary">{report.reason} · {formatTimestamp(new Date(report.createdAt))}</p></div><span className="rounded-full border border-border bg-background-tertiary px-2 py-1 text-xs">{t(reportStatusKey(report.status))}</span></div>
              {report.details && <p className="whitespace-pre-wrap break-words text-sm text-text-primary">{report.details}</p>}
              {report.evidence.length > 0 && <details><summary className="cursor-pointer text-xs text-accent">{t('forumManage.viewEvidence')}</summary><ul className="mt-2 space-y-1">{report.evidence.map((evidence, index) => <li key={`${report.id}-${index}`} className="break-all text-xs text-text-secondary">{evidence}</li>)}</ul></details>}
              {report.resolutionNote && <p className="text-xs text-text-secondary">{t('forumManage.decisionRecorded', { value: report.resolutionNote })}</p>}
              {(report.status === 'pending' || report.status === 'reviewing') && <div className="space-y-2"><textarea aria-label={t('forumManage.resolutionNote')} value={reportResolutionNotes[report.id] ?? ''} onChange={(event) => setReportResolutionNotes((current) => ({ ...current, [report.id]: event.target.value.slice(0, 1000) }))} maxLength={1000} rows={2} placeholder={t('forumManage.resolutionNotePlaceholder')} className="w-full rounded-lg border border-border bg-background-primary p-2 text-xs text-text-primary" /><div className="flex flex-wrap gap-2"><Button size="sm" variant="secondary" disabled={pendingAction === `report:${report.id}`} loading={pendingAction === `report:${report.id}`} onClick={() => void reviewReport(report.id, 'reviewing')}>{t('forumManage.takeReport')}</Button><Button size="sm" variant="secondary" disabled={pendingAction === `report:${report.id}`} onClick={() => void reviewReport(report.id, 'resolved')}>{t('forumManage.resolveReport')}</Button><Button size="sm" variant="ghost" disabled={pendingAction === `report:${report.id}`} onClick={() => void reviewReport(report.id, 'dismissed')}>{t('forumManage.dismissReport')}</Button></div></div>}
            </article>
          ))}
        </div>
      )}
      {reportHasMore && <Button size="sm" variant="secondary" loading={reportLoading} onClick={() => void loadReportPage(reportOffset, true)}>{t('forumManage.loadMoreReports')}</Button>}
    </div>
  )

  const renderSettings = () => (
    <div className="space-y-5">
      <SectionHeader title={activeTab === 'access' ? t('forumManage.access') : activeTab === 'critical' ? t('forumManage.critical') : t('forumManage.profile')} description={activeTab === 'access' ? t('forumManage.accessDescription') : activeTab === 'critical' ? t('forumManage.criticalDescription') : t('forumManage.profileDescription')} />
      <ContentSectionCard className="space-y-4">
        {(activeTab === 'profile' || activeTab === 'settings') && <>
        <label className="block text-xs font-semibold uppercase tracking-wide text-text-secondary">
          {t('forumManage.name')}
          <input disabled={!isOwner} className="mt-1 w-full rounded-lg border border-border bg-background-tertiary px-3 py-2 text-sm text-text-primary disabled:opacity-60" value={settingsDraft.name} onChange={(e) => setSettingsDraft((draft) => ({ ...draft, name: e.target.value }))} />
        </label>
        <label className="block text-xs font-semibold uppercase tracking-wide text-text-secondary">
          {t('forumManage.description')}
          <textarea disabled={!isOwner} className="mt-1 w-full resize-none rounded-lg border border-border bg-background-tertiary px-3 py-2 text-sm text-text-primary disabled:opacity-60" rows={3} value={settingsDraft.description} onChange={(e) => setSettingsDraft((draft) => ({ ...draft, description: e.target.value }))} />
        </label>
        </>}
        {activeTab === 'access' && <label className="block text-xs font-semibold uppercase tracking-wide text-text-secondary">
          {t('forumManage.visibility')}
          <select disabled={!isOwner} className="mt-1 w-full max-w-md rounded-lg border border-border bg-background-tertiary px-3 py-2 text-sm text-text-primary disabled:opacity-60" value={settingsDraft.visibility} onChange={(e) => setSettingsDraft((draft) => ({ ...draft, visibility: e.target.value as Forum['visibility'] }))}>
            <option value="public">{t('forumManage.public')}</option>
            <option value="private">{t('forumManage.private')}</option>
          </select>
          <span className="mt-1 block normal-case font-normal">{t('forumManage.visibilityCurrent', { value: settingsDraft.visibility === 'public' ? t('forumManage.publicLower') : t('forumManage.privateLower') })}</span>
        </label>}
        {(activeTab === 'profile' || activeTab === 'settings') && <>
        <div className="grid min-w-0 grid-cols-1 gap-3 @container sm:grid-cols-2">
          <div className="min-w-0 space-y-2 rounded-lg border border-border p-3">
            <p className="text-xs font-semibold text-text-secondary">{t('forumManage.icon')}</p>
            {forum.iconImage && <img src={mediaApi.resolvePublicUrl(forum.iconImage)} alt={t('forumManage.currentIcon')} className="h-14 w-14 rounded-xl object-cover" />}
            <input ref={iconInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(event) => { void uploadIdentityImage('icon', event.target.files?.[0]); event.currentTarget.value = '' }} />
            <Button size="sm" variant="secondary" disabled={!isOwner || Boolean(imageBusy)} loading={imageBusy === 'icon'} onClick={() => iconInputRef.current?.click()} leftIcon={<ImagePlus size={14} />}>{t('forumManage.uploadIcon')}</Button>
          </div>
          <div className="min-w-0 space-y-2 rounded-lg border border-border p-3">
            <p className="text-xs font-semibold text-text-secondary">{t('forumManage.banner')}</p>
            {forum.bannerImage && <img src={mediaApi.resolvePublicUrl(forum.bannerImage)} alt={t('forumManage.currentBanner')} className="aspect-video w-full rounded-xl object-cover object-center" />}
            <input ref={bannerInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(event) => { void uploadIdentityImage('banner', event.target.files?.[0]); event.currentTarget.value = '' }} />
            <Button size="sm" variant="secondary" disabled={!isOwner || Boolean(imageBusy)} loading={imageBusy === 'banner'} onClick={() => bannerInputRef.current?.click()} leftIcon={<ImagePlus size={14} />}>{t('forumManage.uploadBanner')}</Button>
          </div>
        </div>
        </>}
        {(activeTab === 'profile' || activeTab === 'access' || activeTab === 'settings') && <Button onClick={saveSettings} loading={pendingAction === 'settings:save'} disabled={!isOwner}>{t('forumManage.saveChanges')}</Button>}
      </ContentSectionCard>

      {(activeTab === 'profile' || activeTab === 'settings') && <>
      <ContentSectionCard className="space-y-3">
        <SectionHeader title={t('forumManage.tags')} description={t('forumManage.tagsDescription')} />
        <div className="flex gap-2">
          <input className="flex-1 rounded-lg border border-border bg-background-tertiary px-3 py-2 text-sm text-text-primary" value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }} placeholder={t('forumManage.newTagPlaceholder')} />
          <Button variant="secondary" onClick={addTag} loading={pendingAction === 'tag:add'} leftIcon={<Hash size={14} />}>{t('forumManage.addTag')}</Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {displayedTags.map((tag) => (
            <span key={tag} className="inline-flex items-center gap-1 rounded-full border border-border bg-background-tertiary px-2 py-1 text-xs text-text-secondary">
              #{tag}
              <button type="button" onClick={() => removeTag(tag)} aria-label={t('forumManage.removeTagAria', { name: tag })} className="hover:text-accent-red">
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      </ContentSectionCard>
      </>}

      {activeTab === 'critical' && <>
      <ContentSectionCard className="border-red-500/30">
        <SectionHeader title={t('forumManage.communityActions')} description={t('forumManage.communityActionsDescription')} />
        <div className="mt-4 grid grid-cols-2 gap-3 max-[760px]:grid-cols-1">
          <Button variant="secondary" disabled={!forum.isJoined || currentRole === 'owner'} loading={pendingAction === 'forum:leave'} onClick={leaveForum}>{t('forumManage.leaveForum')}</Button>
          <Button variant="danger" disabled={!isOwner || Boolean(pendingAction)} onClick={() => { setDeleteConfirmation(''); setApiError(null); setDeleteDialogOpen(true) }} leftIcon={<Trash2 size={14} />}>{t('forumManage.delete.title')}</Button>
        </div>
        {currentRole === 'owner' && <p className="mt-3 text-xs text-text-secondary">{t('forumManage.transferBeforeLeave')}</p>}
      </ContentSectionCard>
      </>}
    </div>
  )

  const renderActiveTab = () => {
    if (activeTab === 'overview') return renderOverview()
    if (activeTab === 'posts') return renderPosts()
    if (activeTab === 'members') return renderMembers()
    if (activeTab === 'moderation') return renderModeration()
    return renderSettings()
  }

  const errorBanner = apiError && (
    <div className="mb-4 flex items-start justify-between gap-3 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-100" role="alert">
      <span>{apiError}</span>
      <Button size="sm" variant="secondary" loading={pendingAction === 'refresh'} onClick={() => void loadRemoteState()}>{t('common.retry')}</Button>
    </div>
  )

  if (presentation === 'embedded') return (
    <div className="space-y-4">
      {errorBanner}
      {renderActiveTab()}
      {confirmRemoveUserId && <div className="titlebar-overlay fixed inset-0 z-[90] flex items-center justify-center bg-black/75 p-4" role="dialog" aria-modal="true" aria-label={t('forumManage.confirmRemoval')}><div className="w-full max-w-md rounded-xl border border-border bg-background-secondary p-5 shadow-2xl"><h3 className="text-lg font-semibold text-text-primary">{t('forumManage.removeMemberQuestion')}</h3><p className="mt-2 text-sm text-text-secondary">{t('forumManage.removeMemberDescription')}</p><div className="mt-5 flex justify-end gap-2"><Button variant="ghost" onClick={() => setConfirmRemoveUserId(null)}>{t('common.cancel')}</Button><Button variant="danger" loading={pendingAction === `remove:${confirmRemoveUserId}`} onClick={remove}>{t('forumManage.remove')}</Button></div></div></div>}
      {deleteConfirmationDialog}
      {cropSource && <ImageCropModal src={cropSource} shape={cropTarget === 'icon' ? 'circle' : 'rect'} aspect={cropTarget === 'icon' ? 1 : 16 / 9} outputWidth={cropTarget === 'icon' ? 512 : 1920} outputHeight={cropTarget === 'icon' ? 512 : 1080} title={cropTarget === 'icon' ? t('forumManage.editIcon') : t('forumManage.editBanner')} onApply={(dataUrl) => { void applyIdentityCrop(dataUrl) }} onCancel={() => { if (cropSource) URL.revokeObjectURL(cropSource); setCropSource(null); setCropFile(null) }} />}
    </div>
  )

  return (
    <div className="titlebar-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-label={t('forumManage.manageAria', { name: forum.name })}>
      <div className="flex h-full max-h-[780px] w-full max-w-[1120px] overflow-hidden rounded-2xl border border-border bg-background-primary shadow-2xl">
        <aside className="w-60 shrink-0 border-r border-border bg-background-secondary p-3">
          <div className="mb-4 px-2">
            <p className="truncate text-sm font-semibold text-text-primary">{forum.name}</p>
          <p className="text-xs text-text-secondary">{t('forumManage.settings')}</p>
          </div>
          <nav className="space-y-1" aria-label={t('forumManage.navigationLabel')}>
          {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={[
                  'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors',
                  activeTab === tab.id ? 'bg-accent/15 text-text-primary' : 'text-text-secondary hover:bg-white/5 hover:text-text-primary',
                ].join(' ')}
              >
                {tab.icon}
              {t(tab.labelKey)}
              </button>
            ))}
          </nav>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <h2 className="text-lg font-semibold text-text-primary">{t('forumManage.panelTitle')}</h2>
            <button type="button" onClick={onClose} className="rounded-lg p-2 text-text-secondary hover:bg-white/10 hover:text-text-primary" aria-label={t('forumManage.closeManagement')}>
              <X size={18} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 anceryx-scroll">
            {errorBanner}
            {renderActiveTab()}
          </div>
        </main>
      </div>

      {confirmRemoveUserId && (
        <div className="titlebar-overlay fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-label={t('forumManage.confirmRemoval')}>
          <div className="w-full max-w-md rounded-xl border border-border bg-background-secondary p-5 shadow-2xl">
            <h3 className="text-lg font-semibold text-text-primary">{t('forumManage.removeMemberQuestion')}</h3>
            <p className="mt-2 text-sm text-text-secondary">{t('forumManage.removeMemberDescription')}</p>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setConfirmRemoveUserId(null)}>{t('common.cancel')}</Button>
              <Button variant="danger" loading={pendingAction === `remove:${confirmRemoveUserId}`} onClick={remove}>{t('forumManage.remove')}</Button>
            </div>
          </div>
        </div>
      )}
      {deleteConfirmationDialog}
      {cropSource && <ImageCropModal src={cropSource} shape={cropTarget === 'icon' ? 'circle' : 'rect'} aspect={cropTarget === 'icon' ? 1 : 16 / 9} outputWidth={cropTarget === 'icon' ? 512 : 1920} outputHeight={cropTarget === 'icon' ? 512 : 1080} title={cropTarget === 'icon' ? t('forumManage.editIcon') : t('forumManage.editBanner')} onApply={(dataUrl) => { void applyIdentityCrop(dataUrl) }} onCancel={() => { if (cropSource) URL.revokeObjectURL(cropSource); setCropSource(null); setCropFile(null) }} />}
    </div>
  )
}

export default ForumManagementModal
