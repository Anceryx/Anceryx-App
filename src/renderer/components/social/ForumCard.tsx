import React, { useEffect, useState } from 'react'
import { Users, FileText, Crown } from 'lucide-react'
import type { Forum } from '@/types/index'
import { Button } from '@/components/ui/index'
import { useSocialStore } from '@/store/socialStore'
import { useAuthStore } from '@/store/authStore'
import { mediaApi } from '@/services/mediaApi'
import { useTranslation } from '@/i18n'
import { useUIStore } from '@/store/uiStore'

interface ForumCardProps {
  forum: Forum
  /** Se fornecido, abre o detalhe do fórum ao clicar no card */
  onClick?: (forum: Forum) => void
}

/** Avatar de fórum — imagem ou inicial do nome */
export const ForumAvatar: React.FC<{ iconImage: string | null; name: string; size?: number }> = ({
  iconImage,
  name,
  size = 44,
}) => {
  const [imageFailed, setImageFailed] = useState(false)
  useEffect(() => { setImageFailed(false) }, [iconImage])
  if (iconImage && !imageFailed) {
    return (
      <img
        src={mediaApi.resolvePublicUrl(iconImage)}
        alt=""
        className="rounded-xl object-cover shrink-0"
        style={{ width: size, height: size }}
        onError={() => { console.warn('[media] Community icon failed to load'); setImageFailed(true) }}
      />
    )
  }
  const initial = name.trim().charAt(0).toUpperCase() || '?'
  return (
    <span
      className="rounded-xl flex items-center justify-center shrink-0 font-bold text-white select-none"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.4,
        background: 'var(--color-accent)',
      }}
      aria-hidden="true"
    >
      {initial}
    </span>
  )
}

const ForumCard: React.FC<ForumCardProps> = ({ forum, onClick }) => {
  const t = useTranslation()
  const locale = useUIStore((s) => s.locale)
  const toggleForumJoin = useSocialStore((s) => s.toggleForumJoin)
  const currentUserId   = useAuthStore((s) => s.user?.id ?? '')
  const isOwner         = forum.ownerId === currentUserId

  return (
    <div
      className={[
        'bg-background-secondary border border-border rounded-lg p-4 transition-colors',
        onClick ? 'cursor-pointer hover:border-accent/40' : '',
      ].join(' ')}
      onClick={() => onClick?.(forum)}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick(forum) : undefined}
    >
      <div className="flex items-start gap-3">
        {/* Ícone/Avatar */}
        <ForumAvatar iconImage={forum.iconImage} name={forum.name} size={44} />

        {/* Informações */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="font-semibold text-text-primary leading-tight">{forum.name}</p>
            {isOwner && (
              <span
                className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                style={{
                  background: 'color-mix(in srgb, var(--color-accent) 15%, transparent)',
                  color: 'var(--color-accent)',
                }}
                title={t('forums.createdByYou')}
              >
                <Crown size={9} />
                {t('forums.createdByYou')}
              </span>
            )}
          </div>
          <p className="text-sm text-text-secondary mt-0.5 line-clamp-2">{forum.description}</p>

          {/* Tags */}
          {forum.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {forum.tags.slice(0, 4).map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-background-tertiary text-text-secondary border border-border"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Stats */}
          <div className="flex items-center gap-3 mt-2">
            <span className="flex items-center gap-1 text-xs text-text-secondary">
              <Users size={11} aria-hidden="true" />
              {forum.memberCount.toLocaleString(locale)}
            </span>
            <span className="text-xs text-text-secondary" aria-hidden="true">·</span>
            <span className="flex items-center gap-1 text-xs text-text-secondary">
              <FileText size={11} aria-hidden="true" />
              {forum.postCount.toLocaleString(locale)} {t('forums.posts')}
            </span>
          </div>
        </div>

        {/* Botão entrar/sair */}
        <Button
          variant={forum.isJoined ? 'secondary' : 'primary'}
          size="sm"
          onClick={(e) => {
            e.stopPropagation()
            toggleForumJoin(forum.id)
          }}
          className="shrink-0"
          aria-label={t(forum.isJoined ? 'forums.leaveAria' : 'forums.joinAria', { name: forum.name })}
        >
          {forum.isJoined ? t('forums.joined') : t('forums.join')}
        </Button>
      </div>
    </div>
  )
}

export default ForumCard
