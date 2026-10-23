import React, { useEffect, useState } from 'react'
import { BadgeCheck, Bookmark, Flag, Heart, MessageCircle, MoreVertical, Pin, Share2, Trash2 } from 'lucide-react'
import type { Post } from '@/types/index'
import { Avatar, Button, Modal } from '@/components/ui/index'
import { useSocialStore } from '@/store/socialStore'
import { useUIStore } from '@/store/uiStore'
import { formatTimestamp } from '@/utils/formatters'
import { renderAnceryxText } from '@/lib/anceryxEmojis'
import { mediaApi } from '@/services/mediaApi'
import { MediaAttachment } from '@/components/ui/MediaAttachment'
import { postsApi } from '@/services/postsApi'
import UserProfileModal from '@/components/social/UserProfileModal'
import { useTranslation } from '@/i18n'

interface PostCardProps {
  post: Post
  currentUserId: string
  onOpen?: (post: Post, mode?: 'detail' | 'media') => void
  onSavedChange?: (postId: string, saved: boolean) => void
  onPinnedChange?: (postId: string, pinnedPostId: string | null) => void
}

function renderContent(text: string): React.ReactNode {
  return text.split(' ').map((word, index) => (
    <React.Fragment key={`${word}-${index}`}>
      {index > 0 && ' '}
      {word.startsWith('#')
        ? <span className="font-medium text-accent-secondary">{word}</span>
        : renderAnceryxText(word)}
    </React.Fragment>
  ))
}

