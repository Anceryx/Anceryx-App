import React, { useEffect, useState } from 'react'
import { Search, Plus, Crown, Users, MessageSquare } from 'lucide-react'
import { useSocialStore } from '@/store/socialStore'
import { useAuthStore } from '@/store/authStore'
import { useUIStore } from '@/store/uiStore'
import { Button } from '@/components/ui/index'
import ForumCard from '@/components/social/ForumCard'
import ForumDetailModal from '@/components/social/ForumDetailModal'
import CreateForumModal from '@/components/social/CreateForumModal'
import type { SidebarSection, Forum } from '@/types/index'
import { realtimeClient } from '@/services/realtimeClient'
import { communityApi } from '@/services/communityApi'

type Tab = 'todos' | 'meus'



// ── Página principal de Fóruns ────────────────────────────────────────────────
const ForunsPage: React.FC<{ onNavigateGlobal?: (section: SidebarSection) => void; onOpenWorkspace?: (forum: Forum) => void }> = ({ onNavigateGlobal, onOpenWorkspace }) => {
  const forums        = useSocialStore((s) => s.forums)
  const upsertRealtimeForumTopic = useSocialStore((s) => s.upsertRealtimeForumTopic)
  const deleteRealtimeForumTopic = useSocialStore((s) => s.deleteRealtimeForumTopic)
  const setForumTopicFlag = useSocialStore((s) => s.setForumTopicFlag)
  const currentUserId = useAuthStore((s) => s.user?.id ?? '')
  const token         = useAuthStore((s) => s.token)
  const addNotification = useUIStore((s) => s.addNotification)
  const hydrateSocial = useSocialStore((s) => s.hydrateSocial)

  const [activeTab,    setActiveTab]    = useState<Tab>('todos')
  const [searchQuery,  setSearchQuery]  = useState('')
  const [showCreate,   setShowCreate]   = useState(false)
  const [detailForum,  setDetailForum]  = useState<Forum | null>(null)
  const openForum = (forum: Forum) => {
    if (forum.isJoined && onOpenWorkspace) onOpenWorkspace(forum)
    else setDetailForum(forum)
  }

  useEffect(() => {
    if (!token) return
    realtimeClient.connect(token)
    const unsubs = [
      realtimeClient.subscribe('forum.topic.created', (event) => upsertRealtimeForumTopic(event.payload)),
      realtimeClient.subscribe('forum.topic.updated', (event) => upsertRealtimeForumTopic(event.payload)),
      realtimeClient.subscribe('forum.topic.deleted', (event) => deleteRealtimeForumTopic(event.payload.forumId, event.payload.topicId)),
      realtimeClient.subscribe('forum.topic.state.updated', (event) => setForumTopicFlag(event.payload.forumId, event.payload.topicId, event.payload.flag, event.payload.value)),
      realtimeClient.subscribe('forum.reply.created', () => addNotification('Nova resposta em um fórum que você acompanha.', 'info')),
      realtimeClient.subscribe('notification.created', (event) => {
        if (event.payload.type === 'forum.reply') addNotification('Nova resposta em um tópico relevante.', 'info')
      }),
    ]
    return () => unsubs.forEach((unsubscribe) => unsubscribe())
  }, [addNotification, deleteRealtimeForumTopic, setForumTopicFlag, token, upsertRealtimeForumTopic])

  useEffect(() => {
    const unsubscribe = window.electronAPI?.community.onInvite((inviteToken) => {
      void communityApi.joinByInvite(inviteToken).then(async ({ joined }) => {
        await hydrateSocial()
        setActiveTab('meus')
        addNotification(joined.channelId ? 'Você entrou no fórum pelo convite. Abra o canal indicado para continuar.' : 'Você entrou no fórum pelo convite.', 'success')
      }).catch((reason) => addNotification(reason instanceof Error ? reason.message : 'Não foi possível entrar pelo convite.', 'error'))
    })
    return unsubscribe
  }, [addNotification, hydrateSocial, token])

  const filtered = forums
    .filter((f) => {
      if (activeTab === 'meus') return f.isJoined
      return true
    })
    .filter((f) => {
      const q = searchQuery.toLowerCase().trim()
      if (!q) return true
      return (
        f.name.toLowerCase().includes(q) ||
        f.description.toLowerCase().includes(q) ||
        f.tags.some((t) => t.toLowerCase().includes(q))
      )
    })

  const myForums     = forums.filter((f) => f.isJoined)
  const ownedForums  = myForums.filter((f) => f.ownerId === currentUserId)
  const joinedForums = myForums.filter((f) => f.ownerId !== currentUserId)

  return (
    <>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex min-h-14 shrink-0 items-center gap-2 border-b border-border px-3 sm:gap-3 sm:px-4">
          <Search size={16} className="text-text-secondary shrink-0" aria-hidden="true" />
          <input
            type="text"
            className="min-w-0 flex-1 text-sm bg-background-tertiary border border-border rounded-md px-3 py-2 text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
            placeholder="Procurar fóruns..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Procurar fóruns"
          />
          <button
            className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-text-secondary hover:text-text-primary hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            onClick={() => setShowCreate(true)}
            aria-label="Criar fórum"
            title="Criar fórum"
          >
            <Plus size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex shrink-0 overflow-x-auto border-b border-border px-2 sm:px-4">
          {(['todos', 'meus'] as Tab[]).map((tab) => (
            <button
              key={tab}
              className={[
                'min-h-11 shrink-0 px-3 py-2.5 text-sm font-medium transition-colors sm:px-4',
                activeTab === tab
                  ? 'border-b-2 border-accent text-accent'
                  : 'text-text-secondary hover:text-text-primary'
              ].join(' ')}
              onClick={() => setActiveTab(tab)}
              aria-current={activeTab === tab ? 'page' : undefined}
            >
              {tab === 'todos' ? 'Todos' : `Meus Fóruns${myForums.length > 0 ? ` (${myForums.length})` : ''}`}
            </button>
          ))}
        </div>

        {/* Conteúdo */}
        <div className="mobile-scroll flex-1 overflow-y-auto p-3 sm:p-4">
          {/* Empty state — sem nenhum fórum */}
          {forums.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ background: 'color-mix(in srgb, var(--color-accent) 12%, transparent)' }}
              >
                <MessageSquare size={28} style={{ color: 'var(--color-accent)' }} />
              </div>
              <div>
                <p className="font-semibold text-text-primary mb-1">Nenhum fórum criado ainda</p>
                <p className="text-sm text-text-secondary">Seja o primeiro a criar uma comunidade.</p>
              </div>
              <Button variant="primary" size="sm" onClick={() => setShowCreate(true)} leftIcon={<Plus size={14} />}>
                Criar fórum
              </Button>
            </div>
          )}

          {/* Empty state — aba Meus sem nada */}
          {forums.length > 0 && activeTab === 'meus' && myForums.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
              <Users size={28} className="text-text-secondary opacity-40" />
              <p className="text-sm text-text-secondary">Você ainda não entrou em nenhum fórum.</p>
              <Button variant="ghost" size="sm" onClick={() => setActiveTab('todos')}>
                Ver todos os fóruns
              </Button>
            </div>
          )}

          {/* Seções na aba Meus */}
          {activeTab === 'meus' && myForums.length > 0 && (
            <div className="flex flex-col gap-6">
              {ownedForums.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Crown size={13} style={{ color: 'var(--color-accent)' }} />
                    <span className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                      Criados por você
                    </span>
                  </div>
                  <div className="flex flex-col gap-2">
                    {ownedForums.map((f) => (
                        <ForumCard key={f.id} forum={f} onClick={openForum} />
                    ))}
                  </div>
                </div>
              )}
              {joinedForums.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Users size={13} className="text-text-secondary" />
                    <span className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                      Onde você é membro
                    </span>
                  </div>
                  <div className="flex flex-col gap-2">
                    {joinedForums.map((f) => (
                        <ForumCard key={f.id} forum={f} onClick={openForum} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Lista geral (aba Todos) */}
          {activeTab === 'todos' && forums.length > 0 && (
            <>
              {filtered.length === 0 ? (
                <p className="text-center text-text-secondary text-sm py-8">
                  Nenhum fórum corresponde à busca.
                </p>
              ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {filtered.map((forum) => (
                    <ForumCard key={forum.id} forum={forum} onClick={openForum} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modal de criação */}
        {showCreate && <CreateForumModal onClose={() => setShowCreate(false)} onCreated={(forum) => { setShowCreate(false); if (onOpenWorkspace) onOpenWorkspace(forum); else setDetailForum(forum) }} />}

      {/* Modal de detalhe */}
      {detailForum && (
          <ForumDetailModal forum={detailForum} onClose={() => setDetailForum(null)} onOpenWorkspace={onOpenWorkspace} onNavigateGlobal={onNavigateGlobal} />
      )}
    </>
  )
}

export default ForunsPage
