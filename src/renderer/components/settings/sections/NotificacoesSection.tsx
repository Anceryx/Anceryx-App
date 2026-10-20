import React, { useEffect, useState } from 'react'
import { moderationApi, type ModerationNotice } from '@/services/moderationApi'
import ToggleSwitch from '../ToggleSwitch'
import { realtimeClient } from '@/services/realtimeClient'

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
  const [kaoliNotices, setKaoliNotices] = useState<ModerationNotice[]>([])
  const [kaoliError, setKaoliError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    const unsubscribe = realtimeClient.subscribe('moderation.notice.created', () => {
      void moderationApi.listNotices().then((response) => {
        if (mounted) setKaoliNotices(response.notices)
      }).catch(() => {
        if (mounted) setKaoliError('Não foi possível atualizar os avisos do Kaoli Mod.')
      })
    })
    void moderationApi.listNotices().then((response) => {
      if (mounted) setKaoliNotices(response.notices)
    }).catch(() => {
      if (mounted) setKaoliError('Não foi possível carregar os avisos do Kaoli Mod.')
    })
    return () => { mounted = false; unsubscribe() }
  }, [])

  const markKaoliNoticeRead = async (noticeId: string) => {
    try {
      await moderationApi.markNoticeRead(noticeId)
      setKaoliNotices((current) => current.map((notice) => notice.id === noticeId ? { ...notice, readAt: new Date().toISOString() } : notice))
    } catch { setKaoliError('Não foi possível marcar o aviso como lido.') }
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


      <Group title="Mensagens">
        <ToggleRow
          label="Som de mensagem privada"
          description="Toca um som ao receber uma mensagem direta"
          checked={somMsgPrivada}
          onChange={setSomMsgPrivada}
        />
        <ToggleRow
          label="Som de menção"
          description="Toca um som quando alguém te menciona"
          checked={somMencao}
          onChange={setSomMencao}
        />
        <ToggleRow
          label="Notificação de mensagem privada"
          description="Exibe uma notificação do sistema ao receber mensagens"
          checked={notifMsgPrivada}
          onChange={setNotifMsgPrivada}
        />
        <ToggleRow
          label="Preview do conteúdo da mensagem"
          description="Mostra o início da mensagem na notificação"
          checked={previewConteudo}
          onChange={setPreviewConteudo}
        />
      </Group>

      <Group title="Comunidade">
        <ToggleRow
          label="Notificações de fórum"
          description="Atualizações dos fóruns que você participa"
          checked={notifForum}
          onChange={setNotifForum}
        />
        <ToggleRow
          label="Notificações do feed"
          description="Novos posts de pessoas que você segue"
          checked={notifFeed}
          onChange={setNotifFeed}
        />
        <ToggleRow
          label="Solicitações de amizade"
          description="Quando alguém te envia uma solicitação"
          checked={notifAmizade}
          onChange={setNotifAmizade}
        />
      </Group>

      <Group title="Sistema">
        <ToggleRow
          label="Notificações do aplicativo"
          description="Badge no ícone da taskbar com contagem de não-lidos"
          checked={notifApp}
          onChange={setNotifApp}
        />
        <ToggleRow
          label="Sons do sistema"
          description="Sons ao conectar, desconectar e outras ações do app"
          checked={sonsSistema}
          onChange={setSonsSistema}
        />
      </Group>

    </div>
  )
}

export default NotificacoesSection
