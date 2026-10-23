import React, { useEffect, useRef, useState } from 'react'
import ReactDOM from 'react-dom'
import { AlertCircle, Heart, MessageCircle, Send, Share2, X } from 'lucide-react'
import type { Comment } from '@/types/index'
import { Avatar, EmojiPicker } from '@/components/ui/index'
import { useAuthStore } from '@/store/authStore'
import { useSocialStore } from '@/store/socialStore'
import { useUIStore } from '@/store/uiStore'
import { formatTimestamp } from '@/utils/formatters'
import { insertAtCursor, renderAnceryxText, type AnceryxEmoji } from '@/lib/anceryxEmojis'
import { MediaAttachment } from '@/components/ui/MediaAttachment'

interface PostDetailModalProps {
  postId: string
  initialMode?: 'detail' | 'media'
  onClose: () => void
}

function renderPostText(text: string): React.ReactNode {
  return text.split(' ').map((word, index) => (
    <React.Fragment key={`${word}-${index}`}>
      {index > 0 && ' '}
      {word.startsWith('#')
        ? <span className="font-medium text-accent-secondary">{word}</span>
        : renderAnceryxText(word)}
    </React.Fragment>
  ))
}

const CommentRow: React.FC<{ comment: Comment }> = ({ comment }) => {
  const author = { avatar: comment.author.avatarUrl, displayName: comment.author.displayName, handle: comment.author.username }
  return (
    <article className="flex gap-3 rounded-xl border border-border bg-background-secondary/70 p-3">
      <Avatar src={author.avatar} name={author.displayName} size="xs" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-text-primary">{author.displayName}</span>
          <span className="text-xs text-text-secondary">@{author.handle}</span>
          <span className="text-xs text-text-secondary">·</span>
          <span className="text-xs text-text-secondary">{formatTimestamp(comment.createdAt)}</span>
        </div>
        <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-text-primary">
          {renderAnceryxText(comment.content)}
        </p>
      </div>
    </article>
  )
}

const CommentComposer: React.FC<{ postId: string }> = ({ postId }) => {
  const user = useAuthStore((s) => s.user)
  const addComment = useSocialStore((s) => s.addComment)
  const [value, setValue] = useState('')
  const [emojiOpen, setEmojiOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const submittingRef = useRef(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const handleInsertEmoji = (emoji: AnceryxEmoji) => {
    const input = inputRef.current
    const start = input?.selectionStart ?? value.length
    const end = input?.selectionEnd ?? value.length
    const next = insertAtCursor(value, emoji.shortcode, start, end)
    setValue(next.value)
    requestAnimationFrame(() => {
      input?.focus()
      input?.setSelectionRange(next.cursor, next.cursor)
    })
  }

  const handleSubmit = async () => {
    const trimmed = value.trim()
    if (!user || !trimmed || submittingRef.current) return
    submittingRef.current = true
    setSubmitting(true)
    setError(null)
    try {
      await addComment(postId, trimmed)
      setValue('')
    } catch {
      setError('Não foi possível comentar agora.')
    } finally {
      submittingRef.current = false
      setSubmitting(false)
    }
  }

  return (
    <div className="border-t border-border bg-background-secondary/85 p-3">
      {error && (
        <div className="mb-2 flex items-center justify-between gap-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
          <span className="inline-flex items-center gap-2">
            <AlertCircle size={14} /> {error}
          </span>
          <button type="button" className="font-semibold text-red-100 hover:text-white" onClick={handleSubmit}>
            Tentar novamente
          </button>
        </div>
      )}
      <div className="flex items-end gap-2">
        <textarea
          ref={inputRef}
          rows={1}
          value={value}
          onChange={(event) => setValue(event.target.value.slice(0, 700))}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault()
              void handleSubmit()
            }
          }}
          disabled={submitting}
          placeholder="Adicione um comentário..."
          className="min-h-[42px] flex-1 resize-none rounded-xl border border-border bg-background-tertiary px-3 py-2.5 text-sm text-text-primary placeholder:text-text-secondary/60 focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-60"
          aria-label="Adicionar comentário"
        />
        <EmojiPicker
          isOpen={emojiOpen}
          onToggle={() => setEmojiOpen((open) => !open)}
          onClose={() => setEmojiOpen(false)}
          onSelect={handleInsertEmoji}
          label="Abrir emojis para comentário"
        />
        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={!value.trim() || submitting}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent text-white transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:bg-background-tertiary disabled:text-text-secondary disabled:opacity-50"
          aria-label="Enviar comentário"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  )
}

