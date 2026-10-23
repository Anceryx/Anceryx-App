import React, { useEffect, useState } from 'react'
import { moderationApi, type ModerationNotice } from '@/services/moderationApi'
import ToggleSwitch from '../ToggleSwitch'
import { realtimeClient } from '@/services/realtimeClient'
import { useTranslation } from '@/i18n'

// ── helpers de layout ─────────────────────────────────────────────────────────

interface ToggleRowProps {
  label: string
  description?: string
  checked: boolean
  onChange: (v: boolean) => void
}
const ToggleRow: React.FC<ToggleRowProps> = ({ label, description, checked, onChange }) => (
  <div className="flex items-center justify-between py-3.5 border-b border-border last:border-0">
    <div className="flex-1 pr-8">
      <p className="text-sm text-white">{label}</p>
      {description && <p className="text-xs text-zinc-500 mt-0.5">{description}</p>}
    </div>
    <ToggleSwitch checked={checked} onChange={onChange} ariaLabel={label} />
  </div>
)

interface GroupProps {
  title: string
  children: React.ReactNode
}
const Group: React.FC<GroupProps> = ({ title, children }) => (
  <div className="mt-8 first:mt-0">
    <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 mb-2">{title}</p>
    <div className="bg-background-secondary rounded-lg px-5 border border-border">
      {children}
    </div>
  </div>
)

// ── componente principal ──────────────────────────────────────────────────────

const NotificacoesSection: React.FC = () => {
  const t = useTranslation()
  const [kaoliNotices, setKaoliNotices] = useState<ModerationNotice[]>([])
  const [kaoliError, setKaoliError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    const unsubscribe = realtimeClient.subscribe('moderation.notice.created', () => {
      void moderationApi.listNotices().then((response) => {
        if (mounted) setKaoliNotices(response.notices)
      }).catch(() => {
        if (mounted) setKaoliError(t('settings.notifications.updateNoticeError'))
      })
    })
    void moderationApi.listNotices().then((response) => {
      if (mounted) setKaoliNotices(response.notices)
    }).catch(() => {
      if (mounted) setKaoliError(t('settings.notifications.loadNoticeError'))
    })
    return () => { mounted = false; unsubscribe() }
  }, [t])

  const markKaoliNoticeRead = async (noticeId: string) => {
    try {
      await moderationApi.markNoticeRead(noticeId)
      setKaoliNotices((current) => current.map((notice) => notice.id === noticeId ? { ...notice, readAt: new Date().toISOString() } : notice))
    } catch { setKaoliError(t('settings.notifications.markNoticeReadError')) }
  }

  // Mensagens
  const [somMsgPrivada,   setSomMsgPrivada]   = useState(true)
  const [somMencao,       setSomMencao]       = useState(true)
  const [notifMsgPrivada, setNotifMsgPrivada] = useState(true)
  const [previewConteudo, setPreviewConteudo] = useState(true)

  // Comunidade
  const [notifForum,      setNotifForum]      = useState(false)
  const [notifFeed,       setNotifFeed]       = useState(true)
  const [notifAmizade,    setNotifAmizade]    = useState(true)

  // Sistema
  const [notifApp,        setNotifApp]        = useState(true)
  const [sonsSistema,     setSonsSistema]     = useState(true)

  return (
    <div className="max-w-2xl">


      {kaoliError && <p role="alert" className="mb-4 rounded-lg border border-red-500/30 p-3 text-sm text-red-300">{kaoliError}</p>}
      <Group title={t('settings.notifications.messages')}>
        <ToggleRow
          label={t('settings.notifications.privateMessageSound')}
          description={t('settings.notifications.privateMessageSoundDescription')}
          checked={somMsgPrivada}
          onChange={setSomMsgPrivada}
        />
        <ToggleRow
          label={t('settings.notifications.mentionSound')}
          description={t('settings.notifications.mentionSoundDescription')}
          checked={somMencao}
          onChange={setSomMencao}
        />
        <ToggleRow
          label={t('settings.notifications.privateMessageNotice')}
          description={t('settings.notifications.privateMessageNoticeDescription')}
          checked={notifMsgPrivada}
          onChange={setNotifMsgPrivada}
        />
        <ToggleRow
          label={t('settings.notifications.messagePreview')}
          description={t('settings.notifications.messagePreviewDescription')}
          checked={previewConteudo}
          onChange={setPreviewConteudo}
        />
      </Group>

      <Group title={t('settings.notifications.community')}>
        <ToggleRow
          label={t('settings.notifications.forumNotices')}
          description={t('settings.notifications.forumNoticesDescription')}
          checked={notifForum}
          onChange={setNotifForum}
        />
        <ToggleRow
          label={t('settings.notifications.feedNotices')}
          description={t('settings.notifications.feedNoticesDescription')}
          checked={notifFeed}
          onChange={setNotifFeed}
        />
        <ToggleRow
          label={t('settings.notifications.friendRequests')}
          description={t('settings.notifications.friendRequestsDescription')}
          checked={notifAmizade}
          onChange={setNotifAmizade}
        />
      </Group>

      <Group title={t('settings.notifications.system')}>
        <ToggleRow
          label={t('settings.notifications.appNotices')}
          description={t('settings.notifications.appNoticesDescription')}
          checked={notifApp}
          onChange={setNotifApp}
        />
        <ToggleRow
          label={t('settings.notifications.systemSounds')}
          description={t('settings.notifications.systemSoundsDescription')}
          checked={sonsSistema}
          onChange={setSonsSistema}
        />
      </Group>

    </div>
  )
}

export default NotificacoesSection
