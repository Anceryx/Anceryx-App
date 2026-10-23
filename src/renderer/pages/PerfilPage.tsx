import React, { useEffect, useRef, useState } from 'react'
import { Camera, ImagePlus, X, Search, ArrowLeft } from 'lucide-react'
import { formatDate } from '@/utils/formatters'
import { Avatar, Button, ContentSectionCard, Input, Modal } from '@/components/ui/index'
import { PostCard } from '@/components/social/index'
import SetStatusModal from '@/components/social/SetStatusModal'
import { useAuthStore } from '@/store/authStore'
import { realtimePostToLocal, useSocialStore } from '@/store/socialStore'
import { useUIStore } from '@/store/uiStore'
import { mediaApi } from '@/services/mediaApi'
import { socialApi } from '@/services/socialApi'
import { billingApi } from '@/services/billingApi'
import { ImageCropModal } from '@/components/ui/index'
import { dataUrlToBlob } from '@/utils/media'
import SavedPostsPage from '@/pages/SavedPostsPage'
import UserProfileModal from '@/components/social/UserProfileModal'
import type { PublicProfileDto } from '@/services/socialApi'
import type { Post } from '@/types/social'
import type { BadgeId } from '@/types/social'
import BadgeIcon from '@/components/ui/BadgeIcon'
import { postsApi } from '@/services/postsApi'
import { forumApi, type ApiForum } from '@/services/forumApi'

const HEX = /^#[0-9a-fA-F]{6}$/
const suggestions = ['#6d28d9', '#0f766e', '#be123c', '#b45309', '#1d4ed8']

