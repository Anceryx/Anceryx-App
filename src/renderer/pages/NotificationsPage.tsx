import React, { useCallback, useEffect, useState } from 'react'
import { Bell, CheckCheck, ChevronDown, Check } from 'lucide-react'
import { notificationsApi, type NotificationDto } from '@/services/notificationsApi'
import { socialApi } from '@/services/socialApi'
import { mediaApi } from '@/services/mediaApi'
import { useSocialStore } from '@/store/socialStore'
import { useUIStore } from '@/store/uiStore'
import { realtimeClient } from '@/services/realtimeClient'
import { UserProfileModal } from '@/components/social/index'
import { formatDateSeparator, formatDateTime } from '@/utils/formatters'
import { translate, useTranslation } from '@/i18n'

const PAGE_SIZE = 30

function description(item: NotificationDto, locale: 'pt-BR' | 'en-US' | 'es-ES'): string {
  switch (item.type) {
    case 'post.comment': return translate('notifications.postComment', locale)
    case 'post.reaction': return translate('notifications.postReaction', locale)
    case 'post.created': return translate('notifications.postCreated', locale)
    case 'follow.new': return translate('notifications.followNew', locale)
    case 'follow.request': return translate('notifications.followRequest', locale)
    case 'follow.accepted': return translate('notifications.followAccepted', locale)
    case 'forum.event_reminder': return translate('notifications.forumReminder', locale)
    case 'forum.moderation.case': return translate('notifications.forumModeration', locale)
    case 'forum.appeal': return translate('notifications.forumAppeal', locale)
    case 'badge.awarded': return translate('notifications.badgeAwarded', locale)
    default: return translate('notifications.forumReply', locale)
  }
}

