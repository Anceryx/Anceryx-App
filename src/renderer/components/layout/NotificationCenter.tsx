import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Bell, Check, CheckCheck, X } from 'lucide-react'
import { notificationsApi, type NotificationDto } from '@/services/notificationsApi'
import { useSocialStore } from '@/store/socialStore'
import { useUIStore } from '@/store/uiStore'
import { realtimeClient } from '@/services/realtimeClient'
import { mediaApi } from '@/services/mediaApi'
import { socialApi } from '@/services/socialApi'
import { useAuthStore } from '@/store/authStore'
import { communityApi } from '@/services/communityApi'
import { UserProfileModal } from '@/components/social/index'
import { formatDateTime } from '@/utils/formatters'
import { translate } from '@/i18n'

function describeNotification(notification: NotificationDto, locale: 'pt-BR' | 'en-US' | 'es-ES'): string {
  if (notification.type === 'post.comment') return translate('notifications.postComment', locale)
  if (notification.type === 'post.reaction') return translate('notifications.postReaction', locale)
  if (notification.type === 'post.created') return translate('notifications.postCreated', locale)
  if (notification.type === 'follow.new') return translate('notifications.followNew', locale)
  if (notification.type === 'follow.request') return translate('notifications.followRequest', locale)
  if (notification.type === 'follow.accepted') return translate('notifications.followAccepted', locale)
  if (notification.type === 'forum.event_reminder') return translate('notifications.forumReminder', locale)
  if (notification.type === 'forum.moderation.case') return translate('notifications.forumModeration', locale)
  if (notification.type === 'forum.appeal') return translate('notifications.forumAppeal', locale)
  if (notification.type === 'badge.awarded') return translate('notifications.badgeAwarded', locale)
  return translate('notifications.forumReply', locale)
}

