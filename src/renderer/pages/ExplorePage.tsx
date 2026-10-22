import React, { useEffect, useMemo, useState } from 'react'
import { ArrowUpRight, Compass, Hash as HashIcon, LoaderCircle, MessageCircle, Play, Search, Users, X } from 'lucide-react'
import { Avatar } from '@/components/ui/index'
import { PostDetailModal, UserProfileModal, ForumDetailModal } from '@/components/social/index'
import { mediaApi } from '@/services/mediaApi'
import { formatDateTime } from '@/utils/formatters'
import { useAuthStore } from '@/store/authStore'
import { apiForumToLocal, useSocialStore } from '@/store/socialStore'
import type { Forum } from '@/types/index'
import { socialApi, type PublicProfileDto } from '@/services/socialApi'
import { forumApi, type ApiForum } from '@/services/forumApi'
import { postsApi } from '@/services/postsApi'
import { ApiError } from '@/services/apiClient'
import type { RealtimePostDto } from '@/services/realtimeClient'
import { useTranslation } from '@/i18n'
import { communityApi, type CommunitySearchChannelDto, type CommunitySearchMessageDto } from '@/services/communityApi'

type Tab = 'tudo' | 'posts' | 'pessoas' | 'foruns' | 'canais' | 'mensagens' | 'hashtags'