const NotificationsPage: React.FC = () => {
  const t = useTranslation()
  const setActiveSection = useSocialStore((state) => state.setActiveSection)
  const openPost = useUIStore((state) => state.openPost)
  const locale = useUIStore((state) => state.locale)
  const [items, setItems] = useState<NotificationDto[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [profileUsername, setProfileUsername] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setError(null)
    try {
      const result = await notificationsApi.list(PAGE_SIZE)
      setItems(result.notifications)
      setUnreadCount(result.unreadCount)
      setHasMore(result.notifications.length === PAGE_SIZE)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t('notifications.loadFailed'))
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { void refresh() }, [refresh])
  useEffect(() => realtimeClient.subscribe('notification.created', () => { void refresh() }), [refresh])

  const loadMore = async () => {
    setLoading(true)
    try {
      const result = await notificationsApi.list(PAGE_SIZE, items.length)
      setItems((current) => [...current, ...result.notifications])
      setUnreadCount(result.unreadCount)
      setHasMore(result.notifications.length === PAGE_SIZE)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t('notifications.loadMoreFailed'))
    } finally { setLoading(false) }
  }

  const markRead = async (item: NotificationDto) => {
    if (item.readAt) return
    try {
      await notificationsApi.markRead(item.id)
      setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, readAt: new Date().toISOString() } : entry))
      setUnreadCount((current) => Math.max(0, current - 1))
    } catch (reason) { setError(reason instanceof Error ? reason.message : t('notifications.markReadFailed')) }
  }

  const markAllRead = async () => {
    try {
      await notificationsApi.markAllRead()
      const now = new Date().toISOString()
      setItems((current) => current.map((item) => item.readAt ? item : { ...item, readAt: now }))
      setUnreadCount(0)
    } catch (reason) { setError(reason instanceof Error ? reason.message : t('notifications.updateFailed')) }
  }

  const openNotification = async (item: NotificationDto) => {
    if (item.type === 'badge.awarded') {
      await markRead(item)
      setActiveSection('perfil')
      return
    }
    if (item.type === 'follow.request' || item.type === 'follow.new' || item.type === 'follow.accepted') {
      if (item.type !== 'follow.request') await markRead(item)
      setProfileUsername(item.actor.username)
      return
    }
    await markRead(item)
    if (item.type.startsWith('post.')) {
      openPost(item.resourceId)
      setActiveSection('feed')
    } else setActiveSection('foruns')
  }

  const respond = async (item: NotificationDto, accept: boolean) => {
    setError(null)
    try {
      if (accept) await socialApi.acceptFollowRequest(item.actorUserId)
      else await socialApi.rejectFollowRequest(item.actorUserId)
      await notificationsApi.markRead(item.id)
      await refresh()
    } catch (reason) { setError(reason instanceof Error ? reason.message : t('notifications.respondFailed')) }
  }

  const unreadItems = items.filter((item) => !item.readAt)
  const readItems = items.filter((item) => Boolean(item.readAt))
  const renderNotificationList = (list: NotificationDto[]) => list.map((item, index) => {
    const previous = list[index - 1]
    const showDate = !previous || new Date(previous.createdAt).toDateString() !== new Date(item.createdAt).toDateString()
    return <React.Fragment key={item.id}>
      {showDate && <div className="sticky top-0 z-10 border-b border-border/70 bg-background-secondary/95 px-4 py-2 text-[11px] font-medium text-text-secondary backdrop-blur">{formatDateSeparator(new Date(item.createdAt))}</div>}
      <article className={`flex items-start gap-3 border-b border-border p-4 last:border-0 ${item.readAt ? '' : 'bg-accent/5'}`}>
        <button type="button" onClick={() => void openNotification(item)} className="flex min-w-0 flex-1 items-start gap-3 rounded-lg text-left transition-colors hover:bg-white/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
          <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-background-tertiary">{item.actor.avatarUrl ? <img src={mediaApi.resolvePublicUrl(item.actor.avatarUrl) || undefined} alt="" className="h-full w-full object-cover" /> : <span className="font-semibold text-text-secondary">{item.actor.displayName.slice(0, 1).toUpperCase()}</span>}</span>
          <span className="min-w-0 flex-1"><span className="block text-sm text-text-primary"><b>{item.actor.displayName}</b> {description(item, locale)}</span><time className="mt-1 block text-xs text-text-secondary" dateTime={item.createdAt}>{formatDateTime(new Date(item.createdAt))}</time></span>
        </button>
        {item.type === 'follow.request' ? <div className="flex shrink-0 flex-col gap-1"><button type="button" onClick={() => void respond(item, true)} className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-white">{t('common.accept')}</button><button type="button" onClick={() => void respond(item, false)} className="rounded-md px-3 py-1.5 text-xs text-text-secondary hover:bg-background-tertiary">{t('common.reject')}</button></div> : item.readAt ? <Check size={15} aria-label={t('notifications.read')} className="mt-2 shrink-0 text-text-secondary" /> : <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-accent" aria-label={t('notifications.unread')} />}
      </article>
    </React.Fragment>
  })

  return <div className="h-full overflow-y-auto anceryx-scroll">
    <div className="mx-auto max-w-3xl p-4 sm:p-6">
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-accent/15 text-accent"><Bell size={21} /></span><div><h1 className="text-xl font-bold text-text-primary">{t('notifications.title')}</h1><p className="text-sm text-text-secondary">{unreadCount ? t('notifications.unreadSummary', { count: unreadCount }) : t('notifications.allCaughtUp')}</p></div></div>
        <button type="button" disabled={!unreadCount} onClick={() => void markAllRead()} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-text-secondary hover:bg-white/5 disabled:opacity-40"><CheckCheck size={16} />{t('notifications.markAllRead')}</button>
      </header>
      {error && <p role="alert" className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
      <section className="overflow-hidden rounded-2xl border border-border bg-background-secondary" aria-label={t('notifications.history')}>
        {loading && items.length === 0 ? <div className="space-y-3 p-6" role="status" aria-label={t('notifications.loading')}><div className="h-4 w-40 animate-pulse rounded bg-background-tertiary"/><div className="h-14 animate-pulse rounded-lg bg-background-tertiary"/><div className="h-14 animate-pulse rounded-lg bg-background-tertiary"/></div> : items.length === 0 ? <div className="p-10 text-center"><Bell size={28} className="mx-auto mb-3 text-text-secondary"/><p className="font-medium text-text-primary">{t('notifications.empty')}</p><p className="mt-1 text-sm text-text-secondary">{t('notifications.emptyHint')}</p></div> : <>
          {unreadItems.length > 0 && <section aria-labelledby="notifications-unread" className="border-b border-border"><h2 id="notifications-unread" className="sticky top-0 z-20 flex items-center gap-2 bg-background-secondary/95 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-accent backdrop-blur">{t('notifications.unread')}<span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px]">{unreadItems.length}</span></h2>{renderNotificationList(unreadItems)}</section>}
          {readItems.length > 0 && <section aria-labelledby="notifications-read"><h2 id="notifications-read" className="sticky top-0 z-20 bg-background-secondary/95 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-text-secondary backdrop-blur">{t('notifications.read')}</h2>{renderNotificationList(readItems)}</section>}
        </>}
      </section>
      {hasMore && <button type="button" disabled={loading} onClick={() => void loadMore()} className="mx-auto mt-4 flex items-center gap-2 rounded-lg px-4 py-2 text-sm text-accent hover:bg-white/5 disabled:opacity-50">{loading ? t('common.loading') : t('common.loadMore')}<ChevronDown size={16}/></button>}
    </div>
    {profileUsername && <UserProfileModal username={profileUsername} isOpen onClose={() => setProfileUsername(null)} />}
  </div>
}

export default NotificationsPage
