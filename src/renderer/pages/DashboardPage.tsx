import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Home, MessageCircle, Compass, Users, Settings, Sparkles, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { useSocialStore } from '@/store/socialStore'
import { useAuthStore } from '@/store/authStore'
import { useCallStore } from '@/store/callStore'
import { useUIStore } from '@/store/uiStore'
import { Avatar } from '@/components/ui/index'
import TitleBar from '@/components/layout/TitleBar'
import NotificationToast from '@/components/layout/NotificationToast'
import NotificationCenter from '@/components/layout/NotificationCenter'
import AchievementToast from '@/components/layout/AchievementToast'
import { SettingsModal } from '@/components/settings/index'
import MiniCallCard from '@/components/calls/MiniCallCard'
import CallOverlay from '@/components/calls/CallOverlay'
import FeedPage from '@/pages/FeedPage'
import PerfilPage from '@/pages/PerfilPage'
import AmigosPage from '@/pages/AmigosPage'
import MensagensPage from '@/pages/MensagensPage'
import ForunsPage from '@/pages/ForunsPage'
import ExplorePage from '@/pages/ExplorePage'
import NotificationsPage from '@/pages/NotificationsPage'
import CobrancaPage from '@/pages/CobrancaPage'
import SavedPostsPage from '@/pages/SavedPostsPage'
import type { SidebarSection } from '@/types/index'
import { resolveAvatarName } from '@/utils/avatar'

interface NavItem {
  section: SidebarSection
  label: string
  icon: React.ReactNode
  ariaLabel: string
}

const NAV_ITEMS: NavItem[] = [
  { section: 'feed',      label: 'Home',      ariaLabel: 'Home - feed principal', icon: <Home size={18} /> },
  { section: 'mensagens', label: 'Mensagens', ariaLabel: 'Mensagens e conversas', icon: <MessageCircle size={18} /> },
  { section: 'explore', label: 'Explore', ariaLabel: 'Explorar conteúdo', icon: <Compass size={18} /> },
  { section: 'foruns', label: 'Fóruns', ariaLabel: 'Fóruns', icon: <Users size={18} /> },
]

const SIDEBAR_MIN = 208
const SIDEBAR_MAX = 280
const SIDEBAR_COLLAPSED = 72