const NotificationCenter: React.FC = () => {
  const setActiveSection = useSocialStore((state) => state.setActiveSection)
  const currentUsername = useAuthStore((state) => state.user?.username)
  const openPost = useUIStore((state) => state.openPost)
  const locale = useUIStore((state) => state.locale)
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState<'all' | 'unread' | 'requests'>('all')
  const bellRef = useRef<HTMLButtonElement>(null)
  const drawerRef = useRef<HTMLElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const [profileUsername, setProfileUsername] = useState<string | null>(null)
  const [openModerationHistory, setOpenModerationHistory] = useState(false)
  const [items, setItems] = useState<NotificationDto[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await notificationsApi.list()
      setItems(result.notifications)
      setUnreadCount(result.unreadCount)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível carregar as notificações.')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { void refresh() }, [refresh])
  useEffect(() => realtimeClient.subscribe('notification.created', () => { void refresh() }), [refresh])
  useEffect(() => {
    if (!open) return
    const frame = window.requestAnimationFrame(() => closeButtonRef.current?.focus())
    const handleDialogKeys = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setOpen(false); bellRef.current?.focus(); return }
      if (event.key !== 'Tab') return
      const focusable = drawerRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), [href], [tabindex]:not([tabindex="-1"])')
      if (!focusable?.length) { event.preventDefault(); return }
      const first = focusable[0]; const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    window.addEventListener('keydown', handleDialogKeys)
    return () => { window.cancelAnimationFrame(frame); window.removeEventListener('keydown', handleDialogKeys) }
  }, [open])

  const closeDrawer = () => { setOpen(false); bellRef.current?.focus() }

  const markRead = async (notification: NotificationDto) => {
    if (notification.readAt) return
    try {
      await notificationsApi.markRead(notification.id)
      setItems((current) => current.map((item) => item.id === notification.id ? { ...item, readAt: new Date().toISOString() } : item))
      setUnreadCount((current) => Math.max(0, current - 1))
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível atualizar a notificação.') }
  }

  const markAllRead = async () => {
    try {
      await notificationsApi.markAllRead()
      const now = new Date().toISOString()
      setItems((current) => current.map((item) => item.readAt ? item : { ...item, readAt: now }))
      setUnreadCount(0)
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível atualizar as notificações.') }
  }

  const openNotification = async (notification: NotificationDto) => {
    setOpen(false)
    if (notification.type === 'follow.request') {
      setProfileUsername(notification.actor.username)
      return
    }
    await markRead(notification)
    if (notification.type === 'forum.moderation.case') {
      if (currentUsername) {
        setProfileUsername(currentUsername)
        setOpenModerationHistory(true)
      }
      return
    }
    if (notification.type === 'forum.appeal') {
      try {
        const { cases } = await communityApi.listMyModerationHistory()
        if (cases.some((item) => item.appeals.some((appeal) => appeal.id === notification.resourceId)) && currentUsername) {
          setProfileUsername(currentUsername)
          setOpenModerationHistory(true)
          return
        }
      } catch { /* A navegação para os Fóruns continua disponível se o histórico não carregar. */ }
      setActiveSection('foruns')
      return
    }
    if (notification.type === 'badge.awarded') {
      setActiveSection('perfil')
      return
    }
    if (notification.type === 'follow.new' || notification.type === 'follow.accepted') {
      setProfileUsername(notification.actor.username)
      return
    }
    if (notification.type === 'post.created' || notification.type === 'post.reaction' || notification.type === 'post.comment') {
      openPost(notification.resourceId)
      setActiveSection('feed')
      return
    }
    setActiveSection('foruns')
  }

  const respondToFollowRequest = async (notification: NotificationDto, accept: boolean) => {
    setError(null)
    try {
      if (accept) await socialApi.acceptFollowRequest(notification.actorUserId)
      else await socialApi.rejectFollowRequest(notification.actorUserId)
      await notificationsApi.markRead(notification.id)
      await refresh()
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível atualizar a solicitação.') }
  }

  const filteredItems = items.filter((item) => filter === 'all' || (filter === 'unread' ? !item.readAt : item.type === 'follow.request'))
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1)
  const grouped = [
    { title: 'Hoje', rows: filteredItems.filter((item) => new Date(item.createdAt) >= today) },
    { title: 'Ontem', rows: filteredItems.filter((item) => { const date = new Date(item.createdAt); return date >= yesterday && date < today }) },
    { title: 'Anteriores', rows: filteredItems.filter((item) => new Date(item.createdAt) < yesterday) },
  ].filter((group) => group.rows.length > 0)

  return <div className="relative">
    <button ref={bellRef} type="button" onClick={() => { const next = !open; setOpen(next); if (next) void refresh() }} className="motion-control relative grid h-10 w-10 place-items-center rounded-xl text-text-secondary hover:bg-white/5 hover:text-text-primary" aria-label={`Notificações${unreadCount ? `, ${unreadCount} não lidas` : ''}`} aria-expanded={open} aria-controls="notification-drawer">
      <Bell size={18} />
      {unreadCount > 0 && <span className="absolute right-1 top-1 min-w-4 rounded-full bg-accent px-1 text-center text-[10px] font-bold leading-4 text-white">{unreadCount > 99 ? '99+' : unreadCount}</span>}
    </button>
    {open && <>
    <button className="titlebar-overlay motion-backdrop-in fixed inset-0 z-[69] cursor-default bg-black/25" aria-label="Fechar notificações" onClick={closeDrawer} />
    <section ref={drawerRef} id="notification-drawer" role="dialog" aria-modal="true" aria-label="Notificações" className="titlebar-overlay motion-drawer-in fixed inset-y-0 right-0 rounded-l-2xl z-[70] flex w-full max-w-[420px] flex-col border-l border-border bg-background-secondary shadow-2xl">
      <header className="flex shrink-0 items-center gap-3 border-b border-border px-4 py-4"><div className="min-w-0 flex-1"><h2 className="text-base font-semibold text-text-primary">Notificações</h2><p className="text-xs text-text-secondary">{unreadCount} não lidas</p></div><button type="button" disabled={!unreadCount} onClick={() => void markAllRead()} className="flex items-center gap-1 rounded-lg px-2 py-2 text-xs text-accent hover:bg-white/5 disabled:opacity-40"><CheckCheck size={14} /> Marcar todas</button><button ref={closeButtonRef} type="button" onClick={closeDrawer} className="grid h-9 w-9 place-items-center rounded-lg text-text-secondary hover:bg-white/5" aria-label="Fechar"><X size={18} /></button></header>
      <div className="flex shrink-0 gap-1 border-b border-border px-3 py-2" role="tablist" aria-label="Filtrar notificações">
        {([{ id: 'all', label: 'Todas' }, { id: 'unread', label: 'Não lidas' }, { id: 'requests', label: 'Solicitações' }] as const).map((item) => <button key={item.id} type="button" role="tab" aria-selected={filter === item.id} onClick={() => setFilter(item.id)} className={`rounded-lg px-3 py-2 text-xs ${filter === item.id ? 'bg-accent/15 text-accent' : 'text-text-secondary hover:bg-white/5'}`}>{item.label}</button>)}
      </div>
      {error && <p role="alert" className="px-4 py-2 text-xs text-red-300">{error}</p>}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading && items.length === 0 ? <p className="p-4 text-sm text-text-secondary">Carregando…</p> : filteredItems.length === 0 ? <p className="p-4 text-sm text-text-secondary">{filter === 'requests' ? 'Você não tem solicitações.' : 'Você não tem notificações neste filtro.'}</p> : grouped.map((group) => <section key={group.title} aria-label={group.title}><h3 className="sticky top-0 border-b border-border bg-background-secondary/95 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-text-secondary">{group.title}</h3>{group.rows.map((item) => <div key={item.id} className={`flex items-start gap-3 border-b border-border px-4 py-3 ${item.readAt ? '' : 'bg-accent/5'}`}>
          <button type="button" onClick={() => void openNotification(item)} className="flex min-w-0 flex-1 items-start gap-3 text-left hover:opacity-80">
            <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full bg-background-tertiary">{item.actor.avatarUrl ? <img src={mediaApi.resolvePublicUrl(item.actor.avatarUrl) || undefined} alt="" className="h-full w-full object-cover" /> : <span className="text-xs font-semibold text-text-secondary">{item.actor.displayName.slice(0, 1).toUpperCase()}</span>}</span>
            <span className="min-w-0 flex-1"><span className="block text-sm text-text-primary"><b>{item.actor.displayName}</b> {describeNotification(item, locale)}</span><span className="mt-1 block text-xs text-text-secondary">{formatDateTime(new Date(item.createdAt))}</span></span>
          </button>
          {item.type === 'follow.request' ? <div className="flex shrink-0 flex-col gap-1"><button type="button" onClick={() => void respondToFollowRequest(item, true)} className="rounded-md bg-accent px-2 py-1 text-[11px] font-semibold text-white">Aceitar</button><button type="button" onClick={() => void respondToFollowRequest(item, false)} className="rounded-md px-2 py-1 text-[11px] text-text-secondary hover:bg-background-tertiary">Rejeitar</button></div> : item.readAt ? <Check size={14} className="mt-1 shrink-0 text-text-secondary" /> : <button type="button" onClick={() => void markRead(item)} className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-md text-accent hover:bg-accent/10" aria-label="Marcar como lida"><Check size={15} /></button>}
        </div>)}</section>)}
      </div>
    </section>
    </>}
    {profileUsername && <UserProfileModal username={profileUsername} initialTab={openModerationHistory ? 'moderation' : 'posts'} isOpen onClose={() => { setProfileUsername(null); setOpenModerationHistory(false) }} />}
  </div>
}

export default NotificationCenter