const PostDetailModal: React.FC<PostDetailModalProps> = ({ postId, initialMode = 'detail', onClose }) => {
  const post = useSocialStore((s) => s.posts.find((item) => item.id === postId))
  const toggleLike = useSocialStore((s) => s.toggleLike)
  const loadComments = useSocialStore((s) => s.loadComments)
  const user = useAuthStore((s) => s.user)
  const addNotification = useUIStore((s) => s.addNotification)
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => { void loadComments(postId) }, [loadComments, postId])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKeyDown)
    requestAnimationFrame(() => dialogRef.current?.focus())
    return () => {
      document.body.style.overflow = ''
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [onClose])

  if (!post) return null

  const author = { avatar: post.author.avatarUrl, displayName: post.author.displayName, handle: post.author.username }
  const hasMedia = Boolean(post.mediaUrl)
  const isMediaMode = hasMedia && initialMode === 'media'
  const isLiked = user ? post.viewerHasLiked : false

  const handleLike = () => {
    if (!user) return
    toggleLike(post.id, user.id)
  }

  const handleShare = async () => {
    try { await navigator.clipboard.writeText(`anceryx://post/${postId}`); addNotification('Link do aplicativo copiado!', 'success') }
    catch { addNotification('Não foi possível copiar o link.', 'error') }
  }

  const details = (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-start gap-3 border-b border-border p-4">
        <Avatar src={author.avatar} name={author.displayName} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-text-primary">{author.displayName}</p>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-text-secondary">@{author.handle}</span>
            <span className="text-xs text-text-secondary">·</span>
            <span className="text-xs text-text-secondary">{formatTimestamp(post.createdAt)}</span>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4 anceryx-scroll">
        <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-text-primary">
          {renderPostText(post.content)}
        </p>

        <div className="mt-4 flex items-center gap-4 border-y border-border py-3">
          <button
            type="button"
            onClick={handleLike}
            className="motion-reaction flex items-center gap-1.5 rounded text-xs hover:text-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
            aria-label={isLiked ? 'Descurtir post' : 'Curtir post'}
            aria-pressed={isLiked}
          >
            <Heart size={16} fill={isLiked ? 'currentColor' : 'none'} className={isLiked ? 'text-accent' : 'text-text-secondary'} />
            <span className={isLiked ? 'text-accent' : 'text-text-secondary'}>{post.likeCount}</span>
          </button>
          <span className="flex items-center gap-1.5 text-xs text-text-secondary">
            <MessageCircle size={16} /> {post.commentCount}
          </span>
          <button
            type="button"
              onClick={() => void handleShare()}
            className="flex items-center gap-1.5 rounded text-xs text-text-secondary transition-colors hover:text-text-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
            aria-label="Compartilhar post"
          >
            <Share2 size={16} /> {post.shares}
          </button>
        </div>

        <div className="mt-4 flex flex-col gap-3">
          {post.comments.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-6 text-center">
              <p className="text-sm font-medium text-text-primary">Seja o primeiro a comentar</p>
              <p className="mt-1 text-xs text-text-secondary">Comentários com texto e emojis Anceryx aparecem aqui.</p>
            </div>
          ) : (
            post.comments.map((comment) => <CommentRow key={comment.id} comment={comment} />)
          )}
        </div>
      </div>

      <CommentComposer postId={post.id} />
    </div>
  )

  return ReactDOM.createPortal(
    <div
      className="titlebar-overlay fixed inset-0 z-[70] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Detalhes do post"
    >
      <button className="motion-backdrop-in absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} aria-label="Fechar detalhes do post" />
      <div
        ref={dialogRef}
        tabIndex={-1}
        className={[
          'motion-surface-in relative z-10 flex max-h-[92vh] w-full overflow-hidden rounded-2xl border border-border bg-background-secondary shadow-2xl focus:outline-none',
          isMediaMode ? 'max-w-[1180px] flex-row max-[900px]:flex-col' : 'max-w-[620px] flex-col',
        ].join(' ')}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-20 grid h-9 w-9 place-items-center rounded-xl bg-black/45 text-white transition-colors hover:bg-black/70"
          aria-label="Fechar"
        >
          <X size={18} />
        </button>

        {isMediaMode && post.mediaUrl && (
          <div className="grid min-h-0 flex-[1.35] place-items-center bg-black/70 p-4 max-[900px]:max-h-[52vh]">
            <MediaAttachment src={post.mediaUrl} mimeType={post.mediaType === 'video' ? 'video/mp4' : post.mediaType === 'gif' ? 'image/gif' : 'image/jpeg'} alt="Mídia do post" className="max-h-full max-w-full rounded-xl object-contain" />
          </div>
        )}

        <aside className={['flex min-h-0 flex-col', isMediaMode ? 'w-[390px] max-[900px]:w-full' : 'h-[min(720px,92vh)]'].join(' ')}>
          {details}
        </aside>
      </div>
    </div>,
    document.body
  )
}

export default PostDetailModal