const ExplorePage: React.FC<{ onOpenWorkspace?: (forum: Forum) => void }> = ({ onOpenWorkspace }) => {
  const t = useTranslation()
  const user = useAuthStore((state) => state.user)
  const { posts, localForums, hydrateSocial } = useSocialStore((state) => ({ posts: state.posts, localForums: state.forums, hydrateSocial: state.hydrateSocial }))
  const [tab, setTab] = useState<Tab>('posts')
  const [query, setQuery] = useState('')
  const [users, setUsers] = useState<PublicProfileDto[]>([])
  const [forums, setForums] = useState<ApiForum[]>([])
  const [peopleNextOffset, setPeopleNextOffset] = useState<number | null>(null)
  const [forumsNextOffset, setForumsNextOffset] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [postsLoading, setPostsLoading] = useState(true)
  const [searchPosts, setSearchPosts] = useState<RealtimePostDto[]>([])
  const [searchPostsLoading, setSearchPostsLoading] = useState(false)
  const [searchPostsError, setSearchPostsError] = useState<string | null>(null)
  const [searchPostsUnsupported, setSearchPostsUnsupported] = useState(false)
  const [searchPostsNextCursor, setSearchPostsNextCursor] = useState<string | null>(null)
  const [searchPostsMoreLoading, setSearchPostsMoreLoading] = useState(false)
  const [requestVersion, setRequestVersion] = useState(0)
  const [selectedPost, setSelectedPost] = useState<string | null>(null)
  const [selectedUser, setSelectedUser] = useState<string | null>(null)
  const [selectedForumId, setSelectedForumId] = useState<string | null>(null)
  const [selectedForumFallback, setSelectedForumFallback] = useState<ReturnType<typeof apiForumToLocal> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [channels, setChannels] = useState<CommunitySearchChannelDto[]>([])
  const [communityMessages, setCommunityMessages] = useState<CommunitySearchMessageDto[]>([])
  const [communityCursor, setCommunityCursor] = useState<string | null>(null)
  const [discovery, setDiscovery] = useState<Awaited<ReturnType<typeof forumApi.discoverForums>> | null>(null)
  const [discoveryMoreLoading, setDiscoveryMoreLoading] = useState<'featured' | 'recent' | 'suggested' | null>(null)
  const [discoveryPagingError, setDiscoveryPagingError] = useState<string | null>(null)
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [globalUnsupported, setGlobalUnsupported] = useState(false)
  const [allLoading, setAllLoading] = useState(false)

  useEffect(() => {
    let active = true
    void hydrateSocial().catch(() => undefined).finally(() => { if (active) setPostsLoading(false) })
    return () => { active = false }
  }, [hydrateSocial])
  useEffect(() => {
    const term = query.trim()
    if ((tab !== 'posts' && tab !== 'hashtags') || term.length < 2) {
      setSearchPosts([])
      setSearchPostsNextCursor(null)
      setSearchPostsError(null)
      setSearchPostsUnsupported(false)
      setSearchPostsLoading(false)
      return
    }
    let active = true
    setSearchPostsLoading(true)
    setSearchPostsError(null)
    setSearchPostsUnsupported(false)
    const timer = window.setTimeout(() => {
      void postsApi.search(term).then((result) => {
        if (!active) return
        setSearchPosts(result.posts)
        setSearchPostsNextCursor(result.nextCursor)
      }).catch((reason: unknown) => {
        if (!active) return
        setSearchPosts([])
        setSearchPostsNextCursor(null)
        const unsupported = reason instanceof ApiError && reason.status === 404
        setSearchPostsUnsupported(unsupported)
        setSearchPostsError(unsupported ? t('explore.searchUnavailable') : reason instanceof Error ? reason.message : t('explore.loadError'))
      }).finally(() => { if (active) setSearchPostsLoading(false) })
    }, 250)
    return () => { active = false; window.clearTimeout(timer) }
  }, [query, requestVersion, tab, t])
  useEffect(() => {
    const term = query.trim()
    if (tab !== 'tudo' || term.length < 2) { setAllLoading(false); return }
    let active = true
    setAllLoading(true); setError(null); setGlobalError(null)
    void Promise.allSettled([postsApi.search(term), socialApi.searchUsers(term), forumApi.listForums(term), communityApi.searchChannels(term), communityApi.searchMessages(term)]).then((results) => {
      if (!active) return
      const [postResult, peopleResult, forumResult, channelResult, messageResult] = results
      if (postResult.status === 'fulfilled') { setSearchPosts(postResult.value.posts); setSearchPostsNextCursor(postResult.value.nextCursor) }
      if (peopleResult.status === 'fulfilled') setUsers(peopleResult.value.users)
      if (forumResult.status === 'fulfilled') setForums(forumResult.value.forums)
      if (channelResult.status === 'fulfilled') setChannels(channelResult.value.channels)
      if (messageResult.status === 'fulfilled') { setCommunityMessages(messageResult.value.messages); setCommunityCursor(messageResult.value.nextCursor) }
      const unsupported = results.some((result) => result.status === 'rejected' && result.reason instanceof ApiError && result.reason.status === 404)
      setGlobalUnsupported(unsupported)
      if (results.every((result) => result.status === 'rejected')) setGlobalError(t('explore.loadError'))
      else if (unsupported) setGlobalError(t('explore.partialSearchUnavailable'))
    }).finally(() => { if (active) setAllLoading(false) })
    return () => { active = false }
  }, [query, requestVersion, tab, t])
  useEffect(() => {
    if (tab !== 'canais' && tab !== 'mensagens') { setChannels([]); setCommunityMessages([]); setCommunityCursor(null); setGlobalError(null); setGlobalUnsupported(false); return }
    const term = query.trim()
    if (term.length < 2) { setChannels([]); setCommunityMessages([]); setCommunityCursor(null); return }
    let active = true
    setLoading(true); setGlobalError(null); setGlobalUnsupported(false)
    const timer = window.setTimeout(() => {
      const req = tab === 'canais' ? communityApi.searchChannels(term).then((result) => { if (active) setChannels(result.channels) }) : communityApi.searchMessages(term).then((result) => { if (active) { setCommunityMessages(result.messages); setCommunityCursor(result.nextCursor) } })
      void req
        .catch((reason: unknown) => { if (!active) return; const unsupported = reason instanceof ApiError && reason.status === 404; setGlobalUnsupported(unsupported); setGlobalError(unsupported ? t('explore.searchUnavailable') : reason instanceof Error ? reason.message : t('explore.loadError')) })
        .finally(() => { if (active) setLoading(false) })
    }, 250)
    return () => { active = false; window.clearTimeout(timer) }
  }, [query, requestVersion, tab, t])
  useEffect(() => {
    if (tab !== 'foruns' || query.trim().length >= 2) return
    let active = true
    setLoading(true); setError(null)
    setDiscoveryPagingError(null)
    void forumApi.discoverForums().then((result) => { if (active) setDiscovery(result) }).catch((reason: unknown) => {
      if (!active) return
      if (reason instanceof ApiError && reason.status === 404) { setError(t('explore.discoveryUnavailable')); return }
      setError(reason instanceof Error ? reason.message : t('explore.loadError'))
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [query, requestVersion, tab, t])
  useEffect(() => {
    const term = query.trim()
    if (tab === 'posts' || tab === 'tudo') {
      setLoading(false)
      setError(null)
      return
    }
    if (tab === 'pessoas' && term.length < 2) {
      setUsers([])
      setPeopleNextOffset(null)
      setLoading(false)
      setError(null)
      return
    }

    let active = true
    setLoading(true)
    setError(null)
    const timer = window.setTimeout(() => {
      const request = tab === 'pessoas'
        ? socialApi.searchUsers(term).then(({ users: results, nextOffset }) => { if (active) { setUsers(results); setPeopleNextOffset(nextOffset ?? null) } })
        : forumApi.listForums(term).then(({ forums: results, nextOffset }) => { if (active) { setForums(results); setForumsNextOffset(nextOffset ?? null) } })
      void request.catch((reason) => {
        if (active) setError(reason instanceof Error ? reason.message : t('explore.loadError'))
      }).finally(() => {
        if (active) setLoading(false)
      })
    }, 250)
    return () => { active = false; window.clearTimeout(timer) }
  }, [query, requestVersion, tab, t])

  const loadMoreCategory = async () => {
    if (loading) return
    setLoading(true)
    setError(null)
    try {
      if (tab === 'pessoas' && peopleNextOffset !== null) {
        const result = await socialApi.searchUsers(query.trim(), 20, peopleNextOffset)
        setUsers((current) => [...new Map([...current, ...result.users].map((profile) => [profile.id, profile])).values()])
        setPeopleNextOffset(result.nextOffset ?? null)
      } else if (tab === 'foruns' && forumsNextOffset !== null) {
        const result = await forumApi.listForums(query.trim(), 20, forumsNextOffset)
        setForums((current) => [...new Map([...current, ...result.forums].map((forum) => [forum.id, forum])).values()])
        setForumsNextOffset(result.nextOffset ?? null)
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t('explore.loadError'))
    } finally { setLoading(false) }
  }

  const loadMoreDiscovery = async (section: 'featured' | 'recent' | 'suggested') => {
    const cursor = discovery?.pages?.[section]?.nextCursor
    if (!cursor || discoveryMoreLoading) return
    setDiscoveryMoreLoading(section)
    setDiscoveryPagingError(null)
    try {
      const result = await forumApi.discoverForums({ [section]: cursor })
      setDiscovery((current) => {
        if (!current) return result
        const key = section === 'featured' ? 'featuredForums' : section === 'recent' ? 'recentForums' : 'suggestedForums'
        const combined = [...current[key], ...result[key]]
        const deduplicated = [...new Map(combined.map((forum) => [forum.id, forum])).values()]
        return { ...current, [key]: deduplicated, pages: { ...current.pages, [section]: result.pages?.[section] } }
      })
    } catch (reason) {
      setDiscoveryPagingError(reason instanceof Error ? reason.message : t('explore.loadError'))
    } finally { setDiscoveryMoreLoading(null) }
  }

  const filteredPosts = useMemo(() => {
    const term = query.trim().toLocaleLowerCase()
    if (term.length >= 2) return searchPosts.map((post) => ({ ...post, createdAt: new Date(post.createdAt), authorId: post.author.id, likes: [], comments: [], shares: 0, isPublic: true }))
    const result = term ? posts.filter((post) => post.content.toLocaleLowerCase().includes(term)) : posts
    return [...result].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  }, [posts, query, searchPosts])
  const hashtagPosts = useMemo(() => filteredPosts.filter((post) => (post.content.match(/#[\p{L}\p{N}_]+/gu) ?? []).some((tag) => tag.toLocaleLowerCase().includes(query.trim().replace(/^#/, '').toLocaleLowerCase()))), [filteredPosts, query])

  const loadMoreSearchPosts = async () => {
    const cursor = searchPostsNextCursor
    if (cursor === null || searchPostsMoreLoading) return
    setSearchPostsMoreLoading(true)
    try {
      const result = await postsApi.search(query.trim(), 20, cursor)
      setSearchPosts((current) => [...current, ...result.posts])
      setSearchPostsNextCursor(result.nextCursor)
      setSearchPostsError(null)
    } catch (reason) {
      setSearchPostsError(reason instanceof Error ? reason.message : t('explore.loadError'))
    } finally { setSearchPostsMoreLoading(false) }
  }
  const loadMoreCommunityMessages = async () => {
    if (!communityCursor || loading) return
    setLoading(true)
    try { const result = await communityApi.searchMessages(query.trim(), 20, communityCursor); setCommunityMessages((current) => [...current, ...result.messages]); setCommunityCursor(result.nextCursor) }
    catch (reason) { setGlobalError(reason instanceof Error ? reason.message : t('explore.loadError')) }
    finally { setLoading(false) }
  }
  const openCommunityMessage = async (item: CommunitySearchMessageDto) => {
    try {
      const { forum } = await forumApi.getForum(item.communityId)
      localStorage.setItem(`anceryx:forum-channel:${item.communityId}`, item.channelId)
      localStorage.setItem(`anceryx:forum-message:${item.communityId}`, JSON.stringify({ channelId: item.channelId, messageId: item.id }))
      const localForum = apiForumToLocal(forum)
      setSelectedForumFallback(localForum); setSelectedForumId(item.communityId)
      if (localForum.isJoined && onOpenWorkspace) { setSelectedForumId(null); setSelectedForumFallback(null); onOpenWorkspace(localForum) }
    } catch (reason) { setGlobalError(reason instanceof Error ? reason.message : t('explore.loadError')) }
  }

  if (!user) return null
  const selectedForum = localForums.find((forum) => forum.id === selectedForumId) ?? selectedForumFallback
  const tabs: Array<{ id: Tab; label: string; icon: React.ReactNode; count: number }> = [
    { id: 'tudo', label: t('explore.all'), icon: <Search size={16} />, count: searchPosts.length + users.length + forums.length + channels.length + communityMessages.length },
    { id: 'posts', label: t('explore.posts'), icon: <MessageCircle size={16} />, count: filteredPosts.length },
    { id: 'pessoas', label: t('explore.people'), icon: <Users size={16} />, count: users.length },
    { id: 'foruns', label: t('explore.forums'), icon: <Compass size={16} />, count: forums.length },
    { id: 'hashtags', label: t('explore.hashtags'), icon: <HashIcon size={16} />, count: query.trim() ? (filteredPosts.flatMap((post) => post.content.match(/#[\p{L}\p{N}_]+/gu) ?? []).filter((tag) => tag.toLocaleLowerCase().includes(query.trim().replace(/^#/, '').toLocaleLowerCase())).length) : 0 },
    { id: 'canais', label: t('explore.channels'), icon: <HashIcon size={16} />, count: channels.length },
    { id: 'mensagens', label: t('explore.communityMessages'), icon: <MessageCircle size={16} />, count: communityMessages.length },
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
        <p aria-live="polite" className="text-xs text-text-secondary">{tab === 'posts' ? t('explore.loadedPostsHint') : tab === 'pessoas' && query.trim().length < 2 ? t('explore.peopleHint') : t('explore.resultsHint', { count: tab === 'pessoas' ? users.length : tab === 'foruns' ? forums.length : tab === 'canais' ? channels.length : tab === 'mensagens' ? communityMessages.length : 0 })}</p>
        {(error || ((tab === 'posts' || tab === 'hashtags') && searchPostsError) || ((tab === 'canais' || tab === 'mensagens' || tab === 'tudo') && globalError)) && <div role="alert" className="flex items-center justify-between gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300"><span>{tab === 'posts' || tab === 'hashtags' ? searchPostsError : tab === 'canais' || tab === 'mensagens' || tab === 'tudo' ? globalError : error}</span>{!(tab === 'posts' && searchPostsUnsupported) && !(globalUnsupported) && <button type="button" onClick={() => setRequestVersion((value) => value + 1)} className="shrink-0 underline">{t('common.retry')}</button>}</div>}
        {(tab === 'tudo' ? allLoading : tab === 'posts' || tab === 'hashtags' ? (query.trim().length >= 2 ? searchPostsLoading : postsLoading) : loading) && <div role="status" aria-label={t('common.loading')} className={tab === 'posts' || tab === 'hashtags' ? 'grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4' : 'flex items-center justify-center gap-2 py-12 text-sm text-text-secondary'}>{tab === 'posts' || tab === 'hashtags' ? Array.from({ length: 8 }, (_, index) => <div key={index} className="aspect-square animate-pulse rounded-xl bg-background-tertiary" />) : <><LoaderCircle size={17} className="animate-spin" />{t('common.loading')}</>}</div>}
        {tab === 'tudo' && query.trim().length >= 2 && !allLoading && !globalError && <div className="space-y-5">{searchPosts.length > 0 && <section><h2 className="mb-2 text-sm font-semibold text-text-primary">{t('explore.posts')}</h2><div className="space-y-2">{searchPosts.slice(0, 3).map((post) => <button key={post.id} type="button" onClick={() => setSelectedPost(post.id)} className="anceryx-card w-full p-3 text-left text-sm text-text-primary hover:border-accent">{post.author.displayName} · {post.content}</button>)}</div></section>}{users.length > 0 && <section><h2 className="mb-2 text-sm font-semibold text-text-primary">{t('explore.people')}</h2><div className="grid gap-2 sm:grid-cols-2">{users.slice(0, 4).map((profile) => <button key={profile.id} type="button" onClick={() => setSelectedUser(profile.username)} className="anceryx-card flex items-center gap-2 p-3 text-left"><Avatar src={profile.avatarUrl} name={profile.displayName} size="xs"/><span className="text-sm">{profile.displayName} <small className="text-text-secondary">@{profile.username}</small></span></button>)}</div></section>}{forums.length > 0 && <section><h2 className="mb-2 text-sm font-semibold text-text-primary">{t('explore.forums')}</h2><div className="grid gap-2 sm:grid-cols-2">{forums.slice(0, 4).map((forum) => <button key={forum.id} type="button" onClick={() => { const localForum = apiForumToLocal(forum); if (localForum.isJoined && onOpenWorkspace) onOpenWorkspace(localForum); else { setSelectedForumFallback(localForum); setSelectedForumId(forum.id) } }} className="anceryx-card p-3 text-left text-sm">{forum.name}</button>)}</div></section>}{channels.length > 0 && <section><h2 className="mb-2 text-sm font-semibold text-text-primary">{t('explore.channels')}</h2>{channels.slice(0, 4).map((item) => <p key={`${item.communityId}:${item.channelId}`} className="py-1 text-sm text-text-secondary">#{item.channelName} · {item.communityName}</p>)}</section>}{communityMessages.length > 0 && <section><h2 className="mb-2 text-sm font-semibold text-text-primary">{t('explore.communityMessages')}</h2>{communityMessages.slice(0, 4).map((item) => <button key={item.id} onClick={() => void openCommunityMessage(item)} className="block w-full truncate py-1 text-left text-sm text-text-secondary">{item.communityName} · #{item.channelName}: {item.excerpt}</button>)}</section>}{searchPosts.length + users.length + forums.length + channels.length + communityMessages.length === 0 && <Empty text={t('explore.emptyGlobal')} />}</div>}
        {!(tab === 'posts' || tab === 'hashtags' ? (query.trim().length >= 2 ? searchPostsLoading : postsLoading) : loading) && !error && !((tab === 'posts' || tab === 'hashtags') && searchPostsError) && (tab === 'posts' || tab === 'hashtags') && (tab === 'posts' ? filteredPosts : hashtagPosts).length ? <><div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">{(tab === 'posts' ? filteredPosts : hashtagPosts).map((post) => <button key={post.id} type="button" onClick={() => setSelectedPost(post.id)} aria-label={`${post.author.displayName}: ${post.content.slice(0, 100) || t('explore.openPost')}`} className="group relative aspect-square min-w-0 overflow-hidden rounded-xl border border-border bg-background-secondary text-left transition hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
          {post.mediaUrl && post.mediaType !== 'video' ? <img src={mediaApi.resolvePublicUrl(post.mediaUrl) ?? undefined} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]" /> : post.mediaType === 'video' ? <span className="absolute inset-0 grid place-items-center bg-gradient-to-br from-accent/25 via-background-tertiary to-background-primary text-accent"><Play size={36} fill="currentColor" aria-hidden="true" /></span> : <span className="absolute inset-0 bg-gradient-to-br from-accent/15 via-background-secondary to-background-tertiary" />}
          <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/65 to-transparent p-3 pt-14 text-white"><span className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold"><Avatar src={post.author.avatarUrl} name={post.author.displayName} size="xs" />{post.author.displayName}</span><span className="line-clamp-3 text-xs">{post.content || (post.mediaType === 'video' ? 'Vídeo' : 'Publicação com imagem')}</span><time className="mt-1 block text-[10px] text-white/65" dateTime={post.createdAt.toISOString()}>{formatDateTime(post.createdAt)}</time></span>
        </button>)}</div>{query.trim().length >= 2 && searchPostsNextCursor !== null && (tab === 'posts' || tab === 'hashtags') && <button type="button" onClick={() => void loadMoreSearchPosts()} disabled={searchPostsMoreLoading} className="mx-auto block rounded-xl border border-border px-4 py-2 text-sm text-text-primary disabled:opacity-50">{searchPostsMoreLoading ? t('common.loading') : t('explore.loadMore')}</button>}</> : (tab === 'posts' || tab === 'hashtags') && !searchPostsError && <Empty text={tab === 'hashtags' ? t('explore.emptyHashtags') : query.trim().length >= 2 ? t('explore.emptyPostsSearch') : t('explore.emptyPosts')} />}
        {!loading && !error && tab === 'pessoas' && query.trim().length >= 2 && (users.length ? <div className="grid gap-3 sm:grid-cols-2">{users.map((profile) => <button key={profile.id} type="button" onClick={() => setSelectedUser(profile.username)} className="anceryx-card flex min-w-0 items-center gap-3 p-4 text-left transition hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"><Avatar src={profile.avatarUrl} name={profile.displayName} size="md" /><span className="min-w-0 flex-1"><strong className="block truncate text-sm text-text-primary">{profile.displayName}</strong><small className="text-text-secondary">@{profile.username}</small></span><ArrowUpRight size={16} className="shrink-0 text-text-secondary" /></button>)}</div> : <Empty text={t('explore.emptyPeople')} />)}
        {!loading && !error && tab === 'pessoas' && peopleNextOffset !== null && <button type="button" onClick={() => void loadMoreCategory()} disabled={loading} className="mx-auto block rounded-xl border border-border px-4 py-2 text-sm text-text-primary">{t('explore.loadMore')}</button>}
        {!loading && !globalError && tab === 'canais' && query.trim().length >= 2 && (channels.length ? <div className="space-y-2">{channels.map((item) => <button key={`${item.communityId}:${item.channelId}`} type="button" onClick={async () => { try { const { forum } = await forumApi.getForum(item.communityId); const localForum = apiForumToLocal(forum); localStorage.setItem(`anceryx:forum-channel:${item.communityId}`, item.channelId); if (localForum.isJoined && onOpenWorkspace) onOpenWorkspace(localForum); else { setSelectedForumFallback(localForum); setSelectedForumId(item.communityId) } } catch (reason) { setGlobalError(reason instanceof Error ? reason.message : t('explore.loadError')) } }} className="anceryx-card flex w-full items-center gap-3 p-4 text-left hover:border-accent"><HashIcon size={16} className="text-accent" /><span className="min-w-0 flex-1"><strong className="block truncate text-sm text-text-primary">#{item.channelName}</strong><span className="text-xs text-text-secondary">{item.communityName}{item.categoryName ? ` · ${item.categoryName}` : ''}</span></span><ArrowUpRight size={16} /></button>)}</div> : query.trim().length >= 2 && <Empty text={t('explore.emptyChannels')} />)}
        {!loading && !globalError && tab === 'mensagens' && query.trim().length >= 2 && (communityMessages.length ? <div className="space-y-2">{communityMessages.map((item) => <button key={item.id} type="button" onClick={() => void openCommunityMessage(item)} className="anceryx-card w-full p-4 text-left hover:border-accent"><span className="mb-2 flex items-center gap-2 text-xs text-text-secondary"><Avatar src={item.author.avatarUrl} name={item.author.displayName} size="xs" /><strong className="text-text-primary">{item.author.displayName}</strong><span>{item.communityName} · #{item.channelName}</span><time className="ml-auto" dateTime={item.createdAt}>{formatDateTime(new Date(item.createdAt))}</time></span><span className="block whitespace-pre-wrap break-words text-sm text-text-primary">{item.excerpt}</span></button>)}</div> : <Empty text={t('explore.emptyCommunityMessages')} />)}
        {!loading && !globalError && tab === 'mensagens' && communityCursor && <button type="button" onClick={() => void loadMoreCommunityMessages()} disabled={loading} className="mx-auto block rounded-xl border border-border px-4 py-2 text-sm text-text-primary">{t('explore.loadMore')}</button>}
        {!loading && !error && tab === 'foruns' && query.trim().length < 2 && discovery && <div className="space-y-5">{[[t('explore.featuredForums'), discovery.featuredForums], [t('explore.recentForums'), discovery.recentForums], [t('explore.suggestedForums'), discovery.suggestedForums]].map(([label, items]) => <section key={label as string}><h2 className="mb-2 text-sm font-semibold text-text-primary">{label as string}</h2>{(items as ApiForum[]).length ? <div className="grid gap-3 sm:grid-cols-2">{(items as ApiForum[]).map((forum) => <button type="button" key={forum.id} onClick={() => { const localForum = apiForumToLocal(forum); if (localForum.isJoined && onOpenWorkspace) onOpenWorkspace(localForum); else { setSelectedForumFallback(localForum); setSelectedForumId(forum.id) } }} className="anceryx-card flex min-w-0 items-center gap-3 p-4 text-left hover:border-accent"><Avatar src={forum.iconUrl} name={forum.name} size="sm"/><span className="min-w-0 flex-1"><strong className="block truncate text-sm text-text-primary">{forum.name}</strong><small className="text-text-secondary">{t('explore.memberCount', { count: forum.memberCount })} · {t('explore.topicCount', { count: forum.topicCount })}</small></span></button>)}</div> : <p className="text-xs text-text-secondary">{t('explore.discoveryEmpty')}</p>}</section>)}{discovery.categories.length > 0 && <section><h2 className="mb-2 text-sm font-semibold text-text-primary">{t('explore.categories')}</h2><div className="flex flex-wrap gap-2">{discovery.categories.map((category) => <button key={category.name} type="button" onClick={() => setQuery(category.name)} className="rounded-full border border-border px-3 py-1.5 text-xs text-text-secondary hover:border-accent hover:text-text-primary">{category.name} · {category.forumCount}</button>)}</div></section>}</div>}
        {!loading && !error && tab === 'foruns' && query.trim().length < 2 && discovery && <div className="flex flex-wrap justify-center gap-2">{(['featured', 'recent', 'suggested'] as const).filter((section) => discovery.pages?.[section]?.nextCursor).map((section) => <button key={section} type="button" aria-label={`${t(section === 'featured' ? 'explore.featuredForums' : section === 'recent' ? 'explore.recentForums' : 'explore.suggestedForums')}: ${t('explore.loadMore')}`} onClick={() => void loadMoreDiscovery(section)} disabled={discoveryMoreLoading !== null} className="rounded-xl border border-border px-4 py-2 text-sm text-text-primary disabled:opacity-50">{discoveryMoreLoading === section ? t('common.loading') : `${t(section === 'featured' ? 'explore.featuredForums' : section === 'recent' ? 'explore.recentForums' : 'explore.suggestedForums')} · ${t('explore.loadMore')}`}</button>)}</div>}
        {!loading && !error && tab === 'foruns' && discoveryPagingError && <p role="alert" className="text-center text-sm text-danger">{discoveryPagingError}</p>}
        {!loading && !error && tab === 'foruns' && (forums.length ? <div className="grid gap-3 sm:grid-cols-2">{forums.map((forum) => <button type="button" key={forum.id} onClick={() => { const localForum = apiForumToLocal(forum); if (localForum.isJoined && onOpenWorkspace) onOpenWorkspace(localForum); else { setSelectedForumFallback(localForum); setSelectedForumId(forum.id) } }} className="anceryx-card group min-w-0 overflow-hidden text-left transition hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
          <div className="relative h-20 overflow-hidden bg-background-tertiary">{forum.bannerUrl && <img src={forum.bannerUrl} alt="" className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]" />}</div>
          <div className="flex items-start gap-3 p-4"><Avatar src={forum.iconUrl} name={forum.name} size="sm" className="-mt-8 shrink-0 border-2 border-background-secondary" /><span className="min-w-0 flex-1"><strong className="block truncate text-sm text-text-primary">{forum.name}</strong><small className="text-text-secondary">{t('explore.memberCount', { count: forum.memberCount })} · {t('explore.topicCount', { count: forum.topicCount })}</small></span><ArrowUpRight size={16} className="mt-1 shrink-0 text-text-secondary" /></div>
          {forum.description && <p className="px-4 pb-3 text-xs text-text-secondary line-clamp-2">{forum.description}</p>}
          {forum.tags.length > 0 && <div className="flex flex-wrap gap-1.5 px-4 pb-4">{forum.tags.slice(0, 4).map((tag) => <span key={tag.id} className="rounded-full bg-background-tertiary px-2 py-1 text-[10px] text-text-secondary">#{tag.name}</span>)}</div>}
        </button>)}</div> : <Empty text={t('explore.emptyForums')} />)}
        {!loading && !error && tab === 'foruns' && forumsNextOffset !== null && <button type="button" onClick={() => void loadMoreCategory()} disabled={loading} className="mx-auto block rounded-xl border border-border px-4 py-2 text-sm text-text-primary">{t('explore.loadMore')}</button>}
      </div>
    </div>

    {selectedPost && <PostDetailModal postId={selectedPost} initialMode="detail" onClose={() => setSelectedPost(null)} />}
    {selectedUser && <UserProfileModal username={selectedUser} isOpen onClose={() => setSelectedUser(null)} />}
    {selectedForum && <ForumDetailModal forum={selectedForum} onOpenWorkspace={onOpenWorkspace} onClose={() => { setSelectedForumId(null); setSelectedForumFallback(null) }} />}
  </div>
}

const Empty: React.FC<{ text: string }> = ({ text }) => <div className="anceryx-card px-6 py-12 text-center text-sm text-text-secondary">{text}</div>
export default ExplorePage
