import React, { useEffect, useState } from 'react'
import { Bookmark, RefreshCw } from 'lucide-react'
import { PostCard, PostDetailModal } from '@/components/social/index'
import { useAuthStore } from '@/store/authStore'
import { realtimePostToLocal } from '@/store/socialStore'
import { postsApi } from '@/services/postsApi'
import type { Post } from '@/types/social'
import { useTranslation } from '@/i18n'

const SavedPostsPage: React.FC = () => {
  const t = useTranslation()
  const user = useAuthStore((state) => state.user)
  const [posts, setPosts] = useState<Post[]>([])
  const [detailPostId, setDetailPostId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [nextOffset, setNextOffset] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const loadSaved = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await postsApi.saved()
      setPosts(result.posts.map(realtimePostToLocal))
      setNextOffset(result.posts.length)
      setHasMore(result.posts.length === 50)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('savedPosts.loadFailed'))
    } finally { setLoading(false) }
  }

  const loadMore = async () => {
    if (loadingMore || loading || !hasMore) return
    setLoadingMore(true)
    try {
      const result = await postsApi.saved(nextOffset)
      setPosts((current) => [...current, ...result.posts.map(realtimePostToLocal)])
      setNextOffset((current) => current + result.posts.length)
      setHasMore(result.posts.length === 50)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('savedPosts.loadMoreFailed'))
    } finally { setLoadingMore(false) }
  }

  useEffect(() => { void loadSaved() }, [t])
  if (!user) return null

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-6 md:px-6">
        <header className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-accent/15 text-accent"><Bookmark size={20} /></div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold text-text-primary">{t('savedPosts.title')}</h1>
            <p className="text-sm text-text-secondary">{t('savedPosts.privacy')}</p>
          </div>
          <button type="button" onClick={() => void loadSaved()} disabled={loading} aria-label={t('savedPosts.refresh')} className="rounded-xl p-2 text-text-secondary hover:bg-background-tertiary disabled:opacity-50"><RefreshCw size={17} /></button>
        </header>
        {error && <div role="alert" className="anceryx-card flex items-center justify-between gap-3 p-4 text-sm text-accent-red"><span>{error}</span><button type="button" onClick={() => void loadSaved()} className="underline">{t('savedPosts.retry')}</button></div>}
        {loading && <div className="anceryx-card p-4 text-sm text-text-secondary">{t('savedPosts.loading')}</div>}
        {!loading && !error && posts.length === 0 && <div className="anceryx-card flex min-h-52 flex-col items-center justify-center gap-2 p-8 text-center"><Bookmark size={22} className="text-text-secondary" /><p className="font-medium text-text-primary">{t('savedPosts.empty')}</p><p className="text-sm text-text-secondary">{t('savedPosts.emptyHint')}</p></div>}
        {!loading && posts.map((post) => <PostCard key={post.id} post={post} currentUserId={user.id} onOpen={(opened) => setDetailPostId(opened.id)} onSavedChange={(postId, saved) => { if (!saved) setPosts((current) => current.filter((item) => item.id !== postId)) }} />)}
        {!loading && hasMore && <button type="button" disabled={loadingMore} onClick={() => void loadMore()} className="anceryx-card p-3 text-sm text-accent hover:bg-background-tertiary disabled:opacity-60">{loadingMore ? t('savedPosts.loadingMore') : t('savedPosts.loadMore')}</button>}
      </div>
      {detailPostId && <PostDetailModal postId={detailPostId} onClose={() => setDetailPostId(null)} />}
    </div>
  )
}

export default SavedPostsPage
