import React, { useEffect, useMemo, useState } from 'react'
import { ArrowUpRight, Compass, LoaderCircle, MessageCircle, Play, Search, Users, X } from 'lucide-react'
import { Avatar } from '@/components/ui/index'
import { PostDetailModal, UserProfileModal, ForumDetailModal } from '@/components/social/index'
import { mediaApi } from '@/services/mediaApi'
import { formatDateTime } from '@/utils/formatters'
import { useAuthStore } from '@/store/authStore'
import { apiForumToLocal, useSocialStore } from '@/store/socialStore'
import type { Forum } from '@/types/index'
import { socialApi, type PublicProfileDto } from '@/services/socialApi'
import { forumApi, type ApiForum } from '@/services/forumApi'
import { useTranslation } from '@/i18n'

type Tab = 'posts' | 'pessoas' | 'foruns'

const ExplorePage: React.FC<{ onOpenWorkspace?: (forum: Forum) => void }> = ({ onOpenWorkspace }) => {
  const t = useTranslation()
  const user = useAuthStore((state) => state.user)
  const { posts, localForums, hydrateSocial } = useSocialStore((state) => ({ posts: state.posts, localForums: state.forums, hydrateSocial: state.hydrateSocial }))
  const [tab, setTab] = useState<Tab>('posts')
  const [query, setQuery] = useState('')
  const [users, setUsers] = useState<PublicProfileDto[]>([])
  const [forums, setForums] = useState<ApiForum[]>([])
  const [loading, setLoading] = useState(false)
  const [postsLoading, setPostsLoading] = useState(true)
  const [requestVersion, setRequestVersion] = useState(0)
  const [selectedPost, setSelectedPost] = useState<string | null>(null)
  const [selectedUser, setSelectedUser] = useState<string | null>(null)
  const [selectedForumId, setSelectedForumId] = useState<string | null>(null)
  const [selectedForumFallback, setSelectedForumFallback] = useState<ReturnType<typeof apiForumToLocal> | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    void hydrateSocial().catch(() => undefined).finally(() => { if (active) setPostsLoading(false) })
    return () => { active = false }
  }, [hydrateSocial])
  useEffect(() => {
    const term = query.trim()
    if (tab === 'posts') {
      setLoading(false)
      setError(null)
      return
    }
    if (tab === 'pessoas' && term.length < 2) {
      setUsers([])
      setLoading(false)
      setError(null)
      return
    }

    let active = true
    setLoading(true)
    setError(null)
    const timer = window.setTimeout(() => {
      const request = tab === 'pessoas'
        ? socialApi.searchUsers(term).then(({ users: results }) => { if (active) setUsers(results) })
        : forumApi.listForums(term).then(({ forums: results }) => { if (active) setForums(results) })
      void request.catch((reason) => {
        if (active) setError(reason instanceof Error ? reason.message : t('explore.loadError'))
      }).finally(() => {
        if (active) setLoading(false)
      })
    }, 250)
    return () => { active = false; window.clearTimeout(timer) }
  }, [query, requestVersion, tab, t])

  const filteredPosts = useMemo(() => {
    const term = query.trim().toLocaleLowerCase()
    const result = term ? posts.filter((post) => post.content.toLocaleLowerCase().includes(term)) : posts
    return [...result].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  }, [posts, query])

  if (!user) return null
  const selectedForum = localForums.find((forum) => forum.id === selectedForumId) ?? selectedForumFallback
  const tabs: Array<{ id: Tab; label: string; icon: React.ReactNode; count: number }> = [
    { id: 'posts', label: t('explore.posts'), icon: <MessageCircle size={16} />, count: filteredPosts.length },
    { id: 'pessoas', label: t('explore.people'), icon: <Users size={16} />, count: users.length },
    { id: 'foruns', label: t('explore.forums'), icon: <Compass size={16} />, count: forums.length },
  ]

  return <div className="flex h-full min-h-0 flex-col overflow-hidden">
    <div className="shrink-0 border-b border-border bg-background-secondary/35 px-4 py-5 sm:px-6">
      <div className="mx-auto max-w-[920px]">
        <div className="mb-4 flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-accent/15 text-accent-secondary"><Compass size={20} /></span>
          <div className="min-w-0"><h1 className="text-lg font-bold text-text-primary">{t('explore.title')}</h1><p className="text-xs text-text-secondary">{t('explore.subtitle')}</p></div>
        </div>
        <label className="flex items-center gap-3 rounded-2xl border border-border bg-background-tertiary px-4 py-3 shadow-sm transition focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20">
          <Search size={18} className="shrink-0 text-text-secondary" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} className="min-w-0 flex-1 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-secondary" placeholder={t('explore.searchPlaceholder')} aria-label={t('explore.searchAria')} />
          {query && <button type="button" onClick={() => setQuery('')} aria-label={t('explore.clearSearch')} className="rounded-full p-1 text-text-secondary hover:bg-background-primary hover:text-text-primary"><X size={15} /></button>}
        </label>
      </div>
    </div>

    <div role="tablist" aria-label={t('explore.categories')} className="flex shrink-0 gap-2 overflow-x-auto border-b border-border px-4 py-3 sm:px-6">
      {tabs.map((item, index) => <button key={item.id} id={`explore-tab-${item.id}`} type="button" role="tab" aria-controls="explore-panel" aria-selected={tab === item.id} tabIndex={tab === item.id ? 0 : -1} onClick={() => setTab(item.id)} onKeyDown={(event) => {
        const nextIndex = event.key === 'ArrowRight' ? (index + 1) % tabs.length : event.key === 'ArrowLeft' ? (index - 1 + tabs.length) % tabs.length : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : -1
        if (nextIndex < 0) return
        event.preventDefault()
        const nextTab = tabs[nextIndex].id
        setTab(nextTab)
        document.getElementById(`explore-tab-${nextTab}`)?.focus()
      }} className={`flex min-h-10 shrink-0 items-center gap-2 rounded-xl px-4 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${tab === item.id ? 'bg-accent text-white shadow-sm' : 'text-text-secondary hover:bg-background-secondary hover:text-text-primary'}`}>
        {item.icon}<span>{item.label}</span><span className={`rounded-full px-1.5 py-0.5 text-[10px] ${tab === item.id ? 'bg-white/20 text-white' : 'bg-background-secondary text-text-secondary'}`}>{item.count}</span>
      </button>)}
    </div>

    <div className="anceryx-scroll flex-1 overflow-y-auto px-4 py-5 sm:px-6">
      <div id="explore-panel" role="tabpanel" aria-labelledby={`explore-tab-${tab}`} tabIndex={0} className="mx-auto max-w-[920px] space-y-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40">
        <p aria-live="polite" className="text-xs text-text-secondary">{tab === 'posts' ? t('explore.loadedPostsHint') : tab === 'pessoas' && query.trim().length < 2 ? t('explore.peopleHint') : t('explore.resultsHint', { count: tab === 'pessoas' ? users.length : forums.length })}</p>
        {error && <div role="alert" className="flex items-center justify-between gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300"><span>{error}</span><button type="button" onClick={() => setRequestVersion((value) => value + 1)} className="shrink-0 underline">{t('common.retry')}</button></div>}
        {(tab === 'posts' ? postsLoading : loading) && <div role="status" aria-label={t('common.loading')} className={tab === 'posts' ? 'grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4' : 'flex items-center justify-center gap-2 py-12 text-sm text-text-secondary'}>{tab === 'posts' ? Array.from({ length: 8 }, (_, index) => <div key={index} className="aspect-square animate-pulse rounded-xl bg-background-tertiary" />) : <><LoaderCircle size={17} className="animate-spin" />{t('common.loading')}</>}</div>}
        {!postsLoading && !loading && !error && tab === 'posts' && (filteredPosts.length ? <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">{filteredPosts.map((post) => <button key={post.id} type="button" onClick={() => setSelectedPost(post.id)} aria-label={`${post.author.displayName}: ${post.content.slice(0, 100) || t('explore.openPost')}`} className="group relative aspect-square min-w-0 overflow-hidden rounded-xl border border-border bg-background-secondary text-left transition hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
          {post.mediaUrl && post.mediaType !== 'video' ? <img src={mediaApi.resolvePublicUrl(post.mediaUrl) ?? undefined} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]" /> : post.mediaType === 'video' ? <span className="absolute inset-0 grid place-items-center bg-gradient-to-br from-accent/25 via-background-tertiary to-background-primary text-accent"><Play size={36} fill="currentColor" aria-hidden="true" /></span> : <span className="absolute inset-0 bg-gradient-to-br from-accent/15 via-background-secondary to-background-tertiary" />}
          <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/65 to-transparent p-3 pt-14 text-white"><span className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold"><Avatar src={post.author.avatarUrl} name={post.author.displayName} size="xs" />{post.author.displayName}</span><span className="line-clamp-3 text-xs">{post.content || (post.mediaType === 'video' ? 'Vídeo' : 'Publicação com imagem')}</span><time className="mt-1 block text-[10px] text-white/65" dateTime={post.createdAt.toISOString()}>{formatDateTime(post.createdAt)}</time></span>
        </button>)}</div> : <Empty text={query.trim() ? t('explore.emptyPostsSearch') : t('explore.emptyPosts')} />)}
        {!loading && !error && tab === 'pessoas' && query.trim().length >= 2 && (users.length ? <div className="grid gap-3 sm:grid-cols-2">{users.map((profile) => <button key={profile.id} type="button" onClick={() => setSelectedUser(profile.username)} className="anceryx-card flex min-w-0 items-center gap-3 p-4 text-left transition hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"><Avatar src={profile.avatarUrl} name={profile.displayName} size="md" /><span className="min-w-0 flex-1"><strong className="block truncate text-sm text-text-primary">{profile.displayName}</strong><small className="text-text-secondary">@{profile.username}</small></span><ArrowUpRight size={16} className="shrink-0 text-text-secondary" /></button>)}</div> : <Empty text={t('explore.emptyPeople')} />)}
        {!loading && !error && tab === 'foruns' && (forums.length ? <div className="grid gap-3 sm:grid-cols-2">{forums.map((forum) => <button type="button" key={forum.id} onClick={() => { const localForum = apiForumToLocal(forum); if (localForum.isJoined && onOpenWorkspace) onOpenWorkspace(localForum); else { setSelectedForumFallback(localForum); setSelectedForumId(forum.id) } }} className="anceryx-card group min-w-0 overflow-hidden text-left transition hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
          <div className="relative h-20 overflow-hidden bg-background-tertiary">{forum.bannerUrl && <img src={forum.bannerUrl} alt="" className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]" />}</div>
          <div className="flex items-start gap-3 p-4"><Avatar src={forum.iconUrl} name={forum.name} size="sm" className="-mt-8 shrink-0 border-2 border-background-secondary" /><span className="min-w-0 flex-1"><strong className="block truncate text-sm text-text-primary">{forum.name}</strong><small className="text-text-secondary">{t('explore.memberCount', { count: forum.memberCount })} · {t('explore.topicCount', { count: forum.topicCount })}</small></span><ArrowUpRight size={16} className="mt-1 shrink-0 text-text-secondary" /></div>
          {forum.description && <p className="px-4 pb-3 text-xs text-text-secondary line-clamp-2">{forum.description}</p>}
          {forum.tags.length > 0 && <div className="flex flex-wrap gap-1.5 px-4 pb-4">{forum.tags.slice(0, 4).map((tag) => <span key={tag.id} className="rounded-full bg-background-tertiary px-2 py-1 text-[10px] text-text-secondary">#{tag.name}</span>)}</div>}
        </button>)}</div> : <Empty text={t('explore.emptyForums')} />)}
      </div>
    </div>

    {selectedPost && <PostDetailModal postId={selectedPost} initialMode="detail" onClose={() => setSelectedPost(null)} />}
    {selectedUser && <UserProfileModal username={selectedUser} isOpen onClose={() => setSelectedUser(null)} />}
    {selectedForum && <ForumDetailModal forum={selectedForum} onOpenWorkspace={onOpenWorkspace} onClose={() => { setSelectedForumId(null); setSelectedForumFallback(null) }} />}
  </div>
}

const Empty: React.FC<{ text: string }> = ({ text }) => <div className="anceryx-card px-6 py-12 text-center text-sm text-text-secondary">{text}</div>
export default ExplorePage
