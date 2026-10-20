import React, { useState } from 'react'
import { Calendar, Crown, FileText, MessageSquare, Settings, Users, X } from 'lucide-react'
import type { Forum } from '@/types/index'
import { Button } from '@/components/ui/index'
import { useAuthStore } from '@/store/authStore'
import { useSocialStore } from '@/store/socialStore'
import { formatTimestamp } from '@/utils/formatters'
import { ForumAvatar } from './ForumCard'
import CommunityWorkspaceModal from './CommunityWorkspaceModal'
import { renderAnceryxText } from '@/lib/anceryxEmojis'
import { mediaApi } from '@/services/mediaApi'
import type { SidebarSection } from '@/types/index'

interface ForumDetailModalProps {
  forum: Forum
  onClose: () => void
  onNavigateGlobal?: (section: SidebarSection) => void
}

const ForumDetailModal: React.FC<ForumDetailModalProps> = ({ forum, onClose, onNavigateGlobal }) => {
  const toggleForumJoin = useSocialStore((s) => s.toggleForumJoin)
  const liveForum = useSocialStore((s) => s.forums.find((item) => item.id === forum.id) ?? forum)
  const currentUserId = useAuthStore((s) => s.user?.id ?? '')
  const [managementOpen, setManagementOpen] = useState(false)
  const [workspaceOpen, setWorkspaceOpen] = useState(false)
  const [bannerFailed, setBannerFailed] = useState(false)

  const localRole = liveForum.members.find((member) => member.userId === currentUserId)?.role ?? null
  const isOwner = liveForum.ownerId === currentUserId
  const canManage = localRole === 'owner' || localRole === 'moderator'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
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
            <Button
              variant={liveForum.isJoined ? 'secondary' : 'primary'}
              size="sm"
              onClick={() => toggleForumJoin(liveForum.id)}
              className="shrink-0"
            >
              {liveForum.isJoined ? 'Sair' : 'Entrar'}
            </Button>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              variant="primary"
              size="sm"
              leftIcon={<MessageSquare size={14} />}
              onClick={() => setWorkspaceOpen(true)}
            >
              Abrir comunidade
            </Button>
            {canManage && (
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<Settings size={14} />}
                onClick={() => { setManagementOpen(true); setWorkspaceOpen(true) }}
              >
                Gerenciar fórum
              </Button>
            )}
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

          <div className="mt-6 rounded-lg border border-dashed border-border p-6 text-center">
            <FileText size={24} className="text-text-secondary mx-auto mb-2 opacity-40" />
            <p className="text-sm text-text-secondary opacity-60">
              As publicações deste fórum aparecerão aqui.
            </p>
          </div>
        </div>
      </div>

      {workspaceOpen && (
        <CommunityWorkspaceModal forum={liveForum} communityId={liveForum.id} initialManagementOpen={managementOpen} onClose={() => { setWorkspaceOpen(false); setManagementOpen(false) }} onNavigateGlobal={(section) => { setWorkspaceOpen(false); onClose(); onNavigateGlobal?.(section) }} />
      )}
    </div>
  )
}

export default ForumDetailModal
