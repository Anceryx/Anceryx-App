import React, { useEffect, useRef, useState } from 'react'
import { AlertCircle, Hash, ImagePlus, Search, X } from 'lucide-react'
import { Avatar, Button, EmojiPicker } from '@/components/ui/index'
import { PostCard, PostDetailModal } from '@/components/social/index'
import { useAuthStore } from '@/store/authStore'
import { usePersistentDraft } from '@/hooks/usePersistentDraft'
import { realtimePostToLocal, useSocialStore } from '@/store/socialStore'
import { useUIStore } from '@/store/uiStore'
import { FREE_TEXT_LIMIT, PREMIUM_TEXT_LIMIT, hasAnceryxPlus } from '@/lib/premium'
import { insertAtCursor, type AnceryxEmoji } from '@/lib/anceryxEmojis'
import { validateUpload } from '@/utils/validators'
import { mediaApi } from '@/services/mediaApi'
import { realtimeClient } from '@/services/realtimeClient'
import { socialApi, type PublicProfileDto } from '@/services/socialApi'
import { UserProfileModal } from '@/components/social/index'
import { postsApi } from '@/services/postsApi'
import { ApiError } from '@/services/apiClient'
import { useTranslation } from '@/i18n'

const ACCEPTED_IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4']

interface MediaState {
  name: string
  type: string
  preview: string
  file: File
}

