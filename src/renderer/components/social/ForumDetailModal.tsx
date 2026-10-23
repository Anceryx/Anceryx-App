import React, { useState } from 'react'
import { Calendar, Crown, FileText, Users, X } from 'lucide-react'
import type { Forum } from '@/types/index'
import { Button } from '@/components/ui/index'
import { useAuthStore } from '@/store/authStore'
import { useSocialStore } from '@/store/socialStore'
import { useUIStore } from '@/store/uiStore'
import { formatTimestamp } from '@/utils/formatters'
import { ForumAvatar } from './ForumCard'
import CommunityWorkspaceModal from './CommunityWorkspaceModal'
import { renderAnceryxText } from '@/lib/anceryxEmojis'
import { mediaApi } from '@/services/mediaApi'
import type { SidebarSection } from '@/types/index'

interface ForumDetailModalProps {
  forum: Forum
  onClose: () => void
  onOpenWorkspace?: (forum: Forum) => void
  onNavigateGlobal?: (section: SidebarSection) => void
}

const ForumDetailModal: React.FC<ForumDetailModalProps> = ({ forum, onClose, onOpenWorkspace, onNavigateGlobal }) => {
  const toggleForumJoin = useSocialStore((s) => s.toggleForumJoin)
  const liveForum = useSocialStore((s) => s.forums.find((item) => item.id === forum.id) ?? forum)
  const currentUserId = useAuthStore((s) => s.user?.id ?? '')
  const addNotification = useUIStore((s) => s.addNotification)
  const [workspaceOpen, setWorkspaceOpen] = useState(false)
  const [bannerFailed, setBannerFailed] = useState(false)

  const isOwner = liveForum.ownerId === currentUserId

  return (
    <div
      className="titlebar-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label={`Detalhes do fórum ${liveForum.name}`}
    >
      <div className="bg-background-secondary border border-border rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden flex flex-col max-h-[90vh]">
        <div
          className="relative h-32 shrink-0"
          style={{
            background: liveForum.bannerImage && !bannerFailed
              ? undefined
              : 'linear-gradient(135deg, color-mix(in srgb, var(--color-accent) 30%, transparent), color-mix(in srgb, var(--color-accent) 10%, transparent))',
          }}
        >
          {liveForum.bannerImage && !bannerFailed && (
            <img src={mediaApi.resolvePublicUrl(liveForum.bannerImage)} alt="" className="absolute inset-0 w-full h-full object-cover" onError={() => { console.warn('[media] Forum banner failed to load'); setBannerFailed(true) }} />
          )}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 bg-black/50 hover:bg-black/70 text-white rounded-full p-1.5 transition-colors"
            aria-label="Fechar"
          >
            <X size={15} />
          </button>
          <div className="absolute -bottom-6 left-5">
            <div className="p-0.5 bg-background-secondary rounded-xl">
              <ForumAvatar iconImage={liveForum.iconImage} name={liveForum.name} size={52} />
            </div>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 px-5 pt-10 pb-5">
          <div className="flex items-start justify-between gap-3 mb-1">
            <div>
              <h2 className="text-xl font-bold text-text-primary leading-tight">{liveForum.name}</h2>
              {isOwner && (
                <span
                  className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full mt-1"
                  style={{
                    background: 'color-mix(in srgb, var(--color-accent) 15%, transparent)',
                    color: 'var(--color-accent)',
                  }}
                >
                  <Crown size={9} /> Criado por você
                </span>
              )}
            </div>
            <Button variant="primary" size="sm" className="shrink-0" onClick={async () => {
              try {
                if (!liveForum.isJoined) await toggleForumJoin(liveForum.id)
                if (onOpenWorkspace) { onOpenWorkspace(liveForum); onClose(); return }
                setWorkspaceOpen(true)
              } catch (error) {
                addNotification(error instanceof Error ? error.message : 'Não foi possível entrar nesta comunidade.', 'error')
              }
            }}>{liveForum.isJoined ? 'Abrir comunidade' : 'Entrar na comunidade'}</Button>
          </div>

          <p className="text-sm text-text-secondary mt-3 leading-relaxed">{renderAnceryxText(liveForum.description)}</p>

          <div className="flex gap-5 mt-4">
            <div className="flex flex-col items-center gap-0.5">
              <span className="flex items-center gap-1.5 text-sm font-semibold text-text-primary">
                <Users size={14} className="text-accent" />
                {liveForum.memberCount.toLocaleString('pt-BR')}
              </span>
              <span className="text-xs text-text-secondary">Membros</span>
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <span className="flex items-center gap-1.5 text-sm font-semibold text-text-primary">
                <FileText size={14} className="text-accent" />
                {liveForum.postCount.toLocaleString('pt-BR')}
              </span>
              <span className="text-xs text-text-secondary">Posts</span>
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <span className="flex items-center gap-1.5 text-sm font-semibold text-text-primary">
                <Calendar size={14} className="text-accent" />
                {formatTimestamp(liveForum.createdAt)}
              </span>
              <span className="text-xs text-text-secondary">Criado</span>
            </div>
          </div>

          {liveForum.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-4">
              {liveForum.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs px-2 py-0.5 rounded-full bg-background-tertiary text-text-secondary border border-border"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          <div className="mt-6 rounded-lg border border-border bg-background-tertiary/40 p-4">
            <p className="text-sm font-semibold text-text-primary">Canais, tópicos e conversas</p>
            <p className="mt-1 text-xs text-text-secondary">Abra a comunidade para acessar os canais e as publicações organizadas por tópico.</p>
          </div>
        </div>
      </div>

      {workspaceOpen && (
        <CommunityWorkspaceModal forum={liveForum} communityId={liveForum.id} onClose={() => setWorkspaceOpen(false)} onForumDeleted={() => { setWorkspaceOpen(false); onClose() }} onNavigateGlobal={(section) => { setWorkspaceOpen(false); onClose(); onNavigateGlobal?.(section) }} />
      )}
    </div>
  )
}

export default ForumDetailModal
