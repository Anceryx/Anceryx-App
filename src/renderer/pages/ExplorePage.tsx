import React, { useEffect, useState } from 'react'
import { Search, Users, MessageCircle } from 'lucide-react'
import { Avatar } from '@/components/ui/index'
import { PostCard, PostDetailModal, UserProfileModal, ForumDetailModal } from '@/components/social/index'
import { useAuthStore } from '@/store/authStore'
import { apiForumToLocal, useSocialStore } from '@/store/socialStore'
import { socialApi, type PublicProfileDto } from '@/services/socialApi'
import { forumApi, type ApiForum } from '@/services/forumApi'

type Tab = 'posts' | 'pessoas' | 'foruns'

const ExplorePage: React.FC = () => {
  const user = useAuthStore((state) => state.user)
  const { posts, localForums, hydrateSocial } = useSocialStore((state) => ({ posts: state.posts, localForums: state.forums, hydrateSocial: state.hydrateSocial }))
  const [tab, setTab] = useState<Tab>('posts')
  const [query, setQuery] = useState('')
  const [users, setUsers] = useState<PublicProfileDto[]>([])
  const [forums, setForums] = useState<ApiForum[]>([])
  const [selectedPost, setSelectedPost] = useState<string | null>(null)
  const [selectedUser, setSelectedUser] = useState<string | null>(null)
  const [selectedForumId, setSelectedForumId] = useState<string | null>(null)
  const [selectedForumFallback, setSelectedForumFallback] = useState<ReturnType<typeof apiForumToLocal> | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { void hydrateSocial() }, [hydrateSocial])
  useEffect(() => {
    let active = true
    const timer = window.setTimeout(async () => {
      try {
        setError(null)
        const [forumResult, userResult] = await Promise.all([
          forumApi.listForums(query.trim()),
          query.trim().length >= 2 ? socialApi.searchUsers(query.trim()) : Promise.resolve({ users: [] }),
        ])
        if (active) { setForums(forumResult.forums); setUsers(userResult.users) }
      } catch (err) { if (active) setError(err instanceof Error ? err.message : 'Falha ao carregar resultados.') }
    }, 250)
    return () => { active = false; window.clearTimeout(timer) }
  }, [query])

  if (!user) return null
  const filteredPosts = query.trim() ? posts.filter((post) => post.content.toLowerCase().includes(query.trim().toLowerCase())) : posts
  const selectedForum = localForums.find((forum) => forum.id === selectedForumId) ?? selectedForumFallback
  return <div className="flex h-full min-h-0 flex-col overflow-hidden">
    <div className="flex h-14 items-center gap-3 border-b border-border px-4"><Search size={17} className="text-text-secondary" /><input value={query} onChange={(event) => setQuery(event.target.value)} className="flex-1 rounded-lg border border-border bg-background-tertiary px-3 py-2 text-sm text-text-primary outline-none focus:border-accent" placeholder="Buscar pessoas, posts e foruns" /></div>
    <div className="flex gap-2 border-b border-border px-4 py-2">{(['posts', 'pessoas', 'foruns'] as Tab[]).map((item) => <button key={item} onClick={() => setTab(item)} className={`rounded-md px-3 py-1.5 text-sm ${tab === item ? 'bg-accent text-white' : 'text-text-secondary hover:bg-background-secondary'}`}>{item === 'foruns' ? 'Fóruns' : item === 'posts' ? 'Publicações' : 'Pessoas'}</button>)}</div>
    <div className="anceryx-scroll flex-1 overflow-y-auto p-4"><div className="mx-auto max-w-[760px] space-y-3">
      {error && <p className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
      {tab === 'posts' && (filteredPosts.length ? filteredPosts.map((post) => <PostCard key={post.id} post={post} currentUserId={user.id} onOpen={() => setSelectedPost(post.id)} />) : <Empty text="Nenhum post encontrado." />)}
      {tab === 'pessoas' && (users.length ? users.map((profile) => <button key={profile.id} onClick={() => setSelectedUser(profile.username)} className="anceryx-card flex w-full items-center gap-3 p-4 text-left"><Avatar src={profile.avatarUrl} name={profile.displayName} size="sm" /><span><strong className="block text-sm text-text-primary">{profile.displayName}</strong><small className="text-text-secondary">@{profile.username}</small></span></button>) : <Empty text={query.length < 2 ? 'Digite ao menos 2 caracteres para buscar pessoas.' : 'Nenhuma pessoa encontrada.'} />)}
      {tab === 'foruns' && (forums.length ? forums.map((forum) => <button type="button" key={forum.id} onClick={() => { setSelectedForumFallback(apiForumToLocal(forum)); setSelectedForumId(forum.id) }} className="anceryx-card w-full p-4 text-left transition hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"><div className="flex items-center gap-3"><MessageCircle size={18} className="text-accent" /><div className="min-w-0 flex-1"><strong className="block truncate text-sm text-text-primary">{forum.name}</strong><p className="line-clamp-2 text-xs text-text-secondary">{forum.description}</p></div><span className="flex shrink-0 items-center gap-1 text-xs text-text-secondary"><Users size={13} />{forum.memberCount}</span></div><span className="sr-only">Abrir detalhes e opções de participação</span></button>) : <Empty text="Nenhum fórum encontrado." />)}
    </div></div>
    {selectedPost && <PostDetailModal postId={selectedPost} initialMode="detail" onClose={() => setSelectedPost(null)} />}
    {selectedUser && <UserProfileModal username={selectedUser} isOpen onClose={() => setSelectedUser(null)} />}
    {selectedForum && <ForumDetailModal forum={selectedForum} onClose={() => { setSelectedForumId(null); setSelectedForumFallback(null) }} />}
  </div>
}

const Empty: React.FC<{ text: string }> = ({ text }) => <div className="anceryx-card p-10 text-center text-sm text-text-secondary">{text}</div>
export default ExplorePage