const PerfilPage: React.FC = () => {
  const user = useAuthStore((state) => state.user)
  const { userProfile, profiles, hydrateSocial, updateUserProfile, syncOwnMedia } = useSocialStore()
  const setActiveSection = useSocialStore((state) => state.setActiveSection)
  const setActiveForum = useSocialStore((state) => state.setActiveForum)
  const notify = useUIStore((state) => state.addNotification)
  const [editing, setEditing] = useState(false); const [displayName, setDisplayName] = useState(''); const [bio, setBio] = useState(''); const [busy, setBusy] = useState(false); const [statusOpen, setStatusOpen] = useState(false)
  const [color, setColor] = useState('#6d28d9'); const [hex, setHex] = useState('#6d28d9'); const [premium, setPremium] = useState(false)
  const avatarInput = useRef<HTMLInputElement>(null); const bannerInput = useRef<HTMLInputElement>(null)
  const [cropSource, setCropSource] = useState<string | null>(null)
  const [cropFile, setCropFile] = useState<File | null>(null)
  const [cropTarget, setCropTarget] = useState<'avatar' | 'banner'>('avatar')
  const [profileTab, setProfileTab] = useState<'posts' | 'saved' | 'forums' | 'followers' | 'following' | 'achievements'>('posts')
  const [selectedBadge, setSelectedBadge] = useState<PublicProfileDto['achievements'][number] | null>(null)
  const [pendingAchievementSlug, setPendingAchievementSlug] = useState<string | null>(null)
  const [connections, setConnections] = useState<PublicProfileDto[]>([])
  const [connectionQuery, setConnectionQuery] = useState('')
  const [connectionOffset, setConnectionOffset] = useState(0)
  const [connectionsLoading, setConnectionsLoading] = useState(false)
  const [connectionsError, setConnectionsError] = useState<string | null>(null)
  const [connectionsHaveMore, setConnectionsHaveMore] = useState(false)
  const [profileUsername, setProfileUsername] = useState<string | null>(null)
  const [profilePosts, setProfilePosts] = useState<Post[]>([])
  const [postCount, setPostCount] = useState<number | null>(null)
  const [postOffset, setPostOffset] = useState(0)
  const [postsLoading, setPostsLoading] = useState(false)
  const [profileForums, setProfileForums] = useState<ApiForum[]>([])
  const [forumCount, setForumCount] = useState<number | null>(null)
  const [forumOffset, setForumOffset] = useState(0)
  const [forumsLoading, setForumsLoading] = useState(false)
  const [forumsError, setForumsError] = useState<string | null>(null)
  useEffect(() => () => { if (cropSource) URL.revokeObjectURL(cropSource) }, [cropSource])
  useEffect(() => { void hydrateSocial(); void billingApi.entitlement().then(({ entitlement }) => setPremium(entitlement.status === 'active' || entitlement.status === 'trialing')).catch(() => setPremium(false)) }, [hydrateSocial])
  useEffect(() => {
    const openAchievement = (event: Event) => {
      const badgeSlug = (event as CustomEvent<{ badgeSlug: string }>).detail?.badgeSlug
      if (!badgeSlug || !user) return
      setProfileTab('achievements')
      setPendingAchievementSlug(badgeSlug)
    }
    window.addEventListener('anceryx:open-achievement', openAchievement)
    return () => window.removeEventListener('anceryx:open-achievement', openAchievement)
  }, [profiles, user?.id])
  useEffect(() => {
    if (!pendingAchievementSlug || !user) return
    const badge = profiles[user.id]?.achievements?.find((item) => item.slug === pendingAchievementSlug)
    if (badge) { setSelectedBadge(badge); setPendingAchievementSlug(null) }
  }, [pendingAchievementSlug, profiles, user?.id])
  useEffect(() => {
    if (!user) return
    let active = true
    setPostsLoading(true)
    void postsApi.profilePosts(user.id, 50, 0).then((result) => {
      if (!active) return
      setProfilePosts(result.posts.map(realtimePostToLocal)); setPostCount(result.postCount); setPostOffset(result.posts.length)
    }).catch((error) => { if (active) notify(error instanceof Error ? error.message : 'Não foi possível carregar as publicações.', 'error') })
      .finally(() => { if (active) setPostsLoading(false) })
    return () => { active = false }
  }, [user?.id])
  useEffect(() => {
    if (!user) return
    let active = true
    setForumsLoading(true); setForumsError(null)
    void forumApi.profileForums(user.id, 50, 0).then((result) => {
      if (!active) return
      setProfileForums(result.forums); setForumCount(result.totalCount); setForumOffset(result.forums.length)
    }).catch((error) => { if (active) setForumsError(error instanceof Error ? error.message : 'Não foi possível carregar os Fóruns divulgáveis.') })
      .finally(() => { if (active) setForumsLoading(false) })
    return () => { active = false }
  }, [user?.id])
  useEffect(() => {
    if (!user || !['followers', 'following'].includes(profileTab)) return
    let active = true
    setConnectionsLoading(true); setConnectionsError(null); setConnections([]); setConnectionOffset(0); setConnectionsHaveMore(false)
    const request = profileTab === 'followers' ? socialApi.followers(user.id, 50, 0) : socialApi.following(user.id, 50, 0)
    void request.then(({ users }) => { if (active) { setConnections(users); setConnectionOffset(users.length); setConnectionsHaveMore(users.length === 50) } })
      .catch((error) => { if (active) setConnectionsError(error instanceof Error ? error.message : 'Não foi possível carregar esta lista.') })
      .finally(() => { if (active) setConnectionsLoading(false) })
    return () => { active = false }
  }, [profileTab, user?.id])
  useEffect(() => { setDisplayName(userProfile.displayName); setBio(userProfile.bio); setColor(userProfile.bannerColor); setHex(userProfile.bannerColor) }, [userProfile.bio, userProfile.bannerColor, userProfile.displayName])
  if (!user) return null
  const previewColor = HEX.test(hex) ? hex : color
  const saveProfile = async () => { if (!HEX.test(hex)) { notify('Use uma cor hexadecimal como #6d28d9.', 'error'); return }; setBusy(true); try { const { user: updated } = await socialApi.updateMe({ displayName: displayName.trim(), bio: bio.trim(), bannerColor: hex }); updateUserProfile({ displayName: updated.displayName, bio: updated.bio, bannerColor: updated.bannerColor }); useAuthStore.getState().setDisplayName(updated.displayName); setColor(updated.bannerColor); setHex(updated.bannerColor); setEditing(false); notify('Perfil atualizado.', 'success') } catch (error) { notify(error instanceof Error ? error.message : 'Falha ao atualizar perfil.', 'error') } finally { setBusy(false) } }
  const selectImage = (file: File | undefined, target: 'avatar' | 'banner') => {
    if (!file) return
    if (!premium && target === 'banner') { notify('Imagens de banner exigem Anceryx+.', 'error'); return }
    const allowed = ['image/png', 'image/jpeg', 'image/webp', ...(premium && target === 'avatar' ? ['image/gif'] : [])]
    if (!allowed.includes(file.type)) { notify('Formato de imagem não aceito.', 'error'); return }
    if (file.size > 15 * 1024 * 1024) { notify('A imagem deve ter até 15 MB.', 'error'); return }
    if (cropSource) URL.revokeObjectURL(cropSource)
    setCropFile(file); setCropTarget(target); setCropSource(URL.createObjectURL(file))
  }
  const upload = async (file: File, target: 'avatar' | 'banner') => { setBusy(true); try { const asset = await mediaApi.uploadFile(target === 'avatar' ? 'user-avatar' : 'user-banner', file); const patch = target === 'avatar' ? { avatarUrl: asset.publicUrl } : { bannerUrl: asset.publicUrl }; const { user: updated } = await socialApi.updateMe(patch); if (target === 'avatar') { useAuthStore.getState().setAvatar(updated.avatarUrl ?? ''); syncOwnMedia({ avatarUrl: updated.avatarUrl }) } else syncOwnMedia({ bannerUrl: updated.bannerUrl }); notify('Imagem atualizada.', 'success') } catch (error) { notify(error instanceof Error ? error.message : 'Falha no upload.', 'error') } finally { setBusy(false) } }
  const applyCrop = async (dataUrl: string) => {
    if (!cropFile || !cropSource) return
    const selectedFile = cropFile
    const target = cropTarget
    const source = cropSource
    setCropSource(null); setCropFile(null); URL.revokeObjectURL(source)
    try {
      let output = selectedFile
      if (dataUrl !== source) {
        const blob = dataUrlToBlob(dataUrl)
        const extension = blob.type === 'image/webp' ? 'webp' : 'png'
        output = new File([blob], `${selectedFile.name.replace(/\.[^.]+$/, '')}-crop.${extension}`, { type: blob.type || 'image/png' })
      }
      await upload(output, target)
    } catch (error) { notify(error instanceof Error ? error.message : 'Não foi possível processar a imagem.', 'error') }
  }
  const cancelCrop = () => { if (cropSource) URL.revokeObjectURL(cropSource); setCropSource(null); setCropFile(null) }
  const removeBanner = async () => { setBusy(true); try { const { user: updated } = await socialApi.updateMe({ bannerUrl: null }); syncOwnMedia({ bannerUrl: updated.bannerUrl }); notify('Banner removido.', 'success') } catch (error) { notify(error instanceof Error ? error.message : 'Falha ao remover banner.', 'error') } finally { setBusy(false) } }
  const loadMorePosts = async () => {
    if (postsLoading || postCount === null || postOffset >= postCount) return
    setPostsLoading(true)
    try {
      const result = await postsApi.profilePosts(user.id, 50, postOffset)
      setProfilePosts((current) => [...current, ...result.posts.map(realtimePostToLocal)])
      setPostOffset((current) => current + result.posts.length)
    } catch (error) { notify(error instanceof Error ? error.message : 'Não foi possível carregar mais publicações.', 'error') }
    finally { setPostsLoading(false) }
  }
  const loadMoreForums = async () => {
    if (forumsLoading || forumCount === null || forumOffset >= forumCount) return
    setForumsLoading(true); setForumsError(null)
    try {
      const result = await forumApi.profileForums(user.id, 50, forumOffset)
      setProfileForums((current) => [...current, ...result.forums.filter((forum) => !current.some((item) => item.id === forum.id))])
      setForumOffset((current) => current + result.forums.length); setForumCount(result.totalCount)
    } catch (error) { setForumsError(error instanceof Error ? error.message : 'Não foi possível carregar mais Fóruns.') }
    finally { setForumsLoading(false) }
  }
  const loadMoreConnections = async () => {
    if (connectionsLoading || !connectionsHaveMore) return
    setConnectionsLoading(true); setConnectionsError(null)
    try {
      const request = profileTab === 'followers' ? socialApi.followers(user.id, 50, connectionOffset) : socialApi.following(user.id, 50, connectionOffset)
      const { users } = await request
      setConnections((current) => [...current, ...users.filter((profile) => !current.some((item) => item.id === profile.id))])
      setConnectionOffset((current) => current + users.length); setConnectionsHaveMore(users.length === 50)
    } catch (error) { setConnectionsError(error instanceof Error ? error.message : 'Não foi possível carregar mais contas.') }
    finally { setConnectionsLoading(false) }
  }
  const filteredConnections = connections.filter((profile) => `${profile.displayName} ${profile.username}`.toLocaleLowerCase('pt-BR').includes(connectionQuery.toLocaleLowerCase('pt-BR')))
  return <div className="anceryx-scroll h-full overflow-y-auto p-3 sm:p-5"><div className="mx-auto max-w-[920px] space-y-4">
    <ContentSectionCard className="overflow-hidden p-0">
      <div className="group relative h-[clamp(112px,16vw,168px)] overflow-visible" style={{ backgroundColor: userProfile.bannerColor }}>
        <div className="absolute inset-0 rounded-t-[inherit] bg-cover bg-center" style={userProfile.bannerImage ? { backgroundImage: `url("${mediaApi.resolvePublicUrl(userProfile.bannerImage)}")` } : undefined} />
        <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/0 opacity-0 transition-colors group-hover:bg-black/40 group-hover:opacity-100">
          <Button size="sm" onClick={() => bannerInput.current?.click()}><ImagePlus size={14} /> Alterar banner</Button>
          {userProfile.bannerImage && <Button size="sm" variant="danger" onClick={() => void removeBanner()}><X size={14} /> Remover</Button>}
        </div>
        <button onClick={() => avatarInput.current?.click()} className="absolute -bottom-9 left-5 rounded-full border-4 border-background-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent" aria-label="Alterar avatar">
          <Avatar src={user.avatar} name={userProfile.displayName || user.name} size="xl" />
          <span className="absolute inset-0 grid place-items-center rounded-full bg-black/0 text-white transition-colors hover:bg-black/50"><Camera size={20} /></span>
        </button>
      </div>
      <input ref={avatarInput} type="file" className="hidden" accept={premium ? 'image/png,image/jpeg,image/webp,image/gif' : 'image/png,image/jpeg,image/webp'} onChange={(event) => { selectImage(event.target.files?.[0], 'avatar'); event.currentTarget.value = '' }} />
      <input ref={bannerInput} type="file" className="hidden" accept="image/png,image/jpeg,image/webp" onChange={(event) => { selectImage(event.target.files?.[0], 'banner'); event.currentTarget.value = '' }} />
      <div className="flex flex-wrap items-start justify-between gap-4 px-5 pb-5 pt-3 sm:pl-28">
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-bold text-text-primary">{userProfile.displayName || user.name}</h1>
          <p className="text-sm text-text-secondary">@{userProfile.handle || user.username}</p>
          {profiles[user.id]?.badges?.length > 0 && <div className="mt-2 flex flex-wrap items-center gap-2">{profiles[user.id].badges.map((badge) => <button key={badge.id} type="button" onClick={() => setSelectedBadge(badge)} className="rounded-md p-1 hover:bg-background-tertiary" aria-label={`Detalhes da conquista ${badge.name}`}><BadgeIcon badge={{ id: badge.slug as BadgeId, label: badge.name, color: badge.color ?? '#a78bfa' }} size={20} /></button>)}</div>}
          {userProfile.customStatus?.text && <p className="mt-2 max-w-xl truncate text-xs text-text-secondary">{userProfile.customStatus.text}</p>}
          {userProfile.bio && <p className="mt-3 max-w-2xl whitespace-pre-wrap text-sm text-text-primary">{userProfile.bio}</p>}
          <p className="mt-2 text-xs text-text-secondary">Na Anceryx desde {user.createdAt ? formatDate(new Date(user.createdAt)) : 'data indisponível'}</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>Editar perfil</Button>
          <Button size="sm" variant="ghost" onClick={() => setStatusOpen(true)}>{userProfile.customStatus?.text ? 'Editar status' : 'Definir status'}</Button>
        </div>
      </div>
        <div className="grid grid-cols-2 gap-2 border-t border-border px-4 py-3 sm:grid-cols-4">
        <div className="rounded-xl bg-background-tertiary/50 px-3 py-2 text-center"><b className="block text-base text-text-primary">{postCount ?? '—'}</b><span className="text-xs text-text-secondary">Publicações</span></div>
        <button type="button" onClick={() => { setProfileTab('followers'); setConnectionQuery('') }} className="motion-control rounded-xl bg-background-tertiary/50 px-3 py-2 text-center hover:bg-background-tertiary" aria-label={`Ver ${userProfile.followersCount} seguidores`}><b className="block text-base text-text-primary">{userProfile.followersCount}</b><span className="text-xs text-text-secondary">Seguidores</span></button>
        <button type="button" onClick={() => { setProfileTab('following'); setConnectionQuery('') }} className="motion-control rounded-xl bg-background-tertiary/50 px-3 py-2 text-center hover:bg-background-tertiary" aria-label={`Ver ${userProfile.followingCount} seguindo`}><b className="block text-base text-text-primary">{userProfile.followingCount}</b><span className="text-xs text-text-secondary">Seguindo</span></button>
        <button type="button" onClick={() => { setProfileTab('forums'); setConnectionQuery('') }} className="motion-control rounded-xl bg-background-tertiary/50 px-3 py-2 text-center hover:bg-background-tertiary" aria-label="Ver Fóruns divulgáveis"><b className="block text-base text-text-primary">{forumCount ?? '—'}</b><span className="text-xs text-text-secondary">Fóruns divulgáveis</span></button>
      </div>
    </ContentSectionCard>
    <div className="flex min-w-0 gap-1 overflow-x-auto border-b border-border" role="tablist" aria-label="Conteúdo do perfil">
      {([{ id: 'posts', label: 'Publicações' }, { id: 'saved', label: 'Salvos' }, { id: 'forums', label: 'Fóruns' }, { id: 'achievements', label: 'Conquistas' }, { id: 'followers', label: 'Seguidores' }, { id: 'following', label: 'Seguindo' }] as const).map((tab) => <button key={tab.id} type="button" role="tab" aria-selected={profileTab === tab.id} onClick={() => { setProfileTab(tab.id); setConnectionQuery('') }} className={`shrink-0 border-b-2 px-3 py-2.5 text-sm transition-colors ${profileTab === tab.id ? 'border-accent text-text-primary' : 'border-transparent text-text-secondary hover:text-text-primary'}`}>{tab.label}</button>)}
    </div>
    {profileTab === 'posts' && <div key={profileTab} className="motion-view-forward space-y-3">{postsLoading && profilePosts.length === 0 && <ContentSectionCard className="py-8 text-center text-sm text-text-secondary">Carregando publicações…</ContentSectionCard>}{!postsLoading && postCount === 0 && <ContentSectionCard className="py-10 text-center text-sm text-text-secondary">Nenhuma publicação disponível.</ContentSectionCard>}{profilePosts.map((post) => <PostCard key={post.id} post={post} currentUserId={user.id} />)}{postCount !== null && postOffset < postCount && <Button variant="secondary" loading={postsLoading} onClick={() => void loadMorePosts()}>Carregar mais publicações</Button>}</div>}
    {profileTab === 'saved' && <div key={profileTab} className="motion-view-forward -mx-3 sm:-mx-5"><SavedPostsPage /></div>}
    {profileTab === 'achievements' && <ContentSectionCard key={profileTab} className="motion-view-forward space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-semibold text-text-primary">Conquistas</h2><Button size="sm" variant="secondary" onClick={async () => { try { await socialApi.updateBadgePreferences('all', []); await hydrateSocial() } catch (error) { notify(error instanceof Error ? error.message : 'Não foi possível salvar a preferência.', 'error') } }}>Exibir todas as minhas badges</Button></div>
      {!profiles[user.id]?.achievements?.length ? <p className="py-8 text-center text-sm text-text-secondary">Nenhuma conquista disponível.</p> : <div className="grid grid-cols-[repeat(auto-fill,minmax(88px,1fr))] gap-3">{profiles[user.id].achievements.map((badge) => <button key={badge.id} type="button" onClick={() => setSelectedBadge(badge)} className="motion-control flex min-h-24 flex-col items-center justify-center gap-2 rounded-xl border border-border bg-background-tertiary/40 p-3 text-center hover:border-accent/50" aria-label={`Ver detalhes de ${badge.name}`}><BadgeIcon badge={{ id: badge.slug as BadgeId, label: badge.name, color: '#a78bfa' }} size={36} /><span className="text-xs font-medium text-text-primary">{badge.name}</span></button>)}</div>}
      <fieldset><legend className="text-xs font-semibold text-text-secondary">Badges destacadas no cabeçalho</legend><div className="mt-2 flex flex-wrap gap-x-4 gap-y-2">{profiles[user.id]?.achievements?.map((badge) => <label key={badge.id} className="flex items-center gap-2 text-xs text-text-secondary"><input type="checkbox" checked={profiles[user.id]?.featuredBadgeSlugs?.includes(badge.slug) ?? false} onChange={async (event) => { const current = profiles[user.id]?.featuredBadgeSlugs ?? []; const next = event.target.checked ? [...current, badge.slug] : current.filter((slug) => slug !== badge.slug); if (!next.length) return; try { await socialApi.updateBadgePreferences('selected', next); await hydrateSocial() } catch (error) { notify(error instanceof Error ? error.message : 'Não foi possível salvar as badges destacadas.', 'error') } }} />{badge.name}</label>)}</div></fieldset>
    </ContentSectionCard>}
    {profileTab === 'forums' && <div key={profileTab} className="motion-view-forward grid gap-3 sm:grid-cols-2">{forumsError && <ContentSectionCard role="alert" className="col-span-full text-sm text-accent-red">{forumsError}</ContentSectionCard>}{forumsLoading && profileForums.length === 0 && <ContentSectionCard className="col-span-full py-8 text-center text-sm text-text-secondary">Carregando Fóruns…</ContentSectionCard>}{!forumsLoading && !forumsError && profileForums.length === 0 && <ContentSectionCard className="col-span-full py-10 text-center text-sm text-text-secondary">Nenhum Fórum divulgável disponível.</ContentSectionCard>}{profileForums.map((forum) => <button key={forum.id} type="button" onClick={() => { setActiveForum(forum.id); setActiveSection('foruns') }} className="motion-control anceryx-card p-4 text-left hover:border-accent/40"><span className="block font-semibold text-text-primary">{forum.name}</span><span className="mt-1 line-clamp-2 text-xs text-text-secondary">{forum.description}</span><span className="mt-3 block text-[11px] text-text-secondary">{forum.memberCount} membros · Público</span></button>)}{forumOffset < (forumCount ?? 0) && <Button variant="secondary" loading={forumsLoading} onClick={() => void loadMoreForums()}>Carregar mais Fóruns</Button>}</div>}
    {(profileTab === 'followers' || profileTab === 'following') && <ContentSectionCard key={profileTab} className="motion-view-forward space-y-3 p-3 sm:p-4">
      <div className="flex items-center gap-2"><button type="button" onClick={() => setProfileTab('posts')} className="grid h-9 w-9 place-items-center rounded-lg text-text-secondary hover:bg-background-tertiary" aria-label="Voltar ao perfil"><ArrowLeft size={17} /></button><h2 className="flex-1 font-semibold text-text-primary">{profileTab === 'followers' ? 'Seguidores' : 'Seguindo'}</h2></div>
      <label className="flex items-center gap-2 rounded-xl border border-border bg-background-tertiary px-3 py-2"><Search size={16} className="text-text-secondary" /><input value={connectionQuery} onChange={(event) => setConnectionQuery(event.target.value)} className="min-w-0 flex-1 bg-transparent text-sm outline-none" placeholder="Buscar nesta lista" aria-label="Buscar pessoas" /></label>
      {connectionsError && <p role="alert" className="text-sm text-accent-red">{connectionsError}</p>}
      {connectionsLoading && connections.length === 0 && <p className="py-5 text-center text-sm text-text-secondary">Carregando lista…</p>}
      {!connectionsLoading && !connectionsError && filteredConnections.length === 0 && <p className="py-5 text-center text-sm text-text-secondary">{connections.length ? 'Nenhuma conta corresponde à busca.' : 'Esta lista está vazia.'}</p>}
      <div className="divide-y divide-border">{filteredConnections.map((profile) => <div key={profile.id} className="flex items-center gap-3 py-3">
        <button type="button" onClick={() => setProfileUsername(profile.username)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
          <Avatar src={profile.avatarUrl} name={profile.displayName} size="sm" />
          <span className="min-w-0"><span className="block truncate text-sm font-medium text-text-primary">{profile.displayName}</span><span className="block truncate text-xs text-text-secondary">@{profile.username}</span></span>
        </button>
        <span className="ml-auto flex max-w-40 flex-wrap justify-end gap-1">{profile.badges.map((badge) => <BadgeIcon key={badge.id} badge={{ id: badge.slug as BadgeId, label: badge.name, color: '#a78bfa' }} size={16} />)}</span>
        {profileTab === 'followers' && !profile.viewerIsFollowing && <Button size="sm" variant={profile.viewerFollowRequestPending ? 'secondary' : 'primary'} onClick={async () => { try { const result = await socialApi.follow(profile.id); setConnections((current) => current.map((item) => item.id === profile.id ? { ...item, viewerIsFollowing: result.status === 'following', viewerFollowRequestPending: result.status === 'requested' } : item)) } catch (error) { notify(error instanceof Error ? error.message : 'Não foi possível seguir esta conta.', 'error') } }}>{profile.viewerFollowRequestPending ? 'Solicitado' : 'Seguir'}</Button>}
        {profileTab === 'following' && <Button size="sm" variant="secondary" onClick={async () => { try { await socialApi.unfollow(profile.id); setConnections((current) => current.filter((item) => item.id !== profile.id)); useSocialStore.setState((state) => ({ userProfile: { ...state.userProfile, followingCount: Math.max(0, state.userProfile.followingCount - 1) } })) } catch (error) { notify(error instanceof Error ? error.message : 'Não foi possível deixar de seguir.', 'error') } }}>Deixar de seguir</Button>}
      </div>)}</div>
      {connectionsHaveMore && <Button variant="secondary" onClick={() => void loadMoreConnections()} loading={connectionsLoading}>Carregar mais</Button>}
    </ContentSectionCard>}
    {profileUsername && <UserProfileModal username={profileUsername} isOpen onClose={() => setProfileUsername(null)} />}

    <Modal isOpen={editing} onClose={() => { setColor(userProfile.bannerColor); setHex(userProfile.bannerColor); setEditing(false) }} title="Editar perfil"><div className="space-y-4"><Input label="Nome" value={displayName} onChange={(event) => setDisplayName(event.target.value)} /><label className="block text-xs font-semibold text-text-secondary">BIO<textarea value={bio} onChange={(event) => setBio(event.target.value)} maxLength={500} rows={4} className="mt-2 w-full rounded-md border border-border bg-background-tertiary p-3 text-sm text-text-primary" /></label><fieldset><legend className="text-xs font-semibold text-text-secondary">COR DO BANNER</legend><div className="mt-2 h-20 rounded-lg border border-border" style={{ backgroundColor: previewColor }} /><div className="mt-2 flex items-center gap-2"><input aria-label="Matiz" type="range" min="0" max="360" defaultValue="260" className="w-full accent-violet-600" onChange={(event) => { const hue = Number(event.target.value); const next = `hsl(${hue} 70% 45%)`; const canvas = document.createElement('canvas'); const ctx = canvas.getContext('2d'); if (ctx) { ctx.fillStyle = next; setHex(ctx.fillStyle); setColor(ctx.fillStyle) } }} /><input aria-label="Cor hexadecimal" value={hex} onChange={(event) => setHex(event.target.value)} onBlur={() => { if (HEX.test(hex)) setColor(hex.toLowerCase()) }} className="w-28 rounded-md border border-border bg-background-tertiary px-2 py-2 text-sm" /></div><div className="mt-2 flex gap-2">{suggestions.map((suggestion) => <button key={suggestion} aria-label={`Usar ${suggestion}`} onClick={() => { setColor(suggestion); setHex(suggestion) }} className="h-6 w-6 rounded-full border border-white/40" style={{ backgroundColor: suggestion }} />)}</div><p className="mt-1 text-xs text-text-secondary">A cor é gratuita; imagens de banner e avatares animados exigem Anceryx+ ({premium ? 'ativo' : 'não ativo'}).</p></fieldset><div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => { setColor(userProfile.bannerColor); setHex(userProfile.bannerColor); setEditing(false) }}>Cancelar</Button><Button loading={busy} onClick={() => void saveProfile()}>Salvar</Button></div></div></Modal>
    {cropSource && <ImageCropModal src={cropSource} shape={cropTarget === 'avatar' ? 'circle' : 'rect'} aspect={cropTarget === 'avatar' ? 1 : 4.5} outputWidth={cropTarget === 'avatar' ? 512 : 1350} outputHeight={cropTarget === 'avatar' ? 512 : 300} title="Editar imagem" onApply={(dataUrl) => { void applyCrop(dataUrl) }} onCancel={cancelCrop} preserveOriginal={cropFile?.type === 'image/gif'} />}
    <Modal isOpen={Boolean(selectedBadge)} onClose={() => setSelectedBadge(null)} title={selectedBadge?.name ?? 'Conquista'}><div className="flex flex-col items-center gap-3 py-4 text-center"><BadgeIcon badge={{ id: (selectedBadge?.slug ?? 'developer') as BadgeId, label: selectedBadge?.name ?? '', color: '#a78bfa' }} size={56} /><p className="text-sm text-text-secondary">{selectedBadge?.description}</p><p className="text-xs text-text-secondary">Categoria: {selectedBadge?.category}</p><p className="text-xs text-text-secondary">{selectedBadge?.earnedAt ? `Conquistada em ${formatDate(new Date(selectedBadge.earnedAt))}` : 'Elegibilidade atual'}</p></div></Modal>
    <SetStatusModal isOpen={statusOpen} onClose={() => setStatusOpen(false)} currentStatus={userProfile.customStatus} />{busy && <div className="titlebar-overlay fixed inset-0 z-50 cursor-wait" aria-label="Salvando" />}
  </div></div>
}
export default PerfilPage