const FeedPage: React.FC = () => {
  const t = useTranslation()
  const { posts, following, feedCursor, createPost, hydrateSocial, loading, error: feedError, upsertRealtimePost, deleteRealtimePost, setRealtimePostLike, upsertRealtimeComment, deleteRealtimeComment } = useSocialStore((s) => ({
    posts: s.posts,
    following: s.following,
    feedCursor: s.feedCursor,
    createPost: s.createPost,
    hydrateSocial: s.hydrateSocial,
    loading: s.loading,
    error: s.error,
    upsertRealtimePost: s.upsertRealtimePost,
    deleteRealtimePost: s.deleteRealtimePost,
    setRealtimePostLike: s.setRealtimePostLike,
    upsertRealtimeComment: s.upsertRealtimeComment,
    deleteRealtimeComment: s.deleteRealtimeComment,
  }))
  const user = useAuthStore((s) => s.user)
  const setActiveSection = useSocialStore((s) => s.setActiveSection)
  const token = useAuthStore((s) => s.token)
  const addNotification = useUIStore((s) => s.addNotification)

  const MAX_CHARS = hasAnceryxPlus(user?.subscription) ? PREMIUM_TEXT_LIMIT : FREE_TEXT_LIMIT
  const [expanded, setExpanded] = useState(false)
  const postDraft = usePersistentDraft(user?.id ?? '', 'post', '00000000-0000-4000-8000-000000000001')
  const content = postDraft.value
  const setContent = postDraft.setValue
  const [media, setMedia] = useState<MediaState | null>(null)
  const [mediaLoading, setMediaLoading] = useState(false)
  const [mediaError, setMediaError] = useState<string | null>(null)
  const [mediaProgress, setMediaProgress] = useState(0)
  const uploadControllerRef = useRef<AbortController | null>(null)
  const [emojiOpen, setEmojiOpen] = useState(false)
  const [detailPost, setDetailPost] = useState<{ id: string; mode: 'detail' | 'media' } | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchUsers, setSearchUsers] = useState<PublicProfileDto[]>([])
  const [searchError, setSearchError] = useState<string | null>(null)
  const [searching, setSearching] = useState(false)
  const [selectedUser, setSelectedUser] = useState<string | null>(null)
  const [feedTab, setFeedTab] = useState<'for-you' | 'following'>('for-you')
  const [followingPosts, setFollowingPosts] = useState<ReturnType<typeof realtimePostToLocal>[]>([])
  const [pageCursor, setPageCursor] = useState<string | null>(null)
  const [pageLoading, setPageLoading] = useState(false)
  const [pageError, setPageError] = useState<string | null>(null)
  const [officialBanners, setOfficialBanners] = useState<Awaited<ReturnType<typeof postsApi.announcements>>['campaigns']>([])
  const pendingPostId = useUIStore((state) => state.pendingPostId)
  const consumePendingPost = useUIStore((state) => state.consumePendingPost)

  useEffect(() => { if (postDraft.value.trim()) setExpanded(true) }, [postDraft.persistence, postDraft.value])

  const mediaInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    void hydrateSocial()
  }, [hydrateSocial])

  useEffect(() => {
    if (feedTab === 'for-you') { setPageCursor(feedCursor); return }
    let active = true
    setPageLoading(true); setPageError(null); setFollowingPosts([])
    void postsApi.feed(undefined, 'following').then(({ posts: rows, nextCursor }) => {
      if (active) { setFollowingPosts(rows.map(realtimePostToLocal)); setPageCursor(nextCursor) }
    }).catch((error) => { if (active) setPageError(error instanceof Error ? error.message : 'Não foi possível carregar o feed de quem você segue.') })
      .finally(() => { if (active) setPageLoading(false) })
    return () => { active = false }
  }, [feedTab, token])

  useEffect(() => { if (feedTab === 'for-you') setPageCursor(feedCursor) }, [feedCursor, feedTab])

  useEffect(() => {
    let active = true
    const refresh = () => void postsApi.announcements().then(({ campaigns }) => { if (active) setOfficialBanners(campaigns) }).catch(() => { if (active) setOfficialBanners([]) })
    refresh()
    const timer = window.setInterval(refresh, 60_000)
    return () => { active = false; window.clearInterval(timer) }
  }, [token])

  useEffect(() => {
    if (!pendingPostId) return
    setDetailPost({ id: pendingPostId, mode: 'detail' })
    consumePendingPost()
  }, [consumePendingPost, pendingPostId])

  useEffect(() => {
    const query = searchQuery.trim()
    if (query.length < 2) {
      setSearchUsers([])
      setSearchError(null)
      setSearching(false)
      return
    }
    let active = true
    const timer = window.setTimeout(() => {
      setSearching(true)
      setSearchError(null)
      void socialApi.searchUsers(query)
        .then(({ users }) => { if (active) setSearchUsers(users) })
        .catch((error: unknown) => { if (active) setSearchError(error instanceof Error ? error.message : 'Não foi possível pesquisar agora.') })
        .finally(() => { if (active) setSearching(false) })
    }, 250)
    return () => { active = false; window.clearTimeout(timer) }
  }, [searchQuery])

  useEffect(() => {
    if (!token) return
    realtimeClient.connect(token)
    const unsubs = [
      realtimeClient.subscribe('post.created', (event) => upsertRealtimePost(event.payload)),
      realtimeClient.subscribe('post.updated', (event) => upsertRealtimePost(event.payload)),
      realtimeClient.subscribe('post.deleted', (event) => deleteRealtimePost(event.payload.postId)),
      realtimeClient.subscribe('post.like.updated', (event) => setRealtimePostLike(event.payload.postId, event.payload.userId, event.payload.liked, event.payload.likeCount)),
      realtimeClient.subscribe('post.comment.created', (event) => upsertRealtimeComment(event.payload)),
      realtimeClient.subscribe('post.comment.updated', (event) => upsertRealtimeComment(event.payload)),
      realtimeClient.subscribe('post.comment.deleted', (event) => deleteRealtimeComment(event.payload.postId, event.payload.commentId)),
      realtimeClient.subscribe('notification.created', (event) => {
        if (event.payload.type === 'post.comment') addNotification('Novo comentário em uma publicação sua.', 'info')
        if (event.payload.type === 'post.reaction') addNotification('Nova reação em uma publicação sua.', 'info')
      }),
    ]
    return () => unsubs.forEach((unsubscribe) => unsubscribe())
  }, [addNotification, deleteRealtimeComment, deleteRealtimePost, setRealtimePostLike, token, upsertRealtimeComment, upsertRealtimePost])

  if (!user) return null

  const handleMediaSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setMediaError(null)
    try {
      const limit = await mediaApi.getUploadLimit('post-image')
      const err = validateUpload(file, ACCEPTED_IMAGE_MIMES, limit)
      if (err) {
        setMediaError(err)
        return
      }
      if (media?.preview.startsWith('blob:')) URL.revokeObjectURL(media.preview)
      setMedia({ name: file.name, type: file.type, preview: URL.createObjectURL(file), file })
    } catch (error) {
      setMediaError(error instanceof Error ? error.message : 'Não foi possível verificar o limite de envio.')
    }
  }

  const handleRemoveMedia = () => {
    if (media?.preview.startsWith('blob:')) URL.revokeObjectURL(media.preview)
    setMedia(null)
    setMediaError(null)
  }

  const handlePost = async () => {
    const trimmed = content.trim()
    if (!trimmed && !media) return

    setMediaLoading(true)
    setMediaProgress(0)
    setMediaError(null)
    let mediaAssetId: string | undefined
    try {
      if (media) {
        const controller = new AbortController()
        uploadControllerRef.current = controller
        const asset = await mediaApi.uploadFile('post-image', media.file, undefined, undefined, { signal: controller.signal, onProgress: (progress) => setMediaProgress(progress.percent) })
        mediaAssetId = asset.id
      }
      await createPost(trimmed || ' ', mediaAssetId)
      if (media?.preview.startsWith('blob:')) URL.revokeObjectURL(media.preview)
      await postDraft.discard()
      setMedia(null); setMediaError(null); setExpanded(false)
    } catch (error) {
      if (mediaAssetId && error instanceof ApiError && error.status >= 400 && error.status < 500) void mediaApi.deleteUpload(mediaAssetId).catch(() => undefined)
      setMediaError(error instanceof Error ? error.message : 'Não foi possível publicar. Seu rascunho foi preservado.')
      addNotification('Falha ao publicar. Tente novamente.', 'error')
    } finally { uploadControllerRef.current = null; setMediaLoading(false) }
  }

  const handleCancel = () => {
    uploadControllerRef.current?.abort()
    uploadControllerRef.current = null
    void postDraft.discard()
    if (media?.preview.startsWith('blob:')) URL.revokeObjectURL(media.preview)
    setMedia(null)
    setMediaError(null)
    setExpanded(false)
  }

  const handleInsertHashtag = () => {
    const textarea = textareaRef.current
    if (!textarea) return
    const start = textarea.selectionStart ?? content.length
    const end = textarea.selectionEnd ?? content.length
    const before = content.slice(0, start)
    const after = content.slice(end)
    const spaceBefore = before.length > 0 && !before.endsWith(' ') ? ' ' : ''
    const newContent = `${before}${spaceBefore}#${after}`
    if (newContent.length > MAX_CHARS) return
    setContent(newContent)
    requestAnimationFrame(() => {
      textarea.focus()
      const cursor = start + spaceBefore.length + 1
      textarea.setSelectionRange(cursor, cursor)
    })
  }

  const handleInsertEmoji = (emoji: AnceryxEmoji) => {
    const textarea = textareaRef.current
    const start = textarea?.selectionStart ?? content.length
    const end = textarea?.selectionEnd ?? content.length
    const next = insertAtCursor(content, emoji.shortcode, start, end)
    if (next.value.length > MAX_CHARS) return
    setContent(next.value)
    requestAnimationFrame(() => {
      textarea?.focus()
      textarea?.setSelectionRange(next.cursor, next.cursor)
    })
  }

  const followingLivePosts = posts.filter((post) => post.authorId === user?.id || following.includes(post.authorId))
  const sourcePosts = feedTab === 'following'
    ? [...new Map([...followingLivePosts, ...followingPosts].map((post) => [post.id, post])).values()]
    : posts
  const visiblePosts = sourcePosts
    .slice()
    .filter((post) => !searchQuery.trim() || post.content.toLocaleLowerCase('pt-BR').includes(searchQuery.trim().toLocaleLowerCase('pt-BR')))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const canPost = content.trim().length > 0 || Boolean(media)
  const loadMoreFeed = async () => {
    if (!pageCursor || pageLoading) return
    setPageLoading(true); setPageError(null)
    try {
      const { posts: rows, nextCursor } = await postsApi.feed(pageCursor, feedTab)
      if (feedTab === 'following') setFollowingPosts((current) => [...new Map([...current, ...rows.map(realtimePostToLocal)].map((post) => [post.id, post])).values()])
      else rows.forEach((post) => upsertRealtimePost(post))
      setPageCursor(nextCursor)
    } catch (error) { setPageError(error instanceof Error ? error.message : 'Não foi possível carregar mais publicações.') }
    finally { setPageLoading(false) }
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="relative z-20 flex h-14 shrink-0 items-center gap-3 border-b border-border px-3 sm:px-5">
        <Search size={16} className="shrink-0 text-text-secondary" aria-hidden="true" />
        <input
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          onKeyDown={(event) => { if (event.key === 'Escape') setSearchQuery('') }}
          className="mx-auto max-w-[720px] min-w-0 flex-1 rounded-lg border border-border bg-background-tertiary px-3 py-1.5 text-sm text-text-primary outline-none placeholder:text-text-secondary focus:border-accent focus:ring-1 focus:ring-accent"
          placeholder={t('feed.searchPlaceholder')}
          aria-label={t('feed.searchAria')}
          aria-busy={searching}
        />
        {searchQuery.trim().length >= 2 && <div className="absolute left-3 right-3 top-[calc(100%-1px)] mx-auto max-w-[720px] rounded-b-xl border border-border bg-background-secondary p-2 shadow-xl sm:left-5 sm:right-5">
          {searching && <p className="px-2 py-1 text-xs text-text-secondary" role="status">{t('feed.searchingPeople')}</p>}
          {searchError && <p className="px-2 py-1 text-xs text-red-300" role="alert">{searchError}</p>}
          {!searching && !searchError && searchUsers.map((profile) => <button key={profile.id} type="button" onClick={() => { setSelectedUser(profile.username); setSearchQuery('') }} className="flex w-full items-center gap-2 rounded-lg p-2 text-left hover:bg-background-tertiary"><Avatar src={profile.avatarUrl} name={profile.displayName} size="xs" /><span className="min-w-0"><span className="block truncate text-sm text-text-primary">{profile.displayName}</span><span className="block truncate text-xs text-text-secondary">@{profile.username}</span></span></button>)}
          {!searching && !searchError && searchUsers.length === 0 && <p className="px-2 py-1 text-xs text-text-secondary">{t('feed.searchNoPeople')}</p>}
        </div>}
      </div>

      <div className="anceryx-scroll flex-1 overflow-y-auto overflow-x-hidden">
        <div className="mx-auto flex w-full max-w-[760px] flex-col gap-3 px-3 py-3 sm:gap-4 sm:px-5 sm:py-5">
          <div className="flex rounded-xl border border-border bg-background-secondary p-1" role="tablist" aria-label={t('feed.tabs')}>
            {([{ id: 'for-you', label: t('feed.tabForYou') }, { id: 'following', label: t('feed.tabFollowing') }] as const).map((tab) => <button key={tab.id} type="button" role="tab" aria-selected={feedTab === tab.id} onClick={() => setFeedTab(tab.id)} className={`motion-control flex-1 rounded-lg px-3 py-2 text-sm font-medium ${feedTab === tab.id ? 'bg-accent/15 text-accent' : 'text-text-secondary hover:text-text-primary'}`}>{tab.label}</button>)}
          </div>
          {pageError && <div role="alert" className="anceryx-card p-3 text-sm text-accent-red">{pageError}</div>}
          {officialBanners.map((campaign) => <section key={campaign.id} className="relative isolate overflow-hidden rounded-2xl border border-border bg-background-secondary p-5 sm:p-7" style={{ borderColor: campaign.accentColor }} aria-label={t('feed.officialAnnouncement')}>
            {campaign.bannerImageUrl && <img src={mediaApi.resolvePublicUrl(campaign.bannerImageUrl)} alt="" className="absolute inset-0 -z-10 h-full w-full object-cover opacity-20" />}
            <div className="absolute inset-0 -z-10 bg-gradient-to-r from-background-primary/95 via-background-primary/85 to-background-primary/55" />
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-accent"><span className="rounded-full bg-accent/15 px-2 py-1">{t('feed.official')}</span><span aria-hidden="true">•</span><span>{t('feed.announcement')}</span></div>
            <h2 className="mt-3 text-xl font-bold text-text-primary sm:text-2xl">{campaign.bannerTitle ?? campaign.title ?? t('feed.newFeature')}</h2>
            {campaign.bannerDescription && <p className="mt-2 max-w-2xl text-sm leading-relaxed text-text-secondary">{campaign.bannerDescription}</p>}
            {campaign.ctaLabel && campaign.ctaUrl && <button type="button" onClick={() => { if (window.electronAPI?.openExternal) void window.electronAPI.openExternal(campaign.ctaUrl!); else window.open(campaign.ctaUrl!, '_blank', 'noopener,noreferrer') }} className="mt-4 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90">{campaign.ctaLabel}</button>}
          </section>)}
          <div className="anceryx-card shrink-0 p-4">
            {!expanded ? (
              <div className="flex items-center gap-3">
                <Avatar src={user.avatar} name={user.name} size="sm" />
                <div
                  className="flex-1 cursor-text select-none rounded-lg bg-background-tertiary px-3 py-2 text-sm text-text-secondary"
                  onClick={() => setExpanded(true)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => event.key === 'Enter' && setExpanded(true)}
                  aria-label={t('feed.createPost')}
                >
                  {t('feed.composerPlaceholder')}
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <textarea
                  ref={textareaRef}
                  rows={3}
                  className="w-full resize-none rounded-md border border-border bg-background-tertiary p-3 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                  placeholder={t('feed.composerPlaceholder')}
                  value={content}
                  onChange={(event) => setContent(event.target.value.slice(0, MAX_CHARS))}
                  autoFocus
                  aria-label={t('feed.postContent')}
                />

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => mediaInputRef.current?.click()}
                    disabled={mediaLoading}
                    className="rounded p-1 text-text-secondary transition-colors hover:text-text-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent disabled:opacity-40"
                    aria-label={t('feed.attachImage')}
                  >
                    <ImagePlus size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={handleInsertHashtag}
                    className="rounded p-1 text-text-secondary transition-colors hover:text-text-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
                    aria-label={t('feed.insertHashtag')}
                  >
                    <Hash size={16} />
                  </button>
                  <EmojiPicker
                    isOpen={emojiOpen}
                    onToggle={() => setEmojiOpen((value) => !value)}
                    onClose={() => setEmojiOpen(false)}
                    onSelect={handleInsertEmoji}
                  />
                  <span className="ml-auto text-xs text-text-secondary" aria-live="polite">
                    {content.length}/{MAX_CHARS}
                  </span>
                  {mediaLoading && <span className="text-xs text-text-secondary animate-pulse">{t('feed.uploadingMedia')} {mediaProgress}%</span>}
                </div>

                {mediaError && (
                  <div className="flex items-center gap-2 text-xs text-accent-red" role="alert">
                    <AlertCircle size={14} />
                    {mediaError}
                  </div>
                )}

                {media && (
                  <div className="relative mt-1">
                    {media.type === 'video/mp4' ? <video src={media.preview} controls preload="metadata" playsInline className="max-h-56 w-full rounded-lg border border-border bg-background-tertiary object-contain" aria-label={t('feed.videoPreview')} /> : <img src={media.preview} className="max-h-56 w-full rounded-lg border border-border bg-background-tertiary object-contain" alt={t('feed.imagePreview')} />}
                    <button
                      type="button"
                      onClick={handleRemoveMedia}
                      className="absolute right-1.5 top-1.5 rounded-full bg-black/70 p-1 text-white transition-colors hover:bg-black/90"
                      aria-label={t('feed.removeImage')}
                    >
                      <X size={13} />
                    </button>
                  </div>
                )}

                <input
                  ref={mediaInputRef}
                  type="file"
                  accept={ACCEPTED_IMAGE_MIMES.join(',')}
                  className="hidden"
                  onChange={handleMediaSelect}
                  aria-hidden="true"
                />

                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={handleCancel}>{t('common.cancel')}</Button>
                  <Button variant="primary" size="sm" onClick={() => void handlePost()} disabled={!canPost || mediaLoading}>
                    {t('feed.createPost')}
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div key={feedTab} className="motion-view-forward flex flex-col gap-3">
            {(loading || pageLoading && feedTab === 'following') && <div className="anceryx-card p-4 text-sm text-text-secondary">{t('feed.loading')}</div>}
            {feedError && <div className="anceryx-card p-4 text-sm text-accent-red">{feedError} <button className="underline" onClick={() => void hydrateSocial()}>{t('common.retry')}</button></div>}
            {searchQuery.trim() && <p className="text-xs text-text-secondary" aria-live="polite">{t('explore.posts')} “{searchQuery.trim()}”</p>}
            {visiblePosts.length === 0 ? (
              <div className="anceryx-card flex min-h-[220px] flex-col items-center justify-center py-12 text-sm text-text-secondary">
                <p>{searchQuery.trim() ? t('explore.emptyPosts') : feedTab === 'following' ? t('feed.emptyFollowing') : t('feed.empty')}</p>
                {!searchQuery.trim() && feedTab === 'following' ? <button type="button" onClick={() => setActiveSection('explore')} className="mt-2 text-xs text-accent hover:underline">{t('feed.discoverPeople')}</button> : !searchQuery.trim() && <p className="mt-1 text-xs">{t('feed.firstPost')}</p>}
              </div>
            ) : (
              visiblePosts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  currentUserId={user.id}
                  onOpen={(openedPost, mode = 'detail') => setDetailPost({ id: openedPost.id, mode })}
                />
              ))
            )}
            {pageCursor && <Button variant="secondary" loading={pageLoading} onClick={() => void loadMoreFeed()}>{t('feed.loadMore')}</Button>}
          </div>
        </div>
      </div>

      {detailPost && (
        <PostDetailModal
          postId={detailPost.id}
          initialMode={detailPost.mode}
          onClose={() => setDetailPost(null)}
        />
      )}
      {selectedUser && <UserProfileModal username={selectedUser} isOpen onClose={() => setSelectedUser(null)} />}
    </div>
  )
}

export default FeedPage