const PostCard: React.FC<PostCardProps> = ({ post, currentUserId, onOpen, onSavedChange, onPinnedChange }) => {
  const t = useTranslation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [authorProfileOpen, setAuthorProfileOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [reportReason, setReportReason] = useState<'spam' | 'harassment' | 'violence_or_threat' | 'inappropriate_content' | 'personal_information' | 'scam_or_fraud' | 'other'>('spam')
  const [reportDetails, setReportDetails] = useState('')
  const [actionBusy, setActionBusy] = useState(false)
  const [saved, setSaved] = useState(Boolean(post.viewerHasSaved))
  const [saving, setSaving] = useState(false)
  const [pinned, setPinned] = useState(Boolean(post.isPinnedToProfile))
  const [pinning, setPinning] = useState(false)
  useEffect(() => { setPinned(Boolean(post.isPinnedToProfile)) }, [post.id, post.isPinnedToProfile])
  useEffect(() => { setSaved(Boolean(post.viewerHasSaved)) }, [post.id, post.viewerHasSaved])
  const { toggleLike, deleteRealtimePost, setPinnedProfilePost, profiles } = useSocialStore((s) => ({ toggleLike: s.toggleLike, deleteRealtimePost: s.deleteRealtimePost, setPinnedProfilePost: s.setPinnedProfilePost, profiles: s.profiles }))
  const addNotification = useUIStore((s) => s.addNotification)

  const author = profiles[post.authorId]
  const displayName = author?.displayName ?? post.author.displayName
  const handle = author?.username ?? post.author.username
  const isLiked = post.viewerHasLiked

  const handleLike = (event: React.MouseEvent) => {
    event.stopPropagation()
    void toggleLike(post.id, currentUserId).catch((error) => addNotification(error instanceof Error ? error.message : t('post.likeFailed'), 'error'))
  }

  const handleSave = async (event: React.MouseEvent) => {
    event.stopPropagation()
    if (saving) return
    setSaving(true)
    try {
      const next = !saved
      if (next) await postsApi.save(post.id)
      else await postsApi.unsave(post.id)
      setSaved(next)
      onSavedChange?.(post.id, next)
    } catch (error) {
      addNotification(error instanceof Error ? error.message : t('post.saveFailed'), 'error')
    } finally { setSaving(false) }
  }

  const handlePin = async () => {
    if (pinning) return
    setMenuOpen(false)
    setPinning(true)
    try {
      const pinnedPostId = pinned ? (await postsApi.unpin(post.id)).pinnedPostId : (await postsApi.pin(post.id)).pinnedPostId
      setPinnedProfilePost(currentUserId, pinnedPostId)
      setPinned(Boolean(pinnedPostId))
      onPinnedChange?.(post.id, pinnedPostId)
      addNotification(pinnedPostId ? t('post.pinnedNotice') : t('post.unpinnedNotice'), 'success')
    } catch (error) {
      addNotification(error instanceof Error ? error.message : t('post.pinFailed'), 'error')
    } finally { setPinning(false) }
  }

  const handleShare = async (event: React.MouseEvent) => {
    event.stopPropagation()
    try { await navigator.clipboard.writeText(`anceryx://post/${post.id}`); addNotification(t('post.linkCopied'), 'success') }
    catch { addNotification(t('post.linkCopyFailed'), 'error') }
  }

  const deletePost = async () => {
    setActionBusy(true)
    try { await postsApi.remove(post.id); deleteRealtimePost(post.id); setDeleteOpen(false); addNotification(t('post.deletedNotice'), 'success') }
    catch (error) { addNotification(error instanceof Error ? error.message : t('post.deleteFailed'), 'error') }
    finally { setActionBusy(false) }
  }

  const reportPost = async () => {
    if (reportReason === 'other' && !reportDetails.trim()) return
    setActionBusy(true)
    try { await postsApi.report(post.id, reportReason, reportDetails.trim() || undefined); setReportOpen(false); addNotification(t('post.reportSent'), 'success') }
    catch (error) { addNotification(error instanceof Error ? error.message : t('post.reportFailed'), 'error') }
    finally { setActionBusy(false) }
  }

  const openPost = (mode: 'detail' | 'media' = 'detail') => onOpen?.(post, mode)

  return (
    <article
      className="motion-control anceryx-card cursor-pointer p-4 hover:border-accent/35"
      onClick={() => openPost('detail')}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          openPost('detail')
        }
      }}
      aria-label={t('post.open', { name: displayName })}
    >
      <div className="flex items-center gap-3">
        <button type="button" onClick={(event) => { event.stopPropagation(); setAuthorProfileOpen(true) }} aria-label={t('post.openProfile', { name: displayName })}><Avatar src={author?.avatarUrl ?? post.author.avatarUrl} name={displayName} size="sm" /></button>
        <div className="min-w-0 flex-1">
          <button type="button" onClick={(event) => { event.stopPropagation(); setAuthorProfileOpen(true) }} className="inline-flex max-w-full items-center gap-1 truncate text-left text-sm font-bold text-text-primary hover:underline" aria-label={post.author.isOfficial ? t('post.officialAccount', { name: displayName }) : t('post.openProfile', { name: displayName })}><span className="truncate">{displayName}</span>{post.author.isOfficial && <BadgeCheck size={15} className="shrink-0 text-accent" aria-hidden="true" />}</button>
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-secondary">@{handle}</span>
            <span className="text-xs text-text-secondary">·</span>
            <span className="text-xs text-text-secondary">{formatTimestamp(post.createdAt)}</span>
          </div>
        </div>
        <div className="relative" onClick={(event) => event.stopPropagation()}>
          <button type="button" onClick={() => setMenuOpen((open) => !open)} className="rounded-lg p-2 text-text-secondary hover:bg-background-tertiary hover:text-text-primary" aria-label={t('post.moreActions')} aria-expanded={menuOpen}>
            <MoreVertical size={18} />
          </button>
          {menuOpen && <div className="absolute right-0 top-full z-20 mt-1 min-w-44 rounded-xl border border-border bg-background-secondary p-1 shadow-xl" role="menu">
            {post.author.id === currentUserId && <button type="button" role="menuitem" disabled={pinning} onClick={() => void handlePin()} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-text-primary hover:bg-background-tertiary disabled:opacity-60"><Pin size={15} />{pinned ? t('post.unpin') : t('post.pin')}</button>}
            {post.author.id === currentUserId ? <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); setDeleteOpen(true) }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-accent-red hover:bg-background-tertiary"><Trash2 size={15} />{t('post.delete')}</button> : <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); setReportDetails(''); setReportReason('spam'); setReportOpen(true) }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-text-primary hover:bg-background-tertiary"><Flag size={15} />{t('post.report')}</button>}
          </div>}
        </div>
      </div>

      {pinned && <div className="mt-3 flex items-center gap-1.5 text-xs font-medium text-accent"><Pin size={13} />{t('post.pinned')}</div>}

      <p className="my-3 text-sm leading-relaxed text-text-primary">
        {renderContent(post.content)}
      </p>

      {post.mediaUrl && (
        <MediaAttachment
          src={mediaApi.resolvePublicUrl(post.mediaUrl)}
          mimeType={post.mediaType === 'video' ? 'video/mp4' : post.mediaType === 'gif' ? 'image/gif' : 'image/jpeg'}
          alt={t('post.mediaAlt')}
          className="mb-2 mt-1 max-h-72 w-full rounded-lg border border-border object-contain"
          onClick={post.mediaType === 'video' ? undefined : (event) => {
            event.stopPropagation()
            openPost('media')
          }}
        />
      )}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={handleLike}
          className="motion-reaction flex items-center gap-1.5 rounded text-xs hover:text-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
          aria-label={isLiked ? t('post.unlike') : t('post.like')}
          aria-pressed={isLiked}
        >
          <Heart size={16} fill={isLiked ? 'currentColor' : 'none'} className={isLiked ? 'text-accent' : 'text-text-secondary'} />
          <span className={isLiked ? 'text-accent' : 'text-text-secondary'}>{post.likeCount}</span>
        </button>

        <button type="button" onClick={(event) => void handleSave(event)} disabled={saving}
          className={`flex items-center gap-1.5 rounded text-xs transition-colors hover:text-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent disabled:opacity-60 ${saved ? 'text-accent' : 'text-text-secondary'}`}
          aria-label={saved ? t('post.unsave') : t('post.save')} aria-pressed={saved}>
          <Bookmark size={16} fill={saved ? 'currentColor' : 'none'} />
        </button>

        <button
          type="button"
          className="flex items-center gap-1.5 rounded text-xs text-text-secondary transition-colors hover:text-text-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
          aria-label={t('post.comments')}
          onClick={(event) => {
            event.stopPropagation()
            openPost('detail')
          }}
        >
          <MessageCircle size={16} />
          <span>{post.commentCount}</span>
        </button>

        <button
          type="button"
          onClick={(event) => void handleShare(event)}
          className="flex items-center gap-1.5 rounded text-xs text-text-secondary transition-colors hover:text-text-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
          aria-label={t('post.share')}
        >
          <Share2 size={16} />
          <span>{post.shares}</span>
        </button>
      </div>
      <Modal isOpen={deleteOpen} onClose={() => { if (!actionBusy) setDeleteOpen(false) }} title={t('post.delete')}><div className="space-y-4"><p className="text-sm text-text-secondary">{t('post.deleteConfirm')}</p><div className="flex justify-end gap-2"><Button variant="ghost" disabled={actionBusy} onClick={() => setDeleteOpen(false)}>{t('common.cancel')}</Button><Button variant="danger" loading={actionBusy} onClick={() => void deletePost()}>{t('common.delete')}</Button></div></div></Modal>
      <Modal isOpen={reportOpen} onClose={() => { if (!actionBusy) setReportOpen(false) }} title={t('post.report')}><div className="space-y-4"><label className="block text-sm text-text-primary">{t('post.reportReason')}<select value={reportReason} onChange={(event) => setReportReason(event.target.value as typeof reportReason)} className="mt-1 w-full rounded-lg border border-border bg-background-tertiary px-3 py-2"><option value="spam">{t('post.reasonSpam')}</option><option value="harassment">{t('post.reasonHarassment')}</option><option value="inappropriate_content">{t('post.reasonInappropriate')}</option><option value="scam_or_fraud">{t('post.reasonScam')}</option><option value="violence_or_threat">{t('post.reasonViolence')}</option><option value="personal_information">{t('post.reasonPersonalInfo')}</option><option value="other">{t('post.reasonOther')}</option></select></label><label className="block text-sm text-text-primary">{t('post.reportDetails')}<textarea value={reportDetails} onChange={(event) => setReportDetails(event.target.value)} maxLength={1000} rows={3} className="mt-1 w-full rounded-lg border border-border bg-background-tertiary px-3 py-2" /></label><div className="flex justify-end gap-2"><Button variant="ghost" disabled={actionBusy} onClick={() => setReportOpen(false)}>{t('common.cancel')}</Button><Button loading={actionBusy} disabled={reportReason === 'other' && !reportDetails.trim()} onClick={() => void reportPost()}>{t('post.sendReport')}</Button></div></div></Modal>
      <UserProfileModal username={handle} isOpen={authorProfileOpen} onClose={() => setAuthorProfileOpen(false)} />
    </article>
  )
}

export default PostCard