const DashboardPage: React.FC = () => {
  const { activeSection, setActiveSection, userProfile } = useSocialStore((s) => ({
    activeSection: s.activeSection,
    setActiveSection: s.setActiveSection,
    userProfile: s.userProfile,
  }))
  const user = useAuthStore((s) => s.user)
  const displayName = resolveAvatarName(userProfile.displayName, user?.name, user?.username)
  const callStatus = useCallStore((s) => s.callStatus)
  const isExpanded = useCallStore((s) => s.isExpanded)

  const { sidebarCollapsed, sidebarWidth, sidebarMode, setSidebarCollapsed, setSidebarWidth } = useUIStore((s) => ({ sidebarCollapsed: s.sidebarCollapsed, sidebarWidth: s.sidebarWidth, sidebarMode: s.sidebarMode, setSidebarCollapsed: s.setSidebarCollapsed, setSidebarWidth: s.setSidebarWidth }))
  const [forumSidebarOverride, setForumSidebarOverride] = useState<boolean | null>(null)
  useEffect(() => { if (activeSection !== 'foruns') setForumSidebarOverride(null) }, [activeSection])
  const isCollapsed = forumSidebarOverride ?? (sidebarCollapsed || (sidebarMode === 'automatic' && activeSection === 'foruns'))
  const sidebarW = isCollapsed ? SIDEBAR_COLLAPSED : sidebarWidth
  const isDragging = useRef(false)
  const startX = useRef(0)
  const startW = useRef(0)

  const onDragStart = useCallback((e: React.MouseEvent) => {
    isDragging.current = true
    startX.current = e.clientX
    startW.current = sidebarWidth
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [sidebarWidth])

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isDragging.current) return
      const next = Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, startW.current + (e.clientX - startX.current)))
      setSidebarWidth(next)
    }
    const onUp = () => {
      if (!isDragging.current) return
      isDragging.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [setSidebarWidth])

  const [settingsOpen, setSettingsOpen] = useState(false)
  const settingsSection = useUIStore((s) => s.settingsSection)
  const closeSettingsStore = useUIStore((s) => s.closeSettings)

  useEffect(() => {
    if (settingsSection !== null) setSettingsOpen(true)
  }, [settingsSection])

  const renderPage = () => {
    switch (activeSection) {
      case 'feed': return <FeedPage />
      case 'salvos': return <SavedPostsPage />
      case 'perfil': return <PerfilPage />
      case 'amigos': return <AmigosPage />
      case 'mensagens': return <MensagensPage />
      case 'foruns': return <ForunsPage onNavigateGlobal={setActiveSection} />
      case 'explore': return <ExplorePage />
      case 'notificacoes': return <NotificationsPage />
      case 'cobranca': return <CobrancaPage />
      default: return <FeedPage />
    }
  }
  return (
    <div className="relative flex h-[100dvh] min-h-0 flex-col overflow-hidden bg-background-primary">
      <TitleBar />
      <AchievementToast />
      <div className="absolute right-24 top-10 z-40 md:right-4">
        <NotificationCenter />
      </div>

      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border bg-background-secondary/95 px-3 py-2 md:hidden safe-area-top">
        {user && (
          <button
            type="button"
            onClick={() => setActiveSection('perfil')}
            className="motion-control flex min-w-0 items-center gap-2 rounded-xl px-1 py-1 text-left"
            aria-label="Abrir meu perfil"
          >
            <Avatar src={user.avatar} name={displayName} size="sm" className="shrink-0" />
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-text-primary">{displayName}</span>
              <span className="block truncate text-[11px] text-text-secondary">@{userProfile.handle || user.username}</span>
            </span>
          </button>
        )}
        <div className="flex shrink-0 items-center gap-1">
          <button type="button" onClick={() => setActiveSection('cobranca')} className="motion-control grid h-10 w-10 place-items-center rounded-xl text-accent-secondary hover:bg-white/5" aria-label="Abrir Anceryx+"><Sparkles size={17} /></button>
          <button type="button" onClick={() => setSettingsOpen(true)} className="motion-control grid h-10 w-10 place-items-center rounded-xl text-text-secondary hover:bg-white/5" aria-label="Abrir configurações"><Settings size={18} /></button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 gap-3 overflow-hidden p-0 md:p-3">
        <aside
          className="relative hidden shrink-0 flex-col overflow-hidden rounded-[18px] border border-border bg-background-secondary shadow-panel transition-[width] duration-200 ease-out md:flex"
          style={{ width: sidebarW }}
        >
          {user && (
            <button
              onClick={() => setActiveSection('perfil')}
              className={`group m-2 flex min-h-[56px] w-[calc(100%-1rem)] items-center rounded-2xl border border-border bg-background-tertiary/55 text-left transition-all duration-200 hover:bg-white/5 ${isCollapsed ? 'justify-center p-2' : 'gap-3 p-2.5'}`}
              aria-label="Ver meu perfil"
              title={isCollapsed ? `${displayName} (@${userProfile.handle || user.username})` : undefined}
            >
              <Avatar src={user.avatar} name={displayName} size="sm" className="shrink-0" />
              {!isCollapsed && <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-text-primary transition-colors group-hover:text-accent-secondary">
                  {displayName}
                </p>
                <p className="truncate text-xs text-text-secondary">@{userProfile.handle || user.username}</p>
              </div>}
            </button>
          )}

          <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-2 py-2 anceryx-scroll" aria-label="Navegação principal">
            {NAV_ITEMS.map((item) => {
              const isActive = activeSection === item.section
              return (
                <button
                  key={item.section}
                  onClick={() => setActiveSection(item.section)}
                  className={[
                    'motion-control flex w-full items-center rounded-xl py-2.5 text-sm font-medium', isCollapsed ? 'justify-center px-2' : 'gap-3 px-3',
                    isActive
                      ? 'bg-accent/20 text-accent-secondary'
                      : 'text-text-secondary hover:bg-white/5 hover:text-text-primary',
                  ].join(' ')}
                  aria-current={isActive ? 'page' : undefined}
                  aria-label={item.ariaLabel}
                  title={item.ariaLabel}
                >
                  <span className="shrink-0">{item.icon}</span>
                  {!isCollapsed && <span className="truncate">{item.label}</span>}
                </button>
              )
            })}
          </nav>

          <div className="px-2 pb-1">
            <button
              onClick={() => setActiveSection('cobranca')}
              className={[
                'motion-control flex w-full items-center rounded-xl py-2.5 text-sm font-semibold', isCollapsed ? 'justify-center px-2' : 'gap-3 px-3',
                activeSection === 'cobranca'
                  ? 'bg-accent/20 text-accent-secondary'
                  : 'text-accent-secondary/80 hover:bg-accent/10 hover:text-accent-secondary',
              ].join(' ')}
              aria-current={activeSection === 'cobranca' ? 'page' : undefined}
              aria-label="Anceryx+"
              title={isCollapsed ? 'Anceryx+' : undefined}
            >
              <Sparkles size={18} className="shrink-0" />
              {!isCollapsed && <span className="truncate">Anceryx+</span>}
            </button>
          </div>

          <div className="shrink-0 border-t border-border p-2">
            <button
              onClick={() => setSettingsOpen(true)}
              className={`motion-control flex w-full items-center rounded-xl py-2.5 text-sm font-medium text-text-secondary hover:bg-white/5 hover:text-text-primary ${isCollapsed ? 'justify-center px-2' : 'gap-3 px-3'}`}
              aria-label="Abrir configurações"
              title={isCollapsed ? 'Configurações' : undefined}
            >
              <Settings size={18} className="shrink-0" />
              {!isCollapsed && <span className="truncate">Configurações</span>}
            </button>
          </div>

          <button type="button" onClick={() => { const nextCollapsed = !isCollapsed; if (sidebarMode === 'automatic' && activeSection === 'foruns') setForumSidebarOverride(nextCollapsed); else setSidebarCollapsed(nextCollapsed) }} className="motion-control mx-2 mb-2 grid h-9 shrink-0 place-items-center rounded-xl text-text-secondary hover:bg-white/5 hover:text-text-primary" aria-label={isCollapsed ? 'Expandir barra lateral' : 'Recolher barra lateral'} aria-expanded={!isCollapsed} title={isCollapsed ? 'Expandir barra lateral' : 'Recolher barra lateral'}>
            {isCollapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
          </button>

          <div
            className={`absolute right-0 top-0 z-10 h-full w-1 cursor-col-resize group ${isCollapsed ? 'hidden' : ''}`}
            onMouseDown={onDragStart}
            role="separator" aria-orientation="vertical" aria-label="Redimensionar barra lateral" tabIndex={0}
            onKeyDown={(event) => { if (event.key === 'ArrowLeft') setSidebarWidth(sidebarWidth - 8); if (event.key === 'ArrowRight') setSidebarWidth(sidebarWidth + 8) }}
          >
            <div className="mx-auto h-full w-px bg-transparent transition-colors group-hover:bg-purple-500/60" />
          </div>
        </aside>

        <main className="min-w-0 flex-1 overflow-hidden rounded-none border-0 bg-background-primary shadow-none md:rounded-[20px] md:border md:border-border md:shadow-panel">
          <div key={activeSection} className="motion-view-in h-full min-h-0">
            {renderPage()}
          </div>
        </main>
      </div>

      <nav className="grid shrink-0 grid-cols-4 border-t border-border bg-background-secondary/98 pb-[env(safe-area-inset-bottom)] md:hidden" aria-label="Navegação principal mobile">
        {NAV_ITEMS.map((item) => {
          const isActive = activeSection === item.section
          return (
            <button
              key={item.section}
              type="button"
              onClick={() => setActiveSection(item.section)}
              className={["motion-control flex min-h-[60px] flex-col items-center justify-center gap-1 px-1 text-[11px] font-medium", isActive ? "text-accent-secondary" : "text-text-secondary"].join(' ')}
              aria-current={isActive ? 'page' : undefined}
              aria-label={item.ariaLabel}
            >
              <span className={["grid h-8 w-12 place-items-center rounded-xl", isActive ? "bg-accent/20" : ""].join(' ')}>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          )
        })}
      </nav>

      <NotificationToast />
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => {
          setSettingsOpen(false)
          closeSettingsStore()
        }}
        initialSection={settingsSection ?? undefined}
      />
      {callStatus !== 'idle' && !isExpanded && <MiniCallCard />}
      {callStatus !== 'idle' && isExpanded && (
        <CallOverlay
          onOpenVoiceSettings={() => {
            useUIStore.getState().openSettings('voz')
          }}
        />
      )}
    </div>
  )
}

export default DashboardPage
